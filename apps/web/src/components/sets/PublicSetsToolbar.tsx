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
  PUBLIC_SET_FILTER_OPTIONS,
  normalizePublicSetFilter,
  type PublicSetFilter,
} from "@/lib/publicSets.shared";

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

          <div className="flex flex-col gap-3 sm:flex-row lg:w-auto lg:items-end">
            <SearchToolbarField label="Filter" className="sm:min-w-[220px]">
              <SearchToolbarSelect
                id="public-sets-filter"
                value={currentFilter}
                onChange={(event) => handleFilterChange(normalizePublicSetFilter(event.target.value))}
                aria-label="Filter sets"
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
              <SearchToolbarButton type="button" tone="secondary" onClick={handleReset}>
                Reset
              </SearchToolbarButton>
            ) : null}
          </div>
        </div>
      </SearchToolbar>
    </form>
  );
}
