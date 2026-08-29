"use client";

import Link from "next/link";
import ProductState from "@/components/layout/ProductState";
import SectionHeader from "@/components/layout/SectionHeader";
import PublicSetTile from "@/components/sets/PublicSetTile";
import { normalizeCompareCardsParam } from "@/lib/compareCards";
import {
  getPublicLanguageScopeLabel,
  matchesPublicSetLanguageScope,
  normalizePublicLanguageScope,
} from "@/lib/publicLanguageScope";
import {
  getPublicGameScopeLabel,
  matchesPublicGameScope,
  normalizePublicGameScope,
} from "@/lib/publicGameScope";
import {
  isSpecialPublicSet,
  matchesPublicSetSearch,
  normalizePublicSetFilter,
  normalizeSetSearchQuery,
  normalizeSetQuery,
  PUBLIC_SET_FILTER_OPTIONS,
  type PublicSetSummary,
} from "@/lib/publicSets.shared";
import {
  getPublicSetBrowseConfig,
  getPublicSetBrowseGroup,
  getPublicSetGroupLabel,
  getPublicSetProductLane,
  getPublicSetProductLaneLabel,
  normalizePublicSetBrowseGroup,
  normalizePublicSetProductLane,
  type PublicSetBrowseGame,
  type PublicSetBrowseGroup,
} from "@/lib/publicSetBrowseConfig";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type PublicSetsResultsProps = {
  sets: PublicSetSummary[];
  logoEntries: Array<[string, string]>;
};

const INITIAL_VISIBLE_SET_COUNT = 36;

function parseSetSortTimestamp(setInfo: Pick<PublicSetSummary, "sort_date">) {
  if (!setInfo.sort_date) {
    return Number.NaN;
  }

  return Date.parse(setInfo.sort_date);
}

function compareByName(left: PublicSetSummary, right: PublicSetSummary) {
  return left.name.localeCompare(right.name);
}

function compareByReleaseYearDesc(left: PublicSetSummary, right: PublicSetSummary) {
  const leftDate = parseSetSortTimestamp(left);
  const rightDate = parseSetSortTimestamp(right);
  const leftHasDate = Number.isFinite(leftDate);
  const rightHasDate = Number.isFinite(rightDate);

  if (leftHasDate && rightHasDate && leftDate !== rightDate) {
    return rightDate - leftDate;
  }

  if (leftHasDate !== rightHasDate) {
    return leftHasDate ? -1 : 1;
  }

  return compareByName(left, right);
}

function compareByReleaseYearAsc(left: PublicSetSummary, right: PublicSetSummary) {
  const leftDate = parseSetSortTimestamp(left);
  const rightDate = parseSetSortTimestamp(right);
  const leftHasDate = Number.isFinite(leftDate);
  const rightHasDate = Number.isFinite(rightDate);

  if (leftHasDate && rightHasDate && leftDate !== rightDate) {
    return leftDate - rightDate;
  }

  if (leftHasDate !== rightHasDate) {
    return leftHasDate ? -1 : 1;
  }

  return compareByName(left, right);
}

function filterPublicSetsClient(sets: PublicSetSummary[], rawQuery: string) {
  const queryTokens = normalizeSetSearchQuery(rawQuery);
  if (queryTokens.length === 0) {
    return sets;
  }

  return sets.filter((setInfo) => matchesPublicSetSearch(setInfo, queryTokens));
}

function applyPublicSetFilterAndSortClient(sets: PublicSetSummary[], rawFilter?: string | null) {
  const filter = normalizePublicSetFilter(rawFilter);
  const baseSets = [...sets];

  switch (filter) {
    case "modern":
      return baseSets.filter((setInfo) => (setInfo.release_year ?? 0) >= 2020);
    case "special":
      return baseSets.filter(isSpecialPublicSet);
    case "a-z":
      return baseSets.sort(compareByName);
    case "newest":
      return baseSets.sort(compareByReleaseYearDesc);
    case "oldest":
      return baseSets.sort(compareByReleaseYearAsc);
    case "all":
    default:
      return baseSets;
  }
}

function applySetGroupAndLaneFilters(
  sets: PublicSetSummary[],
  rawGroup: string | null | undefined,
  rawLane?: string | null,
  game: PublicSetBrowseGame = "pokemon",
) {
  const group = normalizePublicSetBrowseGroup(rawGroup, game);
  const lane = normalizePublicSetProductLane(rawLane, game);

  return sets
    .filter((setInfo) => group === "all" || getPublicSetBrowseGroup(setInfo, game) === group)
    .filter((setInfo) => lane === "all" || getPublicSetProductLane(setInfo, game) === lane);
}

function countByValue<TValue extends string>(
  sets: PublicSetSummary[],
  getValue: (setInfo: PublicSetSummary) => TValue,
) {
  const counts = new Map<TValue, number>();
  for (const setInfo of sets) {
    const value = getValue(setInfo);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function groupSetsByBrowseGroup(
  sets: PublicSetSummary[],
  game: ReturnType<typeof normalizePublicGameScope>,
) {
  const config = getPublicSetBrowseConfig(game);
  const groups = new Map<PublicSetBrowseGroup, PublicSetSummary[]>();
  for (const setInfo of sets) {
    const groupValue = getPublicSetBrowseGroup(setInfo, game);
    const group = groups.get(groupValue) ?? [];
    group.push(setInfo);
    groups.set(groupValue, group);
  }

  return config.groups
    .filter((option) => option.value !== "all")
    .map((option) => ({
      group: option.value,
      label: option.label,
      sets: groups.get(option.value) ?? [],
    }))
    .filter((group) => group.sets.length > 0);
}

export default function PublicSetsResults({ sets, logoEntries }: PublicSetsResultsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") ?? "";
  const rawFilter = searchParams.get("filter") ?? "all";
  const rawGroup = searchParams.get("group") ?? searchParams.get("era") ?? "all";
  const rawLane = searchParams.get("lane") ?? "all";
  const rawLanguageScope = searchParams.get("lang") ?? "all";
  const rawGameScope = searchParams.get("game") ?? "pokemon";
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const [visibleSetCount, setVisibleSetCount] = useState(INITIAL_VISIBLE_SET_COUNT);
  const normalizedQuery = normalizeSetQuery(rawQuery);
  const activeFilter = normalizePublicSetFilter(rawFilter);
  const activeLanguageScope = normalizePublicLanguageScope(rawLanguageScope);
  const activeGameScope = normalizePublicGameScope(rawGameScope);
  const browseConfig = getPublicSetBrowseConfig(activeGameScope);
  const activeGroup = normalizePublicSetBrowseGroup(rawGroup, activeGameScope);
  const activeLane = normalizePublicSetProductLane(rawLane, activeGameScope);
  const gameScopedSets = sets.filter((setInfo) =>
    matchesPublicGameScope(setInfo, activeGameScope),
  );
  const languageScopedSets = gameScopedSets.filter((setInfo) =>
    matchesPublicSetLanguageScope(setInfo, activeLanguageScope),
  );
  const searchedSets = filterPublicSetsClient(languageScopedSets, rawQuery);
  const filteredAndSortedSets = applyPublicSetFilterAndSortClient(
    applySetGroupAndLaneFilters(
      searchedSets,
      activeGroup,
      activeLane,
      activeGameScope,
    ),
    activeFilter,
  );
  const visibleSets = filteredAndSortedSets.slice(0, visibleSetCount);
  const prioritySetCodes = new Set(visibleSets.slice(0, 6).map((setInfo) => setInfo.code));
  const hasMoreSets = visibleSets.length < filteredAndSortedSets.length;
  const activeFilterLabel = PUBLIC_SET_FILTER_OPTIONS.find((option) => option.value === activeFilter)?.label ?? "All Sets";
  const activeGroupLabel = getPublicSetGroupLabel(activeGroup, activeGameScope);
  const activeLaneLabel = getPublicSetProductLaneLabel(activeLane, activeGameScope);
  const activeLanguageScopeLabel = getPublicLanguageScopeLabel(activeLanguageScope);
  const activeGameScopeLabel = getPublicGameScopeLabel(activeGameScope);
  const setLogoPathByCode = new Map(logoEntries);
  const laneScopedSets = searchedSets.filter(
    (setInfo) => activeLane === "all" || getPublicSetProductLane(setInfo, activeGameScope) === activeLane,
  );
  const groupScopedSets = searchedSets.filter(
    (setInfo) => activeGroup === "all" || getPublicSetBrowseGroup(setInfo, activeGameScope) === activeGroup,
  );
  const groupCounts = countByValue(
    laneScopedSets,
    (setInfo) => getPublicSetBrowseGroup(setInfo, activeGameScope),
  );
  const laneCounts = countByValue(
    groupScopedSets,
    (setInfo) => getPublicSetProductLane(setInfo, activeGameScope),
  );
  const groupedVisibleSets = groupSetsByBrowseGroup(visibleSets, activeGameScope);
  const shouldGroupByRelease =
    !normalizedQuery &&
    activeGroup === "all" &&
    activeFilter !== "a-z" &&
    activeFilter !== "oldest";
  const resultLabel = normalizedQuery
    ? `${filteredAndSortedSets.length} set${filteredAndSortedSets.length === 1 ? "" : "s"} matched "${rawQuery}".`
    : `${filteredAndSortedSets.length} collector-ready set${filteredAndSortedSets.length === 1 ? "" : "s"}.`;

  useEffect(() => {
    setVisibleSetCount(INITIAL_VISIBLE_SET_COUNT);
  }, [normalizedQuery, activeFilter, activeGroup, activeLane, activeLanguageScope, activeGameScope]);

  function buildFacetHref(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("era");

    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }

  return (
    <>
      <SectionHeader
        title={normalizedQuery ? `Results for "${rawQuery}"` : "Set results"}
        description={resultLabel}
        actions={(
          <>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {activeGameScopeLabel}
            </span>
            {activeFilter !== "all" ? (
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {activeFilterLabel}
              </span>
            ) : null}
            {activeGroup !== "all" ? (
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {activeGroupLabel}
              </span>
            ) : null}
            {activeLane !== "all" ? (
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {activeLaneLabel}
              </span>
            ) : null}
            {activeLanguageScope !== "all" ? (
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {activeLanguageScopeLabel}
              </span>
            ) : null}
            <span className="text-xs text-slate-400">
              {normalizedQuery ? "Filtered results" : "Collector-ready browse"}
            </span>
          </>
        )}
      />

      <div className="gv-premium-surface space-y-4 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="gv-eyebrow">{browseConfig.groupTitle}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {browseConfig.groupDescription}
            </p>
          </div>
          <Link
            href={buildFacetHref({ group: null, lane: activeLane })}
            className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              activeGroup === "all"
                ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            {browseConfig.groups[0].label}
          </Link>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {browseConfig.groups.filter((option) => option.value !== "all").map((option) => {
            const count = groupCounts.get(option.value) ?? 0;
            const active = activeGroup === option.value;
            return (
              <Link
                key={option.value}
                href={buildFacetHref({ group: option.value })}
                className={`rounded-[18px] border px-3 py-3 transition ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                    : "border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{option.label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active ? "bg-white/18 text-current dark:bg-slate-950/10" : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
                  }`}>
                    {count}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
          {browseConfig.lanes.map((option) => {
            const count = option.value === "all" ? groupScopedSets.length : laneCounts.get(option.value) ?? 0;
            const active = activeLane === option.value;
            return (
              <Link
                key={option.value}
                href={buildFacetHref({ lane: option.value })}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                    : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                }`}
              >
                <span>{option.label}</span>
                <span className={active ? "text-current opacity-75" : "text-slate-400"}>{count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {filteredAndSortedSets.length > 0 ? (
        <div className="space-y-5">
          {shouldGroupByRelease ? (
            <div className="space-y-8">
              {groupedVisibleSets.map((group) => (
                <section key={group.group} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="gv-eyebrow">{group.label}</p>
                      <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-50">
                        {group.sets.length} visible set{group.sets.length === 1 ? "" : "s"}
                      </h3>
                    </div>
                    <Link
                      href={buildFacetHref({ group: group.group })}
                      className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:inline-flex"
                    >
                      Open group
                    </Link>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {group.sets.map((setInfo) => (
                      <PublicSetTile
                        key={setInfo.code}
                        setInfo={setInfo}
                        compareCards={compareCards}
                        logoPath={setLogoPathByCode.get(setInfo.code)}
                        priority={prioritySetCodes.has(setInfo.code)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleSets.map((setInfo) => (
                <PublicSetTile
                  key={setInfo.code}
                  setInfo={setInfo}
                  compareCards={compareCards}
                  logoPath={setLogoPathByCode.get(setInfo.code)}
                  priority={prioritySetCodes.has(setInfo.code)}
                />
              ))}
            </div>
          )}

          {hasMoreSets ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleSetCount((current) => current + INITIAL_VISIBLE_SET_COUNT)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                Show more sets
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <ProductState
          compact
          eyebrow="Sets"
          title="No sets found"
          description={normalizedQuery
            ? `No sets matched “${rawQuery}”. Try a set name, code, or a different language.`
            : "No sets matched the current filter. Clear a filter to see more sets."}
        />
      )}
    </>
  );
}
