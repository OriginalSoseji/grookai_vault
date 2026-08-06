"use client";

import Link from "next/link";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import { PokemonCardGridBadge } from "@/components/cards/PokemonCardGridTile";
import {
  CollectorCardFacts,
  CollectorEvidenceDisclosure,
} from "@/components/collector/CollectorCardPresentation";
import PublicCardImage from "@/components/PublicCardImage";
import { resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { getPublicWallCardHref, type PublicWallCard } from "@/lib/sharedCards/publicWall.shared";

type FeaturedWallSectionProps = {
  cards: PublicWallCard[];
  showHeader?: boolean;
  viewerUserId?: string | null;
  ownerUserId?: string | null;
};

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
  const displayIdentity = resolveDisplayIdentity(card);
  const imagePresentation = resolveCardImagePresentation(card);
  const mixedSummary = getMixedOwnershipSummary(card);
  const cardHref = getPublicWallCardHref(card, viewerUserId, ownerUserId) ?? `/card/${card.gv_id}`;

  return (
    <article
      className="group grid min-h-full grid-cols-[minmax(118px,0.72fr)_minmax(0,1.28fr)] gap-4 border-b border-slate-200/80 pb-5 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(150px,0.72fr)_minmax(0,1.28fr)] sm:gap-5 dark:border-white/[0.08]"
      data-wall-collection-card
    >
        <Link href={cardHref} className="self-start">
          <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50/70 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="relative">
              <PublicCardImage
                src={card.image_url}
                fallbackSrc={card.image_fallback_urls?.[0] ?? card.canonical_image_url}
                fallbackSources={card.image_fallback_urls?.slice(1)}
                alt={displayIdentity.display_name}
                imageClassName="aspect-[5/7] w-full bg-slate-50 object-contain transition duration-200 group-hover:scale-[1.006]"
                fallbackClassName="flex aspect-[5/7] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                fallbackLabel={displayIdentity.display_name}
              />
            </div>
          </div>
        </Link>
        <div className="flex min-h-full min-w-0 flex-col gap-4 py-1">
          <p className="gv-eyebrow dark:text-slate-300">Featured on this Wall</p>
          <CollectorCardFacts
            title={<Link href={cardHref} className="line-clamp-2 transition hover:text-slate-700">{displayIdentity.base_name}</Link>}
            setName={card.set_name}
            number={card.number}
            rarity={card.rarity}
            versionLabel={displayIdentity.suffix}
            ownershipLabel={mixedSummary ?? (card.is_slab ? "Graded copy" : "Raw copy")}
          />
          {imagePresentation.compactBadgeLabel ? (
            <div className="w-fit">
              <CardImageTruthBadge
                label={imagePresentation.compactBadgeLabel}
                note={imagePresentation.detailNote}
                emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
              />
            </div>
          ) : null}

          {card.is_slab ? (
            <div className="flex flex-wrap gap-1.5">
              <PokemonCardGridBadge tone="warm">
                {[card.grader, card.grade].filter(Boolean).join(" ") || "Graded slab"}
              </PokemonCardGridBadge>
              {card.cert_number ? <PokemonCardGridBadge>Cert {card.cert_number}</PokemonCardGridBadge> : null}
            </div>
          ) : null}

          {card.public_note ? <p className="text-sm leading-7 text-slate-600">{card.public_note}</p> : null}

          {card.back_image_url ? (
            <div className="max-w-[118px] overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 sm:max-w-[150px]">
              <div className="border-b border-slate-200 px-4 py-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Back Photo</p>
              </div>
              <PublicCardImage
                src={card.back_image_url}
                alt={`${displayIdentity.display_name} back`}
                imageClassName="aspect-[5/7] w-full bg-slate-50 object-contain"
                fallbackClassName="flex aspect-[5/7] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                fallbackLabel={`${displayIdentity.display_name} back`}
              />
            </div>
          ) : null}
          <div className="mt-auto space-y-3">
            <Link href={cardHref} className="gv-secondary-button w-full sm:w-fit">View exact copy</Link>
            <CollectorEvidenceDisclosure>
              <p>Card ID: {card.gv_id}</p>
              {card.gv_vi_id ? <p>Exact copy ID: {card.gv_vi_id}</p> : <p>Exact copy identity is not available.</p>}
              <p>Image evidence: {imagePresentation.detailNote ?? "Canonical card image"}</p>
            </CollectorEvidenceDisclosure>
          </div>
        </div>
    </article>
  );
}

export function FeaturedWallSection({
  cards,
  showHeader = true,
  viewerUserId = null,
  ownerUserId = null,
}: FeaturedWallSectionProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5 border-t border-slate-200/80 pt-5 dark:border-white/[0.08]" data-wall-collection-display>
      {showHeader ? (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Featured Wall</p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">Featured Wall</h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                The cards and slabs this collector wants front and center.
              </p>
            </div>
            <p className="text-sm font-medium text-slate-500">
              {cards.length} {cards.length === 1 ? "wall item" : "wall items"}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-x-8">
        {cards.map((card) => (
          <FeaturedWallCard
            key={card.gv_vi_id ?? card.vault_item_id ?? card.card_print_id ?? card.gv_id}
            card={card}
            viewerUserId={viewerUserId}
            ownerUserId={ownerUserId}
          />
        ))}
      </div>
    </section>
  );
}
