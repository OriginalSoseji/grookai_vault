/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * This script mutates canonical data outside runtime executor.
 *
 * RULES:
 * - not part of runtime authority
 * - must not be imported into application code
 * - requires explicit maintenance mode
 * - defaults to DRY RUN
 */
import '../env.mjs';

import {
  getCanonMaintenanceDryRun,
} from '../maintenance/canon_maintenance_boundary_v1.mjs';
import {
  createRefreshPool,
  parseModeArgs,
  runLatestRefreshApply,
  runLatestRefreshDryRun,
} from './justtcg_variant_prices_latest_refresh_v1.mjs';

if (!process.env.ENABLE_CANON_MAINTENANCE_MODE) {
  throw new Error(
    'RUNTIME_ENFORCEMENT: canon maintenance is disabled. Set ENABLE_CANON_MAINTENANCE_MODE=true.',
  );
}

if (process.env.CANON_MAINTENANCE_MODE !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be 'EXPLICIT'.",
  );
}

if (process.env.CANON_MAINTENANCE_ENTRYPOINT !== 'backend/maintenance/run_canon_maintenance_v1.mjs') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: canon maintenance scripts must be launched from backend/maintenance/run_canon_maintenance_v1.mjs.',
  );
}

const DRY_RUN = getCanonMaintenanceDryRun();

if (DRY_RUN) {
  console.log('CANON MAINTENANCE: DRY RUN');
}

function printUsageAndExit() {
  console.error(
    '[justtcg-latest-repair] Refusing to run without explicit --dry-run or --apply.',
  );
  process.exit(1);
}

async function main() {
  const options = parseModeArgs(process.argv.slice(2));
  if (!options.apply && !options.dryRun) {
    printUsageAndExit();
  }

  const pool = createRefreshPool('justtcg_variant_prices_latest_repair_v1');

  try {
    if (options.dryRun) {
      await runLatestRefreshDryRun(pool, {
        logPrefix: 'justtcg-latest-repair',
      });
    } else {
      await runLatestRefreshApply(pool, {
        logPrefix: 'justtcg-latest-repair',
      });
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : `[justtcg-latest-repair] ${String(error)}`,
  );
  process.exit(1);
});
