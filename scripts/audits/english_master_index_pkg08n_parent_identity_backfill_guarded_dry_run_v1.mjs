import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08l_parent_identity_backfill_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08n_parent_identity_backfill_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08n_parent_identity_backfill_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08n_parent_identity_backfill_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08N-PARENT-IDENTITY-BACKFILL';

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

function buildTargets(rows) {
  return rows.map((row) => ({
    card_print_id: row.proposed_parent_update.card_print_id,
    set_id: row.proposed_parent_update.set_id,
    set_key: row.set_key,
    set_code: row.proposed_parent_update.set_code,
    card_number: row.proposed_parent_update.number,
    expected_number_plain: row.proposed_parent_update.number_plain,
    target_printed_identity_modifier: row.proposed_parent_update.printed_identity_modifier,
    card_name: row.card_name,
    finish_key: row.finish_key,
    tcgdex_external_id: row.tcgdex_external_id,
    missing_parent_fields: row.missing_parent_fields,
  }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_id uuid,
         set_code text,
         card_number text,
         expected_number_plain text,
         target_printed_identity_modifier text,
         card_name text,
         finish_key text,
         tcgdex_external_id text
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
       null::text as finish_key,
       null::text as external_id,
       null::text as identity_set_code,
       null::text as identity_number,
       null::text as identity_name
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
       cpr.finish_key,
       null::text as external_id,
       null::text as identity_set_code,
       null::text as identity_number,
       null::text as identity_name
     from target t
     join public.card_printings cpr on cpr.card_print_id = t.card_print_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'tcgdex_mapping' as row_type,
       em.id::text as row_id,
       null::text as set_id,
       null::text as set_code,
       null::text as number,
       null::text as number_plain,
       null::text as printed_identity_modifier,
       null::text as name,
       null::text as finish_key,
       em.external_id,
       null::text as identity_set_code,
       null::text as identity_number,
       null::text as identity_name
     from target t
     join public.external_mappings em
       on em.card_print_id = t.card_print_id
      and em.source = 'tcgdex'
      and em.external_id = t.tcgdex_external_id
     union all
     select
       'active_identity' as row_type,
       cpi.id::text as row_id,
       null::text as set_id,
       null::text as set_code,
       null::text as number,
       null::text as number_plain,
       null::text as printed_identity_modifier,
       null::text as name,
       null::text as finish_key,
       null::text as external_id,
       cpi.set_code_identity,
       cpi.printed_number,
       cpi.normalized_printed_name
     from target t
     join public.card_print_identity cpi
       on cpi.card_print_id = t.card_print_id
      and cpi.is_active = true
     order by row_type, set_code nulls last, number nulls last, name nulls last, finish_key nulls last, external_id nulls last, row_id`,
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
      tcgdex_mapping_rows: rows.filter((row) => row.row_type === 'tcgdex_mapping').length,
      active_identity_rows: rows.filter((row) => row.row_type === 'active_identity').length,
      total_rows: rows.length,
    },
  };
}

async function runDryRun(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08n_targets (
         card_print_id uuid primary key,
         set_id uuid not null,
         set_code text not null,
         card_number text not null,
         expected_number_plain text not null,
         target_printed_identity_modifier text not null,
         card_name text not null,
         finish_key text not null,
         tcgdex_external_id text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08n_targets
       select
         row.card_print_id::uuid,
         row.set_id::uuid,
         row.set_code,
         row.card_number,
         row.expected_number_plain,
         row.target_printed_identity_modifier,
         row.card_name,
         row.finish_key,
         row.tcgdex_external_id
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         set_id text,
         set_code text,
         card_number text,
         expected_number_plain text,
         target_printed_identity_modifier text,
         card_name text,
         finish_key text,
         tcgdex_external_id text
       )`,
      [JSON.stringify(targets)],
    );
    const shape = await client.query(
      `select
         count(*)::int as target_rows,
         count(*) filter (where set_code <> 'col1')::int as non_col1_rows,
         count(*) filter (where finish_key <> 'normal')::int as non_normal_rows,
         count(*) filter (where card_number !~ '^SL[0-9]+$')::int as non_sl_rows,
         count(*) filter (where target_printed_identity_modifier <> 'number_prefix:SL')::int as non_sl_modifier_rows
       from pkg08n_targets`,
    );
    const shapeRow = shape.rows[0];
    if (
      shapeRow.target_rows !== 6 ||
      shapeRow.non_col1_rows !== 0 ||
      shapeRow.non_normal_rows !== 0 ||
      shapeRow.non_sl_rows !== 0 ||
      shapeRow.non_sl_modifier_rows !== 0
    ) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }
    const collision = await client.query(
      `select
         (select count(*)::int
          from pkg08n_targets t
          join public.card_prints cp on cp.id = t.card_print_id
          where coalesce(cp.name, '') <> t.card_name) as name_mismatch_rows,
         (select count(*)::int
          from pkg08n_targets t
          join public.card_prints cp
            on cp.id <> t.card_print_id
           and (cp.set_id = t.set_id or lower(coalesce(cp.set_code, '')) = lower(t.set_code))
           and lower(coalesce(cp.name, '')) = lower(t.card_name)
           and (
             lower(coalesce(cp.number, '')) = lower(t.card_number)
             or lower(coalesce(cp.number_plain, '')) = lower(t.expected_number_plain)
           )
           and coalesce(cp.printed_identity_modifier, '') = coalesce(t.target_printed_identity_modifier, '')) as target_parent_collisions,
         (select count(*)::int
          from pkg08n_targets t
          join public.card_printings cpr
            on cpr.card_print_id = t.card_print_id
           and cpr.finish_key = t.finish_key) as target_child_rows,
         (select count(*)::int
          from pkg08n_targets t
          join public.external_mappings em
            on em.card_print_id = t.card_print_id
           and em.source = 'tcgdex'
           and em.external_id = t.tcgdex_external_id) as target_mapping_rows,
         (select count(*)::int
          from pkg08n_targets t
          join public.card_print_identity cpi
            on cpi.card_print_id = t.card_print_id
           and cpi.is_active = true
           and cpi.set_code_identity = t.set_code
           and cpi.printed_number = t.card_number
           and cpi.normalized_printed_name = lower(t.card_name)) as target_identity_rows`,
    );
    const collisionRow = collision.rows[0];
    if (
      collisionRow.name_mismatch_rows !== 0 ||
      collisionRow.target_parent_collisions !== 0 ||
      collisionRow.target_child_rows !== 6 ||
      collisionRow.target_mapping_rows !== 6 ||
      collisionRow.target_identity_rows !== 6
    ) {
      throw new Error(`collision guard failed: ${JSON.stringify(collisionRow)}`);
    }
    const updateResult = await client.query(
      `update public.card_prints cp
       set set_id = t.set_id,
           set_code = t.set_code,
           number = t.card_number,
           printed_identity_modifier = t.target_printed_identity_modifier
       from pkg08n_targets t
       where cp.id = t.card_print_id
         and cp.name = t.card_name
         and coalesce(cp.set_code, '') = ''
         and coalesce(cp.number, '') = ''
       returning cp.id::text as card_print_id, cp.set_code, cp.number, cp.number_plain, cp.printed_identity_modifier`,
    );
    if (updateResult.rowCount !== 6) {
      throw new Error(`update count mismatch: ${updateResult.rowCount}`);
    }
    const readback = await client.query(
      `select count(*)::int as matching_readback_rows
       from pkg08n_targets t
       join public.card_prints cp on cp.id = t.card_print_id
       where cp.set_id = t.set_id
         and cp.set_code = t.set_code
         and cp.number = t.card_number
         and cp.number_plain = t.expected_number_plain
         and cp.printed_identity_modifier = t.target_printed_identity_modifier`,
    );
    if (readback.rows[0].matching_readback_rows !== 6) {
      throw new Error(`generated number_plain readback failed: ${readback.rows[0].matching_readback_rows}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg08n_targets) as target_rows`,
      [PACKAGE_ID, packageFingerprint],
    );
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      status: 'pkg08n_parent_identity_backfill_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => null);
    return {
      status: 'pkg08n_parent_identity_backfill_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  const rows = report.scope.target_rows.map((row) => [
    row.set_key,
    row.card_number,
    row.expected_number_plain,
    row.target_printed_identity_modifier,
    row.card_name,
    row.finish_key,
    row.card_print_id,
  ]);
  return `# PKG-08N Parent Identity Backfill Guarded Dry Run V1

Rollback-only dry run for parent identity field backfill. No durable write was authorized or performed.

## Status

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- target_parent_updates: ${report.scope.target_parent_updates}
- target_child_writes: ${report.scope.target_child_writes}
- target_deletes: ${report.scope.target_deletes}
- stop_findings: ${report.stop_findings.length}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}

${markdownTable(['set', 'number', 'generated_plain', 'modifier', 'card', 'verified_finish', 'parent'], rows)}

## Rollback Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}

## Exclusions

- No child writes.
- No deletes.
- No merges.
- No unsupported cleanup.
- number_plain is generated and was verified by readback inside the rolled-back transaction.
- printed_identity_modifier disambiguates SL numbers from the numeric Call of Legends checklist.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08N Parent Identity Backfill Guarded Dry Run Checkpoint V1](20260610_pkg08n_parent_identity_backfill_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for 6 col1 parent identity field updates. No durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08n_parent_identity_backfill_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08n_parent_identity_backfill_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.readiness_lane === 'parent_field_backfill_candidate');
const targets = buildTargets(sourceRows);
const packageFingerprint = sha256(stableJson(targets.map((row) => ({
  card_print_id: row.card_print_id,
  set_id: row.set_id,
  set_code: row.set_code,
  card_number: row.card_number,
  expected_number_plain: row.expected_number_plain,
  target_printed_identity_modifier: row.target_printed_identity_modifier,
  card_name: row.card_name,
  finish_key: row.finish_key,
  tcgdex_external_id: row.tcgdex_external_id,
}))));

const conn = connectionString();
let execution;
if (!conn) {
  execution = {
    status: 'blocked_no_database_connection_string',
    error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
    before_snapshot: null,
    after_snapshot: null,
    rollback_proof_rows: [],
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    execution = await runDryRun(client, targets, packageFingerprint);
  } finally {
    await client.end().catch(() => {});
  }
}

const durableMatch = execution.before_snapshot?.hash_sha256 === execution.after_snapshot?.hash_sha256;
const stopFindings = [];
if (targets.length !== 6) stopFindings.push('target_rows_not_6');
if (targets.some((row) => row.set_key !== 'col1' || row.set_code !== 'col1')) stopFindings.push('non_col1_target_present');
if (targets.some((row) => row.finish_key !== 'normal')) stopFindings.push('non_normal_target_present');
if (targets.some((row) => !/^SL[0-9]+$/.test(row.card_number))) stopFindings.push('non_sl_target_present');
if (targets.some((row) => row.target_printed_identity_modifier !== 'number_prefix:SL')) stopFindings.push('non_sl_modifier_target_present');
if (execution.status !== 'pkg08n_parent_identity_backfill_completed_rolled_back_no_durable_change') stopFindings.push('dry_run_not_passed');
if (execution.error_message) stopFindings.push(`dry_run_error:${execution.error_message}`);
if (!durableMatch) stopFindings.push('durable_after_snapshot_differs_from_before_snapshot');
if (execution.before_snapshot?.counts?.parent_rows !== 6) stopFindings.push('before_parent_rows_not_6');
if (execution.before_snapshot?.counts?.child_rows !== 18) stopFindings.push('before_child_rows_not_18');
if (execution.before_snapshot?.counts?.tcgdex_mapping_rows !== 6) stopFindings.push('before_tcgdex_mapping_rows_not_6');
if (execution.before_snapshot?.counts?.active_identity_rows !== 6) stopFindings.push('before_active_identity_rows_not_6');

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08n_parent_identity_backfill_guarded_dry_run_v1',
  package_id: PACKAGE_ID,
  source_package: source.package_id,
  package_fingerprint_sha256: packageFingerprint,
  audit_only: false,
  rollback_only: true,
  dry_run_status: execution.status,
  durable_db_writes_performed: false,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  real_apply_authorized: false,
  scope: {
    source_rows: sourceRows.length,
    target_parent_updates: targets.length,
    target_child_writes: 0,
    target_deletes: 0,
    target_merges: 0,
    target_unsupported_cleanup: 0,
    by_set: countBy(targets, (row) => row.set_key),
    by_finish: countBy(targets, (row) => row.finish_key),
    target_rows: targets,
  },
  before_snapshot: execution.before_snapshot,
  after_snapshot: execution.after_snapshot,
  durable_after_snapshot_matches_before_snapshot: durableMatch,
  rollback_proof_rows: execution.rollback_proof_rows,
  stop_findings: stopFindings,
  recommended_real_apply_approval_text: stopFindings.length === 0
    ? `Approve real PKG-08N-PARENT-IDENTITY-BACKFILL apply only. Fingerprint: ${packageFingerprint}. Scope: 6 parent card_print field updates for col1 Call of Legends shiny legend rows; updates set_id/set_code/number/printed_identity_modifier only, printed_identity_modifier=number_prefix:SL, generated number_plain verified by dry-run readback; no child writes, no deletes, no merges, no unsupported cleanup. Dry-run proof: ${execution.before_snapshot?.hash_sha256} == ${execution.after_snapshot?.hash_sha256}. No global apply. No migrations.`
    : null,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  dry_run_status: report.dry_run_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  scope: {
    target_parent_updates: report.scope.target_parent_updates,
    target_child_writes: report.scope.target_child_writes,
    target_deletes: report.scope.target_deletes,
    by_set: report.scope.by_set,
    by_finish: report.scope.by_finish,
  },
  stop_findings: report.stop_findings,
  recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));

if (stopFindings.length !== 0) process.exitCode = 1;
