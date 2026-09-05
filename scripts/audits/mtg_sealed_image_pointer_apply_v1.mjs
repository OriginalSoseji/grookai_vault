import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  buildMtgSealedImagePointerApplyPlanV1,
  evaluateMtgSealedImagePointerApplyPrecommitV1,
  evaluateMtgSealedImagePointerApplyReadbackV1,
  hashMtgSealedImagePointerApplyV1,
  MTG_SEALED_IMAGE_POINTER_APPLY_APPROVAL_ENV_V1,
  validateMtgSealedImagePointerApplyPlanV1,
} from '../../backend/pricing/mtg_sealed_image_pointer_apply_v1.mjs';
import {
  MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
  supabaseProjectRefFromUrlV1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';
import {
  candidateStructuralEligibility,
  captureAppliedImageState,
  comparableProtectedState,
  evaluateAppliedPreflight,
  readOnlyPreflight,
  visibilityAndSigning,
} from './mtg_sealed_image_pointer_rollback_canary_v1.mjs';
import { readOnlyState as readRepairState } from
  './mtg_sealed_image_pointer_function_repair_v1.mjs';
import { loadBundle, writeAttribution } from
  './mtg_sealed_image_release_rollback_canary_v1.mjs';
import { pgSslConfig } from
  './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const SOURCE_RELEASE_PLAN =
  '7c7f65ed0d281fec9f9b0e65f74c6b695828445bcf45fb2dcd98baab814c68a9';
const SOURCE_RELEASE_APPLY =
  '0e477804e8f7fb653b118e4567d9dca6d7b2663d8dd532073d1986c8e9aeb440';
const SOURCE_POINTER_CANARY =
  'a49bf02d128e4a5221a31922d2fc71900c6737c37c76cb209b83f652795ab60a';

function parseArgs(argv) {
  const args = { mode: 'plan', envFile: DEFAULT_ENV_FILE, expectedHeadSha: '',
    expectedPlanFingerprint: '', outDir: path.join(ROOT, '.tmp',
      'mtg-sealed-image-pointer-apply-v1') };
  for (const argument of argv) {
    if (argument === '--plan') args.mode = 'plan';
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
    throw new Error('Repository is not the exact clean pointer-apply producer');
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

async function releasePriceBinding(client, plan) {
  return (await rows(client, `select exists (
    select 1 from public.sealed_product_image_release_pointer image_pointer
    join public.sealed_product_image_releases image_release
      on image_release.id=image_pointer.image_release_id
     and image_release.game_key=image_pointer.game_key
     and image_release.release_state='frozen'
    join public.sealed_product_release_pointer price_pointer
      on price_pointer.game_key=image_release.game_key
     and price_pointer.release_id=image_release.source_price_release_id
    join public.sealed_product_releases price_release
      on price_release.id=price_pointer.release_id
     and price_release.release_state='frozen'
    where image_pointer.game_key='mtg'
      and image_release.id=$1::uuid and price_release.id=$2::uuid
  ) as valid`, [plan.target_image_release_id,
  plan.required_active_price_release_id]))[0].valid;
}

async function pointerRow(client) {
  return (await rows(client, `select game_key,image_release_id::text,
    previous_image_release_id::text,pointer_contract_version,
    changed_by::text,changed_at::text
    from public.sealed_product_image_release_pointer where game_key='mtg'`))[0]
    ?? null;
}

function normalizedProtectedState(state) {
  const value = structuredClone(comparableProtectedState(state));
  value.authority.current_image_release_id = null;
  value.image_tables = value.image_tables.map((row) => row.table_name ===
    'sealed_product_image_release_pointer' ? { ...row, row_count: 0 } : row);
  return value;
}

async function captureDurableReadback(connectionString, bundle, plan,
  baselineState) {
  const client = new Client(clientOptions(connectionString,
    'mtg-sealed-image-pointer-independent-readback-v1'));
  await client.connect();
  try {
    await client.query('set default_transaction_read_only=on');
    await client.query('begin transaction isolation level repeatable read read only');
    const transactionReadOnly = (await client.query('show transaction_read_only'))
      .rows[0].transaction_read_only === 'on';
    const state = await captureAppliedImageState(client, bundle);
    const pointer = await pointerRow(client);
    const binding = await releasePriceBinding(client, plan);
    const structural = await candidateStructuralEligibility(client,
      plan.selected_signing_candidate);
    const signing = await visibilityAndSigning(client,
      plan.selected_signing_candidate);
    await client.query('rollback');
    return { transaction_read_only: transactionReadOnly,
      transaction_closed_before_artifacts: true, pointer,
      release_price_binding_valid: binding,
      candidate_structural_eligibility: structural,
      catalog_visible: signing.catalog_visible,
      sealed_visible: signing.sealed_visible,
      signing_authorized: signing.signing_authorized,
      protected_state_unchanged: JSON.stringify(normalizedProtectedState(state)) ===
        JSON.stringify(normalizedProtectedState(baselineState)),
      security_boundary_unchanged: JSON.stringify({
        image_tables: state.image_tables.map(
          ({ table_name, rls_enabled, rls_forced }) =>
            ({ table_name, rls_enabled, rls_forced })),
        table_grants: state.table_grants,
        routine_grants: state.routine_grants,
      }) === JSON.stringify({
        image_tables: baselineState.image_tables.map(
          ({ table_name, rls_enabled, rls_forced }) =>
            ({ table_name, rls_enabled, rls_forced })),
        table_grants: baselineState.table_grants,
        routine_grants: baselineState.routine_grants,
      }), state };
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end();
  }
}

async function proveStaleNullCasRejected(connectionString, plan) {
  const client = new Client(clientOptions(connectionString,
    'mtg-sealed-image-pointer-stale-cas-proof-v1'));
  await client.connect();
  let sqlstate = null;
  try {
    await client.query('begin transaction isolation level repeatable read');
    try {
      await rows(client, `select * from
        public.sealed_product_set_active_image_release_v1(
          $1::uuid,$2::uuid,$3::uuid)`, [plan.target_image_release_id,
      null, plan.changed_by]);
    } catch (error) {
      sqlstate = error.code ?? null;
    }
    await client.query('rollback');
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end();
  }
  const readbackClient = new Client(clientOptions(connectionString,
    'mtg-sealed-image-pointer-stale-cas-readback-v1'));
  await readbackClient.connect();
  try {
    await readbackClient.query('set default_transaction_read_only=on');
    const pointer = await pointerRow(readbackClient);
    return { rejected: sqlstate === '40001', sqlstate,
      pointer_unchanged: pointer?.image_release_id ===
        plan.target_image_release_id, pointer };
  } finally {
    await readbackClient.end();
  }
}

async function runApply(connectionString, bundle, preflight, plan) {
  const client = new Client(clientOptions(connectionString,
    'mtg-sealed-image-pointer-durable-apply-v1'));
  await client.connect();
  let committed = false;
  try {
    await client.query('begin transaction isolation level repeatable read');
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='180s'");
    await client.query("set local idle_in_transaction_session_timeout='60s'");
    await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',
      ['mtg_sealed_image_pointer_durable_apply_v1']);
    const before = await captureAppliedImageState(client, bundle);
    const transactionPreflight = evaluateAppliedPreflight(before, bundle);
    if (!transactionPreflight.valid) {
      throw new Error(`Transaction preflight failed: ` +
        transactionPreflight.findings.join(','));
    }
    await rows(client, `select * from
      public.sealed_product_set_active_image_release_v1(
        $1::uuid,$2::uuid,$3::uuid)`, [plan.target_image_release_id,
    plan.expected_current_image_release_id, plan.changed_by]);
    const pointer = await pointerRow(client);
    const binding = await releasePriceBinding(client, plan);
    const structural = await candidateStructuralEligibility(client,
      plan.selected_signing_candidate);
    const signing = await visibilityAndSigning(client,
      plan.selected_signing_candidate);
    const attribution = await writeAttribution(client);
    const proof = { plan, preflight,
      transaction_local_preflight: transactionPreflight,
      transaction: { started: true, committed: false, rolled_back: false },
      transaction_pointer_readback: pointer,
      release_price_binding_valid: binding,
      candidate_structural_eligibility_with_pointer: structural,
      visibility: { catalog_visible: signing.catalog_visible,
        sealed_visible: signing.sealed_visible },
      signing_authorized_after_pointer: signing.signing_authorized,
      rpc_v3_deployed: before.rpc_v3_deployed,
      write_attribution: attribution };
    const validation = evaluateMtgSealedImagePointerApplyPrecommitV1(proof);
    if (!validation.valid) {
      throw new Error(`Pointer precommit failed: ${validation.findings.join(',')}`);
    }
    await client.query('commit');
    committed = true;
    proof.transaction.committed = true;
    return { proof, precommit_validation: validation };
  } finally {
    if (!committed) await client.query('rollback').catch(() => {});
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
      sha256: hashMtgSealedImagePointerApplyV1(bytes) };
  }
  await writeJson(path.join(outDir, 'artifact_hashes.json'), {
    hash_algorithm: 'sha256', producer_commit_sha: producerCommitSha,
    artifacts: hashes,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  dotenv.config({ path: args.envFile, override: false, quiet: true });
  const connectionString = databaseUrl();
  const projectRef = supabaseProjectRefFromUrlV1(connectionString);
  if (!connectionString || projectRef !== MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1) {
    throw new Error('Canonical production database URL is required');
  }
  const bundle = await loadBundle(SOURCE_RELEASE_PLAN);
  const pointerPreflight = await readOnlyPreflight(connectionString, bundle,
    'mtg-sealed-image-pointer-apply-preflight-v1');
  const repairState = await readRepairState(connectionString, projectRef,
    'mtg-sealed-image-pointer-repair-authority-v1');
  const plan = buildMtgSealedImagePointerApplyPlanV1({ repository: repo,
    pointerPreflight, repairState,
    sourcePointerCanaryFingerprint: SOURCE_POINTER_CANARY,
    sourceImageReleasePlanFingerprint: SOURCE_RELEASE_PLAN,
    sourceDurableApplyExecutionFingerprint: SOURCE_RELEASE_APPLY });
  const planValidation = validateMtgSealedImagePointerApplyPlanV1(plan);
  if (!planValidation.valid) {
    throw new Error(`Pointer activation plan invalid: ${planValidation.findings.join(',')}`);
  }
  if (args.mode === 'plan') {
    const summary = { status: 'durable_pointer_activation_plan_ready_no_writes',
      repository: repo,
      activation_plan_fingerprint_sha256:
        plan.activation_plan_fingerprint_sha256,
      target_image_release_id: plan.target_image_release_id,
      expected_current_image_release_id: null,
      pointer_count: pointerPreflight.state.authority.current_image_release_id
        == null ? 0 : 1,
      boundaries: plan.boundaries,
      required_approval_message: plan.required_approval_message };
    await writeArtifacts(args.outDir, { 'fresh_pointer_preflight.json':
      pointerPreflight, 'repair_authority_readback.json': repairState,
    'activation_plan.json': plan, 'summary.json': summary,
    'REPORT.md': `# MTG Sealed Image Pointer Activation Plan V1\n\n` +
      `- Status: **READY, NO WRITES**\n` +
      `- Target: \`${plan.target_image_release_id}\`\n` +
      `- Expected pointer: \`null\`\n` +
      `- Visibility changes: \`0\`\n` }, repo.head_sha);
    process.stdout.write(`${JSON.stringify({ ...summary,
      output_directory: args.outDir }, null, 2)}\n`);
    return;
  }
  if (args.expectedPlanFingerprint !== plan.activation_plan_fingerprint_sha256 ||
      process.env[MTG_SEALED_IMAGE_POINTER_APPLY_APPROVAL_ENV_V1] !==
        plan.guard_token) {
    throw new Error('Exact pointer activation fingerprint and authority are required');
  }
  const execution = await runApply(connectionString, bundle, pointerPreflight, plan);
  const independent = await captureDurableReadback(connectionString, bundle,
    plan, pointerPreflight.state);
  const staleCas = await proveStaleNullCasRejected(connectionString, plan);
  const finalProof = { plan, committed: true,
    precommit_validation: execution.precommit_validation,
    independent_readback: independent,
    stale_null_compare_and_swap: staleCas };
  const validation = evaluateMtgSealedImagePointerApplyReadbackV1(finalProof);
  const summary = { status: validation.valid
    ? 'mtg_sealed_image_pointer_activated_and_read_back'
    : 'mtg_sealed_image_pointer_activation_readback_failed', repository: repo,
  activation_plan_fingerprint_sha256: plan.activation_plan_fingerprint_sha256,
  target_image_release_id: plan.target_image_release_id,
  transaction_committed: true,
  pointer_readback_exact: independent.pointer?.image_release_id ===
    plan.target_image_release_id,
  signing_remains_denied_while_hidden: independent.signing_authorized === false,
  stale_null_cas_rejected: staleCas.rejected,
  validation, boundaries: plan.boundaries,
  exact_next_gate: validation.valid
    ? 'apply and prove the separately reviewed RPC V3 migration candidate'
    : 'stop before RPC, signer, client, visibility, or scheduler work' };
  await writeArtifacts(args.outDir, { 'activation_plan.json': plan,
    'fresh_pointer_preflight.json': pointerPreflight,
    'repair_authority_readback.json': repairState,
    'transaction_proof.json': execution,
    'independent_readback.json': independent,
    'stale_cas_proof.json': staleCas, 'summary.json': summary,
    'REPORT.md': `# MTG Sealed Image Pointer Durable Apply V1\n\n` +
      `- Status: **${validation.valid ? 'PASS' : 'FAIL'}**\n` +
      `- Pointer: \`${plan.target_image_release_id}\`\n` +
      `- Signing while hidden: \`${independent.signing_authorized}\`\n` +
      `- Stale null CAS rejected: \`${staleCas.rejected}\`\n` }, repo.head_sha);
  process.stdout.write(`${JSON.stringify({ ...summary,
    output_directory: args.outDir }, null, 2)}\n`);
  if (!validation.valid) throw new Error(validation.findings.join(','));
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { captureDurableReadback, parseArgs, proveStaleNullCasRejected,
  runApply };
