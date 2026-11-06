import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: process.env.GROOKAI_ENV_FILE ?? '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const DRY_RUN_JSON = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_catalog_repair_guarded_dry_run_20261031_v1.json');
const OUTPUT_JSON = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_catalog_repair_real_apply_20261105_v1.json');
const OUTPUT_MD = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_catalog_repair_real_apply_20261105_v1.md');

const PACKAGE_ID = 'TCGPLAYER-PROFESSOR-PROGRAM-CATALOG-REPAIR-V1';
const CREATED_BY = 'tcgplayer_professor_program_catalog_repair_v1';
const EXPECTED_FINGERPRINT = '1203f252f7856cff512d85ff7d76eb45a9cf18e528166b53b519fb34a7c78820';
const EXPECTED_DRY_RUN_PROOF = '4f36fdc0e284c6112cf22698e4b9b0940bda5d4c56b4f0f7c73006fb3b5d6000';
const EXPECTED_PRE_APPLY_HASH = 'aace12789875dc67ae402d6f34d4900e1b4c3b1f61b00857f3e67a6b86610ba6';
const EXPECTED_ROUTING_FINGERPRINT = 'e6caf91fb1cd324610f7157d8446aae3d1f1d57dd6709944738cf8ba396b3bdd';
const EXPECTED_READINESS_FINGERPRINT = '126b5c9000fbc58b0f4ea9a7254e632a710becf066d2060710abddca50b303d0';
const EXPECTED_PROJECT_REF = 'ycdxbpibncqcchqiihfz';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function validateInvocation() {
  const args = new Set(process.argv.slice(2));
  if (!args.has('--apply')) throw new Error('Refusing durable write without --apply.');
  if (process.env.GROOKAI_APPROVED_PACKAGE_FINGERPRINT !== EXPECTED_FINGERPRINT) {
    throw new Error('Approved package fingerprint environment value is missing or mismatched.');
  }
  const url = new URL(process.env.SUPABASE_URL ?? 'https://invalid.invalid');
  if (url.hostname !== `${EXPECTED_PROJECT_REF}.supabase.co`) {
    throw new Error(`Production project mismatch: ${url.hostname}`);
  }
}

function validateDryRun(report) {
  const findings = [];
  const counts = report.execution?.simulated_write_counts ?? {};
  if (report.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (report.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('package_fingerprint_mismatch');
  if (report.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if (report.routing_fingerprint_sha256 !== EXPECTED_ROUTING_FINGERPRINT) findings.push('routing_fingerprint_mismatch');
  if (report.readiness_package_fingerprint_sha256 !== EXPECTED_READINESS_FINGERPRINT) findings.push('readiness_fingerprint_mismatch');
  if (report.execution?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('before_hash_mismatch');
  if (report.execution?.after_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('after_hash_mismatch');
  if (report.execution?.rollback_verified !== true) findings.push('rollback_not_verified');
  if (report.execution?.transient_change_verified !== true) findings.push('transient_change_not_verified');
  if (report.durable_db_writes_performed !== false) findings.push('dry_run_claims_durable_write');
  if (counts.parent_inserts !== 3 || counts.identity_inserts !== 3 || counts.child_inserts !== 3 || counts.modifier_updates !== 3) {
    findings.push('approved_write_counts_mismatch');
  }
  if (counts.mapping_writes !== 0 || counts.pricing_writes !== 0 || counts.deletes !== 0 || counts.merges !== 0) {
    findings.push('forbidden_write_scope_present');
  }
  if ((report.targets ?? []).length !== 6) findings.push('target_count_mismatch');
  const inserts = (report.targets ?? []).filter((row) => row.operation === 'insert_parent_identity_child');
  const modifiers = (report.targets ?? []).filter((row) => row.operation === 'repair_existing_parent_modifier');
  if (inserts.length !== 3 || modifiers.length !== 3) findings.push('operation_split_mismatch');
  if ((report.targets ?? []).some((row) => ['176638', '213516'].includes(row.source_product_id))) findings.push('excluded_product_present');
  const recomputed = sha256(stableJson({
    package_id: PACKAGE_ID,
    routing_fingerprint_sha256: report.routing_fingerprint_sha256,
    readiness_package_fingerprint_sha256: report.readiness_package_fingerprint_sha256,
    targets: report.targets,
  }));
  if (recomputed !== EXPECTED_FINGERPRINT) findings.push('recomputed_fingerprint_mismatch');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select * from jsonb_to_recordset($1::jsonb) as t(
         operation text,
         source_product_id text,
         base_parent_id uuid,
         target_parent_id uuid,
         target_child_id uuid
       )
     )
     select 'base_parent' as row_type, target.source_product_id, cp.id::text as row_id,
       cp.variant_key, cp.printed_identity_modifier, null::text as finish_key, null::text as identity_key_hash
     from target join public.card_prints cp on cp.id = target.base_parent_id
     union all
     select 'target_parent', target.source_product_id, cp.id::text,
       cp.variant_key, cp.printed_identity_modifier, null::text, null::text
     from target join public.card_prints cp on cp.id = target.target_parent_id
     union all
     select 'target_child', target.source_product_id, cpr.id::text,
       cp.variant_key, cp.printed_identity_modifier, cpr.finish_key, null::text
     from target join public.card_printings cpr on cpr.id = target.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'target_identity', target.source_product_id, cpi.id::text,
       cp.variant_key, cp.printed_identity_modifier, null::text, cpi.identity_key_hash
     from target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, source_product_id, row_id`,
    [JSON.stringify(targets)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function captureBaseSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select * from jsonb_to_recordset($1::jsonb) as t(source_product_id text, base_parent_id uuid)
     )
     select target.source_product_id, cp.*
     from target join public.card_prints cp on cp.id = target.base_parent_id
     order by target.source_product_id, cp.id`,
    [JSON.stringify(targets)],
  );
  return { rows: result.rows, hash_sha256: sha256(stableJson(result.rows)) };
}

async function assertEnvironmentMaturity(client) {
  const result = await client.query(
    `select
       (select count(*)::int from public.card_prints) as card_prints,
       (select count(*)::int from public.sets) as sets,
       (select count(*)::int from public.card_print_traits) as card_print_traits`,
  );
  const row = result.rows[0];
  if (row.card_prints < 40000 || row.sets < 150 || row.card_print_traits < 5000) {
    throw new Error(`Environment mismatch — fix before proceeding: ${JSON.stringify(row)}`);
  }
  return row;
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const baseBefore = await captureBaseSnapshot(client, targets);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) {
    throw new Error(`pre-apply snapshot hash mismatch: ${beforeSnapshot.hash_sha256}`);
  }

  const insertCount = targets.filter((row) => row.operation === 'insert_parent_identity_child').length;
  const modifierCount = targets.length - insertCount;

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table professor_program_catalog_repair_targets (
         operation text not null,
         source_product_id text primary key,
         source_product_name text not null,
         source_group_id text not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         base_parent_id uuid not null,
         target_parent_id uuid not null,
         target_child_id uuid not null,
         target_variant_key text not null,
         target_printed_identity_modifier text not null,
         target_finish_key text not null,
         evidence_payload jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into professor_program_catalog_repair_targets
       select * from jsonb_to_recordset($1::jsonb) as t(
         operation text, source_product_id text, source_product_name text, source_group_id text,
         set_key text, card_number text, card_name text, base_parent_id uuid, target_parent_id uuid,
         target_child_id uuid, target_variant_key text, target_printed_identity_modifier text,
         target_finish_key text, evidence_payload jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const guardResult = await client.query(
      `with insert_projection as (
         select target.source_product_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, base.set_code, s.code, base.number, base.number_plain, base.name,
             target.target_variant_key, coalesce(base.printed_total, s.printed_total), coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from professor_program_catalog_repair_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
         where target.operation = 'insert_parent_identity_child'
       )
       select
         (select count(*)::int from professor_program_catalog_repair_targets) as target_count,
         (select count(*)::int from professor_program_catalog_repair_targets where operation = 'insert_parent_identity_child') as insert_target_count,
         (select count(*)::int from professor_program_catalog_repair_targets where operation = 'repair_existing_parent_modifier') as modifier_target_count,
         (select count(*)::int from professor_program_catalog_repair_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_prints base on base.id = target.base_parent_id where base.set_code <> target.set_key or coalesce(base.number_plain, base.number) <> target.card_number or lower(base.name) <> lower(target.card_name)) as base_identity_mismatch_count,
         (select count(*)::int from professor_program_catalog_repair_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_prints base on base.id = target.base_parent_id left join public.card_printings cpr on cpr.card_print_id = base.id and cpr.finish_key = target.target_finish_key where cpr.id is null) as base_finish_missing_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.external_mappings em on em.source = 'tcgplayer' and em.external_id = target.source_product_id and coalesce(em.active, true) = true) as source_mapping_collision_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_prints cp on cp.id = target.target_parent_id where target.operation = 'insert_parent_identity_child') as insert_parent_id_collision_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_printings cpr on cpr.id = target.target_child_id where target.operation = 'insert_parent_identity_child') as insert_child_id_collision_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_prints base on base.id = target.base_parent_id join public.card_prints cp on cp.set_id = base.set_id and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number) and lower(cp.name) = lower(base.name) and cp.variant_key = target.target_variant_key where target.operation = 'insert_parent_identity_child') as insert_semantic_parent_collision_count,
         (select count(*)::int from insert_projection where projected->>'status' = 'ready') as insert_projection_ready_count,
         (select count(*)::int from insert_projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as insert_identity_hash_collision_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_prints cp on cp.id = target.target_parent_id where target.operation = 'repair_existing_parent_modifier' and cp.variant_key = target.target_variant_key and nullif(cp.printed_identity_modifier, '') is null) as modifier_parent_ready_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true where target.operation = 'repair_existing_parent_modifier') as modifier_active_identity_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_printings cpr on cpr.id = target.target_child_id and cpr.card_print_id = target.target_parent_id and cpr.finish_key = target.target_finish_key where target.operation = 'repair_existing_parent_modifier') as modifier_exact_child_count`,
    );
    const guard = guardResult.rows[0];
    if (
      guard.target_count !== targets.length || guard.insert_target_count !== insertCount || guard.modifier_target_count !== modifierCount
      || guard.missing_base_count !== 0 || guard.base_identity_mismatch_count !== 0 || guard.inactive_finish_count !== 0
      || guard.base_finish_missing_count !== 0 || guard.source_mapping_collision_count !== 0
      || guard.insert_parent_id_collision_count !== 0 || guard.insert_child_id_collision_count !== 0
      || guard.insert_semantic_parent_collision_count !== 0 || guard.insert_projection_ready_count !== insertCount
      || guard.insert_identity_hash_collision_count !== 0 || guard.modifier_parent_ready_count !== modifierCount
      || guard.modifier_active_identity_count !== modifierCount || guard.modifier_exact_child_count !== modifierCount
    ) throw new Error(`guard failed: ${JSON.stringify(guard)}`);

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, game_id, set_id, name, number, variant_key, rarity, image_url,
         tcgplayer_id, external_ids, updated_at, set_code, artist, regulation_mark,
         image_alt_url, image_source, variants, created_at, last_synced_at,
         print_identity_key, ai_metadata, image_hash, data_quality_flags, image_status,
         image_res, image_last_checked_at, printed_set_abbrev, printed_total,
         gv_id, image_path, identity_domain, printed_identity_modifier,
         set_identity_model, representative_image_url, image_note
       )
       select
         target.target_parent_id, base.game_id, base.set_id, base.name, base.number,
         target.target_variant_key, base.rarity, null,
         null, coalesce(base.external_ids, '{}'::jsonb) || jsonb_build_object('verified_professor_program_v1', target.evidence_payload),
         now(), base.set_code, base.artist, base.regulation_mark,
         null, null, base.variants, now(), now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'tcgplayer_professor_program_catalog_repair_v1',
           'package_id', $1::text,
           'package_fingerprint_sha256', $2::text,
           'base_parent_id', base.id::text,
           'source_product_id', target.source_product_id,
           'variant_key', target.target_variant_key,
           'explicit_child_finish_key', target.target_finish_key
         ),
         null, base.data_quality_flags, 'representative_shared_stamp',
         base.image_res, now(), coalesce(base.printed_set_abbrev, s.printed_set_abbrev), coalesce(base.printed_total, s.printed_total),
         concat('GV-PK-', upper(regexp_replace(coalesce(base.printed_set_abbrev, s.printed_set_abbrev, base.set_code), '[^A-Za-z0-9]+', '-', 'g')), '-', base.number_plain, '-PROFESSOR-PROGRAM'),
         null, base.identity_domain, target.target_printed_identity_modifier, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Professor Program stamped identity. Representative base image only until exact stamped image is available. Source product ', target.source_product_id, '.')
       from professor_program_catalog_repair_targets target
       join public.card_prints base on base.id = target.base_parent_id
       left join public.sets s on s.id = base.set_id
       where target.operation = 'insert_parent_identity_child'`,
      [PACKAGE_ID, EXPECTED_FINGERPRINT],
    );

    const identityInsert = await client.query(
      `with projection as (
         select target.target_parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from professor_program_catalog_repair_targets target
         join public.card_prints cp on cp.id = target.target_parent_id
         left join public.sets s on s.id = cp.set_id
         where target.operation = 'insert_parent_identity_child'
       )
       insert into public.card_print_identity (
         card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash
       )
       select target_parent_id, projected->>'identity_domain', projected->>'set_code_identity',
         projected->>'printed_number', projected->>'normalized_printed_name', nullif(projected->>'source_name_raw', ''),
         coalesce(projected->'identity_payload', '{}'::jsonb), projected->>'identity_key_version', projected->>'identity_key_hash'
       from projection where projected->>'status' = 'ready'`,
    );

    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select target.target_child_id, target.target_parent_id, target.target_finish_key, now(), false,
         'tcgplayer_professor_program_catalog_repair_v1',
         concat('tcgplayer:', target.source_product_id, ':professor_program_stamp:', target.target_finish_key),
         $1::text, null, null, null, null, null, 'representative_shared_stamp',
         concat('Professor Program stamped identity child finish: ', target.target_finish_key, '. Source product ', target.source_product_id, '.')
       from professor_program_catalog_repair_targets target
       where target.operation = 'insert_parent_identity_child'`,
      [CREATED_BY],
    );

    const modifierUpdate = await client.query(
      `update public.card_prints cp
       set printed_identity_modifier = target.target_printed_identity_modifier,
         updated_at = now(),
         ai_metadata = coalesce(cp.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'professor_program_modifier_repair_v1', jsonb_build_object(
             'package_id', $1::text,
             'package_fingerprint_sha256', $2::text,
             'source_product_id', target.source_product_id
           )
         )
       from professor_program_catalog_repair_targets target
       where target.operation = 'repair_existing_parent_modifier'
         and cp.id = target.target_parent_id
         and cp.variant_key = target.target_variant_key
         and nullif(cp.printed_identity_modifier, '') is null`,
      [PACKAGE_ID, EXPECTED_FINGERPRINT],
    );

    const writeCounts = {
      parent_inserts: parentInsert.rowCount,
      identity_inserts: identityInsert.rowCount,
      child_inserts: childInsert.rowCount,
      modifier_updates: modifierUpdate.rowCount,
      mapping_writes: 0,
      pricing_writes: 0,
      deletes: 0,
      merges: 0,
    };
    if (parentInsert.rowCount !== insertCount || identityInsert.rowCount !== insertCount || childInsert.rowCount !== insertCount || modifierUpdate.rowCount !== modifierCount) {
      throw new Error(`write count mismatch: ${JSON.stringify(writeCounts)}`);
    }

    const proofResult = await client.query(
      `select
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_prints cp on cp.id = target.target_parent_id and cp.variant_key = target.target_variant_key and cp.printed_identity_modifier = target.target_printed_identity_modifier) as repaired_parent_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as active_identity_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_printings cpr on cpr.id = target.target_child_id and cpr.card_print_id = target.target_parent_id and cpr.finish_key = target.target_finish_key) as exact_child_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.external_mappings em on em.source = 'tcgplayer' and em.external_id = target.source_product_id and coalesce(em.active, true) = true) as existing_mapping_count`,
    );
    const proof = proofResult.rows[0];
    if (proof.repaired_parent_count !== targets.length || proof.active_identity_count !== targets.length || proof.exact_child_count !== targets.length || proof.existing_mapping_count !== 0) {
      throw new Error(`pre-commit proof failed: ${JSON.stringify(proof)}`);
    }

    await client.query('commit');

    const afterSnapshot = await captureSnapshot(client, targets);
    const baseAfter = await captureBaseSnapshot(client, targets);
    const expectedAfterRows = beforeSnapshot.rows.length + (insertCount * 3);
    const postApplyVerified = afterSnapshot.rows.length === expectedAfterRows
      && baseBefore.hash_sha256 === baseAfter.hash_sha256
      && afterSnapshot.hash_sha256 !== beforeSnapshot.hash_sha256;
    if (!postApplyVerified) {
      throw new Error(`post-apply verification failed: ${JSON.stringify({ expectedAfterRows, actualAfterRows: afterSnapshot.rows.length, baseBefore: baseBefore.hash_sha256, baseAfter: baseAfter.hash_sha256 })}`);
    }

    return {
      status: 'applied_and_verified',
      guard,
      proof,
      write_counts: writeCounts,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      ordinary_base_parent_before_hash: baseBefore.hash_sha256,
      ordinary_base_parent_after_hash: baseAfter.hash_sha256,
      ordinary_base_parent_unchanged: baseBefore.hash_sha256 === baseAfter.hash_sha256,
      post_apply_verified: postApplyVerified,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  return `# TCGPlayer Professor Program Catalog Repair Real Apply V1

Durable production apply evidence for the founder-approved six-row Professor Program catalog repair package.

## Result

- status: ${report.execution.status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_proof_sha256: \`${report.dry_run_proof_sha256}\`
- post_apply_verified: ${report.execution.post_apply_verified}
- ordinary_base_parent_unchanged: ${report.execution.ordinary_base_parent_unchanged}
- mapping_writes: ${report.execution.write_counts.mapping_writes}
- pricing_writes: ${report.execution.write_counts.pricing_writes}
- deletes: ${report.execution.write_counts.deletes}
- merges: ${report.execution.write_counts.merges}
- migrations: 0

## Durable Writes

${markdownTable(['operation', 'rows'], Object.entries(report.execution.write_counts))}

## Targets

${markdownTable(
    ['product', 'operation', 'set', 'number', 'card', 'finish', 'target parent', 'target child'],
    report.targets.map((row) => [
      row.source_product_id,
      row.operation,
      row.set_key,
      row.card_number,
      row.card_name,
      row.target_finish_key,
      row.target_parent_id,
      row.target_child_id,
    ]),
  )}
`;
}

async function main() {
  validateInvocation();
  const dryRun = await readJson(DRY_RUN_JSON);
  const validationFindings = validateDryRun(dryRun);
  if (validationFindings.length > 0) throw new Error(`dry-run validation failed: ${validationFindings.join(', ')}`);
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required for real apply.');

  const client = new Client({ connectionString: conn });
  await client.connect();
  let execution;
  let environmentMaturity;
  try {
    environmentMaturity = await assertEnvironmentMaturity(client);
    execution = await applyPackage(client, dryRun.targets);
  } finally {
    await client.end().catch(() => {});
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'tcgplayer_professor_program_catalog_repair_real_apply_20261105_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: EXPECTED_FINGERPRINT,
    dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
    source_artifact: rel(DRY_RUN_JSON),
    production_project_ref: EXPECTED_PROJECT_REF,
    environment_maturity: environmentMaturity,
    targets: dryRun.targets,
    excluded_scope: dryRun.excluded_scope,
    migrations_created: false,
    global_apply_performed: false,
    execution,
  };
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: EXPECTED_FINGERPRINT,
    output_json: rel(OUTPUT_JSON),
    status: execution.status,
    post_apply_verified: execution.post_apply_verified,
    ordinary_base_parent_unchanged: execution.ordinary_base_parent_unchanged,
    write_counts: execution.write_counts,
    proof: execution.proof,
    environment_maturity: environmentMaturity,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
