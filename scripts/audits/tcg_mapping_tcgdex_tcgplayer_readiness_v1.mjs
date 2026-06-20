import '../../backend/env.mjs';

import { mkdir, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

import { createBackendClient } from '../../backend/supabase_backend_client.mjs';
import { createTcgdexClient } from '../../backend/clients/tcgdex.mjs';

const DEFAULT_OUTPUT_DIR = 'docs/audits/tcg_mapping_v1';
const PAGE_SIZE = 1000;
const CARD_PRINT_LOOKUP_BATCH_SIZE = 100;
const PRODUCT_ID_PATHS = [
  { key: 'normal', path: 'pricing.tcgplayer.normal.productId' },
  { key: 'holofoil', path: 'pricing.tcgplayer.holofoil.productId' },
  { key: 'reverse-holofoil', path: 'pricing.tcgplayer.reverse-holofoil.productId' },
  { key: '1st-edition', path: 'pricing.tcgplayer.1st-edition.productId' },
  { key: '1st-edition-holofoil', path: 'pricing.tcgplayer.1st-edition-holofoil.productId' },
  { key: 'unlimited', path: 'pricing.tcgplayer.unlimited.productId' },
  { key: 'unlimited-holofoil', path: 'pricing.tcgplayer.unlimited-holofoil.productId' },
];

function parseArgs() {
  const options = {
    limit: null,
    concurrency: 4,
    outputDir: DEFAULT_OUTPUT_DIR,
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--limit' && args[index + 1]) {
      const value = Number(args[index + 1]);
      if (Number.isFinite(value) && value > 0) options.limit = Math.trunc(value);
      index += 1;
    } else if (token.startsWith('--limit=')) {
      const value = Number(token.split('=')[1]);
      if (Number.isFinite(value) && value > 0) options.limit = Math.trunc(value);
    } else if (token === '--concurrency' && args[index + 1]) {
      const value = Number(args[index + 1]);
      if (Number.isFinite(value) && value > 0) options.concurrency = Math.max(1, Math.min(8, Math.trunc(value)));
      index += 1;
    } else if (token.startsWith('--concurrency=')) {
      const value = Number(token.split('=')[1]);
      if (Number.isFinite(value) && value > 0) options.concurrency = Math.max(1, Math.min(8, Math.trunc(value)));
    } else if (token === '--output-dir' && args[index + 1]) {
      options.outputDir = args[index + 1];
      index += 1;
    } else if (token.startsWith('--output-dir=')) {
      options.outputDir = token.slice('--output-dir='.length);
    }
  }

  return options;
}

function uniqueStrings(values) {
  return Array.from(new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)));
}

function collectProductIdDetails(payload) {
  const tcgplayerPricing = payload?.pricing?.tcgplayer;
  if (!tcgplayerPricing || typeof tcgplayerPricing !== 'object') {
    return { productIds: [], validatedVariantPaths: [] };
  }

  const productIds = [];
  const validatedVariantPaths = [];
  for (const entry of PRODUCT_ID_PATHS) {
    const value = tcgplayerPricing?.[entry.key]?.productId;
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (!normalized) continue;
    productIds.push(normalized);
    validatedVariantPaths.push(entry.path);
  }

  return { productIds, validatedVariantPaths };
}

function classifyProductIds(productIds) {
  if (productIds.length === 0) return { status: 'no_product_id', productId: null };
  const distinct = uniqueStrings(productIds);
  if (distinct.length === 1) return { status: 'ready', productId: distinct[0] };
  return { status: 'ambiguous_product_ids', productId: null };
}

async function fetchAllActiveMappings(supabase, source) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('external_mappings')
      .select('card_print_id,external_id,synced_at')
      .eq('source', source)
      .eq('active', true)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`[tcg-mapping-readiness] ${source} mapping query failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchCardPrints(supabase, ids) {
  const byId = new Map();
  const uniqueIds = uniqueStrings(ids);
  for (let index = 0; index < uniqueIds.length; index += CARD_PRINT_LOOKUP_BATCH_SIZE) {
    const batch = uniqueIds.slice(index, index + CARD_PRINT_LOOKUP_BATCH_SIZE);
    const { data, error } = await supabase
      .from('card_prints')
      .select('id,set_code,number,name,gv_id')
      .in('id', batch);

    if (error) throw new Error(`[tcg-mapping-readiness] card_prints query failed: ${error.message}`);
    for (const row of data ?? []) byId.set(row.id, row);
  }
  return byId;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# TCG Mapping TCGdex -> TCGplayer Readiness V1');
  lines.push('');
  lines.push('Audit-only readiness report. No DB writes, no migrations, no cleanup, no image writes.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push(`- generated_at: \`${report.generated_at}\``);
  lines.push(`- input_active_tcgdex_mappings: ${report.totals.input_active_tcgdex_mappings}`);
  lines.push(`- input_active_tcgplayer_mappings: ${report.totals.input_active_tcgplayer_mappings}`);
  lines.push(`- missing_tcgplayer_candidates_scoped: ${report.totals.missing_tcgplayer_candidates_scoped}`);
  lines.push(`- ready_to_insert: ${report.totals.ready_to_insert}`);
  lines.push(`- no_product_id: ${report.totals.no_product_id}`);
  lines.push(`- ambiguous_product_ids: ${report.totals.ambiguous_product_ids}`);
  lines.push(`- conflicting_existing_external_id: ${report.totals.conflicting_existing_external_id}`);
  lines.push(`- fetch_error: ${report.totals.fetch_error}`);
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- cleanup_performed: false');
  lines.push('- image_writes_performed: false');
  lines.push('- source: active TCGdex external mappings plus live TCGdex pricing payload product IDs');
  lines.push('- target: missing active `external_mappings.source = tcgplayer` rows only');
  lines.push('');
  lines.push('## TLS Note');
  lines.push('');
  lines.push(report.tls_note);
  lines.push('');
  lines.push('## Ready Sample');
  lines.push('');
  const sample = report.ready_rows.slice(0, 25);
  if (sample.length === 0) {
    lines.push('No ready rows in this run.');
  } else {
    lines.push('| set | number | name | card_print_id | tcgdex | tcgplayer |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const row of sample) {
      lines.push(
        `| ${row.set_code ?? ''} | ${row.number ?? ''} | ${(row.name ?? '').replace(/\|/g, '\\|')} | \`${row.card_print_id}\` | \`${row.tcgdex_external_id}\` | \`${row.tcgplayer_external_id}\` |`,
      );
    }
  }
  lines.push('');
  lines.push('## Next Package');
  lines.push('');
  if (report.totals.ready_to_insert > 0) {
    lines.push('Recommended next package: `TCGMAP-01A-TCGDEX-TCGPLAYER-MAPPING-INSERTS` guarded dry-run only.');
    lines.push('Package should insert only the `ready_to_insert` rows from this exact report fingerprint.');
  } else {
    lines.push('No insert package is recommended from this run.');
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs();
  const supabase = createBackendClient();
  const tcgdex = createTcgdexClient();
  const generatedAt = new Date().toISOString();

  const [tcgdexMappings, tcgplayerMappings] = await Promise.all([
    fetchAllActiveMappings(supabase, 'tcgdex'),
    fetchAllActiveMappings(supabase, 'tcgplayer'),
  ]);

  const tcgplayerCardIds = new Set(tcgplayerMappings.map((row) => row.card_print_id).filter(Boolean));
  const tcgplayerExternalIdToCardIds = new Map();
  for (const row of tcgplayerMappings) {
    const externalId = String(row.external_id ?? '').trim();
    if (!externalId) continue;
    if (!tcgplayerExternalIdToCardIds.has(externalId)) tcgplayerExternalIdToCardIds.set(externalId, new Set());
    if (row.card_print_id) tcgplayerExternalIdToCardIds.get(externalId).add(row.card_print_id);
  }

  const missingCandidates = [];
  const seenCardPrintIds = new Set();
  for (const row of tcgdexMappings) {
    if (!row.card_print_id || !row.external_id) continue;
    if (tcgplayerCardIds.has(row.card_print_id)) continue;
    if (seenCardPrintIds.has(row.card_print_id)) continue;
    seenCardPrintIds.add(row.card_print_id);
    missingCandidates.push(row);
    if (options.limit != null && missingCandidates.length >= options.limit) break;
  }

  const cardPrintById = await fetchCardPrints(
    supabase,
    missingCandidates.map((row) => row.card_print_id),
  );

  const rows = await mapWithConcurrency(missingCandidates, options.concurrency, async (mapping) => {
    const card = cardPrintById.get(mapping.card_print_id) ?? {};
    try {
      const payload = await tcgdex.fetchTcgdexCardById(mapping.external_id);
      const { productIds, validatedVariantPaths } = collectProductIdDetails(payload);
      const classification = classifyProductIds(productIds);

      if (classification.status !== 'ready') {
        return {
          status: classification.status,
          card_print_id: mapping.card_print_id,
          tcgdex_external_id: mapping.external_id,
          set_code: card.set_code ?? null,
          number: card.number ?? null,
          name: card.name ?? null,
          gv_id: card.gv_id ?? null,
          product_ids: uniqueStrings(productIds),
          validated_variant_paths: validatedVariantPaths,
        };
      }

      const existingCardIdsForProduct = Array.from(
        tcgplayerExternalIdToCardIds.get(classification.productId) ?? [],
      ).filter((id) => id !== mapping.card_print_id);

      if (existingCardIdsForProduct.length > 0) {
        return {
          status: 'conflicting_existing_external_id',
          card_print_id: mapping.card_print_id,
          tcgdex_external_id: mapping.external_id,
          set_code: card.set_code ?? null,
          number: card.number ?? null,
          name: card.name ?? null,
          gv_id: card.gv_id ?? null,
          product_ids: uniqueStrings(productIds),
          tcgplayer_external_id: classification.productId,
          conflicting_card_print_ids: existingCardIdsForProduct,
          validated_variant_paths: validatedVariantPaths,
        };
      }

      return {
        status: 'ready_to_insert',
        card_print_id: mapping.card_print_id,
        tcgdex_external_id: mapping.external_id,
        set_code: card.set_code ?? null,
        number: card.number ?? null,
        name: card.name ?? null,
        gv_id: card.gv_id ?? null,
        product_ids: uniqueStrings(productIds),
        tcgplayer_external_id: classification.productId,
        validated_variant_paths: validatedVariantPaths,
        meta: {
          derived_from: 'tcgdex_pricing_productId',
          tcgdex_external_id: mapping.external_id,
          validated_variant_paths: validatedVariantPaths,
          promoted_by: 'tcg_mapping_tcgdex_tcgplayer_readiness_v1',
        },
      };
    } catch (error) {
      return {
        status: 'fetch_error',
        card_print_id: mapping.card_print_id,
        tcgdex_external_id: mapping.external_id,
        set_code: card.set_code ?? null,
        number: card.number ?? null,
        name: card.name ?? null,
        gv_id: card.gv_id ?? null,
        error_message: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const totals = {
    input_active_tcgdex_mappings: tcgdexMappings.length,
    input_active_tcgplayer_mappings: tcgplayerMappings.length,
    missing_tcgplayer_candidates_total: tcgdexMappings.filter((row) => row.card_print_id && !tcgplayerCardIds.has(row.card_print_id)).length,
    missing_tcgplayer_candidates_scoped: missingCandidates.length,
    ready_to_insert: rows.filter((row) => row.status === 'ready_to_insert').length,
    no_product_id: rows.filter((row) => row.status === 'no_product_id').length,
    ambiguous_product_ids: rows.filter((row) => row.status === 'ambiguous_product_ids').length,
    conflicting_existing_external_id: rows.filter((row) => row.status === 'conflicting_existing_external_id').length,
    fetch_error: rows.filter((row) => row.status === 'fetch_error').length,
  };

  const reportPayload = {
    generated_at: generatedAt,
    contract: 'TCG_MAPPING_TCGDEX_TCGPLAYER_READINESS_V1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    image_writes_performed: false,
    options,
    tls_note:
      process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
        ? 'This run used a local one-command Node TLS workaround because Windows Node could not verify the TCGdex certificate chain. The workaround is not persisted in code or configuration.'
        : 'This run did not use a TLS workaround.',
    totals,
    rows,
    ready_rows: rows.filter((row) => row.status === 'ready_to_insert'),
    blocked_rows: rows.filter((row) => row.status !== 'ready_to_insert'),
  };

  const fingerprintInput = JSON.stringify({
    contract: reportPayload.contract,
    options,
    totals,
    ready_rows: reportPayload.ready_rows.map((row) => ({
      card_print_id: row.card_print_id,
      tcgdex_external_id: row.tcgdex_external_id,
      tcgplayer_external_id: row.tcgplayer_external_id,
    })),
  });
  reportPayload.fingerprint_sha256 = crypto.createHash('sha256').update(fingerprintInput).digest('hex');

  await mkdir(options.outputDir, { recursive: true });
  const jsonPath = path.join(options.outputDir, 'tcg_mapping_tcgdex_tcgplayer_readiness_v1.json');
  const mdPath = path.join(options.outputDir, 'tcg_mapping_tcgdex_tcgplayer_readiness_v1.md');
  await writeFile(jsonPath, `${JSON.stringify(reportPayload, null, 2)}\n`);
  await writeFile(mdPath, buildMarkdown(reportPayload));

  console.log(
    JSON.stringify(
      {
        output_json: jsonPath,
        output_md: mdPath,
        fingerprint_sha256: reportPayload.fingerprint_sha256,
        totals,
        audit_only: true,
        db_writes_performed: false,
        migrations_created: false,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('[tcg-mapping-readiness] failed:', error);
  process.exit(1);
});
