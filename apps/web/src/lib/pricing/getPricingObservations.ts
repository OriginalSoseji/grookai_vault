import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

export type PricingObservation = {
  id: string;
  card_print_id: string | null;
  source: string;
  external_id: string;
  listing_url: string | null;
  title: string | null;
  price: number;
  shipping: number;
  currency: string;
  condition_raw: string | null;
  listing_type: string | null;
  match_confidence: number | null;
  mapping_status: "mapped" | "unmapped" | "ambiguous";
  classification: "accepted" | "rejected" | "staged";
  condition_bucket: "nm" | "lp" | "mp" | "hp" | "dmg" | null;
  exclusion_reason: string | null;
  observed_at: string;
  created_at: string;
};

type PricingObservationRow = {
  id: string;
  card_print_id: string | null;
  source: string;
  external_id: string;
  listing_url: string | null;
  title: string | null;
  price: number | string | null;
  shipping: number | string | null;
  currency: string | null;
  condition_raw: string | null;
  listing_type: string | null;
  match_confidence: number | null;
  mapping_status: PricingObservation["mapping_status"];
  classification: PricingObservation["classification"];
  condition_bucket: PricingObservation["condition_bucket"];
  exclusion_reason: string | null;
  observed_at: string | null;
  created_at: string | null;
};

function toNumber(value: number | string | null, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeObservationRow(row: PricingObservationRow): PricingObservation | null {
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const source = typeof row.source === "string" ? row.source.trim() : "";
  const externalId = typeof row.external_id === "string" ? row.external_id.trim() : "";
  const observedAt = typeof row.observed_at === "string" ? row.observed_at : "";
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";

  if (!id || !source || !externalId || !observedAt || !createdAt) {
    return null;
  }

  return {
    id,
    card_print_id: typeof row.card_print_id === "string" && row.card_print_id.trim().length > 0 ? row.card_print_id : null,
    source,
    external_id: externalId,
    listing_url: typeof row.listing_url === "string" && row.listing_url.trim().length > 0 ? row.listing_url : null,
    title: typeof row.title === "string" && row.title.trim().length > 0 ? row.title : null,
    price: toNumber(row.price, 0),
    shipping: toNumber(row.shipping, 0),
    currency: typeof row.currency === "string" && row.currency.trim().length > 0 ? row.currency : "USD",
    condition_raw: typeof row.condition_raw === "string" && row.condition_raw.trim().length > 0 ? row.condition_raw : null,
    listing_type: typeof row.listing_type === "string" && row.listing_type.trim().length > 0 ? row.listing_type : null,
    match_confidence: typeof row.match_confidence === "number" ? row.match_confidence : null,
    mapping_status: row.mapping_status,
    classification: row.classification,
    condition_bucket: row.condition_bucket ?? null,
    exclusion_reason:
      typeof row.exclusion_reason === "string" && row.exclusion_reason.trim().length > 0 ? row.exclusion_reason : null,
    observed_at: observedAt,
    created_at: createdAt,
  };
}

export async function getPricingObservations(cardPrintId: string): Promise<PricingObservation[]> {
  const normalizedCardPrintId = cardPrintId.trim();
  if (!normalizedCardPrintId) {
    return [];
  }

  const admin = createServerAdminClient();
  const { data, error } = await admin
    .from("pricing_observations")
    .select(
      "id,card_print_id,source,external_id,listing_url,title,price,shipping,currency,condition_raw,listing_type,match_confidence,mapping_status,classification,condition_bucket,exclusion_reason,observed_at,created_at",
    )
    .eq("card_print_id", normalizedCardPrintId)
    .order("observed_at", { ascending: false });

  if (error) {
    throw new Error(
      `[pricing.observations] query failed: ${error.message}${error.code ? ` | code=${error.code}` : ""}`,
    );
  }

  return ((data ?? []) as PricingObservationRow[])
    .map(normalizeObservationRow)
    .filter((row): row is PricingObservation => row !== null);
}
