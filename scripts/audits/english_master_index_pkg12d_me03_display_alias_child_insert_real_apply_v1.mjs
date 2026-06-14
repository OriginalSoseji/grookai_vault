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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12d_me03_display_alias_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12d_me03_display_alias_child_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg12d_me03_display_alias_child_insert_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg12d_me03_display_alias_child_insert_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-12D-ME03-DISPLAY-ALIAS-CHILD-INSERTS';
const EXPECTED_FINGERPRINT = 'f0c8c9e8253a1697062c4aa6bbee65bd66def494d84b57705d80ece548eeeaa9';
const EXPECTED_DRY_RUN_PROOF = '9d39db282394c214ab1ee51dd933a3f7b498be82883328c825ffa145765fa39f';

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

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg12d_me03_display_alias_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_before_proof_hash_mismatch');
  if (dryRun.after_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_after_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.scope?.target_child_rows !== 4) findings.push('target_child_rows_not_4');
  if (dryRun.scope?.target_parent_rows !== 4) findings.push('target_parent_rows_not_4');
  if (JSON.stringify(dryRun.scope?.by_finish ?? {}) !== JSON.stringify({ holo: 1, normal: 3 })) findings.push('finish_scope_mismatch');
  return findings;
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
       'target_child' as row_type,
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
      target_child_rows: snapshotRows.filter((row) => row.row_type === 'target_child').length,
      planned_id_collision_rows: snapshotRows.filter((row) => row.row_type === 'planned_id_collision').length,
      total_rows: snapshotRows.length,
    },
  };
}

async function runApply(client, rows) {
  await client.query('begin');
  try {
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
      throw new Error(`apply guard failed: ${JSON.stringify(guardRow)}`);
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
    await client.query('commit');
    return { inserted_rows: insertResult.rowCount, error_message: null };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { inserted_rows: 0, error_message: error.message };
  }
}

function renderMarkdown(report) {
  return `# PKG-12D ME03 Display-Alias Child Insert Real Apply V1

Approved real apply for four ME03 child inserts on existing display-equivalent parents.

## Status

- apply_status: ${report.apply_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? 'missing'}\`
- inserted_rows: ${report.scope?.inserted_rows ?? 0}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}

## By Finish

${markdownTable(['finish_key', 'rows'], Object.entries(report.scope?.by_finish ?? {}))}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-12D ME03 Display-Alias Child Insert Real Apply Checkpoint V1](20260610_pkg12d_me03_display_alias_child_insert_real_apply_checkpoint_v1.md) | Applied 4 ME03 child-only inserts on display-equivalent parents. No parent writes, migrations, deletes, merges, unsupported cleanup, or quarantine. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg12d_me03_display_alias_child_insert_real_apply_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg12d_me03_display_alias_child_insert_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const rows = dryRun.scope?.rows ?? [];
const prerequisiteFindings = validateDryRun(dryRun);
let report;

if (prerequisiteFindings.length) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg12d_me03_display_alias_child_insert_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256 ?? null,
    apply_status: 'blocked_prerequisite_findings',
    prerequisite_findings: prerequisiteFindings,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  };
} else {
  const conn = connectionString();
  if (!conn) {
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg12d_me03_display_alias_child_insert_real_apply_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: dryRun.package_fingerprint_sha256 ?? null,
      apply_status: 'blocked_no_database_connection_string',
      prerequisite_findings: ['database_connection_unavailable'],
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    };
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      const beforeSnapshot = await captureSnapshot(client, rows);
      const applyResult = await runApply(client, rows);
      const afterSnapshot = await captureSnapshot(client, rows);
      const postFindings = [];
      if (applyResult.error_message) postFindings.push(`apply_error:${applyResult.error_message}`);
      if (beforeSnapshot.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) postFindings.push('before_snapshot_hash_not_dry_run_proof');
      if (applyResult.inserted_rows !== rows.length) postFindings.push('insert_count_mismatch');
      if (afterSnapshot.counts.target_child_rows !== rows.length) postFindings.push('post_target_child_count_mismatch');
      if (afterSnapshot.counts.target_parent_rows !== rows.length) postFindings.push('post_parent_count_mismatch');
      report = {
        generated_at: new Date().toISOString(),
        version: 'english_master_index_pkg12d_me03_display_alias_child_insert_real_apply_v1',
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: dryRun.package_fingerprint_sha256 ?? null,
        apply_status: postFindings.length ? 'applied_with_post_findings' : 'applied',
        prerequisite_findings: [],
        post_apply_findings: postFindings,
        db_writes_performed: applyResult.inserted_rows > 0,
        migrations_created: false,
        cleanup_performed: false,
        quarantine_performed: false,
        parent_writes_performed: false,
        deletes_performed: false,
        merges_performed: false,
        unsupported_cleanup_performed: false,
        scope: {
          inserted_rows: applyResult.inserted_rows,
          target_parent_rows: rows.length,
          by_set: countBy(rows, (row) => row.set_key),
          by_finish: countBy(rows, (row) => row.finish_key),
          rows,
        },
        before_snapshot: beforeSnapshot,
        after_snapshot: afterSnapshot,
      };
    } finally {
      await client.end().catch(() => {});
    }
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
  apply_status: report.apply_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  scope: report.scope,
  prerequisite_findings: report.prerequisite_findings,
  post_apply_findings: report.post_apply_findings,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
}, null, 2));
