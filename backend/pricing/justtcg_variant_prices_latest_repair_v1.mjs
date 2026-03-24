import {
  createRefreshPool,
  parseModeArgs,
  runLatestRefreshApply,
  runLatestRefreshDryRun,
} from './justtcg_variant_prices_latest_refresh_v1.mjs';

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
