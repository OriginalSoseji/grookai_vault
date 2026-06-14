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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12b_prefix_parent_modifier_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12b_prefix_parent_modifier_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg12b_prefix_parent_modifier_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg12b_prefix_parent_modifier_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-12B-PREFIX-PARENT-MODIFIER-BACKFILL';

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
  if (dryRun.dry_run_status !== 'pkg12b_prefix_parent_modifier_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (!dryRun.recommended_real_apply_approval_text) findings.push('dry_run_missing_recommended_approval_text');
  if (dryRun.scope?.target_update_rows !== 8) findings.push('target_update_rows_not_8');
  if (JSON.stringify(dryRun.scope?.by_prefix ?? {}) !== JSON.stringify({ RC: 5, SL: 3 })) findings.push('prefix_scope_mismatch');
  if (dryRun.before_snapshot?.hash_sha256 !== dryRun.after_snapshot?.hash_sha256) findings.push('dry_run_proof_hash_mismatch');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         target_printed_identity_modifier text
       )
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints cp on cp.id = t.card_print_id
     union all
     select
       'child' as row_type,
       cpr.id::text as row_id,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       cp.variant_key,
       cpr.finish_key
     from target t
     join public.card_printings cpr on cpr.card_print_id = t.card_print_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by row_type, set_code nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      parent_rows: rows.filter((row) => row.row_type === 'parent').length,
      child_rows: rows.filter((row) => row.row_type === 'child').length,
      total_rows: rows.length,
    },
  };
}

async function runApply(client, targets) {
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg12b_targets (
         card_print_id uuid primary key,
         target_printed_identity_modifier text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg12b_targets
       select row.card_print_id::uuid, row.target_printed_identity_modifier
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         target_printed_identity_modifier text
       )`,
      [JSON.stringify(targets)],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg12b_targets) as target_rows,
         (select count(*)::int
          from pkg12b_targets t
          join public.card_prints cp on cp.id = t.card_print_id
          where coalesce(cp.printed_identity_modifier, '') <> '') as already_modified_rows,
         (select count(*)::int
          from pkg12b_targets t
          join public.card_prints cp on cp.id <> t.card_print_id
          join public.card_prints current_cp on current_cp.id = t.card_print_id
          where cp.set_id = current_cp.set_id
            and coalesce(cp.number_plain, '') = coalesce(current_cp.number_plain, '')
            and coalesce(cp.printed_identity_modifier, '') = t.target_printed_identity_modifier
            and coalesce(cp.variant_key, '') = coalesce(current_cp.variant_key, '')) as target_modifier_collisions`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_rows !== targets.length ||
      guardRow.already_modified_rows !== 0 ||
      guardRow.target_modifier_collisions !== 0
    ) {
      throw new Error(`apply guard failed: ${JSON.stringify(guardRow)}`);
    }
    const update = await client.query(
      `update public.card_prints cp
       set printed_identity_modifier = t.target_printed_identity_modifier
       from pkg12b_targets t
       where cp.id = t.card_print_id
         and cp.printed_identity_modifier is null
       returning cp.id::text as card_print_id, cp.set_code, cp.number, cp.number_plain, cp.printed_identity_modifier, cp.name`,
    );
    if (update.rowCount !== targets.length) {
      throw new Error(`update count mismatch: ${update.rowCount} !== ${targets.length}`);
    }
    await client.query('commit');
    return { updated_rows: update.rows, error_message: null };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { updated_rows: [], error_message: error.message };
  }
}

function renderMarkdown(report) {
  return `# PKG-12B Prefix Parent Modifier Real Apply V1

Approved real apply for protected RC/SL parent identity modifiers.

## Status

- apply_status: ${report.apply_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? 'missing'}\`
- updated_rows: ${report.scope?.updated_rows ?? 0}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}

## By Prefix

${markdownTable(['prefix', 'rows'], Object.entries(report.scope?.by_prefix ?? {}))}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-12B Prefix Parent Modifier Real Apply Checkpoint V1](20260610_pkg12b_prefix_parent_modifier_real_apply_checkpoint_v1.md) | Applied 8 protected RC/SL parent printed_identity_modifier updates. No migrations, child writes, deletes, merges, or cleanup. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg12b_prefix_parent_modifier_real_apply_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg12b_prefix_parent_modifier_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const targets = dryRun.scope?.target_rows ?? [];
const prerequisiteFindings = validateDryRun(dryRun);
let report;

if (prerequisiteFindings.length) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg12b_prefix_parent_modifier_real_apply_v1',
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
      version: 'english_master_index_pkg12b_prefix_parent_modifier_real_apply_v1',
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
      const beforeSnapshot = await captureSnapshot(client, targets);
      const applyResult = await runApply(client, targets);
      const afterSnapshot = await captureSnapshot(client, targets);
      const byPrefix = countBy(targets, (row) => row.prefix);
      const postFindings = [];
      if (applyResult.error_message) postFindings.push(`apply_error:${applyResult.error_message}`);
      if (applyResult.updated_rows.length !== targets.length) postFindings.push('updated_row_count_mismatch');
      if (afterSnapshot.rows.filter((row) => row.row_type === 'parent').some((row) => !String(row.printed_identity_modifier ?? '').startsWith('number_prefix:'))) {
        postFindings.push('post_apply_modifier_missing');
      }
      report = {
        generated_at: new Date().toISOString(),
        version: 'english_master_index_pkg12b_prefix_parent_modifier_real_apply_v1',
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: dryRun.package_fingerprint_sha256 ?? null,
        apply_status: postFindings.length ? 'applied_with_post_findings' : 'applied',
        prerequisite_findings: [],
        post_apply_findings: postFindings,
        db_writes_performed: postFindings.length ? applyResult.updated_rows.length > 0 : true,
        migrations_created: false,
        cleanup_performed: false,
        quarantine_performed: false,
        scope: {
          updated_rows: applyResult.updated_rows.length,
          by_prefix: byPrefix,
          target_rows: targets,
          updated_rows_detail: applyResult.updated_rows,
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
