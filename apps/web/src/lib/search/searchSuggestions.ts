import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";

export const SEARCH_SUGGESTION_LIMIT = 6;
export const SEARCH_SUGGESTION_MIN_QUERY_LENGTH = 2;
export const SEARCH_SUGGESTION_FAMILY_FETCH_LIMIT = 64;

export type SearchSuggestion = ExploreResultCard;

export type SearchSuggestionRequest = {
  resolverQuery: string;
  requestedNumber: string | null;
  requestedTotal: string | null;
  fetchLimit: number;
};

function normalizeCollectorNumber(value: string | null | undefined) {
  const compact = (value ?? "")
    .split("/", 1)[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const match = compact.match(/^([a-z]*?)0*(\d+)([a-z]*)$/);
  if (!match) return compact;
  return `${match[1]}${Number.parseInt(match[2], 10)}${match[3]}`;
}

export function getSearchSuggestionRequest(query: string): SearchSuggestionRequest {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  const collectorNumberMatch = normalizedQuery.match(
    /^(.*?)\s+#?([a-z]{0,4}\d+[a-z]{0,4})(?:\s*\/\s*(\d+))?$/i,
  );
  const resolverQuery = collectorNumberMatch?.[1]?.trim() || normalizedQuery;
  const requestedNumber = collectorNumberMatch?.[2] ?? null;
  const requestedTotal = collectorNumberMatch?.[3] ?? null;

  return {
    resolverQuery,
    requestedNumber,
    requestedTotal,
    fetchLimit: requestedNumber
      ? SEARCH_SUGGESTION_FAMILY_FETCH_LIMIT
      : SEARCH_SUGGESTION_LIMIT,
  };
}

export function getSearchSuggestionKey(card: SearchSuggestion) {
  return (
    card.search_card_printing_id ??
    card.selected_printing_gv_id ??
    card.printing_gv_id ??
    card.id ??
    card.gv_id
  );
}

export function normalizeSearchSuggestions(
  rows: SearchSuggestion[],
  limit = SEARCH_SUGGESTION_LIMIT,
  query = "",
) {
  const request = getSearchSuggestionRequest(query);
  const requestedNumber = normalizeCollectorNumber(request.requestedNumber);
  const rankedRows = rows
    .map((row, index) => ({
      row,
      index,
      exactNumber:
        Boolean(requestedNumber) &&
        normalizeCollectorNumber(row.number) === requestedNumber,
    }))
    .sort((left, right) =>
      Number(right.exactNumber) - Number(left.exactNumber) ||
      left.index - right.index,
    );
  const seen = new Set<string>();
  const suggestions: SearchSuggestion[] = [];

  for (const { row } of rankedRows) {
    if (!row.gv_id) continue;
    const key = getSearchSuggestionKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    suggestions.push(row);
    if (suggestions.length >= limit) break;
  }

  return suggestions;
}

export function buildSearchSuggestionHref(card: SearchSuggestion) {
  const printingGvId =
    card.selected_printing_gv_id ?? card.printing_gv_id ?? null;
  const params = new URLSearchParams();

  if (printingGvId) {
    params.set("printing", printingGvId);
  } else if (card.route_query) {
    const routeParams = new URLSearchParams(card.route_query);
    const printing = routeParams.get("printing");
    if (printing) params.set("printing", printing);
  }

  const query = params.toString();
  return `/card/${encodeURIComponent(card.gv_id)}${query ? `?${query}` : ""}`;
}

export function getSearchSuggestionPresentation(card: SearchSuggestion) {
  const identity = resolveDisplayIdentity(card);
  const metadata = [
    card.set_name?.trim(),
    card.number?.trim() ? `#${card.number.trim()}` : null,
    card.rarity?.trim(),
  ].filter((value): value is string => Boolean(value));
  const discriminator =
    card.display_discriminator?.trim() ||
    card.finish_label?.trim() ||
    identity.suffix ||
    null;

  return {
    title: identity.base_name,
    printedName: identity.printed_name,
    metadata: metadata.join(" · "),
    discriminator,
  };
}
