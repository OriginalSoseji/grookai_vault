import { readFileSync, writeFileSync } from "node:fs";

import { buildMarketListingAcquisitionDailyBatchPlanV1 } from "../../backend/pricing/market_listing_acquisition_daily_batch_plan_v1.mjs";
import { buildMarketListingAcquisitionDryRunPlanV1 } from "../../backend/pricing/market_listing_acquisition_dry_run_plan_v1.mjs";

function parseArgs(argv) {
  const input = argv.find((arg) => arg.startsWith("--input="))?.slice("--input=".length);
  const output = argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length) ?? null;
  if (!input) throw new Error("--input=<prior dry-run plan.json> is required");
  return { input, output };
}

function sourceTargets(plan) {
  const targets = new Map();
  for (const request of plan?.acquisition_requests ?? []) {
    if (request?.strategy?.startsWith("set_shelf_")) continue;
    const target = request?.target_hints;
    const key = target?.card_printing_id ?? target?.card_print_id ?? target?.gv_id;
    if (!key || targets.has(key)) continue;
    targets.set(key, target);
  }
  return [...targets.values()];
}

const args = parseArgs(process.argv.slice(2));
const sourcePlan = JSON.parse(readFileSync(args.input, "utf8"));
const targets = sourceTargets(sourcePlan);
const dryRunPlan = buildMarketListingAcquisitionDryRunPlanV1({
  targets,
  generatedAt: sourcePlan.generated_at,
  dailyCallCeiling: 4000,
  dryRunTargetLimit: targets.length,
});
const adaptivePlan = buildMarketListingAcquisitionDailyBatchPlanV1({
  dryRunPlan,
  generatedAt: sourcePlan.generated_at,
  callLimit: 4000,
  adaptiveYield: true,
  candidateMultiplier: 3,
  discoveryCallShare: 0.9,
});
const report = {
  package_id: "MARKET-LISTING-ACQUISITION-ADAPTIVE-CANDIDATE-REPLAY-V1",
  mode: "offline_candidate_replay_no_provider_calls_no_db_writes",
  source: {
    package_fingerprint_sha256: sourcePlan.package_fingerprint_sha256 ?? null,
    request_count: sourcePlan.acquisition_requests?.length ?? 0,
    recovered_target_count: targets.length,
    strategy_counts: sourcePlan.summary?.strategy_counts ?? {},
  },
  regenerated_dry_run: {
    package_fingerprint_sha256: dryRunPlan.package_fingerprint_sha256,
    request_count: dryRunPlan.summary.acquisition_request_count,
    set_shelf_request_count: dryRunPlan.summary.set_shelf_request_count,
    strategy_counts: dryRunPlan.summary.strategy_counts,
    findings: dryRunPlan.findings,
  },
  adaptive_daily_plan: {
    package_fingerprint_sha256: adaptivePlan.package_fingerprint_sha256,
    request_manifest_hash_sha256: adaptivePlan.request_manifest_hash_sha256,
    ready_for_acquisition_approval: adaptivePlan.ready_for_acquisition_approval,
    summary: adaptivePlan.summary,
    findings: adaptivePlan.findings,
  },
  assertions: {
    provider_call_ceiling_is_4000: adaptivePlan.summary.provider_call_ceiling === 4000,
    discovery_candidate_pool_covers_ceiling: adaptivePlan.summary.candidate_lane_counts?.discovery >= adaptivePlan.summary.provider_call_lane_ceilings?.discovery,
    precision_candidate_pool_covers_ceiling: adaptivePlan.summary.candidate_lane_counts?.precision >= adaptivePlan.summary.provider_call_lane_ceilings?.precision,
    disabled_strategy_candidates_are_zero: Object.keys(adaptivePlan.summary.disabled_strategy_counts ?? {}).length === 0,
    no_provider_calls: adaptivePlan.boundary.provider_calls === false,
    no_db_writes: adaptivePlan.boundary.db_writes === false,
  },
  boundary: {
    provider_calls: false,
    db_writes: false,
    production_changes: false,
  },
};
const output = `${JSON.stringify(report, null, 2)}\n`;
if (args.output) writeFileSync(args.output, output);
else process.stdout.write(output);
