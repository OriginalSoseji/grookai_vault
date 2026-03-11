"use client";

import { useState } from "react";
import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import type { PublicSetCard } from "@/lib/publicSets";

type PublicSetCardGridProps = {
  setCode: string;
  initialCards: PublicSetCard[];
  totalCount: number;
  chunkSize?: number;
};

export default function PublicSetCardGrid({
  setCode,
  initialCards,
  totalCount,
  chunkSize = 36,
}: PublicSetCardGridProps) {
  const [cards, setCards] = useState(initialCards);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canLoadMore = cards.length < totalCount;

  async function handleLoadMore() {
    if (isLoading || !canLoadMore) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(
        `/api/public-set-cards?set_code=${encodeURIComponent(setCode)}&offset=${cards.length}&limit=${chunkSize}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Failed to load more cards.");
      }

      const payload = (await response.json()) as { items?: PublicSetCard[] };
      const nextCards = Array.isArray(payload.items) ? payload.items : [];

      setCards((current) => {
        const seen = new Set(current.map((card) => card.gv_id));
        const merged = [...current];

        for (const card of nextCards) {
          if (!seen.has(card.gv_id)) {
            merged.push(card);
            seen.add(card.gv_id);
          }
        }

        return merged;
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load more cards.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-600">
          Showing {cards.length} of {totalCount} card{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <Link
            key={card.gv_id}
            href={`/card/${card.gv_id}`}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <PublicCardImage
              src={card.image_url}
              alt={card.name}
              loading={index < 12 ? "eager" : "lazy"}
              imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-6"
              fallbackClassName="flex aspect-[3/4] items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
            />
            <div className="space-y-2 border-t border-slate-200 px-4 py-4">
              <p className="line-clamp-2 text-lg font-medium text-slate-950">{card.name}</p>
              <p className="text-sm text-slate-600">
                {[card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}
              </p>
              <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{card.gv_id}</p>
            </div>
          </Link>
        ))}
      </div>

      {loadError ? <p className="text-sm text-rose-600">{loadError}</p> : null}

      {canLoadMore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
