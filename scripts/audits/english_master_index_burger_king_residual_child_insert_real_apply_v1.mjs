import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'retailer_stamp_active_finish_route_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'burger_king_residual_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'burger_king_residual_child_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'burger_king_residual_child_insert_real_apply_v1.md');

const PACKAGE_ID = 'RETAILER-STAMP-06-BURGER-KING-RESIDUAL-CHILD-INSERTS';
const CREATED_BY = 'burger_king_residual_child_insert_real_apply_v1';
const EXPECTED_PACKAGE_FINGERPRINT = '34439459b7b56f6ad5f0cee5603b80b886106864187a5f840dcceff76f76bdf1';
const EXPECTED_DRY_RUN_PROOF = 'd2fd572e023926f3e4c00c4b6d8fbc5ff8c7052915311a5ed2dad89c6011104b';
const EXPECTED_PRE_APPLY_HASH = '28cb6571e6076829efae74690499668bf609f4c987d216355d55a386b6c7cda5';
const TARGET_FINISH_KEY = 'reverse';
const TARGET_VARIANT_KEY = 'platinum_stamped_burger_king_2009';
const EXPECTED_TARGET_COUNT = 5;

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push('dry_run_package_fingerprint_mismatch');
  if (dryRun.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('top_level_dry_run_proof_mismatch');
  if (dryRun.execution?.dry_run_status !== 'burger_king_residual_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_status_not_passed');
  if (dryRun.execution?.rollback_verified !== true) findings.push('dry_run_rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('execution_dry_run_proof_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  const counts = dryRun.execution?.simulated_write_counts ?? {};
  if (counts.child_inserts !== EXPECTED_TARGET_COUNT) findings.push('dry_run_child_insert_scope_mismatch');
  if (counts.parent_writes !== 0 || counts.identity_writes !== 0 || counts.deletes !== 0 || counts.merges !== 0) {
    findings.push('dry_run_forbidden_write_scope_present');
  }
  if (dryRun.scope?.target_count !== EXPECTED_TARGET_COUNT) findings.push('dry_run_target_count_mismatch');
  if (dryRun.scope?.by_set?.dp5 !== 4 || dryRun.scope?.by_set?.dp6 !== 1) findings.push('dry_run_set_scope_mismatch');
  if (dryRun.scope?.by_finish?.reverse !== EXPECTED_TARGET_COUNT) findings.push('dry_run_finish_scope_mismatch');
  if ((dryRun.targets ?? []).length !== EXPECTED_TARGET_COUNT) findings.push('dry_run_targets_length_mismatch');
  for (const row of dryRun.targets ?? []) {
    if (row.target_variant_key !== TARGET_VARIANT_KEY) findings.push(`target_variant_mismatch:${row.target_parent_id}`);
    if (row.target_finish_key !== TARGET_FINISH_KEY) findings.push(`target_finish_mismatch:${row.target_parent_id}`);
    if (!row.target_parent_id || !row.target_child_id) findings.push('missing_target_ids');
  }
  if (dryRun.execution?.guard?.target_count !== EXPECTED_TARGET_COUNT) findings.push('guard_target_count_mismatch');
  if (dryRun.execution?.guard?.child_id_collision_count !== 0) findings.push('guard_child_collision_present');
  if (dryRun.execution?.guard?.existing_target_finish_count !== 0) findings.push('guard_existing_finish_present');
  if (dryRun.execution?.guard?.forbidden_stamped_child_rows !== 0) findings.push('guard_forbidden_stamped_child_present');
  if (dryRun.execution?.proof?.inserted_child_rows !== EXPECTED_TARGET_COUNT) findings.push('proof_inserted_child_scope_mismatch');
  if (dryRun.execution?.proof?.matching_target_finish_rows !== EXPECTED_TARGET_COUNT) findings.push('proof_matching_finish_scope_mismatch');
  if (dryRun.execution?.proof?.forbidden_stamped_child_rows !== 0) findings.push('proof_forbidden_stamped_child_present');
  if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false || dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_forbidden_action');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('dry_run_after_rollback_hash_mismatch');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select * from jsonb_to_recordset($1::jsonb) as t(target_parent_id uuid)
     )
     select 'target_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text as finish_key, null::text as identity_key_hash
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cpr.finish_key, null::text
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     join public.card_printings cpr on cpr.card_print_id = cp.id
     union all
     select 'target_identity', cpi.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, cpi.identity_key_hash
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     join public.card_print_identity cpi on cpi.card_print_id = cp.id and cpi.is_active = true
     order by set_code, number, name, row_type, finish_key nulls last, row_id`,
    [JSON.stringify(targets.map((row) => ({ target_parent_id: row.target_parent_id })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) {
    throw new Error(`pre-apply snapshot hash mismatch: ${beforeSnapshot.hash_sha256}`);
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    await client.query(
      `create temp table burger_king_residual_child_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         set_key text not null,
         set_name text not null,
         card_number text not null,
         card_name text not null,
         target_variant_key text not null,
         target_finish_key text not null,
         stamp_label text not null,
         evidence jsonb not null
       ) on commit drop`,
    );

    await client.query(
      `insert into burger_king_residual_child_targets (
         target_parent_id, target_child_id, set_key, set_name, card_number, card_name,
         target_variant_key, target_finish_key, stamp_label, evidence
       )
       select target_parent_id, target_child_id, set_key, set_name, card_number, card_name,
         target_variant_key, target_finish_key, stamp_label, evidence
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         set_key text,
         set_name text,
         card_number text,
         card_name text,
         target_variant_key text,
         target_finish_key text,
         stamp_label text,
         evidence jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from burger_king_residual_child_targets) as target_count,
         (select count(distinct target_parent_id)::int from burger_king_residual_child_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from burger_king_residual_child_targets) as target_child_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_prints cp on cp.id = target.target_parent_id) as parent_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_prints cp on cp.id = target.target_parent_id and cp.set_code = target.set_key and cp.number = target.card_number and lower(cp.name) = lower(target.card_name) and cp.variant_key = target.target_variant_key and cp.printed_identity_modifier is null) as target_parent_match_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as active_identity_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true) as active_finish_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_id_collision_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = target.target_finish_key) as existing_target_finish_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== EXPECTED_TARGET_COUNT
      || guardRow.target_parent_count !== EXPECTED_TARGET_COUNT
      || guardRow.target_child_count !== EXPECTED_TARGET_COUNT
      || guardRow.parent_count !== EXPECTED_TARGET_COUNT
      || guardRow.target_parent_match_count !== EXPECTED_TARGET_COUNT
      || guardRow.active_identity_count !== EXPECTED_TARGET_COUNT
      || guardRow.active_finish_count !== EXPECTED_TARGET_COUNT
      || guardRow.child_id_collision_count !== 0
      || guardRow.existing_target_finish_count !== 0
      || guardRow.forbidden_stamped_child_rows !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         target.target_child_id,
         target.target_parent_id,
         target.target_finish_key,
         now(),
         false,
         'verified_master_set_index_v1',
         target.set_key || ':' || target.card_number || ':burger_king_platinum:' || target.target_finish_key,
         $1::text,
         null,
         null,
         null,
         null,
         null,
         'representative_shared_stamp',
         'Burger King Platinum stamped reverse holo; representative base image until exact stamped image is available.'
       from burger_king_residual_child_targets target`,
      [CREATED_BY],
    );

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from public.card_printings cpr join burger_king_residual_child_targets target on target.target_child_id = cpr.id) as inserted_child_rows,
         (select count(*)::int from public.card_printings cpr join burger_king_residual_child_targets target on target.target_parent_id = cpr.card_print_id and target.target_finish_key = cpr.finish_key) as matching_target_finish_rows,
         (select count(*)::int from public.card_printings cpr join burger_king_residual_child_targets target on target.target_parent_id = cpr.card_print_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, EXPECTED_PACKAGE_FINGERPRINT],
    );

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'burger_king_residual_child_insert_applied',
      guard: guardRow,
      proof: proof.rows[0],
      write_counts: { child_inserts: childInsert.rowCount, parent_writes: 0, identity_writes: 0, deletes: 0, merges: 0 },
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      post_apply_verified: Number(proof.rows[0].inserted_child_rows) === EXPECTED_TARGET_COUNT
        && Number(proof.rows[0].matching_target_finish_rows) === EXPECTED_TARGET_COUNT
        && Number(proof.rows[0].forbidden_stamped_child_rows) === 0,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  return `# Burger King Residual Child Insert Real Apply V1

Real apply for the approved residual Burger King Platinum-stamped child printing inserts.

## Safety

- package_id: ${report.package_id}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_proof_sha256: \`${report.dry_run_proof_sha256}\`
- migrations_created: ${report.migrations_created}
- global_apply_performed: ${report.global_apply_performed}
- parent_writes: ${report.execution.write_counts.parent_writes}
- identity_writes: ${report.execution.write_counts.identity_writes}
- deletes_performed: ${report.execution.write_counts.deletes}
- merges_performed: ${report.execution.write_counts.merges}
- post_apply_verified: ${report.execution.post_apply_verified}

## Targets

${markdownTable(['set', 'number', 'name', 'finish', 'parent_id', 'child_id'], report.targets.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.target_finish_key,
    row.target_parent_id,
    row.target_child_id,
  ]))}

## Result

- apply_status: ${report.execution.apply_status}
- inserted_child_rows: ${report.execution.proof.inserted_child_rows}
- matching_target_finish_rows: ${report.execution.proof.matching_target_finish_rows}
- forbidden_stamped_child_rows: ${report.execution.proof.forbidden_stamped_child_rows}
`;
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const validationFindings = validateDryRun(dryRun);
  const conn = connectionString();
  if (validationFindings.length > 0) throw new Error(`dry-run validation failed: ${validationFindings.join(', ')}`);
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const client = new Client({ connectionString: conn });
  await client.connect();
  let execution;
  try {
    execution = await applyPackage(client, dryRun.targets);
  } finally {
    await client.end().catch(() => {});
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'burger_king_residual_child_insert_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: EXPECTED_PACKAGE_FINGERPRINT,
    dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
    source_artifact: rel(DRY_RUN_JSON),
    migrations_created: false,
    global_apply_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    targets: dryRun.targets,
    execution,
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    apply_status: execution.apply_status,
    post_apply_verified: execution.post_apply_verified,
    write_counts: execution.write_counts,
    proof: execution.proof,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
