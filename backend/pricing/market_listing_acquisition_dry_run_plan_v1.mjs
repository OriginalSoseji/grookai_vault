import { createHash } from "node:crypto";

export const MARKET_LISTING_ACQUISITION_DRY_RUN_PLAN_VERSION = "MEE_11D_MARKET_LISTING_ACQUISITION_DRY_RUN_PLAN_V1";
export const MARKET_LISTING_SCHEMA_MIGRATION_HASH_V1 = "2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4";
export const MARKET_LISTING_SCHEMA_PACKAGE_FINGERPRINT_V1 = "8d8f44b084cb19b4d6af42f3e94fed2f2244de710c946b8f1cc6c87fd0f67451";

export const DEFAULT_DAILY_CALL_CEILING = 4000;
export const DEFAULT_MAX_RESULTS_PER_CALL = 200;
export const DEFAULT_DRY_RUN_TARGET_LIMIT = 1000;

const HIGH_PRIORITY_SET_CODE_PATTERNS = [
  /^wcd/i,
  /^tk-/i,
  /^base-/i,
  /^mcd/i,
  /^mep/i,
  /^bwp/i,
  /^np/i,
  /^ex/i,
];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function quote(value) {
  const text = compact(value).replace(/"/g, "");
  return text ? `"${text}"` : null;
}

function normalizeCard(row) {
  return {
    card_print_id: row.card_print_id ?? row.id ?? null,
    gv_id: row.gv_id ?? null,
    name: compact(row.name),
    set_code: compact(row.set_code).toLowerCase() || null,
    set_name: compact(row.set_name ?? row.sets_name ?? row.expansion_name) || null,
    printed_set_abbrev: compact(row.printed_set_abbrev) || null,
    number: compact(row.number) || null,
    number_plain: compact(row.number_plain) || null,
    rarity: compact(row.rarity) || null,
    variant_key: compact(row.variant_key) || null,
    identity_domain: compact(row.identity_domain) || null,
    printed_identity_modifier: compact(row.printed_identity_modifier) || null,
  };
}

function priorityFor(card) {
  const setCode = card.set_code ?? "";
  const modifier = `${card.printed_identity_modifier ?? ""} ${card.identity_domain ?? ""}`.toLowerCase();
  if (HIGH_PRIORITY_SET_CODE_PATTERNS.some((pattern) => pattern.test(setCode))) return "priority_special_lane";
  if (modifier.includes("world championship")) return "priority_world_championship";
  if (modifier.includes("shadowless") || modifier.includes("1st edition") || modifier.includes("1999-2000")) return "priority_base_print_run";
  if (!card.number_plain || !card.set_code) return "needs_identity_hint";
  if (isLowPriorityRarity(card.rarity)) return "deprioritized_common_rare";
  return "ordinary";
}

function isLowPriorityRarity(rarity) {
  const value = compact(rarity).toLowerCase();
  return value === "common" || value === "uncommon" || value === "rare";
}

function isCollectorRarity(rarity) {
  const value = compact(rarity).toLowerCase();
  return /\b(holo|ultra|secret|illustration|special illustration|hyper|rainbow|gold|shiny|ace spec|double rare|rare holo|holo rare)\b/.test(value);
}

function acquisitionPriorityScore(card) {
  const priority = priorityFor(card);
  const rarity = card.rarity ?? "";
  let score = 100;

  if (priority === "priority_special_lane") score += 1000;
  if (priority === "priority_world_championship") score += 950;
  if (priority === "priority_base_print_run") score += 900;
  if (priority === "needs_identity_hint") score -= 100;
  if (isCollectorRarity(rarity)) score += 200;
  if (isLowPriorityRarity(rarity)) score -= 300;

  return score;
}

function buildQueryTerms(card, strategy) {
  const terms = ["Pokemon", quote(card.name)].filter(Boolean);
  const setName = card.set_name || card.printed_set_abbrev || card.set_code;
  const number = card.number_plain || card.number;

  if (strategy === "strict_identity") {
    if (setName) terms.push(quote(setName));
    if (number) terms.push(quote(number));
  }

  if (strategy === "set_number") {
    if (setName) terms.push(quote(setName));
    if (number) terms.push(number);
  }

  if (strategy === "name_number") {
    if (number) terms.push(number);
  }

  if (strategy === "special_lane") {
    if (setName) terms.push(quote(setName));
    if (number) terms.push(quote(number));
    if (card.printed_identity_modifier) terms.push(quote(card.printed_identity_modifier));
  }

  return compact(terms.filter(Boolean).join(" "));
}

function strategiesFor(card) {
  const priority = priorityFor(card);
  if (priority === "priority_special_lane" || priority === "priority_world_championship" || priority === "priority_base_print_run") {
    return ["special_lane", "strict_identity", "name_number"];
  }
  if (priority === "needs_identity_hint") {
    return ["name_number"];
  }
  if (priority === "deprioritized_common_rare") {
    return ["strict_identity"];
  }
  return ["strict_identity", "set_number"];
}

function buildRequest(card, strategy, ordinal, options) {
  const queryText = buildQueryTerms(card, strategy);
  const queryKey = sha256({
    provider_route: "ebay_browse_api",
    source: "ebay_active",
    strategy,
    query_text: queryText,
    card_print_id: card.card_print_id,
    gv_id: card.gv_id,
  });
  const targetHints = {
    card_print_id: card.card_print_id,
    gv_id: card.gv_id,
    name: card.name,
    set_code: card.set_code,
    set_name: card.set_name,
    printed_set_abbrev: card.printed_set_abbrev,
    number: card.number,
    number_plain: card.number_plain,
    rarity: card.rarity,
    variant_key: card.variant_key,
    priority: priorityFor(card),
    acquisition_priority_score: acquisitionPriorityScore(card),
  };

  return {
    ordinal,
    query_key: queryKey,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    request_status: "planned_not_fetched",
    source_fetch_allowed_by_this_package: false,
    card_print_id: card.card_print_id,
    gv_id: card.gv_id,
    strategy,
    query_text: queryText,
    query_filters: {
      category_ids: ["183454"],
      limit: options.maxResultsPerCall,
      buying_options: ["FIXED_PRICE", "AUCTION"],
      fieldgroups: ["MATCHING_ITEMS"],
    },
    target_hints: targetHints,
    expected_max_result_count: options.maxResultsPerCall,
    expected_call_count: 1,
    cache_status: "planned",
    needs_review: true,
    can_publish_price_directly: false,
    market_truth: false,
    app_visible: false,
  };
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

export function buildMarketListingAcquisitionDryRunPlanV1({
  targets = [],
  generatedAt = new Date().toISOString(),
  dailyCallCeiling = DEFAULT_DAILY_CALL_CEILING,
  maxResultsPerCall = DEFAULT_MAX_RESULTS_PER_CALL,
  dryRunTargetLimit = DEFAULT_DRY_RUN_TARGET_LIMIT,
  schemaMigrationHash = MARKET_LISTING_SCHEMA_MIGRATION_HASH_V1,
  schemaPackageFingerprint = MARKET_LISTING_SCHEMA_PACKAGE_FINGERPRINT_V1,
} = {}) {
  if (!Array.isArray(targets)) {
    throw new Error("[market-listing-dry-run] targets must be an array");
  }
  if (dailyCallCeiling <= 0) {
    throw new Error("[market-listing-dry-run] dailyCallCeiling must be positive");
  }
  if (maxResultsPerCall <= 0) {
    throw new Error("[market-listing-dry-run] maxResultsPerCall must be positive");
  }

  const normalizedTargets = targets
    .map(normalizeCard)
    .filter((card) => card.card_print_id && card.gv_id && card.name)
    .sort((left, right) =>
      acquisitionPriorityScore(right) - acquisitionPriorityScore(left)
      || (right.rarity ?? "").localeCompare(left.rarity ?? "")
      || (left.set_code ?? "").localeCompare(right.set_code ?? "")
      || left.name.localeCompare(right.name)
      || (left.gv_id ?? "").localeCompare(right.gv_id ?? "")
    )
    .slice(0, dryRunTargetLimit);

  const acquisitionRequests = [];
  for (const card of normalizedTargets) {
    for (const strategy of strategiesFor(card)) {
      acquisitionRequests.push(buildRequest(card, strategy, acquisitionRequests.length + 1, { maxResultsPerCall }));
    }
  }

  const requestManifestHash = sha256(acquisitionRequests.map((request) => ({
    query_key: request.query_key,
    card_print_id: request.card_print_id,
    gv_id: request.gv_id,
    strategy: request.strategy,
    query_text: request.query_text,
    query_filters: request.query_filters,
  })));
  const plannedCallCount = acquisitionRequests.reduce((sum, request) => sum + request.expected_call_count, 0);
  const estimatedMaxListingEnvelope = plannedCallCount * maxResultsPerCall;
  const dayCountAtCeiling = plannedCallCount === 0 ? 0 : Math.ceil(plannedCallCount / dailyCallCeiling);
  const findings = [];

  if (normalizedTargets.length === 0) findings.push("no_valid_targets");
  if (plannedCallCount > dailyCallCeiling) findings.push("planned_calls_exceed_single_day_ceiling");
  if (acquisitionRequests.some((request) => request.source_fetch_allowed_by_this_package !== false)) findings.push("source_fetch_allowed_detected");
  if (acquisitionRequests.some((request) => request.can_publish_price_directly !== false)) findings.push("direct_publish_detected");
  if (acquisitionRequests.some((request) => request.market_truth !== false)) findings.push("market_truth_detected");
  if (acquisitionRequests.some((request) => request.app_visible !== false)) findings.push("app_visible_detected");
  if (new Set(acquisitionRequests.map((request) => request.query_key)).size !== acquisitionRequests.length) findings.push("duplicate_query_key_detected");

  const packageFingerprint = sha256({
    package_id: "MARKET-LISTING-ACQUISITION-DRY-RUN-PLAN-V1",
    version: MARKET_LISTING_ACQUISITION_DRY_RUN_PLAN_VERSION,
    schema_migration_hash: schemaMigrationHash,
    schema_package_fingerprint: schemaPackageFingerprint,
    target_count: normalizedTargets.length,
    request_count: acquisitionRequests.length,
    request_manifest_hash: requestManifestHash,
    daily_call_ceiling: dailyCallCeiling,
    max_results_per_call: maxResultsPerCall,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      public_pricing: false,
      app_visible_pricing: false,
    },
  });

  return {
    package_id: "MARKET-LISTING-ACQUISITION-DRY-RUN-PLAN-V1",
    version: MARKET_LISTING_ACQUISITION_DRY_RUN_PLAN_VERSION,
    generated_at: generatedAt,
    mode: "dry_run_plan_only_no_provider_calls_no_writes",
    schema_migration_hash_sha256: schemaMigrationHash,
    schema_package_fingerprint_sha256: schemaPackageFingerprint,
    package_fingerprint_sha256: packageFingerprint,
    request_manifest_hash_sha256: requestManifestHash,
    ready_for_acquisition_approval: findings.length === 0 || findings.every((finding) => finding === "planned_calls_exceed_single_day_ceiling"),
    summary: {
      input_target_count: targets.length,
      planned_target_count: normalizedTargets.length,
      acquisition_request_count: acquisitionRequests.length,
      planned_call_count: plannedCallCount,
      daily_call_ceiling: dailyCallCeiling,
      max_results_per_call: maxResultsPerCall,
      estimated_max_listing_envelope: estimatedMaxListingEnvelope,
      estimated_day_count_at_ceiling: dayCountAtCeiling,
      priority_counts: countBy(normalizedTargets, priorityFor),
      rarity_priority_counts: countBy(normalizedTargets, (card) => isLowPriorityRarity(card.rarity) ? "low_priority_common_rare" : "normal_or_collector_priority"),
      strategy_counts: countBy(acquisitionRequests, (request) => request.strategy),
    },
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      market_listing_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      merges: false,
      global_apply: false,
    },
    next_allowed_step_after_approval: {
      package_id: "MARKET-LISTING-ACQUISITION-SMOKE-FETCH-V1",
      scope: "fetch a capped smoke batch of eBay active listing responses into local artifacts only",
      still_disallowed: [
        "DB writes",
        "pricing_observations writes",
        "ebay_active_prices_latest writes",
        "public pricing",
        "app-visible pricing",
        "public price rollups",
      ],
    },
    findings,
    acquisition_requests: acquisitionRequests,
  };
}
