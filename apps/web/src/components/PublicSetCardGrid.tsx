"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import { POKEMON_CARD_BROWSE_GRID_CLASSNAME } from "@/components/cards/pokemonCardGridLayout";
import CompareCardButton from "@/components/compare/CompareCardButton";
import CompareTray from "@/components/compare/CompareTray";
import ShareCardButton from "@/components/ShareCardButton";
import { getCardImageAltText, resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import {
  resolveDisplayIdentity,
  resolveDisplayIdentitySubtitleForContext,
} from "@/lib/cards/resolveDisplayIdentity";
import { buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";
import type { PublicSetCard } from "@/lib/publicSets.shared";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cards, setCards] = useState(initialCards);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const canLoadMore = cards.length < totalCount;

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
    <div className={`space-y-4 ${compareCards.length > 0 ? "pb-32 md:pb-36" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm text-slate-600">
          Showing {cards.length} of {totalCount} card{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className={POKEMON_CARD_BROWSE_GRID_CLASSNAME}>
        {cards.map((card, index) => {
          const displayIdentity = resolveDisplayIdentity(card);
          const imagePresentation = resolveCardImagePresentation(card);
          const setLabel = setCode.toUpperCase();
          const identitySubtitle = resolveDisplayIdentitySubtitleForContext({
            identitySubtitle: displayIdentity.suffix,
            visibleSetLabel: setLabel,
          });

          return (
            <PokemonCardGridTile
              key={card.gv_id}
              utility={<CompareCardButton gvId={card.gv_id} variant="compact" />}
              imageSrc={card.display_image_url ?? card.image_url}
              imageAlt={getCardImageAltText(displayIdentity.display_name, card)}
              imageHref={buildCardHref(card.gv_id)}
              imageLoading={index < 12 ? "eager" : "lazy"}
              imageOverlay={
                imagePresentation.compactBadgeLabel ? (
                  <CardImageTruthBadge
                    label={imagePresentation.compactBadgeLabel}
                    emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
                  />
                ) : null
              }
              title={
                <Link href={buildCardHref(card.gv_id)} className="block transition hover:text-slate-700">
                  <span className="block truncate">{displayIdentity.base_name}</span>
                  {identitySubtitle ? (
                    <span className="block truncate text-xs font-medium text-slate-500">{identitySubtitle}</span>
                  ) : null}
                </Link>
              }
              subtitle={<span className="block truncate">{setLabel}</span>}
              meta={<span>{card.number ? `#${card.number}` : "—"}</span>}
              footer={
                <div className="flex items-center justify-between gap-3">
                  <span>GV-ID: {card.gv_id}</span>
                  <ShareCardButton gvId={card.gv_id} />
                </div>
              }
            />
          );
        })}
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
      />
    </div>
  );
}
