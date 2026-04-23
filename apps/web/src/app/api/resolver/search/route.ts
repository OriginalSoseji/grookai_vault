import { NextRequest, NextResponse } from "next/server";
import { isIdentityFilterActive, normalizeIdentityFilterKey } from "@/lib/cards/identitySearch";
import { getPublicProvisionalCards } from "@/lib/provisional/getPublicProvisionalCards";
import {
  applyPromotionTransitionsToCanonicalRows,
  getPromotionTransitionStateForCanonicalCards,
  suppressPromotedProvisionalRows,
} from "@/lib/provisional/getPromotionTransitionState";
import { resolveQueryWithMeta } from "@/lib/resolver/resolveQuery";

export const revalidate = 120;

// LOCK: Canonical and provisional results must remain separate.
// LOCK: Never merge provisional rows into canonical result arrays.
function parseSortMode(value: string | null) {
  if (value === "newest" || value === "oldest") {
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

function normalizeIllustrator(value: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.trim();
  const exactSetCode = normalizeSetCode(request.nextUrl.searchParams.get("set"));
  const exactReleaseYear = parseReleaseYear(request.nextUrl.searchParams.get("year"));
  const exactIllustrator = normalizeIllustrator(request.nextUrl.searchParams.get("illustrator"));
  const identityFilter = normalizeIdentityFilterKey(request.nextUrl.searchParams.get("identity"));
  const sortMode = parseSortMode(request.nextUrl.searchParams.get("sort"));

  if (!query && !exactSetCode && !exactReleaseYear && !exactIllustrator && !isIdentityFilterActive(identityFilter)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing search criteria",
      },
      { status: 400 },
    );
  }

  try {
    const includeProvisional =
      !exactReleaseYear &&
      !exactIllustrator &&
      !isIdentityFilterActive(identityFilter);
    const [resolved, provisionalResults] = await Promise.all([
      resolveQueryWithMeta(rawQuery, {
        mode: "ranked",
        sortMode,
        exactSetCode,
        exactReleaseYear,
        exactIllustrator,
        identityFilter,
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
    // LOCK: Canonical truth must replace promoted provisional visibility.
    // LOCK: Do not dual-render the same entity across canonical and provisional sections.
    // LOCK: Uniqueness suppression must use explicit canonical linkage only.
    // LOCK: Never dedupe canonical/provisional by fuzzy identity.
    const canonicalResultIds = new Set(
      canonicalResultsWithTransitions.map((row) => normalizeOptionalText(row.id)).filter(Boolean),
    );
    const provisionalResultsAfterCanonicalIdGuard = provisionalResults.filter((row) => {
      const promotedCardPrintId = normalizeOptionalText(
        (row as { promoted_card_print_id?: unknown }).promoted_card_print_id,
      );
      return !promotedCardPrintId || !canonicalResultIds.has(promotedCardPrintId);
    });
    const provisionalResultsForResponse = suppressPromotedProvisionalRows(
      provisionalResultsAfterCanonicalIdGuard,
      canonicalResultsWithTransitions,
    );

    if (
      canonicalResultsWithTransitions.length > 0 &&
      provisionalResultsForResponse.some((row) => "gv_id" in row)
    ) {
      throw new Error("SECURITY: GV-ID found in provisional search results");
    }

    return NextResponse.json(
      {
        ok: true,
        query,
        rows: canonicalResultsWithTransitions,
        canonical: canonicalResultsWithTransitions,
        provisional: provisionalResultsForResponse,
        meta: resolved.meta,
        source: "web_ranked_resolver_v2",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
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
