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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'piplup_burger_king_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'piplup_burger_king_child_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'piplup_burger_king_child_insert_real_apply_v1.md');

const PACKAGE_ID = 'RETAILER-STAMP-04-PIPLUP-BURGER-KING-CHILD-INSERT';
const CREATED_BY = 'piplup_burger_king_child_insert_real_apply_v1';
const EXPECTED_PACKAGE_FINGERPRINT = '3be011d0358463d682aaecbc4f77ffa2586d047d40f870cbbcad6443dd59891e';
const EXPECTED_DRY_RUN_PROOF = '5c09c29526cdb3da564ea35db34ed00785271113bc97a7ef29f231ebd7e8156e';
const EXPECTED_PRE_APPLY_HASH = '81309c9d198d9739e029ee38aa55799824ae16a84f66673ec79d138c613f6356';
const TARGET_PARENT_ID = '2df55ec4-c010-4a01-b468-d1da7270e9d2';
const TARGET_CHILD_ID = '69df0f74-07d7-4faf-b5de-a1779a33fc4b';
const TARGET_FINISH_KEY = 'reverse';

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
  if (dryRun.execution?.dry_run_status !== 'piplup_burger_king_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_status_not_passed');
  if (dryRun.execution?.rollback_verified !== true) findings.push('dry_run_rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  const counts = dryRun.execution?.simulated_write_counts ?? {};
  if (counts.child_inserts !== 1) findings.push('dry_run_child_insert_scope_mismatch');
  if (counts.parent_writes !== 0 || counts.identity_writes !== 0 || counts.deletes !== 0 || counts.merges !== 0) {
    findings.push('dry_run_forbidden_write_scope_present');
  }
  if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false || dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_forbidden_action');
  if (dryRun.target?.target_parent_id !== TARGET_PARENT_ID) findings.push('dry_run_target_parent_mismatch');
  if (dryRun.target?.target_child_id !== TARGET_CHILD_ID) findings.push('dry_run_target_child_mismatch');
  if (dryRun.target?.target_finish_key !== TARGET_FINISH_KEY) findings.push('dry_run_target_finish_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('dry_run_after_rollback_hash_mismatch');
  return findings;
}

async function captureSnapshot(client) {
  const result = await client.query(
    `select 'target_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text as finish_key, null::text as identity_key_hash
     from public.card_prints cp
     where cp.id = $1::uuid
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cpr.finish_key, null::text
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.card_print_id = $1::uuid
     union all
     select 'target_identity', cpi.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, cpi.identity_key_hash
     from public.card_print_identity cpi
     join public.card_prints cp on cp.id = cpi.card_print_id
     where cpi.card_print_id = $1::uuid and cpi.is_active = true
     order by row_type, finish_key nulls last, row_id`,
    [TARGET_PARENT_ID],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function applyPackage(client, target) {
  const beforeSnapshot = await captureSnapshot(client);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) {
    throw new Error(`pre-apply snapshot hash mismatch: ${beforeSnapshot.hash_sha256}`);
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await client.query(
      `select
         (select count(*)::int from public.card_prints cp where cp.id = $1::uuid) as parent_count,
         (select count(*)::int from public.card_prints cp where cp.id = $1::uuid and cp.set_code = $2 and cp.number = $3 and lower(cp.name) = lower($4) and cp.variant_key = $5 and cp.printed_identity_modifier is null) as target_parent_match_count,
         (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = $1::uuid and cpi.is_active = true) as active_identity_count,
         (select count(*)::int from public.finish_keys fk where fk.key = $6 and fk.is_active = true) as active_finish_count,
         (select count(*)::int from public.card_printings cpr where cpr.id = $7::uuid) as child_id_collision_count,
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = $1::uuid and cpr.finish_key = $6) as existing_target_finish_count,
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = $1::uuid and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [
        TARGET_PARENT_ID,
        target.set_key,
        target.card_number,
        target.card_name,
        target.target_variant_key,
        TARGET_FINISH_KEY,
        TARGET_CHILD_ID,
      ],
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.parent_count !== 1
      || guardRow.target_parent_match_count !== 1
      || guardRow.active_identity_count !== 1
      || guardRow.active_finish_count !== 1
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
         $1::uuid,
         $2::uuid,
         $3::text,
         now(),
         false,
         'verified_master_set_index_v1',
         $4::text,
         $5::text,
         null,
         null,
         null,
         null,
         null,
         'representative_shared_stamp',
         'Burger King Platinum stamped Piplup reverse holo; representative base image until exact stamped image is available.'`,
      [
        TARGET_CHILD_ID,
        TARGET_PARENT_ID,
        TARGET_FINISH_KEY,
        `${target.set_key}:${target.card_number}:burger_king_platinum:${TARGET_FINISH_KEY}`,
        CREATED_BY,
      ],
    );

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from public.card_printings cpr where cpr.id = $3::uuid) as inserted_child_rows,
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = $4::uuid and cpr.finish_key = $5::text) as matching_target_finish_rows,
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = $4::uuid and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, EXPECTED_PACKAGE_FINGERPRINT, TARGET_CHILD_ID, TARGET_PARENT_ID, TARGET_FINISH_KEY],
    );

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client);
    return {
      apply_status: 'piplup_burger_king_child_insert_applied',
      guard: guardRow,
      proof: proof.rows[0],
      write_counts: { child_inserts: childInsert.rowCount, parent_writes: 0, identity_writes: 0, deletes: 0, merges: 0 },
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      post_apply_verified: Number(proof.rows[0].inserted_child_rows) === 1
        && Number(proof.rows[0].matching_target_finish_rows) === 1
        && Number(proof.rows[0].forbidden_stamped_child_rows) === 0,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  const target = report.target;
  return `# Piplup Burger King Child Insert Real Apply V1

Real apply for the approved missing child printing on the existing Piplup Burger King Platinum-stamped parent.

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

## Target

${markdownTable(['set', 'number', 'name', 'variant_key', 'finish', 'parent_id', 'child_id'], [[
    target.set_key,
    target.card_number,
    target.card_name,
    target.target_variant_key,
    target.target_finish_key,
    target.target_parent_id,
    target.target_child_id,
  ]])}

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
    execution = await applyPackage(client, dryRun.target);
  } finally {
    await client.end().catch(() => {});
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'piplup_burger_king_child_insert_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: EXPECTED_PACKAGE_FINGERPRINT,
    dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
    source_artifact: rel(DRY_RUN_JSON),
    migrations_created: false,
    global_apply_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    target: dryRun.target,
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
