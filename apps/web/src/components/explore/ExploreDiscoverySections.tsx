import Link from "next/link";
import CompareCardButton from "@/components/compare/CompareCardButton";
import PublicCardImage from "@/components/PublicCardImage";
import { buildPathWithCompareCards } from "@/lib/compareCards";
import type { FeaturedExploreCard } from "@/lib/cards/getFeaturedExploreCards";
import type { ExploreViewMode } from "@/lib/exploreViewModes";
import type { PublicSetSummary } from "@/lib/publicSets";

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

export default function ExploreDiscoverySections({
  compareCards,
  featuredCards,
  notableSets,
  currentView,
}: ExploreDiscoverySectionsProps) {
  return (
    <div className="space-y-10 md:space-y-12">
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Start with a favorite</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Popular Pokémon</h2>
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
  );
}
