import PublicSetsToolbar from "@/components/sets/PublicSetsToolbar";
import PublicSetsResults from "@/components/sets/PublicSetsResults";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import { getPublicSets } from "@/lib/publicSets";
import {
  matchesPublicSetLanguageScope,
  normalizePublicLanguageScope,
} from "@/lib/publicLanguageScope";
import {
  matchesPublicGameScope,
  normalizePublicGameScope,
} from "@/lib/publicGameScope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SetsPageProps = {
  searchParams?: Promise<{
    lang?: string;
    game?: string;
  }>;
};

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

export default async function SetsPage(props: SetsPageProps) {
  const searchParams = await props.searchParams;
  const languageScope = normalizePublicLanguageScope(searchParams?.lang);
  const gameScope = normalizePublicGameScope(searchParams?.game);
  const allSets = await getPublicSets();
  const sets = allSets.filter(
    (setInfo) =>
      matchesPublicGameScope(setInfo, gameScope) &&
      matchesPublicSetLanguageScope(setInfo, languageScope),
  );
  const setLogoPathByCode = await getSetLogoAssetPathMap(sets.map((setInfo) => setInfo.code));
  const totalCards = sets.reduce((sum, setInfo) => sum + setInfo.card_count, 0);
  const specialCount = sets.filter((setInfo) => isSpecialSetName(setInfo.name, setInfo.code)).length;

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
                <h1 className="gv-display-title">Browse Trading Card Sets</h1>
                <p className="gv-body-copy max-w-2xl">
                  Explore supported games, physical sets, special releases, promos, and decks. Open a set to see its cards and the exact versions available.
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

        <section className="space-y-6">
          <PublicSetsToolbar />
          <PublicSetsResults sets={sets} logoEntries={[...setLogoPathByCode.entries()]} />
        </section>
      </div>
    </main>
  );
}
