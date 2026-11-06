import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: process.env.GROOKAI_ENV_FILE ?? '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const ROUTING_JSON = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_repair_routing_20261031_v1.json');
const READINESS_JSON = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_parent_insert_readiness_20261031_v1.json');
const OUTPUT_JSON = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_catalog_repair_guarded_dry_run_20261031_v1.json');
const OUTPUT_MD = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_catalog_repair_guarded_dry_run_20261031_v1.md');
const PACKAGE_ID = 'TCGPLAYER-PROFESSOR-PROGRAM-CATALOG-REPAIR-V1';
const CREATED_BY = 'tcgplayer_professor_program_catalog_repair_v1';
const VARIANT_KEY = 'professor_program_stamp';

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

function buildTargets(routing, readiness) {
  const readinessByProduct = new Map(readiness.rows.map((row) => [row.source_product_id, row]));
  return routing.rows
    .filter((row) => ['ready_parent_identity_child_insert', 'ready_existing_parent_modifier_repair'].includes(row.route))
    .map((row) => {
      const source = readinessByProduct.get(row.source_product_id);
      if (!source) throw new Error(`Missing readiness row for ${row.source_product_id}`);
      return {
        operation: row.route === 'ready_parent_identity_child_insert' ? 'insert_parent_identity_child' : 'repair_existing_parent_modifier',
        source_product_id: row.source_product_id,
        source_product_name: row.source_product_name,
        source_group_id: row.source_group_id,
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        base_parent_id: row.selected_base_parent_id,
        target_parent_id: row.target_parent_id,
        target_child_id: row.target_printing_id,
        target_variant_key: VARIANT_KEY,
        target_printed_identity_modifier: VARIANT_KEY,
        target_finish_key: row.target_finish_key,
        evidence_payload: {
          source_product_id: row.source_product_id,
          source_product_name: row.source_product_name,
          source_group_id: row.source_group_id,
          routing_fingerprint_sha256: routing.fingerprint_sha256,
          readiness_package_fingerprint_sha256: readiness.package_fingerprint_sha256,
          evidence: source.evidence,
        },
      };
    })
    .sort((left, right) => Number(left.source_product_id) - Number(right.source_product_id));
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

async function runDryRun(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
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
         operation text,
         source_product_id text,
         source_product_name text,
         source_group_id text,
         set_key text,
         card_number text,
         card_name text,
         base_parent_id uuid,
         target_parent_id uuid,
         target_child_id uuid,
         target_variant_key text,
         target_printed_identity_modifier text,
         target_finish_key text,
         evidence_payload jsonb
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
    const insertCount = targets.filter((row) => row.operation === 'insert_parent_identity_child').length;
    const modifierCount = targets.length - insertCount;
    if (
      guard.target_count !== targets.length
      || guard.insert_target_count !== insertCount
      || guard.modifier_target_count !== modifierCount
      || guard.missing_base_count !== 0
      || guard.base_identity_mismatch_count !== 0
      || guard.inactive_finish_count !== 0
      || guard.base_finish_missing_count !== 0
      || guard.source_mapping_collision_count !== 0
      || guard.insert_parent_id_collision_count !== 0
      || guard.insert_child_id_collision_count !== 0
      || guard.insert_semantic_parent_collision_count !== 0
      || guard.insert_projection_ready_count !== insertCount
      || guard.insert_identity_hash_collision_count !== 0
      || guard.modifier_parent_ready_count !== modifierCount
      || guard.modifier_active_identity_count !== modifierCount
      || guard.modifier_exact_child_count !== modifierCount
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
      [PACKAGE_ID, packageFingerprint],
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
      [PACKAGE_ID, packageFingerprint],
    );

    if (parentInsert.rowCount !== insertCount || identityInsert.rowCount !== insertCount || childInsert.rowCount !== insertCount || modifierUpdate.rowCount !== modifierCount) {
      throw new Error(`write count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount, modifier_updates: modifierUpdate.rowCount })}`);
    }

    const proofResult = await client.query(
      `select
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_prints cp on cp.id = target.target_parent_id and cp.variant_key = target.target_variant_key and cp.printed_identity_modifier = target.target_printed_identity_modifier) as repaired_parent_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as active_identity_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.card_printings cpr on cpr.id = target.target_child_id and cpr.card_print_id = target.target_parent_id and cpr.finish_key = target.target_finish_key) as exact_child_count,
         (select count(*)::int from professor_program_catalog_repair_targets target join public.external_mappings em on em.source = 'tcgplayer' and em.external_id = target.source_product_id and coalesce(em.active, true) = true) as mapping_write_count`,
    );
    const transientSnapshot = await captureSnapshot(client, targets);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      guard,
      simulated_write_counts: {
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        modifier_updates: modifierUpdate.rowCount,
        mapping_writes: 0,
        pricing_writes: 0,
        deletes: 0,
        merges: 0,
      },
      proof: proofResult.rows[0],
      before_snapshot: beforeSnapshot,
      transient_snapshot: transientSnapshot,
      after_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      transient_change_verified: beforeSnapshot.hash_sha256 !== transientSnapshot.hash_sha256,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  return `# TCGPlayer Professor Program Catalog Repair Guarded Dry Run V1

Rollback-only production rehearsal for the six safe catalog repairs. No mappings or prices are included.

## Safety

- rollback_only: ${report.rollback_only}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- rollback_verified: ${report.execution.rollback_verified}
- transient_change_verified: ${report.execution.transient_change_verified}
- mapping_writes_performed: ${report.mapping_writes_performed}
- pricing_writes_performed: ${report.pricing_writes_performed}

## Simulated Writes

${markdownTable(['operation', 'rows'], Object.entries(report.execution.simulated_write_counts))}

## Targets

${markdownTable(
    ['product', 'operation', 'set', 'number', 'card', 'finish', 'base parent', 'target parent', 'target child'],
    report.targets.map((row) => [
      row.source_product_id,
      row.operation,
      row.set_key,
      row.card_number,
      row.card_name,
      row.target_finish_key,
      row.base_parent_id,
      row.target_parent_id,
      row.target_child_id,
    ]),
  )}

## Approval Text

${report.recommended_real_apply_approval_text}
`;
}

async function main() {
  const [routingBytes, readinessBytes] = await Promise.all([fs.readFile(ROUTING_JSON), fs.readFile(READINESS_JSON)]);
  const routing = JSON.parse(routingBytes.toString('utf8'));
  const readiness = JSON.parse(readinessBytes.toString('utf8'));
  const targets = buildTargets(routing, readiness);
  if (targets.length !== 6) throw new Error(`Expected 6 safe catalog repair targets, found ${targets.length}`);
  const insertCount = targets.filter((row) => row.operation === 'insert_parent_identity_child').length;
  const modifierCount = targets.filter((row) => row.operation === 'repair_existing_parent_modifier').length;
  if (insertCount !== 3 || modifierCount !== 3) throw new Error(`Unexpected operation split: inserts=${insertCount}, modifiers=${modifierCount}`);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    routing_fingerprint_sha256: routing.fingerprint_sha256,
    readiness_package_fingerprint_sha256: readiness.package_fingerprint_sha256,
    targets,
  }));
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required for guarded dry run.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  let execution;
  try {
    execution = await runDryRun(client, targets, packageFingerprint);
  } finally {
    await client.end();
  }
  if (!execution.rollback_verified || !execution.transient_change_verified) throw new Error('Rollback or transient-change proof failed.');
  const dryRunProof = sha256(stableJson({
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    guard: execution.guard,
    proof: execution.proof,
    before_snapshot_hash: execution.before_snapshot.hash_sha256,
    after_snapshot_hash: execution.after_snapshot.hash_sha256,
  }));
  const approval = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: 3 Professor Program parent inserts, 3 active identity inserts, 3 child printing inserts, and 3 existing Professor Program printed_identity_modifier repairs. Dry-run rollback proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_snapshot.hash_sha256}. Excludes Professor Sycamore product 176638 and excludes Judge product 213516 mapping. No mapping writes. No pricing writes. No ordinary parent mutation. No deletes. No merges. No migrations.`;
  const report = {
    generated_at: new Date().toISOString(),
    version: 'tcgplayer_professor_program_catalog_repair_guarded_dry_run_20261031_v1',
    package_id: PACKAGE_ID,
    rollback_only: true,
    db_reads_performed: true,
    db_writes_performed_inside_rolled_back_transaction: true,
    durable_db_writes_performed: false,
    mapping_writes_performed: false,
    pricing_writes_performed: false,
    migrations_created: false,
    deletes_performed: false,
    merges_performed: false,
    routing_artifact: path.relative(ROOT, ROUTING_JSON).replaceAll('\\', '/'),
    readiness_artifact: path.relative(ROOT, READINESS_JSON).replaceAll('\\', '/'),
    routing_fingerprint_sha256: routing.fingerprint_sha256,
    readiness_package_fingerprint_sha256: readiness.package_fingerprint_sha256,
    package_fingerprint_sha256: packageFingerprint,
    dry_run_proof_sha256: dryRunProof,
    targets,
    execution,
    recommended_real_apply_approval_text: approval,
    excluded_scope: {
      professor_sycamore_product_176638: 'held_existing_professor_program_parent_finish_conflict',
      judge_product_213516: 'already_structurally_correct_mapping_only',
    },
  };
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    package_fingerprint_sha256: packageFingerprint,
    dry_run_proof_sha256: dryRunProof,
    rollback_verified: execution.rollback_verified,
    simulated_write_counts: execution.simulated_write_counts,
    recommended_real_apply_approval_text: approval,
    durable_db_writes_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
