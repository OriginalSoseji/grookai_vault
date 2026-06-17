"use client";

import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import PublicSetTile from "@/components/sets/PublicSetTile";
import { normalizeCompareCardsParam } from "@/lib/compareCards";
import {
  matchesPublicSetSearch,
  normalizePublicSetFilter,
  normalizeSetSearchQuery,
  normalizeSetQuery,
  PUBLIC_SET_FILTER_OPTIONS,
  type PublicSetSummary,
} from "@/lib/publicSets.shared";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

function isSpecialSet(setInfo: PublicSetSummary) {
  const code = normalizeSetQuery(setInfo.code);
  const name = normalizeSetQuery(setInfo.name);

  if (code.includes("pt5") || code.includes(".5")) {
    return true;
  }

  return [
    "trainer gallery",
    "radiant collection",
    "shiny",
    "fates",
    "crown zenith",
    "prismatic",
  ].some((marker) => name.includes(marker));
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
      return baseSets.filter(isSpecialSet);
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

export default function PublicSetsResults({ sets, logoEntries }: PublicSetsResultsProps) {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") ?? "";
  const rawFilter = searchParams.get("filter") ?? "all";
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const [visibleSetCount, setVisibleSetCount] = useState(INITIAL_VISIBLE_SET_COUNT);
  const normalizedQuery = normalizeSetQuery(rawQuery);
  const activeFilter = normalizePublicSetFilter(rawFilter);
  const filteredAndSortedSets = useMemo(
    () => applyPublicSetFilterAndSortClient(filterPublicSetsClient(sets, rawQuery), activeFilter),
    [sets, rawQuery, activeFilter],
  );
  const visibleSets = filteredAndSortedSets.slice(0, visibleSetCount);
  const hasMoreSets = visibleSets.length < filteredAndSortedSets.length;
  const activeFilterLabel = PUBLIC_SET_FILTER_OPTIONS.find((option) => option.value === activeFilter)?.label ?? "All Sets";
  const setLogoPathByCode = new Map(logoEntries);
  const resultLabel = normalizedQuery
    ? `${filteredAndSortedSets.length} set${filteredAndSortedSets.length === 1 ? "" : "s"} matched "${rawQuery}".`
    : `${filteredAndSortedSets.length} collector-ready set${filteredAndSortedSets.length === 1 ? "" : "s"}.`;

  useEffect(() => {
    setVisibleSetCount(INITIAL_VISIBLE_SET_COUNT);
  }, [normalizedQuery, activeFilter]);

  return (
    <>
      <SectionHeader
        title={normalizedQuery ? `Results for "${rawQuery}"` : "Set results"}
        description={resultLabel}
        actions={(
          <>
            {activeFilter !== "all" ? (
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {activeFilterLabel}
              </span>
            ) : null}
            <span className="text-xs text-slate-400">
              {normalizedQuery ? "Filtered results" : "Collector-ready browse"}
            </span>
          </>
        )}
      />

      {filteredAndSortedSets.length > 0 ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleSets.map((setInfo) => (
              <PublicSetTile
                key={setInfo.code}
                setInfo={setInfo}
                compareCards={compareCards}
                logoPath={setLogoPathByCode.get(setInfo.code)}
              />
            ))}
          </div>

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
        <PageSection surface="card" className="text-sm text-slate-600">
          {normalizedQuery ? `No sets found for "${rawQuery}".` : "No sets matched the current filter."}
        </PageSection>
      )}
    </>
  );
}
