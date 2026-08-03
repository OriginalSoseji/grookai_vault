import { createHash } from "node:crypto";

import { validateMarketListingProviderCategoryRegistryV2 } from "./market_listing_provider_category_registry_v2.mjs";

export const MARKET_LISTING_ACQUISITION_WAREHOUSE_PLAN_VERSION = "MEE_MARKET_LISTING_ACQUISITION_WAREHOUSE_PLAN_V2";
export const DEFAULT_WAREHOUSE_PROVIDER_CALL_CEILING = 4000;
export const DEFAULT_WAREHOUSE_RESULT_LIMIT = 200;

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
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function quote(value) {
  const text = compact(value).replaceAll('"', "");
  return text ? `"${text}"` : "";
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) counts[key(row)] = (counts[key(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function normalizeSets(targets) {
  const sets = new Map();
  for (const target of targets ?? []) {
    const setCode = compact(target?.set_code ?? target?.setCode);
    const setName = compact(target?.set_name ?? target?.setName);
    if (!setCode || !setName) continue;
    const current = sets.get(setCode) ?? {
      set_code: setCode,
      set_name: setName,
      release_date: target?.release_date ?? null,
      card_count: 0,
    };
    current.card_count += 1;
    if (target?.release_date && (!current.release_date || target.release_date > current.release_date)) current.release_date = target.release_date;
    sets.set(setCode, current);
  }
  return [...sets.values()].sort((left, right) =>
    String(right.release_date ?? "").localeCompare(String(left.release_date ?? ""))
    || right.card_count - left.card_count
    || left.set_name.localeCompare(right.set_name));
}

function requestFor({ set, productKind, route, querySuffix, offset, ordinal, resultLimit }) {
  const suffix = querySuffix ?? "";
  const queryText = compact(`Pokemon ${quote(set.set_name)} ${suffix}`);
  const queryKey = sha256({
    provider_route: "ebay_browse_api",
    product_kind: productKind,
    set_code: set.set_code,
    query_text: queryText,
    category_ids: route.category_ids,
    offset,
  });
  return {
    ordinal,
    query_key: queryKey,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    request_status: "planned_not_fetched",
    acquisition_mode: "warehouse_first",
    acquisition_product_kind: productKind,
    provider_call_lane: productKind,
    strategy: `warehouse_${productKind}_discovery`,
    query_text: queryText,
    query_filters: {
      category_ids: route.category_ids,
      limit: resultLimit,
      buying_options: ["FIXED_PRICE", "AUCTION"],
      fieldgroups: ["MATCHING_ITEMS"],
    },
    offset,
    card_print_id: null,
    card_printing_id: null,
    gv_id: null,
    printing_gv_id: null,
    target_hints: {
      target_kind: "provider_category_shelf",
      set_code: set.set_code,
      set_name: set.set_name,
      release_date: set.release_date,
      acquisition_product_kind: productKind,
      canonical_assignment_status: "deferred",
      card_matching_deferred: true,
      provider_category_provenance: route.provenance,
      query_suffix: suffix || null,
    },
    expected_max_result_count: resultLimit,
    expected_call_count: 1,
    can_publish_price_directly: false,
    market_truth: false,
    app_visible: false,
  };
}

export function buildMarketListingAcquisitionWarehousePlanV2({
  targets = [],
  categoryRegistry,
  generatedAt = new Date().toISOString(),
  providerCallCeiling = DEFAULT_WAREHOUSE_PROVIDER_CALL_CEILING,
  resultLimit = DEFAULT_WAREHOUSE_RESULT_LIMIT,
  maxPagesPerFamily = 50,
  minimumProviderCallsByProductKind = { raw_single: 1, graded_single: 1, sealed_product: 1 },
} = {}) {
  const findings = validateMarketListingProviderCategoryRegistryV2(categoryRegistry);
  const sets = normalizeSets(targets);
  if (sets.length === 0) findings.push("no_valid_set_targets");
  const ceiling = Math.max(1, Number(providerCallCeiling) || DEFAULT_WAREHOUSE_PROVIDER_CALL_CEILING);
  const limit = Math.max(1, Math.min(Number(resultLimit) || DEFAULT_WAREHOUSE_RESULT_LIMIT, 200));
  const pageCount = Math.max(1, Math.min(Number(maxPagesPerFamily) || 1, 50));
  const requests = [];

  if (findings.length === 0) {
    const productKinds = ["raw_single", "graded_single", "sealed_product"];
    for (let page = 0; page < pageCount; page += 1) {
      for (const set of sets) {
        for (const productKind of productKinds) {
          const route = categoryRegistry.routes[productKind];
          const suffixes = route.query_suffixes?.length ? route.query_suffixes : [""];
          for (const querySuffix of suffixes) {
            requests.push(requestFor({
              set,
              productKind,
              route,
              querySuffix,
              offset: page * limit,
              ordinal: requests.length + 1,
              resultLimit: limit,
            }));
          }
        }
      }
    }
  }

  if (requests.some((request) => request.card_print_id || request.card_printing_id)) findings.push("premature_canonical_assignment_target_detected");
  if (new Set(requests.map((request) => request.query_key)).size !== requests.length) findings.push("duplicate_query_key_detected");
  const coverageRequestCount = requests.filter((request) => request.offset === 0).length;
  const minimums = Object.fromEntries(["raw_single", "graded_single", "sealed_product"].map((kind) => [
    kind,
    Math.max(0, Number(minimumProviderCallsByProductKind?.[kind]) || 0),
  ]));
  if (Object.values(minimums).reduce((sum, value) => sum + value, 0) > ceiling) findings.push("minimum_product_kind_calls_exceed_ceiling");

  const requestManifestHash = sha256(requests.map((request) => ({
    query_key: request.query_key,
    acquisition_product_kind: request.acquisition_product_kind,
    query_text: request.query_text,
    query_filters: request.query_filters,
    offset: request.offset,
  })));
  const packageFingerprint = sha256({
    package_id: "MARKET-LISTING-ACQUISITION-WAREHOUSE-PLAN-V2",
    version: MARKET_LISTING_ACQUISITION_WAREHOUSE_PLAN_VERSION,
    category_registry_fingerprint: categoryRegistry?.package_fingerprint_sha256 ?? null,
    request_manifest_hash: requestManifestHash,
    provider_call_ceiling: ceiling,
    minimum_provider_calls_by_product_kind: minimums,
  });
  return {
    package_id: "MARKET-LISTING-ACQUISITION-WAREHOUSE-PLAN-V2",
    version: MARKET_LISTING_ACQUISITION_WAREHOUSE_PLAN_VERSION,
    generated_at: generatedAt,
    mode: "warehouse_first_plan_only_no_provider_calls_no_writes",
    package_fingerprint_sha256: packageFingerprint,
    request_manifest_hash_sha256: requestManifestHash,
    category_registry_fingerprint_sha256: categoryRegistry?.package_fingerprint_sha256 ?? null,
    category_registry: categoryRegistry ?? null,
    acquisition_requests: requests,
    summary: {
      set_count: sets.length,
      candidate_request_count: requests.length,
      coverage_request_count: coverageRequestCount,
      provider_call_ceiling: ceiling,
      result_limit: limit,
      max_pages_per_family: pageCount,
      minimum_provider_calls_by_product_kind: minimums,
      product_kind_candidate_counts: countBy(requests, (request) => request.acquisition_product_kind),
      exact_printing_request_count: 0,
      canonical_assignment_deferred: true,
    },
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      canonical_assignment_writes: false,
      card_candidate_writes: false,
      sealed_product_identity_writes: false,
      public_pricing: false,
      app_visible_pricing: false,
    },
    findings: [...new Set(findings)],
    ready_for_acquisition_approval: findings.length === 0 && requests.length > 0,
  };
}
