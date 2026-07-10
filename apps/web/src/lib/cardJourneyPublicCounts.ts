import "server-only";

import { createPublicServerClient } from "@/lib/supabase/publicServer";

export type PublicCardJourneyCounts = Readonly<{
  cardPrintId: string;
  publicOwnerCount: number;
  publicTradeCount: number;
  publicSaleCount: number;
  publicWantCount: number;
  hasPublicActivity: boolean;
}>;

type PublicCardJourneyCountsRow = {
  card_print_id: string | null;
  public_owner_count: number | string | null;
  public_trade_count: number | string | null;
  public_sale_count: number | string | null;
  public_want_count: number | string | null;
  has_public_activity: boolean | null;
};

function toCount(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function firstRow(data: unknown): PublicCardJourneyCountsRow | null {
  if (Array.isArray(data)) {
    return (data[0] as PublicCardJourneyCountsRow | undefined) ?? null;
  }

  return (data as PublicCardJourneyCountsRow | null) ?? null;
}

export async function getPublicCardJourneyCounts(cardPrintId: string): Promise<PublicCardJourneyCounts | null> {
  const normalizedCardPrintId = cardPrintId.trim();
  if (!normalizedCardPrintId) {
    return null;
  }

  const client = createPublicServerClient(60);
  const { data, error } = await client.rpc("card_journey_public_counts_v1", {
    p_card_print_id: normalizedCardPrintId,
  });

  if (error) {
    console.error("[card-journey:public-counts] read failed", {
      cardPrintId: normalizedCardPrintId,
      error,
    });
    return null;
  }

  const row = firstRow(data);
  if (!row?.card_print_id) {
    return null;
  }

  const publicOwnerCount = toCount(row.public_owner_count);
  const publicTradeCount = toCount(row.public_trade_count);
  const publicSaleCount = toCount(row.public_sale_count);
  const publicWantCount = toCount(row.public_want_count);

  return {
    cardPrintId: row.card_print_id,
    publicOwnerCount,
    publicTradeCount,
    publicSaleCount,
    publicWantCount,
    hasPublicActivity:
      Boolean(row.has_public_activity) ||
      publicOwnerCount > 0 ||
      publicTradeCount > 0 ||
      publicSaleCount > 0 ||
      publicWantCount > 0,
  };
}

export function formatPublicJourneyCountsLine(counts: PublicCardJourneyCounts | null | undefined) {
  if (!counts?.hasPublicActivity) {
    return null;
  }

  const segments: string[] = [];
  if (counts.publicOwnerCount > 0) {
    segments.push(
      `${counts.publicOwnerCount} ${counts.publicOwnerCount === 1 ? "collector" : "collectors"}`,
    );
  }
  if (counts.publicTradeCount > 0) {
    segments.push(`${counts.publicTradeCount} for trade`);
  }
  if (counts.publicSaleCount > 0) {
    segments.push(`${counts.publicSaleCount} for sale`);
  }
  if (counts.publicWantCount > 0) {
    segments.push(
      counts.publicWantCount === 1
        ? "1 collector wants a copy"
        : `${counts.publicWantCount} want a copy`,
    );
  }

  return segments.length > 0 ? `${segments.join(" · ")} on Grookai` : null;
}
