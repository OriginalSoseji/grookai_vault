import { cache } from "react";
import { getCompatiblePublicGvIdCandidates, pickResolvedPublicGvIdRow } from "@/lib/gvIdAlias";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { createPublicServerClient } from "@/lib/supabase/publicServer";

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
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
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
  representative_image_url?: string;
  image_status?: string;
  image_note?: string;
  image_source?: string;
  display_image_url?: string;
  display_image_kind?: "exact" | "representative" | "missing";
  tcgdex_external_id?: string;
};

export type AdjacentPublicCards = {
  previous?: AdjacentPublicCard;
  next?: AdjacentPublicCard;
};

function createServerSupabase() {
  return createPublicServerClient(120);
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

  const imageFields = await resolveCardImageFieldsV1(row);
  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;

  return {
    gv_id: row.gv_id,
    name: row.name ?? "Unknown",
    set_code: row.set_code?.trim() || undefined,
    set_identity_model: setRecord?.identity_model?.trim() || undefined,
    number: row.number ?? "",
    variant_key: row.variant_key?.trim() || undefined,
    printed_identity_modifier: row.printed_identity_modifier?.trim() || undefined,
    image_url: imageFields.image_url ?? undefined,
    representative_image_url: imageFields.representative_image_url ?? undefined,
    image_status: imageFields.image_status ?? undefined,
    image_note: imageFields.image_note ?? undefined,
    image_source: imageFields.image_source ?? undefined,
    display_image_url: imageFields.display_image_url ?? undefined,
    display_image_kind: imageFields.display_image_kind,
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
      "gv_id,name,set_code,number,number_plain,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,external_ids,sets(identity_model)",
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
