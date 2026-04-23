import '../env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  IDENTITY_MAINTENANCE_DRY_RUN_ENV_V1,
  IDENTITY_MAINTENANCE_ENABLE_ENV_V1,
  IDENTITY_MAINTENANCE_ENTRYPOINT_ENV_V1,
  IDENTITY_MAINTENANCE_ENTRYPOINT_V1,
  IDENTITY_MAINTENANCE_MODE_ENV_V1,
  IDENTITY_MAINTENANCE_TASK_ENV_V1,
  getIdentityMaintenanceDryRunV1,
} from './identity_maintenance_boundary_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const IDENTITY_DIR = path.join(REPO_ROOT, 'backend', 'identity');
const IDENTITY_TASK_PATTERN = /(apply|repair|migration|replay).*\.mjs$/i;

async function collectIdentityMaintenanceTasksV1() {
  const entries = await fs.readdir(IDENTITY_DIR, { withFileTypes: true });
  const identityTasks = entries
    .filter((entry) => entry.isFile() && IDENTITY_TASK_PATTERN.test(entry.name))
    .map((entry) => path.posix.join('backend', 'identity', entry.name));

  return identityTasks.sort();
}

function normalizeTaskName(taskName) {
  return String(taskName ?? '').trim().replace(/\\/g, '/');
}

function resolveIdentityMaintenanceTaskV1(taskName, availableTasks) {
  const normalizedTaskName = normalizeTaskName(taskName);
  if (!normalizedTaskName) {
    throw new Error(
      `RUNTIME_ENFORCEMENT: ${IDENTITY_MAINTENANCE_TASK_ENV_V1} is required.`,
    );
  }

  if (availableTasks.includes(normalizedTaskName)) {
    return normalizedTaskName;
  }

  const basenameMatches = availableTasks.filter((taskPath) => {
    const basename = path.posix.basename(taskPath, '.mjs');
    return basename === normalizedTaskName || `${basename}.mjs` === normalizedTaskName;
  });

  if (basenameMatches.length === 1) {
    return basenameMatches[0];
  }

  if (basenameMatches.length > 1) {
    throw new Error(
      `RUNTIME_ENFORCEMENT: identity maintenance task "${normalizedTaskName}" is ambiguous. Use the repo-relative path instead.`,
    );
  }

  throw new Error(
    `RUNTIME_ENFORCEMENT: unknown identity maintenance task "${normalizedTaskName}".`,
  );
}

function assertIdentityMaintenanceBoundaryEnabledV1() {
  if (process.env[IDENTITY_MAINTENANCE_ENABLE_ENV_V1] !== 'true') {
    throw new Error(
      'RUNTIME_ENFORCEMENT: identity maintenance scripts are disabled. Set ENABLE_IDENTITY_MAINTENANCE_MODE=true for explicit use.',
    );
  }

  if (process.env[IDENTITY_MAINTENANCE_MODE_ENV_V1] !== 'EXPLICIT') {
    throw new Error(
      "RUNTIME_ENFORCEMENT: IDENTITY_MAINTENANCE_MODE must be 'EXPLICIT'",
    );
  }
}

export async function runIdentityMaintenanceV1(options = {}) {
  assertIdentityMaintenanceBoundaryEnabledV1();

  const availableTasks = await collectIdentityMaintenanceTasksV1();
  const taskName = options.task ?? process.env[IDENTITY_MAINTENANCE_TASK_ENV_V1];
  const resolvedTaskPath = resolveIdentityMaintenanceTaskV1(taskName, availableTasks);
  const scriptPath = path.join(REPO_ROOT, resolvedTaskPath);
  const childEnv = {
    ...process.env,
    [IDENTITY_MAINTENANCE_ENTRYPOINT_ENV_V1]: IDENTITY_MAINTENANCE_ENTRYPOINT_V1,
    [IDENTITY_MAINTENANCE_TASK_ENV_V1]: resolvedTaskPath,
  };
  const args = [scriptPath];

  if (process.env[IDENTITY_MAINTENANCE_DRY_RUN_ENV_V1] === undefined) {
    childEnv[IDENTITY_MAINTENANCE_DRY_RUN_ENV_V1] = 'true';
  }

  const dryRun = getIdentityMaintenanceDryRunV1();
  if (!dryRun) {
    args.push('--apply');
  }

  execFileSync(process.execPath, args, {
    cwd: REPO_ROOT,
    env: childEnv,
    stdio: 'inherit',
  });

  return {
    ok: true,
    task_name: resolvedTaskPath,
    dry_run: dryRun,
  };
}

async function main() {
  const result = await runIdentityMaintenanceV1();
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
