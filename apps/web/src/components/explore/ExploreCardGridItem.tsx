import Link from "next/link";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import CompareCardButton from "@/components/compare/CompareCardButton";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import PromotionTransitionNote from "@/components/provisional/PromotionTransitionNote";
import VariantBadge from "@/components/cards/VariantBadge";
import LockedPrice from "@/components/pricing/LockedPrice";
import VisiblePrice from "@/components/pricing/VisiblePrice";
import { getCardImageAltText, resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import {
  resolveDisplayIdentity,
  resolveDisplayIdentitySubtitleForContext,
} from "@/lib/cards/resolveDisplayIdentity";
import { getVariantLabels } from "@/lib/cards/variantPresentation";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import { getSearchContextLabel } from "@/components/explore/searchContextLabel";
import { getSearchContextBadgeTone } from "@/components/explore/searchContextPresentation";
import { getSecondaryBadgeLabels } from "@/components/explore/dedupeBadgeLabels";

type ExploreCardGridItemProps = {
  card: ExploreResultCard;
  href: string;
  mode: "thumb" | "thumb-lg";
  canViewPricing: boolean;
  matchReason?: string;
  imagePriority?: boolean;
};

function getPrimaryFinishLabel(card: ExploreResultCard) {
  return card.finish_label?.trim() || card.display_discriminator?.trim() || "";
}

export default function ExploreCardGridItem({ card, href, mode, canViewPricing, imagePriority = false }: ExploreCardGridItemProps) {
  const displayIdentity = resolveDisplayIdentity(card);
  const setLabel = card.set_name ?? "Unknown set";
  const identitySubtitle = resolveDisplayIdentitySubtitleForContext({
    identitySubtitle: displayIdentity.suffix,
    visibleSetLabel: setLabel,
  });
  const variantLabels = getVariantLabels(card, 2);
  const searchDiscriminator = getSearchContextLabel(card);
  const imagePresentation = resolveCardImagePresentation(card);
  const isLarge = mode === "thumb-lg";
  const density = isLarge ? "large" : "default";
  const primaryFinishLabel = getPrimaryFinishLabel(card);
  const secondaryVariantLabels = getSecondaryBadgeLabels(variantLabels, [
    primaryFinishLabel,
    searchDiscriminator ?? undefined,
  ]);
  const metaLine = [card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ") || "—";

  return (
    <PokemonCardGridTile
      density={density}
      utility={<CompareCardButton gvId={card.gv_id} variant="compact" />}
      imageSrc={card.display_image_url ?? card.image_url}
      imageFallbackSrc={card.display_image_fallback_url}
      imageAlt={getCardImageAltText(displayIdentity.display_name, card)}
      imageHref={href}
      imagePrefetch={false}
      imageLoading={imagePriority ? "eager" : "lazy"}
      imagePriority={imagePriority}
      imageSizes={
        isLarge
          ? "(max-width: 640px) 58vw, (max-width: 1024px) 34vw, 280px"
          : "(max-width: 640px) 44vw, (max-width: 1024px) 24vw, 190px"
      }
      imageOverlay={
        imagePresentation.compactBadgeLabel ? (
          <CardImageTruthBadge
            label={imagePresentation.compactBadgeLabel}
            note={imagePresentation.detailNote}
            emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
          />
        ) : null
      }
      title={
        <Link href={href} prefetch={false} className="block transition hover:text-slate-700">
          <span className="gv-hi-card-identity block truncate">{displayIdentity.base_name}</span>
          {identitySubtitle ? (
            <span className="gv-hi-metadata block truncate text-xs font-medium">{identitySubtitle}</span>
          ) : null}
        </Link>
      }
      subtitle={
        <>
          <span className="block truncate">{setLabel}</span>
          <PromotionTransitionNote state={card.promotion_transition} className="mt-1" />
        </>
      }
      badges={
        <>
          {primaryFinishLabel ? (
            <VariantBadge key={`${card.gv_id}-${primaryFinishLabel}`} label={primaryFinishLabel} tone="selected" />
          ) : null}
          {secondaryVariantLabels.map((label) => (
            <VariantBadge key={`${card.gv_id}-${label}`} label={label} />
          ))}
          {searchDiscriminator ? (
            <VariantBadge
              key={`${card.gv_id}-${searchDiscriminator}`}
              label={searchDiscriminator}
              tone={getSearchContextBadgeTone(searchDiscriminator)}
            />
          ) : null}
        </>
      }
      meta={<span>{metaLine}</span>}
      summary={canViewPricing ? <VisiblePrice value={card.raw_price} size="grid" className="gv-hi-price" /> : <LockedPrice size="grid" className="gv-hi-price" />}
      imageClassName={isLarge ? "max-w-[280px]" : undefined}
    />
  );
}
