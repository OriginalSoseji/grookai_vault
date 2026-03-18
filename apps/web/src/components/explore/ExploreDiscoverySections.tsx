import Link from "next/link";
import type { ReactNode } from "react";
import CompareCardButton from "@/components/compare/CompareCardButton";
import PublicCardImage from "@/components/PublicCardImage";
import { buildPathWithCompareCards } from "@/lib/compareCards";
import type { FeaturedExploreCard } from "@/lib/cards/getFeaturedExploreCards";
import type { ExploreViewMode } from "@/lib/exploreViewModes";
import type { PublicSetSummary } from "@/lib/publicSets.shared";

const POPULAR_POKEMON = [
  "Pikachu",
  "Charizard",
  "Eevee",
  "Umbreon",
  "Mewtwo",
  "Gengar",
  "Rayquaza",
  "Gardevoir",
] as const;

type ExploreDiscoverySectionsProps = {
  compareCards: string[];
  featuredCards: FeaturedExploreCard[];
  notableSets: PublicSetSummary[];
  currentView?: ExploreViewMode;
};

function buildExploreQueryHref(query: string, compareCards: string[], currentView?: ExploreViewMode) {
  const params = new URLSearchParams({ q: query });
  if (currentView) {
    params.set("view", currentView);
  }
  return buildPathWithCompareCards("/explore", params.toString(), compareCards);
}

function buildCardHref(gvId: string, compareCards: string[]) {
  return buildPathWithCompareCards(`/card/${gvId}`, "", compareCards);
}

function buildCardMetaLine(card: FeaturedExploreCard) {
  return [card.set_name ?? card.set_code ?? "Unknown set", card.number ? `#${card.number}` : undefined, card.rarity]
    .filter(Boolean)
    .join(" • ");
}

function MobileFeedSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="max-w-[24rem] text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export default function ExploreDiscoverySections({
  compareCards,
  featuredCards,
  notableSets,
  currentView,
}: ExploreDiscoverySectionsProps) {
  const spotlightCard = featuredCards[0] ?? null;
  const railCards = featuredCards.slice(1, 7);
  const gridCards = [...featuredCards.slice(7), ...featuredCards.slice(1, 7)].slice(0, 4);
  const mobileSetCards = notableSets.slice(0, 4);
  const hasRailSection = railCards.length >= 2;
  const hasGridSection = gridCards.length >= 2;
  const hasSetsSection = mobileSetCards.length > 0;

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="space-y-9 md:hidden">
        {spotlightCard ? (
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_42%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-4 shadow-sm shadow-amber-100/30">
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Rotating Spotlight</p>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Start with one standout card</h2>
                  </div>
                  <CompareCardButton gvId={spotlightCard.gv_id} variant="compact" />
                </div>
                <p className="max-w-[24rem] text-sm leading-6 text-slate-600">
                  This spotlight rotates through standout cards from the Grookai catalog.
                </p>
              </div>
              <Link href={buildCardHref(spotlightCard.gv_id, compareCards)} className="block space-y-4">
                <div className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white/90 shadow-sm">
                  <PublicCardImage
                    src={spotlightCard.image_url}
                    alt={spotlightCard.name}
                    imageClassName="aspect-[3/4] w-full object-contain bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-5"
                    fallbackClassName="flex aspect-[3/4] items-center justify-center rounded-[1rem] bg-slate-100 px-4 text-center text-sm text-slate-500"
                  />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-[1.4rem] font-semibold tracking-tight text-slate-950">{spotlightCard.name}</p>
                    <p className="text-sm leading-6 text-slate-600">{buildCardMetaLine(spotlightCard)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                      Open card
                    </span>
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">GV {spotlightCard.gv_id}</span>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        ) : null}

        {hasRailSection ? (
          <section className="space-y-4">
            <MobileFeedSectionHeader
              eyebrow="Rotating Picks"
              title="Keep scrolling"
              description="More cards from the current spotlight window."
              action={
                <Link
                  href={buildPathWithCompareCards("/explore", "", compareCards)}
                  className="text-xs font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
                >
                  View all
                </Link>
              }
            />
            <div className="-mx-5 overflow-x-auto px-5">
              <div className="flex gap-3.5 pb-1">
                {railCards.map((card) => (
                  <article
                    key={card.gv_id}
                    className="w-[198px] shrink-0 overflow-hidden rounded-[1.55rem] border border-slate-200 bg-white shadow-sm transition-transform duration-150 active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-end px-3 pb-0 pt-3">
                      <CompareCardButton gvId={card.gv_id} variant="compact" />
                    </div>
                    <Link href={buildCardHref(card.gv_id, compareCards)} className="block space-y-3 px-3 pb-3">
                      <div className="rounded-[1.1rem] border border-slate-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-3">
                        <PublicCardImage
                          src={card.image_url}
                          alt={card.name}
                          imageClassName="aspect-[3/4] w-full object-contain"
                          fallbackClassName="flex aspect-[3/4] items-center justify-center rounded-[0.9rem] bg-slate-100 px-3 text-center text-xs text-slate-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-950">{card.name}</p>
                        <p className="line-clamp-2 text-xs leading-5 text-slate-500">{buildCardMetaLine(card)}</p>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {hasGridSection ? (
          <section className="space-y-4">
            <MobileFeedSectionHeader
              eyebrow="Discover More"
              title="A few more cards worth a closer look"
              description="A denser lane for quick browsing once something catches your eye."
            />
            <div className="grid grid-cols-2 gap-3.5">
              {gridCards.map((card) => (
                <Link
                  key={card.gv_id}
                  href={buildCardHref(card.gv_id, compareCards)}
                  className="overflow-hidden rounded-[1.55rem] border border-slate-200 bg-white shadow-sm transition-transform duration-150 active:scale-[0.99]"
                >
                  <div className="rounded-t-[1.55rem] border-b border-slate-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-3">
                    <PublicCardImage
                      src={card.image_url}
                      alt={card.name}
                      imageClassName="aspect-[3/4] w-full object-contain"
                      fallbackClassName="flex aspect-[3/4] items-center justify-center rounded-[0.9rem] bg-slate-100 px-3 text-center text-xs text-slate-500"
                    />
                  </div>
                  <div className="space-y-1.5 px-3 py-3">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-950">{card.name}</p>
                    <p className="line-clamp-2 text-xs leading-5 text-slate-500">{buildCardMetaLine(card)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {hasSetsSection ? (
          <section className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-4 shadow-sm">
            <MobileFeedSectionHeader
              eyebrow="Browse Sets"
              title="Set discovery stays first-class"
              description="Jump into collector-relevant sets without leaving the feed."
              action={
                <Link
                  href={buildPathWithCompareCards("/sets", "", compareCards)}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950"
                >
                  All sets
                </Link>
              }
            />
            <div className="grid grid-cols-2 gap-3">
              {mobileSetCards.map((setInfo) => (
                <Link
                  key={setInfo.code}
                  href={buildPathWithCompareCards(`/sets/${setInfo.code}`, "", compareCards)}
                  className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{setInfo.code}</p>
                    <h3 className="line-clamp-2 text-base font-semibold tracking-tight text-slate-950">{setInfo.name}</h3>
                    <p className="text-xs leading-5 text-slate-500">
                      {[
                        typeof setInfo.release_year === "number" ? String(setInfo.release_year) : undefined,
                        typeof setInfo.printed_total === "number" ? `${setInfo.printed_total} cards` : undefined,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <MobileFeedSectionHeader
            eyebrow="Browse by Pokémon"
            title="Choose a Pokémon"
            description="Use a familiar favorite as a quick way into the catalog."
          />
          <div className="flex flex-wrap gap-2.5">
            {POPULAR_POKEMON.map((pokemon) => (
              <Link
                key={pokemon}
                href={buildExploreQueryHref(pokemon, compareCards, currentView)}
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              >
                {pokemon}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="hidden space-y-10 md:block md:space-y-12">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-6 py-7 shadow-sm md:px-8 md:py-9">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Collector Discovery</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Start with standout cards, iconic Pokémon, and modern set favorites.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              Browse the catalog visually first, then jump deeper once something catches your eye.
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Featured</p>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Featured cards</h2>
              <p className="text-sm text-slate-600">
                Special Illustration Rares and other standout collector favorites.
              </p>
            </div>
          </div>

          {featuredCards.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {featuredCards.map((card) => (
                <article
                  key={card.gv_id}
                  className="group overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="mb-3 flex items-center justify-end">
                    <CompareCardButton gvId={card.gv_id} variant="compact" />
                  </div>
                  <Link href={buildPathWithCompareCards(`/card/${card.gv_id}`, "", compareCards)} className="block space-y-4">
                    <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-4">
                      <PublicCardImage
                        src={card.image_url}
                        alt={card.name}
                        imageClassName="aspect-[3/4] w-full rounded-[12px] object-contain transition duration-150 group-hover:scale-[1.02]"
                        fallbackClassName="flex aspect-[3/4] items-center justify-center rounded-[12px] bg-slate-100 px-4 text-center text-sm text-slate-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="truncate text-base font-semibold text-slate-950">{card.name}</p>
                      <p className="truncate text-sm text-slate-600">{card.set_name ?? card.set_code ?? "Unknown set"}</p>
                      <p className="text-xs text-slate-500">
                        {[card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}
                      </p>
                      <p className="text-[11px] font-medium tracking-[0.08em] text-slate-400">{card.gv_id}</p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600 shadow-sm">
              Featured cards are being refreshed. Try exploring by Pokémon or set.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Browse by Pokémon</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Choose a Pokémon</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {POPULAR_POKEMON.map((pokemon) => (
              <Link
                key={pokemon}
                href={buildExploreQueryHref(pokemon, compareCards, currentView)}
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
              >
                {pokemon}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Set Focus</p>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Explore by set</h2>
              <p className="text-sm text-slate-600">
                Jump into modern favorites and collector-relevant releases.
              </p>
            </div>
          </div>

          {notableSets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {notableSets.map((setInfo) => (
                <Link
                  key={setInfo.code}
                  href={buildPathWithCompareCards(`/sets/${setInfo.code}`, "", compareCards)}
                  className="group rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{setInfo.code}</p>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">{setInfo.name}</h3>
                      <p className="text-sm text-slate-600">
                        {[typeof setInfo.release_year === "number" ? String(setInfo.release_year) : undefined, typeof setInfo.printed_total === "number" ? `${setInfo.printed_total} cards` : undefined]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600 shadow-sm">
              Set highlights are being refreshed. Start with a featured card or favorite Pokémon.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
