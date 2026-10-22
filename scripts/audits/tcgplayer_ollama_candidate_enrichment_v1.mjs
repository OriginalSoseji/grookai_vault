#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import pg from 'pg';

import '../../backend/env.mjs';
import {
  buildTcgplayerOllamaCandidateIndexV1,
  candidatePoolForTcgplayerOllamaRowV1,
  enrichTcgplayerOllamaRowV1,
  normalizeTcgplayerOllamaSourceNameV1,
  uniqueTcgplayerExtendedNumberV1,
} from '../../backend/pricing/tcgplayer_ollama_candidate_enrichment_v1.mjs';

const { Client } = pg;

function value(argv, name) {
  return argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3).trim() ?? '';
}

function connectionString() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

function sslConfig(url) {
  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(url)) return false;
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim();
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

function jsonl(rows) {
  return rows.length ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : '';
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  if (Buffer.byteLength(raw) > 50 * 1024 * 1024) throw new Error('Input exceeds 50 MiB');
  return { raw, rows: raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--apply') || argv.includes('--run')) throw new Error('Candidate enrichment is read-only');
  const inputPath = path.resolve(value(argv, 'input'));
  const outputPath = path.resolve(value(argv, 'output'));
  if (!value(argv, 'input') || !value(argv, 'output')) throw new Error('--input and --output are required');
  const input = await readJsonl(inputPath);
  const candidateOnly = argv.includes('--candidate-only');
  const productIds = [...new Set(input.rows
    .map((row) => Number(row.source_product_id))
    .filter(Number.isSafeInteger))];
  const groupIds = [...new Set(input.rows.map((row) => Number(row.source_group_id)).filter(Number.isSafeInteger))];
  const url = connectionString();
  if (!url) throw new Error('Database URL required');
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    query_timeout: 125_000,
    application_name: 'tcgplayer_ollama_candidate_enrichment_v1_read_only',
  });
  await client.connect();
  let cards;
  let consensusRows;
  let productRows;
  let exactPrintingEvidenceRows;
  try {
    await client.query('begin isolation level repeatable read read only');
    productRows = (await client.query(
      `select product_id, category_id, group_id, name, extended_data
         from public.tcgcsv_source_products
        where product_id = any($1::integer[])`,
      [productIds],
    )).rows;
    consensusRows = (await client.query(
      `select product.category_id as source_category_id,
              product.group_id as source_group_id,
              count(distinct mapping.external_id)::integer as mapped_source_product_count,
              count(distinct card.set_id)::integer as set_count,
              min(card.set_id::text) as set_id,
              min(set_row.code) as set_code
         from public.tcgcsv_source_products product
         join public.external_mappings mapping
           on mapping.source = 'tcgplayer'
          and mapping.external_id = product.product_id::text
          and mapping.active = true
         join public.card_prints card on card.id = mapping.card_print_id
         join public.sets set_row on set_row.id = card.set_id
        where product.group_id = any($1::integer[])
        group by product.category_id, product.group_id`,
      [groupIds],
    )).rows;
    cards = (await client.query(
      `select card.id::text as card_print_id, card.gv_id, card.set_id::text,
              card.set_code, set_row.name as set_name,
              card.name as canonical_name, card.number as canonical_number,
              card.variant_key,
              min(identity.identity_domain) filter (
                where identity.is_active = true
                  and identity.identity_domain in ('pokemon_eng_standard', 'mtg_eng_paper_print')
              ) as identity_domain,
              count(distinct identity.id) filter (
                where identity.is_active = true
                  and identity.identity_domain in ('pokemon_eng_standard', 'mtg_eng_paper_print')
              )::integer as active_standard_identity_count,
              count(distinct mapping.id) filter (
                where mapping.source = 'tcgplayer' and mapping.active = true
              )::integer as active_tcgplayer_mapping_count
         from public.card_prints card
         join public.sets set_row on set_row.id = card.set_id
         left join public.card_print_identity identity on identity.card_print_id = card.id
         left join public.external_mappings mapping on mapping.card_print_id = card.id
        where coalesce(card.variant_key, '') = ''
        group by card.id, card.gv_id, card.set_id, card.set_code, set_row.name,
                 card.name, card.number, card.variant_key
       having count(distinct identity.id) filter (
                where identity.is_active = true
                  and identity.identity_domain in ('pokemon_eng_standard', 'mtg_eng_paper_print')
              ) = 1
          and count(distinct mapping.id) filter (
                where mapping.source = 'tcgplayer' and mapping.active = true
              ) = 0`,
    )).rows;
    exactPrintingEvidenceRows = (await client.query(
      `with ambiguous_product as materialized (
         select candidate.source_product_id
           from public.v_mtg_tcgplayer_parent_mapping_candidates_v1 candidate
          where candidate.resolution = 'ambiguous_printing_parents'
            and candidate.source_product_id::bigint = any($1::bigint[])
       ), exact_evidence as materialized (
         select split_part(printing_mapping.external_id, ':', 1) as source_product_id,
                printing.card_print_id,
                count(distinct printing_mapping.id)::integer as supporting_printing_mapping_count
           from public.external_printing_mappings printing_mapping
           join ambiguous_product ambiguous
             on ambiguous.source_product_id = split_part(printing_mapping.external_id, ':', 1)
           join public.card_printings printing
             on printing.id = printing_mapping.card_printing_id
           join public.card_print_identity identity
             on identity.card_print_id = printing.card_print_id
            and identity.is_active = true
            and identity.identity_domain = 'mtg_eng_paper_print'
          where printing_mapping.source = 'tcgplayer_market'
            and printing_mapping.active = true
            and printing_mapping.external_id ~ '^[1-9][0-9]*:(normal|foil)$'
          group by split_part(printing_mapping.external_id, ':', 1),
                   printing.card_print_id
       )
       select evidence.source_product_id, card.id::text as card_print_id,
              card.gv_id, card.set_id::text, card.set_code,
              set_row.name as set_name, card.name as canonical_name,
              card.number as canonical_number, card.variant_key,
              evidence.supporting_printing_mapping_count,
              count(distinct identity.id) filter (
                where identity.is_active = true
                  and identity.identity_domain = 'mtg_eng_paper_print'
              )::integer as active_standard_identity_count,
              count(distinct mapping.id) filter (
                where mapping.source = 'tcgplayer' and mapping.active = true
              )::integer as active_tcgplayer_mapping_count,
              'mtg_eng_paper_print'::text as identity_domain
         from exact_evidence evidence
         join public.card_prints card on card.id = evidence.card_print_id
         join public.sets set_row on set_row.id = card.set_id
         left join public.card_print_identity identity on identity.card_print_id = card.id
         left join public.external_mappings mapping on mapping.card_print_id = card.id
        group by evidence.source_product_id, card.id, card.gv_id, card.set_id,
                 card.set_code, set_row.name, card.name, card.number,
                 card.variant_key, evidence.supporting_printing_mapping_count
        order by evidence.source_product_id::bigint, card.set_code, card.gv_id, card.id`,
      [productIds],
    )).rows;
    await client.query('rollback');
  } finally {
    await client.end();
  }
  const products = new Map(productRows.map((row) => [Number(row.product_id), row]));
  const consensus = new Map(consensusRows.map((row) => [
    `${Number(row.source_category_id)}:${Number(row.source_group_id)}`,
    row,
  ]));
  const candidateIndex = buildTcgplayerOllamaCandidateIndexV1(cards);
  const exactPrintingEvidence = new Map();
  for (const candidate of exactPrintingEvidenceRows) {
    const sourceProductId = Number(candidate.source_product_id);
    const candidates = exactPrintingEvidence.get(sourceProductId) ?? [];
    candidates.push({
      ...candidate,
      candidate_evidence: {
        target_set_source: 'exact_tcgplayer_market_printing_evidence',
        supporting_printing_mapping_count:
          Number(candidate.supporting_printing_mapping_count),
        mapping_authority: false,
      },
    });
    exactPrintingEvidence.set(sourceProductId, candidates);
  }
  const enrichedAll = input.rows.map((inputRow) => {
    const product = products.get(Number(inputRow.source_product_id));
    const printedNumber = uniqueTcgplayerExtendedNumberV1(product?.extended_data);
    const row = {
      ...inputRow,
      printed_number: printedNumber,
      normalized_source_name: normalizeTcgplayerOllamaSourceNameV1(
        product?.name ?? inputRow.source_product_name,
      ),
      source_product_extended_data: product?.extended_data ?? [],
    };
    const groupConsensus = consensus.get(
      `${Number(row.source_category_id)}:${Number(row.source_group_id)}`,
    ) ?? null;
    return enrichTcgplayerOllamaRowV1(
      row,
      candidatePoolForTcgplayerOllamaRowV1(row, candidateIndex, groupConsensus),
      groupConsensus,
      exactPrintingEvidence.get(Number(row.source_product_id)) ?? [],
    );
  });
  const enriched = candidateOnly
    ? enrichedAll.filter((row) => row.review_targets.length > 0)
    : enrichedAll;
  const output = jsonl(enriched);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, output);
  const summary = {
    schema_version: 'TCGPLAYER_OLLAMA_CANDIDATE_ENRICHMENT_V1',
    created_at: new Date().toISOString(),
    input_path: inputPath,
    input_sha256: createHash('sha256').update(input.raw).digest('hex'),
    output_path: outputPath,
    output_sha256: createHash('sha256').update(output).digest('hex'),
    input_rows: input.rows.length,
    output_rows: enriched.length,
    candidate_only: candidateOnly,
    catalog_candidates_scanned: cards.length,
    exact_printing_evidence_rows_scanned: exactPrintingEvidenceRows.length,
    exact_printing_evidence_products: exactPrintingEvidence.size,
    exact_printing_evidence_candidate_rows: enrichedAll.filter((row) =>
      row.candidate_search.candidate_source ===
        'exact_tcgplayer_market_printing_evidence').length,
    rows_with_review_targets: enrichedAll.filter((row) => row.review_targets.length > 0).length,
    rows_without_review_targets: enrichedAll.filter((row) => row.review_targets.length === 0).length,
    missing_number_rows_enriched: enrichedAll.filter((row) =>
      !String(row.printed_number ?? '').trim() && row.review_targets.length > 0).length,
    categories: Object.fromEntries([1, 3].map((categoryId) => [
      String(categoryId),
      {
        input_rows: enrichedAll.filter((row) => Number(row.source_category_id) === categoryId).length,
        candidate_rows: enrichedAll.filter((row) =>
          Number(row.source_category_id) === categoryId && row.review_targets.length > 0).length,
      },
    ])),
    boundaries: {
      database_reads_only: true,
      database_writes: false,
      mapping_authority: false,
      publication_authority: false,
      customer_state_writes: false,
    },
  };
  await fs.writeFile(`${outputPath}.summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`[tcgplayer-ollama-candidate-enrichment] ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
