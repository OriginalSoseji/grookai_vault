import PublicSetsToolbar from "@/components/sets/PublicSetsToolbar";
import PublicSetTile from "@/components/sets/PublicSetTile";
import { normalizeCompareCardsParam } from "@/lib/compareCards";
import {
  normalizePublicSetFilter,
  normalizeSetQuery,
  PUBLIC_SET_FILTER_OPTIONS,
} from "@/lib/publicSets.shared";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import {
  applyPublicSetFilterAndSort,
  filterPublicSets,
  getPublicSets,
} from "@/lib/publicSets";

export const dynamic = "force-dynamic";

export default async function SetsPage({
  searchParams,
}: {
  searchParams?: { q?: string; filter?: string; cards?: string };
}) {
  const rawQuery = searchParams?.q ?? "";
  const rawFilter = searchParams?.filter ?? "all";
  const compareCards = normalizeCompareCardsParam(searchParams?.cards);
  const sets = await getPublicSets();
  const textFilteredSets = filterPublicSets(sets, rawQuery);
  const normalizedQuery = normalizeSetQuery(rawQuery);
  const activeFilter = normalizePublicSetFilter(rawFilter);
  const filteredAndSortedSets = applyPublicSetFilterAndSort(textFilteredSets, activeFilter);
  const activeFilterLabel = PUBLIC_SET_FILTER_OPTIONS.find((option) => option.value === activeFilter)?.label ?? "All Sets";
  const setLogoPathByCode = await getSetLogoAssetPathMap(filteredAndSortedSets.map((setInfo) => setInfo.code));

  return (
    <div className="space-y-8 py-6">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Public Sets</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Browse Pokemon sets</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          Browse Pokemon sets collectors care about.
        </p>
      </section>

      <section className="space-y-4">
        <PublicSetsToolbar />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">
              {normalizedQuery
                ? `${filteredAndSortedSets.length} set${filteredAndSortedSets.length === 1 ? "" : "s"} for “${rawQuery}”`
                : `${filteredAndSortedSets.length} sets`}
            </p>
            {activeFilter !== "all" ? (
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {activeFilterLabel}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-400">
            {normalizedQuery
              ? "Filtered results"
              : "Collector-ready browse"}
          </p>
        </div>

        {filteredAndSortedSets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAndSortedSets.map((setInfo) => (
              <PublicSetTile
                key={setInfo.code}
                setInfo={setInfo}
                compareCards={compareCards}
                logoPath={setLogoPathByCode.get(setInfo.code)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600">
            {normalizedQuery ? `No sets found for “${rawQuery}”.` : "No sets matched the current filter."}
          </div>
        )}
      </section>
    </div>
  );
}
