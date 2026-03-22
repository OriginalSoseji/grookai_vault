import Link from "next/link";
import CompareCardButton from "@/components/compare/CompareCardButton";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
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
  const density = isLarge ? "large" : "default";
  const metaLine = [card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ") || "—";

  return (
    <PokemonCardGridTile
      density={density}
      utility={<CompareCardButton gvId={card.gv_id} variant="compact" />}
      imageSrc={card.image_url}
      imageAlt={card.name}
      imageHref={href}
      title={
        <Link href={href} className="block truncate transition hover:text-slate-700">
          {card.name}
        </Link>
      }
      subtitle={<span className="block truncate">{card.set_name ?? "Unknown set"}</span>}
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
