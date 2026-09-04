import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as tls from 'node:tls';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import {
  buildMtgSealedImageStorageCanaryExecutionPlanV1,
  hashMtgSealedStorageCanaryV1,
  MTG_SEALED_IMAGE_STORAGE_CANARY_APPROVAL_ENV_V1,
  recoverMtgSealedImageStorageCanaryV1,
  retrieveMtgSealedCanarySourceBytesV1,
  runMtgSealedImageStorageCanaryV1,
  validateMtgSealedImageStorageCanaryExecutionPlanV1,
} from '../../backend/pricing/mtg_sealed_image_storage_canary_v1.mjs';
import { GROOKAI_PRODUCTION_PROJECT_REF } from
  '../../backend/pricing/mtg_sealed_image_coverage_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const DEFAULT_CANARY_PLAN = path.join(ROOT, 'docs', 'audits', 'pricing',
  'mtg_sealed_image_schema_candidate_v1', '2026-09-04_offline',
  'canary_plan.json');

function parseArgs(argv) {
  const args = {
    mode: 'plan',
    expectedHeadSha: '',
    expectedExecutionFingerprint: '',
    envFile: DEFAULT_ENV_FILE,
    canaryPlan: DEFAULT_CANARY_PLAN,
    outDir: path.join(ROOT, '.tmp', 'mtg-sealed-image-storage-canary-v1'),
  };
  for (const argument of argv) {
    if (argument === '--plan') args.mode = 'plan';
    else if (argument === '--apply') args.mode = 'apply';
    else if (argument === '--recover') args.mode = 'recover';
    else if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice('--expected-head-sha='.length)
        .trim().toLowerCase();
    } else if (argument.startsWith('--expected-execution-fingerprint=')) {
      args.expectedExecutionFingerprint = argument
        .slice('--expected-execution-fingerprint='.length).trim().toLowerCase();
    } else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice('--env-file='.length));
    } else if (argument.startsWith('--canary-plan=')) {
      args.canaryPlan = path.resolve(argument.slice('--canary-plan='.length));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice('--out-dir='.length));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha=<40-character SHA> is required');
  }
  if (args.mode !== 'plan' &&
      !/^[0-9a-f]{64}$/.test(args.expectedExecutionFingerprint)) {
    throw new Error(
      'Apply/recover requires --expected-execution-fingerprint=<SHA-256>',
    );
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function assertRepository(args) {
  const local = {
    branch: git('branch', '--show-current') || '(detached)',
    head_sha: git('rev-parse', 'HEAD'),
    tracked_worktree_clean:
      git('status', '--porcelain', '--untracked-files=no') === '',
  };
  if (local.head_sha !== args.expectedHeadSha || !local.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean execution authority');
  }
  return local;
}

function projectRef(urlValue) {
  try {
    const url = new URL(urlValue);
    return url.protocol === 'https:'
      ? url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1] ?? null
      : null;
  } catch {
    return null;
  }
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, 'utf8');
  return body;
}

async function writeManifest(outDir, names) {
  const artifacts = {};
  for (const name of names) {
    const bytes = await fs.readFile(path.join(outDir, name));
    artifacts[name] = {
      bytes: bytes.length,
      sha256: hashMtgSealedStorageCanaryV1(bytes),
    };
  }
  await writeJson(path.join(outDir, 'artifact_hashes.json'), {
    hash_algorithm: 'sha256',
    artifacts,
  });
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function folderAndName(objectPath) {
  const split = objectPath.lastIndexOf('/');
  return { folder: objectPath.slice(0, split), name: objectPath.slice(split + 1) };
}

function storageAdapter(client, bucket) {
  return {
    async objectExists(row) {
      const { folder, name } = folderAndName(row.transient_object_path);
      const { data, error } = await client.storage.from(bucket)
        .list(folder, { limit: 100, search: name });
      if (error) throw new Error(`Storage list failed: ${error.message}`);
      return (data ?? []).some((entry) => entry.name === name);
    },
    async upload(row, buffer) {
      const { error } = await client.storage.from(bucket)
        .upload(row.transient_object_path, buffer, {
          upsert: false,
          contentType: row.expected_image.content_type,
          cacheControl: '0',
        });
      if (error) throw new Error(`Storage upload failed: ${error.message}`);
    },
    async download(row) {
      const { data, error } = await client.storage.from(bucket)
        .download(row.transient_object_path);
      if (error || !data) {
        throw new Error(`Storage download failed: ${error?.message ?? 'no data'}`);
      }
      return {
        buffer: Buffer.from(await data.arrayBuffer()),
        contentType: data.type || row.expected_image.content_type,
      };
    },
    async remove(objectPaths) {
      const { error } = await client.storage.from(bucket).remove(objectPaths);
      if (error) throw new Error(`Storage removal failed: ${error.message}`);
    },
  };
}

async function fetchSourceBytesOnce(row, maximumBytes) {
  let response;
  try {
    response = await fetch(row.source_image_url, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'user-agent': 'Grookai MTG Sealed Storage Canary/1.0',
        accept: 'image/*',
      },
    });
  } catch (error) {
    error.retryable = true;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(
      `${row.source_product_id}:source_http_${response.status}`,
    );
    error.code = `http_${response.status}`;
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }
  const declaredBytes = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredBytes) && declaredBytes > maximumBytes) {
    const error = new Error(`${row.source_product_id}:source_too_large`);
    error.code = 'source_too_large';
    error.retryable = false;
    throw error;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maximumBytes) {
    const error = new Error(`${row.source_product_id}:source_too_large`);
    error.code = 'source_too_large';
    error.retryable = false;
    throw error;
  }
  return { buffer, contentType: response.headers.get('content-type') };
}

async function writePlanArtifacts(args, plan, local) {
  await fs.mkdir(args.outDir, { recursive: true });
  await writeJson(path.join(args.outDir, 'run_plan.json'), {
    generated_at: new Date().toISOString(),
    status: 'ready_not_authorized_or_executed',
    repository: local,
    plan,
  });
  const report = `# MTG Sealed Transient Storage Canary V1\n\n` +
    `- Status: **READY; NOT AUTHORIZED OR EXECUTED**\n` +
    `- Execution commit: \`${local.head_sha}\`\n` +
    `- Objects: \`${plan.selected_object_count}\`\n` +
    `- Execution fingerprint: ` +
    `\`${plan.execution_fingerprint_sha256}\`\n` +
    `- Database and Storage operations: \`0\`\n\n` +
    `## Required Exact Authority\n\n\`\`\`text\n` +
    `${plan.required_approval_message}\n\`\`\`\n`;
  await fs.writeFile(path.join(args.outDir, 'REPORT.md'), report, 'utf8');
  await writeManifest(args.outDir, ['run_plan.json', 'REPORT.md']);
}

function assertExactAuthority(args, plan) {
  if (plan.execution_fingerprint_sha256 !==
      args.expectedExecutionFingerprint) {
    throw new Error('Execution plan does not match authorized fingerprint');
  }
  if (process.env[MTG_SEALED_IMAGE_STORAGE_CANARY_APPROVAL_ENV_V1] !==
      plan.guard_token) {
    throw new Error(`Exact authority missing from ${
      MTG_SEALED_IMAGE_STORAGE_CANARY_APPROVAL_ENV_V1}`);
  }
}

function createProductionStorageClient() {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (projectRef(url) !== GROOKAI_PRODUCTION_PROJECT_REF || !key) {
    throw new Error('Canonical production Storage credentials are unavailable');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: {
      'user-agent': 'Grookai MTG Sealed Storage Canary/1.0',
    } },
  });
}

function assertSecureSourceTlsRuntime() {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('TLS certificate verification cannot be disabled');
  }
  if (process.env.NODE_EXTRA_CA_CERTS || process.env.SSL_CERT_FILE ||
      process.env.SSL_CERT_DIR) {
    throw new Error('Unfrozen custom TLS certificate inputs are not allowed');
  }
  if (!process.execArgv.includes('--use-system-ca')) {
    throw new Error('Source retrieval requires Node --use-system-ca');
  }
  const systemCertificateCount = tls.getCACertificates('system').length;
  const bundledCertificateCount = tls.getCACertificates('bundled').length;
  if (systemCertificateCount < 1 || bundledCertificateCount < 1) {
    throw new Error('Bundled and Windows system CA stores must both be available');
  }
  return {
    policy: 'node_bundled_plus_windows_system_ca',
    certificate_verification_required: true,
    system_certificate_count: systemCertificateCount,
    bundled_certificate_count: bundledCertificateCount,
  };
}

async function assertFreshApplyDirectory(outDir) {
  const forbidden = [
    'execution_journal.jsonl',
    'summary.json',
    'recovery_summary.json',
  ];
  const existing = [];
  for (const name of forbidden) {
    if (await pathExists(path.join(outDir, name))) existing.push(name);
  }
  if (existing.length) {
    throw new Error(`Apply output directory is not fresh: ${existing.join(',')}`);
  }
}

function exactPathSet(events, expectedPaths) {
  return events.length === expectedPaths.length &&
    events.every((event) => event.exists === false) &&
    JSON.stringify(events.map((event) => event.object_path).sort()) ===
      JSON.stringify([...expectedPaths].sort());
}

async function loadVerifiedRecoveryJournal(args, plan, local) {
  const runPlanFile = path.join(args.outDir, 'run_plan.json');
  const journalFile = path.join(args.outDir, 'execution_journal.jsonl');
  const runPlan = JSON.parse(await fs.readFile(runPlanFile, 'utf8'));
  if (runPlan.status !== 'authorized_execution_started' ||
      runPlan.repository?.head_sha !== local.head_sha ||
      runPlan.plan?.execution_fingerprint_sha256 !==
        plan.execution_fingerprint_sha256 ||
      hashMtgSealedStorageCanaryV1(runPlan.plan) !==
        hashMtgSealedStorageCanaryV1(plan)) {
    throw new Error('Recovery run plan does not match the execution authority');
  }

  const journalText = await fs.readFile(journalFile, 'utf8');
  const events = journalText.split(/\r?\n/).filter(Boolean)
    .map((line) => JSON.parse(line));
  const ownershipIndexes = events.map((event, index) =>
    event.event === 'ownership_scope_activated' ? index : -1)
    .filter((index) => index >= 0);
  if (ownershipIndexes.length !== 1) {
    throw new Error('Recovery requires exactly one ownership activation event');
  }
  const beforeOwnership = events.slice(0, ownershipIndexes[0]);
  const expectedPaths = plan.rows.map((row) => row.transient_object_path);
  const initialChecks = beforeOwnership.filter((event) =>
    event.event === 'object_presence_checked' && event.phase === 'initial');
  const immediateChecks = beforeOwnership.filter((event) =>
    event.event === 'object_presence_checked' &&
    event.phase === 'immediate_pre_upload');
  const sourceChecks = beforeOwnership.filter((event) =>
    event.event === 'source_bytes_verified' && event.valid === true);
  const sourcePaths = sourceChecks.map((event) => event.object_path);
  const ownershipEvent = events[ownershipIndexes[0]];
  if (!exactPathSet(initialChecks, expectedPaths) ||
      !exactPathSet(immediateChecks, expectedPaths) ||
      sourceChecks.length !== expectedPaths.length ||
      JSON.stringify(sourcePaths.sort()) !== JSON.stringify([...expectedPaths].sort()) ||
      JSON.stringify(ownershipEvent.object_paths) !== JSON.stringify(expectedPaths)) {
    throw new Error('Recovery ownership evidence is incomplete or inconsistent');
  }
  return { journalFile };
}

async function execute(args, plan, local) {
  assertExactAuthority(args, plan);
  const tlsRuntime = assertSecureSourceTlsRuntime();
  await fs.mkdir(args.outDir, { recursive: true });
  await assertFreshApplyDirectory(args.outDir);
  await writeJson(path.join(args.outDir, 'run_plan.json'), {
    generated_at: new Date().toISOString(),
    status: 'authorized_execution_started',
    repository: local,
    plan,
  });
  const journalFile = path.join(args.outDir, 'execution_journal.jsonl');
  const journal = async (event) => fs.appendFile(journalFile,
    `${JSON.stringify({ recorded_at: new Date().toISOString(), ...event })}\n`);
  const client = createProductionStorageClient();
  const result = await runMtgSealedImageStorageCanaryV1({
    plan,
    storage: storageAdapter(client, plan.target_storage_bucket),
    fetchSourceBytes: (row) => retrieveMtgSealedCanarySourceBytesV1({
      row,
      maximumBytes: plan.operation_contract.maximum_source_bytes_per_object,
      retryCount: plan.operation_contract.source_fetch_retries,
      requestSourceBytes: fetchSourceBytesOnce,
      journal,
    }),
    journal,
  });
  const summary = {
    ...result,
    completed_at: new Date().toISOString(),
    repository: local,
    tls_runtime: tlsRuntime,
    database_connections: 0,
    signer_deployments: 0,
  };
  await writeJson(path.join(args.outDir, 'summary.json'), summary);
  const report = `# MTG Sealed Transient Storage Canary V1\n\n` +
    `- Status: **${result.status}**\n` +
    `- Execution commit: \`${local.head_sha}\`\n` +
    `- Fetched/uploaded/read back: ` +
    `\`${result.fetched_count}/${result.uploaded_count}/` +
    `${result.readback_verified_count}\`\n` +
    `- Removed/finally absent: ` +
    `\`${result.removed_count}/${result.final_absent_count}\`\n` +
    `- Durable objects after run: \`${result.durable_objects_after_run}\`\n` +
    `- Database and signer operations: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, 'REPORT.md'), report, 'utf8');
  await writeManifest(args.outDir, [
    'run_plan.json', 'execution_journal.jsonl', 'summary.json', 'REPORT.md',
  ]);
  if (result.status !== 'passed_uploaded_read_back_removed_and_absent') {
    throw new Error(`Transient canary failed: ${result.errors.join(';')}`);
  }
  return summary;
}

async function recover(args, plan, local) {
  assertExactAuthority(args, plan);
  const { journalFile } = await loadVerifiedRecoveryJournal(args, plan, local);
  const journal = async (event) => fs.appendFile(journalFile,
    `${JSON.stringify({ recorded_at: new Date().toISOString(), ...event })}\n`);
  const client = createProductionStorageClient();
  const result = await recoverMtgSealedImageStorageCanaryV1({
    plan,
    storage: storageAdapter(client, plan.target_storage_bucket),
    ownershipScopeVerified: true,
    journal,
  });
  const summary = {
    ...result,
    completed_at: new Date().toISOString(),
    repository: local,
    database_connections: 0,
    source_fetches: 0,
    uploads: 0,
    signer_deployments: 0,
  };
  await writeJson(path.join(args.outDir, 'recovery_summary.json'), summary);
  const report = `# MTG Sealed Transient Storage Canary V1 Recovery\n\n` +
    `- Status: **${result.status}**\n` +
    `- Execution commit: \`${local.head_sha}\`\n` +
    `- Present/removed: \`${result.discovered_present_count}/` +
    `${result.removed_count}\`\n` +
    `- Finally absent: \`${result.final_absent_count}/17\`\n` +
    `- Source fetches/uploads/database/signer operations: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, 'RECOVERY_REPORT.md'), report, 'utf8');
  const names = [
    'run_plan.json', 'execution_journal.jsonl', 'recovery_summary.json',
    'RECOVERY_REPORT.md',
  ];
  if (await pathExists(path.join(args.outDir, 'summary.json'))) {
    names.push('summary.json');
  }
  await writeManifest(args.outDir, names);
  if (result.status !== 'recovery_passed_all_execution_paths_absent') {
    throw new Error(`Transient canary recovery failed: ${
      result.errors.join(';')}`);
  }
  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const local = assertRepository(args);
  const canaryPlanBytes = await fs.readFile(args.canaryPlan);
  const canaryPlan = JSON.parse(canaryPlanBytes.toString('utf8'));
  const plan = buildMtgSealedImageStorageCanaryExecutionPlanV1({
    canaryPlan,
    canaryPlanFileSha256: hashMtgSealedStorageCanaryV1(canaryPlanBytes),
    producerCommitSha: local.head_sha,
  });
  const validation = validateMtgSealedImageStorageCanaryExecutionPlanV1(plan);
  if (!validation.valid) {
    throw new Error(`Execution plan invalid: ${validation.findings.join(',')}`);
  }
  if (args.mode === 'plan') {
    await writePlanArtifacts(args, plan, local);
    process.stdout.write(`${JSON.stringify({
      status: 'ready_not_authorized_or_executed',
      execution_commit_sha: local.head_sha,
      selected_object_count: plan.selected_object_count,
      execution_fingerprint_sha256: plan.execution_fingerprint_sha256,
      required_approval_message: plan.required_approval_message,
      output_directory: path.relative(ROOT, args.outDir).replaceAll('\\', '/'),
    }, null, 2)}\n`);
    return;
  }
  dotenv.config({ path: args.envFile, override: false, quiet: true });
  const result = args.mode === 'recover'
    ? await recover(args, plan, local)
    : await execute(args, plan, local);
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    execution_commit_sha: local.head_sha,
    execution_fingerprint_sha256: plan.execution_fingerprint_sha256,
    durable_objects_after_run: result.durable_objects_after_run ??
      result.durable_objects_after_recovery,
    output_directory: path.relative(ROOT, args.outDir).replaceAll('\\', '/'),
  }, null, 2)}\n`);
}

await main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
