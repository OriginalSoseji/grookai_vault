import PublicSetsToolbar from "@/components/sets/PublicSetsToolbar";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
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
  const resultLabel = normalizedQuery
    ? `${filteredAndSortedSets.length} set${filteredAndSortedSets.length === 1 ? "" : "s"} matched “${rawQuery}”.`
    : `${filteredAndSortedSets.length} collector-ready set${filteredAndSortedSets.length === 1 ? "" : "s"}.`;

  return (
    <div className="space-y-8 py-6">
      <PageIntro
        eyebrow="Public Sets"
        title="Browse Pokemon sets"
        description="Browse Pokemon sets collectors care about."
      />

      <PageSection spacing="loose">
        <PublicSetsToolbar />
        <SectionHeader
          title={normalizedQuery ? `Results for “${rawQuery}”` : "Set results"}
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
          <PageSection surface="card" className="text-sm text-slate-600">
            {normalizedQuery ? `No sets found for “${rawQuery}”.` : "No sets matched the current filter."}
          </PageSection>
        )}
      </PageSection>
    </div>
  );
}
