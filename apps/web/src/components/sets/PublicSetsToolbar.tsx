"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildCompareCardsParam, normalizeCompareCardsParam } from "@/lib/compareCards";
import {
  PUBLIC_SET_FILTER_OPTIONS,
  normalizePublicSetFilter,
  type PublicSetFilter,
} from "@/lib/publicSets";

export default function PublicSetsToolbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const currentFilter = normalizePublicSetFilter(searchParams.get("filter"));
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const compareCardsParam = buildCompareCardsParam(compareCards);
  const [query, setQuery] = useState(currentQuery);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  function buildNextUrl(nextQuery: string, nextFilter: PublicSetFilter) {
    const params = new URLSearchParams();
    const trimmedQuery = nextQuery.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (nextFilter !== "all") {
      params.set("filter", nextFilter);
    }

    if (compareCardsParam) {
      params.set("cards", compareCardsParam);
    }

    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildNextUrl(query, currentFilter));
  }

  function handleFilterChange(nextFilter: PublicSetFilter) {
    router.push(buildNextUrl(query, nextFilter));
  }

  function handleReset() {
    setQuery("");
    const params = new URLSearchParams();
    if (compareCardsParam) {
      params.set("cards", compareCardsParam);
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  const hasActiveFilters = currentQuery.trim().length > 0 || currentFilter !== "all";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor="public-sets-search" className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
            Search
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="public-sets-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sets by name or code"
              aria-label="Search sets by name or code"
              className="h-11 min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Search
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:w-auto lg:items-end">
          <div className="space-y-2 sm:min-w-[220px]">
            <label htmlFor="public-sets-filter" className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
              Filter
            </label>
            <select
              id="public-sets-filter"
              value={currentFilter}
              onChange={(event) => handleFilterChange(normalizePublicSetFilter(event.target.value))}
              aria-label="Filter sets"
              className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-slate-200"
            >
              {PUBLIC_SET_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
