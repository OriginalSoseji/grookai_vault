import crypto from 'node:crypto';
import fs from 'node:fs';
import fsSync from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12_parent_identity_mismatch_strategy_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12d_me03_display_alias_child_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg12d_me03_display_alias_child_insert_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg12d_me03_display_alias_child_insert_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-12D-ME03-DISPLAY-ALIAS-CHILD-INSERTS';
const CREATED_BY = 'pkg12d_me03_display_alias_child_insert_guarded_dry_run_v1';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function targetRows(sourceRows) {
  return sourceRows.map((row) => {
    const parent = row.live_same_number_candidates?.[0];
    return {
      card_printing_id: crypto.randomUUID(),
      card_print_id: parent?.card_print_id ?? null,
      set_key: row.set_key,
      live_set_code: parent?.set_code ?? null,
      card_number: row.card_number,
      master_card_name: row.card_name,
      live_card_name: parent?.name ?? null,
      finish_key: row.finish_key,
      provenance_source: PROVENANCE_SOURCE,
      provenance_ref: `${row.set_key}:${row.card_number}:${row.finish_key}`,
      created_by: CREATED_BY,
      evidence_urls: row.evidence_urls ?? [],
      source_count: row.source_count,
    };
  });
}

async function captureSnapshot(client, rows) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         finish_key text
       )
     ),
     distinct_parent as (
       select distinct card_print_id
       from target
     )
     select
       'target_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       null::text as finish_key,
       null::text as target_card_printing_id
     from distinct_parent t
     join public.card_prints cp on cp.id = t.card_print_id
     union all
     select
       'existing_target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       t.card_printing_id::text as target_card_printing_id
     from target t
     join public.card_printings cpr
       on cpr.card_print_id = t.card_print_id
      and cpr.finish_key = t.finish_key
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'planned_id_collision' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       t.card_printing_id::text as target_card_printing_id
     from target t
     join public.card_printings cpr on cpr.id = t.card_printing_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by row_type, set_code nulls last, card_number nulls last, card_name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(rows)],
  );
  const snapshotRows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows: snapshotRows,
    hash_sha256: sha256(stableJson(snapshotRows)),
    counts: {
      target_parent_rows: snapshotRows.filter((row) => row.row_type === 'target_parent').length,
      existing_target_child_rows: snapshotRows.filter((row) => row.row_type === 'existing_target_child').length,
      planned_id_collision_rows: snapshotRows.filter((row) => row.row_type === 'planned_id_collision').length,
      total_rows: snapshotRows.length,
    },
  };
}

async function runDryRun(client, rows, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, rows);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '90s'");
    await client.query(
      `create temporary table pkg12d_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg12d_targets
       select
         row.card_printing_id::uuid,
         row.card_print_id::uuid,
         row.finish_key,
         row.provenance_source,
         row.provenance_ref,
         row.created_by
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         provenance_source text,
         provenance_ref text,
         created_by text
       )`,
      [JSON.stringify(rows)],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg12d_targets) as target_rows,
         (select count(distinct card_print_id)::int from pkg12d_targets) as target_parents,
         (select count(*)::int from pkg12d_targets target left join public.finish_keys fk on fk.key = target.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_rows,
         (select count(*)::int from pkg12d_targets target join public.card_printings cpr on cpr.card_print_id = target.card_print_id and cpr.finish_key = target.finish_key) as existing_child_rows,
         (select count(*)::int from pkg12d_targets target join public.card_printings cpr on cpr.id = target.card_printing_id) as planned_id_collisions`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_rows !== rows.length ||
      guardRow.target_parents !== rows.length ||
      guardRow.inactive_finish_rows !== 0 ||
      guardRow.existing_child_rows !== 0 ||
      guardRow.planned_id_collisions !== 0
    ) {
      throw new Error(`dry-run guard failed: ${JSON.stringify(guardRow)}`);
    }
    const insertResult = await client.query(
      `insert into public.card_printings (
         id,
         card_print_id,
         finish_key,
         is_provisional,
         provenance_source,
         provenance_ref,
         created_by
       )
       select
         card_printing_id,
         card_print_id,
         finish_key,
         false,
         provenance_source,
         provenance_ref,
         created_by
       from pkg12d_targets`,
    );
    if (insertResult.rowCount !== rows.length) throw new Error(`insert count mismatch: ${insertResult.rowCount}`);
    const proof = await client.query(
      `select $1::text as package_id, $2::text as package_fingerprint, count(*)::int as planned_child_rows
       from pkg12d_targets`,
      [PACKAGE_ID, fingerprint],
    );
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, rows);
    return {
      status: 'pkg12d_me03_display_alias_child_insert_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      status: 'pkg12d_me03_display_alias_child_insert_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: await captureSnapshot(client, rows).catch(() => null),
      rollback_proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-12D ME03 Display-Alias Child Insert Guarded Dry Run V1

Rollback-only dry run for ME03 child inserts on existing display-equivalent parents.

## Status

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? 'missing'}\`
- target_child_rows: ${report.scope?.target_child_rows ?? 0}
- target_parent_rows: ${report.scope?.target_parent_rows ?? 0}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}

## By Finish

${markdownTable(['finish_key', 'rows'], Object.entries(report.scope?.by_finish ?? {}))}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-12D ME03 Display-Alias Child Insert Guarded Dry Run Checkpoint V1](20260610_pkg12d_me03_display_alias_child_insert_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for 4 ME03 display-alias child inserts. No durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg12d_me03_display_alias_child_insert_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg12d_me03_display_alias_child_insert_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => (
  row.strategy_lane === 'child_insert_candidate' &&
  row.set_key === 'me03' &&
  row.strategy_status === 'display_alias_child_finish_insert_candidate'
));
const rows = targetRows(sourceRows);
const prerequisiteFindings = [];
if (rows.length !== 4) prerequisiteFindings.push('target_rows_not_4');
if (rows.some((row) => !row.card_print_id || !row.live_set_code || !row.live_card_name)) prerequisiteFindings.push('target_parent_resolution_missing');
if (rows.some((row) => row.live_set_code !== 'me03')) prerequisiteFindings.push('non_me03_target_present');
if (rows.some((row) => !['normal', 'holo'].includes(row.finish_key))) prerequisiteFindings.push('unexpected_finish_key');
const packageFingerprint = sha256(stableJson(rows.map((row) => ({
  set_key: row.set_key,
  card_number: row.card_number,
  master_card_name: row.master_card_name,
  live_card_name: row.live_card_name,
  finish_key: row.finish_key,
  card_print_id: row.card_print_id,
}))));

let report;
const conn = connectionString();
if (prerequisiteFindings.length) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg12d_me03_display_alias_child_insert_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    dry_run_status: 'blocked_prerequisite_findings',
    stop_findings: prerequisiteFindings,
    durable_db_writes_performed: false,
    db_writes_performed: false,
    migrations_created: false,
  };
} else if (!conn) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg12d_me03_display_alias_child_insert_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    dry_run_status: 'blocked_no_database_connection_string',
    stop_findings: ['database_connection_unavailable'],
    durable_db_writes_performed: false,
    db_writes_performed: false,
    migrations_created: false,
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const execution = await runDryRun(client, rows, packageFingerprint);
    const durableMatch = execution.before_snapshot?.hash_sha256 === execution.after_snapshot?.hash_sha256;
    const stopFindings = [
      ...(execution.error_message ? [`dry_run_error:${execution.error_message}`] : []),
      ...(execution.status !== 'pkg12d_me03_display_alias_child_insert_completed_rolled_back_no_durable_change' ? ['dry_run_not_passed'] : []),
      ...(!durableMatch ? ['durable_after_snapshot_differs_from_before_snapshot'] : []),
      ...(execution.before_snapshot?.counts?.existing_target_child_rows !== 0 ? ['before_existing_target_child_rows_present'] : []),
      ...(execution.before_snapshot?.counts?.planned_id_collision_rows !== 0 ? ['before_planned_id_collision_rows_present'] : []),
    ];
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg12d_me03_display_alias_child_insert_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageFingerprint,
      rollback_only: true,
      dry_run_status: execution.status,
      durable_db_writes_performed: false,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      real_apply_authorized: false,
      scope: {
        target_child_rows: rows.length,
        target_parent_rows: new Set(rows.map((row) => row.card_print_id)).size,
        by_set: countBy(rows, (row) => row.set_key),
        by_finish: countBy(rows, (row) => row.finish_key),
        rows,
      },
      before_snapshot: execution.before_snapshot,
      after_snapshot: execution.after_snapshot,
      rollback_proof_rows: execution.rollback_proof_rows,
      durable_after_snapshot_matches_before_snapshot: durableMatch,
      stop_findings: stopFindings,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  checkpoint_md: CHECKPOINT_MD,
  dry_run_status: report.dry_run_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  scope: report.scope,
  stop_findings: report.stop_findings,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));

if ((report.stop_findings ?? []).length !== 0) process.exitCode = 1;
