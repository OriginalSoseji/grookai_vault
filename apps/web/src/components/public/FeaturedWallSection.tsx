"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PublicCardImage from "@/components/PublicCardImage";
import { getPublicWallCardHref, type PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import {
  getWallCategoryLabel,
  WALL_CATEGORY_OPTIONS,
  type WallCategory,
} from "@/lib/sharedCards/wallCategories";

type FeaturedWallSectionProps = {
  cards: PublicWallCard[];
  showHeader?: boolean;
  viewerUserId?: string | null;
  ownerUserId?: string | null;
};

type FeaturedWallFilter = "all" | WallCategory;

function getMixedOwnershipSummary(card: PublicWallCard) {
  const rawCount = card.raw_count ?? 0;
  const slabCount = card.slab_count ?? 0;

  if (rawCount <= 0 || slabCount <= 0) {
    return null;
  }

  if (slabCount === 1 && card.grader && card.grade) {
    return `${rawCount} Raw + 1 ${[card.grader, card.grade].filter(Boolean).join(" ")}`;
  }

  return `${rawCount} Raw + ${slabCount} Slab`;
}

function FeaturedWallCard({
  card,
  viewerUserId,
  ownerUserId,
}: {
  card: PublicWallCard;
  viewerUserId?: string | null;
  ownerUserId?: string | null;
}) {
  const wallCategoryLabel = getWallCategoryLabel(card.wall_category);
  const mixedSummary = getMixedOwnershipSummary(card);
  const cardHref = getPublicWallCardHref(card, viewerUserId, ownerUserId) ?? `/card/${card.gv_id}`;

  return (
    <Link
      href={cardHref}
      className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="grid min-h-full gap-0 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(241,245,249,0.9))] p-4 sm:p-5">
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white/80">
            <PublicCardImage
              src={card.image_url}
              alt={card.name}
              imageClassName="aspect-[3/4] w-full object-contain bg-slate-50 p-5 transition duration-200 group-hover:scale-[1.02]"
              fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
              fallbackLabel={card.name}
            />
          </div>
        </div>
        <div className="flex min-h-full flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">Featured Wall</p>
              <h3 className="line-clamp-2 text-2xl font-semibold tracking-tight text-slate-950">{card.name}</h3>
              <p className="text-sm text-slate-600">
                {[card.set_name, card.number !== "—" ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {wallCategoryLabel ? (
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {wallCategoryLabel}
                </span>
              ) : null}
              {card.is_slab ? (
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Slab
                </span>
              ) : null}
            </div>
          </div>

          {mixedSummary ? (
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-700">{mixedSummary}</p>
            </div>
          ) : null}

          {card.is_slab ? (
            <div className="space-y-1 rounded-[1rem] border border-amber-100 bg-amber-50/70 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
                {[card.grader, card.grade].filter(Boolean).join(" ") || "Graded slab"}
              </p>
              {card.cert_number ? <p className="text-sm text-slate-600">Cert {card.cert_number}</p> : null}
            </div>
          ) : null}

          {card.public_note ? <p className="text-sm leading-7 text-slate-600">{card.public_note}</p> : null}

          {card.back_image_url ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
              <div className="border-b border-slate-200 px-4 py-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Back Photo</p>
              </div>
              <PublicCardImage
                src={card.back_image_url}
                alt={`${card.name} back`}
                imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-4"
                fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                fallbackLabel={`${card.name} back`}
              />
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function FeaturedWallSection({
  cards,
  showHeader = true,
  viewerUserId = null,
  ownerUserId = null,
}: FeaturedWallSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FeaturedWallFilter>("all");

  const orderedCards = useMemo(() => {
    const categorized = cards.filter((card) => Boolean(card.wall_category));
    const uncategorized = cards.filter((card) => !card.wall_category);
    return [...categorized, ...uncategorized];
  }, [cards]);

  const availableCategories = useMemo(() => new Set(cards.map((card) => card.wall_category).filter(Boolean)), [cards]);

  const filteredCards = useMemo(() => {
    if (activeFilter === "all") {
      return orderedCards;
    }

    return orderedCards.filter((card) => card.wall_category === activeFilter);
  }, [activeFilter, orderedCards]);

  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60 sm:px-7">
      {showHeader ? (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Featured Wall</p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">Featured Wall</h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                The cards and slabs this collector wants front and center.
              </p>
            </div>
            <p className="text-sm font-medium text-slate-500">
              {filteredCards.length} {filteredCards.length === 1 ? "wall item" : "wall items"}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`inline-flex rounded-full px-3.5 py-2 text-sm font-medium transition ${
            activeFilter === "all"
              ? "border border-slate-950 bg-slate-950 text-white"
              : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
          }`}
        >
          All
        </button>
        {WALL_CATEGORY_OPTIONS.map((option) => {
          const hasItems = availableCategories.has(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveFilter(option.value)}
              className={`inline-flex rounded-full px-3.5 py-2 text-sm font-medium transition ${
                activeFilter === option.value
                  ? "border border-slate-950 bg-slate-950 text-white"
                  : hasItems
                    ? "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                    : "border border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {filteredCards.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm text-slate-600">No wall items in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredCards.map((card) => (
            <FeaturedWallCard
              key={`${card.gv_id}-${card.wall_category ?? "none"}`}
              card={card}
              viewerUserId={viewerUserId}
              ownerUserId={ownerUserId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
