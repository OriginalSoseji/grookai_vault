import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const LANES_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg34a_legacy_orphan_zero_pricing_dependency_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg34a_legacy_orphan_zero_pricing_dependency_readiness_v1.md');

const PACKAGE_ID = 'PKG-34A-LEGACY-ORPHAN-ZERO-PRICING-DEPENDENCY-READINESS';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function zeroish(value) {
  return value === null || value === undefined || Number(value) === 0;
}

function isZeroPriceCurve(row) {
  return row
    && Number(row.listing_count ?? 0) === 0
    && Number(row.confidence ?? 0) <= 0.2
    && ['nm', 'lp', 'mp', 'hp', 'dmg'].every((condition) => (
      zeroish(row[`${condition}_samples`])
      && row[`${condition}_median`] === null
      && row[`${condition}_floor`] === null
    ));
}

function isZeroEbaySnapshot(row) {
  return row
    && row.source === 'ebay_browse'
    && Number(row.listing_count ?? 0) === 0
    && Number(row.raw_sample_count_nm ?? 0) === 0
    && Number(row.raw_sample_count_lp ?? 0) === 0
    && row.nm_floor === null
    && row.nm_median === null
    && row.lp_floor === null
    && row.lp_median === null;
}

function isZeroEbayLatest(row) {
  return row
    && row.source === 'ebay_browse'
    && Number(row.listing_count ?? 0) === 0
    && Number(row.confidence ?? 0) <= 0.2
    && row.nm_floor === null
    && row.nm_median === null
    && row.lp_floor === null
    && row.lp_median === null;
}

function isCompletedScheduledJob(row) {
  return row
    && row.reason === 'scheduled_refresh'
    && row.status === 'done'
    && Number(row.attempts ?? 0) === 1
    && row.requester_user_id === null
    && row.error === null
    && row.locked_at === null
    && row.locked_by === null;
}

async function readSnapshot(rows) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', rows: [] };
  const parentIds = [...new Set(rows.map((row) => row.card_print_id))];
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         coalesce((select jsonb_agg(jsonb_build_object('id', cpr.id::text, 'finish_key', cpr.finish_key) order by cpr.id)
           from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as children,
         coalesce((select jsonb_agg(to_jsonb(cps) order by cps.id)
           from public.card_print_species cps where cps.card_print_id = cp.id), '[]'::jsonb) as species_rows,
         coalesce((select jsonb_agg(to_jsonb(cpc) order by cpc.id)
           from public.card_print_price_curves cpc where cpc.card_print_id = cp.id), '[]'::jsonb) as price_curve_rows,
         coalesce((select jsonb_agg(to_jsonb(eaps) order by eaps.id)
           from public.ebay_active_price_snapshots eaps where eaps.card_print_id = cp.id), '[]'::jsonb) as ebay_snapshot_rows,
         coalesce((select jsonb_agg(to_jsonb(eapl) order by eapl.card_print_id, eapl.source)
           from public.ebay_active_prices_latest eapl where eapl.card_print_id = cp.id), '[]'::jsonb) as ebay_latest_rows,
         coalesce((select jsonb_agg(to_jsonb(pj) order by pj.id)
           from public.pricing_jobs pj where pj.card_print_id = cp.id), '[]'::jsonb) as pricing_job_rows
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.number_plain, cp.number, cp.name`,
      [parentIds],
    );
    const fkResult = await client.query(
      `select tc.table_schema, tc.table_name, kcu.column_name, ccu.table_name as foreign_table_name
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on tc.constraint_name = kcu.constraint_name
        and tc.table_schema = kcu.table_schema
       join information_schema.constraint_column_usage ccu
         on ccu.constraint_name = tc.constraint_name
        and ccu.table_schema = tc.table_schema
       where tc.constraint_type = 'FOREIGN KEY'
         and tc.table_schema = 'public'
         and ccu.table_name in ('card_prints', 'card_printings')
       order by ccu.table_name, tc.table_name, kcu.column_name`,
    );
    const childIds = rows.map((row) => row.card_printing_id);
    const allowedParentTables = new Set([
      'card_printings',
      'card_print_species',
      'card_print_price_curves',
      'ebay_active_price_snapshots',
      'ebay_active_prices_latest',
      'pricing_jobs',
    ]);
    const blockingReferences = [];
    for (const ref of fkResult.rows) {
      if (ref.foreign_table_name === 'card_prints' && allowedParentTables.has(ref.table_name)) continue;
      const ids = ref.foreign_table_name === 'card_prints' ? parentIds : childIds;
      const query = `select ${pg.escapeIdentifier(ref.column_name)}::text as id, count(*)::int as count
        from ${pg.escapeIdentifier(ref.table_schema)}.${pg.escapeIdentifier(ref.table_name)}
        where ${pg.escapeIdentifier(ref.column_name)} = any($1::uuid[])
        group by ${pg.escapeIdentifier(ref.column_name)}`;
      const refResult = await client.query(query, [ids]);
      for (const row of refResult.rows) {
        blockingReferences.push({ ...ref, id: row.id, count: Number(row.count ?? 0) });
      }
    }
    await client.query('rollback');
    return { available: true, reason: null, rows: result.rows, blocking_references: blockingReferences };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, rows: [], blocking_references: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function classify(row, parent, blockingReferences) {
  if (!parent) {
    return { classification: 'blocked_parent_snapshot_missing', action: 'do_not_apply', reason: 'parent not found in fresh snapshot' };
  }
  const childBlocking = blockingReferences.filter((ref) => ref.foreign_table_name === 'card_printings' && ref.id === row.card_printing_id);
  const parentBlocking = blockingReferences.filter((ref) => ref.foreign_table_name === 'card_prints' && ref.id === row.card_print_id);
  if (childBlocking.length > 0 || parentBlocking.length > 0) {
    return { classification: 'blocked_unexpected_dependencies_present', action: 'do_not_apply', reason: 'parent or child has references outside the allowed zero-pricing cleanup scope' };
  }
  if (parent.set_code !== 'legacy_orphan') {
    return { classification: 'blocked_parent_set_code_changed', action: 'do_not_apply', reason: 'parent is no longer legacy_orphan' };
  }
  const children = parent.children ?? [];
  if (children.length !== 1 || children[0]?.id !== row.card_printing_id || children[0]?.finish_key !== 'normal') {
    return { classification: 'blocked_child_snapshot_mismatch', action: 'do_not_apply', reason: 'parent does not have exactly one matching normal child' };
  }
  const speciesRows = parent.species_rows ?? [];
  if (
    speciesRows.length !== 1
    || speciesRows[0]?.source !== 'grookai_dex_name_rule_v1'
    || speciesRows[0]?.role !== 'primary'
    || speciesRows[0]?.active !== true
    || speciesRows[0]?.counts_for_completion !== true
  ) {
    return { classification: 'blocked_species_not_expected_derived_mapping', action: 'do_not_apply', reason: 'species row is not exactly one active derived name-rule mapping' };
  }
  if (
    parent.price_curve_rows.length !== 1
    || parent.ebay_snapshot_rows.length !== 1
    || parent.ebay_latest_rows.length !== 1
    || parent.pricing_job_rows.length !== 1
  ) {
    return { classification: 'blocked_pricing_row_count_mismatch', action: 'do_not_apply', reason: 'expected exactly one row in each zero-pricing table' };
  }
  if (
    !isZeroPriceCurve(parent.price_curve_rows[0])
    || !isZeroEbaySnapshot(parent.ebay_snapshot_rows[0])
    || !isZeroEbayLatest(parent.ebay_latest_rows[0])
    || !isCompletedScheduledJob(parent.pricing_job_rows[0])
  ) {
    return { classification: 'blocked_pricing_rows_not_zero_signal', action: 'do_not_apply', reason: 'pricing/eBay rows are not zero-signal scheduled-refresh debris' };
  }
  return {
    classification: 'legacy_orphan_zero_pricing_delete_candidate',
    action: 'eligible_for_guarded_dry_run_zero_pricing_species_child_parent_delete',
    reason: 'legacy_orphan row has only zero-signal pricing dependencies plus one derived species row and one normal child',
    species_mapping_id: speciesRows[0].id,
    price_curve_id: parent.price_curve_rows[0].id,
    ebay_snapshot_id: parent.ebay_snapshot_rows[0].id,
    ebay_latest_source: parent.ebay_latest_rows[0].source,
    pricing_job_id: parent.pricing_job_rows[0].id,
  };
}

function buildMarkdown(report) {
  return `# PKG-34A Legacy Orphan Zero Pricing Dependency Readiness V1

Read-only readiness report for the two remaining \`legacy_orphan\` rows that were blocked by pricing/eBay dependencies.

No DB writes were performed. No migrations were created. No deletes, merges, quarantine, or global apply are authorized by this report.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['target_rows', report.summary.target_rows],
    ['eligible_rows', report.summary.eligible_rows],
    ['blocked_rows', report.summary.blocked_rows],
    ['db_writes_performed', false],
    ['migrations_created', false],
  ])}

## Classification Counts

${markdownTable(['classification', 'rows'], Object.entries(report.summary.by_classification))}

## Eligible Rows

${markdownTable(
    ['number', 'name', 'parent', 'child', 'species', 'pricing_job'],
    report.rows
      .filter((row) => row.action === 'eligible_for_guarded_dry_run_zero_pricing_species_child_parent_delete')
      .map((row) => [row.number, row.card_name, row.card_print_id, row.card_printing_id, row.species_mapping_id, row.pricing_job_id]),
  )}

## Governance Rule

Rows are eligible only when every pricing/eBay dependency is zero-signal generated debris: zero listings, zero samples, null prices, low confidence, completed scheduled job, no requester, and no other FK references.
`;
}

async function main() {
  const lanes = await readJson(LANES_JSON);
  const targetRows = (lanes.rows ?? []).filter((row) => row.lane === 'set_unmapped' && row.set_code === 'legacy_orphan');
  const snapshot = await readSnapshot(targetRows);
  const parentById = new Map((snapshot.rows ?? []).map((row) => [row.card_print_id, row]));
  const rows = targetRows.map((row) => ({
    ...row,
    parent_snapshot: parentById.get(row.card_print_id) ?? null,
    ...classify(row, parentById.get(row.card_print_id), snapshot.blocking_references ?? []),
  }));
  const eligibleRows = rows.filter((row) => row.action === 'eligible_for_guarded_dry_run_zero_pricing_species_child_parent_delete').length;
  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    source_inputs: { lanes_json: path.relative(process.cwd(), LANES_JSON) },
    safety: {
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      deletes_authorized: false,
      real_apply_authorized: false,
    },
    snapshot: {
      available: snapshot.available,
      reason: snapshot.reason,
      parent_rows_read: snapshot.rows?.length ?? 0,
      blocking_references: snapshot.blocking_references ?? [],
    },
    summary: {
      target_rows: rows.length,
      eligible_rows: eligibleRows,
      blocked_rows: rows.length - eligibleRows,
      by_classification: countBy(rows, (row) => row.classification),
      by_action: countBy(rows, (row) => row.action),
    },
    rows,
  };
  report.fingerprint = sha256(stableJson({
    package_id: report.package_id,
    summary: report.summary,
    rows: rows.map((row) => ({
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      species_mapping_id: row.species_mapping_id ?? null,
      price_curve_id: row.price_curve_id ?? null,
      ebay_snapshot_id: row.ebay_snapshot_id ?? null,
      pricing_job_id: row.pricing_job_id ?? null,
      classification: row.classification,
      action: row.action,
    })),
  }));
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(process.cwd(), OUTPUT_JSON),
    output_md: path.relative(process.cwd(), OUTPUT_MD),
    fingerprint: report.fingerprint,
    summary: report.summary,
  }, null, 2));
}

await main();
