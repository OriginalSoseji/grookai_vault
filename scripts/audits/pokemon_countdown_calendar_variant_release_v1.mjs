#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import pg from 'pg';

import '../../backend/env.mjs';
import {
  commitMappingTransaction,
  mappingDatabaseConfig,
  mappingTransactionState,
  rollbackMappingTransaction,
} from '../../backend/pricing/exact_mapping_execution_guard_v1.mjs';
import {
  assertCountdownReleasePackageV1,
  buildCountdownReleasePackageV1,
  countdownReleaseApprovalTextV1,
  sha256,
  stableJson,
} from '../../backend/catalog/pokemon_countdown_calendar_variant_release_v1.mjs';
import {
  assertPokemonCountdownRollbackInputsV1,
} from './pokemon_countdown_calendar_variant_rollback_rehearsal_v1.mjs';

const { Client } = pg;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const VERSION = 'POKEMON_COUNTDOWN_CALENDAR_VARIANT_RELEASE_EXECUTION_V1';
const EXPECTED_ROWS = 22;
const CREATED_BY = 'pokemon_countdown_calendar_variant_release_v1';
const CODE_FILES = [
  'backend/catalog/master_index_printing_execution_guard_v1.mjs',
  'backend/catalog/pokemon_countdown_calendar_variant_release_v1.mjs',
  'backend/pricing/exact_mapping_execution_guard_v1.mjs',
  'scripts/audits/pokemon_countdown_calendar_variant_release_v1.mjs',
  'scripts/audits/pokemon_countdown_calendar_variant_rollback_rehearsal_v1.mjs',
];

function parseArgs(argv) {
  const mode = argv.includes('--prepare') ? 'prepare' : argv.includes('--apply') ? 'apply' : '';
  assert.ok(mode, 'Choose --prepare or --apply');
  assert.equal(argv.filter((arg) => ['--prepare', '--apply'].includes(arg)).length, 1, 'Choose one release mode');
  const value = (name) => argv.find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3).trim() ?? '';
  const result = {
    mode,
    proposal: value('proposal'),
    plan: value('plan'),
    rehearsal: value('rehearsal'),
    output: value('output'),
  };
  for (const key of ['proposal', 'plan', 'rehearsal', 'output']) {
    assert.ok(result[key], `--${key} is required`);
    result[key] = path.resolve(result[key]);
  }
  return result;
}

function currentCommitSha() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
}

function assertCleanTrackedTree() {
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  assert.equal(status, '', 'countdown_release_tracked_tree_not_clean');
}

async function codeFiles() {
  return Promise.all(CODE_FILES.map(async (file) => ({
    file,
    sha256: crypto.createHash('sha256').update(await fs.readFile(path.join(ROOT, file))).digest('hex'),
  })));
}

async function captureSequence(client) {
  const result = await client.query('select last_value::text, is_called from public.external_mappings_id_seq');
  assert.equal(result.rows.length, 1, 'countdown_release_sequence_snapshot');
  return result.rows[0];
}

async function captureTargetSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select * from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid, target_child_id uuid, source_product_id bigint,
         target_parent_gv_id text, target_printing_gv_id text
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
         on mapping.source = 'tcgplayer' and mapping.external_id = target.source_product_id::text
     order by row_type, row_id`,
    [JSON.stringify(targets)],
  );
  return { rows: result.rows, hash_sha256: sha256(stableJson(result.rows)) };
}

async function createTargetTable(client, targets) {
  await client.query(
    `create temporary table countdown_release_targets (
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
    `insert into countdown_release_targets
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
}

async function readGuard(client) {
  const result = await client.query(
    `with base as (
       select target.*, cp.*, s.source as set_source, s.code as registry_set_code,
              s.printed_total as registry_printed_total,
              s.printed_set_abbrev as registry_printed_set_abbrev
         from countdown_release_targets target
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
       (select count(*) from countdown_release_targets)::int as target_count,
       (select count(distinct source_product_id) from countdown_release_targets)::int as source_product_count,
       (select count(*) from base where gv_id = base_gv_id and set_code = base_set_code and name = card_name and number::text = card_number)::int as base_match_count,
       (select count(*) from base join public.card_printings child on child.card_print_id = base.id and child.finish_key = base.target_finish_key and child.is_provisional = false)::int as base_finish_count,
       (select count(*) from countdown_release_targets target join public.finish_keys finish on finish.key = target.target_finish_key and finish.is_active = true)::int as active_finish_count,
       (select count(*) from projection where value->>'status' = 'ready')::int as ready_identity_projection_count,
       (select count(*) from countdown_release_targets target join public.card_prints existing on existing.id = target.target_parent_id or existing.gv_id = target.target_parent_gv_id)::int as parent_collision_count,
       (select count(*) from base join public.card_prints existing
          on existing.set_id = base.set_id
         and coalesce(existing.number_plain, existing.number) = coalesce(base.number_plain, base.number)
         and lower(existing.name) = lower(base.name)
         and coalesce(existing.variant_key, '') = base.target_variant_key)::int as parent_coordinate_collision_count,
       (select count(*) from countdown_release_targets target join public.card_printings existing on existing.id = target.target_child_id or existing.printing_gv_id = target.target_printing_gv_id)::int as child_collision_count,
       (select count(*) from countdown_release_targets target join public.external_mappings existing on existing.source = 'tcgplayer' and existing.external_id = target.source_product_id::text)::int as source_mapping_collision_count,
       (select count(*) from projection join public.card_print_identity identity
          on identity.is_active = true
         and identity.identity_domain = projection.value->>'identity_domain'
         and identity.identity_key_version = projection.value->>'identity_key_version'
         and identity.identity_key_hash = projection.value->>'identity_key_hash')::int as identity_hash_collision_count`,
  );
  const guard = result.rows[0];
  for (const field of ['target_count', 'source_product_count', 'base_match_count', 'base_finish_count', 'active_finish_count', 'ready_identity_projection_count']) {
    assert.equal(Number(guard[field]), EXPECTED_ROWS, `countdown_release_guard:${field}`);
  }
  for (const field of ['parent_collision_count', 'parent_coordinate_collision_count', 'child_collision_count', 'source_mapping_collision_count', 'identity_hash_collision_count']) {
    assert.equal(Number(guard[field]), 0, `countdown_release_guard:${field}`);
  }
  return guard;
}

async function insertRelease(client, proposal, plan, pkg) {
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
            jsonb_build_object('countdown_calendar_variant_release_v1', target.evidence),
            now(), base.set_code, base.artist, base.regulation_mark, null, null,
            base.variants, now(), now(), base.print_identity_key,
            coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
              'source', $1::text,
              'base_parent_id', base.id::text,
              'source_product_id', target.source_product_id,
              'variant_key', target.target_variant_key,
              'explicit_child_finish_key', target.target_finish_key,
              'proposal_fingerprint_sha256', $2::text,
              'plan_fingerprint_sha256', $3::text,
              'release_package_fingerprint_sha256', $4::text
            ),
            null, base.data_quality_flags, 'representative_shared_stamp', base.image_res,
            now(), base.printed_set_abbrev, base.printed_total, target.target_parent_gv_id,
            null, base.identity_domain, null, base.set_identity_model,
            coalesce(base.representative_image_url, base.image_url),
            concat('Countdown Calendar 2008 ', target.stamp_color, ' snowflake stamp. Representative base image only until exact stamped artwork is available.')
       from countdown_release_targets target
       join public.card_prints base on base.id = target.base_parent_id`,
    [CREATED_BY, proposal.fingerprint_sha256, plan.fingerprint_sha256, pkg.package_fingerprint_sha256],
  );
  const identityInsert = await client.query(
    `with projection as (
       select target.target_parent_id,
              public.card_print_identity_backfill_projection_v1(
                s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name,
                cp.variant_key, coalesce(cp.printed_total, s.printed_total),
                coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
              ) as value
         from countdown_release_targets target
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
       from countdown_release_targets`,
    [CREATED_BY],
  );
  const mappingInsert = await client.query(
    `insert into public.external_mappings (
       card_print_id, source, external_id, meta, synced_at, active
     )
     select target_parent_id, 'tcgplayer', source_product_id::text,
            jsonb_build_object(
              'authority', $1::text,
              'source_group_id', 2155,
              'source_product_name', source_product_name,
              'proposal_fingerprint_sha256', $2::text,
              'plan_fingerprint_sha256', $3::text,
              'rollback_proof_fingerprint_sha256', $4::text,
              'release_package_fingerprint_sha256', $5::text
            ), now(), true
       from countdown_release_targets`,
    [CREATED_BY, proposal.fingerprint_sha256, plan.fingerprint_sha256,
      pkg.rollback_proof_fingerprint_sha256, pkg.package_fingerprint_sha256],
  );
  const counts = {
    parent_inserts: parentInsert.rowCount,
    identity_inserts: identityInsert.rowCount,
    child_inserts: childInsert.rowCount,
    mapping_inserts: mappingInsert.rowCount,
  };
  assert.deepEqual(counts, {
    parent_inserts: EXPECTED_ROWS,
    identity_inserts: EXPECTED_ROWS,
    child_inserts: EXPECTED_ROWS,
    mapping_inserts: EXPECTED_ROWS,
  });
  return counts;
}

async function exactProof(client, targets, pkg) {
  const result = await client.query(
    `with target as (
       select * from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid, target_child_id uuid, source_product_id bigint,
         target_finish_key text, target_variant_key text,
         target_parent_gv_id text, target_printing_gv_id text
       )
     )
     select
       (select count(*) from target join public.card_prints parent
          on parent.id = target.target_parent_id and parent.gv_id = target.target_parent_gv_id
         and parent.variant_key = target.target_variant_key
         and parent.ai_metadata->>'release_package_fingerprint_sha256' = $2)::int as parent_rows,
       (select count(*) from target join public.card_print_identity identity
          on identity.card_print_id = target.target_parent_id and identity.is_active = true)::int as identity_rows,
       (select count(*) from target join public.card_printings child
          on child.id = target.target_child_id and child.card_print_id = target.target_parent_id
         and child.finish_key = target.target_finish_key and child.printing_gv_id = target.target_printing_gv_id
         and child.is_provisional = false and child.created_by = $3)::int as child_rows,
       (select count(*) from target join public.external_mappings mapping
          on mapping.card_print_id = target.target_parent_id and mapping.source = 'tcgplayer'
         and mapping.external_id = target.source_product_id::text and mapping.active = true
         and mapping.meta->>'release_package_fingerprint_sha256' = $2)::int as mapping_rows`,
    [JSON.stringify(targets), pkg.package_fingerprint_sha256, CREATED_BY],
  );
  const proof = result.rows[0];
  for (const field of ['parent_rows', 'identity_rows', 'child_rows', 'mapping_rows']) {
    assert.equal(Number(proof[field]), EXPECTED_ROWS, `countdown_release_proof:${field}`);
  }
  return proof;
}

function clientConfig() {
  const connectionString = process.env.SUPABASE_DB_URL ?? '';
  assert.ok(connectionString, 'SUPABASE_DB_URL is required');
  const config = mappingDatabaseConfig(connectionString, { mode: 'apply' });
  if (process.env.SUPABASE_DB_CA_CERT?.trim()) {
    config.ssl = { ...config.ssl, ca: process.env.SUPABASE_DB_CA_CERT.trim() };
  }
  return config;
}

async function applyRelease({ targets, proposal, plan, pkg }) {
  const transaction = mappingTransactionState();
  const client = new Client(clientConfig());
  await client.connect();
  let before;
  let guard;
  let writes;
  let transactionalProof;
  try {
    await client.query('begin isolation level serializable');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended('grookai:pokemon-countdown-calendar-2008:durable-release:v1', 0))");
    before = {
      target_snapshot: await captureTargetSnapshot(client, targets),
      mapping_sequence: await captureSequence(client),
    };
    assert.equal(before.target_snapshot.rows.length, 0, 'countdown_release_before_state_not_empty');
    await createTargetTable(client, targets);
    guard = await readGuard(client);
    writes = await insertRelease(client, proposal, plan, pkg);
    transactionalProof = await exactProof(client, targets, pkg);
    assert.equal((await captureTargetSnapshot(client, targets)).rows.length, EXPECTED_ROWS * 6);
    await commitMappingTransaction(client, transaction);
  } catch (error) {
    if (!transaction.commit_attempted && !transaction.rollback_proven) {
      await rollbackMappingTransaction(client, transaction).catch(() => {});
    }
    error.commit_uncertain = transaction.commit_uncertain;
    error.rollback_uncertain = transaction.rollback_uncertain;
    throw error;
  } finally {
    await client.end().catch(() => {});
  }

  const readbackClient = new Client(clientConfig());
  try {
    await readbackClient.connect();
    const durable = {
      target_snapshot: await captureTargetSnapshot(readbackClient, targets),
      mapping_sequence: await captureSequence(readbackClient),
      proof: await exactProof(readbackClient, targets, pkg),
    };
    assert.equal(durable.target_snapshot.rows.length, EXPECTED_ROWS * 6, 'countdown_release_durable_snapshot_count');
    assert.notEqual(durable.target_snapshot.hash_sha256, before.target_snapshot.hash_sha256);
    return {
      status: 'committed_and_independently_verified',
      transaction,
      guard,
      writes,
      transactional_proof: transactionalProof,
      before,
      durable,
      exact_readback: true,
      pricing_publication_performed: false,
      customer_state_changed: false,
    };
  } catch (error) {
    error.commit_succeeded = transaction.committed === true;
    error.commit_uncertain = transaction.commit_uncertain;
    throw error;
  } finally {
    await readbackClient.end().catch(() => {});
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const [proposal, plan, rollbackReceipt, files] = await Promise.all([
    fs.readFile(args.proposal, 'utf8').then(JSON.parse),
    fs.readFile(args.plan, 'utf8').then(JSON.parse),
    fs.readFile(args.rehearsal, 'utf8').then(JSON.parse),
    codeFiles(),
  ]);
  const targets = assertPokemonCountdownRollbackInputsV1(proposal, plan);
  const sourceCommitSha = currentCommitSha();
  const expectedSha = process.env.COUNTDOWN_RELEASE_EXPECTED_SHA?.trim();
  if (expectedSha) assert.equal(sourceCommitSha, expectedSha, 'countdown_release_expected_sha_mismatch');
  const pkg = buildCountdownReleasePackageV1({
    proposal,
    plan,
    rollbackReceipt,
    targets,
    sourceCommitSha,
    codeFiles: files,
  });
  assertCountdownReleasePackageV1(pkg, {
    proposal,
    plan,
    rollbackReceipt,
    targets,
    codeFiles: files,
    sourceCommitSha,
  });
  const requiredApprovalText = countdownReleaseApprovalTextV1(pkg);
  let execution = null;
  if (args.mode === 'apply') {
    assertCleanTrackedTree();
    assert.equal(process.env.COUNTDOWN_RELEASE_APPROVAL?.trim(), requiredApprovalText,
      'countdown_release_exact_approval_required');
    try {
      execution = await applyRelease({ targets, proposal, plan, pkg });
    } catch (error) {
      error.release_package = pkg;
      throw error;
    }
  }
  const report = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    mode: args.mode,
    status: args.mode === 'prepare' ? 'prepared_not_authorized' : execution.status,
    package: pkg,
    required_approval_text: requiredApprovalText,
    execution,
    durable_database_writes_performed: args.mode === 'apply',
    price_publication_performed: false,
    customer_state_changed: false,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    mode: report.mode,
    status: report.status,
    package: report.package,
    execution: report.execution,
  }));
  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    source_commit_sha: sourceCommitSha,
    package_fingerprint_sha256: pkg.package_fingerprint_sha256,
    required_approval_text: requiredApprovalText,
    execution: execution ? {
      writes: execution.writes,
      exact_readback: execution.exact_readback,
      pricing_publication_performed: execution.pricing_publication_performed,
    } : null,
  })}\n`);
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(async (error) => {
    const outputArg = process.argv.slice(2).find((arg) => arg.startsWith('--output='));
    if (outputArg) {
      const output = path.resolve(outputArg.slice('--output='.length));
      const failure = {
        version: VERSION,
        generated_at: new Date().toISOString(),
        status: 'failed',
        package: error.release_package ?? null,
        commit_succeeded: error.commit_succeeded ?? false,
        commit_uncertain: error.commit_uncertain ?? false,
        rollback_uncertain: error.rollback_uncertain ?? false,
        error_name: error.name ?? 'Error',
        error_code: error.code ?? null,
        error_message: String(error.message ?? error).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[database-url-redacted]'),
        required_action: error.commit_succeeded || error.commit_uncertain
          ? 'Stop and perform independent exact readback. Do not retry blindly.'
          : 'No durable commit was acknowledged. Correct the failed gate before a new prepared release.',
      };
      failure.fingerprint_sha256 = sha256(stableJson(failure));
      await fs.mkdir(path.dirname(output), { recursive: true });
      await fs.writeFile(output, `${JSON.stringify(failure, null, 2)}\n`, { flag: 'wx' }).catch(() => {});
    }
    console.error(`[pokemon-countdown-calendar-release] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
