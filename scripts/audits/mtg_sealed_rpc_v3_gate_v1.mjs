import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  buildMtgSealedRpcV3Plan,
  hashMtgSealedRpcV3,
  MTG_SEALED_RPC_V3_CANDIDATE_SHA256,
  MTG_SEALED_RPC_V3_GATE_VERSION,
  MTG_SEALED_RPC_V3_IMAGE_MANIFEST,
  MTG_SEALED_RPC_V3_IMAGE_RELEASE_ID,
  MTG_SEALED_RPC_V3_MIGRATION_FILENAME,
  MTG_SEALED_RPC_V3_MIGRATION_NAME,
  MTG_SEALED_RPC_V3_MIGRATION_VERSION,
  MTG_SEALED_RPC_V3_PRICE_RELEASE_ID,
  MTG_SEALED_RPC_V3_SIGNATURE,
  stableMtgSealedRpcV3Json,
  stripSealedMigrationTransactionWrapperV1,
  validateMtgSealedRpcV3Preflight,
  validateMtgSealedRpcV3Readback,
} from '../../backend/pricing/mtg_sealed_rpc_v3_gate_v1.mjs';
import {
  MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
  supabaseProjectRefFromUrlV1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';
import { pgSslConfig } from
  './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const DEFAULT_OUT = path.join(ROOT, '.tmp', 'mtg-sealed-rpc-v3-gate-v1');
const MIGRATION_PATH = path.join(ROOT, 'supabase', 'migrations',
  MTG_SEALED_RPC_V3_MIGRATION_FILENAME);
const CANDIDATE_PATH = path.join(ROOT, 'docs', 'sql',
  'mtg_sealed_image_backed_pricing_rpc_v3_migration_candidate.sql');
const BRANCH = 'agent/mtg-sealed-image-migration-promotion-v1';
const APPLY_GUARD_ENV = 'MTG_SEALED_RPC_V3_APPLY_GUARD';

function parseArgs(argv) {
  const args = { mode: 'plan', expectedHeadSha: '', expectedPlanFingerprint: '',
    envFile: DEFAULT_ENV_FILE, outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument === '--plan') args.mode = 'plan';
    else if (argument === '--rollback-canary') args.mode = 'rollback';
    else if (argument === '--apply') args.mode = 'apply';
    else if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice('--expected-head-sha='.length)
        .trim().toLowerCase();
    } else if (argument.startsWith('--expected-plan-fingerprint=')) {
      args.expectedPlanFingerprint = argument
        .slice('--expected-plan-fingerprint='.length).trim().toLowerCase();
    } else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice('--env-file='.length));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice('--out-dir='.length));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha=<40-character SHA> is required');
  }
  if (args.mode !== 'plan' &&
      !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint)) {
    throw new Error('Execution requires an exact plan fingerprint');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function repository(args) {
  const state = {
    branch: git('branch', '--show-current'),
    head_sha: git('rev-parse', 'HEAD'),
    tracked_worktree_clean:
      git('status', '--porcelain', '--untracked-files=no') === '',
  };
  if (state.branch !== BRANCH || state.head_sha !== args.expectedHeadSha ||
      !state.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean RPC V3 producer');
  }
  return state;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? '';
}

function clientOptions(connectionString, applicationName) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 180_000,
    statement_timeout: 180_000, application_name: applicationName };
}

async function rows(client, sql, values = []) {
  return (await client.query(sql, values)).rows;
}

function numeric(row) {
  return Object.fromEntries(Object.entries(row ?? {}).map(([key, value]) =>
    [key, typeof value === 'string' && /^\d+$/.test(value)
      ? Number(value) : value]));
}

async function captureProtectedState(client) {
  return numeric((await rows(client, `select
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
      as price_member_count,
    (select count(*)::bigint from public.sealed_product_image_evidence)
      as image_evidence_count,
    (select count(*)::bigint from public.sealed_product_image_objects)
      as image_object_count,
    (select count(*)::bigint from public.sealed_product_variant_image_assertions)
      as image_assertion_count,
    (select count(*)::bigint from public.sealed_product_image_releases)
      as image_release_count,
    (select count(*)::bigint from public.sealed_product_image_release_members)
      as image_member_count,
    (select count(*)::bigint from public.sealed_product_image_release_pointer)
      as image_pointer_count,
    (select release_id::text from public.sealed_product_release_pointer
      where game_key='mtg') as mtg_price_pointer,
    (select image_release_id::text from public.sealed_product_image_release_pointer
      where game_key='mtg') as mtg_image_pointer,
    (select release_id::text from public.sealed_product_release_pointer
      where game_key='one_piece') as one_piece_price_pointer,
    (select release_status from public.catalog_game_release_controls
      where game_code='mtg') as mtg_catalog_visibility,
    (select release_status from public.sealed_product_game_release_controls
      where game_key='mtg') as mtg_sealed_visibility`))[0]);
}

async function captureAuthority(client) {
  return (await rows(client, `select
      price_pointer.release_id::text as price_release_id,
      price_release.release_state as price_release_state,
      image_pointer.image_release_id::text as image_release_id,
      image_release.release_state as image_release_state,
      image_release.manifest_fingerprint as image_manifest,
      image_release.source_price_release_id::text
        as image_source_price_release_id,
      catalog.release_status as catalog_visibility,
      sealed.release_status as sealed_visibility
    from public.sealed_product_release_pointer price_pointer
    join public.sealed_product_releases price_release
      on price_release.id=price_pointer.release_id
     and price_release.game_key=price_pointer.game_key
    join public.sealed_product_image_release_pointer image_pointer
      on image_pointer.game_key=price_pointer.game_key
    join public.sealed_product_image_releases image_release
      on image_release.id=image_pointer.image_release_id
     and image_release.game_key=image_pointer.game_key
    left join public.catalog_game_release_controls catalog
      on catalog.game_code=price_pointer.game_key
    left join public.sealed_product_game_release_controls sealed
      on sealed.game_key=price_pointer.game_key
    where price_pointer.game_key='mtg'`))[0] ?? {};
}

async function captureStructuralEvidence(client) {
  return numeric((await rows(client, `with active_price as (
      select member.id,member.variant_id,member.source_mapping_id,
        member.qualification_id
      from public.sealed_product_release_pointer pointer
      join public.sealed_product_releases release
        on release.id=pointer.release_id and release.game_key=pointer.game_key
       and release.release_state='frozen'
      join public.sealed_product_release_members member
        on member.release_id=release.id
       and member.qualification_status='qualified_exact'
      where pointer.game_key='mtg'
    ), image_backed as (
      select distinct price_member.id,qualification.observed_on,
        qualification.source_subtype_name_normalized,qualification.currency,
        (qualification.qualification_evidence #>>
          '{observation,market_price}')::numeric as market_price
      from active_price price_member
      join public.sealed_product_pricing_lane_qualifications qualification
        on qualification.id=price_member.qualification_id
       and qualification.variant_id=price_member.variant_id
       and qualification.source_mapping_id=price_member.source_mapping_id
       and qualification.qualification_status='qualified_exact'
      join public.sealed_product_variants variant
        on variant.id=price_member.variant_id and variant.language_code='en'
      join public.sealed_product_families family
        on family.id=variant.family_id and family.game_key='mtg'
      join public.sealed_product_source_mappings mapping
        on mapping.id=price_member.source_mapping_id
       and mapping.variant_id=price_member.variant_id
       and mapping.source_provider='tcgplayer'
      join public.sealed_product_image_release_pointer image_pointer
        on image_pointer.game_key='mtg'
      join public.sealed_product_image_releases image_release
        on image_release.id=image_pointer.image_release_id
       and image_release.game_key='mtg'
       and image_release.release_state='frozen'
       and image_release.source_price_release_id=(select release_id
         from public.sealed_product_release_pointer where game_key='mtg')
      join public.sealed_product_image_release_members image_member
        on image_member.image_release_id=image_release.id
       and image_member.variant_id=price_member.variant_id
      join public.sealed_product_variant_image_assertions assertion
        on assertion.id=image_member.image_assertion_id
       and assertion.variant_id=price_member.variant_id
       and assertion.source_mapping_id=price_member.source_mapping_id
       and assertion.assertion_state='exact_verified'
      join public.sealed_product_image_evidence evidence
        on evidence.id=assertion.image_evidence_id
       and evidence.variant_id=assertion.variant_id
       and evidence.source_mapping_id=assertion.source_mapping_id
       and evidence.source_release_member_id=price_member.id
       and evidence.classification in
         ('exact_image_ready','shared_bytes_exact_variant')
      join public.sealed_product_image_objects image_object
        on image_object.id=assertion.image_object_id
       and image_object.content_sha256=evidence.content_sha256
       and image_object.storage_readback_sha256=evidence.content_sha256
       and image_object.image_mime=evidence.image_mime
       and image_object.image_width=evidence.image_width
       and image_object.image_height=evidence.image_height
       and image_object.image_bytes=evidence.image_bytes
      where image_object.storage_bucket='user-card-images'
        and image_object.object_path like 'sealed/mtg/sha256/%'
    ), eligible as (
      select id from image_backed
      where source_subtype_name_normalized='normal'
        and currency='USD'
        and observed_on between current_date-7 and current_date
        and market_price > 0
    ), freshness as (
      select count(*) filter (where qualification.observed_on < current_date-7
        or qualification.observed_on > current_date)::integer as stale_rows
      from active_price price_member
      join public.sealed_product_pricing_lane_qualifications qualification
        on qualification.id=price_member.qualification_id
    ) select
      (select count(*)::integer from active_price) as active_price_rows,
      (select count(*)::integer from image_backed) as image_backed_rows,
      (select count(*)::integer from eligible) as eligible_rows,
      ((select count(*) from active_price)-
        (select count(*) from image_backed))::integer
        as missing_image_rows,
      ((select count(*) from active_price)-
        (select count(*) from eligible))::integer as noneligible_rows,
      freshness.stale_rows
    from freshness`))[0]);
}

async function missingPrerequisites(client) {
  const relations = [
    'sealed_product_release_pointer', 'sealed_product_releases',
    'sealed_product_release_members', 'sealed_product_pricing_lane_qualifications',
    'sealed_product_variants', 'sealed_product_families',
    'sealed_product_source_mappings', 'sealed_product_image_release_pointer',
    'sealed_product_image_releases', 'sealed_product_image_release_members',
    'sealed_product_variant_image_assertions', 'sealed_product_image_evidence',
    'sealed_product_image_objects',
  ];
  const functions = [
    'public.catalog_game_visible_to_request_v1(text)',
    'public.sealed_product_game_visible_to_request_v1(text)',
  ];
  const missingRelations = await rows(client, `select name
    from unnest($1::text[]) as item(name)
    where to_regclass('public.'||name) is null order by name`, [relations]);
  const missingFunctions = await rows(client, `select name
    from unnest($1::text[]) as item(name)
    where to_regprocedure(name) is null order by name`, [functions]);
  return [...missingRelations, ...missingFunctions].map((row) => row.name);
}

async function capturePreflight(client, connectionString) {
  const transactionReadOnly = (await client.query('show transaction_read_only'))
    .rows[0].transaction_read_only;
  const apiRef = supabaseProjectRefFromUrlV1(process.env.SUPABASE_URL ?? '');
  const dbRef = supabaseProjectRefFromUrlV1(connectionString);
  const migrationLedgerCount = Number((await rows(client, `select count(*)
    from supabase_migrations.schema_migrations where version=$1`,
  [MTG_SEALED_RPC_V3_MIGRATION_VERSION]))[0].count);
  const functionPresent = (await rows(client, `select
    to_regprocedure($1) is not null as present`,
  [MTG_SEALED_RPC_V3_SIGNATURE]))[0].present;
  return {
    transaction_read_only: transactionReadOnly,
    transaction_closed_before_artifacts: false,
    project_ref_match: apiRef === MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1 &&
      dbRef === MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
    api_project_ref: apiRef,
    database_project_ref: dbRef,
    migration_ledger_count: migrationLedgerCount,
    function_present: functionPresent,
    missing_prerequisites: await missingPrerequisites(client),
    authority: await captureAuthority(client),
    structural_evidence: await captureStructuralEvidence(client),
    protected_state: await captureProtectedState(client),
  };
}

async function readOnlyPreflight(connectionString) {
  const client = new Client(clientOptions(connectionString,
    'mtg-sealed-rpc-v3-preflight-v1'));
  await client.connect();
  let preflight;
  try {
    await client.query('set default_transaction_read_only=on');
    await client.query('begin transaction isolation level repeatable read read only');
    preflight = await capturePreflight(client, connectionString);
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  preflight.transaction_closed_before_artifacts = true;
  return preflight;
}

function definitionContractValid(definition) {
  return [
    /image_release\.source_price_release_id = price_pointer\.release_id/i,
    /image_evidence\.source_release_member_id = price_member\.id/i,
    /qualification\.observed_on >= current_date - 7/i,
    /qualification\.observed_on <= current_date/i,
    /image_object\.storage_readback_sha256 = image_evidence\.content_sha256/i,
    /catalog_game_visible_to_request_v1\(family\.game_key\)/i,
    /sealed_product_game_visible_to_request_v1\(family\.game_key\)/i,
  ].every((pattern) => pattern.test(definition)) &&
    !/selected_source_url|source_image_url|external_image_url/i.test(definition);
}

async function callAsRole(client, role) {
  await client.query(`set local role ${role}`);
  try {
    await client.query(`select set_config('request.jwt.claim.role',$1,true)`, [role]);
    return Number((await rows(client, `select count(*) from
      public.get_active_sealed_product_pricing_v3('mtg',null,100,0)`))[0].count);
  } finally {
    await client.query('reset role');
  }
}

async function anonymousDenied(client) {
  await client.query('savepoint anonymous_rpc_check');
  try {
    await client.query('set local role anon');
    await client.query(`select set_config('request.jwt.claim.role','anon',true)`);
    await client.query(`select * from
      public.get_active_sealed_product_pricing_v3('mtg',null,1,0)`);
    await client.query('reset role');
    await client.query('release savepoint anonymous_rpc_check');
    return false;
  } catch (error) {
    await client.query('rollback to savepoint anonymous_rpc_check');
    await client.query('reset role');
    await client.query('release savepoint anonymous_rpc_check');
    return error.code === '42501';
  }
}

async function captureReadback(client, plan, closed = false) {
  const functionRow = (await rows(client, `select
      $1::text as signature,procedure.provolatile as volatility,
      procedure.prosecdef as security_definer,
      coalesce(procedure.proconfig,array[]::text[]) as configuration,
      pg_get_functiondef(procedure.oid) as definition,
      exists(select 1 from aclexplode(coalesce(procedure.proacl,
        acldefault('f',procedure.proowner))) acl
        where acl.grantee=0 and acl.privilege_type='EXECUTE') as public_execute,
      has_function_privilege('anon',$1,'EXECUTE') as anon_execute,
      has_function_privilege('authenticated',$1,'EXECUTE')
        as authenticated_execute,
      has_function_privilege('service_role',$1,'EXECUTE')
        as service_role_execute
    from pg_proc procedure where procedure.oid=to_regprocedure($1)`,
  [MTG_SEALED_RPC_V3_SIGNATURE]))[0] ?? {};
  functionRow.definition_contract_valid =
    definitionContractValid(functionRow.definition ?? '');
  delete functionRow.definition;
  const ledger = (await rows(client, `select version,name,
      cardinality(statements)::integer as statement_count
    from supabase_migrations.schema_migrations where version=$1`,
  [MTG_SEALED_RPC_V3_MIGRATION_VERSION]))[0] ?? {};
  const behavior = {
    authenticated_hidden_rows: await callAsRole(client, 'authenticated'),
    service_role_hidden_rows: await callAsRole(client, 'service_role'),
    anonymous_execute_denied: await anonymousDenied(client),
  };
  return {
    transaction_read_only: (await client.query('show transaction_read_only'))
      .rows[0].transaction_read_only,
    transaction_closed_before_artifacts: closed,
    function: functionRow,
    ledger,
    behavior,
    structural_evidence: await captureStructuralEvidence(client),
    protected_state: await captureProtectedState(client),
    plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
  };
}

async function freshReadback(connectionString, plan) {
  const client = new Client(clientOptions(connectionString,
    'mtg-sealed-rpc-v3-independent-readback-v1'));
  await client.connect();
  let readback;
  try {
    await client.query('set default_transaction_read_only=on');
    await client.query('begin transaction isolation level repeatable read read only');
    readback = await captureReadback(client, plan);
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  readback.transaction_closed_before_artifacts = true;
  return readback;
}

async function executeMigration({ connectionString, plan, migrationSql,
  rollbackOnly }) {
  const client = new Client(clientOptions(connectionString,
    rollbackOnly ? 'mtg-sealed-rpc-v3-rollback-v1' :
      'mtg-sealed-rpc-v3-apply-v1'));
  await client.connect();
  let inside;
  try {
    const immediate = await captureProtectedState(client);
    if (stableMtgSealedRpcV3Json(immediate) !==
        stableMtgSealedRpcV3Json(plan.protected_baseline)) {
      throw new Error('Protected state drifted after the frozen preflight');
    }
    await client.query('begin');
    await client.query(`set local lock_timeout='${plan.timeouts.lock_timeout}'`);
    await client.query(
      `set local statement_timeout='${plan.timeouts.statement_timeout}'`);
    await client.query(`set local idle_in_transaction_session_timeout=` +
      `'${plan.timeouts.idle_in_transaction_session_timeout}'`);
    await client.query(stripSealedMigrationTransactionWrapperV1(migrationSql));
    await client.query(`insert into supabase_migrations.schema_migrations
      (version,statements,name) values($1,$2::text[],$3)`, [
      plan.ledger_row.version, plan.ledger_row.statements, plan.ledger_row.name,
    ]);
    inside = await captureReadback(client, plan);
    const findings = validateMtgSealedRpcV3Readback({ plan, readback: inside,
      requireReadOnly: false, requireClosed: false });
    if (findings.length) {
      throw new Error(`Transaction readback failed: ${findings.join(',')}`);
    }
    if (rollbackOnly) await client.query('rollback');
    else await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  return inside;
}

async function postRollbackProof(connectionString, baseline) {
  const preflight = await readOnlyPreflight(connectionString);
  const findings = validateMtgSealedRpcV3Preflight(preflight);
  if (stableMtgSealedRpcV3Json(preflight.protected_state) !==
      stableMtgSealedRpcV3Json(baseline)) findings.push('post_rollback_state_drift');
  return { preflight, findings, valid: findings.length === 0 };
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, 'utf8');
  return body;
}

async function writeArtifacts(outDir, artifacts, producerSha) {
  await fs.mkdir(outDir, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(artifacts)) {
    const body = typeof value === 'string' ? value :
      `${JSON.stringify(value, null, 2)}\n`;
    await fs.writeFile(path.join(outDir, name), body, 'utf8');
    hashes[name] = { bytes: Buffer.byteLength(body),
      sha256: hashMtgSealedRpcV3(body) };
  }
  await writeJson(path.join(outDir, 'artifact_hashes.json'), {
    hash_algorithm: 'sha256', producer_commit_sha: producerSha,
    artifacts: hashes,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error('Production database URL is required');
  const [migrationSql, candidateSql] = await Promise.all([
    fs.readFile(MIGRATION_PATH, 'utf8'), fs.readFile(CANDIDATE_PATH, 'utf8'),
  ]);
  if (hashMtgSealedRpcV3(candidateSql) !==
      MTG_SEALED_RPC_V3_CANDIDATE_SHA256) {
    throw new Error('Reviewed RPC V3 candidate hash changed');
  }
  const preflight = await readOnlyPreflight(connectionString);
  const plan = buildMtgSealedRpcV3Plan({ repository: repo, migrationSql,
    candidateSql, preflight });

  if (args.mode !== 'plan' && plan.apply_plan_fingerprint_sha256 !==
      args.expectedPlanFingerprint) {
    throw new Error('Fresh plan does not match the frozen execution plan');
  }

  if (args.mode === 'plan') {
    const summary = { status: 'ready_not_applied', repository: repo,
      migration: plan.migration,
      apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
      structural_evidence: plan.structural_evidence,
      database_writes: 0 };
    const report = `# MTG Sealed RPC V3 Plan\n\n` +
      `- Status: **READY; NOT APPLIED**\n` +
      `- Producer: \`${repo.head_sha}\`\n` +
      `- Migration SHA-256: \`${plan.migration.sha256}\`\n` +
      `- Plan fingerprint: \`${plan.apply_plan_fingerprint_sha256}\`\n` +
      `- Database writes: \`0\`\n`;
    await writeArtifacts(args.outDir, { 'run_plan.json': plan,
      'fresh_preflight.json': preflight, 'summary.json': summary,
      'REPORT.md': report }, repo.head_sha);
    process.stdout.write(`${JSON.stringify({ ...summary,
      output_directory: args.outDir }, null, 2)}\n`);
    return;
  }

  if (args.mode === 'rollback') {
    const inside = await executeMigration({ connectionString, plan,
      migrationSql, rollbackOnly: true });
    const postRollback = await postRollbackProof(connectionString,
      plan.protected_baseline);
    const summary = {
      status: postRollback.valid ? 'rollback_proven_zero_residue' :
        'rollback_proof_failed',
      repository: repo,
      apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
      transaction_committed: false,
      function_and_ledger_absent_after_rollback: postRollback.valid,
      protected_state_unchanged: postRollback.valid,
      findings: postRollback.findings,
    };
    const report = `# MTG Sealed RPC V3 Rollback Canary\n\n` +
      `- Status: **${postRollback.valid ? 'PASS' : 'FAIL'}**\n` +
      `- Transaction committed: \`false\`\n` +
      `- Zero residue: \`${postRollback.valid}\`\n`;
    await writeArtifacts(args.outDir, { 'run_plan.json': plan,
      'fresh_preflight.json': preflight,
      'transaction_readback.json': inside,
      'post_rollback_readback.json': postRollback,
      'summary.json': summary, 'REPORT.md': report }, repo.head_sha);
    if (!postRollback.valid) throw new Error(postRollback.findings.join(','));
    process.stdout.write(`${JSON.stringify({ ...summary,
      output_directory: args.outDir }, null, 2)}\n`);
    return;
  }

  if (process.env[APPLY_GUARD_ENV] !== plan.apply_plan_fingerprint_sha256) {
    throw new Error(`Exact plan guard missing from ${APPLY_GUARD_ENV}`);
  }
  const inside = await executeMigration({ connectionString, plan,
    migrationSql, rollbackOnly: false });
  const independent = await freshReadback(connectionString, plan);
  const findings = validateMtgSealedRpcV3Readback({ plan,
    readback: independent });
  const valid = findings.length === 0;
  const summary = {
    status: valid ? 'rpc_v3_applied_and_independently_read_back' :
      'rpc_v3_post_apply_readback_failed',
    repository: repo,
    migration: plan.migration,
    apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
    transaction_committed: true,
    function_readback_exact: valid,
    anonymous_execute_denied: independent.behavior.anonymous_execute_denied,
    signed_in_rows_while_hidden:
      independent.behavior.authenticated_hidden_rows,
    protected_state_unchanged: stableMtgSealedRpcV3Json(
      independent.protected_state) === stableMtgSealedRpcV3Json(
      plan.protected_baseline),
    findings,
    boundaries: plan.boundaries,
    exact_next_gate: 'deploy and prove the trusted MTG sealed image signer while keeping clients and visibility disabled',
  };
  const report = `# MTG Sealed RPC V3 Apply\n\n` +
    `- Status: **${valid ? 'PASS' : 'FAIL'}**\n` +
    `- Migration: \`${plan.migration.filename}\`\n` +
    `- Transaction committed: \`true\`\n` +
    `- Anonymous execute denied: \`${independent.behavior.anonymous_execute_denied}\`\n` +
    `- Signed-in rows while hidden: \`${independent.behavior.authenticated_hidden_rows}\`\n` +
    `- Protected data changed: \`${!summary.protected_state_unchanged}\`\n`;
  await writeArtifacts(args.outDir, { 'run_plan.json': plan,
    'fresh_preflight.json': preflight,
    'transaction_readback.json': inside,
    'independent_readback.json': independent,
    'summary.json': summary, 'REPORT.md': report }, repo.head_sha);
  if (!valid) throw new Error(findings.join(','));
  process.stdout.write(`${JSON.stringify({ ...summary,
    output_directory: args.outDir }, null, 2)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { captureProtectedState, captureStructuralEvidence, parseArgs };
