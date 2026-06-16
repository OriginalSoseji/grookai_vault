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
import { getSearchContextBadgeTone, getSearchContextClassName } from "@/components/explore/searchContextPresentation";

type ExploreCardGridItemProps = {
  card: ExploreResultCard;
  href: string;
  mode: "thumb" | "thumb-lg";
  canViewPricing: boolean;
  matchReason?: string;
};

export default function ExploreCardGridItem({ card, href, mode, canViewPricing, matchReason }: ExploreCardGridItemProps) {
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
  const metaLine = [card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ") || "—";

  return (
    <PokemonCardGridTile
      density={density}
      utility={<CompareCardButton gvId={card.gv_id} variant="compact" />}
      imageSrc={card.display_image_url ?? card.image_url}
      imageFallbackSrc={card.display_image_fallback_url}
      imageAlt={getCardImageAltText(displayIdentity.display_name, card)}
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
        <Link href={href} className="block transition hover:text-slate-700">
          <span className="gv-hi-card-identity block truncate">{displayIdentity.base_name}</span>
          {identitySubtitle ? (
            <span className="gv-hi-metadata block truncate text-xs font-medium">{identitySubtitle}</span>
          ) : null}
          {searchDiscriminator ? (
            <span className={getSearchContextClassName(searchDiscriminator)}>{searchDiscriminator}</span>
          ) : null}
          {matchReason ? (
            <span className="gv-hi-search-context block truncate text-[11px] font-medium text-slate-500">{matchReason}</span>
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
          {variantLabels.map((label) => (
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
      footer={<span className="gv-hi-diagnostics">{card.printing_gv_id ? `Printing ID: ${card.printing_gv_id}` : `GV-ID: ${card.gv_id}`}</span>}
      imageClassName={isLarge ? "max-w-[280px]" : undefined}
    />
  );
}
