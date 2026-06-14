import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17e_stamped_active_finish_web_evidence_v1.json');
const PKG17E1_APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17e1_stamped_active_finish_parent_insert_real_apply_v1.json');
const PKG17E2_APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17e2_base_cosmos_child_insert_real_apply_v1.json');
const PKG17E3_APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17e3_stamped_active_finish_parent_insert_real_apply_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17e_stamped_active_finish_post_apply_reconciliation_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17e_stamped_active_finish_post_apply_reconciliation_v1.md');

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function normalizeNumber(value) {
  const text = String(value ?? '').trim();
  const stripped = text.replace(/^0+(?=\d)/, '');
  return stripped || text;
}

function normalizedSourceRows(source) {
  return (source.rows ?? []).map((row, index) => ({
    source_row_index: index,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_number_normalized: normalizeNumber(row.card_number),
    card_name: row.card_name,
    variant_key: row.variant_key,
    accepted_finish_key: row.accepted_finish_key ?? null,
    source_status: row.status,
    source_families: row.source_families ?? [],
    evidence_count: row.evidence_count ?? 0,
    selected_base_parent_id: row.selected_base_parent_id ?? null,
    source_blockers: row.blockers ?? [],
  }));
}

async function queryLiveRows(client, rows) {
  const result = await client.query(
    `with source_row as (
       select *
       from jsonb_to_recordset($1::jsonb) as row(
         source_row_index int,
         set_key text,
         set_name text,
         card_number text,
         card_number_normalized text,
         card_name text,
         variant_key text,
         accepted_finish_key text,
         source_status text,
         source_families jsonb,
         evidence_count int,
         selected_base_parent_id uuid,
         source_blockers jsonb
       )
     ),
     live as (
       select
         row.*,
         base.id as base_parent_id,
         coalesce(array_agg(distinct base_child.finish_key order by base_child.finish_key) filter (where base_child.finish_key is not null), '{}') as live_base_parent_child_finishes,
         variant_parent.id as variant_parent_id,
         variant_parent.variant_key as live_variant_key,
         variant_parent.printed_identity_modifier as live_printed_identity_modifier,
         count(distinct identity.id)::int as live_identity_rows,
         count(distinct variant_child.id)::int as live_child_rows,
         coalesce(array_agg(distinct variant_child.finish_key order by variant_child.finish_key) filter (where variant_child.finish_key is not null), '{}') as live_variant_child_finishes,
         count(distinct forbidden_child.id)::int as forbidden_stamped_child_rows
       from source_row row
       left join public.card_prints base
         on base.id = row.selected_base_parent_id
       left join public.card_printings base_child
         on base_child.card_print_id = base.id
       left join public.card_prints variant_parent
         on variant_parent.set_id = base.set_id
        and coalesce(nullif(ltrim(coalesce(variant_parent.number_plain, variant_parent.number), '0'), ''), '0') = coalesce(nullif(ltrim(row.card_number, '0'), ''), '0')
        and lower(variant_parent.name) = lower(row.card_name)
        and (
          coalesce(variant_parent.variant_key, '') = row.variant_key
          or coalesce(variant_parent.printed_identity_modifier, '') = row.variant_key
        )
       left join public.card_print_identity identity
         on identity.card_print_id = variant_parent.id
        and identity.is_active = true
       left join public.card_printings variant_child
         on variant_child.card_print_id = variant_parent.id
        and variant_child.finish_key = row.accepted_finish_key
       left join public.card_printings forbidden_child
         on forbidden_child.card_print_id = variant_parent.id
        and forbidden_child.finish_key = 'stamped'
       group by
         row.source_row_index,
         row.set_key,
         row.set_name,
         row.card_number,
         row.card_number_normalized,
         row.card_name,
         row.variant_key,
         row.accepted_finish_key,
         row.source_status,
         row.source_families,
         row.evidence_count,
         row.selected_base_parent_id,
         row.source_blockers,
         base.id,
         variant_parent.id,
         variant_parent.variant_key,
         variant_parent.printed_identity_modifier
     )
     select *
     from live
     order by set_key, card_number_normalized::text, card_name, variant_key`,
    [JSON.stringify(rows)],
  );

  return result.rows.map((row) => {
    let reconciliationStatus = 'not_write_candidate';
    const blockers = [];
    if (row.source_status === 'ready_for_guarded_dry_run') {
      if (!row.base_parent_id) blockers.push('base_parent_missing');
      if (!row.live_base_parent_child_finishes?.includes(row.accepted_finish_key)) blockers.push('base_finish_missing');
      if (!row.variant_parent_id) blockers.push('variant_parent_missing');
      if (row.live_identity_rows !== 1) blockers.push(`identity_rows_${row.live_identity_rows}`);
      if (row.live_child_rows !== 1) blockers.push(`child_rows_${row.live_child_rows}`);
      if (row.forbidden_stamped_child_rows !== 0) blockers.push('forbidden_stamped_child_finish_present');
      reconciliationStatus = blockers.length === 0 ? 'closed_verified_in_db' : 'ready_source_not_closed_in_db';
    } else if (row.source_status === 'review_only_single_source_family') {
      reconciliationStatus = 'blocked_single_source_family_review';
    } else if (row.source_status === 'blocked_no_exact_active_finish_evidence') {
      reconciliationStatus = 'blocked_no_exact_active_finish_evidence';
    } else if (row.source_status === 'blocked_conflicting_finish_evidence') {
      reconciliationStatus = 'blocked_conflicting_finish_evidence';
    }
    return {
      source_row_index: row.source_row_index,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      accepted_finish_key: row.accepted_finish_key,
      source_status: row.source_status,
      source_families: row.source_families,
      evidence_count: row.evidence_count,
      selected_base_parent_id: row.selected_base_parent_id,
      live_base_parent_child_finishes: row.live_base_parent_child_finishes,
      variant_parent_id: row.variant_parent_id,
      live_variant_key: row.live_variant_key,
      live_printed_identity_modifier: row.live_printed_identity_modifier,
      live_identity_rows: row.live_identity_rows,
      live_child_rows: row.live_child_rows,
      live_variant_child_finishes: row.live_variant_child_finishes,
      forbidden_stamped_child_rows: row.forbidden_stamped_child_rows,
      reconciliation_status: reconciliationStatus,
      reconciliation_blockers: blockers,
    };
  });
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_reconciliation_status).map(([status, count]) => [status, count]);
  const closedRows = report.rows
    .filter((row) => row.reconciliation_status === 'closed_verified_in_db')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.accepted_finish_key, row.variant_parent_id]);
  const blockedRows = report.rows
    .filter((row) => row.reconciliation_status !== 'closed_verified_in_db')
    .slice(0, 40)
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.source_status, row.reconciliation_status]);

  return `# PKG-17E Stamped Active Finish Post-Apply Reconciliation V1

Read-only reconciliation for the PKG-17E stamped active-finish evidence lane after PKG-17E1, PKG-17E2, and PKG-17E3.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- global_apply_performed: ${report.global_apply_performed}

## Summary

${markdownTable(['metric', 'value'], [
    ['source_rows', report.summary.source_rows],
    ['ready_source_rows', report.summary.ready_source_rows],
    ['closed_verified_in_db', report.summary.closed_verified_in_db],
    ['ready_source_not_closed_in_db', report.summary.ready_source_not_closed_in_db],
    ['blocked_or_review_rows', report.summary.blocked_or_review_rows],
    ['forbidden_stamped_child_rows', report.summary.forbidden_stamped_child_rows],
  ])}

## Status Counts

${markdownTable(['status', 'count'], statusRows)}

## Closed Rows

${markdownTable(['set', 'number', 'card', 'variant', 'finish', 'variant_parent_id'], closedRows)}

## Remaining Evidence-Lane Rows

${markdownTable(['set', 'number', 'card', 'variant', 'source_status', 'reconciliation_status'], blockedRows)}
`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const applyReports = {
    pkg17e1: await readJsonIfExists(PKG17E1_APPLY_JSON),
    pkg17e2: await readJsonIfExists(PKG17E2_APPLY_JSON),
    pkg17e3: await readJsonIfExists(PKG17E3_APPLY_JSON),
  };
  const conn = connectionString();
  if (!conn) throw new Error('missing_database_connection');

  const client = new Client({ connectionString: conn });
  await client.connect();
  let rows;
  try {
    rows = await queryLiveRows(client, normalizedSourceRows(source));
  } finally {
    await client.end().catch(() => {});
  }

  const readyRows = rows.filter((row) => row.source_status === 'ready_for_guarded_dry_run');
  const closedRows = rows.filter((row) => row.reconciliation_status === 'closed_verified_in_db');
  const readyOpenRows = rows.filter((row) => row.reconciliation_status === 'ready_source_not_closed_in_db');
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17e_stamped_active_finish_post_apply_reconciliation_v1',
    source_artifact: path.relative(ROOT, SOURCE_JSON).replaceAll('\\', '/'),
    apply_artifacts: Object.fromEntries(Object.entries(applyReports)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => [key, {
        package_id: value.package_id,
        apply_status: value.apply_status,
        package_fingerprint_sha256: value.package_fingerprint_sha256,
        write_counts: value.write_counts,
      }])),
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    summary: {
      source_rows: rows.length,
      ready_source_rows: readyRows.length,
      closed_verified_in_db: closedRows.length,
      ready_source_not_closed_in_db: readyOpenRows.length,
      blocked_or_review_rows: rows.length - readyRows.length,
      forbidden_stamped_child_rows: rows.reduce((sum, row) => sum + Number(row.forbidden_stamped_child_rows ?? 0), 0),
      by_reconciliation_status: countBy(rows, (row) => row.reconciliation_status),
      by_source_status: countBy(rows, (row) => row.source_status),
      by_set_for_closed: countBy(closedRows, (row) => row.set_key),
      by_set_for_open: countBy(rows.filter((row) => row.reconciliation_status !== 'closed_verified_in_db'), (row) => row.set_key),
    },
    rows,
    next_recommended_step: readyOpenRows.length === 0
      ? 'PKG-17E write lane is closed. Move to the remaining stamped evidence blockers or refresh the global stamped identity readiness report.'
      : 'Prepare a guarded package only for ready_source_not_closed_in_db rows after investigating blockers.',
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    summary: report.summary,
    next_recommended_step: report.next_recommended_step,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
