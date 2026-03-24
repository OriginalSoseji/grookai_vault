// Direct-DB refresh only.
// Derives public.justtcg_variant_prices_latest from
// public.justtcg_variant_price_snapshots using:
//   fetched_at desc, created_at desc, id desc
// as the deterministic latest-row tie-break per variant_id.
//
// Usage:
//   node backend/pricing/justtcg_variant_prices_latest_builder_v1.mjs --dry-run
//   node backend/pricing/justtcg_variant_prices_latest_builder_v1.mjs --apply

import {
  REQUIRED_INDEX_NAME,
  createRefreshPool,
  parseModeArgs,
  runLatestRefreshApply,
  runLatestRefreshDryRun,
} from './justtcg_variant_prices_latest_refresh_v1.mjs';

function printUsageAndExit() {
  console.error(
    '[justtcg-latest-builder] Refusing to run without explicit --dry-run or --apply.',
  );
  process.exit(1);
}

async function main() {
  const options = parseModeArgs(process.argv.slice(2));
  if (!options.apply && !options.dryRun) {
    printUsageAndExit();
  }

  console.log('RUN_CONFIG:');
  console.log(`mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log('reads: direct pg -> justtcg_variant_price_snapshots + justtcg_variants');
  console.log('writes: justtcg_variant_prices_latest');
  console.log('strategy: repeatable-read distinct-on refresh');
  console.log(`required_index: ${REQUIRED_INDEX_NAME}`);
  console.log('tie_break: fetched_at desc, created_at desc, id desc');

  const pool = createRefreshPool('justtcg_variant_prices_latest_builder_v1');

  try {
    if (options.dryRun) {
      await runLatestRefreshDryRun(pool, {
        logPrefix: 'justtcg-latest-builder',
      });
    } else {
      await runLatestRefreshApply(pool, {
        logPrefix: 'justtcg-latest-builder',
      });
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
