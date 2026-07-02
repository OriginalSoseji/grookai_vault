"use client";

import {
  SearchToolbar,
  SearchToolbarButton,
  SearchToolbarField,
  SearchToolbarInput,
  SearchToolbarSelect,
} from "@/components/common/SearchToolbar";
import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildCompareCardsParam, normalizeCompareCardsParam } from "@/lib/compareCards";
import {
  PUBLIC_SET_ERA_OPTIONS,
  PUBLIC_SET_FILTER_OPTIONS,
  PUBLIC_SET_LANE_OPTIONS,
  normalizePublicSetEra,
  normalizePublicSetFilter,
  normalizePublicSetLane,
  type PublicSetEra,
  type PublicSetFilter,
  type PublicSetLane,
} from "@/lib/publicSets.shared";
import { normalizePublicLanguageScope } from "@/lib/publicLanguageScope";

export default function PublicSetsToolbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const currentFilter = normalizePublicSetFilter(searchParams.get("filter"));
  const currentEra = normalizePublicSetEra(searchParams.get("era"));
  const currentLane = normalizePublicSetLane(searchParams.get("lane"));
  const currentLanguageScope = normalizePublicLanguageScope(searchParams.get("lang"));
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const compareCardsParam = buildCompareCardsParam(compareCards);
  const [query, setQuery] = useState(currentQuery);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  function buildNextUrl(
    nextQuery: string,
    nextFilter: PublicSetFilter,
    nextEra: PublicSetEra,
    nextLane: PublicSetLane,
  ) {
    const params = new URLSearchParams();
    const trimmedQuery = nextQuery.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (nextFilter !== "all") {
      params.set("filter", nextFilter);
    }

    if (nextEra !== "all") {
      params.set("era", nextEra);
    }

    if (nextLane !== "all") {
      params.set("lane", nextLane);
    }

    if (currentLanguageScope !== "all") {
      params.set("lang", currentLanguageScope);
    }

    if (compareCardsParam) {
      params.set("cards", compareCardsParam);
    }

    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildNextUrl(query, currentFilter, currentEra, currentLane));
  }

  function handleFilterChange(nextFilter: PublicSetFilter) {
    router.push(buildNextUrl(query, nextFilter, currentEra, currentLane));
  }

  function handleEraChange(nextEra: PublicSetEra) {
    router.push(buildNextUrl(query, currentFilter, nextEra, currentLane));
  }

  function handleLaneChange(nextLane: PublicSetLane) {
    router.push(buildNextUrl(query, currentFilter, currentEra, nextLane));
  }

  function handleReset() {
    setQuery("");
    const params = new URLSearchParams();
    if (currentLanguageScope !== "all") {
      params.set("lang", currentLanguageScope);
    }
    if (compareCardsParam) {
      params.set("cards", compareCardsParam);
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  const hasActiveFilters =
    currentQuery.trim().length > 0 ||
    currentFilter !== "all" ||
    currentEra !== "all" ||
    currentLane !== "all";

  return (
    <form onSubmit={handleSubmit}>
      <SearchToolbar surface="card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <SearchToolbarField label="Search" className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row">
              <SearchToolbarInput
                id="public-sets-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sets by name or code"
                aria-label="Search sets by name or code"
                tone="soft"
              />
              <SearchToolbarButton type="submit" tone="primary">
                Search
              </SearchToolbarButton>
            </div>
          </SearchToolbarField>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-[170px_180px_190px_auto] lg:items-end">
            <SearchToolbarField label="Era" className="min-w-0">
              <SearchToolbarSelect
                id="public-sets-era"
                value={currentEra}
                onChange={(event) => handleEraChange(normalizePublicSetEra(event.target.value))}
                aria-label="Filter sets by era"
                tone="soft"
              >
                {PUBLIC_SET_ERA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SearchToolbarSelect>
            </SearchToolbarField>

            <SearchToolbarField label="Type" className="min-w-0">
              <SearchToolbarSelect
                id="public-sets-lane"
                value={currentLane}
                onChange={(event) => handleLaneChange(normalizePublicSetLane(event.target.value))}
                aria-label="Filter sets by type"
                tone="soft"
              >
                {PUBLIC_SET_LANE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SearchToolbarSelect>
            </SearchToolbarField>

            <SearchToolbarField label="Sort" className="min-w-0">
              <SearchToolbarSelect
                id="public-sets-filter"
                value={currentFilter}
                onChange={(event) => handleFilterChange(normalizePublicSetFilter(event.target.value))}
                aria-label="Sort or filter sets"
                tone="soft"
              >
                {PUBLIC_SET_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SearchToolbarSelect>
            </SearchToolbarField>

            {hasActiveFilters ? (
              <SearchToolbarButton type="button" tone="secondary" onClick={handleReset} className="w-full sm:col-span-2 lg:col-span-1">
                Reset
              </SearchToolbarButton>
            ) : null}
          </div>
        </div>
      </SearchToolbar>
    </form>
  );
}
