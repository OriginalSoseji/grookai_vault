import { createHash } from "node:crypto";

export const MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_ACQUISITION_PLAN_VERSION = "MEE_09P_REMAINING_SINGLE_SOURCE_EXACT_SOURCE_ACQUISITION_PLAN_V1";
export const EXPECTED_MEE_09O_PLAN_HASH = "26025f364fef1fc76213523120aa3b2515f866925bf2f3f7e7aa22a832eca47b";
export const EXPECTED_TARGET_COUNT = 18;
export const EXPECTED_ROUTE_COUNT = 54;

const EXPECTED_SOURCE_COUNTS = Object.freeze({
  ebay_active: 18,
  ebay_sold_candidate: 18,
  manual_review_candidate: 18,
});

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

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === "") continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function buildRequest({ target, route, ordinal }) {
  const routeKey = sha256({
    card_print_id: target.card_print_id,
    gv_id: target.gv_id,
    source: route.source,
    query_text: route.query_text,
    query_kind: route.query_kind,
  });

  return {
    ordinal,
    acquisition_request_key: routeKey,
    card_print_id: target.card_print_id,
    gv_id: target.gv_id,
    name: target.name,
    set_code: target.set_code ?? null,
    provider_number: target.provider_number ?? target.number_plain ?? null,
    number_plain: target.number_plain ?? null,
    family: target.family ?? null,
    source: route.source,
    source_type: route.source_type,
    acquisition_mode: route.acquisition_mode,
    query_kind: route.query_kind,
    query_text: compact(route.query_text),
    source_url_template: route.search_url_template ?? null,
    acquisition_status: "planned_not_fetched",
    evidence_status: "not_created",
    storage_target: "local_artifact_only",
    candidate_contract: "MARKET_EVIDENCE_OBJECT_CONTRACT_V1",
    can_publish_price_directly: false,
    needs_review: true,
    requires_review_before_truth: route.requires_review_before_truth === true,
    source_fetch_allowed_by_this_package: false,
    inclusion_hints: Array.isArray(route.inclusion_hints) ? route.inclusion_hints : [],
    exclusion_hints: Array.isArray(route.exclusion_hints) ? route.exclusion_hints : [],
    evidence_goal: route.evidence_goal ?? null,
    worklist_reasons: Array.isArray(target.worklist_reasons) ? target.worklist_reasons : [],
  };
}

function validateSourceCounts(sourceCounts) {
  return Object.entries(EXPECTED_SOURCE_COUNTS)
    .filter(([source, count]) => sourceCounts[source] !== count)
    .map(([source]) => `source_count_mismatch:${source}`);
}

export function buildRemainingSingleSourceExactSourceAcquisitionPlanV1({
  exactPlan,
  expectedPlanHash = EXPECTED_MEE_09O_PLAN_HASH,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!exactPlan || typeof exactPlan !== "object") {
    throw new Error("[remaining-single-source-exact-acquisition] exactPlan is required");
  }
  if (!Array.isArray(exactPlan.targets)) {
    throw new Error("[remaining-single-source-exact-acquisition] exactPlan.targets must be an array");
  }

  const requests = [];
  for (const target of exactPlan.targets) {
    if (!Array.isArray(target.exact_routes)) continue;
    for (const route of target.exact_routes) {
      requests.push(buildRequest({ target, route, ordinal: requests.length + 1 }));
    }
  }

  const sourceCounts = countBy(requests, (request) => request.source);
  const acquisitionRequestManifestHash = sha256(requests.map((request) => ({
    acquisition_request_key: request.acquisition_request_key,
    card_print_id: request.card_print_id,
    gv_id: request.gv_id,
    source: request.source,
    query_text: request.query_text,
    source_url_template: request.source_url_template,
  })));
  const findings = [];

  if (exactPlan.plan_hash !== expectedPlanHash) findings.push("plan_hash_mismatch");
  if (exactPlan.ready !== true) findings.push("exact_plan_not_ready");
  if (exactPlan.summary?.target_count !== EXPECTED_TARGET_COUNT) findings.push("target_count_mismatch");
  if (requests.length !== EXPECTED_ROUTE_COUNT) findings.push("route_count_mismatch");
  findings.push(...validateSourceCounts(sourceCounts));
  if (requests.some((request) => request.acquisition_status !== "planned_not_fetched")) findings.push("request_not_plan_only");
  if (requests.some((request) => request.evidence_status !== "not_created")) findings.push("evidence_object_created");
  if (requests.some((request) => request.source_fetch_allowed_by_this_package !== false)) findings.push("source_fetch_allowed_detected");
  if (requests.some((request) => request.can_publish_price_directly !== false)) findings.push("direct_publish_detected");
  if (requests.some((request) => request.source !== "manual_review_candidate" && !request.source_url_template)) findings.push("missing_source_url_template");
  if (requests.some((request) => !["ebay_active", "ebay_sold_candidate", "manual_review_candidate"].includes(request.source))) findings.push("unexpected_source_detected");

  const packageFingerprint = sha256({
    package_id: "MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-ACQUISITION-V1",
    version: MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_ACQUISITION_PLAN_VERSION,
    exact_plan_hash: exactPlan.plan_hash,
    expected_plan_hash: expectedPlanHash,
    target_count: exactPlan.summary?.target_count ?? null,
    route_count: requests.length,
    source_counts: sourceCounts,
    acquisition_request_manifest_hash: acquisitionRequestManifestHash,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
    },
  });

  return {
    package_id: "MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-ACQUISITION-V1",
    version: MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_ACQUISITION_PLAN_VERSION,
    generated_at: generatedAt,
    mode: "acquisition_package_plan_only_no_fetch_no_writes",
    exact_plan_hash_sha256: exactPlan.plan_hash ?? null,
    expected_exact_plan_hash_sha256: expectedPlanHash,
    package_fingerprint_sha256: packageFingerprint,
    acquisition_request_manifest_hash_sha256: acquisitionRequestManifestHash,
    source_worklist_artifact: exactPlan.source_worklist_artifact ?? null,
    exact_plan_artifact: exactPlan.artifact_path ?? null,
    summary: {
      target_count: exactPlan.summary?.target_count ?? 0,
      acquisition_request_count: requests.length,
      source_counts: sourceCounts,
      family_counts: exactPlan.summary?.family_counts ?? {},
    },
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
      price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      merges: false,
      global_apply: false,
    },
    next_allowed_step_after_approval: {
      package_id: "MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-FETCH-V1",
      scope: "fetch exact evidence candidates for the queued acquisition requests only",
      still_disallowed: [
        "pricing_observations writes",
        "ebay_active_prices_latest writes",
        "public pricing",
        "app-visible pricing",
        "price rollups",
      ],
    },
    findings,
    ready_for_fetch_approval: findings.length === 0,
    acquisition_requests: requests,
  };
}
