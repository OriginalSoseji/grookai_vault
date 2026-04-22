import Link from "next/link";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import { POKEMON_CARD_DISCOVERY_COMPACT_GRID_CLASSNAME } from "@/components/cards/pokemonCardGridLayout";
import CompareCardButton from "@/components/compare/CompareCardButton";
import { buildPathWithCompareCards } from "@/lib/compareCards";
import { getCardImageAltText, resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import type { RecentlyConfirmedCanonicalCard } from "@/lib/provisional/getRecentlyConfirmedCanonicalCards";

type RecentlyConfirmedDiscoverySectionProps = {
  cards: RecentlyConfirmedCanonicalCard[];
  compareCards: string[];
};

function buildCardHref(gvId: string, compareCards: string[]) {
  return buildPathWithCompareCards(`/card/${gvId}`, "", compareCards);
}

function buildCardMetaLine(card: RecentlyConfirmedCanonicalCard) {
  return [card.set_name ?? card.set_code ?? "Unknown set", card.number ? `#${card.number}` : undefined, card.rarity]
    .filter(Boolean)
    .join(" • ");
}

// LOCK: Recently confirmed cards remain canonical-first surfaces with only subtle historical context.
export default function RecentlyConfirmedDiscoverySection({
  cards,
  compareCards,
}: RecentlyConfirmedDiscoverySectionProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 md:space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">Now Confirmed in Grookai</h2>
        <p className="text-sm text-slate-600">Recently added to the canonical catalog.</p>
      </div>

      <div className={POKEMON_CARD_DISCOVERY_COMPACT_GRID_CLASSNAME}>
        {cards.map((card) => {
          const imagePresentation = resolveCardImagePresentation(card);
          const href = buildCardHref(card.gv_id, compareCards);

          return (
            <PokemonCardGridTile
              key={card.gv_id}
              density="compact"
              utility={<CompareCardButton gvId={card.gv_id} variant="compact" />}
              imageSrc={card.display_image_url ?? card.image_url}
              imageAlt={getCardImageAltText(card.display_name, card)}
              imageHref={href}
              imageOverlay={
                imagePresentation.compactBadgeLabel ? (
                  <CardImageTruthBadge
                    label={imagePresentation.compactBadgeLabel}
                    emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
                  />
                ) : null
              }
              title={
                <Link href={href} className="line-clamp-2 block transition hover:text-slate-700">
                  {card.display_name}
                </Link>
              }
              subtitle={
                <span className="line-clamp-2 block text-[11px] leading-[1.125rem]">
                  {buildCardMetaLine(card)}
                </span>
              }
              footer={<span>{card.gv_id}</span>}
            />
          );
        })}
      </div>
    </section>
  );
}
