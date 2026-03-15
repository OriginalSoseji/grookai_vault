import Link from "next/link";
import CompareCardButton from "@/components/compare/CompareCardButton";
import PublicCardImage from "@/components/PublicCardImage";
import VariantBadge from "@/components/cards/VariantBadge";
import LockedPrice from "@/components/pricing/LockedPrice";
import VisiblePrice from "@/components/pricing/VisiblePrice";
import { getVariantLabels } from "@/lib/cards/variantPresentation";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";

type ExploreCardGridItemProps = {
  card: ExploreResultCard;
  href: string;
  mode: "thumb" | "thumb-lg";
  canViewPricing: boolean;
};

export default function ExploreCardGridItem({ card, href, mode, canViewPricing }: ExploreCardGridItemProps) {
  const variantLabels = getVariantLabels(card, 2);
  const isLarge = mode === "thumb-lg";

  return (
    <article
      className={`card-hover group rounded-[18px] border border-slate-200 bg-white shadow-sm ${
        isLarge ? "overflow-hidden p-5" : "overflow-hidden p-4"
      }`}
    >
      <div className="mb-3 flex items-center justify-end">
        <CompareCardButton gvId={card.gv_id} variant="compact" />
      </div>
      <Link href={href} className="block">
        <div className={`flex items-center justify-center rounded-[14px] border border-slate-100 bg-slate-50 ${isLarge ? "p-5" : "p-4"}`}>
          <PublicCardImage
            src={card.image_url}
            alt={card.name}
            imageClassName={`aspect-[3/4] w-full rounded-[12px] object-contain transition duration-150 group-hover:scale-[1.02] ${
              isLarge ? "max-w-[280px]" : ""
            }`}
            fallbackClassName="flex aspect-[3/4] items-center justify-center rounded-[12px] bg-slate-100 px-4 text-center text-sm text-slate-500"
          />
        </div>
        <div className={`space-y-2 ${isLarge ? "mt-4" : "mt-3"}`}>
          <div className="space-y-1">
            <p className={`${isLarge ? "text-base" : "text-[15px]"} truncate font-semibold text-slate-950`}>{card.name}</p>
            <p className="truncate text-sm text-slate-600">{card.set_name ?? "Unknown set"}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {variantLabels.map((label) => (
              <VariantBadge key={`${card.gv_id}-${label}`} label={label} />
            ))}
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                {[card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ") || "—"}
              </p>
              {canViewPricing ? (
                <VisiblePrice value={card.latest_price} size="grid" />
              ) : (
                <LockedPrice size="grid" />
              )}
            </div>
            <p className="text-[11px] text-slate-400">GV-ID: {card.gv_id}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}
