"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import VariantBadge from "@/components/cards/VariantBadge";
import { POKEMON_CARD_BROWSE_GRID_CLASSNAME } from "@/components/cards/pokemonCardGridLayout";
import CompareCardButton from "@/components/compare/CompareCardButton";
import CompareTray from "@/components/compare/CompareTray";
import ShareCardButton from "@/components/ShareCardButton";
import { buildCanonCardImageProxyUrl } from "@/lib/canon/canonImageProxy";
import { getCardImageAltText, resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import { getPrintingPublicReference } from "@/lib/cards/printingSelection";
import {
  resolveDisplayIdentity,
  resolveDisplayIdentitySubtitleForContext,
} from "@/lib/cards/resolveDisplayIdentity";
import { getVariantLabels } from "@/lib/cards/variantPresentation";
import { buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";
import {
  dedupePublicSetCards,
  mergePublicSetCardPage,
} from "@/lib/publicSetCardPagination";
import type { PublicSetCard } from "@/lib/publicSets.shared";

type PublicSetCardGridProps = {
  setCode: string;
  initialCards: PublicSetCard[];
  totalCount: number;
  chunkSize?: number;
};

function getDefaultPrintingId(card: PublicSetCard) {
  const printings = card.printings ?? [];
  return (
    printings.find((printing) => (printing.owned_count ?? 0) > 0)?.id ??
    printings.find((printing) => printing.finish_key === "normal")?.id ??
    printings.find((printing) => printing.finish_key === "holo")?.id ??
    printings[0]?.id ??
    null
  );
}

export default function PublicSetCardGrid({
  setCode,
  initialCards,
  totalCount,
  chunkSize = 36,
}: PublicSetCardGridProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cards, setCards] = useState(() => dedupePublicSetCards(initialCards));
  const [nextOffset, setNextOffset] = useState(initialCards.length);
  const [selectedPrintingByGvId, setSelectedPrintingByGvId] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(initialCards.length >= totalCount);
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const canLoadMore = nextOffset < totalCount && !hasReachedEnd;

  function buildCardHref(gvId: string, printingId?: string | null) {
    const params = new URLSearchParams();
    if (printingId) {
      params.set("printing", printingId);
    }

    return buildPathWithCompareCards(`/card/${gvId}`, params.toString(), compareCards);
  }

  async function handleLoadMore() {
    if (isLoading || !canLoadMore) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(
        `/api/public-set-cards?set_code=${encodeURIComponent(setCode)}&offset=${nextOffset}&limit=${chunkSize}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load more cards.");
      }

      const payload = (await response.json()) as { items?: PublicSetCard[] };
      const nextCards = Array.isArray(payload.items) ? payload.items : [];
      const nextState = mergePublicSetCardPage({
        currentCards: cards,
        pageItems: nextCards,
        rawOffset: nextOffset,
        pageSize: chunkSize,
        totalCount,
      });

      setCards(nextState.cards);
      setNextOffset(nextState.nextOffset);
      setHasReachedEnd(nextState.hasReachedEnd);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load more cards.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={`space-y-4 ${compareCards.length > 0 ? "pb-32 md:pb-36" : ""}`}>
      <div className="gv-results-command-bar flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Album view</p>
          <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Showing {cards.length} of {totalCount} card{totalCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className={POKEMON_CARD_BROWSE_GRID_CLASSNAME}>
        {cards.map((card, index) => {
          const displayIdentity = resolveDisplayIdentity(card);
          const setLabel = setCode.toUpperCase();
          const identitySubtitle = resolveDisplayIdentitySubtitleForContext({
            identitySubtitle: displayIdentity.suffix,
            visibleSetLabel: setLabel,
          });
          const variantLabels = getVariantLabels(card, 2);
          const selectedPrintingId = selectedPrintingByGvId[card.gv_id] ?? getDefaultPrintingId(card);
          const selectedPrinting = (card.printings ?? []).find((printing) => printing.id === selectedPrintingId) ?? null;
          const selectedHostedImageUrl = buildCanonCardImageProxyUrl(selectedPrinting?.printing_gv_id);
          const selectedImageUrl = selectedPrinting?.display_image_url ?? selectedPrinting?.image_url ?? null;
          const cardFallbackImageUrl = card.display_image_url ?? card.image_url ?? null;
          const imageSources = [
            selectedHostedImageUrl,
            cardFallbackImageUrl,
            selectedImageUrl,
            selectedPrinting?.external_image_fallback_url,
            card.external_image_fallback_url,
          ].filter(
            (candidate, candidateIndex, candidates): candidate is string =>
              Boolean(candidate?.trim()) && candidates.indexOf(candidate) === candidateIndex,
          );
          const selectedPrintingUsesBaseImage = Boolean(
            selectedPrinting &&
              cardFallbackImageUrl &&
              (selectedHostedImageUrl
                ? selectedHostedImageUrl !== selectedImageUrl
                : !selectedImageUrl),
          );
          const displayedImageTruthSource = selectedPrintingUsesBaseImage
            ? {
                ...selectedPrinting,
                display_image_kind: "missing_variant_visual" as const,
                image_status: selectedPrinting?.image_status ?? "missing_variant_visual",
                image_note:
                  selectedPrinting?.image_note ??
                  "Correct printing. Image may not show exact finish, stamp, or parallel.",
              }
            : selectedImageUrl
              ? selectedPrinting
              : card;
          const imagePresentation = resolveCardImagePresentation(displayedImageTruthSource);
          const finishLabels = (card.printings ?? []).map((printing) => printing.finish_name).filter((label): label is string => Boolean(label));
          const badgeLabels = [...variantLabels];
          const selectedFinishLabel = selectedPrinting?.finish_name ?? null;

          return (
            <PokemonCardGridTile
              key={card.gv_id}
              utility={<CompareCardButton gvId={card.gv_id} variant="compact" />}
              imageSrc={imageSources[0]}
              imageFallbackSrc={imageSources[1]}
              imageFallbackSources={imageSources.slice(2)}
              imageAlt={getCardImageAltText(displayIdentity.display_name, displayedImageTruthSource)}
              imageHref={buildCardHref(card.gv_id, getPrintingPublicReference(selectedPrinting))}
              imageSizes="(max-width: 640px) 44vw, (max-width: 1024px) 24vw, 190px"
              imageLoading={index < 12 ? "eager" : "lazy"}
              imageOverlay={
                imagePresentation.compactBadgeLabel ? (
                  <CardImageTruthBadge
                    label={imagePresentation.compactBadgeLabel}
                    emphasis={
                      imagePresentation.isCollisionRepresentative ||
                      imagePresentation.isMissingVariantVisual ||
                      imagePresentation.isBlocked
                        ? "strong"
                        : "default"
                    }
                  />
                ) : null
              }
              title={
                <Link
                  href={buildCardHref(card.gv_id, getPrintingPublicReference(selectedPrinting))}
                  className="block transition hover:text-slate-700"
                >
                  <span className="block truncate">{displayIdentity.base_name}</span>
                  {displayIdentity.printed_name ? (
                    <span className="gv-hi-metadata block truncate text-xs font-medium">{displayIdentity.printed_name}</span>
                  ) : null}
                  {identitySubtitle ? (
                    <span className="gv-hi-metadata block truncate text-xs font-medium">{identitySubtitle}</span>
                  ) : null}
                  <span className="gv-hi-metadata block truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
                    Grookai ID {card.gv_id}
                  </span>
                </Link>
              }
              subtitle={<span className="block truncate">{setLabel}</span>}
              badges={
                badgeLabels.length > 0 || finishLabels.length > 0 ? (
                  <>
                    {badgeLabels.map((label) => (
                      <VariantBadge key={`${card.gv_id}-${label}`} label={label} />
                    ))}
                    {(card.printings ?? []).map((printing) => {
                      const label = printing.finish_name;
                      if (!printing.id || !label) {
                        return null;
                      }

                      const isActive = printing.id === selectedPrinting?.id;
                      return (
                        <button
                          key={`${card.gv_id}-${printing.id}`}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setSelectedPrintingByGvId((current) => ({ ...current, [card.gv_id]: printing.id! }))}
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] transition ${
                            isActive
                              ? "border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-950/10"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                          }`}
                        >
                          {label}
                          {(printing.owned_count ?? 0) > 0 ? ` ${printing.owned_count}x` : ""}
                        </button>
                      );
                    })}
                  </>
                ) : undefined
              }
              meta={
                <div className="space-y-1">
                  <span className="block">{card.number ? `#${card.number}` : "—"}</span>
                  {selectedFinishLabel ? (
                    <span className="block text-xs font-semibold text-slate-800">Selected: {selectedFinishLabel}</span>
                  ) : null}
                </div>
              }
              footer={
                <div className="flex items-center justify-between gap-3">
                  <span className="gv-hi-diagnostics">GV-ID: {card.gv_id}</span>
                  <ShareCardButton gvId={card.gv_id} />
                </div>
              }
            />
          );
        })}
      </div>

      {loadError ? <p className="text-sm text-rose-600">{loadError}</p> : null}

      {hasReachedEnd && cards.length < totalCount ? (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
          No additional cards are available for this set yet.
        </p>
      ) : null}

      {canLoadMore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoading}
            className="gv-secondary-button disabled:cursor-not-allowed disabled:opacity-60"
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
