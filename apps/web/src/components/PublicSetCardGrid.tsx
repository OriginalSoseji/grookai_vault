"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CompareTray from "@/components/compare/CompareTray";
import PublicCardImage from "@/components/PublicCardImage";
import { buildPathWithCompareCards, normalizeCompareCardsParam, toggleCompareCard } from "@/lib/compareCards";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cards, setCards] = useState(initialCards);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));

  const canLoadMore = cards.length < totalCount;

  function commitCompareCards(nextCards: string[]) {
    router.replace(buildPathWithCompareCards(pathname, searchParams.toString(), nextCards), {
      scroll: false,
    });
  }

  function buildCardHref(gvId: string) {
    return buildPathWithCompareCards(`/card/${gvId}`, "", compareCards);
  }

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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm text-slate-600">
          Showing {cards.length} of {totalCount} card{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <div
            key={card.gv_id}
            className="rounded-[16px] border border-slate-200 bg-white p-3 shadow-sm transition-all duration-150 hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-end">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={compareCards.includes(card.gv_id)}
                  onChange={() => commitCompareCards(toggleCompareCard(compareCards, card.gv_id))}
                  disabled={!compareCards.includes(card.gv_id) && compareCards.length >= 4}
                  className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-400"
                />
                Compare
              </label>
            </div>
            <Link href={buildCardHref(card.gv_id)} className="block">
              <div className="rounded-[12px] border border-slate-100 bg-white p-2">
                <PublicCardImage
                  src={card.image_url}
                  alt={card.name}
                  loading={index < 12 ? "eager" : "lazy"}
                  imageClassName="aspect-[3/4] w-full rounded-[10px] bg-slate-50 object-contain p-5"
                  fallbackClassName="flex aspect-[3/4] items-center justify-center rounded-[10px] bg-slate-100 px-4 text-center text-sm text-slate-500"
                />
              </div>
              <div className="mt-3 space-y-1">
                <p className="truncate text-sm font-semibold text-slate-900">{card.name}</p>
                <p className="truncate text-xs text-slate-500">{setCode.toUpperCase()}</p>
                <p className="text-xs text-slate-400">{card.number ? `#${card.number}` : "—"}</p>
              </div>
            </Link>
          </div>
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

      <CompareTray
        cards={compareCards}
        addHref={buildPathWithCompareCards(pathname, searchParams.toString(), compareCards)}
        onRemoveCard={(gvId) => commitCompareCards(compareCards.filter((value) => value !== gvId))}
      />
    </div>
  );
}
