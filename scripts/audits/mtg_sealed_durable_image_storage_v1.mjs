import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as tls from 'node:tls';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import {
  validateMtgSealedDurableImagePlanV1,
} from '../../backend/pricing/mtg_sealed_durable_image_plan_v1.mjs';
import {
  buildMtgSealedDurableImageStorageExecutionPlanV1,
  hashMtgSealedDurableImageStorageV1,
  MTG_SEALED_DURABLE_IMAGE_STORAGE_APPROVAL_ENV_V1,
  runMtgSealedDurableImageStorageV1,
  validateMtgSealedDurableImageStorageExecutionPlanV1,
  validateMtgSealedDurableImageResumeJournalV1,
} from '../../backend/pricing/mtg_sealed_durable_image_storage_v1.mjs';
import { GROOKAI_PRODUCTION_PROJECT_REF } from
  '../../backend/pricing/mtg_sealed_image_coverage_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const DEFAULT_DURABLE_PLAN = path.join(ROOT, 'docs', 'audits', 'pricing',
  'mtg_sealed_durable_image_plan_v1', '2026-09-04T22-07-02Z_offline');
const DEFAULT_OUT = path.join(ROOT, '.tmp',
  'mtg-sealed-durable-image-storage-v1');

function parseArgs(argv) {
  const args = {
    mode: 'plan',
    expectedHeadSha: '',
    expectedExecutionFingerprint: '',
    durablePlanDir: DEFAULT_DURABLE_PLAN,
    envFile: DEFAULT_ENV_FILE,
    outDir: DEFAULT_OUT,
    concurrency: 10,
  };
  for (const argument of argv) {
    if (argument === '--plan') args.mode = 'plan';
    else if (argument === '--apply') args.mode = 'apply';
    else if (argument === '--resume') args.mode = 'resume';
    else if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice('--expected-head-sha='.length)
        .trim().toLowerCase();
    } else if (argument.startsWith('--expected-execution-fingerprint=')) {
      args.expectedExecutionFingerprint = argument
        .slice('--expected-execution-fingerprint='.length).trim().toLowerCase();
    } else if (argument.startsWith('--durable-plan-dir=')) {
      args.durablePlanDir = path.resolve(
        argument.slice('--durable-plan-dir='.length));
    } else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice('--env-file='.length));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice('--out-dir='.length));
    } else if (argument.startsWith('--concurrency=')) {
      args.concurrency = Number(argument.slice('--concurrency='.length));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha=<40-character SHA> is required');
  }
  if (args.mode !== 'plan' &&
      !/^[0-9a-f]{64}$/.test(args.expectedExecutionFingerprint)) {
    throw new Error(
      'Apply/resume requires --expected-execution-fingerprint=<SHA-256>',
    );
  }
  if (!Number.isSafeInteger(args.concurrency) || args.concurrency < 1 ||
      args.concurrency > 10) {
    throw new Error('Concurrency must be an integer from 1 through 10');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function assertRepository(args) {
  const repository = {
    branch: git('branch', '--show-current') || '(detached)',
    head_sha: git('rev-parse', 'HEAD'),
    tracked_worktree_clean:
      git('status', '--porcelain', '--untracked-files=no') === '',
  };
  if (repository.head_sha !== args.expectedHeadSha ||
      !repository.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean execution authority');
  }
  return repository;
}

function projectRef(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      ? url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1] ?? null
      : null;
  } catch {
    return null;
  }
}

async function readDurableBundle(directory) {
  const artifactManifestBytes = await fs.readFile(
    path.join(directory, 'artifact_hashes.json'));
  const artifactManifest = JSON.parse(artifactManifestBytes.toString('utf8'));
  const artifactHashes = artifactManifest.artifacts ?? {};
  const required = [
    'run_plan.json',
    'objects.jsonl.gz',
    'exclusions.jsonl',
    'shards.json',
    'summary.json',
    'REPORT.md',
  ];
  const bytesByName = {};
  for (const name of required) {
    const bytes = await fs.readFile(path.join(directory, name));
    const evidence = artifactHashes[name];
    if (!evidence || bytes.length !== evidence.bytes ||
        hashMtgSealedDurableImageStorageV1(bytes) !== evidence.sha256) {
      throw new Error(`Durable plan artifact verification failed: ${name}`);
    }
    bytesByName[name] = bytes;
  }
  const plan = JSON.parse(bytesByName['run_plan.json'].toString('utf8'));
  const objects = gunzipSync(bytesByName['objects.jsonl.gz']).toString('utf8')
    .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const exclusions = bytesByName['exclusions.jsonl'].toString('utf8')
    .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const shards = JSON.parse(bytesByName['shards.json'].toString('utf8'));
  const bundle = { plan, objects, exclusions, shards };
  const validation = validateMtgSealedDurableImagePlanV1(bundle);
  if (!validation.valid) {
    throw new Error(`Durable plan validation failed: ${
      validation.findings.join(',')}`);
  }
  return { bundle, artifactHashes };
}

async function writeJson(file, value) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await fs.writeFile(file, bytes);
  return bytes;
}

async function writeArtifactManifest(outDir, names) {
  const artifacts = {};
  for (const name of names) {
    const bytes = await fs.readFile(path.join(outDir, name));
    artifacts[name] = {
      bytes: bytes.length,
      sha256: hashMtgSealedDurableImageStorageV1(bytes),
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

async function assertFreshApplyDirectory(outDir) {
  const forbidden = [
    'run_plan.json',
    'execution_journal.jsonl',
    'object_results.jsonl.gz',
    'summary.json',
    'object_results',
  ];
  const existing = [];
  for (const name of forbidden) {
    if (await pathExists(path.join(outDir, name))) existing.push(name);
  }
  if (existing.length) {
    throw new Error(`Apply output directory is not fresh: ${existing.join(',')}`);
  }
}

async function writePlanArtifacts(args, executionPlan, repository) {
  await fs.mkdir(args.outDir, { recursive: true });
  for (const name of [
    'execution_plan.json', 'summary.json', 'REPORT.md', 'artifact_hashes.json',
  ]) {
    if (await pathExists(path.join(args.outDir, name))) {
      throw new Error(`Plan output directory is not fresh: ${name}`);
    }
  }
  await writeJson(path.join(args.outDir, 'execution_plan.json'), executionPlan);
  await writeJson(path.join(args.outDir, 'summary.json'), {
    status: 'ready_not_authorized_or_executed',
    repository,
    execution_fingerprint_sha256:
      executionPlan.execution_fingerprint_sha256,
    source_durable_plan_fingerprint_sha256:
      executionPlan.source_durable_plan_fingerprint_sha256,
    selected_object_count: executionPlan.selected_object_count,
    selected_variant_count: executionPlan.selected_variant_count,
    exclusion_count: executionPlan.exclusion_count,
    expected_durable_bytes: executionPlan.expected_durable_bytes,
    source_http_requests: 0,
    storage_reads: 0,
    storage_writes: 0,
    storage_deletes: 0,
    database_connections: 0,
  });
  const report = `# MTG Sealed Durable Image Storage Executor V1\n\n` +
    `- Status: **READY; NOT AUTHORIZED OR EXECUTED**\n` +
    `- Execution commit: \`${repository.head_sha}\`\n` +
    `- Durable objects / variants: ` +
      `\`${executionPlan.selected_object_count}/` +
      `${executionPlan.selected_variant_count}\`\n` +
    `- Preserved exclusions: \`${executionPlan.exclusion_count}\`\n` +
    `- Expected durable bytes: \`${executionPlan.expected_durable_bytes}\`\n` +
    `- Execution fingerprint: ` +
      `\`${executionPlan.execution_fingerprint_sha256}\`\n` +
    `- Source, Storage, and database operations: \`0\`\n\n` +
    `## Required Exact Authority\n\n\`\`\`text\n` +
    `${executionPlan.required_approval_message}\n\`\`\`\n`;
  await fs.writeFile(path.join(args.outDir, 'REPORT.md'), report, 'utf8');
  await writeArtifactManifest(args.outDir, [
    'execution_plan.json', 'summary.json', 'REPORT.md',
  ]);
}

function assertExactAuthority(args, executionPlan) {
  if (executionPlan.execution_fingerprint_sha256 !==
      args.expectedExecutionFingerprint) {
    throw new Error('Execution plan does not match authorized fingerprint');
  }
  if (process.env[MTG_SEALED_DURABLE_IMAGE_STORAGE_APPROVAL_ENV_V1] !==
      executionPlan.guard_token) {
    throw new Error(`Exact authority missing from ${
      MTG_SEALED_DURABLE_IMAGE_STORAGE_APPROVAL_ENV_V1}`);
  }
}

function assertSecureTlsRuntime() {
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

function createStorageClient() {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (projectRef(url) !== GROOKAI_PRODUCTION_PROJECT_REF || !key) {
    throw new Error('Canonical production Storage credentials are unavailable');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: {
      'user-agent': 'Grookai MTG Sealed Durable Image Storage/1.0',
    } },
  });
}

function folderAndName(objectPath) {
  const index = objectPath.lastIndexOf('/');
  return { folder: objectPath.slice(0, index), name: objectPath.slice(index + 1) };
}

function storageAdapter(client, bucket) {
  return {
    async objectExists(row) {
      const { folder, name } = folderAndName(row.durable_object_path);
      const { data, error } = await client.storage.from(bucket)
        .list(folder, { limit: 100, search: name });
      if (error) throw new Error(`Storage list failed: ${error.message}`);
      return (data ?? []).some((entry) => entry.name === name);
    },
    async upload(row, buffer) {
      const { error } = await client.storage.from(bucket)
        .upload(row.durable_object_path, buffer, {
          upsert: false,
          contentType: row.expected_image.content_type,
          cacheControl: '31536000',
        });
      if (error) throw new Error(`Storage upload failed: ${error.message}`);
    },
    async download(row) {
      const { data, error } = await client.storage.from(bucket)
        .download(row.durable_object_path);
      if (error || !data) {
        throw new Error(`Storage download failed: ${error?.message ?? 'no data'}`);
      }
      return {
        buffer: Buffer.from(await data.arrayBuffer()),
        contentType: data.type || null,
      };
    },
    async remove(paths) {
      const { error } = await client.storage.from(bucket).remove(paths);
      if (error) throw new Error(`Storage removal failed: ${error.message}`);
    },
  };
}

async function fetchSourceBytes(row, maximumBytes) {
  let response;
  try {
    response = await fetch(row.primary_source.source_image_url, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'user-agent': 'Grookai MTG Sealed Durable Image Storage/1.0',
        accept: 'image/*',
      },
    });
  } catch (error) {
    error.retryable = true;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(
      `${row.primary_source.source_product_id}:source_http_${response.status}`,
    );
    error.code = `http_${response.status}`;
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }
  const declaredBytes = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredBytes) && declaredBytes > maximumBytes) {
    const error = new Error('source_too_large');
    error.code = 'source_too_large';
    error.retryable = false;
    throw error;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maximumBytes) {
    const error = new Error('source_too_large');
    error.code = 'source_too_large';
    error.retryable = false;
    throw error;
  }
  return { buffer, contentType: response.headers.get('content-type') };
}

async function readResumeState(args, executionPlan, repository, knownPaths) {
  const runPlan = JSON.parse(await fs.readFile(
    path.join(args.outDir, 'run_plan.json'), 'utf8'));
  if (runPlan.status !== 'authorized_execution_started' ||
      runPlan.repository?.head_sha !== repository.head_sha ||
      runPlan.execution_plan?.execution_fingerprint_sha256 !==
        executionPlan.execution_fingerprint_sha256 ||
      hashMtgSealedDurableImageStorageV1(runPlan.execution_plan) !==
        hashMtgSealedDurableImageStorageV1(executionPlan)) {
    throw new Error('Resume state does not match exact execution authority');
  }
  const journalText = await fs.readFile(
    path.join(args.outDir, 'execution_journal.jsonl'), 'utf8');
  const events = journalText.split(/\r?\n/).filter(Boolean)
    .map((line) => JSON.parse(line));
  return validateMtgSealedDurableImageResumeJournalV1({
    events,
    executionPlan,
    knownObjectPaths: knownPaths,
  });
}

function serializedJournal(file, executionFingerprint, startSequence) {
  let sequence = startSequence;
  let chain = Promise.resolve();
  return async (event) => {
    const row = {
      recorded_at: new Date().toISOString(),
      sequence,
      execution_fingerprint_sha256: executionFingerprint,
      ...event,
    };
    sequence += 1;
    chain = chain.then(() => fs.appendFile(file, `${JSON.stringify(row)}\n`));
    await chain;
  };
}

async function execute(args, executionPlan, durableBundle, repository) {
  assertExactAuthority(args, executionPlan);
  const tlsRuntime = assertSecureTlsRuntime();
  await fs.mkdir(args.outDir, { recursive: true });
  const knownPaths = new Set(durableBundle.objects.map((row) =>
    row.durable_object_path));
  let priorRequestAttemptsByPath = new Map();
  let nextSequence = 1;
  if (args.mode === 'apply') {
    await assertFreshApplyDirectory(args.outDir);
    await writeJson(path.join(args.outDir, 'run_plan.json'), {
      started_at: new Date().toISOString(),
      status: 'authorized_execution_started',
      repository,
      concurrency: args.concurrency,
      execution_plan: executionPlan,
    });
    await fs.writeFile(
      path.join(args.outDir, 'execution_journal.jsonl'),
      '',
      { flag: 'wx' },
    );
  } else {
    const resume = await readResumeState(
      args, executionPlan, repository, knownPaths,
    );
    priorRequestAttemptsByPath = resume.priorRequestAttemptsByPath;
    nextSequence = resume.nextSequence;
  }
  const journalFile = path.join(args.outDir, 'execution_journal.jsonl');
  const journal = serializedJournal(
    journalFile,
    executionPlan.execution_fingerprint_sha256,
    nextSequence,
  );
  const resultDir = path.join(args.outDir, 'object_results');
  await fs.mkdir(resultDir, { recursive: true });
  const client = createStorageClient();
  const result = await runMtgSealedDurableImageStorageV1({
    executionPlan,
    durableBundle,
    storage: storageAdapter(client, executionPlan.target_storage_bucket),
    requestSourceBytes: fetchSourceBytes,
    priorRequestAttemptsByPath,
    concurrency: args.concurrency,
    journal,
    onObjectResult: async (objectResult) => {
      const name = `${String(objectResult.object_index).padStart(6, '0')}.json`;
      await writeJson(path.join(resultDir, name), objectResult);
    },
  });
  const priorSourceRequests = [...priorRequestAttemptsByPath.values()]
    .reduce((total, value) => total + value, 0);
  const cumulativeSourceRequests =
    priorSourceRequests + result.counters.source_http_requests;
  if (cumulativeSourceRequests >
      executionPlan.operation_contract.maximum_source_request_attempts) {
    throw new Error('Cumulative source request ceiling exceeded');
  }
  const resultLines = Buffer.from(`${result.results
    .map((row) => JSON.stringify(row)).join('\n')}\n`);
  await fs.writeFile(path.join(args.outDir, 'object_results.jsonl.gz'),
    gzipSync(resultLines, { level: 9, mtime: 0 }));
  const summary = {
    ...Object.fromEntries(Object.entries(result)
      .filter(([key]) => !['results', 'failures'].includes(key))),
    completed_at: new Date().toISOString(),
    repository,
    tls_runtime: tlsRuntime,
    prior_source_request_count: priorSourceRequests,
    cumulative_source_request_count: cumulativeSourceRequests,
    database_connections: 0,
    signer_deployments: 0,
  };
  await writeJson(path.join(args.outDir, 'summary.json'), summary);
  const report = `# MTG Sealed Durable Image Storage V1\n\n` +
    `- Status: **${result.status}**\n` +
    `- Execution commit: \`${repository.head_sha}\`\n` +
    `- Attempted / exact verified / planned: ` +
      `\`${result.attempted_object_count}/` +
      `${result.exact_verified_object_count}/` +
      `${result.planned_object_count}\`\n` +
    `- Uploaded / reused: \`${result.uploaded_object_count}/` +
      `${result.reused_preexisting_object_count}\`\n` +
    `- Failed / unattempted: \`${result.failed_object_count}/` +
      `${result.unattempted_object_count}\`\n` +
    `- Cumulative source requests: \`${cumulativeSourceRequests}\`\n` +
    `- Database and signer operations: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, 'REPORT.md'), report, 'utf8');
  await writeArtifactManifest(args.outDir, [
    'run_plan.json',
    'execution_journal.jsonl',
    'object_results.jsonl.gz',
    'summary.json',
    'REPORT.md',
  ]);
  if (result.status !== 'passed_all_durable_objects_exactly_verified' ||
      !result.zero_reconciliation_mismatches) {
    throw new Error(`Durable execution incomplete: ${result.status}`);
  }
  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = assertRepository(args);
  const { bundle, artifactHashes } = await readDurableBundle(
    args.durablePlanDir);
  const executionPlan = buildMtgSealedDurableImageStorageExecutionPlanV1({
    durableBundle: bundle,
    durableArtifactHashes: artifactHashes,
    producerCommitSha: repository.head_sha,
  });
  const validation = validateMtgSealedDurableImageStorageExecutionPlanV1(
    executionPlan,
    bundle,
  );
  if (!validation.valid) {
    throw new Error(`Execution plan invalid: ${validation.findings.join(',')}`);
  }
  if (args.mode === 'plan') {
    await writePlanArtifacts(args, executionPlan, repository);
    process.stdout.write(`${JSON.stringify({
      status: 'ready_not_authorized_or_executed',
      execution_commit_sha: repository.head_sha,
      execution_fingerprint_sha256:
        executionPlan.execution_fingerprint_sha256,
      selected_object_count: executionPlan.selected_object_count,
      selected_variant_count: executionPlan.selected_variant_count,
      required_approval_message: executionPlan.required_approval_message,
      output_directory: path.relative(ROOT, args.outDir).replaceAll('\\', '/'),
    }, null, 2)}\n`);
    return;
  }

  dotenv.config({ path: args.envFile, override: false, quiet: true });
  const result = await execute(args, executionPlan, bundle, repository);
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    execution_commit_sha: repository.head_sha,
    execution_fingerprint_sha256:
      executionPlan.execution_fingerprint_sha256,
    exact_verified_object_count: result.exact_verified_object_count,
    output_directory: path.relative(ROOT, args.outDir).replaceAll('\\', '/'),
  }, null, 2)}\n`);
}

await main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
