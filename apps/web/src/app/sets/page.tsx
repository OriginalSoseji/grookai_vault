import Image from "next/image";
import Link from "next/link";
import PublicSetsToolbar from "@/components/sets/PublicSetsToolbar";
import PublicSetsResults from "@/components/sets/PublicSetsResults";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import { getPublicSets } from "@/lib/publicSets";

export const dynamic = "force-static";
export const revalidate = 300;

function isSpecialSetName(name: string, code: string) {
  const normalizedName = name.toLowerCase();
  const normalizedCode = code.toLowerCase();
  return (
    normalizedCode.includes(".5") ||
    normalizedCode.includes("pt5") ||
    [
      "trainer gallery",
      "radiant collection",
      "shiny",
      "fates",
      "crown zenith",
      "prismatic",
    ].some((marker) => normalizedName.includes(marker))
  );
}

export default async function SetsPage() {
  const sets = await getPublicSets();
  const setLogoPathByCode = await getSetLogoAssetPathMap(sets.map((setInfo) => setInfo.code));
  const totalCards = sets.reduce((sum, setInfo) => sum + setInfo.card_count, 0);
  const modernCount = sets.filter((setInfo) => (setInfo.release_year ?? 0) >= 2020).length;
  const specialCount = sets.filter((setInfo) => isSpecialSetName(setInfo.name, setInfo.code)).length;
  const discoverySets = sets.slice(0, 4);

  return (
    <main className="gv-page-shell gv-mobile-safe-content">
      <div className="gv-page-container gv-page-rhythm">
        <header className="gv-hero-section px-5 py-6 sm:px-7 lg:px-8">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(340px,460px)] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-emerald-200/70 bg-emerald-500/[0.08] text-lg font-black text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/[0.13] dark:text-emerald-200">
                S
              </div>
              <div className="space-y-2">
                <p className="gv-eyebrow">Public Sets</p>
                <h1 className="gv-display-title">Browse Pokemon Sets</h1>
                <p className="gv-body-copy max-w-2xl">
                  Explore English physical sets, special releases, promos, and collector lanes using Grookai&apos;s reconciled catalog.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="gv-soft-surface px-4 py-3 text-center">
                <p className="text-2xl font-bold text-slate-950 dark:text-slate-50">{sets.length}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Sets</p>
              </div>
              <div className="gv-soft-surface px-4 py-3 text-center">
                <p className="text-2xl font-bold text-slate-950 dark:text-slate-50">{totalCards.toLocaleString()}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Cards</p>
              </div>
              <div className="gv-soft-surface px-4 py-3 text-center">
                <p className="text-2xl font-bold text-slate-950 dark:text-slate-50">{specialCount}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Special</p>
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-4" aria-label="Set discovery">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="gv-eyebrow">Recently Added</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50">Collector discovery</h2>
            </div>
            <p className="hidden text-sm font-semibold text-slate-500 dark:text-slate-400 sm:block">{modernCount} modern sets</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {discoverySets.map((setInfo) => {
              const logoPath = setLogoPathByCode.get(setInfo.code);
              return (
                <Link key={setInfo.code} href={`/sets/${setInfo.code}`} className="gv-visual-card group relative overflow-hidden px-4 py-4">
                  {logoPath ? (
                    <div className="mb-4 flex h-20 items-center justify-center rounded-[18px] bg-slate-50/80 p-3 dark:bg-slate-900/70">
                      <Image src={logoPath} alt="" width={220} height={90} className="max-h-full w-auto object-contain" />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <p className="gv-eyebrow">{setInfo.code}</p>
                    <h3 className="line-clamp-2 text-lg font-extrabold tracking-tight text-slate-950 dark:text-slate-50">{setInfo.name}</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {[
                        typeof setInfo.release_year === "number" ? String(setInfo.release_year) : undefined,
                        `${setInfo.card_count.toLocaleString()} catalog rows`,
                      ]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
        <PublicSetsToolbar />
        <PublicSetsResults sets={sets} logoEntries={[...setLogoPathByCode.entries()]} />
        </section>
      </div>
    </main>
  );
}
