"use client";

import Link from "next/link";
import PokemonCardGridTile, { PokemonCardGridBadge } from "@/components/cards/PokemonCardGridTile";
import { getPokemonCardCollectionGridClassName } from "@/components/cards/pokemonCardGridLayout";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { useViewDensity, type ViewDensity } from "@/hooks/useViewDensity";
import {
  getPublicWallCardHref,
  getPublicWallCardPrimaryGvviId,
  type PublicWallCard,
} from "@/lib/sharedCards/publicWall.shared";
import { getWallCategoryLabel } from "@/lib/sharedCards/wallCategories";

type PublicCollectionGridProps = {
  cards: PublicWallCard[];
  density?: ViewDensity;
  viewerUserId: string | null;
  ownerUserId: string;
};

export function PublicCollectionGrid({
  cards,
  density: providedDensity,
  viewerUserId,
  ownerUserId,
}: PublicCollectionGridProps) {
  const storedDensity = useViewDensity();
  const density = providedDensity ?? storedDensity.density;

  return (
    <section className="space-y-4">
      <div className={getPokemonCardCollectionGridClassName(density)}>
        {cards.map((card) => (
          (() => {
            const wallCategoryLabel = getWallCategoryLabel(card.wall_category);
            const rawCount = card.raw_count ?? 0;
            const slabCount = card.slab_count ?? 0;
            const mixedSummary =
              rawCount > 0 && slabCount > 0
                ? slabCount === 1 && card.grader && card.grade
                  ? `${rawCount} Raw + 1 ${[card.grader, card.grade].filter(Boolean).join(" ")}`
                  : `${rawCount} Raw + ${slabCount} Slab`
                : null;
            const slabSummary =
              mixedSummary ??
              (card.is_slab ? [card.grader, card.grade].filter(Boolean).join(" ") || "Graded slab" : null);
            const ownedCount = card.owned_count ?? 0;
            const cardHref = getPublicWallCardHref(card, viewerUserId, ownerUserId) ?? `/card/${card.gv_id}`;
            const gvviId = getPublicWallCardPrimaryGvviId(card);
            const displayIdentity = resolveDisplayIdentity(card);
            const cardKey = card.gv_vi_id ?? card.vault_item_id ?? card.card_print_id ?? card.gv_id;

            return (
              <PokemonCardGridTile
                key={cardKey}
                density={density}
                imageSrc={card.image_url}
                imageFallbackSrc={card.canonical_image_url}
                imageAlt={displayIdentity.display_name}
                imageHref={cardHref}
                imageFallbackLabel={displayIdentity.display_name}
                imageOverlay={
                  <>
                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {card.is_slab ? <PokemonCardGridBadge tone="warm">Slab</PokemonCardGridBadge> : null}
                      {wallCategoryLabel ? <PokemonCardGridBadge tone="accent">{wallCategoryLabel}</PokemonCardGridBadge> : null}
                    </div>
                    {ownedCount > 1 ? <PokemonCardGridBadge tone="neutral">Qty {ownedCount}</PokemonCardGridBadge> : <span />}
                  </>
                }
                title={
                  <Link href={cardHref} className="line-clamp-2 block transition hover:text-slate-700">
                    {displayIdentity.display_name}
                  </Link>
                }
                subtitle={
                  <span className="line-clamp-1 block">
                    {[card.set_name, card.number !== "—" ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}
                  </span>
                }
                meta={
                  <>
                    {slabSummary ? (
                      <p className="line-clamp-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-700">{slabSummary}</p>
                    ) : null}
                    {card.public_note ? <p className="line-clamp-2 pt-1 text-xs leading-5 text-slate-500">{card.public_note}</p> : null}
                  </>
                }
                footer={gvviId ? <span>GVVI: {gvviId}</span> : null}
              />
            );
          })()
        ))}
      </div>
    </section>
  );
}
