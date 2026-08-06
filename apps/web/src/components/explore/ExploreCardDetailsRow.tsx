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

type ExploreCardDetailsRowProps = {
  card: ExploreResultCard;
  href: string;
  canViewPricing: boolean;
  signInHref?: string;
  matchReason?: string;
};

function getPrimaryFinishLabel(card: ExploreResultCard) {
  return card.finish_label?.trim() || card.display_discriminator?.trim() || "";
}

export default function ExploreCardDetailsRow({ card, href, canViewPricing, signInHref, matchReason }: ExploreCardDetailsRowProps) {
  const displayIdentity = resolveDisplayIdentity(card);
  const setLabel = card.set_name ?? "Unknown set";
  const identitySubtitle = resolveDisplayIdentitySubtitleForContext({
    identitySubtitle: displayIdentity.suffix,
    visibleSetLabel: setLabel,
  });
  const variantLabels = getVariantLabels(card, 3);
  const searchDiscriminator = getSearchContextLabel(card);
  const imagePresentation = resolveCardImagePresentation(card);
  const primaryFinishLabel = getPrimaryFinishLabel(card);
  const secondaryVariantLabels = getSecondaryBadgeLabels(variantLabels, [
    primaryFinishLabel,
    searchDiscriminator ?? undefined,
  ]);

  return (
    <tr className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/80">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <PublicCardImage
            src={card.display_image_url ?? card.image_url}
            fallbackSrc={card.display_image_fallback_url}
            fallbackSources={[card.external_image_fallback_url]}
            alt={getCardImageAltText(displayIdentity.display_name, card)}
            imageClassName="h-14 w-10 rounded-lg border border-slate-200 bg-slate-50 object-contain p-1"
            fallbackClassName="flex h-14 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
          />
          <div className="min-w-0">
            <Link href={href} prefetch={false} className="block text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100">
              <span className="gv-hi-card-identity block truncate">{displayIdentity.base_name}</span>
              {displayIdentity.printed_name ? (
                <span className="gv-hi-metadata block truncate text-xs font-medium">{displayIdentity.printed_name}</span>
              ) : null}
              {identitySubtitle ? (
                <span className="gv-hi-metadata block truncate text-xs font-medium">{identitySubtitle}</span>
              ) : null}
            </Link>
            <ExploreResultEvidence
              card={card}
              matchReason={matchReason}
              searchContext={searchDiscriminator}
              compact
            />
            <PromotionTransitionNote state={card.promotion_transition} className="mt-1" />
            {imagePresentation.compactBadgeLabel ? (
              <div className="mt-1">
                <CardImageTruthBadge
                  label={imagePresentation.compactBadgeLabel}
                  note={imagePresentation.detailNote}
                  emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
                />
              </div>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{setLabel}</td>
      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{card.number ? `#${card.number}` : "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{card.rarity ?? "—"}</td>
      <td className="px-4 py-3">
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
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {canViewPricing ? (
          <VisiblePrice
            value={card.raw_price}
            size="dense"
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
          <LockedPrice href={signInHref} size="dense" className="gv-hi-price" />
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-2">
          <ExploreResultActions
            cardHref={href}
            cardName={displayIdentity.display_name}
            compact
          />
          <CompareCardButton gvId={card.gv_id} variant="compact" />
        </div>
      </td>
    </tr>
  );
}
