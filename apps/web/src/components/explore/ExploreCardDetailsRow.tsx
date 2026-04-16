import Link from "next/link";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import CompareCardButton from "@/components/compare/CompareCardButton";
import PublicCardImage from "@/components/PublicCardImage";
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

type ExploreCardDetailsRowProps = {
  card: ExploreResultCard;
  href: string;
  canViewPricing: boolean;
  signInHref?: string;
};

export default function ExploreCardDetailsRow({ card, href, canViewPricing, signInHref }: ExploreCardDetailsRowProps) {
  const displayIdentity = resolveDisplayIdentity(card);
  const setLabel = card.set_name ?? "Unknown set";
  const identitySubtitle = resolveDisplayIdentitySubtitleForContext({
    identitySubtitle: displayIdentity.suffix,
    visibleSetLabel: setLabel,
  });
  const variantLabels = getVariantLabels(card, 3);
  const imagePresentation = resolveCardImagePresentation(card);

  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <PublicCardImage
            src={card.display_image_url ?? card.image_url}
            alt={getCardImageAltText(displayIdentity.display_name, card)}
            imageClassName="h-14 w-10 rounded-lg border border-slate-200 bg-slate-50 object-contain p-1"
            fallbackClassName="flex h-14 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
          />
          <div className="min-w-0">
            <Link href={href} className="block text-sm font-semibold text-slate-900 hover:underline">
              <span className="block truncate">{displayIdentity.base_name}</span>
              {identitySubtitle ? (
                <span className="block truncate text-xs font-medium text-slate-500">{identitySubtitle}</span>
              ) : null}
            </Link>
            <p className="truncate text-[11px] tracking-[0.08em] text-slate-500">{card.gv_id}</p>
            {imagePresentation.compactBadgeLabel ? (
              <div className="mt-1">
                <CardImageTruthBadge
                  label={imagePresentation.compactBadgeLabel}
                  emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
                />
              </div>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700">{setLabel}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{card.number ? `#${card.number}` : "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{card.rarity ?? "—"}</td>
      <td className="px-4 py-3">
        {variantLabels.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {variantLabels.map((label) => (
              <VariantBadge key={`${card.gv_id}-${label}`} label={label} />
            ))}
          </div>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {canViewPricing ? (
          <VisiblePrice value={card.raw_price} size="dense" />
        ) : (
          <LockedPrice href={signInHref} size="dense" />
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <CompareCardButton gvId={card.gv_id} variant="compact" />
      </td>
    </tr>
  );
}
