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
  getExploreRowsForSmartFilterDiscovery,
} from "@/lib/explore/getExploreRows";
import { resolveQueryWithMeta } from "@/lib/resolver/resolveQuery";
import type { ResolverMeta } from "@/lib/resolver/resolveQuery";
import { resolvePublicSetRouteCode } from "@/lib/publicSets.shared";
import { buildSmartSearchIntent, type SmartSearchIntent } from "@/lib/search/smartSearchIntent";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  getOwnedCardPrintIdsForUser,
  getOwnedCountsByCardPrintIds,
} from "@/lib/vault/getOwnedCountsByCardPrintIds";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";

export const revalidate = 120;

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
  residualQuery?: string,
): ResolverMeta {
  const effectiveQuery = residualQuery || smartSearchIntent.residualQuery;
  return {
    resolverState: rows.length > 0 ? "WEAK_MATCH" : "NO_MATCH",
    topScore: null,
    candidateCount: rows.length,
    autoResolved: false,
    intentSummary: {
      expectedSetCodes: [],
      nameTokens: effectiveQuery
        ? effectiveQuery.split(/\s+/).filter(Boolean)
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
  const smartSearchIntent = buildSmartSearchIntent(rawQuery);
  const query = smartSearchIntent.residualQuery || rawQuery.trim();
  const exactSetCode = resolvePublicSetRouteCode(normalizeSetCode(request.nextUrl.searchParams.get("set")));
  const exactReleaseYear = parseReleaseYear(request.nextUrl.searchParams.get("year"));
  const explicitYearMin = parseReleaseYearBound(request.nextUrl.searchParams.get("year_min"));
  const explicitYearMax = parseReleaseYearBound(request.nextUrl.searchParams.get("year_max"));
  const explicitFinishKeys = parseMultiParam(request.nextUrl.searchParams, "finish");
  const explicitStampLabels = parseMultiParam(request.nextUrl.searchParams, "stamp");
  const explicitImageState = parseImageState(request.nextUrl.searchParams.get("image_state") ?? request.nextUrl.searchParams.get("image"));
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
  const sortMode = parseSortMode(request.nextUrl.searchParams.get("sort"));
  const hasSmartYearRange =
    typeof effectiveSmartSearchIntent.releaseYearMin === "number" ||
    typeof effectiveSmartSearchIntent.releaseYearMax === "number";
  const hasSmartFinishIntent = effectiveSmartSearchIntent.finishKeys.length > 0;
  const hasSmartImageIntent = Boolean(effectiveSmartSearchIntent.imageState && effectiveSmartSearchIntent.imageState !== "any");
  const hasSmartOwnershipIntent = Boolean(effectiveSmartSearchIntent.ownedState && effectiveSmartSearchIntent.ownedState !== "any");
  const hasSmartStampIntent = effectiveSmartSearchIntent.stampLabels.length > 0;
  const hasTextualCatalogFilter =
    Boolean(query) &&
    (
      Boolean(exactSetCode) ||
      typeof exactReleaseYear === "number" ||
      typeof exactIllustrator === "string" ||
      isIdentityFilterActive(identityFilter) ||
      hasSmartYearRange ||
      hasSmartFinishIntent ||
      hasSmartImageIntent ||
      hasSmartStampIntent
    );
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
    (!query || hasTextualCatalogFilter) &&
    hasCatalogDiscoveryScope &&
    effectiveSmartSearchIntent.ownedState !== "owned";

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
    const supabase = createServerComponentClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const includeProvisional =
      !exactReleaseYear &&
      !hasSmartYearRange &&
      !exactIllustrator &&
      !effectiveSmartSearchIntent.ownedState &&
      !isIdentityFilterActive(identityFilter);
    const [resolved, provisionalResults] = await Promise.all([
      effectiveSmartSearchIntent.ownedState === "owned" && userId && hasCatalogDiscoveryScope
        ? getOwnedCardPrintIdsForUser(userId).then((ownedCardPrintIds) =>
            getExploreRowsForOwnedSmartFilterDiscovery(ownedCardPrintIds, {
              sortMode,
              textQuery: query,
              exactSetCode,
              exactReleaseYear,
              exactIllustrator,
              identityFilter,
              releaseYearMin: effectiveSmartSearchIntent.releaseYearMin,
              releaseYearMax: effectiveSmartSearchIntent.releaseYearMax,
              finishKeys: effectiveSmartSearchIntent.finishKeys,
              stampLabels: effectiveSmartSearchIntent.stampLabels,
              imageState: effectiveSmartSearchIntent.imageState,
            }),
          ).then((rows) => ({
            rows,
            meta: buildSmartFilterDiscoveryMeta(rows, effectiveSmartSearchIntent, query),
          }))
        : shouldUseSmartFilterDiscovery
          ? getExploreRowsForSmartFilterDiscovery({
            sortMode,
            textQuery: query,
            exactSetCode,
            exactReleaseYear,
            exactIllustrator,
            identityFilter,
            releaseYearMin: effectiveSmartSearchIntent.releaseYearMin,
            releaseYearMax: effectiveSmartSearchIntent.releaseYearMax,
            finishKeys: effectiveSmartSearchIntent.finishKeys,
            stampLabels: effectiveSmartSearchIntent.stampLabels,
            imageState: effectiveSmartSearchIntent.imageState,
          }).then((rows) => ({
            rows,
            meta: buildSmartFilterDiscoveryMeta(rows, effectiveSmartSearchIntent, query),
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
          }),
      includeProvisional
        ? getPublicProvisionalCards({
            query: rawQuery,
            setCode: exactSetCode,
            limit: 12,
          }).catch((error) => {
            if (error instanceof Error && error.message.startsWith("SECURITY:")) {
              throw error;
            }

            if (process.env.NODE_ENV !== "production") {
              console.warn("[public-provisional] search adapter failed closed", {
                message: error instanceof Error ? error.message : "unknown",
              });
            }
            return [];
          })
        : Promise.resolve([]),
    ]);
    const canonicalResults = resolved.rows;
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

    const responseMeta =
      hasCatalogDiscoveryScope || hasSmartOwnershipIntent
        ? {
            ...resolved.meta,
            candidateCount: smartFilteredCanonicalResults.length,
          }
        : resolved.meta;

    return NextResponse.json(
      {
        ok: true,
        query,
        smart_search: responseSmartSearchIntent,
        rows: smartFilteredCanonicalResults,
        canonical: smartFilteredCanonicalResults,
        provisional: provisionalResultsForResponse,
        meta: responseMeta,
        source: "web_ranked_resolver_v2",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          ...(effectiveSmartSearchIntent.ownedState ? { "Cache-Control": "private, no-store" } : {}),
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resolver request failed.";
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
