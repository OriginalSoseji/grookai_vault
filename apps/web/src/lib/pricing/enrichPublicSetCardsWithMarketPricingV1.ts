import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicSetCard } from "@/lib/publicSets.shared";
import {
  getMarketPricingReadModelV1,
  indexExactMarketPricingByCardPrintingId,
} from "@/lib/pricing/marketPricingReadModelV1";

type PricingClient = Pick<SupabaseClient, "rpc">;

export async function enrichPublicSetCardsWithMarketPricingV1(
  client: PricingClient,
  cards: PublicSetCard[],
): Promise<PublicSetCard[]> {
  const cardPrintingIds = cards.flatMap((card) =>
    (card.printings ?? [])
      .map((printing) => printing.id?.trim() ?? "")
      .filter(Boolean),
  );
  if (cardPrintingIds.length === 0) {
    return cards;
  }

  const records = await getMarketPricingReadModelV1(client, {
    cardPrintingIds,
  });
  const pricingByPrintingId =
    indexExactMarketPricingByCardPrintingId(records);

  return cards.map((card) => ({
    ...card,
    printings: card.printings?.map((printing) => {
      const printingId = printing.id?.trim() ?? "";
      const pricing = printingId
        ? pricingByPrintingId.get(printingId)
        : undefined;
      if (!pricing) {
        return printing;
      }

      return {
        ...printing,
        pricing: {
          pricing_scope: "card_printing" as const,
          market_close: pricing.market_close,
          currency: "USD" as const,
          source_label: pricing.source_label,
          observed_at: pricing.observed_at,
          published_at: pricing.published_at,
          provenance_id: pricing.provenance_id,
          is_from_price: false as const,
        },
      };
    }),
  }));
}
