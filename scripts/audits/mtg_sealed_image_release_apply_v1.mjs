import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  buildMtgSealedImageReleaseExecutionPlanV1,
  evaluateMtgSealedImageReleaseDurableReadbackV1,
  evaluateMtgSealedImageReleasePrecommitV1,
  hashMtgSealedImageReleaseApplyV1,
  MTG_SEALED_IMAGE_RELEASE_APPLY_APPROVAL_ENV_V1,
  validateMtgSealedImageReleaseExecutionPlanV1,
} from '../../backend/pricing/mtg_sealed_image_release_apply_v1.mjs';
import {
  MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
  supabaseProjectRefFromUrlV1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';
import {
  captureState,
  evaluatePreflight,
  exactReadback,
  insertDataset,
  loadBundle,
  readOnlyPreflight,
  writeAttribution,
} from './mtg_sealed_image_release_rollback_canary_v1.mjs';
import { pgSslConfig } from
  './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const DEFAULT_OUT = path.join(ROOT, '.tmp', 'mtg-sealed-image-release-apply-v1');

function parseArgs(argv) {
  const args = { apply: false, planOnly: false, expectedHeadSha: '',
    expectedPlanFingerprint: '', expectedExecutionFingerprint: '',
    envFile: DEFAULT_ENV_FILE, outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument === '--apply') args.apply = true;
    else if (argument === '--plan-only') args.planOnly = true;
    else if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith('--expected-plan-fingerprint=')) {
      args.expectedPlanFingerprint = argument.slice(28).trim().toLowerCase();
    } else if (argument.startsWith('--expected-execution-fingerprint=')) {
      args.expectedExecutionFingerprint = argument.slice(33).trim().toLowerCase();
    } else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (args.apply === args.planOnly) {
    throw new Error('Choose exactly one of --apply or --plan-only');
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha) ||
      !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint)) {
    throw new Error('Exact head SHA and source plan fingerprint are required');
  }
  if (args.apply && !/^[0-9a-f]{64}$/.test(args.expectedExecutionFingerprint)) {
    throw new Error('Exact durable execution fingerprint is required for apply');
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
    throw new Error('Repository is not the exact clean durable-apply producer');
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

async function rows(client, sql, values = []) {
  return (await client.query(sql, values)).rows;
}

async function exclusionReadback(client, bundle) {
  return Number((await rows(client, `select count(*)::integer as count
    from public.sealed_product_image_evidence evidence
    where evidence.source_plan_fingerprint=$1
      and evidence.coverage_fingerprint=$2
      and evidence.classification not in ('exact_image_ready',
        'shared_bytes_exact_variant')
      and not exists (select 1
        from public.sealed_product_variant_image_assertions assertion
        where assertion.image_evidence_id=evidence.id)`, [
    bundle.plan.source_plan_fingerprint_sha256,
    bundle.plan.source_coverage_fingerprint_sha256,
  ]))[0].count);
}

async function payloadReadback(client, bundle) {
  const release = bundle.payload.releases[0];
  const readback = {
    evidence: await exactReadback(client, 'evidence', bundle.payload.evidence),
    objects: await exactReadback(client, 'objects', bundle.payload.objects),
    assertions: await exactReadback(client, 'assertions', bundle.payload.assertions),
    releases: await exactReadback(client, 'releases', bundle.payload.releases, true),
    release_members: await exactReadback(client, 'release_members',
      bundle.payload.release_members),
  };
  const releaseState = (await rows(client, `select release_state
    from public.sealed_product_image_releases where id=$1::uuid`,
  [release.id]))[0]?.release_state ?? null;
  const databaseManifest = (await rows(client, `select
    public.sealed_product_image_release_manifest_fingerprint_v1($1::uuid)
      as fingerprint`, [release.id]))[0]?.fingerprint ?? null;
  const imagePointerWriteCount = Number((await rows(client, `select count(*)::integer
    from public.sealed_product_image_release_pointer where game_key='mtg'`))[0].count);
  return { readback, release_state: releaseState,
    database_manifest_fingerprint: databaseManifest,
    planned_manifest_fingerprint: release.manifest_fingerprint,
    image_pointer_write_count: imagePointerWriteCount,
    excluded_evidence_without_assertion_count:
      await exclusionReadback(client, bundle) };
}

function comparableProtectedState(state) {
  return {
    authority: state.authority,
    table_security: state.image_tables.map(
      ({ table_name, rls_enabled, rls_forced }) =>
        ({ table_name, rls_enabled, rls_forced })),
    table_grants: state.table_grants,
    routine_grants: state.routine_grants,
    lineage: state.lineage,
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function runDurableApply(connectionString, bundle, preflight) {
  const client = new Client(clientOptions(connectionString,
    'mtg-sealed-image-release-durable-apply-v1'));
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query('begin transaction isolation level repeatable read');
    transactionOpen = true;
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
    const inside = await payloadReadback(client, bundle);
    const proof = { preflight, transaction_local_preflight: transactionPreflight,
      transaction: { started: true, committed: false, rolled_back: false },
      transaction_readback: inside.readback,
      database_manifest_fingerprint: inside.database_manifest_fingerprint,
      planned_manifest_fingerprint: inside.planned_manifest_fingerprint,
      release_state: freeze.release_state,
      excluded_evidence_without_assertion_count:
        inside.excluded_evidence_without_assertion_count,
      transaction_image_pointer_count: inside.image_pointer_write_count,
      write_attribution: await writeAttribution(client) };
    const precommitValidation = evaluateMtgSealedImageReleasePrecommitV1(proof);
    if (!precommitValidation.valid) {
      throw new Error(`Inside-transaction readback failed: ` +
        precommitValidation.findings.join(','));
    }
    await client.query('commit');
    transactionOpen = false;
    return { ...proof, transaction: { started: true, committed: true,
      rolled_back: false }, precommit_validation: precommitValidation };
  } finally {
    if (transactionOpen) await client.query('rollback').catch(() => {});
    await client.end();
  }
}

async function independentPostApplyReadback(connectionString, bundle,
  preflight, precommitValidation) {
  const client = new Client(clientOptions(connectionString,
    'mtg-sealed-image-release-post-apply-v1'));
  await client.connect();
  try {
    await client.query('set default_transaction_read_only=on');
    await client.query('begin transaction isolation level repeatable read read only');
    const transactionReadOnly = (await client.query('show transaction_read_only'))
      .rows[0].transaction_read_only === 'on';
    const state = await captureState(client, bundle);
    const payload = await payloadReadback(client, bundle);
    await client.query('rollback');
    const before = comparableProtectedState(preflight.state);
    const after = comparableProtectedState(state);
    const exactRows = Object.values(payload.readback).every((row) => row.exact);
    return { committed: true, precommit_validation: precommitValidation,
      transaction_read_only: transactionReadOnly, readback: payload.readback,
      release_state: payload.release_state,
      database_manifest_fingerprint: payload.database_manifest_fingerprint,
      planned_manifest_fingerprint: payload.planned_manifest_fingerprint,
      image_pointer_write_count: payload.image_pointer_write_count,
      excluded_evidence_without_assertion_count:
        payload.excluded_evidence_without_assertion_count,
      protected_boundaries_unchanged: sameJson(before, after),
      security_boundary_unchanged: sameJson({
        table_security: before.table_security,
        table_grants: before.table_grants,
        routine_grants: before.routine_grants,
      }, {
        table_security: after.table_security,
        table_grants: after.table_grants,
        routine_grants: after.routine_grants,
      }),
      zero_row_idempotency_ready: exactRows &&
        payload.release_state === 'frozen' &&
        payload.database_manifest_fingerprint ===
          payload.planned_manifest_fingerprint,
      idempotency_decision: exactRows
        ? 'complete_identical_frozen_release_requires_zero_additional_rows'
        : 'payload_drift_hard_stop',
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
    'mtg-sealed-image-release-durable-preflight-v1');
  if (!preflight.valid || !preflight.transaction_read_only) {
    throw new Error(`Fresh production preflight failed: ${preflight.findings.join(',')}`);
  }
  const plan = buildMtgSealedImageReleaseExecutionPlanV1({
    repository: repo,
    sourcePlan: bundle.plan,
    sourceArtifactManifestSha256: bundle.sourceArtifacts.manifest_sha256,
    sourceArtifactHashes: bundle.sourceArtifacts.manifest.artifacts,
    productionPreflight: preflight,
    mode: 'durable_apply',
  });
  const planValidation = validateMtgSealedImageReleaseExecutionPlanV1(plan);
  if (!planValidation.valid) {
    throw new Error(`Durable plan invalid: ${planValidation.findings.join(',')}`);
  }
  await fs.mkdir(args.outDir, { recursive: true });
  await writeJson(path.join(args.outDir, 'run_plan.json'), plan);
  await writeJson(path.join(args.outDir, 'fresh_production_preflight.json'), preflight);
  if (args.planOnly) {
    const summary = { status: 'durable_apply_plan_ready_zero_writes',
      repository: repo, execution_fingerprint_sha256:
        plan.execution_fingerprint_sha256,
      source_image_release_plan_fingerprint_sha256:
        bundle.plan.plan_fingerprint_sha256,
      expected_counts: plan.expected_counts, database_writes: 0,
      exact_next_gate: 'provide the exact required durable apply authority' };
    await writeArtifacts(args.outDir, { 'run_plan.json': plan,
      'fresh_production_preflight.json': preflight,
      'summary.json': summary,
      'REPORT.md': `# MTG Sealed Image Release Durable Apply Plan\n\n` +
        `- Status: **READY, NOT APPLIED**\n` +
        `- Producer: \`${repo.head_sha}\`\n` +
        `- Execution fingerprint: \`${plan.execution_fingerprint_sha256}\`\n` +
        `- Planned inserts: \`8,622\`\n` +
        `- Pointer activation: \`not included\`\n` +
        `- Database writes: \`0\`\n`,
    }, repo.head_sha);
    process.stdout.write(`${JSON.stringify({ ...summary,
      output_directory: args.outDir,
      required_durable_apply_authority:
        plan.required_durable_apply_authority }, null, 2)}\n`);
    return;
  }
  if (plan.execution_fingerprint_sha256 !== args.expectedExecutionFingerprint) {
    throw new Error('Durable execution fingerprint authority mismatch');
  }
  if (process.env[MTG_SEALED_IMAGE_RELEASE_APPLY_APPROVAL_ENV_V1] !==
      plan.required_durable_apply_authority) {
    throw new Error('Exact durable apply authority is missing');
  }
  const transactionProof = await runDurableApply(connectionString, bundle, preflight);
  const postApply = await independentPostApplyReadback(connectionString, bundle,
    preflight, transactionProof.precommit_validation);
  const validation = evaluateMtgSealedImageReleaseDurableReadbackV1(postApply);
  const summary = { status: validation.valid
    ? 'durable_image_evidence_release_applied_and_verified'
    : 'durable_apply_committed_but_post_apply_verification_failed',
  repository: repo, execution_fingerprint_sha256:
    plan.execution_fingerprint_sha256,
  source_image_release_plan_fingerprint_sha256:
    bundle.plan.plan_fingerprint_sha256,
  expected_counts: plan.expected_counts,
  committed: true,
  exact_post_apply_readback:
    Object.values(postApply.readback).every((row) => row.exact),
  database_manifest_matches_plan:
    postApply.database_manifest_fingerprint === postApply.planned_manifest_fingerprint,
  zero_row_idempotency_ready: postApply.zero_row_idempotency_ready,
  image_pointer_write_count: postApply.image_pointer_write_count,
  validation,
  exact_next_gate: validation.valid
    ? 'run a rollback-only image pointer compare-and-swap canary'
    : 'stop; preserve committed release inactive and investigate readback' };
  const report = `# MTG Sealed Image Release Durable Apply V1\n\n` +
    `- Status: **${validation.valid ? 'PASS' : 'COMMITTED, VERIFICATION FAILED'}**\n` +
    `- Producer: \`${repo.head_sha}\`\n` +
    `- Exact inserts: \`8,622\`\n` +
    `- Release state: \`${postApply.release_state}\`\n` +
    `- Manifest matches: \`${summary.database_manifest_matches_plan}\`\n` +
    `- Zero-row idempotency ready: \`${postApply.zero_row_idempotency_ready}\`\n` +
    `- Image pointer writes: \`${postApply.image_pointer_write_count}\`\n`;
  await writeArtifacts(args.outDir, { 'run_plan.json': plan,
    'fresh_production_preflight.json': preflight,
    'transaction_proof.json': transactionProof,
    'independent_post_apply_readback.json': postApply,
    'summary.json': summary, 'REPORT.md': report }, repo.head_sha);
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

export { independentPostApplyReadback, parseArgs, payloadReadback,
  runDurableApply };
