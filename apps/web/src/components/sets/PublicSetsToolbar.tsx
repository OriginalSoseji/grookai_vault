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
import {
  getPublicSetBrowseConfig,
  normalizePublicSetBrowseGroup,
  normalizePublicSetProductLane,
  type PublicSetBrowseGroup,
  type PublicSetProductLane,
} from "@/lib/publicSetBrowseConfig";
import {
  PUBLIC_LANGUAGE_SCOPE_OPTIONS,
  normalizePublicLanguageScope,
  type PublicLanguageScope,
} from "@/lib/publicLanguageScope";
import {
  PUBLIC_GAME_SCOPE_OPTIONS,
  normalizePublicGameScope,
  type PublicGameScope,
} from "@/lib/publicGameScope";

export default function PublicSetsToolbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const currentFilter = normalizePublicSetFilter(searchParams.get("filter"));
  const currentLanguageScope = normalizePublicLanguageScope(searchParams.get("lang"));
  const currentGameScope = normalizePublicGameScope(searchParams.get("game"));
  const browseConfig = getPublicSetBrowseConfig(currentGameScope);
  const currentGroup = normalizePublicSetBrowseGroup(
    searchParams.get("group") ?? searchParams.get("era"),
    currentGameScope,
  );
  const currentLane = normalizePublicSetProductLane(searchParams.get("lane"), currentGameScope);
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const compareCardsParam = buildCompareCardsParam(compareCards);
  const [query, setQuery] = useState(currentQuery);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  function buildNextUrl(
    nextQuery: string,
    nextFilter: PublicSetFilter,
    nextGroup: PublicSetBrowseGroup,
    nextLane: PublicSetProductLane,
    nextLanguageScope: PublicLanguageScope = currentLanguageScope,
    nextGameScope: PublicGameScope = currentGameScope,
  ) {
    const params = new URLSearchParams();
    const trimmedQuery = nextQuery.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (nextFilter !== "all") {
      params.set("filter", nextFilter);
    }

    if (nextGroup !== "all") {
      params.set("group", nextGroup);
    }

    if (nextLane !== "all") {
      params.set("lane", nextLane);
    }

    if (nextLanguageScope !== "all") {
      params.set("lang", nextLanguageScope);
    }

    if (nextGameScope !== "pokemon") {
      params.set("game", nextGameScope);
    }

    if (compareCardsParam) {
      params.set("cards", compareCardsParam);
    }

    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildNextUrl(query, currentFilter, currentGroup, currentLane));
  }

  function handleFilterChange(nextFilter: PublicSetFilter) {
    router.push(buildNextUrl(query, nextFilter, currentGroup, currentLane));
  }

  function handleGroupChange(nextGroup: PublicSetBrowseGroup) {
    router.push(buildNextUrl(query, currentFilter, nextGroup, currentLane));
  }

  function handleLaneChange(nextLane: PublicSetProductLane) {
    router.push(buildNextUrl(query, currentFilter, currentGroup, nextLane));
  }

  function handleLanguageChange(nextLanguageScope: PublicLanguageScope) {
    router.push(
      buildNextUrl(
        query,
        currentFilter,
        currentGroup,
        "all",
        nextLanguageScope,
      ),
    );
  }

  function handleGameChange(nextGameScope: PublicGameScope) {
    router.push(
      buildNextUrl(
        query,
        currentFilter,
        "all",
        currentLane,
        currentLanguageScope,
        nextGameScope,
      ),
    );
  }

  function handleReset() {
    setQuery("");
    const params = new URLSearchParams();
    if (currentLanguageScope !== "all") {
      params.set("lang", currentLanguageScope);
    }
    if (currentGameScope !== "pokemon") {
      params.set("game", currentGameScope);
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
    currentGroup !== "all" ||
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

          <div className="grid gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-[170px_210px_170px_180px_190px_auto] lg:items-end">
            <SearchToolbarField label="Game" className="min-w-0">
              <SearchToolbarSelect
                id="public-sets-game"
                value={currentGameScope}
                onChange={(event) =>
                  handleGameChange(normalizePublicGameScope(event.target.value))
                }
                aria-label="Filter sets by game"
                tone="soft"
              >
                {PUBLIC_GAME_SCOPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SearchToolbarSelect>
            </SearchToolbarField>

            <SearchToolbarField label="Language" className="min-w-0">
              <div
                className="inline-flex h-11 w-full rounded-[14px] border border-slate-200 bg-white/70 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
                role="radiogroup"
                aria-label="Set language scope"
              >
                {PUBLIC_LANGUAGE_SCOPE_OPTIONS.map((option) => {
                  const active = currentLanguageScope === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleLanguageChange(option.value)}
                      className={`min-w-0 flex-1 rounded-[11px] px-2 text-xs font-semibold transition ${
                        active
                          ? "bg-slate-950 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950"
                          : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      }`}
                    >
                      {option.shortLabel}
                    </button>
                  );
                })}
              </div>
            </SearchToolbarField>

            <SearchToolbarField label={browseConfig.groupLabel} className="min-w-0">
              <SearchToolbarSelect
                id="public-sets-group"
                value={currentGroup}
                onChange={(event) =>
                  handleGroupChange(
                    normalizePublicSetBrowseGroup(event.target.value, currentGameScope),
                  )
                }
                aria-label={`Filter sets by ${browseConfig.groupLabel.toLowerCase()}`}
                tone="soft"
              >
                {browseConfig.groups.map((option) => (
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
                onChange={(event) =>
                  handleLaneChange(
                    normalizePublicSetProductLane(event.target.value, currentGameScope),
                  )
                }
                aria-label="Filter sets by type"
                tone="soft"
              >
                {browseConfig.lanes.map((option) => (
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
