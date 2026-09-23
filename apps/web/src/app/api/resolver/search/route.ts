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
  getExploreRowsForGameScopedTextSearch,
  getExploreRowsForSmartFilterDiscovery,
  getExploreRowsForArtistSearch,
  getExploreRowsForCombinedSearch,
} from "@/lib/explore/getExploreRows";
import { isKnownArtistQuery } from "@/lib/search/artistSearch";
import { paginateArtistResults } from "@/lib/search/artistSearchPagination";
import {
  matchesPublicLanguageScope,
  normalizePublicLanguageScope,
} from "@/lib/publicLanguageScope";
import { resolveQueryWithMeta } from "@/lib/resolver/resolveQuery";
import type { ResolverMeta } from "@/lib/resolver/resolveQuery";
import {
  resolveGameScopedSetSearchIntent,
  resolvePublicSetRouteCode,
} from "@/lib/publicSets.shared";
import { buildSmartSearchIntent, type SmartSearchIntent } from "@/lib/search/smartSearchIntent";
import { normalizeSearchText } from "@/lib/search/normalizeSearchText";
import { normalizePublicGameScope } from "@/lib/publicGameScope";
import { catalogSearchAccess } from "@/lib/catalogSearchAccess";
import { classifySmartVariantResolverState } from "@/lib/search/smartVariantSearchPolicy";
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

function rowMatchesFinish(row: ExploreResultCard, finishKeys: string[]) {
  if (finishKeys.length === 0) {
    return true;
  }

  const normalizedKeys = new Set(finishKeys.map(normalizeSearchText));
  // A display label containing "holo" is not evidence of the Holo finish:
  // Reverse Holo and Non-Holo must stay distinct. Only the recorded key counts.
  return normalizedKeys.has(normalizeSearchText(row.finish_key));
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

  return stampLabels.every((label) => {
    if (label === "First Partner Series" && row.set_code === "mep") return true;
    if (label === "Poké Card Creator Pack" && row.set_code === "ex5.5") return true;
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
  mode: "generic" | "structured_text" = "generic",
  expectedSetCodes: string[] = [],
): ResolverMeta {
  return {
    resolverState: classifySmartVariantResolverState(
      rows.length,
      smartSearchIntent,
      mode,
      { expectedSetCodes },
    ),
    topScore: null,
    candidateCount: rows.length,
    autoResolved: false,
    intentSummary: {
      expectedSetCodes,
      nameTokens: smartSearchIntent.residualQuery
        ? smartSearchIntent.residualQuery.split(/\s+/).filter(Boolean)
        : [],
    },
    structuredEvidenceFlags: {
      text: Boolean(smartSearchIntent.residualQuery),
      textRequired: false,
      expectedSet: expectedSetCodes.length > 0,
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

function removeSetPhrase(query: string, phrase: string) {
  const pattern = phrase.split(/\s+/).map((word) => word === "and" ? "(?:and|&)" : word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  return query.replace(new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "iu"), " ").replace(/\s+/g, " ").trim();
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
  const selectedGameScope = normalizePublicGameScope(request.nextUrl.searchParams.get("game"));
  const smartSearchIntent = buildSmartSearchIntent(rawQuery, { gameScope: selectedGameScope });
  const languageScope = smartSearchIntent.languageScope ?? normalizePublicLanguageScope(request.nextUrl.searchParams.get("lang"));
  const gameScope = smartSearchIntent.gameScope ?? selectedGameScope;
  const query = resolveSmartSearchQuery(rawQuery, smartSearchIntent);
  const exactSetCode = resolvePublicSetRouteCode(normalizeSetCode(request.nextUrl.searchParams.get("set")));
  let inlineSetIntent = resolveGameScopedSetSearchIntent(query, gameScope);
  // Recognize current catalog codes, including codes added after the bundled
  // alias snapshot. The ordinary request client retains catalog visibility.
  if (!exactSetCode && inlineSetIntent.setCodes.length === 0 && !/^GV-/i.test(query)) {
    const codeTokens = query.split(/\s+/).filter((token) => /^[a-z][a-z0-9.-]*$/i.test(token));
    if (codeTokens.length) {
      try {
        const catalog = await createServerComponentClient();
        const { data, error } = await catalog.from("sets").select("code").eq("game", gameScope)
          .in("code", uniqueValues(codeTokens.flatMap((token) => [token, token.toLowerCase(), token.toUpperCase()])));
        if (error) throw new Error(error.message);
        if (data?.length === 1) {
          const alias = codeTokens.find((token) => token.toLowerCase() === data[0].code.toLowerCase())!;
          inlineSetIntent = { matchedAlias: alias, setCodes: [data[0].code], remainingQuery: removeSetPhrase(query, alias) };
        }
      } catch {
        return NextResponse.json({ ok: false, error: "Search could not verify the set filter. Please try again." }, { status: 503 });
      }
    }
  }
  const inlineExactSetCode =
    !exactSetCode && inlineSetIntent.setCodes.length === 1
      ? inlineSetIntent.setCodes[0]
      : "";
  const effectiveExactSetCode = exactSetCode || inlineExactSetCode;
  const routedQuery = !exactSetCode && inlineSetIntent.setCodes.length
    ? removeSetPhrase(query, inlineSetIntent.matchedAlias ?? "").replace(/\bfrom\b\s*$/i, "").trim()
    : query;
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
  const exactIllustrator = normalizeIllustrator(request.nextUrl.searchParams.get("illustrator"))
    ?? (gameScope !== "pokemon" ? smartSearchIntent.artist : undefined);
  const artistSearch = gameScope === "pokemon"
    ? exactIllustrator ?? smartSearchIntent.artist ?? (isKnownArtistQuery(rawQuery) ? rawQuery.trim() : undefined)
    : undefined;
  const completeCombinedSearch = !artistSearch && Boolean(
    smartSearchIntent.queryFilters?.length || explicitFinishKeys.length || explicitStampLabels.length ||
    effectiveExactSetCode || exactIllustrator || exactReleaseYear || explicitYearMin || explicitYearMax || explicitOwnedState || explicitImageState,
  );
  const completeSearch = Boolean(artistSearch) || completeCombinedSearch;
  const artistPaginationRequested = request.nextUrl.searchParams.get("pagination") === "1";
  const offsetText = request.nextUrl.searchParams.get("offset") ?? "0";
  if (completeSearch && artistPaginationRequested && (!/^\d+$/.test(offsetText) || !Number.isSafeInteger(Number(offsetText)))) {
    return NextResponse.json({ ok: false, error: "Invalid search page offset" }, { status: 400 });
  }
  const artistOffset = Number(offsetText);
  const effectiveSmartSearchIntent: SmartSearchIntent = {
    ...smartSearchIntent,
    releaseYearMin: explicitYearMin ?? smartSearchIntent.releaseYearMin,
    releaseYearMax: explicitYearMax ?? smartSearchIntent.releaseYearMax,
    finishKeys: uniqueValues([...smartSearchIntent.finishKeys, ...explicitFinishKeys]),
    stampLabels: uniqueValues([...smartSearchIntent.stampLabels, ...explicitStampLabels]),
    imageState: explicitImageState ?? smartSearchIntent.imageState,
    ownedState: explicitOwnedState ?? smartSearchIntent.ownedState,
    queryFilters: [...(smartSearchIntent.queryFilters ?? []),
      ...([['illustrator', 'artist', 'Artist'], ['set', 'text', 'Set'], ['year', 'year', 'Year'],
        ['year_min', 'year', 'From year'], ['year_max', 'year', 'Through year'],
        ['finish', 'finish', 'Finish'], ['stamp', 'stamp', 'Stamp'], ['owned', 'owned', 'Ownership'],
        ['image_state', 'image', 'Image'], ['image', 'image', 'Image'],
        ['game', 'game', 'Game'], ['lang', 'language', 'Language']] as const)
        .filter(([key]) => request.nextUrl.searchParams.has(key) &&
          !(['game', 'lang'].includes(key) && ['pokemon', 'all'].includes(request.nextUrl.searchParams.get(key) ?? '')))
        .map(([key, kind, label]) => ({ kind, label: `${label}: ${request.nextUrl.searchParams.getAll(key).join(', ')}`,
          sourceText: '', queryWithout: rawQuery, removeParameter: key }))],
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
  if (!exactSetCode && inlineSetIntent.matchedAlias) {
    const alias = inlineSetIntent.matchedAlias;
    effectiveSmartSearchIntent.queryFilters = (effectiveSmartSearchIntent.queryFilters ?? []).map((filter) => {
      if (filter.kind !== "text") return filter;
      const text = removeSetPhrase(filter.sourceText, alias);
      return { ...filter, label: `Text: ${text}`, sourceText: text,
        queryWithout: `${filter.queryWithout ?? ""} ${alias}`.trim() };
    }).filter((filter) => filter.kind !== "text" || filter.sourceText);
    effectiveSmartSearchIntent.queryFilters.push({ kind: "set", label: `Set: ${alias}`,
      sourceText: alias, queryWithout: removeSetPhrase(rawQuery, alias) });
  }
  const hasSmartYearRange =
    typeof effectiveSmartSearchIntent.releaseYearMin === "number" ||
    typeof effectiveSmartSearchIntent.releaseYearMax === "number";
  const hasSmartFinishIntent = effectiveSmartSearchIntent.finishKeys.length > 0;
  const hasSmartImageIntent = Boolean(effectiveSmartSearchIntent.imageState && effectiveSmartSearchIntent.imageState !== "any");
  const hasSmartOwnershipIntent = Boolean(effectiveSmartSearchIntent.ownedState && effectiveSmartSearchIntent.ownedState !== "any");
  const hasSmartStampIntent = effectiveSmartSearchIntent.stampLabels.length > 0;
  const hasInlineSetIntent = inlineSetIntent.setCodes.length > 0;
  const shouldUseStructuredTextExpansion =
    Boolean(query) &&
    (hasInlineSetIntent ||
      hasSmartFinishIntent ||
      hasSmartImageIntent ||
      hasSmartStampIntent);
  const hasCatalogDiscoveryScope =
    Boolean(artistSearch) ||
    gameScope !== "pokemon" ||
    Boolean(effectiveExactSetCode) ||
    typeof exactReleaseYear === "number" ||
    typeof exactIllustrator === "string" ||
    isIdentityFilterActive(identityFilter) ||
    hasSmartYearRange ||
    hasSmartFinishIntent ||
    hasSmartImageIntent ||
    hasSmartStampIntent ||
    hasInlineSetIntent;
  const shouldUseSmartFilterDiscovery =
    !query &&
    hasCatalogDiscoveryScope &&
    effectiveSmartSearchIntent.ownedState !== "owned";
  const shouldUseFastTextSearch =
    Boolean(query) &&
    !hasCatalogDiscoveryScope &&
    !hasSmartOwnershipIntent;

  if (!query && !completeSearch && gameScope === "pokemon" && !effectiveExactSetCode && !exactReleaseYear && !hasSmartYearRange && !hasSmartFinishIntent && !hasSmartImageIntent && !hasSmartOwnershipIntent && !hasSmartStampIntent && !exactIllustrator && !isIdentityFilterActive(identityFilter)) {
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
    let requestSupabase: Awaited<ReturnType<typeof createServerComponentClient>> | null = null;

    if (hasSmartOwnershipIntent || pricingRequested || gameScope !== "pokemon") {
      requestSupabase = await createServerComponentClient();
      const {
        data: { user },
      } = await requestSupabase.auth.getUser();
      userId = user?.id ?? null;
    }
    if (gameScope !== "pokemon") {
      // Catalog audience is governed by the database, independently of pricing.
      const visibility = await requestSupabase!.rpc("catalog_game_visible_to_request_v1", {
        p_game_code: gameScope,
      });
      const access = catalogSearchAccess(visibility, Boolean(userId));
      if (!access.allowed) {
        return NextResponse.json(
          { ok: false, error: access.error, game_scope: gameScope },
          { status: access.status, headers: { "Cache-Control": "private, no-store" } },
        );
      }
    }
    if (valueSortRequested && !userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sign in to sort search results by TCGPlayer Market.",
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

    if (gameScope !== "pokemon" && languageScope !== "all") {
      return NextResponse.json({ ok: false,
        error: "Language filtering is currently available for Pokémon. Remove the language filter to search this game; it has not been ignored.",
        smart_search: effectiveSmartSearchIntent,
      }, { status: 422, headers: { "Cache-Control": "private, no-store" } });
    }

    // Pricing is signed-in-only. For non-value sorts it is safe to defer the
    // bridge read until after filtering and the response limit are applied.
    // Value sorts still enrich the whole bounded candidate set so ordering
    // remains correct.
    const authenticatedIncludePricing = pricingRequested && Boolean(userId);
    const includePricingDuringResolution =
      authenticatedIncludePricing && valueSortRequested;

    const includeProvisional =
      gameScope === "pokemon" &&
      !completeSearch &&
      languageScope !== "ja" &&
      !exactReleaseYear &&
      !hasSmartYearRange &&
      !exactIllustrator &&
      !effectiveSmartSearchIntent.ownedState &&
      !isIdentityFilterActive(identityFilter);
    const resolvedSearchPromise = artistSearch
      ? getExploreRowsForArtistSearch(artistSearch, {
          sortMode,
          exactArtist: Boolean(exactIllustrator),
          artistNames: exactIllustrator ? undefined : smartSearchIntent.artistNames,
          exactIllustrator,
          textQuery: exactIllustrator || smartSearchIntent.artist ? routedQuery : "",
          exactSetCode: effectiveExactSetCode,
          exactSetCodes: exactSetCode ? undefined : inlineSetIntent.setCodes,
          exactReleaseYear,
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
      : completeCombinedSearch
      ? getExploreRowsForCombinedSearch({
          gameScope,
          exactIllustrator,
          exactSetCodes: exactSetCode ? undefined : inlineSetIntent.setCodes,
          sortMode,
          textQuery: routedQuery,
          exactSetCode: effectiveExactSetCode,
          exactReleaseYear,
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
      : gameScope !== "pokemon"
      ? getExploreRowsForGameScopedTextSearch(routedQuery, gameScope, sortMode, {
          exactSetCode: effectiveExactSetCode,
          exactReleaseYear,
          exactIllustrator,
          identityFilter,
          releaseYearMin: effectiveSmartSearchIntent.releaseYearMin,
          releaseYearMax: effectiveSmartSearchIntent.releaseYearMax,
          finishKeys: effectiveSmartSearchIntent.finishKeys,
          stampLabels: effectiveSmartSearchIntent.stampLabels,
          imageState: effectiveSmartSearchIntent.imageState,
          includePricing: includePricingDuringResolution,
        }).then((rows) => ({
          rows,
          meta: buildSmartFilterDiscoveryMeta(
            rows,
            effectiveSmartSearchIntent,
            shouldUseStructuredTextExpansion ? "structured_text" : "generic",
            effectiveExactSetCode ? [effectiveExactSetCode] : [],
          ),
          smartSearchIntent: effectiveSmartSearchIntent,
          degraded: false,
        }))
      : !query && effectiveSmartSearchIntent.ownedState === "owned" && userId
      ? getOwnedCardPrintIdsForUser(userId).then((ownedCardPrintIds) =>
          getExploreRowsForOwnedSmartFilterDiscovery(ownedCardPrintIds, {
            sortMode,
            exactSetCode: effectiveExactSetCode,
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
            routedQuery,
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
            exactSetCode: effectiveExactSetCode,
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
          ? getExploreRowsForGameScopedTextSearch(routedQuery, gameScope, sortMode, {
              exactSetCode: effectiveExactSetCode,
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
              meta: buildSmartFilterDiscoveryMeta(
                rows,
                effectiveSmartSearchIntent,
                "structured_text",
                effectiveExactSetCode ? [effectiveExactSetCode] : [],
              ),
              smartSearchIntent: effectiveSmartSearchIntent,
              degraded: false,
            }))
          : resolveQueryWithMeta(routedQuery, {
              mode: "ranked",
              sortMode,
              exactSetCode: effectiveExactSetCode,
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
        artistSearch ? 8000 : RESOLVER_RESPONSE_TIMEOUT_MS,
        buildDegradedSearchResult(query, effectiveSmartSearchIntent),
      ),
      includeProvisional
        ? getPublicProvisionalCardsFailClosed({
            query: rawQuery,
            setCode: effectiveExactSetCode,
            limit: 12,
          })
        : Promise.resolve([]),
    ]);
    if (completeSearch && resolved.degraded) {
      return NextResponse.json({
        ok: false,
        error: "Search timed out before all matches could be checked. Narrow the search or try again.",
        sort_degraded_reason: "resolver_timeout",
      }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
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
    const canonicalResults = gameScope === "pokemon"
      ? resolved.rows.filter((row) => matchesPublicLanguageScope(row, languageScope))
      : resolved.rows;
    const transitionGroups = completeSearch
      ? Array.from({ length: Math.ceil(canonicalResults.length / 200) }, (_, index) => canonicalResults.slice(index * 200, (index + 1) * 200))
      : [canonicalResults];
    const transitionMaps = await Promise.all(transitionGroups.map((group) =>
      getPromotionTransitionStateForCanonicalCards(group.map((row) => row.id)),
    ));
    const promotionTransitions = new Map(transitionMaps.flatMap((map) => [...map]));
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
    const artistPage = completeSearch
      ? paginateArtistResults(smartFilteredCanonicalResults, artistOffset, resultLimit, artistPaginationRequested)
      : null;
    const limitedCanonicalResultsWithoutDeferredPricing = artistPage
      ? artistPage.rows
      : smartFilteredCanonicalResults.slice(0, resultLimit);
    const limitedCanonicalResults =
      authenticatedIncludePricing &&
      !includePricingDuringResolution &&
      requestSupabase
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
        game_scope: gameScope,
        smart_search: responseSmartSearchIntent,
        rows: limitedCanonicalResults,
        provisional: provisionalResultsForResponse,
        meta: resolved.meta,
        limit: artistPage && !artistPaginationRequested ? limitedCanonicalResults.length : resultLimit,
        pagination: artistPage?.pagination,
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
            pricingRequested || effectiveSmartSearchIntent.ownedState || gameScope !== "pokemon"
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
      if (completeSearch) {
        return NextResponse.json({
          ok: false,
          error: "Search timed out before the complete matching set could be checked. Please narrow your search or try again.",
          sort_degraded_reason: "resolver_timeout",
        }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
      }
      console.warn("[public-search] resolver timed out; returning degraded empty result", {
        query,
        languageScope,
      });

      return NextResponse.json(
        {
          ok: valueSortRequested ? false : true,
          sort_degraded_reason: "resolver_timeout",
          ...(valueSortRequested
            ? {
                error:
                  "Value sorting timed out before a complete ordering could be produced. Narrow the search and try again.",
                requested_sort: sortMode,
                applied_sort: null,
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
