import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

type CardNavigationSeedRow = {
  gv_id: string | null;
  set_code: string | null;
};

type CardNavigationRow = {
  gv_id: string | null;
  name: string | null;
  number: string | null;
  number_plain: string | null;
  image_url: string | null;
  image_alt_url: string | null;
};

export type AdjacentPublicCard = {
  gv_id: string;
  name: string;
  number: string;
  image_url?: string;
};

export type AdjacentPublicCards = {
  previous?: AdjacentPublicCard;
  next?: AdjacentPublicCard;
};

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

function splitPrintedNumber(value: string, numberPlain?: string | null) {
  const normalized = value.trim().toUpperCase();
  const digits = numberPlain?.trim() || normalized.replace(/\D/g, "");
  const prefixMatch = normalized.match(/^\D+/);
  const suffixMatch = normalized.match(/\d([A-Z]+)$/);

  return {
    hasDigits: digits.length > 0,
    digits: digits.length > 0 ? Number(digits) : Number.POSITIVE_INFINITY,
    prefix: prefixMatch?.[0] ?? "",
    suffix: suffixMatch?.[1] ?? "",
    raw: normalized,
  };
}

function comparePrintedNumbers(left: CardNavigationRow, right: CardNavigationRow) {
  const leftParts = splitPrintedNumber(left.number ?? "", left.number_plain);
  const rightParts = splitPrintedNumber(right.number ?? "", right.number_plain);

  if (leftParts.hasDigits !== rightParts.hasDigits) {
    return leftParts.hasDigits ? -1 : 1;
  }

  if (leftParts.prefix !== rightParts.prefix) {
    return leftParts.prefix.localeCompare(rightParts.prefix);
  }

  if (leftParts.digits !== rightParts.digits) {
    return leftParts.digits - rightParts.digits;
  }

  if (leftParts.suffix !== rightParts.suffix) {
    if (!leftParts.suffix) return -1;
    if (!rightParts.suffix) return 1;
    return leftParts.suffix.localeCompare(rightParts.suffix);
  }

  return leftParts.raw.localeCompare(rightParts.raw);
}

function toAdjacentCard(row?: CardNavigationRow): AdjacentPublicCard | undefined {
  if (!row?.gv_id) return undefined;

  return {
    gv_id: row.gv_id,
    name: row.name ?? "Unknown",
    number: row.number ?? "",
    image_url: getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
  };
}

export const getAdjacentPublicCardsByGvId = cache(async (gv_id: string): Promise<AdjacentPublicCards> => {
  const supabase = createServerSupabase();
  const { data: seedRow, error: seedError } = await supabase
    .from("card_prints")
    .select("gv_id,set_code")
    .eq("gv_id", gv_id)
    .single();

  if (seedError || !seedRow) {
    return {};
  }

  const currentCard = seedRow as CardNavigationSeedRow;
  if (!currentCard.set_code) {
    return {};
  }

  const { data: setRows, error: setError } = await supabase
    .from("card_prints")
    .select("gv_id,name,number,number_plain,image_url,image_alt_url")
    .eq("set_code", currentCard.set_code)
    .not("gv_id", "is", null);

  if (setError || !setRows) {
    return {};
  }

  const orderedRows = (setRows as CardNavigationRow[])
    .filter((row): row is CardNavigationRow & { gv_id: string } => Boolean(row.gv_id))
    .sort((left, right) => {
      const numberCompare = comparePrintedNumbers(left, right);
      if (numberCompare !== 0) return numberCompare;
      return left.gv_id.localeCompare(right.gv_id);
    });

  const currentIndex = orderedRows.findIndex((row) => row.gv_id === gv_id);
  if (currentIndex === -1) {
    return {};
  }

  return {
    previous: toAdjacentCard(orderedRows[currentIndex - 1]),
    next: toAdjacentCard(orderedRows[currentIndex + 1]),
  };
});
