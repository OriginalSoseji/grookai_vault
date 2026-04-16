import Link from "next/link";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import CompareCardButton from "@/components/compare/CompareCardButton";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
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

type ExploreCardGridItemProps = {
  card: ExploreResultCard;
  href: string;
  mode: "thumb" | "thumb-lg";
  canViewPricing: boolean;
};

export default function ExploreCardGridItem({ card, href, mode, canViewPricing }: ExploreCardGridItemProps) {
  const displayIdentity = resolveDisplayIdentity(card);
  const setLabel = card.set_name ?? "Unknown set";
  const identitySubtitle = resolveDisplayIdentitySubtitleForContext({
    identitySubtitle: displayIdentity.suffix,
    visibleSetLabel: setLabel,
  });
  const variantLabels = getVariantLabels(card, 2);
  const imagePresentation = resolveCardImagePresentation(card);
  const isLarge = mode === "thumb-lg";
  const density = isLarge ? "large" : "default";
  const metaLine = [card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ") || "—";

  return (
    <PokemonCardGridTile
      density={density}
      utility={<CompareCardButton gvId={card.gv_id} variant="compact" />}
      imageSrc={card.display_image_url ?? card.image_url}
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
          <span className="block truncate">{displayIdentity.base_name}</span>
          {identitySubtitle ? (
            <span className="block truncate text-xs font-medium text-slate-500">{identitySubtitle}</span>
          ) : null}
        </Link>
      }
      subtitle={<span className="block truncate">{setLabel}</span>}
      badges={
        <>
          {variantLabels.map((label) => (
            <VariantBadge key={`${card.gv_id}-${label}`} label={label} />
          ))}
        </>
      }
      meta={<span>{metaLine}</span>}
      summary={canViewPricing ? <VisiblePrice value={card.raw_price} size="grid" /> : <LockedPrice size="grid" />}
      footer={<span>GV-ID: {card.gv_id}</span>}
      imageClassName={isLarge ? "max-w-[280px]" : undefined}
    />
  );
}
