import Link from "next/link";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import CompareCardButton from "@/components/compare/CompareCardButton";
import ExploreResultActions from "@/components/explore/ExploreResultActions";
import ExploreResultEvidence from "@/components/explore/ExploreResultEvidence";
import PublicCardImage from "@/components/PublicCardImage";
import PromotionTransitionNote from "@/components/provisional/PromotionTransitionNote";
import VariantBadge from "@/components/cards/VariantBadge";
import LockedPrice from "@/components/pricing/LockedPrice";
import VisiblePrice from "@/components/pricing/VisiblePrice";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import { getCardImageAltText, resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import {
  resolveDisplayIdentity,
  resolveDisplayIdentitySubtitleForContext,
} from "@/lib/cards/resolveDisplayIdentity";
import { getVariantLabels } from "@/lib/cards/variantPresentation";
import { getSecondaryBadgeLabels } from "@/components/explore/dedupeBadgeLabels";
import { getSearchContextLabel } from "@/components/explore/searchContextLabel";
import { getSearchContextBadgeTone } from "@/components/explore/searchContextPresentation";

type ExploreCardListItemProps = {
  card: ExploreResultCard;
  href: string;
  canViewPricing: boolean;
  signInHref?: string;
  matchReason?: string;
};

function getPrimaryFinishLabel(card: ExploreResultCard) {
  return card.finish_label?.trim() || card.display_discriminator?.trim() || "";
}

export default function ExploreCardListItem({ card, href, canViewPricing, signInHref, matchReason }: ExploreCardListItemProps) {
  const displayIdentity = resolveDisplayIdentity(card);
  const setLabel = [card.set_name, card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ") || "—";
  const identitySubtitle = resolveDisplayIdentitySubtitleForContext({
    identitySubtitle: displayIdentity.suffix,
    visibleSetLabel: setLabel,
  });
  const variantLabels = getVariantLabels(card, 2);
  const searchDiscriminator = getSearchContextLabel(card);
  const imagePresentation = resolveCardImagePresentation(card);
  const primaryFinishLabel = getPrimaryFinishLabel(card);
  const secondaryVariantLabels = getSecondaryBadgeLabels(variantLabels, [
    primaryFinishLabel,
    searchDiscriminator ?? undefined,
  ]);

  return (
    <li className="gv-search-result-row">
      <div className="gv-search-result-row-layout">
        <Link href={href} prefetch={false} className="gv-search-result-row-image">
          <PublicCardImage
            src={card.display_image_url ?? card.image_url}
            fallbackSrc={card.display_image_fallback_url}
            fallbackSources={[card.external_image_fallback_url]}
            alt={getCardImageAltText(displayIdentity.display_name, card)}
            imageClassName="aspect-[5/7] w-full rounded-[14px] object-contain"
            fallbackClassName="flex aspect-[5/7] w-full items-center justify-center rounded-[14px] bg-slate-100 px-2 text-center text-[11px] text-slate-500 ring-1 ring-inset ring-slate-200 dark:bg-white/[0.04] dark:text-slate-500 dark:ring-white/[0.06]"
            sizes="(max-width: 640px) 92px, 108px"
          />
        </Link>

        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <Link href={href} prefetch={false} className="gv-hi-card-identity block text-lg leading-tight hover:underline">
              {displayIdentity.base_name}
            </Link>
            {displayIdentity.printed_name ? (
              <p className="gv-hi-metadata truncate text-sm font-medium">{displayIdentity.printed_name}</p>
            ) : null}
            {identitySubtitle ? (
              <p className="gv-hi-metadata truncate text-sm font-medium">{identitySubtitle}</p>
            ) : null}
            <p className="text-sm text-slate-600 dark:text-slate-400">{setLabel}</p>
            <PromotionTransitionNote state={card.promotion_transition} />
          </div>

          {imagePresentation.compactBadgeLabel ? (
            <CardImageTruthBadge
              label={imagePresentation.compactBadgeLabel}
              note={imagePresentation.detailNote}
              emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
            />
          ) : null}

          {primaryFinishLabel || variantLabels.length > 0 || searchDiscriminator ? (
            <div className="flex flex-wrap gap-1.5">
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
            </div>
          ) : null}

          <ExploreResultEvidence
            card={card}
            matchReason={matchReason}
            searchContext={searchDiscriminator}
            compact
          />
        </div>

        <div className="gv-search-result-row-commercial">
          <div className="text-left sm:text-right">
            {canViewPricing ? (
              <VisiblePrice
                value={card.raw_price}
                size="list"
                className="gv-hi-price"
                cardPrintId={card.id}
                observedAt={card.raw_price_ts}
                publishedAt={card.raw_price_published_at}
                provenanceId={card.pricing_provenance_id}
                sourceLabel={card.pricing_source_label}
                pricingScope={card.pricing_scope}
                isFromPrice={card.pricing_is_from_price}
              />
            ) : (
              <LockedPrice href={signInHref} size="list" className="gv-hi-price" />
            )}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
            <div className="min-w-0 flex-1 sm:flex-none">
              <ExploreResultActions
                cardHref={href}
                cardName={displayIdentity.display_name}
                compact
              />
            </div>
            <CompareCardButton gvId={card.gv_id} variant="floating" />
          </div>
        </div>
      </div>
    </li>
  );
}
