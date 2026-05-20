"use client";

import { Fragment, type ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildIdentityFilterCounts,
  getIdentityFilterLabel,
  IDENTITY_FILTER_OPTIONS,
  isIdentityFilterActive,
  matchesIdentityFilter,
  normalizeIdentityFilterKey,
  type IdentityFilterKey,
} from "@/lib/cards/identitySearch";
import CompareTray from "@/components/compare/CompareTray";
import {
  POKEMON_CARD_BROWSE_GRID_CLASSNAME,
  POKEMON_CARD_BROWSE_LARGE_GRID_CLASSNAME,
} from "@/components/cards/pokemonCardGridLayout";
import ExploreCardDetailsRow from "@/components/explore/ExploreCardDetailsRow";
import ExploreCardGridItem from "@/components/explore/ExploreCardGridItem";
import ExploreCardListItem from "@/components/explore/ExploreCardListItem";
import PublicProvisionalSearchSection from "@/components/provisional/PublicProvisionalSearchSection";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import { getSearchContextLabel } from "@/components/explore/searchContextLabel";
import ExploreViewModeToggle from "@/components/explore/ExploreViewModeToggle";
import {
  buildPathWithCompareCards,
  normalizeCompareCardsParam,
} from "@/lib/compareCards";
import {
  normalizeExploreViewMode,
  type ExploreViewMode,
} from "@/lib/exploreViewModes";
import { useClientViewer } from "@/lib/auth/useClientViewer";
import type { ResolverMeta } from "@/lib/resolver/resolveQuery";
import type { PublicProvisionalCard } from "@/lib/provisional/publicProvisionalTypes";

type ExploreRow = ExploreResultCard;
type SortMode = "relevance" | "newest" | "oldest";
type SearchResultIntent = "exact_version" | "identity" | "cameo" | "related";

const INITIAL_VISIBLE_RESULT_COUNT = 48;

const SEARCH_RESULT_INTENT_COPY: Record<
  SearchResultIntent,
  { label: string; description: string }
> = {
  exact_version: {
    label: "Exact version matches",
    description: "Specific finishes, variants, stamps, and printing IDs.",
  },
  identity: {
    label: "Card identity matches",
    description: "Primary card matches ranked by the resolver.",
  },
  cameo: {
    label: "Cameo matches",
    description: "Supplemental appearance context, kept secondary to identity.",
  },
  related: {
    label: "Related results",
    description: "Additional ranked results that may still match the query.",
  },
};

function isCameoLabel(value?: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return (
    normalized.startsWith("cameo:") ||
    normalized.startsWith("cameo trainer:")
  );
}

function classifySearchResultIntent(row: ExploreRow): SearchResultIntent {
  const searchContext = getSearchContextLabel(row);

  if (isCameoLabel(searchContext)) {
    return "cameo";
  }

  if (
    row.search_object_type === "child_printing" ||
    row.printing_gv_id ||
    row.selected_printing_gv_id
  ) {
    return "exact_version";
  }

  if (row.gv_id || row.name) {
    return "identity";
  }

  return "related";
}

function buildContiguousSearchResultGroups(rows: ExploreRow[]) {
  const groups: Array<{ intent: SearchResultIntent; rows: ExploreRow[] }> = [];

  for (const row of rows) {
    const intent = classifySearchResultIntent(row);
    const currentGroup = groups[groups.length - 1];

    if (currentGroup?.intent === intent) {
      currentGroup.rows.push(row);
    } else {
      groups.push({ intent, rows: [row] });
    }
  }

  return groups;
}

function getSearchResultMatchReason(row: ExploreRow) {
  const searchContext = getSearchContextLabel(row);

  if (isCameoLabel(searchContext)) {
    return `Matched ${searchContext}`;
  }

  if (row.search_object_type === "child_printing") {
    return `Matched selected version: ${searchContext ?? row.finish_label ?? "variant"}`;
  }

  if (row.display_discriminator) {
    return `Matched ${row.display_discriminator}`;
  }

  if (row.set_name && row.number) {
    return `Matched identity in ${row.set_name} #${row.number}`;
  }

  if (row.set_name) {
    return `Matched identity in ${row.set_name}`;
  }

  return "Matched card identity";
}

function parseViewMode(value: string | null): ExploreViewMode {
  return normalizeExploreViewMode(value);
}

function parseSortMode(value: string | null): SortMode {
  if (value === "newest" || value === "oldest") {
    return value;
  }

  return "relevance";
}

function normalizeSetCode(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized || "";
}

function parseReleaseYear(value?: string | null) {
  const normalized = (value ?? "").trim();
  if (!/^\d{4}$/.test(normalized)) {
    return undefined;
  }

  const parsedYear = Number(normalized);
  return Number.isFinite(parsedYear) ? parsedYear : undefined;
}

function normalizeFreeTextQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseIdentityFilter(value: string | null): IdentityFilterKey {
  return normalizeIdentityFilterKey(value);
}

function getResolverSummary(meta: ResolverMeta | null) {
  if (!meta) {
    return null;
  }

  const hasStrongIntent =
    meta.intentSummary.expectedSetCodes.length > 0 ||
    meta.intentSummary.nameTokens.length > 0;
  const refinedMatchSummary = {
    tone: "border-sky-200 bg-sky-50/70",
    title: "Refined match",
    body: "Structured query intent narrowed the pool, but the resolver is still preserving ambiguity instead of forcing a single identity.",
  };

  switch (meta.resolverState) {
    case "DIRECT_MATCH":
      return null;
    case "AMBIGUOUS_MATCH":
      if (hasStrongIntent) {
        return refinedMatchSummary;
      }

      return {
        tone: "border-amber-200 bg-amber-50/70",
        title: "Multiple plausible matches",
        body: "The query is still ambiguous. Review the ranked candidates instead of treating the top result as certain.",
      };
    case "WEAK_MATCH":
      if (hasStrongIntent) {
        return refinedMatchSummary;
      }

      return {
        tone: "border-slate-200 bg-slate-50",
        title: "Weak match",
        body: "These results are approximate. Add a set code, collector number, or promo code to strengthen the match.",
      };
    case "NO_MATCH":
      return {
        tone: "border-slate-200 bg-slate-50",
        title: "No matching cards",
        body: "No viable deterministic match was found for this query.",
      };
  }
}

type ExplorePageClientProps = {
  discoveryContent?: ReactNode;
  canViewPricing: boolean;
};

export default function ExplorePageClient({
  discoveryContent = null,
  canViewPricing,
}: ExplorePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewer = useClientViewer(null);
  const q = searchParams.get("q") ?? "";
  const exactSetCode = normalizeSetCode(searchParams.get("set"));
  const exactReleaseYear = parseReleaseYear(searchParams.get("year"));
  const exactIllustrator = (searchParams.get("illustrator") ?? "").trim() || "";
  const identityFilter = parseIdentityFilter(searchParams.get("identity"));
  const viewMode = parseViewMode(searchParams.get("view"));
  const sortMode = parseSortMode(searchParams.get("sort"));
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const normalizedQuery = normalizeFreeTextQuery(q);
  const shouldServerFilterByIdentity =
    isIdentityFilterActive(identityFilter) &&
    !normalizedQuery &&
    !exactSetCode &&
    !exactReleaseYear &&
    !exactIllustrator;
  const isDiscoveryMode =
    !normalizedQuery &&
    !exactSetCode &&
    !exactReleaseYear &&
    !exactIllustrator &&
    !isIdentityFilterActive(identityFilter);
  const [rows, setRows] = useState<ExploreRow[]>([]);
  const [provisionalRows, setProvisionalRows] = useState<PublicProvisionalCard[]>([]);
  const [resolverMeta, setResolverMeta] = useState<ResolverMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleResultCount, setVisibleResultCount] = useState(
    INITIAL_VISIBLE_RESULT_COUNT,
  );
  const effectiveCanViewPricing = canViewPricing || viewer.isAuthenticated;

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (
        !normalizedQuery &&
        !exactSetCode &&
        !exactReleaseYear &&
        !exactIllustrator &&
        !isIdentityFilterActive(identityFilter)
      ) {
        setRows([]);
        setProvisionalRows([]);
        setResolverMeta(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (q) {
          params.set("q", q);
        }

        if (sortMode !== "relevance") {
          params.set("sort", sortMode);
        }

        if (exactSetCode) {
          params.set("set", exactSetCode);
        }

        if (typeof exactReleaseYear === "number") {
          params.set("year", String(exactReleaseYear));
        }

        if (exactIllustrator) {
          params.set("illustrator", exactIllustrator);
        }

        if (shouldServerFilterByIdentity) {
          params.set("identity", identityFilter);
        }

        const response = await fetch(
          `/api/resolver/search?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as {
          ok: boolean;
          error?: string;
          rows?: ExploreRow[];
          canonical?: ExploreRow[];
          provisional?: PublicProvisionalCard[];
          meta?: ResolverMeta;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? "Search failed.");
        }

        setRows(payload.canonical ?? payload.rows ?? []);
        setProvisionalRows(payload.provisional ?? []);
        setResolverMeta(payload.meta ?? null);
      } catch (searchError) {
        if (controller.signal.aborted) return;
        setError(
          searchError instanceof Error ? searchError.message : "Search failed.",
        );
        setRows([]);
        setProvisionalRows([]);
        setResolverMeta(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [
    q,
    normalizedQuery,
    sortMode,
    exactSetCode,
    exactReleaseYear,
    exactIllustrator,
    identityFilter,
    shouldServerFilterByIdentity,
  ]);

  useEffect(() => {
    setVisibleResultCount(INITIAL_VISIBLE_RESULT_COUNT);
  }, [
    normalizedQuery,
    sortMode,
    exactSetCode,
    exactReleaseYear,
    exactIllustrator,
    identityFilter,
  ]);

  const commitViewMode = (nextViewMode: ExploreViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextViewMode);
    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const commitSortMode = (nextSortMode: SortMode) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSortMode === "relevance") {
      params.delete("sort");
    } else {
      params.set("sort", nextSortMode);
    }

    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const commitIdentityFilter = (nextFilter: IdentityFilterKey) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextFilter === "all") {
      params.delete("identity");
    } else {
      params.set("identity", nextFilter);
    }

    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const buildCardHref = (row: Pick<ExploreRow, "gv_id" | "selected_printing_gv_id" | "printing_gv_id" | "route_query">) => {
    const selectedPrintingGvId = row.selected_printing_gv_id ?? row.printing_gv_id;
    const params = new URLSearchParams();
    if (selectedPrintingGvId) {
      params.set("printing", selectedPrintingGvId);
    } else if (row.route_query) {
      const routeParams = new URLSearchParams(row.route_query);
      const printing = routeParams.get("printing");
      if (printing) {
        params.set("printing", printing);
      }
    }

    return buildPathWithCompareCards(`/card/${row.gv_id}`, params.toString(), compareCards);
  };
  const currentPath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  const pricingSignInHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const displayRows =
    shouldServerFilterByIdentity || !isIdentityFilterActive(identityFilter)
      ? rows
      : rows.filter((row) => matchesIdentityFilter(row, identityFilter));
  const visibleRows = displayRows.slice(0, visibleResultCount);
  const visibleResultGroups = buildContiguousSearchResultGroups(visibleRows);
  const hasMoreResults = visibleRows.length < displayRows.length;
  const getResultKey = (row: ExploreRow) =>
    row.search_card_printing_id ?? row.printing_gv_id ?? row.id;
  const identityFilterCounts = buildIdentityFilterCounts(rows);
  const visibleIdentityFilters = IDENTITY_FILTER_OPTIONS.filter(
    (option) =>
      option.key === "all" ||
      identityFilterCounts[option.key] > 0 ||
      option.key === identityFilter,
  );
  const resolverSummary = normalizedQuery
    ? getResolverSummary(resolverMeta)
    : null;
  const resultCountLabel =
    displayRows.length > 0
      ? visibleRows.length < displayRows.length
        ? `Showing ${visibleRows.length} of ${displayRows.length} results`
        : `${displayRows.length} result${displayRows.length === 1 ? "" : "s"}`
      : "Results";
  const emptyState = (
    <div className="rounded-[20px] border border-slate-200 bg-white px-5 py-7 text-sm text-slate-600 shadow-sm">
      <p className="gv-hi-card-identity text-base font-semibold text-slate-950">
        {resolverMeta?.resolverState === "NO_MATCH" && normalizedQuery
          ? "No card match yet"
          : isIdentityFilterActive(identityFilter)
            ? `No ${getIdentityFilterLabel(identityFilter).toLowerCase()} cards found`
            : "No results yet"}
      </p>
      <p className="mt-2 max-w-xl leading-6">
        {resolverMeta?.resolverState === "NO_MATCH" && normalizedQuery
          ? `Nothing matched "${normalizedQuery}". Try a card name plus set code, collector number, finish, or cameo subject.`
          : "Try a card name, set code, collector number, finish, trainer, or cameo subject."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {["pikachu masterball", "sv8pt5 exeggutor pokeball", "GV-PK-ME03-033-RH", "cameo charizard"].map((suggestion) => (
          <Link
            key={suggestion}
            href={buildPathWithCompareCards(
              "/explore",
              `q=${encodeURIComponent(suggestion)}`,
              compareCards,
            )}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
          >
            {suggestion}
          </Link>
        ))}
      </div>
    </div>
  );
  const loadingState = (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Searching cards</p>
          <p className="mt-1 text-xs text-slate-500">
            Ranking identity, finish, ownership context, and cameo signals.
          </p>
        </div>
        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-900" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-[16px] border border-slate-100 bg-slate-50 p-3">
            <div className="h-28 rounded-xl bg-slate-200/70" />
            <div className="mt-3 h-3 w-2/3 rounded-full bg-slate-200" />
            <div className="mt-2 h-2.5 w-1/2 rounded-full bg-slate-200/80" />
          </div>
        ))}
      </div>
    </div>
  );
  const renderGroupHeader = (
    group: { intent: SearchResultIntent; rows: ExploreRow[] },
    options: { table?: boolean } = {},
  ) => {
    const copy = SEARCH_RESULT_INTENT_COPY[group.intent];
    const content = (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {copy.label}
          </p>
          <p className="mt-1 text-xs text-slate-500">{copy.description}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
          {group.rows.length}
        </span>
      </div>
    );

    if (options.table) {
      return (
        <tr>
          <td colSpan={7} className="bg-white px-4 pb-2 pt-5">
            {content}
          </td>
        </tr>
      );
    }

    return content;
  };
  const showMoreControl = hasMoreResults ? (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={() =>
          setVisibleResultCount((current) => current + INITIAL_VISIBLE_RESULT_COUNT)
        }
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
      >
        Show more results
      </button>
    </div>
  ) : null;

  return (
    <div
      className={`space-y-4 md:space-y-5 ${compareCards.length > 0 ? "pb-28 md:pb-36" : ""}`}
    >
      <div className="space-y-2 md:space-y-2.5">
        <div className="space-y-1 md:hidden">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
            Discover
          </p>
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-950">
            Discover cards
          </h1>
          <p className="text-[13px] leading-5 text-slate-600">
            Track your cards. Discover more. Showcase your collection.
          </p>
          <div className="flex flex-wrap gap-2 pt-px">
            <Link
              href={buildPathWithCompareCards("/sets", "", compareCards)}
              className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
            >
              Browse Sets
            </Link>
            <Link
              href={buildPathWithCompareCards(
                "/explore",
                "q=Pikachu",
                compareCards,
              )}
              className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
            >
              Browse Pokémon
            </Link>
          </div>
        </div>

        <div className="hidden space-y-2 md:block">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Public Explorer
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            Explore cards
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">
            Discover iconic cards, standout artwork, and notable sets collectors
            are chasing.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isDiscoveryMode ? (
        <>
          {discoveryContent}
          <CompareTray
            cards={compareCards}
            addHref={buildPathWithCompareCards(
              pathname,
              searchParams.toString(),
              compareCards,
            )}
          />
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-600">
              {resultCountLabel}
              {loading && displayRows.length > 0 ? (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  Refreshing
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>Sort</span>
                <select
                  value={sortMode}
                  onChange={(event) =>
                    commitSortMode(event.target.value as SortMode)
                  }
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
              <ExploreViewModeToggle
                value={viewMode}
                onChange={commitViewMode}
              />
            </div>
          </div>

          {visibleIdentityFilters.length > 1 ? (
            <div className="flex flex-wrap gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
              {visibleIdentityFilters.map((option) => {
                const selected = identityFilter === option.key;
                const count = identityFilterCounts[option.key];

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => commitIdentityFilter(option.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      selected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <span>{option.label}</span>
                    {count > 0 ? (
                      <span
                        className={`text-[11px] ${selected ? "text-white/80" : "text-slate-500"}`}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {resolverSummary ? (
            <div
              className={`rounded-[16px] border px-4 py-3 text-sm shadow-sm ${resolverSummary.tone}`}
            >
              <p className="font-medium text-slate-900">
                {resolverSummary.title}
              </p>
              <p className="mt-1 text-slate-600">{resolverSummary.body}</p>
            </div>
          ) : null}

          {loading && displayRows.length === 0 ? (
            loadingState
          ) : viewMode === "list" ? (
            <div className="space-y-5">
              {visibleResultGroups.map((group, groupIndex) => (
                <section key={`${group.intent}-${groupIndex}`} className="space-y-3">
                  {renderGroupHeader(group)}
                  <ul className="space-y-3">
                    {group.rows.map((row) => (
                      <ExploreCardListItem
                        key={getResultKey(row)}
                        card={row}
                        href={buildCardHref(row)}
                        canViewPricing={effectiveCanViewPricing}
                        signInHref={pricingSignInHref}
                        matchReason={getSearchResultMatchReason(row)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
              {displayRows.length === 0 && !loading ? emptyState : null}
              {showMoreControl}
            </div>
          ) : viewMode === "details" ? (
            <div className="space-y-3">
              <div className="md:hidden">
                <div className="space-y-5">
                  {visibleResultGroups.map((group, groupIndex) => (
                    <section key={`${group.intent}-${groupIndex}`} className="space-y-3">
                      {renderGroupHeader(group)}
                      <ul className="space-y-3">
                        {group.rows.map((row) => (
                          <ExploreCardListItem
                            key={getResultKey(row)}
                            card={row}
                            href={buildCardHref(row)}
                            canViewPricing={effectiveCanViewPricing}
                            signInHref={pricingSignInHref}
                            matchReason={getSearchResultMatchReason(row)}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                  {displayRows.length === 0 && !loading ? emptyState : null}
                  {showMoreControl}
                </div>
              </div>
              <div className="hidden overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Card
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Set
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Number
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Rarity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Variant
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Grookai Value
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Compare
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleResultGroups.map((group, groupIndex) => (
                        <Fragment key={`${group.intent}-${groupIndex}`}>
                          {renderGroupHeader(group, { table: true })}
                          {group.rows.map((row) => (
                            <ExploreCardDetailsRow
                              key={getResultKey(row)}
                              card={row}
                              href={buildCardHref(row)}
                              canViewPricing={effectiveCanViewPricing}
                              signInHref={pricingSignInHref}
                              matchReason={getSearchResultMatchReason(row)}
                            />
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                {displayRows.length === 0 && !loading ? (
                  <div className="p-4">{emptyState}</div>
                ) : null}
              </div>
              <div className="hidden md:block">{showMoreControl}</div>
            </div>
          ) : viewMode === "thumb-lg" ? (
            <div className="space-y-5">
              {visibleResultGroups.map((group, groupIndex) => (
                <section key={`${group.intent}-${groupIndex}`} className="space-y-3">
                  {renderGroupHeader(group)}
                  <div className={POKEMON_CARD_BROWSE_LARGE_GRID_CLASSNAME}>
                    {group.rows.map((row) => (
                      <ExploreCardGridItem
                        key={getResultKey(row)}
                        card={row}
                        href={buildCardHref(row)}
                        mode="thumb-lg"
                        canViewPricing={effectiveCanViewPricing}
                        matchReason={getSearchResultMatchReason(row)}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {displayRows.length === 0 && !loading ? emptyState : null}
              {showMoreControl}
            </div>
          ) : (
            <div className="space-y-5">
              {visibleResultGroups.map((group, groupIndex) => (
                <section key={`${group.intent}-${groupIndex}`} className="space-y-3">
                  {renderGroupHeader(group)}
                  <div className={POKEMON_CARD_BROWSE_GRID_CLASSNAME}>
                    {group.rows.map((row) => (
                      <ExploreCardGridItem
                        key={getResultKey(row)}
                        card={row}
                        href={buildCardHref(row)}
                        mode="thumb"
                        canViewPricing={effectiveCanViewPricing}
                        matchReason={getSearchResultMatchReason(row)}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {displayRows.length === 0 && !loading ? emptyState : null}
              {showMoreControl}
            </div>
          )}

          <PublicProvisionalSearchSection cards={provisionalRows} />
        </div>
      )}

      {!isDiscoveryMode &&
      displayRows.length > 0 &&
      effectiveCanViewPricing &&
      viewMode === "details" ? (
        <div className="text-xs text-slate-500 md:hidden">
          Beta market estimate.
        </div>
      ) : null}

      {!isDiscoveryMode &&
      displayRows.length > 0 &&
      effectiveCanViewPricing &&
      (viewMode === "thumb" ||
        viewMode === "thumb-lg" ||
        viewMode === "list") ? (
        <div className="hidden text-xs text-slate-500 sm:block">
          Beta market estimate. Derived from active listings and market data.
        </div>
      ) : null}

      {!isDiscoveryMode ? (
        <CompareTray
          cards={compareCards}
          addHref={buildPathWithCompareCards(
            pathname,
            searchParams.toString(),
            compareCards,
          )}
        />
      ) : null}
    </div>
  );
}
