import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  buildMtgSealedImagePointerRepairPlanV1,
  evaluateMtgSealedImagePointerRepairPreflightV1,
  evaluateMtgSealedImagePointerRepairReadbackV1,
  hashMtgSealedImagePointerRepairV1,
  MTG_SEALED_IMAGE_POINTER_REPAIR_APPROVAL_ENV_V1,
  MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_FILENAME_V1,
  mtgSealedImagePointerRepairProtectedStateFingerprintV1,
  validateMtgSealedImagePointerRepairPlanV1,
} from '../../backend/pricing/mtg_sealed_image_pointer_function_repair_v1.mjs';
import { stripSealedMigrationTransactionWrapperV1 } from
  '../../backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs';
import {
  MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
  supabaseProjectRefFromUrlV1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';
import { pgSslConfig } from
  './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const MIGRATION_PATH = path.join(ROOT, 'supabase', 'migrations',
  MTG_SEALED_IMAGE_POINTER_REPAIR_MIGRATION_FILENAME_V1);

function parseArgs(argv) {
  const args = { mode: 'plan', envFile: DEFAULT_ENV_FILE, expectedHeadSha: '',
    expectedPlanFingerprint: '', outDir: path.join(ROOT, '.tmp',
      'mtg-sealed-image-pointer-function-repair-v1') };
  for (const argument of argv) {
    if (argument === '--plan') args.mode = 'plan';
    else if (argument === '--rollback-canary') args.mode = 'rollback';
    else if (argument === '--apply') args.mode = 'apply';
    else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice('--env-file='.length));
    } else if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice('--expected-head-sha='.length)
        .trim().toLowerCase();
    } else if (argument.startsWith('--expected-plan-fingerprint=')) {
      args.expectedPlanFingerprint = argument
        .slice('--expected-plan-fingerprint='.length).trim().toLowerCase();
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice('--out-dir='.length));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha is required');
  }
  if (args.mode === 'apply' &&
      !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint)) {
    throw new Error('Apply requires exact --expected-plan-fingerprint');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function repository(args) {
  const state = { branch: git('branch', '--show-current'),
    head_sha: git('rev-parse', 'HEAD'),
    tracked_worktree_clean:
      git('status', '--short', '--untracked-files=no') === '' };
  if (state.branch !== 'agent/mtg-sealed-image-migration-promotion-v1' ||
      state.head_sha !== args.expectedHeadSha || !state.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean repair producer');
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

async function captureState(client, projectRef, { closed = false } = {}) {
  const functionRow = (await rows(client, `select true as present,
      procedure.prosecdef as security_definer,
      procedure.provolatile as volatility,
      coalesce(procedure.proconfig,array[]::text[]) as configuration,
      pg_get_functiondef(procedure.oid) as definition
    from pg_proc procedure
    where procedure.oid=to_regprocedure(
      'public.sealed_product_set_active_image_release_v1(uuid,uuid,uuid)')`
  ))[0] ?? { present: false, configuration: [], definition: null };
  const routineGrants = await rows(client, `select grantee,privilege_type
    from information_schema.role_routine_grants
    where specific_schema='public'
      and routine_name='sealed_product_set_active_image_release_v1'
      and grantee=any(array['PUBLIC','anon','authenticated','service_role'])
    order by grantee,privilege_type`);
  const pointer = numeric((await rows(client, `select count(*)::integer as count,
      max(image_release_id::text) as image_release_id
    from public.sealed_product_image_release_pointer where game_key='mtg'`))[0]);
  const authority = numeric((await rows(client, `select
      image_release.id::text as image_release_id,
      image_release.release_state as image_release_state,
      image_release.manifest_fingerprint as image_release_manifest,
      (select count(*)::integer from public.sealed_product_image_release_members
        where image_release_id=image_release.id) as image_release_member_count,
      price_pointer.release_id::text as price_release_id,
      price_release.release_state as price_release_state,
      (select count(*)::integer from public.sealed_product_release_members
        where release_id=price_pointer.release_id) as price_release_member_count,
      catalog_control.release_status as catalog_visibility,
      sealed_control.release_status as sealed_visibility
    from public.sealed_product_image_releases image_release
    join public.sealed_product_release_pointer price_pointer
      on price_pointer.game_key=image_release.game_key
     and price_pointer.release_id=image_release.source_price_release_id
    join public.sealed_product_releases price_release
      on price_release.id=price_pointer.release_id
    left join public.catalog_game_release_controls catalog_control
      on catalog_control.game_code=image_release.game_key
    left join public.sealed_product_game_release_controls sealed_control
      on sealed_control.game_key=image_release.game_key
    where image_release.id='86b207e6-4f73-5d9a-af40-864c47256c38'::uuid`))[0]);
  const protectedCounts = numeric((await rows(client, `select
      (select count(*)::bigint from public.card_prints) as card_prints,
      (select count(*)::bigint from public.sets) as sets,
      (select count(*)::bigint from public.sealed_product_families) as families,
      (select count(*)::bigint from public.sealed_product_variants) as variants,
      (select count(*)::bigint from public.sealed_product_source_mappings)
        as source_mappings,
      (select count(*)::bigint from public.sealed_product_releases)
        as price_releases,
      (select count(*)::bigint from public.sealed_product_release_members)
        as price_release_members,
      (select count(*)::bigint from public.sealed_product_image_evidence)
        as image_evidence,
      (select count(*)::bigint from public.sealed_product_image_objects)
        as image_objects,
      (select count(*)::bigint from public.sealed_product_variant_image_assertions)
        as image_assertions,
      (select count(*)::bigint from public.sealed_product_image_releases)
        as image_releases,
      (select count(*)::bigint from public.sealed_product_image_release_members)
        as image_release_members,
      (select count(*)::bigint from public.sealed_product_release_pointer
        where game_key='one_piece') as one_piece_price_pointers`))[0]);
  const ledgerRows = await rows(client, `select version,name,
      cardinality(statements)::integer as statement_count
    from supabase_migrations.schema_migrations
    where version=$1`, ['20260905040000']);
  const laterVersions = (await rows(client, `select version
    from supabase_migrations.schema_migrations where version>$1
    order by version`, ['20260905040000'])).map((row) => row.version);
  const transactionReadOnly = (await client.query('show transaction_read_only'))
    .rows[0].transaction_read_only === 'on';
  return { project_ref: projectRef, transaction_read_only: transactionReadOnly,
    transaction_closed_before_artifacts: closed,
    migration_ledger: { count: ledgerRows.length,
      ...(ledgerRows[0] ?? {}), later_versions: laterVersions },
    pointer_function: functionRow, routine_grants: routineGrants, pointer,
    authority, protected_counts: protectedCounts };
}

async function readOnlyState(connectionString, projectRef, applicationName) {
  const client = new Client(clientOptions(connectionString, applicationName));
  await client.connect();
  try {
    await client.query('set default_transaction_read_only=on');
    await client.query('begin transaction isolation level repeatable read read only');
    const state = await captureState(client, projectRef);
    await client.query('rollback');
    state.transaction_closed_before_artifacts = true;
    return state;
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
      sha256: hashMtgSealedImagePointerRepairV1(bytes) };
  }
  await writeJson(path.join(outDir, 'artifact_hashes.json'), {
    hash_algorithm: 'sha256', producer_commit_sha: producerCommitSha,
    artifacts: hashes,
  });
}

async function runApply({ connectionString, projectRef, repositoryState,
  migrationSql, plan, durable = true }) {
  const client = new Client(clientOptions(connectionString,
    'mtg-sealed-image-pointer-function-repair-v1'));
  await client.connect();
  let completed = false;
  try {
    await client.query('begin transaction isolation level repeatable read');
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='180s'");
    await client.query("set local idle_in_transaction_session_timeout='60s'");
    await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',
      ['mtg_sealed_image_pointer_function_repair_v1']);
    const before = await captureState(client, projectRef);
    const beforeValidation = evaluateMtgSealedImagePointerRepairPreflightV1(
      before, { requireReadOnly: false });
    if (!beforeValidation.valid ||
        hashMtgSealedImagePointerRepairV1(before.pointer_function.definition) !==
          plan.baseline_function_definition_sha256 ||
        mtgSealedImagePointerRepairProtectedStateFingerprintV1(before) !==
          plan.protected_state_fingerprint_sha256) {
      throw new Error(`Transaction-local repair preflight drift: ` +
        beforeValidation.findings.join(','));
    }
    await client.query(stripSealedMigrationTransactionWrapperV1(migrationSql));
    await client.query(`insert into supabase_migrations.schema_migrations
      (version,statements,name) values($1,$2::text[],$3)`, [
      plan.ledger_row.version, plan.ledger_row.statements, plan.ledger_row.name,
    ]);
    const inside = await captureState(client, projectRef);
    const insideValidation = evaluateMtgSealedImagePointerRepairReadbackV1({
      plan, readback: inside,
      baselineProtectedStateFingerprint: plan.protected_state_fingerprint_sha256,
      requireReadOnly: false, requireClosed: false,
    });
    if (!insideValidation.valid) {
      throw new Error(`Inside-transaction repair readback failed: ` +
        insideValidation.findings.join(','));
    }
    await client.query(durable ? 'commit' : 'rollback');
    completed = true;
    return { before, inside, inside_validation: insideValidation,
      transaction: { committed: durable, rolled_back: !durable },
      repository: repositoryState };
  } finally {
    if (!completed) await client.query('rollback').catch(() => {});
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const migrationSql = await fs.readFile(MIGRATION_PATH, 'utf8');
  dotenv.config({ path: args.envFile, override: false, quiet: true });
  const connectionString = databaseUrl();
  const projectRef = supabaseProjectRefFromUrlV1(connectionString);
  if (!connectionString || projectRef !== MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1) {
    throw new Error('Canonical production database URL is required');
  }
  const baseline = await readOnlyState(connectionString, projectRef,
    'mtg-sealed-image-pointer-function-repair-preflight-v1');
  const plan = buildMtgSealedImagePointerRepairPlanV1({ repository: repo,
    migrationSql, preflight: baseline });
  const planValidation = validateMtgSealedImagePointerRepairPlanV1(plan);
  if (!planValidation.valid) {
    throw new Error(`Repair plan invalid: ${planValidation.findings.join(',')}`);
  }
  if (args.mode === 'plan') {
    const summary = { status: 'repair_plan_ready_no_writes', repository: repo,
      migration: plan.migration,
      apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
      pointer_count: baseline.pointer.count, boundaries: plan.boundaries,
      required_approval_message: plan.required_approval_message };
    await writeArtifacts(args.outDir, { 'preflight.json': baseline,
      'apply_plan.json': plan, 'summary.json': summary,
      'REPORT.md': `# MTG Sealed Image Pointer Function Repair Plan\n\n` +
        `- Status: **READY, NO WRITES**\n` +
        `- Migration: \`${plan.migration.filename}\`\n` +
        `- SHA-256: \`${plan.migration.sha256}\`\n` +
        `- Apply plan: \`${plan.apply_plan_fingerprint_sha256}\`\n` +
        `- Current pointer rows: \`0\`\n` }, repo.head_sha);
    process.stdout.write(`${JSON.stringify({ ...summary,
      output_directory: args.outDir }, null, 2)}\n`);
    return;
  }
  if (args.mode === 'rollback') {
    const execution = await runApply({ connectionString, projectRef,
      repositoryState: repo, migrationSql, plan, durable: false });
    const postRollback = await readOnlyState(connectionString, projectRef,
      'mtg-sealed-image-pointer-function-repair-post-rollback-v1');
    const postValidation =
      evaluateMtgSealedImagePointerRepairPreflightV1(postRollback);
    const functionRestored = hashMtgSealedImagePointerRepairV1(
      postRollback.pointer_function.definition) ===
        plan.baseline_function_definition_sha256;
    const protectedStateRestored =
      mtgSealedImagePointerRepairProtectedStateFingerprintV1(postRollback) ===
        plan.protected_state_fingerprint_sha256;
    if (!postValidation.valid || !functionRestored || !protectedStateRestored) {
      throw new Error(`Repair rollback residue: ${postValidation.findings.join(',')}`);
    }
    const summary = { status: 'repair_migration_canary_passed_zero_residue',
      repository: repo, migration: plan.migration,
      apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
      transaction_committed: false, transaction_rolled_back: true,
      repaired_function_readback_inside_transaction:
        execution.inside_validation.valid,
      function_restored_after_rollback: functionRestored,
      protected_state_restored_after_rollback: protectedStateRestored,
      pointer_count_after_rollback: postRollback.pointer.count,
      boundaries: plan.boundaries,
      required_approval_message: plan.required_approval_message };
    await writeArtifacts(args.outDir, { 'apply_plan.json': plan,
      'fresh_preflight.json': baseline,
      'transaction_readback.json': execution,
      'post_rollback_readback.json': postRollback, 'summary.json': summary,
      'REPORT.md': `# MTG Sealed Image Pointer Function Repair Canary\n\n` +
        `- Status: **PASS, ZERO RESIDUE**\n` +
        `- Repaired function valid in transaction: \`true\`\n` +
        `- Transaction committed: \`false\`\n` +
        `- Function restored after rollback: \`true\`\n` +
        `- Pointer rows after rollback: \`0\`\n` }, repo.head_sha);
    process.stdout.write(`${JSON.stringify({ ...summary,
      output_directory: args.outDir }, null, 2)}\n`);
    return;
  }
  if (args.expectedPlanFingerprint !== plan.apply_plan_fingerprint_sha256 ||
      process.env[MTG_SEALED_IMAGE_POINTER_REPAIR_APPROVAL_ENV_V1] !==
        plan.guard_token) {
    throw new Error('Exact repair plan fingerprint and approval token are required');
  }
  const execution = await runApply({ connectionString, projectRef,
    repositoryState: repo, migrationSql, plan, durable: true });
  const readback = await readOnlyState(connectionString, projectRef,
    'mtg-sealed-image-pointer-function-repair-readback-v1');
  const validation = evaluateMtgSealedImagePointerRepairReadbackV1({ plan,
    readback,
    baselineProtectedStateFingerprint: plan.protected_state_fingerprint_sha256 });
  if (!validation.valid) {
    throw new Error(`Independent repair readback failed: ${validation.findings.join(',')}`);
  }
  const summary = { status: 'pointer_function_repaired_and_read_back',
    repository: repo, migration: plan.migration,
    apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
    transaction_committed: true, pointer_count: readback.pointer.count,
    protected_state_unchanged: true, validation, boundaries: plan.boundaries,
    exact_next_gate: 'rerun the rollback-only image-pointer canary' };
  await writeArtifacts(args.outDir, { 'apply_plan.json': plan,
    'fresh_preflight.json': baseline, 'transaction_readback.json': execution,
    'independent_readback.json': readback, 'summary.json': summary,
    'REPORT.md': `# MTG Sealed Image Pointer Function Repair V1\n\n` +
      `- Status: **PASS**\n- Function replacements: \`1\`\n` +
      `- Migration ledger rows: \`1\`\n- Pointer writes: \`0\`\n` +
      `- Protected state unchanged: \`true\`\n` }, repo.head_sha);
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

export { captureState, parseArgs, readOnlyState, runApply };
