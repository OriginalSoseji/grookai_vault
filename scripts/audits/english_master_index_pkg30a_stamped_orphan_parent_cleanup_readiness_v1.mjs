import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const LANES_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg30a_stamped_orphan_parent_cleanup_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg30a_stamped_orphan_parent_cleanup_readiness_v1.md');

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
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function isStampedVariant(row) {
  return /stamp/.test(normalizeText(row.variant_key)) || /stamp/.test(normalizeText(row.printed_identity_modifier));
}

async function readParentSnapshot(rows) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', rows: [] };
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
         cp.printed_identity_modifier,
         cp.variant_key,
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = cp.id) as child_count,
         coalesce((select jsonb_agg(jsonb_build_object('id', cpr.id::text, 'finish_key', cpr.finish_key) order by cpr.finish_key, cpr.id) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as children,
         coalesce((select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id and cpi.is_active is true), 0) as active_identity_count,
         coalesce((select count(*)::int from public.external_mappings em where em.card_print_id = cp.id), 0) as external_mapping_count,
         coalesce((select count(*)::int from public.card_print_species cps where cps.card_print_id = cp.id), 0) as species_count,
         coalesce((select count(*)::int from public.canon_warehouse_candidates cwc where cwc.promoted_card_print_id = cp.id), 0) as warehouse_parent_refs
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.set_code, cp.number_plain, cp.number, cp.name`,
      [[...new Set(rows.map((row) => row.card_print_id))]],
    );
    await client.query('rollback');
    return { available: true, reason: null, rows: result.rows };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, rows: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function classify(row, parent) {
  if (!isStampedVariant(row)) {
    return {
      classification: 'blocked_not_stamped_variant',
      action: 'do_not_apply',
      reason: 'row is not stamped according to modifier/variant keys',
    };
  }
  if (!parent) {
    return {
      classification: 'blocked_parent_snapshot_missing',
      action: 'do_not_apply',
      reason: 'parent row was not found in fresh read-only snapshot',
    };
  }
  const parentDependencyTotal = Number(parent.active_identity_count)
    + Number(parent.external_mapping_count)
    + Number(parent.species_count)
    + Number(parent.warehouse_parent_refs);
  if (parentDependencyTotal > 0) {
    return {
      classification: 'blocked_parent_has_dependencies_or_identity',
      action: 'do_not_apply',
      reason: 'parent has identity or dependency references and needs a separate transfer/preserve strategy',
    };
  }
  if (Number(parent.child_count) !== 1) {
    return {
      classification: 'blocked_parent_has_multiple_children',
      action: 'do_not_apply',
      reason: 'parent has more than one child; child-only cleanup needs separate review',
    };
  }
  if ((parent.children ?? [])[0]?.id !== row.card_printing_id || (parent.children ?? [])[0]?.finish_key !== row.finish_key) {
    return {
      classification: 'blocked_child_snapshot_mismatch',
      action: 'do_not_apply',
      reason: 'fresh parent child snapshot does not match the unsupported row',
    };
  }
  return {
    classification: 'stamped_orphan_parent_delete_candidate_no_dependencies',
    action: 'eligible_for_guarded_dry_run_parent_and_child_delete',
    reason: 'unsupported stamped cosmos row is an isolated parent with one child and no identity/dependency references',
  };
}

function buildMarkdown(report) {
  return `# PKG-30A Stamped Orphan Parent Cleanup Readiness V1

Read-only readiness report for stamped cosmos rows that remain unsupported by the Master Index.

No DB writes were performed. No migrations were created. No deletes, merges, quarantine, or global apply are authorized by this report.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['target_rows', report.summary.target_rows],
    ['eligible_parent_child_delete_candidates', report.summary.by_classification.stamped_orphan_parent_delete_candidate_no_dependencies ?? 0],
    ['blocked_rows', report.summary.blocked_rows],
    ['db_writes_performed', false],
    ['migrations_created', false],
  ])}

## Classification Counts

${markdownTable(['classification', 'rows'], Object.entries(report.summary.by_classification))}

## Eligible Rows

${markdownTable(
    ['set', 'card', 'variant', 'child', 'parent'],
    report.rows
      .filter((row) => row.action === 'eligible_for_guarded_dry_run_parent_and_child_delete')
      .map((row) => [
        row.canonical_set_key,
        `${row.number} ${row.card_name} ${row.finish_key}`,
        row.variant_key || row.printed_identity_modifier,
        row.card_printing_id,
        row.card_print_id,
      ]),
  )}

## Blocked Rows

${markdownTable(
    ['set', 'card', 'variant', 'classification', 'reason'],
    report.rows
      .filter((row) => row.action !== 'eligible_for_guarded_dry_run_parent_and_child_delete')
      .map((row) => [
        row.canonical_set_key,
        `${row.number} ${row.card_name} ${row.finish_key}`,
        row.variant_key || row.printed_identity_modifier,
        row.classification,
        row.reason,
      ]),
  )}
`;
}

async function main() {
  const lanes = await readJson(LANES_JSON);
  const targetRows = (lanes.rows ?? []).filter((row) => row.lane === 'known_card_unsupported_finish_review');
  const snapshot = await readParentSnapshot(targetRows);
  const parentById = new Map((snapshot.rows ?? []).map((row) => [row.card_print_id, row]));
  const rows = targetRows.map((row) => {
    const parent = parentById.get(row.card_print_id);
    return {
      ...row,
      parent_snapshot: parent ?? null,
      ...classify(row, parent),
    };
  });
  const blockedRows = rows.filter((row) => row.action !== 'eligible_for_guarded_dry_run_parent_and_child_delete').length;
  const report = {
    package_id: 'PKG-30A-STAMPED-ORPHAN-PARENT-CLEANUP-READINESS',
    generated_at: new Date().toISOString(),
    source_inputs: {
      lanes_json: path.relative(process.cwd(), LANES_JSON),
    },
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      deletes_authorized: false,
      real_apply_authorized: false,
    },
    snapshot: {
      available: snapshot.available,
      reason: snapshot.reason,
      parent_rows_read: snapshot.rows?.length ?? 0,
    },
    summary: {
      target_rows: rows.length,
      blocked_rows: blockedRows,
      by_classification: countBy(rows, (row) => row.classification),
      by_set: countBy(rows, (row) => row.canonical_set_key),
      by_variant: countBy(rows, (row) => row.variant_key || row.printed_identity_modifier || 'none'),
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
