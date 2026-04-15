import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getCompatiblePublicGvIdCandidates, pickResolvedPublicGvIdRow } from "@/lib/gvIdAlias";
import { resolveCanonImageUrlV1 } from "@/lib/canon/resolveCanonImageV1";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

type CardNavigationSeedRow = {
  gv_id: string | null;
  set_code: string | null;
};

type CardNavigationRow = {
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  number_plain: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  external_ids?: { tcgdex?: string | null } | null;
  sets?:
    | {
        identity_model: string | null;
      }
    | {
        identity_model: string | null;
      }[]
    | null;
};

export type AdjacentPublicCard = {
  gv_id: string;
  name: string;
  set_code?: string;
  set_identity_model?: string;
  number: string;
  variant_key?: string;
  printed_identity_modifier?: string;
  image_url?: string;
  tcgdex_external_id?: string;
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

function extractTcgdexExternalId(externalIds?: { tcgdex?: string | null } | null) {
  const value = externalIds?.tcgdex;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

async function toAdjacentCard(row?: CardNavigationRow): Promise<AdjacentPublicCard | undefined> {
  if (!row?.gv_id) return undefined;

  const imageUrl = await resolveCanonImageUrlV1(row);
  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;

  return {
    gv_id: row.gv_id,
    name: row.name ?? "Unknown",
    set_code: row.set_code?.trim() || undefined,
    set_identity_model: setRecord?.identity_model?.trim() || undefined,
    number: row.number ?? "",
    variant_key: row.variant_key?.trim() || undefined,
    printed_identity_modifier: row.printed_identity_modifier?.trim() || undefined,
    image_url: imageUrl ?? getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
    tcgdex_external_id: extractTcgdexExternalId(row.external_ids),
  };
}

export const getAdjacentPublicCardsByGvId = cache(async (gv_id: string): Promise<AdjacentPublicCards> => {
  const supabase = createServerSupabase();
  const { data: seedRows, error: seedError } = await supabase
    .from("card_prints")
    .select("gv_id,set_code")
    .in("gv_id", getCompatiblePublicGvIdCandidates(gv_id))
    .limit(2);

  if (seedError || !seedRows) {
    return {};
  }

  const currentCard = pickResolvedPublicGvIdRow(seedRows as CardNavigationSeedRow[], gv_id);
  if (!currentCard) {
    return {};
  }
  if (!currentCard.set_code) {
    return {};
  }

  const { data: setRows, error: setError } = await supabase
    .from("card_prints")
    .select(
      "gv_id,name,set_code,number,number_plain,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,external_ids,sets(identity_model)",
    )
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

  const currentIndex = orderedRows.findIndex((row) => row.gv_id === currentCard.gv_id);
  if (currentIndex === -1) {
    return {};
  }

  const [previous, next] = await Promise.all([
    toAdjacentCard(orderedRows[currentIndex - 1]),
    toAdjacentCard(orderedRows[currentIndex + 1]),
  ]);

  return { previous, next };
});
