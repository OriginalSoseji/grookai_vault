import { createHash } from "node:crypto";

export const MARKET_LISTING_PROVIDER_CATEGORY_REGISTRY_VERSION = "MEE_PROVIDER_CATEGORY_REGISTRY_V2";
export const EBAY_US_INDIVIDUAL_CARD_CATEGORY_ID = "183454";

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

function normalizeRoute(route, expectedProductKind) {
  const categoryRows = Array.isArray(route?.categories)
    ? route.categories.map((entry) => ({
        category_id: String(entry?.category_id ?? entry?.categoryId ?? "").trim(),
        category_name: String(entry?.category_name ?? entry?.categoryName ?? "").trim() || null,
      }))
    : (route?.category_ids ?? []).map((categoryId, index) => ({
        category_id: String(categoryId).trim(),
        category_name: String(route?.category_names?.[index] ?? "").trim() || null,
      }));
  const categories = [...new Map(categoryRows.filter((entry) => entry.category_id).map((entry) => [entry.category_id, entry])).values()]
    .sort((left, right) => left.category_id.localeCompare(right.category_id));
  return {
    product_kind: expectedProductKind,
    categories,
    category_ids: categories.map((entry) => entry.category_id),
    category_names: categories.map((entry) => entry.category_name).filter(Boolean),
    query_suffixes: [...new Set((route?.query_suffixes ?? []).map(String).filter(Boolean))],
    provenance: route?.provenance ?? null,
    reviewed: route?.reviewed === true,
  };
}

export function buildMarketListingProviderCategoryRegistryV2({
  marketplaceId = "EBAY_US",
  categoryTreeId = "0",
  categoryTreeVersion,
  sealedRoute,
  generatedAt = new Date().toISOString(),
} = {}) {
  const routes = {
    raw_single: normalizeRoute({
      category_ids: [EBAY_US_INDIVIDUAL_CARD_CATEGORY_ID],
      category_names: ["CCG Individual Cards"],
      query_suffixes: [],
      provenance: "provider_observed_existing_production_artifact",
      reviewed: true,
    }, "raw_single"),
    graded_single: normalizeRoute({
      category_ids: [EBAY_US_INDIVIDUAL_CARD_CATEGORY_ID],
      category_names: ["CCG Individual Cards"],
      query_suffixes: ["graded card", "PSA", "CGC", "BGS"],
      provenance: "provider_observed_existing_production_artifact",
      reviewed: true,
    }, "graded_single"),
    sealed_product: normalizeRoute(sealedRoute, "sealed_product"),
  };
  const findings = [];
  if (!categoryTreeVersion) findings.push("missing_category_tree_version");
  if (routes.sealed_product.category_ids.length === 0) findings.push("missing_reviewed_sealed_category_ids");
  if (!routes.sealed_product.reviewed) findings.push("sealed_category_route_not_reviewed");
  if (!routes.sealed_product.provenance) findings.push("sealed_category_route_missing_provenance");
  for (const [productKind, route] of Object.entries(routes)) {
    if (route.product_kind !== productKind) findings.push(`route_product_kind_mismatch:${productKind}`);
    if (route.category_ids.length === 0) findings.push(`route_missing_category_ids:${productKind}`);
  }
  const fingerprint = sha256({
    version: MARKET_LISTING_PROVIDER_CATEGORY_REGISTRY_VERSION,
    marketplace_id: marketplaceId,
    category_tree_id: categoryTreeId,
    category_tree_version: categoryTreeVersion ?? null,
    routes,
  });
  return {
    package_id: "MARKET-LISTING-PROVIDER-CATEGORY-REGISTRY-V2",
    version: MARKET_LISTING_PROVIDER_CATEGORY_REGISTRY_VERSION,
    generated_at: generatedAt,
    marketplace_id: marketplaceId,
    category_tree_id: categoryTreeId,
    category_tree_version: categoryTreeVersion ?? null,
    routes,
    package_fingerprint_sha256: fingerprint,
    findings,
    ready_for_live_acquisition: findings.length === 0,
  };
}

export function validateMarketListingProviderCategoryRegistryV2(registry) {
  const findings = [];
  if (registry?.package_id !== "MARKET-LISTING-PROVIDER-CATEGORY-REGISTRY-V2") findings.push("unexpected_category_registry_package");
  if (registry?.version !== MARKET_LISTING_PROVIDER_CATEGORY_REGISTRY_VERSION) findings.push("unexpected_category_registry_version");
  if (registry?.marketplace_id !== "EBAY_US") findings.push("unsupported_marketplace");
  if (registry?.ready_for_live_acquisition !== true) findings.push(...(registry?.findings ?? ["category_registry_not_ready"]));
  for (const productKind of ["raw_single", "graded_single", "sealed_product"]) {
    const route = registry?.routes?.[productKind];
    if (!route || !Array.isArray(route.category_ids) || route.category_ids.length === 0) findings.push(`missing_category_route:${productKind}`);
  }
  return [...new Set(findings)];
}
