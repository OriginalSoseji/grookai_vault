"use client";

import { useMemo, useState } from "react";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { PublicCollectionGrid } from "@/components/public/PublicCollectionGrid";
import { FeaturedWallSection } from "@/components/public/FeaturedWallSection";
import { PublicPokemonJumpForm } from "@/components/public/PublicPokemonJumpForm";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";

type PublicCollectorProfileSegment = "collection" | "highlights";

type PublicCollectorProfileContentProps = {
  slug: string;
  cards: PublicWallCard[];
  collectionTitle?: string;
  collectionEyebrow?: string;
  collectionDescription?: string;
  defaultPokemonValue?: string;
};

function getHighlightPriority(card: PublicWallCard) {
  return Number(Boolean(card.wall_category)) + Number(Boolean(card.public_note)) + Number(Boolean(card.back_image_url)) + Number(Boolean(card.is_slab));
}

export function PublicCollectorProfileContent({
  slug,
  cards,
  collectionTitle = "Collection",
  collectionEyebrow = "Collection",
  collectionDescription = "Browse the cards this collector has chosen to share.",
  defaultPokemonValue,
}: PublicCollectorProfileContentProps) {
  const [activeSegment, setActiveSegment] = useState<PublicCollectorProfileSegment>("collection");

  const highlightCards = useMemo(() => {
    return [...cards]
      .sort((left, right) => getHighlightPriority(right) - getHighlightPriority(left))
      .slice(0, Math.min(cards.length, 6));
  }, [cards]);

  return (
    <section className="space-y-4">
      <div className="rounded-[1.6rem] border border-slate-200 bg-white p-2 shadow-sm shadow-slate-200/60">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: "collection", label: "Collection" },
              { value: "highlights", label: "Highlights" },
            ] as const
          ).map((segment) => (
            <button
              key={segment.value}
              type="button"
              onClick={() => setActiveSegment(segment.value)}
              className={`rounded-[1.1rem] px-4 py-3 text-sm font-medium transition ${
                activeSegment === segment.value
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
              aria-pressed={activeSegment === segment.value}
            >
              {segment.label}
            </button>
          ))}
        </div>
      </div>

      {activeSegment === "collection" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[1.6rem] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/60 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">{collectionEyebrow}</p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{collectionTitle}</h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">{collectionDescription}</p>
              </div>
              <p className="text-sm font-medium text-slate-500">
                {cards.length} {cards.length === 1 ? "card" : "cards"}
              </p>
            </div>
            <PublicPokemonJumpForm slug={slug} defaultValue={defaultPokemonValue} variant="compact" />
          </div>

          <PublicCollectionGrid cards={cards} />
        </div>
      ) : highlightCards.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Highlights</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Collector highlights</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              A tighter showcase built from the slabs, notes, categories, and standout cards already on this wall.
            </p>
          </div>
          <FeaturedWallSection cards={highlightCards} showHeader={false} />
        </div>
      ) : (
        <PublicCollectionEmptyState title="No highlights yet" body="This collector hasn't featured any highlights yet." />
      )}
    </section>
  );
}
