import PublicSetsToolbar from "@/components/sets/PublicSetsToolbar";
import PublicSetsResults from "@/components/sets/PublicSetsResults";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import { getPublicSets } from "@/lib/publicSets";
import {
  getPublicSetBrowseConfig,
  getPublicSetProductLane,
} from "@/lib/publicSetBrowseConfig";
import {
  matchesPublicSetLanguageScope,
  normalizePublicLanguageScope,
} from "@/lib/publicLanguageScope";
import { normalizePublicGameScope } from "@/lib/publicGameScope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SetsPageProps = {
  searchParams?: Promise<{
    lang?: string;
    game?: string;
  }>;
};

export default async function SetsPage(props: SetsPageProps) {
  const searchParams = await props.searchParams;
  const languageScope = normalizePublicLanguageScope(searchParams?.lang);
  const gameScope = normalizePublicGameScope(searchParams?.game);
  const browseConfig = getPublicSetBrowseConfig(gameScope);
  const gameSets = await getPublicSets(gameScope, false);
  const sets = gameSets.filter(
    (setInfo) => matchesPublicSetLanguageScope(setInfo, languageScope),
  );
  const setLogoPathByCode = await getSetLogoAssetPathMap(sets.map((setInfo) => setInfo.code));
  const newestYear = sets.reduce<number | null>(
    (latest, setInfo) => typeof setInfo.release_year === "number" ? Math.max(latest ?? 0, setInfo.release_year) : latest,
    null,
  );
  const deckCount = sets.filter(
    (setInfo) => getPublicSetProductLane(setInfo, gameScope) === "deck",
  ).length;

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
                <h1 className="gv-display-title">{browseConfig.pageTitle}</h1>
                <p className="gv-body-copy max-w-2xl">
                  {browseConfig.pageDescription}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="gv-soft-surface px-4 py-3 text-center">
                <p className="text-2xl font-bold text-slate-950 dark:text-slate-50">{sets.length}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Sets</p>
              </div>
              <div className="gv-soft-surface px-4 py-3 text-center">
                <p className="text-2xl font-bold text-slate-950 dark:text-slate-50">{newestYear ?? "—"}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Latest</p>
              </div>
              <div className="gv-soft-surface px-4 py-3 text-center">
                <p className="text-2xl font-bold text-slate-950 dark:text-slate-50">{deckCount}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Decks</p>
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
