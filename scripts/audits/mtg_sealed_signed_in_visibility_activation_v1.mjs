import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import {
  buildMtgSealedVisibilityActivationCandidateV1,
  buildMtgSealedVisibilityActivationPlanV1,
  evaluateMtgSealedVisibilityActivationReadbackV1,
  expectedMtgSealedActiveEvidenceV1,
  hashMtgSealedVisibilityActivationV1,
  MTG_SEALED_SIGNED_IN_VISIBILITY_ACTIVATION_VERSION_V1,
  MTG_SEALED_SIGNED_IN_VISIBILITY_APPROVAL_ENV_V1,
  MTG_SEALED_SIGNED_IN_VISIBILITY_RELEASE_VERSION_V1,
  MTG_SEALED_SIGNED_IN_VISIBILITY_ROLLBACK_ENV_V1,
  validateMtgSealedVisibilityActivationPlanV1,
  validateMtgSealedVisibilityRollbackProofV1,
} from '../../backend/pricing/mtg_sealed_signed_in_visibility_activation_v1.mjs';
import {
  hashMtgSealedCanaryV1,
  MTG_SEALED_CANARY_OBJECT_PATH_V1,
  MTG_SEALED_CANARY_OBJECT_SHA256_V1,
  MTG_SEALED_CANARY_PROJECT_REF_V1,
  stableMtgSealedCanaryV1,
} from '../../backend/pricing/mtg_sealed_signed_in_visibility_canary_v1.mjs';
import {
  capturePreflight,
  createAuthFixture,
  deleteAuthFixture,
  downloadSignedImage,
  rpcProbe,
  serviceClient,
  signerProbe,
  verifyAuthResidue,
} from './mtg_sealed_signed_in_visibility_canary_v1.mjs';
import { pgSslConfig } from
  './japanese_master_index_v4/read_only_guard_v1.mjs';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const pg = require('pg');
const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXPECTED_BRANCH = 'agent/mtg-sealed-image-migration-promotion-v1';
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const DEFAULT_OUT = path.join(ROOT, '.tmp',
  'mtg-sealed-signed-in-visibility-activation-v1');

function parseArgs(argv) {
  const args = { mode: 'plan', expectedHeadSha: '', expectedPlanFingerprint: '',
    expectedRollbackFingerprint: '', envFile: DEFAULT_ENV_FILE,
    outDir: DEFAULT_OUT, authorityPlan: '' };
  for (const value of argv) {
    if (value === '--plan') args.mode = 'plan';
    else if (value === '--apply') args.mode = 'apply';
    else if (value === '--rollback') args.mode = 'rollback';
    else if (value.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = value.slice('--expected-head-sha='.length)
        .trim().toLowerCase();
    } else if (value.startsWith('--expected-plan-fingerprint=')) {
      args.expectedPlanFingerprint = value
        .slice('--expected-plan-fingerprint='.length).trim().toLowerCase();
    } else if (value.startsWith('--expected-rollback-fingerprint=')) {
      args.expectedRollbackFingerprint = value
        .slice('--expected-rollback-fingerprint='.length).trim().toLowerCase();
    } else if (value.startsWith('--env-file=')) {
      args.envFile = path.resolve(value.slice('--env-file='.length));
    } else if (value.startsWith('--out-dir=')) {
      args.outDir = path.resolve(value.slice('--out-dir='.length));
    } else if (value.startsWith('--authority-plan=')) {
      args.authorityPlan = path.resolve(value.slice('--authority-plan='.length));
    } else throw new Error(`Unsupported argument: ${value}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha=<40-character SHA> is required');
  }
  if (args.mode === 'apply' &&
      !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint)) {
    throw new Error('Apply requires exact --expected-plan-fingerprint');
  }
  if (args.mode === 'rollback' &&
      (!/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint) ||
       !/^[0-9a-f]{64}$/.test(args.expectedRollbackFingerprint) ||
       !args.authorityPlan)) {
    throw new Error('Rollback requires the exact plan, activation fingerprint, and rollback fingerprint');
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
      git('status', '--porcelain', '--untracked-files=no') === '' };
  if (state.branch !== EXPECTED_BRANCH || state.head_sha !== args.expectedHeadSha ||
      !state.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean activation producer');
  }
  return state;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? '';
}

function projectRef(connectionString) {
  for (const value of [process.env.SUPABASE_URL ?? '', connectionString]) {
    const match = value.match(/(?:https?:\/\/|db\.|@)([a-z0-9]{20})\./i);
    if (match) return match[1].toLowerCase();
  }
  return '';
}

function clientOptions(connectionString, applicationName) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 180_000,
    statement_timeout: 180_000, application_name: applicationName };
}

async function withClient(connectionString, applicationName, callback) {
  const client = new Client(clientOptions(connectionString, applicationName));
  await client.connect();
  try { return await callback(client); } finally { await client.end(); }
}

async function one(client, sql, values = []) {
  return (await client.query(sql, values)).rows[0] ?? null;
}

async function captureControl(client) {
  return one(client, `select game_key,release_status,release_version,evidence,
    activated_at::text,activated_by,updated_at::text
    from public.sealed_product_game_release_controls where game_key='mtg'`);
}

function withoutControl(protectedState) {
  const clone = structuredClone(protectedState);
  delete clone.mtg_sealed_control;
  return clone;
}

async function collectVisibleRows(client) {
  const rows = [];
  for (let offset = 0; offset < 100_000; offset += 100) {
    const page = (await client.query(`select variant_id::text,
      qualification_id::text,evidence_fingerprint,image_content_sha256,
      image_assertion_fingerprint,image_member_fingerprint
      from public.get_active_sealed_product_pricing_v3('mtg',null,100,$1)`,
    [offset])).rows;
    rows.push(...page);
    if (page.length < 100) break;
  }
  if (rows.length >= 100_000) throw new Error('Visible row pagination exceeded');
  return { rows: rows.length,
    fingerprint_sha256: hashMtgSealedVisibilityActivationV1(rows) };
}

async function casActivate(client, baseline, evidence) {
  const result = await client.query(`update
    public.sealed_product_game_release_controls set
      release_status='signed_in',release_version=$1,evidence=$2::jsonb,
      activated_at=clock_timestamp(),activated_by=$3,
      updated_at=clock_timestamp()
    where game_key='mtg' and release_status=$4 and release_version=$5
      and evidence=$6::jsonb
      and activated_at is not distinct from $7::timestamptz
      and activated_by is not distinct from $8
      and updated_at=$9::timestamptz
    returning game_key,release_status,release_version,evidence,
      activated_at::text,activated_by,updated_at::text`, [
    MTG_SEALED_SIGNED_IN_VISIBILITY_RELEASE_VERSION_V1,
    JSON.stringify(evidence),
    MTG_SEALED_SIGNED_IN_VISIBILITY_ACTIVATION_VERSION_V1,
    baseline.release_status, baseline.release_version,
    JSON.stringify(baseline.evidence), baseline.activated_at,
    baseline.activated_by, baseline.updated_at,
  ]);
  return { rowCount: result.rowCount, row: result.rows[0] ?? null };
}

async function runRollbackTransaction(connectionString, candidatePlan) {
  return withClient(connectionString,
    'mtg-sealed-visibility-activation-rollback-proof-v1', async (client) => {
      let rolledBack = false;
      try {
        await client.query('begin transaction isolation level repeatable read');
        await client.query("set local lock_timeout='5s'");
        await client.query("set local idle_in_transaction_session_timeout='60s'");
        await client.query(`select pg_advisory_xact_lock(hashtextextended(
          'mtg_sealed_signed_in_visibility_activation_v1',0))`);
        const current = await captureControl(client);
        if (stableMtgSealedCanaryV1(current) !== stableMtgSealedCanaryV1(
          candidatePlan.baseline_release_control)) {
          throw new Error('Release control changed after frozen preflight');
        }
        const evidence = expectedMtgSealedActiveEvidenceV1(
          candidatePlan.candidate_plan_fingerprint_sha256,
          candidatePlan.baseline_release_control);
        const activation = await casActivate(client,
          candidatePlan.baseline_release_control, evidence);
        if (activation.rowCount !== 1) {
          throw new Error('Rollback proof did not update exactly one row');
        }
        await client.query('set local role authenticated');
        await client.query(
          `select set_config('request.jwt.claim.role','authenticated',true)`);
        const visible = await collectVisibleRows(client);
        const signing = await one(client,
          `select public.mtg_sealed_image_object_signing_authorized_v1($1,$2)
            as authorized`, [candidatePlan.selected_candidate.storage_bucket,
          candidatePlan.selected_candidate.object_path]);
        await client.query('reset role');
        const stale = await casActivate(client,
          candidatePlan.baseline_release_control, evidence);
        const attribution = (await client.query(`select relname,
          (n_tup_ins+n_tup_upd+n_tup_del)::integer as writes
          from pg_stat_xact_user_tables
          where schemaname='public' and
            (n_tup_ins+n_tup_upd+n_tup_del)>0
          order by relname`)).rows;
        await client.query('rollback');
        rolledBack = true;
        return { transaction: { started: true, committed: false,
          rolled_back: true, updated_rows: activation.rowCount,
          release_status: activation.row.release_status,
          authenticated_rpc_rows: visible.rows,
          authenticated_rpc_fingerprint: visible.fingerprint_sha256,
          signing_authorized: signing.authorized === true,
          stale_cas_updated_rows: stale.rowCount,
          write_attribution: attribution } };
      } finally {
        if (!rolledBack) await client.query('rollback').catch(() => {});
      }
    });
}

async function proveRollback(connectionString, repositoryState, preflight) {
  const candidatePlan = buildMtgSealedVisibilityActivationCandidateV1({
    repository: repositoryState, preflight });
  const transaction = await runRollbackTransaction(connectionString,
    candidatePlan);
  const post = await capturePreflight(connectionString,
    MTG_SEALED_CANARY_PROJECT_REF_V1);
  const proof = { ...transaction, post_rollback: {
    release_control_exact: stableMtgSealedCanaryV1(post.release_control) ===
      stableMtgSealedCanaryV1(preflight.release_control),
    protected_state_exact: stableMtgSealedCanaryV1(post.protected_state) ===
      stableMtgSealedCanaryV1(preflight.protected_state),
    hidden_rpc_rows: post.hidden_rpc_rows,
    hidden_signing_authorized: post.hidden_signing_authorized,
  } };
  const validation = validateMtgSealedVisibilityRollbackProofV1(proof);
  return { candidatePlan, proof, post, validation };
}

async function runDurableActivation(connectionString, plan) {
  return withClient(connectionString,
    'mtg-sealed-visibility-durable-activation-v1', async (client) => {
      let committed = false;
      try {
        await client.query('begin transaction isolation level repeatable read');
        await client.query("set local lock_timeout='5s'");
        await client.query("set local idle_in_transaction_session_timeout='60s'");
        await client.query(`select pg_advisory_xact_lock(hashtextextended(
          'mtg_sealed_signed_in_visibility_activation_v1',0))`);
        const current = await captureControl(client);
        if (stableMtgSealedCanaryV1(current) !== stableMtgSealedCanaryV1(
          plan.baseline_release_control)) {
          throw new Error('Release control changed after approved plan');
        }
        const activation = await casActivate(client,
          plan.baseline_release_control, plan.active_row_projection.evidence);
        if (activation.rowCount !== 1) {
          throw new Error('Durable activation did not update exactly one row');
        }
        await client.query('set local role authenticated');
        await client.query(
          `select set_config('request.jwt.claim.role','authenticated',true)`);
        const visible = await collectVisibleRows(client);
        await client.query('reset role');
        if (visible.rows !== plan.rollback_proof.authenticated_rpc_rows ||
            visible.fingerprint_sha256 !==
              plan.rollback_proof.authenticated_rpc_fingerprint) {
          throw new Error('Visible corpus drifted from rollback proof');
        }
        await client.query('commit');
        committed = true;
        return { committed: true, updated_rows: activation.rowCount,
          control: activation.row, visible_corpus: visible };
      } finally {
        if (!committed) await client.query('rollback').catch(() => {});
      }
    });
}

function activeProjectionMatches(control, plan) {
  return control?.game_key === 'mtg' && control.release_status === 'signed_in' &&
    control.release_version === plan.active_row_projection.release_version &&
    control.activated_by === plan.active_row_projection.activated_by &&
    control.activated_at != null && control.updated_at != null &&
    stableMtgSealedCanaryV1(control.evidence) ===
      stableMtgSealedCanaryV1(plan.active_row_projection.evidence);
}

async function restoreBaseline(connectionString, plan) {
  return withClient(connectionString,
    'mtg-sealed-visibility-exact-rollback-v1', async (client) => {
      let committed = false;
      try {
        await client.query('begin transaction isolation level repeatable read');
        await client.query("set local lock_timeout='5s'");
        await client.query(`select pg_advisory_xact_lock(hashtextextended(
          'mtg_sealed_signed_in_visibility_activation_v1',0))`);
        const current = await captureControl(client);
        if (stableMtgSealedCanaryV1(current) === stableMtgSealedCanaryV1(
          plan.baseline_release_control)) {
          await client.query('rollback');
          return { restored: true, already_baseline: true, updated_rows: 0 };
        }
        if (!activeProjectionMatches(current, plan)) {
          throw new Error('Refusing to overwrite release control not owned by this activation');
        }
        const baseline = plan.baseline_release_control;
        const result = await client.query(`update
          public.sealed_product_game_release_controls set
            release_status=$1,release_version=$2,evidence=$3::jsonb,
            activated_at=$4::timestamptz,activated_by=$5,
            updated_at=$6::timestamptz
          where game_key='mtg' and release_status='signed_in'
            and release_version=$7 and evidence=$8::jsonb
            and activated_by=$9
          returning game_key`, [baseline.release_status,
          baseline.release_version, JSON.stringify(baseline.evidence),
          baseline.activated_at, baseline.activated_by, baseline.updated_at,
          plan.active_row_projection.release_version,
          JSON.stringify(plan.active_row_projection.evidence),
          plan.active_row_projection.activated_by]);
        if (result.rowCount !== 1) {
          throw new Error('Exact rollback did not restore exactly one row');
        }
        await client.query('commit');
        committed = true;
        return { restored: true, already_baseline: false, updated_rows: 1 };
      } finally {
        if (!committed) await client.query('rollback').catch(() => {});
      }
    });
}

async function liveReadback(connectionString, plan, transaction,
  baselineProtectedState) {
  const service = serviceClient();
  let fixture = null;
  let error = null;
  const result = { release_control: transaction.control,
    authenticated: {}, anonymous: {}, clients: {}, auth_user_absent: false,
    auth_reference_rows: null, protected_state_exact_except_control: false };
  try {
    fixture = await createAuthFixture(service);
    const authenticatedRpc = await rpcProbe(fixture.accessToken,
      plan.selected_candidate.canonical_name);
    const authenticatedSigner = await signerProbe(fixture.accessToken);
    const signedImage = await downloadSignedImage(authenticatedSigner.signedUrl);
    const anonymousRpc = await rpcProbe('',
      plan.selected_candidate.canonical_name);
    const anonymousSigner = await signerProbe();
    result.authenticated = {
      rpc_status: authenticatedRpc.artifact.status,
      rpc_rows: authenticatedRpc.artifact.row_count,
      selected_candidate_returned: authenticatedRpc.internal_rows.some(
        (row) => row.image_object_path === MTG_SEALED_CANARY_OBJECT_PATH_V1),
      signer_status: authenticatedSigner.artifact.status,
      signed_image_status: signedImage.status,
      signed_image_sha256: signedImage.sha256,
    };
    result.anonymous = { rpc_status: anonymousRpc.artifact.status,
      rpc_rows: anonymousRpc.artifact.row_count,
      signer_status: anonymousSigner.artifact.status };
  } catch (caught) {
    error = caught;
  } finally {
    try { await deleteAuthFixture(service, fixture); } catch (caught) {
      error ??= caught;
    }
  }
  const post = await capturePreflight(connectionString,
    MTG_SEALED_CANARY_PROJECT_REF_V1);
  const residue = fixture?.userId
    ? await verifyAuthResidue(connectionString, fixture.userId)
    : { auth_user_absent: true, auth_reference_rows: 0 };
  result.release_control = post.release_control;
  result.clients = post.clients;
  result.auth_user_absent = residue.auth_user_absent;
  result.auth_reference_rows = residue.auth_reference_rows;
  result.protected_state_exact_except_control =
    stableMtgSealedCanaryV1(withoutControl(post.protected_state)) ===
    stableMtgSealedCanaryV1(withoutControl(baselineProtectedState));
  result.execution_error = error ? String(error?.message ?? error) : null;
  return result;
}

async function writeJson(file, value) {
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await fs.writeFile(file, body);
  return body;
}

async function writeArtifacts(outDir, files, producerSha) {
  await fs.mkdir(outDir, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const body = name.endsWith('.json')
      ? await writeJson(path.join(outDir, name), value)
      : Buffer.from(String(value));
    if (!name.endsWith('.json')) await fs.writeFile(path.join(outDir, name), body);
    hashes[name] = { bytes: body.length,
      sha256: hashMtgSealedCanaryV1(body) };
  }
  await writeJson(path.join(outDir, 'artifact_hashes.json'), {
    hash_algorithm: 'sha256', producer_commit_sha: producerSha,
    artifacts: hashes,
  });
}

function approvalMessage(plan) {
  return `I approve the durable MTG sealed signed-in backend visibility ` +
    `activation only from execution commit ${plan.repository.head_sha}, using ` +
    `activation plan fingerprint ${plan.activation_plan_fingerprint_sha256} ` +
    `and rollback plan fingerprint ` +
    `${plan.rollback_plan.rollback_plan_fingerprint_sha256}. This authorizes ` +
    `one exact compare-and-swap update of the MTG sealed release-control row, ` +
    `immediate authenticated and anonymous readback, disposable Auth fixture ` +
    `creation and verified removal, and automatic exact rollback on failed ` +
    `readback. It authorizes no web or Flutter client activation, anonymous ` +
    `visibility, catalog, pricing, pointer, image evidence, Storage, Vault, ` +
    `cross-game, delete, or cleanup operation.`;
}

function report(summary) {
  return `# MTG Sealed Signed-In Visibility Activation V1\n\n` +
    `- Status: **${summary.status}**\n` +
    `- Producer: \`${summary.repository.head_sha}\`\n` +
    `- Activation plan: \`${summary.activation_plan_fingerprint_sha256}\`\n` +
    `- Rollback plan: \`${summary.rollback_plan_fingerprint_sha256}\`\n` +
    `- Rollback-only RPC rows: \`${summary.rollback_proof_rpc_rows}\`\n` +
    `- Durable database writes: \`${summary.durable_database_writes}\`\n` +
    `- Client activations: \`0\`\n` +
    `- Anonymous visibility: \`false\`\n`;
}

async function preparePlan(connectionString, repo) {
  const preflight = await capturePreflight(connectionString,
    MTG_SEALED_CANARY_PROJECT_REF_V1);
  const rollback = await proveRollback(connectionString, repo, preflight);
  if (!rollback.validation.valid) {
    throw new Error(`Rollback proof failed: ${rollback.validation.findings.map(
      (entry) => entry.code).join(',')}`);
  }
  const plan = buildMtgSealedVisibilityActivationPlanV1({
    candidatePlan: rollback.candidatePlan,
    rollbackProof: rollback.proof,
  });
  const validation = validateMtgSealedVisibilityActivationPlanV1(plan);
  if (!validation.valid) {
    throw new Error(`Activation plan failed: ${validation.findings.map(
      (entry) => entry.code).join(',')}`);
  }
  return { preflight, rollback, plan, validation };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  dotenv.config({ path: args.envFile, override: false, quiet: true });
  const connectionString = databaseUrl();
  if (!connectionString || projectRef(connectionString) !==
      MTG_SEALED_CANARY_PROJECT_REF_V1) {
    throw new Error('Canonical production database URL is required');
  }

  if (args.mode === 'rollback') {
    const plan = JSON.parse(await fs.readFile(args.authorityPlan, 'utf8'));
    const rollbackFingerprint =
      plan?.rollback_plan?.rollback_plan_fingerprint_sha256;
    const guard = hashMtgSealedVisibilityActivationV1({
      action: 'rollback_mtg_sealed_signed_in_visibility',
      rollback_plan_fingerprint_sha256: rollbackFingerprint,
    });
    if (plan.activation_plan_fingerprint_sha256 !==
        args.expectedPlanFingerprint || rollbackFingerprint !==
        args.expectedRollbackFingerprint ||
        process.env[MTG_SEALED_SIGNED_IN_VISIBILITY_ROLLBACK_ENV_V1] !== guard) {
      throw new Error('Exact rollback authority is required');
    }
    const operation = await restoreBaseline(connectionString, plan);
    const post = await capturePreflight(connectionString,
      MTG_SEALED_CANARY_PROJECT_REF_V1);
    const exact = stableMtgSealedCanaryV1(post.release_control) ===
      stableMtgSealedCanaryV1(plan.baseline_release_control);
    const summary = { status: exact ? 'exact_hidden_baseline_restored' :
      'rollback_readback_failed', repository: repo, operation,
    release_control_exact: exact };
    await writeArtifacts(args.outDir, { 'authority_plan.json': plan,
      'rollback_operation.json': operation, 'post_rollback.json': post,
      'summary.json': summary, 'REPORT.md': report({ ...summary,
        activation_plan_fingerprint_sha256:
          plan.activation_plan_fingerprint_sha256,
        rollback_plan_fingerprint_sha256: rollbackFingerprint,
        rollback_proof_rpc_rows: plan.rollback_proof.authenticated_rpc_rows,
        durable_database_writes: operation.updated_rows }) }, repo.head_sha);
    if (!exact) throw new Error('Rollback readback did not match baseline');
    console.log(JSON.stringify({ ...summary, output_directory: args.outDir },
      null, 2));
    return;
  }

  const prepared = await preparePlan(connectionString, repo);
  const summaryBase = { repository: repo,
    activation_plan_fingerprint_sha256:
      prepared.plan.activation_plan_fingerprint_sha256,
    rollback_plan_fingerprint_sha256:
      prepared.plan.rollback_plan.rollback_plan_fingerprint_sha256,
    rollback_proof_rpc_rows:
      prepared.rollback.proof.transaction.authenticated_rpc_rows,
    rollback_proof_rpc_fingerprint:
      prepared.rollback.proof.transaction.authenticated_rpc_fingerprint,
    boundaries: prepared.plan.boundaries };

  if (args.mode === 'plan') {
    const summary = { status: 'durable_visibility_activation_ready_no_writes',
      ...summaryBase, durable_database_writes: 0,
      required_approval_message: approvalMessage(prepared.plan),
      exact_next_gate: 'execute the exact durable backend activation; keep clients disabled' };
    await writeArtifacts(args.outDir, {
      'fresh_production_preflight.json': prepared.preflight,
      'rollback_transaction_proof.json': prepared.rollback.proof,
      'post_rollback_preflight.json': prepared.rollback.post,
      'activation_plan.json': prepared.plan,
      'summary.json': summary,
      'REPORT.md': report(summary),
    }, repo.head_sha);
    console.log(JSON.stringify({ ...summary, output_directory: args.outDir },
      null, 2));
    return;
  }

  if (args.expectedPlanFingerprint !==
      prepared.plan.activation_plan_fingerprint_sha256 ||
      process.env[MTG_SEALED_SIGNED_IN_VISIBILITY_APPROVAL_ENV_V1] !==
        prepared.plan.activation_guard_token) {
    throw new Error('Exact activation fingerprint and authority are required');
  }
  let transaction;
  let readback;
  let validation;
  let automaticRollback = null;
  try {
    transaction = await runDurableActivation(connectionString, prepared.plan);
    readback = await liveReadback(connectionString, prepared.plan, transaction,
      prepared.preflight.protected_state);
    validation = evaluateMtgSealedVisibilityActivationReadbackV1({
      plan: prepared.plan, transaction, readback });
    if (!validation.valid) {
      throw new Error(`Activation readback failed: ${validation.findings.map(
        (entry) => entry.code).join(',')}`);
    }
  } catch (error) {
    if (transaction?.committed) {
      automaticRollback = await restoreBaseline(connectionString, prepared.plan);
    }
    const summary = { status: 'activation_failed_and_rollback_attempted',
      ...summaryBase, durable_database_writes: transaction?.committed ? 1 : 0,
      transaction, readback, validation, automatic_rollback: automaticRollback,
      error: String(error?.message ?? error) };
    await writeArtifacts(args.outDir, {
      'fresh_production_preflight.json': prepared.preflight,
      'activation_plan.json': prepared.plan,
      'transaction.json': transaction ?? null,
      'readback.json': readback ?? null,
      'summary.json': summary,
      'REPORT.md': report(summary),
    }, repo.head_sha);
    throw error;
  }
  const summary = { status: validation.status, ...summaryBase,
    durable_database_writes: 1, transaction, readback, validation,
    exact_next_gate: 'bounded signed-in web and Flutter client rollout' };
  await writeArtifacts(args.outDir, {
    'fresh_production_preflight.json': prepared.preflight,
    'activation_plan.json': prepared.plan,
    'transaction.json': transaction,
    'readback.json': readback,
    'summary.json': summary,
    'REPORT.md': report(summary),
  }, repo.head_sha);
  console.log(JSON.stringify({ ...summary, output_directory: args.outDir },
    null, 2));
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export {
  activeProjectionMatches,
  casActivate,
  collectVisibleRows,
  parseArgs,
  preparePlan,
  proveRollback,
  restoreBaseline,
  runDurableActivation,
  runRollbackTransaction,
};
