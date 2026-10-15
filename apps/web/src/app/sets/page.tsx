import Link from "next/link";

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
import { isMtgSealedClientV1Enabled, isPokemonSealedClientV1Enabled } from "@/lib/sealed/mtgSealedClientV1";

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
  const showMtgSealed = gameScope === "mtg" && isMtgSealedClientV1Enabled();
  const showPokemonSealed = gameScope === "pokemon" && isPokemonSealedClientV1Enabled();
  const gameSets = await getPublicSets(gameScope);
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
    <div className="gv-page-shell gv-mobile-safe-content">
      <div className="gv-page-container gv-page-rhythm">
        <header className="gv-collector-page-intro flex flex-wrap items-end justify-between gap-4 py-4">
          <h1 className="gv-display-title">{browseConfig.pageTitle}</h1>
          <p className="text-sm text-[color:var(--gv-text-secondary)]">
            {sets.length} sets · {deckCount} decks{newestYear ? ` · Latest ${newestYear}` : ""}
          </p>
        </header>

        <section className="space-y-6">
          {showMtgSealed || showPokemonSealed ? (
            <div className="flex flex-col gap-3 border-y border-slate-200 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{showPokemonSealed ? "Pokemon" : "MTG"} sealed products</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Booster boxes, bundles, decks, and other sealed releases.</p>
              </div>
              <Link
                href={showPokemonSealed ? "/sealed/pokemon" : "/sealed/mtg"}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
              >
                Browse sealed
              </Link>
            </div>
          ) : null}
          <PublicSetsToolbar />
          <PublicSetsResults sets={sets} logoEntries={[...setLogoPathByCode.entries()]} />
        </section>
      </div>
    </div>
  );
}
