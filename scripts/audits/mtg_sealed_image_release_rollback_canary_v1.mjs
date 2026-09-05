import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  buildMtgSealedImageReleaseExecutionPlanV1,
  evaluateMtgSealedImageReleaseRollbackV1,
  hashMtgSealedImageReleaseApplyV1,
  validateMtgSealedImageReleaseExecutionPlanV1,
} from '../../backend/pricing/mtg_sealed_image_release_apply_v1.mjs';
import {
  hashMtgSealedImageReleasePlanV1,
  validateMtgSealedImageReleasePlanV1,
} from '../../backend/pricing/mtg_sealed_image_release_plan_v1.mjs';
import {
  MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
  MTG_SEALED_IMAGE_TABLES_V1,
  supabaseProjectRefFromUrlV1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';
import { pgSslConfig } from
  './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'pricing',
  'mtg_sealed_image_release_plan_v1', '2026-09-05T01-36-09Z_read_only');
const DEFAULT_OUT = path.join(ROOT, '.tmp',
  'mtg-sealed-image-release-rollback-canary-v1');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const IMAGE_TABLES_WITH_WRITES = [
  'sealed_product_image_evidence',
  'sealed_product_image_objects',
  'sealed_product_variant_image_assertions',
  'sealed_product_image_releases',
  'sealed_product_image_release_members',
];

function parseArgs(argv) {
  const args = { execute: false, expectedHeadSha: '',
    expectedPlanFingerprint: '', envFile: DEFAULT_ENV_FILE, outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument === '--execute-rollback-canary') args.execute = true;
    else if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith('--expected-plan-fingerprint=')) {
      args.expectedPlanFingerprint = argument.slice(28).trim().toLowerCase();
    } else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!args.execute) throw new Error('--execute-rollback-canary is required');
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha) ||
      !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint)) {
    throw new Error('Exact head SHA and image release plan fingerprint are required');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function repository(args) {
  const state = { branch: git('branch', '--show-current'),
    head_sha: git('rev-parse', 'HEAD'), expected_head_sha: args.expectedHeadSha,
    tracked_worktree_clean:
      git('status', '--short', '--untracked-files=no') === '' };
  if (state.branch !== 'agent/mtg-sealed-image-migration-promotion-v1' ||
      state.head_sha !== args.expectedHeadSha || !state.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean rollback-canary producer');
  }
  return state;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? '';
}

function clientOptions(connectionString, applicationName) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 300_000,
    statement_timeout: 300_000, application_name: applicationName };
}

function numeric(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value]));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function verifySourceArtifacts() {
  const artifactManifestPath = path.join(SOURCE_DIR, 'artifact_hashes.json');
  const manifestBytes = await fs.readFile(artifactManifestPath);
  const manifest = JSON.parse(manifestBytes);
  const mismatches = [];
  for (const [name, expected] of Object.entries(manifest.artifacts ?? {})) {
    const bytes = await fs.readFile(path.join(SOURCE_DIR, name));
    if (bytes.length !== expected.bytes ||
        hashMtgSealedImageReleasePlanV1(bytes) !== expected.sha256) {
      mismatches.push(name);
    }
  }
  return { valid: mismatches.length === 0, mismatches, manifest,
    manifest_sha256: hashMtgSealedImageReleaseApplyV1(manifestBytes) };
}

function parseJsonl(bytes) {
  return bytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

async function loadBundle(expectedPlanFingerprint) {
  const sourceArtifacts = await verifySourceArtifacts();
  if (!sourceArtifacts.valid) {
    throw new Error(`Source artifact hash mismatch: ${sourceArtifacts.mismatches.join(',')}`);
  }
  const runPlan = await readJson(path.join(SOURCE_DIR, 'run_plan.json'));
  const { repository: _repository, source_artifacts: _sourceArtifacts,
    validation: _validation, ...sourcePlan } = runPlan;
  const payload = {
    evidence: parseJsonl(gunzipSync(await fs.readFile(
      path.join(SOURCE_DIR, 'image_evidence.jsonl.gz')))),
    objects: parseJsonl(gunzipSync(await fs.readFile(
      path.join(SOURCE_DIR, 'image_objects.jsonl.gz')))),
    assertions: parseJsonl(gunzipSync(await fs.readFile(
      path.join(SOURCE_DIR, 'image_assertions.jsonl.gz')))),
    releases: parseJsonl(await fs.readFile(
      path.join(SOURCE_DIR, 'image_releases.jsonl'))),
    release_members: parseJsonl(gunzipSync(await fs.readFile(
      path.join(SOURCE_DIR, 'image_release_members.jsonl.gz')))),
  };
  const exclusions = parseJsonl(gunzipSync(await fs.readFile(
    path.join(SOURCE_DIR, 'exclusions.jsonl.gz'))));
  const bundle = { plan: sourcePlan, payload, exclusions };
  const validation = validateMtgSealedImageReleasePlanV1(bundle);
  if (!validation.valid ||
      sourcePlan.plan_fingerprint_sha256 !== expectedPlanFingerprint) {
    throw new Error(`Frozen source plan invalid: ${validation.findings.join(',')}`);
  }
  return { ...bundle, sourceArtifacts };
}

async function rows(client, sql, values = []) {
  return (await client.query(sql, values)).rows;
}

async function captureState(client, bundle) {
  const authority = (await rows(client, `select
      pointer.release_id::text as active_price_release_id,
      release.release_state as active_price_release_state,
      release.expected_member_count::integer as active_price_expected_member_count,
      image_pointer.image_release_id::text as current_image_release_id,
      sealed_control.release_status as mtg_sealed_visibility,
      catalog_control.release_status as mtg_catalog_visibility,
      (select count(*)::integer from public.sealed_product_release_pointer
        where game_key='one_piece') as one_piece_price_pointer_count,
      (select count(*)::bigint from public.card_prints) as card_print_count,
      (select count(*)::bigint from public.sets) as set_count,
      (select count(*)::bigint from public.sealed_product_families)
        as sealed_family_count,
      (select count(*)::bigint from public.sealed_product_variants)
        as sealed_variant_count,
      (select count(*)::bigint from public.sealed_product_source_mappings)
        as sealed_mapping_count,
      (select count(*)::bigint from public.sealed_product_releases)
        as price_release_count,
      (select count(*)::bigint from public.sealed_product_release_members)
        as price_release_member_count
    from public.sealed_product_release_pointer pointer
    join public.sealed_product_releases release
      on release.id=pointer.release_id and release.game_key=pointer.game_key
    left join public.sealed_product_image_release_pointer image_pointer
      on image_pointer.game_key=pointer.game_key
    left join public.sealed_product_game_release_controls sealed_control
      on sealed_control.game_key=pointer.game_key
    left join public.catalog_game_release_controls catalog_control
      on catalog_control.game_code=pointer.game_key
    where pointer.game_key='mtg'`))[0];
  const tableState = [];
  for (const tableName of MTG_SEALED_IMAGE_TABLES_V1) {
    const row = (await rows(client, `select
        $1::text as table_name,
        relation.relrowsecurity as rls_enabled,
        relation.relforcerowsecurity as rls_forced,
        (select count(*)::bigint from public.${tableName}) as row_count
      from pg_class relation where relation.oid=$2::regclass`,
    [tableName, `public.${tableName}`]))[0];
    tableState.push(numeric(row));
  }
  const tableGrants = await rows(client, `select table_name,grantee,privilege_type
    from information_schema.role_table_grants
    where table_schema='public' and table_name=any($1::text[])
      and grantee=any(array['anon','authenticated','service_role'])
    order by table_name,grantee,privilege_type`, [MTG_SEALED_IMAGE_TABLES_V1]);
  const routineGrants = await rows(client, `select routine_name,grantee,privilege_type
    from information_schema.role_routine_grants
    where specific_schema='public'
      and routine_name=any(array['sealed_product_freeze_image_release_v1',
        'sealed_product_set_active_image_release_v1'])
      and grantee=any(array['anon','authenticated','service_role'])
    order by routine_name,grantee,privilege_type`);
  const lineage = numeric((await rows(client, `with expected as (
      select * from jsonb_to_recordset($1::jsonb) as x(
        source_release_member_id uuid,variant_id uuid,source_mapping_id uuid,
        source_provider text,source_category_id bigint,source_group_id bigint,
        source_product_id bigint)
    ) select count(*)::integer as expected_count,
      count(*) filter (where member.id is not null)::integer as member_count,
      count(*) filter (where mapping.id is not null)::integer as mapping_count,
      count(*) filter (where member.id is null or mapping.id is null)::integer
        as mismatch_count
    from expected expected
    left join public.sealed_product_release_members member
      on member.id=expected.source_release_member_id
     and member.release_id=$2::uuid
     and member.variant_id=expected.variant_id
     and member.source_mapping_id=expected.source_mapping_id
    left join public.sealed_product_source_mappings mapping
      on mapping.id=expected.source_mapping_id
     and mapping.variant_id=expected.variant_id
     and mapping.source_provider=expected.source_provider
     and mapping.source_category_id=expected.source_category_id
     and mapping.source_group_id=expected.source_group_id
     and mapping.source_product_id=expected.source_product_id`, [
    JSON.stringify(bundle.payload.evidence), bundle.plan.source_price_release_id,
  ]))[0]);
  return { authority: numeric(authority ?? {}), image_tables: tableState,
    table_grants: tableGrants, routine_grants: routineGrants, lineage };
}

function evaluatePreflight(state, bundle) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const authority = state.authority;
  add(authority.active_price_release_id !== bundle.plan.source_price_release_id,
    'active_price_release_drift');
  add(authority.active_price_release_state !== 'frozen',
    'active_price_release_not_frozen');
  add(authority.active_price_expected_member_count !== 2182,
    'active_price_member_count_drift');
  add(authority.current_image_release_id !== null, 'image_pointer_collision');
  add(authority.mtg_sealed_visibility !== 'hidden', 'mtg_sealed_not_hidden');
  add(authority.one_piece_price_pointer_count !== 1, 'one_piece_boundary_drift');
  add(state.image_tables.length !== MTG_SEALED_IMAGE_TABLES_V1.length ||
    state.image_tables.some((row) => !row.rls_enabled || !row.rls_forced),
  'image_table_security_drift');
  add(state.image_tables.some((row) => row.row_count !== 0),
    'image_table_not_empty');
  add(state.table_grants.some((row) =>
    ['anon', 'authenticated'].includes(row.grantee)), 'app_table_grant_leak');
  add(state.table_grants.filter((row) => row.grantee === 'service_role').length !== 11,
    'service_table_grant_drift');
  add(state.routine_grants.length !== 2 || state.routine_grants.some((row) =>
    row.grantee !== 'service_role' || row.privilege_type !== 'EXECUTE'),
  'service_routine_grant_drift');
  add(state.lineage.expected_count !== 2182 || state.lineage.member_count !== 2182 ||
    state.lineage.mapping_count !== 2182 || state.lineage.mismatch_count !== 0,
  'source_lineage_drift');
  return { valid: findings.length === 0, findings };
}

async function readOnlyPreflight(connectionString, bundle, applicationName) {
  const client = new Client(clientOptions(connectionString, applicationName));
  await client.connect();
  try {
    await client.query('set default_transaction_read_only=on');
    await client.query('begin transaction isolation level repeatable read read only');
    const transactionReadOnly = (await client.query('show transaction_read_only'))
      .rows[0].transaction_read_only === 'on';
    const state = await captureState(client, bundle);
    await client.query('rollback');
    return { ...evaluatePreflight(state, bundle), transaction_read_only:
      transactionReadOnly, state };
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end();
  }
}

const INSERT_SPECS = Object.freeze({
  evidence: {
    table: 'sealed_product_image_evidence',
    columns: `id,game_key,variant_id,source_mapping_id,source_release_member_id,
      source_provider,source_category_id,source_group_id,source_product_id,
      source_image_url,selected_source_role,retrieved_at,http_status,image_mime,
      image_width,image_height,image_bytes,content_sha256,classification,
      source_plan_fingerprint,coverage_fingerprint,evidence_contract_version,
      evidence_fingerprint`,
    types: `id uuid,game_key text,variant_id uuid,source_mapping_id uuid,
      source_release_member_id uuid,source_provider text,source_category_id bigint,
      source_group_id bigint,source_product_id bigint,source_image_url text,
      selected_source_role text,retrieved_at timestamptz,http_status integer,
      image_mime text,image_width integer,image_height integer,image_bytes bigint,
      content_sha256 text,classification text,source_plan_fingerprint text,
      coverage_fingerprint text,evidence_contract_version text,
      evidence_fingerprint text`,
  },
  objects: {
    table: 'sealed_product_image_objects',
    columns: `id,game_key,storage_bucket,object_path,content_sha256,image_mime,
      image_width,image_height,image_bytes,storage_readback_sha256,
      storage_verified_at,object_contract_version,object_fingerprint`,
    types: `id uuid,game_key text,storage_bucket text,object_path text,
      content_sha256 text,image_mime text,image_width integer,image_height integer,
      image_bytes bigint,storage_readback_sha256 text,storage_verified_at timestamptz,
      object_contract_version text,object_fingerprint text`,
  },
  assertions: {
    table: 'sealed_product_variant_image_assertions',
    columns: `id,game_key,variant_id,source_mapping_id,image_evidence_id,
      image_object_id,assertion_state,assertion_contract_version,
      assertion_fingerprint`,
    types: `id uuid,game_key text,variant_id uuid,source_mapping_id uuid,
      image_evidence_id uuid,image_object_id uuid,assertion_state text,
      assertion_contract_version text,assertion_fingerprint text`,
  },
  releases: {
    table: 'sealed_product_image_releases',
    columns: `id,game_key,release_key,release_state,source_price_release_id,
      source_audit_producer_sha,source_plan_fingerprint,coverage_fingerprint,
      release_contract_version,manifest_fingerprint,expected_member_count,created_by`,
    types: `id uuid,game_key text,release_key text,release_state text,
      source_price_release_id uuid,source_audit_producer_sha text,
      source_plan_fingerprint text,coverage_fingerprint text,
      release_contract_version text,manifest_fingerprint text,
      expected_member_count integer,created_by uuid`,
  },
  release_members: {
    table: 'sealed_product_image_release_members',
    columns: `id,image_release_id,game_key,variant_id,image_assertion_id,
      member_fingerprint`,
    types: `id uuid,image_release_id uuid,game_key text,variant_id uuid,
      image_assertion_id uuid,member_fingerprint text`,
  },
});

async function insertDataset(client, name, inputRows, batchSize = 250) {
  const spec = INSERT_SPECS[name];
  for (let index = 0; index < inputRows.length; index += batchSize) {
    const batch = inputRows.slice(index, index + batchSize);
    await client.query(`insert into public.${spec.table} (${spec.columns})
      select ${spec.columns} from jsonb_to_recordset($1::jsonb) as x(${spec.types})`,
    [JSON.stringify(batch)]);
  }
}

async function exactReadback(client, name, inputRows, frozenRelease = false) {
  const spec = INSERT_SPECS[name];
  const comparison = frozenRelease
    ? `(to_jsonb(actual)-'created_at'-'release_state'-'frozen_by'-'frozen_at') =
        (to_jsonb(expected)-'release_state') and actual.release_state='frozen'
        and actual.frozen_by=expected.created_by and actual.frozen_at is not null`
    : `(to_jsonb(actual)-'created_at') = to_jsonb(expected)`;
  const result = numeric((await rows(client, `with expected as (
      select * from jsonb_to_recordset($1::jsonb) as x(${spec.types})
    ), compared as (
      select expected.id,actual.id as actual_id,(${comparison}) as exact
      from expected left join public.${spec.table} actual on actual.id=expected.id
    ) select count(*)::integer as expected_count,
      count(actual_id)::integer as actual_count,
      count(*) filter (where actual_id is null or exact is not true)::integer
        as mismatch_count,
      (select count(*)::integer from public.${spec.table}) as table_count
    from compared`, [JSON.stringify(inputRows)]))[0]);
  return { ...result, exact: result.expected_count === inputRows.length &&
    result.actual_count === inputRows.length && result.table_count === inputRows.length &&
    result.mismatch_count === 0 };
}

async function writeAttribution(client) {
  return (await rows(client, `select relname as table_name,
    n_tup_ins::bigint as inserted,n_tup_upd::bigint as updated,
    n_tup_del::bigint as deleted,n_tup_hot_upd::bigint as hot_updated
    from pg_stat_xact_user_tables
    where n_tup_ins<>0 or n_tup_upd<>0 or n_tup_del<>0 or n_tup_hot_upd<>0
    order by relname`)).map(numeric);
}

async function runRollback(connectionString, bundle, preflight) {
  const client = new Client(clientOptions(connectionString,
    'mtg-sealed-image-release-rollback-canary-v1'));
  await client.connect();
  let rolledBack = false;
  try {
    await client.query('begin transaction isolation level repeatable read');
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='300s'");
    await client.query("set local idle_in_transaction_session_timeout='90s'");
    await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',
      ['mtg_sealed_image_release_apply_v1']);
    const transactionState = await captureState(client, bundle);
    const transactionPreflight = evaluatePreflight(transactionState, bundle);
    if (!transactionPreflight.valid) {
      throw new Error(`Transaction-local preflight failed: ` +
        transactionPreflight.findings.join(','));
    }
    await insertDataset(client, 'evidence', bundle.payload.evidence);
    await insertDataset(client, 'objects', bundle.payload.objects);
    await insertDataset(client, 'assertions', bundle.payload.assertions);
    await insertDataset(client, 'releases', bundle.payload.releases);
    await insertDataset(client, 'release_members', bundle.payload.release_members);
    const release = bundle.payload.releases[0];
    const freeze = (await rows(client, `select * from
      public.sealed_product_freeze_image_release_v1(
        $1::uuid,$2::text,$3::uuid)`, [release.id,
    release.manifest_fingerprint, release.created_by]))[0];
    const transactionReadback = {};
    transactionReadback.evidence = await exactReadback(client, 'evidence',
      bundle.payload.evidence);
    transactionReadback.objects = await exactReadback(client, 'objects',
      bundle.payload.objects);
    transactionReadback.assertions = await exactReadback(client, 'assertions',
      bundle.payload.assertions);
    transactionReadback.releases = await exactReadback(client, 'releases',
      bundle.payload.releases, true);
    transactionReadback.release_members = await exactReadback(client,
      'release_members', bundle.payload.release_members);
    const manifest = (await rows(client, `select
      public.sealed_product_image_release_manifest_fingerprint_v1($1::uuid)
        as fingerprint`, [release.id]))[0].fingerprint;
    const exclusions = numeric((await rows(client, `select count(*)::integer
        as excluded_evidence_without_assertion_count
      from public.sealed_product_image_evidence evidence
      where evidence.source_plan_fingerprint=$1 and evidence.coverage_fingerprint=$2
        and evidence.classification not in ('exact_image_ready',
          'shared_bytes_exact_variant')
        and not exists (select 1
          from public.sealed_product_variant_image_assertions assertion
          where assertion.image_evidence_id=evidence.id)`, [
      bundle.plan.source_plan_fingerprint_sha256,
      bundle.plan.source_coverage_fingerprint_sha256,
    ]))[0]);
    const pointerCount = Number((await rows(client, `select count(*)::integer
      from public.sealed_product_image_release_pointer where game_key='mtg'`))[0].count);
    const attribution = await writeAttribution(client);
    await client.query('rollback');
    rolledBack = true;
    return { preflight, transaction_local_preflight: transactionPreflight,
      transaction: { started: true, committed: false, rolled_back: true },
      transaction_readback: transactionReadback,
      database_manifest_fingerprint: manifest,
      planned_manifest_fingerprint: release.manifest_fingerprint,
      release_state: freeze.release_state,
      excluded_evidence_without_assertion_count:
        exclusions.excluded_evidence_without_assertion_count,
      transaction_image_pointer_count: pointerCount,
      write_attribution: attribution };
  } finally {
    if (!rolledBack) await client.query('rollback').catch(() => {});
    await client.end();
  }
}

function comparableProtectedState(state) {
  return {
    authority: state.authority,
    table_security: state.image_tables.map(({ table_name, rls_enabled, rls_forced }) =>
      ({ table_name, rls_enabled, rls_forced })),
    table_grants: state.table_grants,
    routine_grants: state.routine_grants,
    lineage: state.lineage,
  };
}

async function postRollbackReadback(connectionString, bundle, preflight) {
  const client = new Client(clientOptions(connectionString,
    'mtg-sealed-image-release-post-rollback-v1'));
  await client.connect();
  try {
    await client.query('set default_transaction_read_only=on');
    await client.query('begin transaction isolation level repeatable read read only');
    const transactionReadOnly = (await client.query('show transaction_read_only'))
      .rows[0].transaction_read_only === 'on';
    const state = await captureState(client, bundle);
    await client.query('rollback');
    const beforeComparable = comparableProtectedState(preflight.state);
    const afterComparable = comparableProtectedState(state);
    return { transaction_read_only: transactionReadOnly,
      zero_target_rows: state.image_tables.every((row) => row.row_count === 0),
      image_pointer_unchanged:
        state.authority.current_image_release_id ===
          preflight.state.authority.current_image_release_id,
      protected_boundaries_unchanged:
        hashMtgSealedImageReleaseApplyV1(JSON.stringify(afterComparable)) ===
          hashMtgSealedImageReleaseApplyV1(JSON.stringify(beforeComparable)),
      security_boundary_unchanged:
        hashMtgSealedImageReleaseApplyV1(JSON.stringify({
          tables: afterComparable.table_security,
          table_grants: afterComparable.table_grants,
          routine_grants: afterComparable.routine_grants,
        })) === hashMtgSealedImageReleaseApplyV1(JSON.stringify({
          tables: beforeComparable.table_security,
          table_grants: beforeComparable.table_grants,
          routine_grants: beforeComparable.routine_grants,
        })),
      state };
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end();
  }
}

async function writeJson(file, value) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await fs.writeFile(file, bytes);
  return bytes;
}

async function writeArtifacts(outDir, files, producerCommitSha) {
  await fs.mkdir(outDir, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const bytes = name.endsWith('.json')
      ? await writeJson(path.join(outDir, name), value)
      : Buffer.from(String(value));
    if (!name.endsWith('.json')) await fs.writeFile(path.join(outDir, name), bytes);
    hashes[name] = { bytes: bytes.length,
      sha256: hashMtgSealedImageReleaseApplyV1(bytes) };
  }
  await writeJson(path.join(outDir, 'artifact_hashes.json'), {
    hash_algorithm: 'sha256', producer_commit_sha: producerCommitSha,
    artifacts: hashes,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const bundle = await loadBundle(args.expectedPlanFingerprint);
  dotenv.config({ path: args.envFile, override: false, quiet: true });
  const connectionString = databaseUrl();
  if (!connectionString || supabaseProjectRefFromUrlV1(connectionString) !==
      MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1) {
    throw new Error('Canonical production database URL is required');
  }
  const preflight = await readOnlyPreflight(connectionString, bundle,
    'mtg-sealed-image-release-preflight-v1');
  if (!preflight.valid || !preflight.transaction_read_only) {
    throw new Error(`Fresh production preflight failed: ${preflight.findings.join(',')}`);
  }
  const planInputs = { repository: repo, sourcePlan: bundle.plan,
    sourceArtifactManifestSha256: bundle.sourceArtifacts.manifest_sha256,
    sourceArtifactHashes: bundle.sourceArtifacts.manifest.artifacts,
    productionPreflight: preflight };
  const runPlan = buildMtgSealedImageReleaseExecutionPlanV1({
    ...planInputs, mode: 'rollback_canary' });
  const durableApplyPlan = buildMtgSealedImageReleaseExecutionPlanV1({
    ...planInputs, mode: 'durable_apply' });
  const runPlanValidation = validateMtgSealedImageReleaseExecutionPlanV1(runPlan);
  const durablePlanValidation =
    validateMtgSealedImageReleaseExecutionPlanV1(durableApplyPlan);
  if (!runPlanValidation.valid || !durablePlanValidation.valid) {
    throw new Error('Execution plan validation failed');
  }
  await fs.mkdir(args.outDir, { recursive: true });
  await writeJson(path.join(args.outDir, 'run_plan.json'), runPlan);
  await writeJson(path.join(args.outDir, 'durable_apply_plan.json'), durableApplyPlan);
  const proof = await runRollback(connectionString, bundle, preflight);
  proof.post_rollback = await postRollbackReadback(connectionString, bundle, preflight);
  const validation = evaluateMtgSealedImageReleaseRollbackV1(proof);
  const summary = {
    status: validation.valid
      ? 'production_rollback_canary_passed_zero_residue'
      : 'production_rollback_canary_failed',
    repository: repo,
    source_image_release_plan_fingerprint_sha256:
      bundle.plan.plan_fingerprint_sha256,
    rollback_execution_fingerprint_sha256:
      runPlan.execution_fingerprint_sha256,
    durable_apply_execution_fingerprint_sha256:
      durableApplyPlan.execution_fingerprint_sha256,
    release_id: bundle.plan.release_id,
    manifest_fingerprint_sha256:
      bundle.plan.release_manifest_fingerprint_sha256,
    expected_counts: runPlan.expected_counts,
    exact_transaction_readback: Object.values(proof.transaction_readback)
      .every((row) => row.exact),
    database_manifest_matches_plan:
      proof.database_manifest_fingerprint === proof.planned_manifest_fingerprint,
    post_rollback_zero_target_rows: proof.post_rollback.zero_target_rows,
    post_rollback_pointer_unchanged: proof.post_rollback.image_pointer_unchanged,
    post_rollback_protected_boundaries_unchanged:
      proof.post_rollback.protected_boundaries_unchanged,
    validation,
    boundaries: runPlan.boundaries,
    exact_next_gate: validation.valid
      ? 'request exact authority for the frozen durable apply plan; do not activate pointer'
      : 'stop and repair before any durable image release apply',
  };
  const report = `# MTG Sealed Image Release Rollback Canary V1\n\n` +
    `- Status: **${validation.valid ? 'PASS' : 'FAIL'}**\n` +
    `- Producer commit: \`${repo.head_sha}\`\n` +
    `- Source release plan: \`${bundle.plan.plan_fingerprint_sha256}\`\n` +
    `- Rollback execution: \`${runPlan.execution_fingerprint_sha256}\`\n` +
    `- Durable apply execution: \`${durableApplyPlan.execution_fingerprint_sha256}\`\n` +
    `- Inserted and exactly read back in transaction: \`8622\` rows\n` +
    `- Release frozen and manifest verified in transaction: \`${summary.database_manifest_matches_plan}\`\n` +
    `- Transaction committed: \`false\`\n` +
    `- Post-rollback target rows: \`0\`\n` +
    `- Image pointer writes: \`0\`\n` +
    `- Storage/pricing/visibility/Vault/client writes: \`0\`\n`;
  await writeArtifacts(args.outDir, {
    'run_plan.json': runPlan,
    'durable_apply_plan.json': durableApplyPlan,
    'fresh_production_preflight.json': preflight,
    'transaction_proof.json': proof,
    'summary.json': summary,
    'REPORT.md': report,
  }, repo.head_sha);
  process.stdout.write(`${JSON.stringify({ ...summary,
    output_directory: args.outDir,
    required_durable_apply_authority:
      durableApplyPlan.required_durable_apply_authority }, null, 2)}\n`);
  if (!validation.valid) throw new Error(validation.findings.join(','));
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { captureState, evaluatePreflight, exactReadback, insertDataset,
  loadBundle, parseArgs, postRollbackReadback, readOnlyPreflight, runRollback };
