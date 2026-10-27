#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import pg from 'pg';

import '../../backend/env.mjs';
import {
  mappingDatabaseConfig,
  mappingTransactionState,
  rollbackMappingTransaction,
} from '../../backend/pricing/exact_mapping_execution_guard_v1.mjs';

const { Client } = pg;

export const VERSION = 'POKEMON_COUNTDOWN_CALENDAR_VARIANT_ROLLBACK_REHEARSAL_V1';
const PROPOSAL_VERSION = 'POKEMON_SPECIAL_PRINTING_REFERENCE_PROPOSAL_V1';
const PLAN_VERSION = 'POKEMON_COUNTDOWN_CALENDAR_VARIANT_PLAN_V1';
const PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const SOURCE_GROUP_ID = 2155;
const EXPECTED_ROWS = 22;
const CREATED_BY = 'pokemon_countdown_calendar_variant_rollback_rehearsal_v1';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function proposalFingerprint(proposal) {
  return sha256(stableJson({
    version: proposal.version,
    source_group_id: proposal.scope?.source_group_id,
    rows: proposal.rows,
  }));
}

function planFingerprint(plan) {
  return sha256(stableJson({
    version: plan.version,
    proposal_fingerprint_sha256: plan.proposal_fingerprint_sha256,
    rows: plan.rows,
  }));
}

function uniqueCount(values) {
  return new Set(values.map(String)).size;
}

export function assertPokemonCountdownRollbackInputsV1(proposal, plan) {
  assert.equal(proposal?.version, PROPOSAL_VERSION, 'countdown_rehearsal_proposal_version');
  assert.equal(plan?.version, PLAN_VERSION, 'countdown_rehearsal_plan_version');
  assert.equal(proposal?.database_writes_performed, false, 'countdown_rehearsal_proposal_write_boundary');
  assert.equal(plan?.database_writes_performed, false, 'countdown_rehearsal_plan_write_boundary');
  assert.equal(proposal?.scope?.source_group_id, SOURCE_GROUP_ID, 'countdown_rehearsal_source_group');
  assert.equal(proposalFingerprint(proposal), proposal.fingerprint_sha256, 'countdown_rehearsal_proposal_fingerprint');
  assert.equal(plan.proposal_fingerprint_sha256, proposal.fingerprint_sha256, 'countdown_rehearsal_plan_proposal_binding');
  assert.equal(planFingerprint(plan), plan.fingerprint_sha256, 'countdown_rehearsal_plan_fingerprint');
  assert.equal(plan?.database_target?.kind, 'production_service_snapshot', 'countdown_rehearsal_plan_target_kind');
  assert.equal(plan?.database_target?.project_ref, PROJECT_REF, 'countdown_rehearsal_plan_project');
  assert.equal(plan?.environment_sanity?.maturity_gate_passed, true, 'countdown_rehearsal_plan_maturity');
  assert.equal(plan?.snapshot_consistency, 'bounded_multi_request_snapshot_revalidate_in_transactional_rehearsal', 'countdown_rehearsal_snapshot_boundary');
  assert.equal(proposal.rows?.length, EXPECTED_ROWS, 'countdown_rehearsal_proposal_row_count');
  assert.equal(plan.rows?.length, EXPECTED_ROWS, 'countdown_rehearsal_plan_row_count');
  assert.equal(plan.summary?.ready_for_transactional_rollback_rehearsal, EXPECTED_ROWS, 'countdown_rehearsal_ready_count');
  assert.equal(plan.summary?.blocked_by_live_invariant, 0, 'countdown_rehearsal_blocked_count');

  const proposalByProduct = new Map(proposal.rows.map((row) => [String(row.source_product_id), row]));
  const targets = plan.rows.map((row) => {
    const source = proposalByProduct.get(String(row.source_product_id));
    assert.ok(source, 'countdown_rehearsal_missing_proposal_row');
    assert.equal(row.status, 'ready_for_transactional_rollback_rehearsal', 'countdown_rehearsal_row_not_ready');
    assert.deepEqual(row.blockers, [], 'countdown_rehearsal_row_blockers');
    assert.equal(source.status, 'ready_for_guarded_variant_parent_plan', 'countdown_rehearsal_proposal_row_not_ready');
    for (const field of [
      'base_card_print_id', 'base_gv_id', 'base_set_code', 'base_name', 'base_number',
      'proposed_variant_key', 'proposed_finish_key', 'proposed_parent_gv_id',
      'proposed_printing_gv_id',
    ]) assert.equal(row[field], source[field], `countdown_rehearsal_proposal_drift:${field}`);
    const sourceProductId = Number(row.source_product_id);
    assert.ok(Number.isSafeInteger(sourceProductId) && sourceProductId > 0, 'countdown_rehearsal_source_product_id');
    return {
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      target_mapping_id: -sourceProductId,
      base_parent_id: row.base_card_print_id,
      base_gv_id: row.base_gv_id,
      base_set_code: row.base_set_code,
      card_name: row.base_name,
      card_number: String(row.base_number),
      source_product_id: sourceProductId,
      source_product_name: row.source_product_name,
      target_finish_key: row.proposed_finish_key,
      target_variant_key: row.proposed_variant_key,
      target_parent_gv_id: row.proposed_parent_gv_id,
      target_printing_gv_id: row.proposed_printing_gv_id,
      stamp_color: row.proposed_stamp_color,
      evidence: {
        proposal_fingerprint_sha256: proposal.fingerprint_sha256,
        plan_fingerprint_sha256: plan.fingerprint_sha256,
        source_group_id: SOURCE_GROUP_ID,
        source_group_name: row.source_group_name,
        master_stamped_evidence: row.master_stamped_evidence,
        source_evidence: row.source_evidence,
      },
    };
  });

  for (const [label, values] of Object.entries({
    source_product_ids: targets.map((row) => row.source_product_id),
    target_mapping_ids: targets.map((row) => row.target_mapping_id),
    target_parent_ids: targets.map((row) => row.target_parent_id),
    target_child_ids: targets.map((row) => row.target_child_id),
    target_parent_gv_ids: targets.map((row) => row.target_parent_gv_id),
    target_printing_gv_ids: targets.map((row) => row.target_printing_gv_id),
  })) assert.equal(uniqueCount(values), EXPECTED_ROWS, `countdown_rehearsal_duplicate_${label}`);

  return targets.sort((left, right) => left.source_product_id - right.source_product_id);
}

function parseArgs(argv) {
  const value = (name) => argv.find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3).trim() ?? '';
  const proposal = value('proposal');
  const plan = value('plan');
  const output = value('output');
  if (!proposal || !plan || !output) throw new Error('--proposal, --plan, and --output are required');
  return { proposal: path.resolve(proposal), plan: path.resolve(plan), output: path.resolve(output) };
}

async function captureSequence(client) {
  const result = await client.query(
    'select last_value::text, is_called from public.external_mappings_id_seq',
  );
  assert.equal(result.rows.length, 1, 'countdown_rehearsal_sequence_snapshot');
  return result.rows[0];
}

async function captureTargetSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select * from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         target_mapping_id bigint,
         source_product_id bigint,
         target_parent_gv_id text,
         target_printing_gv_id text
       )
     )
     select 'parent'::text as row_type, cp.id::text as row_id,
            jsonb_build_object('gv_id', cp.gv_id, 'variant_key', cp.variant_key) as body
       from target join public.card_prints cp on cp.id = target.target_parent_id
     union all
     select 'parent_gv_id', cp.id::text,
            jsonb_build_object('gv_id', cp.gv_id, 'variant_key', cp.variant_key)
       from target join public.card_prints cp on cp.gv_id = target.target_parent_gv_id
     union all
     select 'identity', identity.id::text,
            jsonb_build_object('card_print_id', identity.card_print_id, 'identity_key_hash', identity.identity_key_hash, 'is_active', identity.is_active)
       from target join public.card_print_identity identity on identity.card_print_id = target.target_parent_id
     union all
     select 'child', child.id::text,
            jsonb_build_object('card_print_id', child.card_print_id, 'finish_key', child.finish_key, 'printing_gv_id', child.printing_gv_id)
       from target join public.card_printings child on child.id = target.target_child_id
     union all
     select 'child_gv_id', child.id::text,
            jsonb_build_object('card_print_id', child.card_print_id, 'finish_key', child.finish_key, 'printing_gv_id', child.printing_gv_id)
       from target join public.card_printings child on child.printing_gv_id = target.target_printing_gv_id
     union all
     select 'mapping', mapping.id::text,
            jsonb_build_object('card_print_id', mapping.card_print_id, 'source', mapping.source, 'external_id', mapping.external_id, 'active', mapping.active)
       from target join public.external_mappings mapping
         on mapping.id = target.target_mapping_id
         or (mapping.source = 'tcgplayer' and mapping.external_id = target.source_product_id::text)
     order by row_type, row_id`,
    [JSON.stringify(targets)],
  );
  return {
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

function number(value) {
  return Number(value ?? 0);
}

function assertGuard(guard, expectedRows) {
  const exact = [
    'target_count', 'target_parent_count', 'target_child_count', 'target_mapping_count',
    'source_product_count', 'target_parent_gv_count', 'target_printing_gv_count',
    'base_match_count', 'base_finish_count', 'active_finish_count', 'ready_identity_projection_count',
  ];
  for (const field of exact) assert.equal(number(guard[field]), expectedRows, `countdown_rehearsal_guard:${field}`);
  const zero = [
    'parent_id_collision_count', 'parent_gv_collision_count', 'parent_coordinate_collision_count',
    'child_id_collision_count', 'child_gv_collision_count', 'mapping_id_collision_count',
    'source_mapping_collision_count', 'identity_hash_collision_count',
  ];
  for (const field of zero) assert.equal(number(guard[field]), 0, `countdown_rehearsal_guard:${field}`);
}

async function runRollbackRehearsal(client, targets, proposal, plan) {
  const transaction = mappingTransactionState();
  let before;
  try {
    await client.query('begin isolation level serializable');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended('grookai:pokemon-countdown-calendar-2008:rollback-rehearsal:v1', 0))");

    before = {
      target_snapshot: await captureTargetSnapshot(client, targets),
      mapping_sequence: await captureSequence(client),
    };
    assert.equal(before.target_snapshot.rows.length, 0, 'countdown_rehearsal_before_state_not_empty');

    await client.query(
      `create temporary table countdown_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null unique,
         target_mapping_id bigint not null unique,
         base_parent_id uuid not null,
         base_gv_id text not null,
         base_set_code text not null,
         card_name text not null,
         card_number text not null,
         source_product_id bigint not null unique,
         source_product_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         target_parent_gv_id text not null unique,
         target_printing_gv_id text not null unique,
         stamp_color text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into countdown_targets
       select * from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid, target_child_id uuid, target_mapping_id bigint,
         base_parent_id uuid, base_gv_id text, base_set_code text,
         card_name text, card_number text, source_product_id bigint,
         source_product_name text, target_finish_key text, target_variant_key text,
         target_parent_gv_id text, target_printing_gv_id text, stamp_color text,
         evidence jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const guardResult = await client.query(
      `with base as (
         select target.*, cp.*, s.source as set_source, s.code as registry_set_code,
                s.printed_total as registry_printed_total,
                s.printed_set_abbrev as registry_printed_set_abbrev
           from countdown_targets target
           join public.card_prints cp on cp.id = target.base_parent_id
           join public.sets s on s.id = cp.set_id
       ), projection as (
         select base.target_parent_id,
                public.card_print_identity_backfill_projection_v1(
                  base.set_source, base.set_code, base.registry_set_code,
                  base.number, base.number_plain, base.name, base.target_variant_key,
                  coalesce(base.printed_total, base.registry_printed_total),
                  coalesce(base.printed_set_abbrev, base.registry_printed_set_abbrev)
                ) as value
           from base
       )
       select
         (select count(*) from countdown_targets)::int as target_count,
         (select count(distinct target_parent_id) from countdown_targets)::int as target_parent_count,
         (select count(distinct target_child_id) from countdown_targets)::int as target_child_count,
         (select count(distinct target_mapping_id) from countdown_targets)::int as target_mapping_count,
         (select count(distinct source_product_id) from countdown_targets)::int as source_product_count,
         (select count(distinct target_parent_gv_id) from countdown_targets)::int as target_parent_gv_count,
         (select count(distinct target_printing_gv_id) from countdown_targets)::int as target_printing_gv_count,
         (select count(*) from base where gv_id = base_gv_id and set_code = base_set_code and name = card_name and number::text = card_number)::int as base_match_count,
         (select count(*) from base join public.card_printings child on child.card_print_id = base.id and child.finish_key = base.target_finish_key and child.is_provisional = false)::int as base_finish_count,
         (select count(*) from countdown_targets target join public.finish_keys finish on finish.key = target.target_finish_key and finish.is_active = true)::int as active_finish_count,
         (select count(*) from projection where value->>'status' = 'ready')::int as ready_identity_projection_count,
         (select count(*) from countdown_targets target join public.card_prints existing on existing.id = target.target_parent_id)::int as parent_id_collision_count,
         (select count(*) from countdown_targets target join public.card_prints existing on existing.gv_id = target.target_parent_gv_id)::int as parent_gv_collision_count,
         (select count(*) from base join public.card_prints existing
            on existing.set_id = base.set_id
           and coalesce(existing.number_plain, existing.number) = coalesce(base.number_plain, base.number)
           and lower(existing.name) = lower(base.name)
           and coalesce(existing.variant_key, '') = base.target_variant_key)::int as parent_coordinate_collision_count,
         (select count(*) from countdown_targets target join public.card_printings existing on existing.id = target.target_child_id)::int as child_id_collision_count,
         (select count(*) from countdown_targets target join public.card_printings existing on existing.printing_gv_id = target.target_printing_gv_id)::int as child_gv_collision_count,
         (select count(*) from countdown_targets target join public.external_mappings existing on existing.id = target.target_mapping_id)::int as mapping_id_collision_count,
         (select count(*) from countdown_targets target join public.external_mappings existing on existing.source = 'tcgplayer' and existing.external_id = target.source_product_id::text)::int as source_mapping_collision_count,
         (select count(*) from projection join public.card_print_identity identity
            on identity.is_active = true
           and identity.identity_domain = projection.value->>'identity_domain'
           and identity.identity_key_version = projection.value->>'identity_key_version'
           and identity.identity_key_hash = projection.value->>'identity_key_hash')::int as identity_hash_collision_count`,
    );
    const guard = guardResult.rows[0];
    assertGuard(guard, targets.length);

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, game_id, set_id, name, number, variant_key, rarity, image_url, tcgplayer_id,
         external_ids, updated_at, set_code, artist, regulation_mark, image_alt_url,
         image_source, variants, created_at, last_synced_at, print_identity_key,
         ai_metadata, image_hash, data_quality_flags, image_status, image_res,
         image_last_checked_at, printed_set_abbrev, printed_total, gv_id, image_path,
         identity_domain, printed_identity_modifier, set_identity_model,
         representative_image_url, image_note
       )
       select target.target_parent_id, base.game_id, base.set_id, base.name, base.number,
              target.target_variant_key, base.rarity, null, null,
              jsonb_build_object('countdown_calendar_rollback_rehearsal_v1', target.evidence),
              now(), base.set_code, base.artist, base.regulation_mark, null, null,
              base.variants, now(), now(), base.print_identity_key,
              coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
                'source', $1::text,
                'base_parent_id', base.id::text,
                'source_product_id', target.source_product_id,
                'variant_key', target.target_variant_key,
                'explicit_child_finish_key', target.target_finish_key,
                'proposal_fingerprint_sha256', $2::text,
                'plan_fingerprint_sha256', $3::text
              ),
              null, base.data_quality_flags, 'representative_shared_stamp', base.image_res,
              now(), base.printed_set_abbrev, base.printed_total, target.target_parent_gv_id,
              null, base.identity_domain, null, base.set_identity_model,
              coalesce(base.representative_image_url, base.image_url),
              concat('Countdown Calendar 2008 ', target.stamp_color, ' snowflake stamp. Representative base image only until exact stamped artwork is available.')
         from countdown_targets target
         join public.card_prints base on base.id = target.base_parent_id`,
      [CREATED_BY, proposal.fingerprint_sha256, plan.fingerprint_sha256],
    );

    const identityInsert = await client.query(
      `with projection as (
         select target.target_parent_id,
                public.card_print_identity_backfill_projection_v1(
                  s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name,
                  cp.variant_key, coalesce(cp.printed_total, s.printed_total),
                  coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
                ) as value
           from countdown_targets target
           join public.card_prints cp on cp.id = target.target_parent_id
           join public.sets s on s.id = cp.set_id
       )
       insert into public.card_print_identity (
         card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash
       )
       select target_parent_id, value->>'identity_domain', value->>'set_code_identity',
              value->>'printed_number', value->>'normalized_printed_name',
              nullif(value->>'source_name_raw', ''), coalesce(value->'identity_payload', '{}'::jsonb),
              value->>'identity_key_version', value->>'identity_key_hash'
         from projection where value->>'status' = 'ready'`,
    );

    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source,
         provenance_ref, created_by, printing_gv_id, image_source, image_path,
         image_url, image_alt_url, image_status, image_note
       )
       select target_child_id, target_parent_id, target_finish_key, now(), false,
              $1::text, concat('tcgplayer:', source_product_id), $1::text,
              target_printing_gv_id, null, null, null, null,
              'representative_shared_stamp',
              concat('Countdown Calendar 2008 ', stamp_color, ' snowflake stamp; representative parent image.')
         from countdown_targets`,
      [CREATED_BY],
    );

    const mappingInsert = await client.query(
      `insert into public.external_mappings (
         id, card_print_id, source, external_id, meta, synced_at, active
       )
       select target_mapping_id, target_parent_id, 'tcgplayer', source_product_id::text,
              jsonb_build_object(
                'authority', $1::text,
                'rehearsal_only', true,
                'source_group_id', $2::int,
                'source_product_name', source_product_name,
                'proposal_fingerprint_sha256', $3::text,
                'plan_fingerprint_sha256', $4::text
              ), now(), true
         from countdown_targets`,
      [CREATED_BY, SOURCE_GROUP_ID, proposal.fingerprint_sha256, plan.fingerprint_sha256],
    );

    for (const [label, result] of Object.entries({
      parent_inserts: parentInsert,
      identity_inserts: identityInsert,
      child_inserts: childInsert,
      mapping_inserts: mappingInsert,
    })) assert.equal(result.rowCount, targets.length, `countdown_rehearsal_${label}`);

    const proofResult = await client.query(
      `select
         (select count(*) from countdown_targets target join public.card_prints parent on parent.id = target.target_parent_id and parent.gv_id = target.target_parent_gv_id and parent.variant_key = target.target_variant_key)::int as parent_rows,
         (select count(*) from countdown_targets target join public.card_print_identity identity on identity.card_print_id = target.target_parent_id and identity.is_active = true)::int as identity_rows,
         (select count(*) from countdown_targets target join public.card_printings child on child.id = target.target_child_id and child.card_print_id = target.target_parent_id and child.finish_key = target.target_finish_key and child.printing_gv_id = target.target_printing_gv_id)::int as child_rows,
         (select count(*) from countdown_targets target join public.external_mappings mapping on mapping.id = target.target_mapping_id and mapping.card_print_id = target.target_parent_id and mapping.source = 'tcgplayer' and mapping.external_id = target.source_product_id::text and mapping.active = true)::int as mapping_rows`,
    );
    const proof = proofResult.rows[0];
    for (const field of ['parent_rows', 'identity_rows', 'child_rows', 'mapping_rows']) {
      assert.equal(number(proof[field]), targets.length, `countdown_rehearsal_proof:${field}`);
    }
    const inTransaction = {
      target_snapshot: await captureTargetSnapshot(client, targets),
      mapping_sequence: await captureSequence(client),
    };
    assert.equal(inTransaction.target_snapshot.rows.length, targets.length * 6, 'countdown_rehearsal_in_transaction_rows');
    assert.deepEqual(inTransaction.mapping_sequence, before.mapping_sequence, 'countdown_rehearsal_sequence_advanced');

    await rollbackMappingTransaction(client, transaction);
    const after = {
      target_snapshot: await captureTargetSnapshot(client, targets),
      mapping_sequence: await captureSequence(client),
    };
    const rollbackVerified = transaction.rollback_proven
      && before.target_snapshot.hash_sha256 === after.target_snapshot.hash_sha256
      && stableJson(before.mapping_sequence) === stableJson(after.mapping_sequence);
    assert.equal(rollbackVerified, true, 'countdown_rehearsal_rollback_readback');

    return {
      status: 'passed_rolled_back_no_durable_change',
      transaction,
      guard,
      simulated_write_counts: {
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        mapping_inserts: mappingInsert.rowCount,
      },
      proof,
      before,
      in_transaction: inTransaction,
      after_rollback: after,
      explicit_mapping_ids_bypassed_sequence: true,
      mapping_sequence_unchanged: stableJson(before.mapping_sequence) === stableJson(after.mapping_sequence),
      rollback_verified: rollbackVerified,
    };
  } catch (error) {
    if (!transaction.rollback_proven) await rollbackMappingTransaction(client, transaction).catch(() => {});
    throw error;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const [proposal, plan] = await Promise.all([
    fs.readFile(args.proposal, 'utf8').then(JSON.parse),
    fs.readFile(args.plan, 'utf8').then(JSON.parse),
  ]);
  const targets = assertPokemonCountdownRollbackInputsV1(proposal, plan);
  const connectionString = process.env.SUPABASE_DB_URL ?? '';
  assert.ok(connectionString, 'SUPABASE_DB_URL is required');
  const databaseConfig = mappingDatabaseConfig(connectionString, { mode: 'apply' });
  if (process.env.SUPABASE_DB_CA_CERT?.trim()) {
    databaseConfig.ssl = { ...databaseConfig.ssl, ca: process.env.SUPABASE_DB_CA_CERT.trim() };
  }
  const client = new Client(databaseConfig);
  await client.connect();
  let execution;
  try {
    execution = await runRollbackRehearsal(client, targets, proposal, plan);
  } finally {
    await client.end().catch(() => {});
  }

  const report = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    project_ref: PROJECT_REF,
    proposal_fingerprint_sha256: proposal.fingerprint_sha256,
    plan_fingerprint_sha256: plan.fingerprint_sha256,
    durable_database_writes_performed: false,
    transaction_writes_rolled_back: true,
    approvals_performed: false,
    publication_performed: false,
    customer_state_changed: false,
    scope: { source_group_id: SOURCE_GROUP_ID, target_count: targets.length },
    execution,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    project_ref: report.project_ref,
    proposal_fingerprint_sha256: report.proposal_fingerprint_sha256,
    plan_fingerprint_sha256: report.plan_fingerprint_sha256,
    scope: report.scope,
    execution: report.execution,
  }));
  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: execution.status,
    target_count: targets.length,
    simulated_write_counts: execution.simulated_write_counts,
    rollback_verified: execution.rollback_verified,
    mapping_sequence_unchanged: execution.mapping_sequence_unchanged,
    fingerprint_sha256: report.fingerprint_sha256,
  })}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(`[pokemon-countdown-calendar-rollback-rehearsal] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
