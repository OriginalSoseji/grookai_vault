import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import TrackPageEvent from "@/components/telemetry/TrackPageEvent";
import PublicSetCardGrid from "@/components/PublicSetCardGrid";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import { getPublicSetByCode, getPublicSetCards, getPublicWorldChampionshipDecklist } from "@/lib/publicSets";
import { getPublicSetMasterSetStats } from "@/lib/publicSetMasterSetStats";
import { applyOwnedPrintingCountsToSetCards } from "@/lib/publicSetsOwnership";
import { getBaseSetPrintRunLaneExplanation } from "@/lib/baseSetPrintRunLanes";
import { createServerComponentClient } from "@/lib/supabase/server";
import type { PublicWorldChampionshipDecklist } from "@/lib/publicSets.shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const INITIAL_CARD_CHUNK = 24;

function formatReleaseDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function buildWorldChampionshipDecklistBlurb(decklist: PublicWorldChampionshipDecklist) {
  const yearLabel = decklist.deck_year ? `${decklist.deck_year} World Championship` : "World Championship";
  const deckLabel = decklist.deck_name ? `${decklist.deck_name} deck` : "deck";
  const playerLine = decklist.player_name ? ` Player: ${decklist.player_name}.` : "";

  return `${yearLabel} decks preserve tournament lists from that year's top players. This ${deckLabel} is tracked as a replica list: Grookai stores one row per unique printed card, and the Qty column reconstructs the 60-card deck.${playerLine}`;
}

export default async function SetPage({
  params,
}: {
  params: { set_code: string };
}) {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [setDetail, initialCards] = await Promise.all([
    getPublicSetByCode(params.set_code),
    getPublicSetCards(params.set_code, 0, INITIAL_CARD_CHUNK),
  ]);

  if (!setDetail) {
    notFound();
  }

  const masterSetStats = await getPublicSetMasterSetStats(setDetail.code, user?.id ?? null);
  const [setLogoPath, worldChampionshipDecklist] = await Promise.all([
    getSetLogoAssetPathMap([setDetail.code]).then((logos) => logos.get(setDetail.code)),
    getPublicWorldChampionshipDecklist(setDetail.code),
  ]);
  const releaseLabel = formatReleaseDate(setDetail.release_date);
  const completionPercent = masterSetStats.completionPercent ?? 0;
  const missingOptionCount = masterSetStats.missingVariantOptionCount ?? masterSetStats.variantOptionCount;
  const isSignedIn = Boolean(user?.id);
  const printRunExplanation = getBaseSetPrintRunLaneExplanation(setDetail.code);

  return (
    <main className="gv-page-shell gv-mobile-safe-content">
      <div className="gv-page-container gv-page-rhythm py-5">
      <TrackPageEvent eventName="page_view_set" path={`/sets/${setDetail.code}`} setCode={setDetail.code} />
      <section className="gv-set-hero px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <div className="relative z-[1] grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:items-end">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="gv-discovery-eyebrow">Set Album</span>
              <span className="gv-discovery-pill">{setDetail.code.toUpperCase()}</span>
              {setDetail.printed_set_abbrev ? (
                <span className="gv-discovery-pill">{setDetail.printed_set_abbrev}</span>
              ) : null}
            </div>

            {setLogoPath ? (
              <div className="gv-set-logo-stage flex max-w-[28rem] items-center justify-center px-6 py-5">
                <Image src={setLogoPath} alt="" width={440} height={150} className="max-h-24 w-auto object-contain" priority />
              </div>
            ) : null}

            <div className="space-y-3">
              <h1 className="gv-display-title max-w-4xl text-[clamp(3rem,8vw,6.5rem)]">
                {setDetail.name}
              </h1>
              <p className="gv-body-copy max-w-2xl text-[1.08rem]">
                {printRunExplanation?.summary ??
                  "Browse every reconciled English physical identity, finish, and variant option in this set. Your vault progress is shown against the Master Index."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {releaseLabel ? <span className="gv-metadata-pill">{releaseLabel}</span> : null}
              {typeof setDetail.printed_total === "number" ? (
                <span className="gv-metadata-pill">{setDetail.printed_total} printed cards</span>
              ) : null}
              <span className="gv-metadata-pill">{masterSetStats.parentPrintCount} card identities</span>
            </div>

            {printRunExplanation ? (
              <div className="grid max-w-4xl gap-3 md:grid-cols-3">
                <div className="gv-soft-surface px-4 py-4">
                  <p className="gv-eyebrow">Why Different</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                    {printRunExplanation.whyDifferent}
                  </p>
                </div>
                <div className="gv-soft-surface px-4 py-4">
                  <p className="gv-eyebrow">Visual Cue</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                    {printRunExplanation.visualCue}
                  </p>
                </div>
                <div className="gv-soft-surface px-4 py-4">
                  <p className="gv-eyebrow">Collector Note</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                    {printRunExplanation.collectorNote}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="gv-set-progress-panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="gv-eyebrow">Master set progress</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-slate-50">
                  {isSignedIn ? `${completionPercent}%` : "Sign in"}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800 dark:bg-emerald-400/14 dark:text-emerald-200">
                {isSignedIn && masterSetStats.ownedVariantOptionCount !== null
                  ? `${masterSetStats.ownedVariantOptionCount}/${masterSetStats.variantOptionCount}`
                  : `${masterSetStats.variantOptionCount} options`}
              </span>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/[0.08]">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionPercent}%` }} />
            </div>

            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              {isSignedIn
                ? `${missingOptionCount} finish, stamp, or parallel options still open.`
                : "Sign in to compare this set against your vault."}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="gv-dex-mini-stat">
                <p>{masterSetStats.parentPrintCount}</p>
                <span>Cards</span>
              </div>
              <div className="gv-dex-mini-stat">
                <p>{masterSetStats.variantOptionCount}</p>
                <span>Options</span>
              </div>
              <div className="gv-dex-mini-stat">
                <p>{masterSetStats.unclassifiedOwnedCount}</p>
                <span>Needs finish</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {worldChampionshipDecklist ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="gv-eyebrow">Decklist</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">
                60-card decklist
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="gv-metadata-pill">{worldChampionshipDecklist.total_quantity} cards</span>
              <span className="gv-metadata-pill">{worldChampionshipDecklist.unique_card_count} unique</span>
            </div>
          </div>

          <div className="gv-soft-surface overflow-hidden">
            <div className="border-b border-slate-200/70 px-4 py-4 dark:border-white/[0.08] sm:px-5">
              <p className="max-w-4xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                {buildWorldChampionshipDecklistBlurb(worldChampionshipDecklist)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                  <tr>
                    <th className="w-16 px-4 py-3 font-bold sm:px-5">Qty</th>
                    <th className="px-4 py-3 font-bold sm:px-5">Card</th>
                    <th className="px-4 py-3 font-bold sm:px-5">Original print</th>
                    <th className="px-4 py-3 font-bold sm:px-5">Deck no.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.08]">
                  {worldChampionshipDecklist.entries.map((entry) => (
                    <tr key={entry.gv_id} className="align-top">
                      <td className="px-4 py-3 text-base font-black text-slate-950 dark:text-slate-50 sm:px-5">
                        {entry.quantity ?? "—"}
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <Link href={`/card/${encodeURIComponent(entry.gv_id)}`} className="font-bold text-slate-950 transition hover:text-slate-700 dark:text-slate-50 dark:hover:text-slate-200">
                          {entry.name}
                        </Link>
                        {entry.rarity ? (
                          <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {entry.rarity}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300 sm:px-5">
                        {entry.source_set_name || entry.source_card_number ? (
                          <>
                            {entry.source_set_name ?? "Unknown set"}
                            {entry.source_card_number ? ` #${entry.source_card_number}` : ""}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500 dark:text-slate-400 sm:px-5">
                        {entry.number || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="gv-eyebrow">Set checklist</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">Cards in this album</h2>
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {setDetail.card_count.toLocaleString()} catalog rows
          </p>
        </div>
        <PublicSetCardGrid
          setCode={setDetail.code}
          initialCards={await applyOwnedPrintingCountsToSetCards(initialCards, user?.id ?? null)}
          totalCount={setDetail.card_count}
          chunkSize={INITIAL_CARD_CHUNK}
        />
      </section>
      </div>
    </main>
  );
}
