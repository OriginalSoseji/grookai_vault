import { createReadStream, writeFileSync } from "node:fs";
import readline from "node:readline";

import {
  MARKET_LISTING_ACQUISITION_ADAPTIVE_YIELD_VERSION,
  adaptiveRequestFamilyKeyV1,
  providerCallLaneForRequest,
  shouldSkipAdaptiveRequestV1,
  updateAdaptiveFamilyStateV1,
} from "../../backend/pricing/market_listing_acquisition_adaptive_yield_v1.mjs";

function parseArgs(argv) {
  const input = argv.find((arg) => arg.startsWith("--input="))?.slice("--input=".length);
  const output = argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length) ?? null;
  const providerCallCeiling = Number.parseInt(argv.find((arg) => arg.startsWith("--provider-call-ceiling="))?.slice("--provider-call-ceiling=".length) ?? "4000", 10);
  const discoveryCallShare = Number.parseFloat(argv.find((arg) => arg.startsWith("--discovery-call-share="))?.slice("--discovery-call-share=".length) ?? "0.9");
  if (!input) throw new Error("--input=<raw_snapshots.jsonl> is required");
  if (!Number.isFinite(providerCallCeiling) || providerCallCeiling <= 0) throw new Error("--provider-call-ceiling must be positive");
  if (!Number.isFinite(discoveryCallShare) || discoveryCallShare < 0 || discoveryCallShare > 1) throw new Error("--discovery-call-share must be between 0 and 1");
  return { input, output, providerCallCeiling, discoveryCallShare };
}

function countInto(counts, key, amount = 1) {
  counts[key] = (counts[key] ?? 0) + amount;
}

function sortedObject(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function requestFromSnapshot(snapshot) {
  const url = new URL(snapshot.source_fetch_url);
  return {
    ordinal: snapshot.request_ordinal,
    query_key: snapshot.query_key,
    source: snapshot.source,
    provider_route: snapshot.provider_route,
    strategy: snapshot.strategy,
    query_text: url.searchParams.get("q") ?? "",
    query_filters: {
      category_ids: (url.searchParams.get("category_ids") ?? "").split(",").filter(Boolean),
      limit: Number.parseInt(url.searchParams.get("limit") ?? "200", 10),
      buying_options: [],
      fieldgroups: (url.searchParams.get("fieldgroups") ?? "").split(",").filter(Boolean),
    },
    offset: Number.parseInt(url.searchParams.get("offset") ?? "0", 10),
    card_print_id: snapshot.card_print_id ?? null,
    card_printing_id: snapshot.card_printing_id ?? null,
  };
}

async function readCompactSnapshots(input) {
  const families = new Map();
  const rl = readline.createInterface({
    input: createReadStream(input, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let rowCount = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const snapshot = JSON.parse(line);
    const request = requestFromSnapshot(snapshot);
    const familyKey = adaptiveRequestFamilyKeyV1(request);
    const rows = families.get(familyKey) ?? [];
    rows.push({
      request,
      response: {
        provider_total: snapshot.provider_total,
        fetched_item_count: snapshot.fetched_item_count,
        projected_observations: (snapshot.projected_observations ?? []).map((observation) => ({
          source_listing_id: observation.source_listing_id,
        })),
      },
    });
    families.set(familyKey, rows);
    rowCount += 1;
  }
  return { families, rowCount };
}

function replayFamilies({ families, rowCount, providerCallCeiling, discoveryCallShare }) {
  const currentStrategyCalls = {};
  const currentStrategyItems = {};
  const retainedStrategyCalls = {};
  const retainedStrategyItems = {};
  const avoidedStrategyCalls = {};
  const avoidedReasonCounts = {};
  const laneCalls = {};
  const laneItems = {};
  const uniqueCurrentListings = new Set();
  const uniqueRetainedListings = new Set();
  let currentFetchedItems = 0;
  let retainedCalls = 0;
  let retainedFetchedItems = 0;
  let repeatedPageCalls = 0;

  for (const pages of families.values()) {
    pages.sort((left, right) => left.request.offset - right.request.offset || left.request.ordinal - right.request.ordinal);
    let familyState = null;
    for (const page of pages) {
      const { request, response } = page;
      const strategy = request.strategy ?? "unknown";
      const lane = providerCallLaneForRequest(request);
      const itemCount = Number(response.fetched_item_count) || 0;
      countInto(currentStrategyCalls, strategy);
      countInto(currentStrategyItems, strategy, itemCount);
      currentFetchedItems += itemCount;
      for (const observation of response.projected_observations) {
        if (observation.source_listing_id) uniqueCurrentListings.add(observation.source_listing_id);
      }

      const skip = shouldSkipAdaptiveRequestV1({ request, familyState });
      if (skip) {
        countInto(avoidedStrategyCalls, strategy);
        countInto(avoidedReasonCounts, skip.reason);
        continue;
      }

      const nextState = updateAdaptiveFamilyStateV1({ request, response, previousState: familyState });
      familyState = nextState;
      retainedCalls += 1;
      countInto(retainedStrategyCalls, strategy);
      countInto(laneCalls, lane);
      if (nextState.repeated_page) {
        repeatedPageCalls += 1;
        continue;
      }
      retainedFetchedItems += itemCount;
      countInto(retainedStrategyItems, strategy, itemCount);
      countInto(laneItems, lane, itemCount);
      for (const observation of response.projected_observations) {
        if (observation.source_listing_id) uniqueRetainedListings.add(observation.source_listing_id);
      }
    }
  }

  const discoveryCallCeiling = Math.round(providerCallCeiling * discoveryCallShare);
  const precisionCallCeiling = providerCallCeiling - discoveryCallCeiling;
  const discoveryObservedYield = (laneItems.discovery ?? 0) / Math.max(1, laneCalls.discovery ?? 0);
  const precisionObservedYield = (laneItems.precision ?? 0) / Math.max(1, laneCalls.precision ?? 0);
  const projectedFetchedItems = Math.round(
    discoveryCallCeiling * discoveryObservedYield
    + precisionCallCeiling * precisionObservedYield,
  );
  const theoreticalEnvelope = providerCallCeiling * 200;
  const currentUniqueRatio = uniqueCurrentListings.size / Math.max(1, currentFetchedItems);
  const disabledStrategyCalls = ["set_shelf_language", "set_shelf_sealed", "set_shelf_slabs"]
    .reduce((sum, strategy) => sum + (currentStrategyCalls[strategy] ?? 0), 0);
  const disabledStrategyItems = ["set_shelf_language", "set_shelf_sealed", "set_shelf_slabs"]
    .reduce((sum, strategy) => sum + (currentStrategyItems[strategy] ?? 0), 0);

  return {
    package_id: "MARKET-LISTING-ACQUISITION-ADAPTIVE-YIELD-REPLAY-V1",
    version: MARKET_LISTING_ACQUISITION_ADAPTIVE_YIELD_VERSION,
    mode: "offline_replay_no_provider_calls_no_db_writes",
    source: {
      snapshot_row_count: rowCount,
      family_count: families.size,
    },
    current_run: {
      provider_call_count: rowCount,
      theoretical_result_envelope: rowCount * 200,
      fetched_item_count: currentFetchedItems,
      unique_listing_count: uniqueCurrentListings.size,
      result_envelope_fill_rate: currentFetchedItems / Math.max(1, rowCount * 200),
      strategy_call_counts: sortedObject(currentStrategyCalls),
      strategy_item_counts: sortedObject(currentStrategyItems),
    },
    counterfactual_replay: {
      retained_provider_call_count: retainedCalls,
      avoidable_provider_call_count: rowCount - retainedCalls,
      retained_fetched_item_count: retainedFetchedItems,
      retained_unique_listing_count: uniqueRetainedListings.size,
      repeated_page_call_count: repeatedPageCalls,
      avoided_reason_counts: sortedObject(avoidedReasonCounts),
      avoided_strategy_call_counts: sortedObject(avoidedStrategyCalls),
      retained_strategy_call_counts: sortedObject(retainedStrategyCalls),
      retained_strategy_item_counts: sortedObject(retainedStrategyItems),
    },
    proposed_policy_projection: {
      provider_call_ceiling: providerCallCeiling,
      discovery_call_share: discoveryCallShare,
      discovery_call_ceiling: discoveryCallCeiling,
      precision_call_ceiling: precisionCallCeiling,
      observed_discovery_items_per_valid_call: discoveryObservedYield,
      observed_precision_items_per_valid_call: precisionObservedYield,
      projected_fetched_item_count: projectedFetchedItems,
      projected_result_envelope_fill_rate: projectedFetchedItems / theoreticalEnvelope,
      projected_unique_listing_count_at_current_overlap_rate: Math.round(projectedFetchedItems * currentUniqueRatio),
      theoretical_result_envelope: theoreticalEnvelope,
      disabled_low_or_zero_yield_strategy_call_count: disabledStrategyCalls,
      disabled_low_or_zero_yield_strategy_item_count: disabledStrategyItems,
      calls_reallocated_to_discovery: Math.max(0, discoveryCallCeiling - ((currentStrategyCalls.set_shelf_broad ?? 0) + (currentStrategyCalls.set_shelf_singles ?? 0))),
    },
    boundary: {
      provider_calls: false,
      db_writes: false,
      production_changes: false,
    },
  };
}

const args = parseArgs(process.argv.slice(2));
const compact = await readCompactSnapshots(args.input);
const report = replayFamilies({
  ...compact,
  providerCallCeiling: args.providerCallCeiling,
  discoveryCallShare: args.discoveryCallShare,
});
const output = `${JSON.stringify(report, null, 2)}\n`;
if (args.output) writeFileSync(args.output, output);
else process.stdout.write(output);
