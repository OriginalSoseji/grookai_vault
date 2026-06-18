import "server-only";

import generated from "./variantOriginPublicCopy.generated.json";

type VariantOriginFamily = {
  family_key: string;
  family_label: string;
  variant_category: string;
  confidence: string;
  why_it_exists: string;
  why_collectors_care: string;
  how_to_identify: string;
  grookai_rule: string;
  source_urls: string[];
};

type VariantOriginRowRef = {
  card_print_id: string;
  gv_id: string;
  origin_family_key: string;
  variant_key: string | null;
  printed_identity_modifier: string | null;
};

export type VariantOriginPublicCopy = VariantOriginRowRef & VariantOriginFamily;

type GeneratedVariantOriginData = {
  families: Record<string, VariantOriginFamily>;
  by_gv_id: Record<string, VariantOriginRowRef>;
  by_card_print_id: Record<string, VariantOriginRowRef>;
};

const data = generated as GeneratedVariantOriginData;

function normalizeGvId(value?: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

export function getVariantOriginPublicCopy({
  cardPrintId,
  gvId,
}: {
  cardPrintId?: string | null;
  gvId?: string | null;
}): VariantOriginPublicCopy | null {
  const row =
    (cardPrintId ? data.by_card_print_id[cardPrintId] : undefined) ??
    data.by_gv_id[normalizeGvId(gvId)];
  if (!row) return null;

  const family = data.families[row.origin_family_key];
  if (!family) return null;

  return {
    ...row,
    ...family,
  };
}
