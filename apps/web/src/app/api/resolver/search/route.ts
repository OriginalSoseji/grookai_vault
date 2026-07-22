import { NextRequest, NextResponse } from "next/server";
import { isIdentityFilterActive, normalizeIdentityFilterKey } from "@/lib/cards/identitySearch";
import { getPublicProvisionalCards } from "@/lib/provisional/getPublicProvisionalCards";
import {
  applyPromotionTransitionsToCanonicalRows,
  getPromotionTransitionStateForCanonicalCards,
  suppressPromotedProvisionalRows,
} from "@/lib/provisional/getPromotionTransitionState";
import {
  getExploreRowsForOwnedSmartFilterDiscovery,
  getExploreRowsForLanguageScopedTextSearch,
  getExploreRowsForSmartFilterDiscovery,
  getExploreRowsForSmartStructuredTextSearch,
} from "@/lib/explore/getExploreRows";
import {
  matchesPublicLanguageScope,
  normalizePublicLanguageScope,
} from "@/lib/publicLanguageScope";
import { resolveQueryWithMeta } from "@/lib/resolver/resolveQuery";
import type { ResolverMeta } from "@/lib/resolver/resolveQuery";
import { resolvePublicSetRouteCode } from "@/lib/publicSets.shared";
import { buildSmartSearchIntent, type SmartSearchIntent } from "@/lib/search/smartSearchIntent";
import { resolveSmartSearchQuery } from "@/lib/search/resolveSmartSearchQuery";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  getOwnedCardPrintIdsForUser,
  getOwnedCountsByCardPrintIds,
} from "@/lib/vault/getOwnedCountsByCardPrintIds";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import {
  getPublicPricingByCardIds,
  mergePublicPricingIntoRows,
  PublicPricingSortUnavailableError,
} from "@/lib/pricing/getPublicPricingByCardIds";

export const revalidate = 120;

const DEFAULT_RESULT_LIMIT = 48;
const MAX_RESULT_LIMIT = 64;
const RESOLVER_RESPONSE_TIMEOUT_MS = 4200;

// LOCK: Canonical and provisional results must remain separate.
// LOCK: Never merge provisional rows into canonical result arrays.
function parseSortMode(value: string | null) {
  if (
    value === "newest" ||
    value === "oldest" ||
    value === "set_order" ||
    value === "number" ||
    value === "value_high" ||
    value === "value_low"
  ) {
    return value;
  }

  return "relevance";
}

function normalizeSetCode(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function parseReleaseYear(value: string | null) {
  const normalized = (value ?? "").trim();
  if (!/^\d{4}$/.test(normalized)) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseReleaseYearBound(value: string | null) {
  const parsed = parseReleaseYear(value);
  return typeof parsed === "number" ? parsed : undefined;
}

function parseResultLimit(value: string | null) {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_RESULT_LIMIT;
  }

  return Math.min(Math.max(parsed, 1), MAX_RESULT_LIMIT);
}

function normalizeIllustrator(value: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function parseMultiParam(searchParams: URLSearchParams, key: string) {
  return uniqueValues(
    searchParams
      .getAll(key)
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function parseOwnedState(value: string | null): SmartSearchIntent["ownedState"] {
  return value === "owned" || value === "missing" ? value : undefined;
}

function parseBooleanParam(value: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseImageState(value: string | null): SmartSearchIntent["imageState"] {
  if (value === "exact" || value === "representative" || value === "missing") {
    return value;
  }
  if (value === "missing_variant_visual") {
    return "missing";
  }
  return undefined;
}

function buildExplicitFilterLabels(payload: {
  releaseYearMin?: number;
  releaseYearMax?: number;
  finishKeys: string[];
  stampLabels: string[];
  artist?: string;
  imageState?: SmartSearchIntent["imageState"];
  ownedState?: SmartSearchIntent["ownedState"];
}) {
  const labels: string[] = [];
  if (typeof payload.releaseYearMin === "number" || typeof payload.releaseYearMax === "number") {
    labels.push(`${payload.releaseYearMin ?? "Any"}-${payload.releaseYearMax ?? "Now"}`);
  }
  labels.push(...payload.finishKeys.map((key) => `Finish: ${key.replace(/_/g, " ")}`));
  labels.push(...payload.stampLabels);
  if (payload.artist) {
    labels.push(`Artist: ${payload.artist}`);
  }
  if (payload.imageState && payload.imageState !== "any") {
    labels.push(`Image: ${payload.imageState === "missing" ? "Missing exact image" : payload.imageState}`);
  }
  if (payload.ownedState && payload.ownedState !== "any") {
    labels.push(payload.ownedState === "owned" ? "Owned" : "Missing from vault");
  }
  return labels;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSearchText(value: unknown) {
  return normalizeOptionalText(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function rowMatchesFinish(row: ExploreResultCard, finishKeys: string[]) {
  if (finishKeys.length === 0) {
    return true;
  }

  const normalizedKeys = new Set(finishKeys.map(normalizeSearchText));
  const labels = [
    row.finish_key,
    row.finish_label,
    row.display_discriminator,
  ].map(normalizeSearchText);

  return labels.some((label) => normalizedKeys.has(label) || (label && Array.from(normalizedKeys).some((key) => label.includes(key))));
}

function rowMatchesStamp(row: ExploreResultCard, stampLabels: string[]) {
  if (stampLabels.length === 0) {
    return true;
  }

  const haystack = normalizeSearchText([
    row.variant_key,
    row.printed_identity_modifier,
    row.display_discriminator,
    row.finish_label,
  ].filter(Boolean).join(" "));

  return stampLabels.some((label) => {
    const tokens = normalizeSearchText(label)
      .split(" ")
      .filter((token) => token && token !== "stamp" && token !== "workshop");
    return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
  });
}

function rowMatchesImageState(row: ExploreResultCard, imageState: SmartSearchIntent["imageState"]) {
  if (!imageState || imageState === "any") {
    return true;
  }

  if (imageState === "exact") {
    return row.display_image_kind === "exact";
  }

  if (imageState === "representative") {
    return row.display_image_kind === "representative" || row.display_image_kind === "missing_variant_visual";
  }

  return row.display_image_kind !== "exact";
}

function buildSmartFilterDiscoveryMeta(
  rows: ExploreResultCard[],
  smartSearchIntent: SmartSearchIntent,
): ResolverMeta {
  return {
    resolverState: rows.length > 0 ? "WEAK_MATCH" : "NO_MATCH",
    topScore: null,
    candidateCount: rows.length,
    autoResolved: false,
    intentSummary: {
      expectedSetCodes: [],
      nameTokens: smartSearchIntent.residualQuery
        ? smartSearchIntent.residualQuery.split(/\s+/).filter(Boolean)
        : [],
    },
    structuredEvidenceFlags: {
      text: Boolean(smartSearchIntent.residualQuery),
      textRequired: false,
      expectedSet: false,
      number: false,
      fraction: false,
      promo: false,
      variants: smartSearchIntent.finishKeys,
    },
  };
}

function buildDegradedSearchMeta(query: string): ResolverMeta {
  const nameTokens = query
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter(Boolean) ?? [];

  return {
    resolverState: "NO_MATCH",
    topScore: null,
    candidateCount: 0,
    autoResolved: false,
    intentSummary: {
      expectedSetCodes: [],
      nameTokens,
    },
    structuredEvidenceFlags: null,
  };
}

function buildDegradedSearchResult(
  query: string,
  smartSearchIntent: SmartSearchIntent,
) {
  return {
    rows: [] as ExploreResultCard[],
    meta: buildDegradedSearchMeta(query),
    smartSearchIntent,
    degraded: true,
  };
}

function isTimeoutLikeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("statement timeout") ||
    message.includes("canceling statement") ||
    message.includes("The operation was aborted") ||
    message.includes("AbortError")
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => resolve(fallback), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function getPublicProvisionalCardsFailClosed(input: {
  query: string;
  setCode: string;
  limit: number;
}) {
  return withTimeout(
    getPublicProvisionalCards(input).catch((error) => {
      if (error instanceof Error && error.message.startsWith("SECURITY:")) {
        throw error;
      }

      if (process.env.NODE_ENV !== "production") {
        console.warn("[public-provisional] search adapter failed closed", {
          message: error instanceof Error ? error.message : "unknown",
        });
      }
      return [];
    }),
    1200,
    [],
  );
}

async function applySmartSearchPostFilters(
  rows: ExploreResultCard[],
  smartSearchIntent: SmartSearchIntent,
  userId: string | null,
) {
  let filteredRows = rows
    .filter((row) => rowMatchesFinish(row, smartSearchIntent.finishKeys))
    .filter((row) => rowMatchesStamp(row, smartSearchIntent.stampLabels))
    .filter((row) => rowMatchesImageState(row, smartSearchIntent.imageState));
  const unappliedLabels = [...smartSearchIntent.unappliedLabels];

  if (smartSearchIntent.ownedState && smartSearchIntent.ownedState !== "any") {
    if (!userId) {
      unappliedLabels.push("Vault ownership requires sign in");
    } else {
      const ownedCounts = await getOwnedCountsByCardPrintIds(userId, filteredRows.map((row) => row.id));
      filteredRows = filteredRows.filter((row) => {
        const isOwned = (ownedCounts.get(row.id) ?? 0) > 0;
        return smartSearchIntent.ownedState === "owned" ? isOwned : !isOwned;
      });
    }
  }

  return {
    rows: filteredRows,
    smartSearchIntent: {
      ...smartSearchIntent,
      unappliedLabels,
    },
  };
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const resultLimit = parseResultLimit(request.nextUrl.searchParams.get("limit"));
  const languageScope = normalizePublicLanguageScope(request.nextUrl.searchParams.get("lang"));
  const smartSearchIntent = buildSmartSearchIntent(rawQuery);
  const query = resolveSmartSearchQuery(rawQuery, smartSearchIntent);
  const exactSetCode = resolvePublicSetRouteCode(normalizeSetCode(request.nextUrl.searchParams.get("set")));
  const exactReleaseYear = parseReleaseYear(request.nextUrl.searchParams.get("year"));
  const explicitYearMin = parseReleaseYearBound(request.nextUrl.searchParams.get("year_min"));
  const explicitYearMax = parseReleaseYearBound(request.nextUrl.searchParams.get("year_max"));
  const explicitFinishKeys = parseMultiParam(request.nextUrl.searchParams, "finish");
  const explicitStampLabels = parseMultiParam(request.nextUrl.searchParams, "stamp");
  const explicitImageState = parseImageState(request.nextUrl.searchParams.get("image_state") ?? request.nextUrl.searchParams.get("image"));
  const sortMode = parseSortMode(request.nextUrl.searchParams.get("sort"));
  const valueSortRequested =
    sortMode === "value_high" || sortMode === "value_low";
  const pricingRequested =
    parseBooleanParam(request.nextUrl.searchParams.get("include_pricing")) ||
    valueSortRequested;
  const explicitOwnedState = parseOwnedState(request.nextUrl.searchParams.get("owned"));
  const exactIllustrator = normalizeIllustrator(request.nextUrl.searchParams.get("illustrator")) ?? smartSearchIntent.artist;
  const effectiveSmartSearchIntent: SmartSearchIntent = {
    ...smartSearchIntent,
    releaseYearMin: explicitYearMin ?? smartSearchIntent.releaseYearMin,
    releaseYearMax: explicitYearMax ?? smartSearchIntent.releaseYearMax,
    finishKeys: uniqueValues([...smartSearchIntent.finishKeys, ...explicitFinishKeys]),
    stampLabels: uniqueValues([...smartSearchIntent.stampLabels, ...explicitStampLabels]),
    imageState: explicitImageState ?? smartSearchIntent.imageState,
    ownedState: explicitOwnedState ?? smartSearchIntent.ownedState,
    interpretedLabels: uniqueValues([
      ...smartSearchIntent.interpretedLabels,
      ...buildExplicitFilterLabels({
        releaseYearMin: explicitYearMin,
        releaseYearMax: explicitYearMax,
        finishKeys: explicitFinishKeys,
        stampLabels: explicitStampLabels,
        artist: normalizeIllustrator(request.nextUrl.searchParams.get("illustrator")),
        imageState: explicitImageState,
        ownedState: explicitOwnedState,
      }),
    ]),
  };
  const identityFilter = normalizeIdentityFilterKey(request.nextUrl.searchParams.get("identity"));
  const hasSmartYearRange =
    typeof effectiveSmartSearchIntent.releaseYearMin === "number" ||
    typeof effectiveSmartSearchIntent.releaseYearMax === "number";
  const hasSmartFinishIntent = effectiveSmartSearchIntent.finishKeys.length > 0;
  const hasSmartImageIntent = Boolean(effectiveSmartSearchIntent.imageState && effectiveSmartSearchIntent.imageState !== "any");
  const hasSmartOwnershipIntent = Boolean(effectiveSmartSearchIntent.ownedState && effectiveSmartSearchIntent.ownedState !== "any");
  const hasSmartStampIntent = effectiveSmartSearchIntent.stampLabels.length > 0;
  const shouldUseStructuredTextExpansion =
    Boolean(query) &&
    (hasSmartFinishIntent || hasSmartImageIntent || hasSmartStampIntent);
  const hasCatalogDiscoveryScope =
    Boolean(exactSetCode) ||
    typeof exactReleaseYear === "number" ||
    typeof exactIllustrator === "string" ||
    isIdentityFilterActive(identityFilter) ||
    hasSmartYearRange ||
    hasSmartFinishIntent ||
    hasSmartImageIntent ||
    hasSmartStampIntent;
  const shouldUseSmartFilterDiscovery =
    !query &&
    hasCatalogDiscoveryScope &&
    effectiveSmartSearchIntent.ownedState !== "owned";
  const shouldUseFastTextSearch =
    Boolean(query) &&
    !hasCatalogDiscoveryScope &&
    !hasSmartOwnershipIntent;

  if (!query && !exactSetCode && !exactReleaseYear && !hasSmartYearRange && !hasSmartFinishIntent && !hasSmartImageIntent && !hasSmartOwnershipIntent && !hasSmartStampIntent && !exactIllustrator && !isIdentityFilterActive(identityFilter)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing search criteria",
      },
      { status: 400 },
    );
  }

  try {
    let userId: string | null = null;
    let requestSupabase: ReturnType<typeof createServerComponentClient> | null = null;

    if (hasSmartOwnershipIntent || pricingRequested) {
      requestSupabase = createServerComponentClient();
      const {
        data: { user },
      } = await requestSupabase.auth.getUser();
      userId = user?.id ?? null;
    }

    if (valueSortRequested && !userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sign in to sort search results by Grookai Value.",
          requested_sort: sortMode,
          applied_sort: null,
          sort_degraded_reason: "authentication_required",
        },
        {
          status: 401,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }

    // Pricing is signed-in-only. For non-value sorts it is safe to defer the
    // bridge read until after filtering and the response limit are applied.
    // Value sorts still enrich the whole bounded candidate set so ordering
    // remains correct.
    const includePricing = pricingRequested && Boolean(userId);
    const includePricingDuringResolution = includePricing && valueSortRequested;

    const includeProvisional =
      languageScope !== "ja" &&
      !exactReleaseYear &&
      !hasSmartYearRange &&
      !exactIllustrator &&
      !effectiveSmartSearchIntent.ownedState &&
      !isIdentityFilterActive(identityFilter);
    const resolvedSearchPromise = !query && effectiveSmartSearchIntent.ownedState === "owned" && userId
      ? getOwnedCardPrintIdsForUser(userId).then((ownedCardPrintIds) =>
          getExploreRowsForOwnedSmartFilterDiscovery(ownedCardPrintIds, {
            sortMode,
            exactSetCode,
            exactReleaseYear,
            exactIllustrator,
            identityFilter,
            releaseYearMin: effectiveSmartSearchIntent.releaseYearMin,
            releaseYearMax: effectiveSmartSearchIntent.releaseYearMax,
            finishKeys: effectiveSmartSearchIntent.finishKeys,
            stampLabels: effectiveSmartSearchIntent.stampLabels,
            imageState: effectiveSmartSearchIntent.imageState,
            languageScope,
            includePricing: includePricingDuringResolution,
          }),
        ).then((rows) => ({
          rows,
          meta: buildSmartFilterDiscoveryMeta(rows, effectiveSmartSearchIntent),
          smartSearchIntent: effectiveSmartSearchIntent,
          degraded: false,
        }))
      : shouldUseFastTextSearch
        ? getExploreRowsForLanguageScopedTextSearch(
            query,
            languageScope,
            sortMode,
            includePricingDuringResolution,
          ).then((rows) => ({
            rows,
            meta: buildSmartFilterDiscoveryMeta(rows, effectiveSmartSearchIntent),
            smartSearchIntent: effectiveSmartSearchIntent,
            degraded: false,
          }))
      : shouldUseSmartFilterDiscovery
        ? getExploreRowsForSmartFilterDiscovery({
            sortMode,
            exactSetCode,
            exactReleaseYear,
            exactIllustrator,
            identityFilter,
            releaseYearMin: effectiveSmartSearchIntent.releaseYearMin,
            releaseYearMax: effectiveSmartSearchIntent.releaseYearMax,
            finishKeys: effectiveSmartSearchIntent.finishKeys,
            stampLabels: effectiveSmartSearchIntent.stampLabels,
            imageState: effectiveSmartSearchIntent.imageState,
            languageScope,
            includePricing: includePricingDuringResolution,
          }).then((rows) => ({
            rows,
            meta: buildSmartFilterDiscoveryMeta(rows, effectiveSmartSearchIntent),
            smartSearchIntent: effectiveSmartSearchIntent,
            degraded: false,
          }))
        : shouldUseStructuredTextExpansion
          ? getExploreRowsForSmartStructuredTextSearch(query, {
              sortMode,
              exactSetCode,
              exactReleaseYear,
              exactIllustrator,
              identityFilter,
              releaseYearMin: effectiveSmartSearchIntent.releaseYearMin,
              releaseYearMax: effectiveSmartSearchIntent.releaseYearMax,
              finishKeys: effectiveSmartSearchIntent.finishKeys,
              stampLabels: effectiveSmartSearchIntent.stampLabels,
              imageState: effectiveSmartSearchIntent.imageState,
              languageScope,
              includePricing: includePricingDuringResolution,
            }).then((rows) => ({
              rows,
              meta: buildSmartFilterDiscoveryMeta(rows, effectiveSmartSearchIntent),
              smartSearchIntent: effectiveSmartSearchIntent,
              degraded: false,
            }))
          : resolveQueryWithMeta(query, {
              mode: "ranked",
              sortMode,
              exactSetCode,
              exactReleaseYear,
              exactIllustrator,
              identityFilter,
              releaseYearMin: effectiveSmartSearchIntent.releaseYearMin,
              releaseYearMax: effectiveSmartSearchIntent.releaseYearMax,
              languageScope,
              includePricing: includePricingDuringResolution,
            }).then((resolved) => ({
              ...resolved,
              smartSearchIntent: effectiveSmartSearchIntent,
              degraded: false,
            }));
    const [resolved, provisionalResults] = await Promise.all([
      withTimeout(
        resolvedSearchPromise,
        RESOLVER_RESPONSE_TIMEOUT_MS,
        buildDegradedSearchResult(query, effectiveSmartSearchIntent),
      ),
      includeProvisional
        ? getPublicProvisionalCardsFailClosed({
            query: rawQuery,
            setCode: exactSetCode,
            limit: 12,
          })
        : Promise.resolve([]),
    ]);
    if (valueSortRequested && resolved.degraded) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Value sorting timed out before a complete ordering could be produced. Narrow the search and try again.",
          requested_sort: sortMode,
          applied_sort: null,
          sort_degraded_reason: "resolver_timeout",
        },
        {
          status: 503,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
    const canonicalResults = resolved.rows.filter((row) =>
      matchesPublicLanguageScope(row, languageScope),
    );
    const promotionTransitions = await getPromotionTransitionStateForCanonicalCards(
      canonicalResults.map((row) => row.id),
    );
    const canonicalResultsWithTransitions = applyPromotionTransitionsToCanonicalRows(
      canonicalResults,
      promotionTransitions,
    );
    const {
      rows: smartFilteredCanonicalResults,
      smartSearchIntent: responseSmartSearchIntent,
    } = await applySmartSearchPostFilters(
      canonicalResultsWithTransitions,
      effectiveSmartSearchIntent,
      userId,
    );
    const limitedCanonicalResultsWithoutDeferredPricing =
      smartFilteredCanonicalResults.slice(0, resultLimit);
    const limitedCanonicalResults =
      includePricing && !includePricingDuringResolution && requestSupabase
        ? mergePublicPricingIntoRows(
            limitedCanonicalResultsWithoutDeferredPricing,
            await getPublicPricingByCardIds(
              requestSupabase,
              limitedCanonicalResultsWithoutDeferredPricing.map((row) => row.id),
            ),
          )
        : limitedCanonicalResultsWithoutDeferredPricing;
    // LOCK: Canonical truth must replace promoted provisional visibility.
    // LOCK: Do not dual-render the same entity across canonical and provisional sections.
    // LOCK: Uniqueness suppression must use explicit canonical linkage only.
    // LOCK: Never dedupe canonical/provisional by fuzzy identity.
    const canonicalResultIds = new Set(
      smartFilteredCanonicalResults.map((row) => normalizeOptionalText(row.id)).filter(Boolean),
    );
    const provisionalResultsAfterCanonicalIdGuard = provisionalResults.filter((row) => {
      const promotedCardPrintId = normalizeOptionalText(
        (row as { promoted_card_print_id?: unknown }).promoted_card_print_id,
      );
      return !promotedCardPrintId || !canonicalResultIds.has(promotedCardPrintId);
    });
    const provisionalResultsForResponse = suppressPromotedProvisionalRows(
      provisionalResultsAfterCanonicalIdGuard,
      smartFilteredCanonicalResults,
    );

    if (
      smartFilteredCanonicalResults.length > 0 &&
      provisionalResultsForResponse.some((row) => "gv_id" in row)
    ) {
      throw new Error("SECURITY: GV-ID found in provisional search results");
    }

    return NextResponse.json(
      {
        ok: true,
        query,
        smart_search: responseSmartSearchIntent,
        rows: limitedCanonicalResults,
        provisional: provisionalResultsForResponse,
        meta: resolved.meta,
        limit: resultLimit,
        returned_count: limitedCanonicalResults.length,
        requested_sort: sortMode,
        applied_sort: resolved.degraded ? null : sortMode,
        sort_degraded_reason: resolved.degraded ? "resolver_timeout" : null,
        source: resolved.degraded
          ? "web_ranked_resolver_v2_degraded_soft_timeout"
          : "web_ranked_resolver_v2",
      },
      {
        headers: {
          "Cache-Control":
            pricingRequested || effectiveSmartSearchIntent.ownedState
              ? "private, no-store"
              : "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : error
            ? JSON.stringify(error)
            : "Resolver request failed.";
    if (
      valueSortRequested &&
      error instanceof PublicPricingSortUnavailableError
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          requested_sort: sortMode,
          applied_sort: null,
          sort_degraded_reason: error.reason,
          sort_candidate_count: error.requestedCount,
          sort_candidate_limit: error.maximumCount,
        },
        {
          status:
            error.reason === "candidate_limit_exceeded" ||
            error.reason === "pricing_values_unavailable"
              ? 422
              : 503,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
    if (isTimeoutLikeError(error)) {
      console.warn("[public-search] resolver timed out; returning degraded empty result", {
        query,
        languageScope,
      });

      return NextResponse.json(
        {
          ok: valueSortRequested ? false : true,
          ...(valueSortRequested
            ? {
                error:
                  "Value sorting timed out before a complete ordering could be produced. Narrow the search and try again.",
                requested_sort: sortMode,
                applied_sort: null,
                sort_degraded_reason: "resolver_timeout",
              }
            : {}),
          query,
          smart_search: effectiveSmartSearchIntent,
          rows: [],
          provisional: [],
          meta: buildDegradedSearchMeta(query),
          limit: resultLimit,
          returned_count: 0,
          source: "web_ranked_resolver_v2_degraded_timeout",
        },
        {
          status: valueSortRequested ? 503 : 200,
          headers: {
            "Cache-Control": pricingRequested || effectiveSmartSearchIntent.ownedState
              ? "private, no-store"
              : "public, s-maxage=30, stale-while-revalidate=120",
          },
        },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: process.env.NODE_ENV === "production" ? "Search is temporarily unavailable." : message,
        ...(valueSortRequested
          ? {
              requested_sort: sortMode,
              applied_sort: null,
              sort_degraded_reason: "search_unavailable",
            }
          : {}),
      },
      { status: 500 },
    );
  }
}
