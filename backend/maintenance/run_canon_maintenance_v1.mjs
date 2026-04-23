import '../env.mjs';

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANON_MAINTENANCE_DRY_RUN_ENV_V1,
  CANON_MAINTENANCE_ENABLE_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_V1,
  CANON_MAINTENANCE_MODE_ENV_V1,
  CANON_MAINTENANCE_TASK_ENV_V1,
  getCanonMaintenanceDryRun,
} from './canon_maintenance_boundary_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export const CANON_MAINTENANCE_FILES_V1 = [
  'backend/domain/domain_baseline_card_prints_v1.mjs',
  'backend/domain/domain_baseline_sets_v1.mjs',
  'backend/ingestion/justtcg_bridge_insert_only_apply_v1.mjs',
  'backend/ingestion/justtcg_tcgplayer_bridge_backfill_apply_v1.mjs',
  'backend/infra/backfill_print_identity_worker.mjs',
  'backend/pricing/ba_phase9_ba_canon_promote_v2.mjs',
  'backend/pricing/ba_phase9a_parent_verify_v1.mjs',
  'backend/pricing/ba_promote_v1.mjs',
  'backend/pricing/justtcg_variant_prices_latest_repair_v1.mjs',
  'backend/pricing/justtcg_variant_prices_latest_refresh_v1.mjs',
  'backend/pricing/promote_justtcg_direct_structure_mapping_v1.mjs',
  'backend/pricing/promote_tcgdex_bridge_to_justtcg_mapping_v1.mjs',
  'backend/pricing/promote_tcgplayer_to_justtcg_mapping_v1.mjs',
].sort();

export const CANON_MAINTENANCE_TASKS_V1 = CANON_MAINTENANCE_FILES_V1.filter(
  (taskPath) => taskPath !== 'backend/pricing/justtcg_variant_prices_latest_refresh_v1.mjs',
);

function normalizeTaskName(taskName) {
  return String(taskName ?? '').trim().replace(/\\/g, '/');
}

function resolveCanonMaintenanceTaskV1(taskName, availableTasks = CANON_MAINTENANCE_TASKS_V1) {
  const normalizedTaskName = normalizeTaskName(taskName);
  if (!normalizedTaskName) {
    throw new Error(
      `RUNTIME_ENFORCEMENT: ${CANON_MAINTENANCE_TASK_ENV_V1} is required.`,
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
      `RUNTIME_ENFORCEMENT: canon maintenance task "${normalizedTaskName}" is ambiguous. Use the repo-relative path instead.`,
    );
  }

  throw new Error(
    `RUNTIME_ENFORCEMENT: unknown canon maintenance task "${normalizedTaskName}".`,
  );
}

function assertCanonMaintenanceBoundaryEnabledV1() {
  if (process.env[CANON_MAINTENANCE_ENABLE_ENV_V1] !== 'true') {
    throw new Error(
      'RUNTIME_ENFORCEMENT: canon maintenance is disabled. Set ENABLE_CANON_MAINTENANCE_MODE=true.',
    );
  }

  if (process.env[CANON_MAINTENANCE_MODE_ENV_V1] !== 'EXPLICIT') {
    throw new Error(
      "RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be 'EXPLICIT'.",
    );
  }
}

export async function runCanonMaintenanceV1(options = {}) {
  assertCanonMaintenanceBoundaryEnabledV1();

  const taskName = options.task ?? process.env[CANON_MAINTENANCE_TASK_ENV_V1];
  const resolvedTaskPath = resolveCanonMaintenanceTaskV1(taskName);
  const scriptPath = path.join(REPO_ROOT, resolvedTaskPath);
  const childEnv = {
    ...process.env,
    [CANON_MAINTENANCE_ENTRYPOINT_ENV_V1]: CANON_MAINTENANCE_ENTRYPOINT_V1,
    [CANON_MAINTENANCE_TASK_ENV_V1]: resolvedTaskPath,
  };
  const args = [scriptPath];

  if (process.env[CANON_MAINTENANCE_DRY_RUN_ENV_V1] === undefined) {
    childEnv[CANON_MAINTENANCE_DRY_RUN_ENV_V1] = 'true';
  }

  const dryRun = getCanonMaintenanceDryRun();
  args.push(dryRun ? '--dry-run' : '--apply');

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
  assertCanonMaintenanceBoundaryEnabledV1();
  const result = await runCanonMaintenanceV1();
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
