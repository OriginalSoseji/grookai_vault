import PublicSetTile from "@/components/sets/PublicSetTile";
import { normalizeCompareCardsParam } from "@/lib/compareCards";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import { filterPublicSets, getPublicSets, normalizeSetQuery } from "@/lib/publicSets";

export const dynamic = "force-dynamic";

export default async function SetsPage({
  searchParams,
}: {
  searchParams?: { q?: string; cards?: string };
}) {
  const rawQuery = searchParams?.q ?? "";
  const compareCards = normalizeCompareCardsParam(searchParams?.cards);
  const sets = await getPublicSets();
  const filteredSets = filterPublicSets(sets, rawQuery);
  const normalizedQuery = normalizeSetQuery(rawQuery);
  const setLogoPathByCode = await getSetLogoAssetPathMap(filteredSets.map((setInfo) => setInfo.code));

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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-600">
            {normalizedQuery
              ? `${filteredSets.length} set${filteredSets.length === 1 ? "" : "s"} for “${rawQuery}”`
              : `${filteredSets.length} sets`}
          </p>
        </div>

        {filteredSets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSets.map((setInfo) => (
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
            No sets found for “{rawQuery}”.
          </div>
        )}
      </section>
    </div>
  );
}
