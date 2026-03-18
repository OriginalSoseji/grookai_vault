"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CompareTray from "@/components/compare/CompareTray";
import ExploreCardDetailsRow from "@/components/explore/ExploreCardDetailsRow";
import ExploreCardGridItem from "@/components/explore/ExploreCardGridItem";
import ExploreCardListItem from "@/components/explore/ExploreCardListItem";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import ExploreViewModeToggle from "@/components/explore/ExploreViewModeToggle";
import { buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";
import { getExploreRows } from "@/lib/explore/getExploreRows";
import { normalizeExploreViewMode, type ExploreViewMode } from "@/lib/exploreViewModes";

type ExploreRow = ExploreResultCard;
type SortMode = "relevance" | "newest" | "oldest";

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

type ExplorePageClientProps = {
  discoveryContent?: ReactNode;
  canViewPricing: boolean;
};

export default function ExplorePageClient({ discoveryContent = null, canViewPricing }: ExplorePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const exactSetCode = normalizeSetCode(searchParams.get("set"));
  const exactReleaseYear = parseReleaseYear(searchParams.get("year"));
  const exactIllustrator = (searchParams.get("illustrator") ?? "").trim() || "";
  const viewMode = parseViewMode(searchParams.get("view"));
  const sortMode = parseSortMode(searchParams.get("sort"));
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const normalizedQuery = normalizeFreeTextQuery(q);
  const isDiscoveryMode = !normalizedQuery && !exactSetCode && !exactReleaseYear && !exactIllustrator;
  const [rows, setRows] = useState<ExploreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!normalizedQuery && !exactSetCode && !exactReleaseYear && !exactIllustrator) {
        setRows([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextRows = await getExploreRows(
          normalizedQuery,
          sortMode,
          exactSetCode,
          exactReleaseYear,
          exactIllustrator || undefined,
        );
        if (cancelled) return;
        setRows(nextRows);
      } catch (searchError) {
        if (cancelled) return;
        setError(searchError instanceof Error ? searchError.message : "Search failed.");
        setRows([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [normalizedQuery, sortMode, exactSetCode, exactReleaseYear, exactIllustrator]);

  const commitViewMode = (nextViewMode: ExploreViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextViewMode);
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const commitSortMode = (nextSortMode: SortMode) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSortMode === "relevance") {
      params.delete("sort");
    } else {
      params.set("sort", nextSortMode);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const buildCardHref = (gvId: string) => buildPathWithCompareCards(`/card/${gvId}`, "", compareCards);
  const currentPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const pricingSignInHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const emptyState = (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
      No results yet.
    </div>
  );

  return (
    <div className={`space-y-4 md:space-y-5 ${compareCards.length > 0 ? "pb-28 md:pb-36" : ""}`}>
      <div className="space-y-2 md:space-y-2.5">
        <div className="space-y-1 md:hidden">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Feed</p>
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-950">Discover cards</h1>
          <p className="text-[13px] leading-5 text-slate-600">Browse standout cards and jump into sets fast.</p>
          <div className="flex flex-wrap gap-2 pt-px">
            <Link
              href={buildPathWithCompareCards("/sets", "", compareCards)}
              className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
            >
              Browse Sets
            </Link>
            <Link
              href={buildPathWithCompareCards("/explore", "q=Pikachu", compareCards)}
              className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
            >
              Browse Pokémon
            </Link>
          </div>
        </div>

        <div className="hidden space-y-2 md:block">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Public Explorer</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Explore cards</h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">
            Discover iconic cards, standout artwork, and notable sets collectors are chasing.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isDiscoveryMode ? (
        <>
          {discoveryContent}
          <CompareTray
            cards={compareCards}
            addHref={buildPathWithCompareCards(pathname, searchParams.toString(), compareCards)}
          />
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-600">
              {rows.length > 0 ? `${rows.length} result${rows.length === 1 ? "" : "s"}` : "Results"}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>Sort</span>
                <select
                  value={sortMode}
                  onChange={(event) => commitSortMode(event.target.value as SortMode)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
              <ExploreViewModeToggle value={viewMode} onChange={commitViewMode} />
            </div>
          </div>

          {viewMode === "list" ? (
            <ul className="space-y-3">
              {rows.map((row) => (
                <ExploreCardListItem
                  key={row.id}
                  card={row}
                  href={buildCardHref(row.gv_id)}
                  canViewPricing={canViewPricing}
                  signInHref={pricingSignInHref}
                />
              ))}
              {rows.length === 0 && !loading && <li>{emptyState}</li>}
            </ul>
          ) : viewMode === "details" ? (
            <div className="space-y-3">
              <div className="md:hidden">
                <ul className="space-y-3">
                  {rows.map((row) => (
                    <ExploreCardListItem
                      key={row.id}
                      card={row}
                      href={buildCardHref(row.gv_id)}
                      canViewPricing={canViewPricing}
                      signInHref={pricingSignInHref}
                    />
                  ))}
                  {rows.length === 0 && !loading && <li>{emptyState}</li>}
                </ul>
              </div>
              <div className="hidden overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Card</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Set</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Number</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rarity</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Variant</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grookai Value</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Compare</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <ExploreCardDetailsRow
                          key={row.id}
                          card={row}
                          href={buildCardHref(row.gv_id)}
                          canViewPricing={canViewPricing}
                          signInHref={pricingSignInHref}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length === 0 && !loading ? <div className="p-4">{emptyState}</div> : null}
              </div>
            </div>
          ) : viewMode === "thumb-lg" ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <ExploreCardGridItem
                  key={row.id}
                  card={row}
                  href={buildCardHref(row.gv_id)}
                  mode="thumb-lg"
                  canViewPricing={canViewPricing}
                />
              ))}
              {rows.length === 0 && !loading ? <div className="sm:col-span-2 xl:col-span-3">{emptyState}</div> : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map((row) => (
                <ExploreCardGridItem
                  key={row.id}
                  card={row}
                  href={buildCardHref(row.gv_id)}
                  mode="thumb"
                  canViewPricing={canViewPricing}
                />
              ))}
              {rows.length === 0 && !loading ? <div className="sm:col-span-2 xl:col-span-4">{emptyState}</div> : null}
            </div>
          )}
        </div>
      )}

      {!isDiscoveryMode && rows.length > 0 && canViewPricing && viewMode === "details" ? (
        <div className="text-xs text-slate-500 md:hidden">
          Beta market estimate.
        </div>
      ) : null}

      {!isDiscoveryMode && rows.length > 0 && canViewPricing && (viewMode === "thumb" || viewMode === "thumb-lg" || viewMode === "list") ? (
        <div className="hidden text-xs text-slate-500 sm:block">
          Beta market estimate. Derived from active listings and market data.
        </div>
      ) : null}

      {!isDiscoveryMode ? (
        <CompareTray
          cards={compareCards}
          addHref={buildPathWithCompareCards(pathname, searchParams.toString(), compareCards)}
        />
      ) : null}
    </div>
  );
}
