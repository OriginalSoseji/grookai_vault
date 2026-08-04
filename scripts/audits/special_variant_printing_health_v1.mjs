import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { buildTargets } from './special_variant_printing_transactional_rollback_v1.mjs';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const { Client } = require('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.resolve(process.cwd(), envPath), override: false, quiet: true });
}

export const VERSION = 'SPECIAL_VARIANT_PRINTING_HEALTH_V1';
const MANIFEST_PATH = path.resolve(
  process.cwd(),
  'docs/audits/special_variant_printing_authority_v1/special_variant_printing_guarded_manifest_v1.json',
);
const DEFAULT_OUTPUT_PATH = path.resolve(
  process.cwd(),
  'docs/audits/special_variant_printing_authority_v1/health/special_variant_printing_health_v1.json',
);

function connectionString() {
  return process.env.SUPABASE_POOLER_URL
    ?? process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;
}

function targetCte() {
  return `
    target as (
      select *
      from jsonb_to_recordset($1::jsonb) as target_row(
        child_id uuid,
        review_id uuid,
        card_print_id uuid,
        source_product_id integer,
        finish_key text,
        printing_gv_id text
      )
    )`;
}

export function validateHealthMetrics(metrics, expectedCount) {
  const exactCountKeys = [
    'target_count',
    'distinct_child_count',
    'exact_child_count',
    'exact_hidden_review_count',
  ];
  const zeroKeys = [
    'public_printing_option_leak_count',
    'external_printing_mapping_count',
    'qualification_candidate_hidden_child_count',
    'eligible_decision_count',
    'historical_snapshot_count',
    'current_price_count',
  ];
  const failures = [
    ...exactCountKeys
      .filter((key) => Number(metrics[key]) !== expectedCount)
      .map((key) => `${key}:${metrics[key]}!=${expectedCount}`),
    ...zeroKeys
      .filter((key) => Number(metrics[key]) !== 0)
      .map((key) => `${key}:${metrics[key]}!=0`),
  ];
  return { healthy: failures.length === 0, failures };
}

async function queryMetrics(client, targets) {
  const result = await client.query(`
    with ${targetCte()}
    select
      (select count(*)::int from target) as target_count,
      (select count(distinct child_id)::int from target) as distinct_child_count,
      (select count(*)::int
         from target
         join public.card_printings child
           on child.id = target.child_id
          and child.card_print_id = target.card_print_id
          and child.finish_key = target.finish_key
          and child.printing_gv_id = target.printing_gv_id
          and child.is_provisional = false) as exact_child_count,
      (select count(*)::int
         from target
         join public.card_printing_truth_reviews review
           on review.id = target.review_id
          and review.card_printing_id = target.child_id
          and review.active = true
          and review.review_status = 'quarantined_candidate'
          and review.public_visibility = 'hidden_pending_review')
        as exact_hidden_review_count,
      (select count(*)::int
         from target
         join lateral public.get_public_card_printing_options_v1(
           array[target.card_print_id], 1000, 0
         ) public_option on public_option.id = target.child_id)
        as public_printing_option_leak_count,
      (select count(*)::int
         from target
         join public.external_printing_mappings mapping
           on mapping.card_printing_id = target.child_id
          and mapping.active = true) as external_printing_mapping_count,
      (select count(*)::int
         from target
         join public.external_mappings mapping
           on mapping.source = 'tcgplayer'
          and mapping.external_id = target.source_product_id::text
          and mapping.active = true
          and mapping.card_print_id = target.card_print_id)
        as exact_parent_tcgplayer_mapping_count,
      (select count(*)::int
         from target
         join public.external_mappings mapping
           on mapping.source = 'tcgplayer'
          and mapping.external_id = target.source_product_id::text
          and mapping.active = true
          and mapping.card_print_id <> target.card_print_id)
        as conflicting_parent_tcgplayer_mapping_count,
      (select count(*)::int
         from target
         join public.v_tcgplayer_market_qualification_candidates_v1 candidate
           on candidate.card_printing_id = target.child_id)
        as qualification_candidate_hidden_child_count,
      (select count(*)::int
         from target
         join public.market_price_qualification_decisions decision
           on decision.card_printing_id = target.child_id
          and decision.eligible = true
          and decision.decision = 'publish') as eligible_decision_count,
      (select count(*)::int
         from target
         join public.market_price_publication_snapshots snapshot
           on snapshot.card_printing_id = target.child_id)
        as historical_snapshot_count,
      (select count(*)::int
         from target
         join public.v_market_price_current_v1 current_price
           on current_price.card_printing_id = target.child_id)
        as current_price_count
  `, [JSON.stringify(targets)]);
  return result.rows[0];
}

async function queryParentMappingRows(client, targets) {
  const result = await client.query(`
    with ${targetCte()}
    select
      target.source_product_id,
      target.card_print_id::text as expected_card_print_id,
      target.printing_gv_id,
      mapping.id::text as external_mapping_id,
      mapping.card_print_id::text as mapped_card_print_id,
      (mapping.card_print_id = target.card_print_id) as exact_parent
    from target
    join public.external_mappings mapping
      on mapping.source = 'tcgplayer'
     and mapping.external_id = target.source_product_id::text
     and mapping.active = true
    order by target.source_product_id, mapping.id
  `, [JSON.stringify(targets)]);
  return result.rows;
}

async function main() {
  const url = connectionString();
  if (!url) throw new Error('A PostgreSQL connection string is required.');
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const targets = buildTargets(manifest);
  if (targets.length !== 143) throw new Error(`Expected 143 frozen targets; found ${targets.length}.`);

  const client = new Client({
    connectionString: url,
    ssl: url.includes('localhost') || url.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
    application_name: 'special-variant-printing-health-v1',
  });
  let metrics;
  let parentMappings;
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query("set local statement_timeout = '120s'");
    metrics = await queryMetrics(client, targets);
    parentMappings = await queryParentMappingRows(client, targets);
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  const validation = validateHealthMetrics(metrics, targets.length);
  const report = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    mode: 'read_only_health',
    db_writes_performed: false,
    approvals_performed: false,
    manifest_fingerprint_sha256: manifest.fingerprint_sha256,
    metrics,
    pricing_boundary: {
      safe: validation.healthy,
      failures: validation.failures,
      parent_tcgplayer_mappings_are_not_child_publication_authority: true,
      parent_mapping_rows: parentMappings,
    },
  };
  const outputPath = process.env.SPECIAL_VARIANT_PRINTING_HEALTH_OUTPUT
    ? path.resolve(process.cwd(), process.env.SPECIAL_VARIANT_PRINTING_HEALTH_OUTPUT)
    : DEFAULT_OUTPUT_PATH;
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!validation.healthy) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
