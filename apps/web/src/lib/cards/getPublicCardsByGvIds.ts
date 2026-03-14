import "server-only";

import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { createServerComponentClient } from "@/lib/supabase/server";
import { normalizeCompareCardsParam } from "@/lib/compareCards";
import type { VariantFlags } from "@/lib/cards/variantPresentation";

export type ComparePublicCard = {
  id: string;
  gv_id: string;
  name: string;
  set_name?: string;
  set_code?: string;
  number: string;
  rarity?: string;
  release_year?: number;
  artist?: string;
  image_url?: string;
  latest_price?: number;
  variant_key?: string;
  variants?: VariantFlags;
};

type PublicCompareCardRow = {
  id: string | null;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  rarity: string | null;
  artist: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  variant_key: string | null;
  variants: VariantFlags;
  sets:
    | {
        name: string | null;
        release_date: string | null;
      }
    | {
        name: string | null;
        release_date: string | null;
      }[]
    | null;
};

type PublicComparePriceRow = {
  id: string | null;
  latest_price: number | null;
};

function getReleaseYear(releaseDate?: string | null) {
  if (!releaseDate) {
    return undefined;
  }

  const match = releaseDate.match(/^(\d{4})/);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function getPublicCardsByGvIds(gvIds: string[]) {
  const normalizedIds = normalizeCompareCardsParam(gvIds);
  if (normalizedIds.length === 0) {
    return [] as ComparePublicCard[];
  }

  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from("card_prints")
    .select(
      `
        gv_id,
        name,
        set_code,
        number,
        rarity,
        artist,
        variant_key,
        variants,
        image_url,
        image_alt_url,
        id,
        sets(name,release_date)
      `,
    )
    .in("gv_id", normalizedIds);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as PublicCompareCardRow[];
  const cardIds = rows.map((row) => row.id).filter((value): value is string => Boolean(value));
  const { data: priceData, error: priceError } = cardIds.length > 0
    ? await supabase.from("v_card_search").select("id,latest_price").in("id", cardIds)
    : { data: [], error: null };

  if (priceError) {
    throw priceError;
  }

  const rowsByGvId = new Map(
    rows
      .filter((row): row is PublicCompareCardRow & { gv_id: string } => Boolean(row.gv_id))
      .map((row) => [row.gv_id, row]),
  );
  const pricesByCardId = new Map(
    ((priceData ?? []) as PublicComparePriceRow[])
      .filter((row): row is PublicComparePriceRow & { id: string } => Boolean(row.id))
      .map((row) => [row.id, row.latest_price]),
  );

  const cards: ComparePublicCard[] = [];

  for (const gvId of normalizedIds) {
    const row = rowsByGvId.get(gvId);
    if (!row) {
      continue;
    }

    const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;

    cards.push({
      id: row.id ?? row.gv_id,
      gv_id: row.gv_id,
      name: row.name?.trim() || "Unknown",
      set_name: setRecord?.name?.trim() || undefined,
      set_code: row.set_code?.trim() || undefined,
      number: row.number?.trim() || "",
      rarity: row.rarity?.trim() || undefined,
      release_year: getReleaseYear(setRecord?.release_date),
      artist: row.artist?.trim() || undefined,
      image_url: getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
      latest_price: row.id ? pricesByCardId.get(row.id) ?? undefined : undefined,
      variant_key: row.variant_key?.trim() || undefined,
      variants: row.variants ?? undefined,
    });
  }

  return cards;
}
