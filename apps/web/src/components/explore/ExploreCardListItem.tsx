import Link from "next/link";
import CompareCardButton from "@/components/compare/CompareCardButton";
import PublicCardImage from "@/components/PublicCardImage";
import VariantBadge from "@/components/cards/VariantBadge";
import LockedPrice from "@/components/pricing/LockedPrice";
import VisiblePrice from "@/components/pricing/VisiblePrice";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import {
  resolveDisplayIdentity,
  resolveDisplayIdentitySubtitleForContext,
} from "@/lib/cards/resolveDisplayIdentity";
import { getVariantLabels } from "@/lib/cards/variantPresentation";

type ExploreCardListItemProps = {
  card: ExploreResultCard;
  href: string;
  canViewPricing: boolean;
  signInHref?: string;
};

export default function ExploreCardListItem({ card, href, canViewPricing, signInHref }: ExploreCardListItemProps) {
  const displayIdentity = resolveDisplayIdentity(card);
  const setLabel = [card.set_name, card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ") || "—";
  const identitySubtitle = resolveDisplayIdentitySubtitleForContext({
    identitySubtitle: displayIdentity.suffix,
    visibleSetLabel: setLabel,
  });
  const variantLabels = getVariantLabels(card, 2);

  return (
    <li className="rounded-[16px] border border-slate-200 bg-white px-4 py-4 shadow-sm transition-all duration-150 hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <Link href={href} className="flex min-w-0 flex-1 items-start gap-4">
          <PublicCardImage
            src={card.image_url}
            alt={displayIdentity.display_name}
            imageClassName="h-28 w-20 rounded-xl border border-slate-200 bg-slate-50 object-contain p-1"
            fallbackClassName="flex h-28 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-2 text-center text-[11px] text-slate-500"
          />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-4 pt-1">
            <div className="min-w-0 space-y-2">
              <div className="space-y-1">
                <span className="block truncate text-lg font-medium text-slate-950 hover:underline">
                  {displayIdentity.base_name}
                </span>
                {identitySubtitle ? (
                  <span className="block truncate text-sm font-medium text-slate-500">{identitySubtitle}</span>
                ) : null}
                <p className="text-sm text-slate-600">{setLabel}</p>
              </div>
              {variantLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {variantLabels.map((label) => (
                    <VariantBadge key={`${card.gv_id}-${label}`} label={label} />
                  ))}
                </div>
              ) : null}
              <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{card.gv_id}</p>
            </div>
            <div className="hidden shrink-0 text-right md:block">
              {canViewPricing ? (
                <VisiblePrice value={card.raw_price} size="list" />
              ) : (
                <LockedPrice href={signInHref} size="list" />
              )}
            </div>
          </div>
        </Link>
        <div className="flex flex-col items-end gap-3">
          <CompareCardButton gvId={card.gv_id} variant="compact" />
          <div className="md:hidden">
            {canViewPricing ? (
              <VisiblePrice value={card.raw_price} size="dense" />
            ) : (
              <LockedPrice href={signInHref} size="dense" />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
