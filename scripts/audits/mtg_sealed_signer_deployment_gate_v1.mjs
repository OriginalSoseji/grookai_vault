import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import { pgSslConfig } from
  './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const DEFAULT_OUT = path.join(ROOT, '.tmp', 'mtg-sealed-signer-deployment-gate-v1');
const EXPECTED_BRANCH = 'agent/mtg-sealed-image-migration-promotion-v1';
const PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const FUNCTION_NAME = 'mtg-sealed-sign-image-v1';
const BUCKET = 'user-card-images';
const OBJECT_PATH =
  'sealed/mtg/sha256/e9/e944f88ee4a707c018793b9069ff9625ddff2c2d1d30d31ea2219308ffd503cd.jpg';
const SOURCE_BUNDLE_FILES = [
  'supabase/functions/mtg-sealed-sign-image-v1/index.ts',
  'supabase/functions/mtg-sealed-sign-image-v1/config.toml',
  'supabase/functions/_shared/auth.ts',
  'supabase/functions/_shared/cors.ts',
  'supabase/functions/_shared/key_resolver.ts',
];

function parseArgs(argv) {
  const args = {
    mode: 'preflight',
    expectedHeadSha: '',
    expectedBundleSha256: '',
    expectedPlanFingerprint: '',
    baselinePath: '',
    envFile: DEFAULT_ENV_FILE,
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument === '--preflight') args.mode = 'preflight';
    else if (argument === '--readback') args.mode = 'readback';
    else if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice('--expected-head-sha='.length)
        .trim().toLowerCase();
    } else if (argument.startsWith('--expected-bundle-sha256=')) {
      args.expectedBundleSha256 = argument
        .slice('--expected-bundle-sha256='.length).trim().toLowerCase();
    } else if (argument.startsWith('--expected-plan-fingerprint=')) {
      args.expectedPlanFingerprint = argument
        .slice('--expected-plan-fingerprint='.length).trim().toLowerCase();
    } else if (argument.startsWith('--baseline=')) {
      args.baselinePath = path.resolve(argument.slice('--baseline='.length));
    } else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice('--env-file='.length));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice('--out-dir='.length));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha=<40-character SHA> is required');
  }
  for (const [name, value] of [
    ['expected-bundle-sha256', args.expectedBundleSha256],
    ['expected-plan-fingerprint', args.expectedPlanFingerprint],
  ]) {
    if (!/^[0-9a-f]{64}$/.test(value)) {
      throw new Error(`Exact --${name}=<64-character SHA-256> is required`);
    }
  }
  if (args.mode === 'readback' && !args.baselinePath) {
    throw new Error('--baseline=<preflight protected_state.json> is required');
  }
  return args;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function git(...args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function repository(args) {
  const branch = git('branch', '--show-current');
  const state = {
    expected_branch: EXPECTED_BRANCH,
    branch: branch || process.env.GITHUB_REF_NAME || 'detached',
    head_sha: git('rev-parse', 'HEAD'),
    tracked_worktree_clean:
      git('status', '--porcelain', '--untracked-files=no') === '',
  };
  if (state.head_sha !== args.expectedHeadSha || !state.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean signer producer');
  }
  if (branch && branch !== EXPECTED_BRANCH) {
    throw new Error(`Unexpected branch: ${branch}`);
  }
  return state;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? '';
}

function projectRefFromEnvironment(connectionString) {
  const candidates = [process.env.SUPABASE_URL ?? '', connectionString];
  for (const candidate of candidates) {
    const match = candidate.match(/(?:https?:\/\/|db\.|@)([a-z0-9]{20})\./i);
    if (match) return match[1].toLowerCase();
  }
  return '';
}

function clientOptions(connectionString) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
    application_name: 'mtg_sealed_signer_deployment_gate_v1',
  };
}

async function loadSourceBundle() {
  const files = [];
  for (const relativePath of SOURCE_BUNDLE_FILES) {
    const body = await fs.readFile(path.join(ROOT, relativePath));
    files.push({ path: relativePath, sha256: sha256(body), bytes: body.length });
  }
  return {
    files,
    bundle_sha256: sha256(stable(files)),
  };
}

async function withReadOnlyClient(connectionString, callback) {
  const client = new Client(clientOptions(connectionString));
  await client.connect();
  try {
    await client.query('begin transaction read only');
    const result = await callback(client);
    await client.query('rollback');
    return result;
  } catch (error) {
    try { await client.query('rollback'); } catch {}
    throw error;
  } finally {
    await client.end();
  }
}

async function captureProtectedState(connectionString) {
  return withReadOnlyClient(connectionString, async (client) => {
    const result = await client.query(`select jsonb_build_object(
      'sealed_family_count',
        (select count(*) from public.sealed_product_families),
      'sealed_variant_count',
        (select count(*) from public.sealed_product_variants),
      'sealed_mapping_count',
        (select count(*) from public.sealed_product_source_mappings),
      'price_release_count',
        (select count(*) from public.sealed_product_releases),
      'price_member_count',
        (select count(*) from public.sealed_product_release_members),
      'image_evidence_count',
        (select count(*) from public.sealed_product_image_evidence),
      'image_object_count',
        (select count(*) from public.sealed_product_image_objects),
      'image_assertion_count',
        (select count(*) from public.sealed_product_variant_image_assertions),
      'image_release_count',
        (select count(*) from public.sealed_product_image_releases),
      'image_member_count',
        (select count(*) from public.sealed_product_image_release_members),
      'mtg_price_pointer',
        (select release_id::text from public.sealed_product_release_pointer
          where game_key='mtg'),
      'mtg_image_pointer',
        (select image_release_id::text
          from public.sealed_product_image_release_pointer
          where game_key='mtg'),
      'mtg_catalog_visibility',
        (select release_status from public.catalog_game_release_controls
          where game_code='mtg'),
      'mtg_sealed_visibility',
        (select release_status
          from public.sealed_product_game_release_controls
          where game_key='mtg'),
      'mtg_storage_object_count',
        (select count(*) from storage.objects
          where bucket_id='user-card-images'
            and name like 'sealed/mtg/sha256/%'),
      'mtg_storage_object_bytes',
        (select coalesce(sum((metadata->>'size')::bigint),0)
          from storage.objects
          where bucket_id='user-card-images'
            and name like 'sealed/mtg/sha256/%'),
      'vault_item_count', (select count(*) from public.vault_items),
      'vault_instance_count',
        (select count(*) from public.vault_item_instances)
    ) as state`);
    return result.rows[0].state;
  });
}

async function proveAuthenticatedHiddenState(connectionString) {
  return withReadOnlyClient(connectionString, async (client) => {
    const user = (await client.query(
      `select id::text from auth.users order by created_at,id limit 1`)).rows[0];
    if (!user?.id) throw new Error('No existing authenticated user for smoke proof');
    await client.query('set local role authenticated');
    await client.query(
      `select set_config('request.jwt.claim.sub',$1,true)`, [user.id]);
    await client.query(
      `select set_config('request.jwt.claim.role','authenticated',true)`);
    const result = await client.query(
      `select public.mtg_sealed_image_object_signing_authorized_v1($1,$2)
        as authorized`, [BUCKET, OBJECT_PATH]);
    return {
      simulated_role: 'authenticated',
      user_id_recorded: false,
      storage_bucket: BUCKET,
      object_path: OBJECT_PATH,
      authorized: result.rows[0]?.authorized === true,
      transaction_mode: 'read_only_rolled_back',
    };
  });
}

async function requestProbe(method, authorization = '') {
  const endpoint =
    `https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}`;
  const headers = { 'content-type': 'application/json' };
  if (authorization) headers.authorization = authorization;
  const response = await fetch(endpoint, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify({
      storage_bucket: BUCKET,
      object_path: OBJECT_PATH,
    }) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  let body;
  try { body = await response.json(); } catch { body = { non_json: true }; }
  return { method, status: response.status, body };
}

async function writeJson(directory, name, value) {
  await fs.writeFile(path.join(directory, name),
    `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeHashes(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const hashes = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name === 'artifact_hashes.json') continue;
    const body = await fs.readFile(path.join(directory, entry.name));
    hashes.push({ file: entry.name, sha256: sha256(body), bytes: body.length });
  }
  hashes.sort((left, right) => left.file.localeCompare(right.file));
  await writeJson(directory, 'artifact_hashes.json', hashes);
}

function reportMarkdown(summary) {
  const endpoint = summary.endpoint_probe;
  return `# MTG Sealed Signer Deployment Gate V1\n\n` +
    `- Mode: \`${summary.mode}\`\n` +
    `- Producer commit: \`${summary.repository.head_sha}\`\n` +
    `- Project ref: \`${summary.project_ref}\`\n` +
    `- Function: \`${FUNCTION_NAME}\`\n` +
    `- Bundle SHA-256: \`${summary.source_bundle.bundle_sha256}\`\n` +
    `- Plan fingerprint: \`${summary.plan_fingerprint}\`\n` +
    `- Result: **${summary.passed ? 'PASS' : 'FAIL'}**\n\n` +
    `## Security Proof\n\n` +
    `- Anonymous POST: \`${endpoint.anonymous_post.status}\`\n` +
    `- Invalid bearer POST: \`${endpoint.invalid_bearer_post.status}\`\n` +
    `- Unauthenticated GET: \`${endpoint.get.status}\`\n` +
    `- Authenticated-role signing while hidden: ` +
      `\`${summary.authenticated_hidden_state.authorized}\`\n` +
    `- MTG sealed visibility: ` +
      `\`${summary.protected_state.mtg_sealed_visibility}\`\n` +
    `- Protected-state drift: \`${summary.protected_state_drift}\`\n\n` +
    `## Boundaries\n\n` +
    `This gate performs read-only database transactions and HTTP probes only. ` +
    `It makes no database, Storage, pricing, pointer, visibility, Vault, ` +
    `client, or cross-game write. Function deployment is performed separately ` +
    `by the single-target GitHub workflow.\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  dotenv.config({ path: args.envFile, override: false, quiet: true });
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error('SUPABASE_DB_URL is required');
  const projectRef = projectRefFromEnvironment(connectionString);
  if (projectRef !== PROJECT_REF) {
    throw new Error(`Project ref mismatch: ${projectRef || 'unknown'}`);
  }

  const repo = repository(args);
  const sourceBundle = await loadSourceBundle();
  if (sourceBundle.bundle_sha256 !== args.expectedBundleSha256) {
    throw new Error('Source bundle SHA-256 mismatch');
  }
  const runPlan = {
    gate_version: 'MTG_SEALED_SIGNER_DEPLOYMENT_GATE_V1',
    producer_commit: repo.head_sha,
    expected_branch: EXPECTED_BRANCH,
    project_ref: PROJECT_REF,
    function_name: FUNCTION_NAME,
    source_bundle_sha256: sourceBundle.bundle_sha256,
    storage_bucket: BUCKET,
    object_path: OBJECT_PATH,
    deployment_scope: ['mtg-sealed-sign-image-v1'],
    boundaries: {
      database_writes: 0,
      storage_operations: 0,
      pricing_writes: 0,
      pointer_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
      client_activations: 0,
      cross_game_writes: 0,
    },
  };
  const planFingerprint = sha256(stable(runPlan));
  if (planFingerprint !== args.expectedPlanFingerprint) {
    throw new Error('Deployment plan fingerprint mismatch');
  }

  await fs.mkdir(args.outDir, { recursive: true });
  const protectedState = await captureProtectedState(connectionString);
  const authenticatedHiddenState =
    await proveAuthenticatedHiddenState(connectionString);
  const endpointProbe = {
    anonymous_post: await requestProbe('POST'),
    invalid_bearer_post: await requestProbe('POST', 'Bearer invalid-jwt'),
    get: await requestProbe('GET'),
  };
  let baseline = protectedState;
  if (args.mode === 'readback') {
    baseline = JSON.parse(await fs.readFile(args.baselinePath, 'utf8'));
  }
  const protectedStateDrift = stable(baseline) !== stable(protectedState);
  const stateValid = protectedState.mtg_catalog_visibility === 'signed_in' &&
    protectedState.mtg_sealed_visibility === 'hidden' &&
    authenticatedHiddenState.authorized === false;
  const endpointValid = args.mode === 'preflight' ||
    (endpointProbe.anonymous_post.status === 401 &&
      endpointProbe.anonymous_post.body?.error === 'unauthorized' &&
      endpointProbe.invalid_bearer_post.status === 401 &&
      endpointProbe.invalid_bearer_post.body?.error === 'unauthorized' &&
      endpointProbe.get.status === 405 &&
      endpointProbe.get.body?.error === 'method_not_allowed');
  const passed = stateValid && endpointValid && !protectedStateDrift;
  const summary = {
    gate_version: runPlan.gate_version,
    mode: args.mode,
    passed,
    repository: repo,
    project_ref: PROJECT_REF,
    source_bundle: sourceBundle,
    plan_fingerprint: planFingerprint,
    protected_state: protectedState,
    protected_state_drift: protectedStateDrift,
    authenticated_hidden_state: authenticatedHiddenState,
    endpoint_probe: endpointProbe,
    boundaries: runPlan.boundaries,
  };
  await writeJson(args.outDir, 'run_plan.json', runPlan);
  await writeJson(args.outDir, 'source_bundle.json', sourceBundle);
  await writeJson(args.outDir, 'protected_state.json', protectedState);
  await writeJson(args.outDir, 'authenticated_hidden_state_proof.json',
    authenticatedHiddenState);
  await writeJson(args.outDir, 'endpoint_probe.json', endpointProbe);
  await writeJson(args.outDir, 'summary.json', summary);
  await fs.writeFile(path.join(args.outDir, 'REPORT.md'),
    reportMarkdown(summary), 'utf8');
  await writeHashes(args.outDir);
  console.log(JSON.stringify({
    passed,
    mode: args.mode,
    plan_fingerprint: planFingerprint,
    bundle_sha256: sourceBundle.bundle_sha256,
    endpoint_statuses: Object.fromEntries(Object.entries(endpointProbe)
      .map(([key, value]) => [key, value.status])),
    protected_state_drift: protectedStateDrift,
  }, null, 2));
  if (!passed) process.exitCode = 1;
}

if (process.argv[1] &&
    fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}

export {
  FUNCTION_NAME,
  PROJECT_REF,
  SOURCE_BUNDLE_FILES,
  stable,
};
