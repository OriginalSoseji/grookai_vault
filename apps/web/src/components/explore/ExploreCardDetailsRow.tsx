import Link from "next/link";
import CompareCardButton from "@/components/compare/CompareCardButton";
import PublicCardImage from "@/components/PublicCardImage";
import VariantBadge from "@/components/cards/VariantBadge";
import LockedPrice from "@/components/pricing/LockedPrice";
import VisiblePrice from "@/components/pricing/VisiblePrice";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { getVariantLabels } from "@/lib/cards/variantPresentation";

type ExploreCardDetailsRowProps = {
  card: ExploreResultCard;
  href: string;
  canViewPricing: boolean;
  signInHref?: string;
};

export default function ExploreCardDetailsRow({ card, href, canViewPricing, signInHref }: ExploreCardDetailsRowProps) {
  const displayIdentity = resolveDisplayIdentity(card);
  const variantLabels = getVariantLabels(card, 3);

  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <PublicCardImage
            src={card.image_url}
            alt={displayIdentity.display_name}
            imageClassName="h-14 w-10 rounded-lg border border-slate-200 bg-slate-50 object-contain p-1"
            fallbackClassName="flex h-14 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
          />
          <div className="min-w-0">
            <Link href={href} className="block text-sm font-semibold text-slate-900 hover:underline">
              <span className="block truncate">{displayIdentity.base_name}</span>
              {displayIdentity.suffix ? (
                <span className="block truncate text-xs font-medium text-slate-500">{displayIdentity.suffix}</span>
              ) : null}
            </Link>
            <p className="truncate text-[11px] tracking-[0.08em] text-slate-500">{card.gv_id}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700">{card.set_name ?? "Unknown set"}</td>
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
