import VisiblePrice from "@/components/pricing/VisiblePrice";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";

export function PublicWallCardVisiblePrice({
  card,
}: {
  card: PublicWallCard;
}) {
  if (typeof card.raw_price !== "number") {
    return null;
  }

  return (
    <VisiblePrice
      value={card.raw_price}
      size="dense"
      cardPrintId={card.card_print_id}
      observedAt={card.raw_price_ts}
      publishedAt={card.raw_price_published_at}
      provenanceId={card.pricing_provenance_id}
      sourceLabel={card.pricing_source_label}
      pricingScope={card.pricing_scope}
      isFromPrice={card.pricing_is_from_price}
    />
  );
}
