import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.supabase.com';
const SCRIPT_VERSION = 'SUPABASE_DISK_AUTOSCALE_APPLY_V1';

function argValue(argv, name, fallback = null) {
  const prefix = `--${name}=`;
  const inline = argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function integer(value, name) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
}

export function normalizeAutoscaleConfig(value) {
  return {
    growth_percent: integer(value?.growth_percent ?? 0, 'growth_percent'),
    min_increment_gb: integer(value?.min_increment_gb ?? 0, 'min_increment_gb'),
    max_size_gb: integer(value?.max_size_gb, 'max_size_gb'),
  };
}

export function configsEqual(left, right) {
  return JSON.stringify(normalizeAutoscaleConfig(left))
    === JSON.stringify(normalizeAutoscaleConfig(right));
}

export function buildAutoscalePlan({ projectRef, expectedCurrent, desired, commitSha, runId }) {
  const plan = {
    script_version: SCRIPT_VERSION,
    created_at: new Date().toISOString(),
    project_ref: projectRef,
    expected_current: normalizeAutoscaleConfig(expectedCurrent),
    desired: normalizeAutoscaleConfig(desired),
    producing_commit_sha: commitSha ?? null,
    github_run_id: runId ?? null,
    boundaries: {
      management_api_mutation: 'disk_autoscale_custom_config_only',
      database_access: false,
      database_writes: false,
      disk_resize: false,
      compute_resize: false,
      iops_change: false,
      throughput_change: false,
    },
  };
  return {
    ...plan,
    plan_sha256: createHash('sha256').update(JSON.stringify(plan)).digest('hex'),
  };
}

async function requestJson(endpoint, accessToken, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${endpoint} failed (${response.status}): ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readback(projectRef, accessToken) {
  return normalizeAutoscaleConfig(
    await requestJson(`/v1/projects/${encodeURIComponent(projectRef)}/config/disk/autoscale`, accessToken),
  );
}

async function applyConfig(projectRef, accessToken, config) {
  return requestJson(
    `/platform/projects/${encodeURIComponent(projectRef)}/disk/custom-config`,
    accessToken,
    { method: 'POST', body: normalizeAutoscaleConfig(config) },
  );
}

async function waitForConfig(projectRef, accessToken, expected) {
  let observed = null;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    observed = await readback(projectRef, accessToken);
    if (configsEqual(observed, expected)) return { matched: true, observed, attempt };
    await delay(5_000);
  }
  return { matched: false, observed, attempt: 12 };
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const projectRef = argValue(argv, 'project-ref', process.env.SUPABASE_PROJECT_REF);
  const outputDir = path.resolve(argValue(argv, 'output-dir', 'audit-artifacts/supabase-disk-autoscale-apply'));
  const expectedCurrent = {
    growth_percent: integer(argValue(argv, 'expected-growth-percent', 0), 'expected-growth-percent'),
    min_increment_gb: integer(argValue(argv, 'expected-min-increment-gb', 0), 'expected-min-increment-gb'),
    max_size_gb: integer(argValue(argv, 'expected-max-size-gb', 600), 'expected-max-size-gb'),
  };
  const desired = {
    growth_percent: integer(argValue(argv, 'growth-percent', 50), 'growth-percent'),
    min_increment_gb: integer(argValue(argv, 'min-increment-gb', 4), 'min-increment-gb'),
    max_size_gb: integer(argValue(argv, 'max-size-gb', 600), 'max-size-gb'),
  };
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!projectRef) throw new Error('SUPABASE_PROJECT_REF or --project-ref is required');
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN is required');
  if (!apply) throw new Error('--apply is required; this worker never mutates by default');
  if (desired.growth_percent < 10 || desired.growth_percent > 50) {
    throw new Error('growth-percent must be between 10 and 50');
  }
  if (desired.max_size_gb > 600) throw new Error('max-size-gb may not exceed the approved 600 GB ceiling');

  await fs.mkdir(outputDir, { recursive: true });
  const plan = buildAutoscalePlan({
    projectRef,
    expectedCurrent,
    desired,
    commitSha: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
  });
  await fs.writeFile(path.join(outputDir, 'run_plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

  const before = await readback(projectRef, accessToken);
  if (!configsEqual(before, expectedCurrent)) {
    throw new Error(`preflight refused: observed autoscale config ${JSON.stringify(before)}`);
  }

  let mutationAccepted = false;
  try {
    const response = await applyConfig(projectRef, accessToken, desired);
    mutationAccepted = true;
    const verification = await waitForConfig(projectRef, accessToken, desired);
    if (!verification.matched) {
      throw new Error(`desired autoscale readback did not converge: ${JSON.stringify(verification.observed)}`);
    }
    const result = {
      script_version: SCRIPT_VERSION,
      status: 'applied_verified',
      plan_sha256: plan.plan_sha256,
      before,
      desired,
      readback: verification.observed,
      readback_attempt: verification.attempt,
      management_response: response,
      database_access: false,
      completed_at: new Date().toISOString(),
    };
    await fs.writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    process.stdout.write(`${JSON.stringify({ status: result.status, plan_sha256: result.plan_sha256 })}\n`);
  } catch (error) {
    let rollback = { attempted: false, verified: false, error: null };
    if (mutationAccepted) {
      rollback.attempted = true;
      try {
        await applyConfig(projectRef, accessToken, before);
        const rollbackReadback = await waitForConfig(projectRef, accessToken, before);
        rollback = {
          attempted: true,
          verified: rollbackReadback.matched,
          readback: rollbackReadback.observed,
          error: rollbackReadback.matched ? null : 'rollback readback did not converge',
        };
      } catch (rollbackError) {
        rollback.error = rollbackError.message;
      }
    }
    const failure = {
      script_version: SCRIPT_VERSION,
      status: 'failed',
      plan_sha256: plan.plan_sha256,
      before,
      desired,
      mutation_accepted: mutationAccepted,
      error: error.message,
      rollback,
      database_access: false,
      failed_at: new Date().toISOString(),
    };
    await fs.writeFile(path.join(outputDir, 'failure.json'), `${JSON.stringify(failure, null, 2)}\n`, 'utf8');
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[supabase-disk-autoscale] ${error.message}`);
    process.exitCode = 1;
  });
}
