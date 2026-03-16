import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import type { VariantFlags } from "@/lib/cards/variantPresentation";
import type { CardDetail, CardPrinting } from "@/types/cards";

type PublicCardRow = {
  id: string | null;
  gv_id: string | null;
  name: string | null;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  artist: string | null;
  set_code: string | null;
  variant_key: string | null;
  variants: VariantFlags;
  card_printings?:
    | {
        id: string | null;
        finish_key: string | null;
        finish_keys:
          | { label: string | null; sort_order: number | null }
          | { label: string | null; sort_order: number | null }[]
          | null;
      }[]
    | null;
  sets?:
    | { name: string | null; printed_total: number | null; release_date: string | null }
    | { name: string | null; printed_total: number | null; release_date: string | null }[]
    | null;
};

type PublicCardPriceRow = {
  card_print_id: string | null;
  grookai_value_nm: number | null;
  confidence: number | null;
  listing_count: number | null;
};

type ActivePriceMetadataRow = {
  card_print_id: string | null;
  updated_at: string | null;
};

type StaticParamRow = {
  gv_id: string | null;
};

type SetRow = {
  name: string | null;
  printed_total: number | null;
  release_date: string | null;
};

function getReleaseYear(releaseDate?: string | null) {
  if (!releaseDate) {
    return undefined;
  }

  const match = releaseDate.match(/^(\d{4})/);
  if (!match) {
    return undefined;
  }

  const parsedYear = Number(match[1]);
  return Number.isFinite(parsedYear) ? parsedYear : undefined;
}

function mapCardPrintings(rows?: PublicCardRow["card_printings"]): CardPrinting[] | undefined {
  const mapped = (rows ?? [])
    .map((printing) => {
      const finishRecord = Array.isArray(printing.finish_keys) ? printing.finish_keys[0] : printing.finish_keys;

      return {
        id: printing.id ?? "",
        finish_key: printing.finish_key?.trim() || undefined,
        finish_name: finishRecord?.label?.trim() || printing.finish_key?.trim() || undefined,
        finish_sort_order: typeof finishRecord?.sort_order === "number" ? finishRecord.sort_order : undefined,
      } satisfies CardPrinting;
    })
    .filter((printing) => Boolean(printing.id) && Boolean(printing.finish_name));

  if (mapped.length === 0) {
    return undefined;
  }

  mapped.sort((left, right) => {
    const leftSort = left.finish_sort_order ?? Number.MAX_SAFE_INTEGER;
    const rightSort = right.finish_sort_order ?? Number.MAX_SAFE_INTEGER;

    if (leftSort !== rightSort) {
      return leftSort - rightSort;
    }

    return (left.finish_name ?? "").localeCompare(right.finish_name ?? "");
  });

  return mapped;
}

function createServerSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, key);
}

const getSetDetailsByCode = cache(async (setCode?: string | null) => {
  if (!setCode) {
    return { name: undefined, printedTotal: undefined, releaseDate: undefined, releaseYear: undefined };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("sets")
    .select("name,printed_total,release_date")
    .eq("code", setCode)
    .maybeSingle();

  if (error || !data) {
    return { name: undefined, printedTotal: undefined, releaseDate: undefined, releaseYear: undefined };
  }

  const row = data as SetRow;
  return {
    name: row.name ?? undefined,
    printedTotal: typeof row.printed_total === "number" ? row.printed_total : undefined,
    releaseDate: row.release_date ?? undefined,
    releaseYear: getReleaseYear(row.release_date),
  };
});

export async function getPublicCardByGvId(gv_id: string): Promise<CardDetail | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("card_prints")
    .select(
      `
        id,
        gv_id,
        name,
        number,
        rarity,
        image_url,
        image_alt_url,
        artist,
        set_code,
        variant_key,
        variants,
        card_printings(
          id,
          finish_key,
          finish_keys(label,sort_order)
        ),
        sets(name,printed_total,release_date)
      `,
    )
    .eq("gv_id", gv_id)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as PublicCardRow;
  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
  const fallbackSet = await getSetDetailsByCode(row.set_code);
  const [priceResult, activePriceMetadataResult] = row.id
    ? await Promise.all([
        supabase
          .from("v_grookai_value_v1_1")
          .select("card_print_id,grookai_value_nm,confidence,listing_count")
          .eq("card_print_id", row.id)
          .maybeSingle(),
        supabase
          .from("card_print_active_prices")
          .select("card_print_id,updated_at")
          .eq("card_print_id", row.id)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const priceRow = priceResult.data as PublicCardPriceRow | null;
  const activePriceMetadata = activePriceMetadataResult.data as ActivePriceMetadataRow | null;
  const setName = setRecord?.name ?? fallbackSet.name;
  const printedTotal =
    typeof setRecord?.printed_total === "number" ? setRecord.printed_total : fallbackSet.printedTotal;
  const releaseDate = setRecord?.release_date ?? fallbackSet.releaseDate;

  return {
    id: row.id ?? "",
    gv_id: row.gv_id ?? gv_id,
    name: row.name ?? "Unknown",
    number: row.number ?? "",
    set_name: setName,
    set_code: row.set_code ?? undefined,
    rarity: row.rarity ?? undefined,
    image_url: getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
    artist: row.artist ?? undefined,
    printed_total: printedTotal,
    release_date: releaseDate ?? undefined,
    release_year: getReleaseYear(releaseDate),
    latest_price: typeof priceRow?.grookai_value_nm === "number" ? priceRow.grookai_value_nm : undefined,
    confidence: typeof priceRow?.confidence === "number" ? priceRow.confidence : undefined,
    listing_count: typeof priceRow?.listing_count === "number" ? priceRow.listing_count : undefined,
    price_source: typeof priceRow?.grookai_value_nm === "number" ? "grookai.value.v1_1" : undefined,
    updated_at: activePriceMetadata?.updated_at ?? undefined,
    variant_key: row.variant_key?.trim() || undefined,
    variants: row.variants ?? undefined,
    printings: mapCardPrintings(row.card_printings),
  };
}

export async function getStaticCardParams(limit = 100): Promise<Array<{ gv_id: string }>> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("card_prints")
    .select("gv_id")
    .not("gv_id", "is", null)
    .order("gv_id", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as StaticParamRow[])
    .filter((row): row is { gv_id: string } => Boolean(row.gv_id))
    .map((row) => ({ gv_id: row.gv_id }));
}
