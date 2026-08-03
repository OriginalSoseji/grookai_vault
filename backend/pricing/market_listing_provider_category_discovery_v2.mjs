import { createHash } from "node:crypto";

export const MARKET_LISTING_PROVIDER_CATEGORY_DISCOVERY_VERSION = "MEE_PROVIDER_CATEGORY_DISCOVERY_V2";
export const DEFAULT_CATEGORY_DISCOVERY_QUERIES = Object.freeze([
  "Pokemon trading card single",
  "Pokemon graded trading card",
  "Pokemon sealed booster box",
  "Pokemon elite trainer box",
  "Pokemon booster pack",
]);

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

function taxonomyBaseUrl() {
  return (process.env.EBAY_TAXONOMY_BASE_URL || "https://api.ebay.com").replace(/\/+$/, "");
}

function normalizeSuggestion(query, suggestion, rank) {
  const category = suggestion?.category ?? suggestion;
  const ancestors = suggestion?.categoryTreeNodeAncestors ?? suggestion?.categoryTreeNodeAncestor ?? [];
  return {
    query,
    rank,
    category_id: category?.categoryId ? String(category.categoryId) : null,
    category_name: category?.categoryName ?? null,
    ancestor_categories: (Array.isArray(ancestors) ? ancestors : []).map((entry) => ({
      category_id: entry?.categoryId ? String(entry.categoryId) : null,
      category_name: entry?.categoryName ?? null,
      category_subtree_node_level: entry?.categorySubtreeNodeLevel ?? null,
    })),
  };
}

async function fetchJson(url, { accessToken, fetchImpl }) {
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(`[provider-category-discovery-v2] eBay Taxonomy request failed: ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export async function discoverMarketListingProviderCategoriesV2({
  accessToken,
  marketplaceId = "EBAY_US",
  queries = DEFAULT_CATEGORY_DISCOVERY_QUERIES,
  generatedAt = new Date().toISOString(),
  fetchImpl = fetch,
} = {}) {
  if (!accessToken) throw new Error("[provider-category-discovery-v2] accessToken is required");
  const defaultTreeUrl = new URL("/commerce/taxonomy/v1/get_default_category_tree_id", taxonomyBaseUrl());
  defaultTreeUrl.searchParams.set("marketplace_id", marketplaceId);
  const tree = await fetchJson(defaultTreeUrl, { accessToken, fetchImpl });
  const categoryTreeId = String(tree?.categoryTreeId ?? "").trim();
  if (!categoryTreeId) throw new Error("[provider-category-discovery-v2] default category tree response omitted categoryTreeId");
  const results = [];
  for (const query of queries) {
    const url = new URL(`/commerce/taxonomy/v1/category_tree/${encodeURIComponent(categoryTreeId)}/get_category_suggestions`, taxonomyBaseUrl());
    url.searchParams.set("q", query);
    const payload = await fetchJson(url, { accessToken, fetchImpl });
    const suggestions = payload?.categorySuggestions ?? [];
    results.push({
      query,
      response_category_tree_id: payload?.categoryTreeId ? String(payload.categoryTreeId) : categoryTreeId,
      response_category_tree_version: payload?.categoryTreeVersion ?? tree?.categoryTreeVersion ?? null,
      suggestions: suggestions.map((suggestion, index) => normalizeSuggestion(query, suggestion, index + 1)),
      response_hash_sha256: sha256(payload),
    });
  }
  const categoryTreeVersion = results.find((entry) => entry.response_category_tree_version)?.response_category_tree_version
    ?? tree?.categoryTreeVersion
    ?? null;
  const packageFingerprint = sha256({
    version: MARKET_LISTING_PROVIDER_CATEGORY_DISCOVERY_VERSION,
    marketplace_id: marketplaceId,
    category_tree_id: categoryTreeId,
    category_tree_version: categoryTreeVersion,
    results,
  });
  return {
    package_id: "MARKET-LISTING-PROVIDER-CATEGORY-DISCOVERY-V2",
    version: MARKET_LISTING_PROVIDER_CATEGORY_DISCOVERY_VERSION,
    generated_at: generatedAt,
    marketplace_id: marketplaceId,
    category_tree_id: categoryTreeId,
    category_tree_version: categoryTreeVersion,
    queries: [...queries],
    results,
    package_fingerprint_sha256: packageFingerprint,
    boundary: {
      provider_taxonomy_calls: true,
      provider_browse_calls: false,
      db_writes: false,
      category_registry_activation: false,
    },
    ready_for_human_category_review: results.every((entry) => entry.suggestions.length > 0),
  };
}

export function sealedCategoryRouteFromReviewedDiscoveryV2({ discovery, acceptedCategoryIds }) {
  if (discovery?.package_id !== "MARKET-LISTING-PROVIDER-CATEGORY-DISCOVERY-V2") {
    throw new Error("[provider-category-discovery-v2] invalid discovery package");
  }
  const accepted = new Set((acceptedCategoryIds ?? []).map(String).filter(Boolean));
  if (accepted.size === 0) throw new Error("[provider-category-discovery-v2] at least one accepted category ID is required");
  const candidates = new Map();
  for (const result of discovery.results ?? []) {
    for (const suggestion of result.suggestions ?? []) {
      if (suggestion.category_id) candidates.set(suggestion.category_id, suggestion.category_name);
    }
  }
  const missing = [...accepted].filter((id) => !candidates.has(id));
  if (missing.length > 0) throw new Error(`[provider-category-discovery-v2] accepted category IDs were not present in frozen discovery: ${missing.join(",")}`);
  return {
    category_ids: [...accepted].sort(),
    category_names: [...accepted].sort().map((id) => candidates.get(id)).filter(Boolean),
    query_suffixes: [],
    provenance: `ebay_taxonomy:${discovery.package_fingerprint_sha256}`,
    reviewed: true,
  };
}
