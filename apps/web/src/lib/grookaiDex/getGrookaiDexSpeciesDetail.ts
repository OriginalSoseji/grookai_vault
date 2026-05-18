import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { resolveDisplayImageUrl } from "@/lib/publicCardImage";
import { getOwnedCountsByCardPrintIds } from "@/lib/vault/getOwnedCountsByCardPrintIds";

type DexCardPrintViewRow = {
  species_id: string | null;
  species_slug: string | null;
  species_display_name: string | null;
  national_dex_number: number | null;
  card_print_id: string | null;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  variant_key: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  representative_image_url: string | null;
  role: string | null;
  counts_for_completion: boolean | null;
};

export type GrookaiDexCardPrintRow = {
  cardPrintId: string;
  gvId: string | null;
  name: string;
  setCode: string | null;
  setName: string | null;
  number: string | null;
  rarity: string | null;
  variantKey: string | null;
  printLabel: string | null;
  imageUrl: string | null;
  role: string;
  countsForCompletion: boolean;
  ownedCount: number;
  isOwned: boolean;
};

export type GrookaiDexSpeciesDetail = {
  speciesId: string;
  slug: string;
  displayName: string;
  nationalDexNumber: number;
  totalPrintCount: number;
  ownedPrintCount: number;
  ownedCopyCount: number;
  completionPercent: number;
  cards: GrookaiDexCardPrintRow[];
};

function clean(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function titleCaseToken(value: string) {
  const lowered = value.toLowerCase();
  if (lowered === "sm" || lowered === "xy" || lowered === "bw" || lowered === "ex") {
    return lowered.toUpperCase();
  }
  if (lowered === "pokemon") {
    return "Pokemon";
  }
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}

function buildVariantLabel(variantKey: string | null) {
  if (!variantKey) {
    return null;
  }

  const tokens = variantKey
    .split(/[_-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }

  const hasStamp = tokens.some((token) => token.toLowerCase() === "stamp" || token.toLowerCase() === "stamped");
  const hasTogether = tokens.some((token) => token.toLowerCase() === "together");
  const meaningfulTokens = tokens.filter((token) => {
    const lowered = token.toLowerCase();
    return !["variant", "print", "prints", "card", "cards"].includes(lowered);
  });

  if (hasTogether && hasStamp) {
    return "Pokemon Together Stamp";
  }

  return meaningfulTokens.map(titleCaseToken).join(" ");
}

function duplicateCaptionKey(card: Pick<GrookaiDexCardPrintRow, "name" | "setCode" | "number">) {
  return [card.name, card.setCode ?? "", card.number ?? ""].join("\u001f").toLowerCase();
}

export async function getGrookaiDexSpeciesDetail(
  speciesSlug: string,
  userId: string | null,
): Promise<GrookaiDexSpeciesDetail | null> {
  const slug = speciesSlug.trim().toLowerCase();
  if (!slug) {
    return null;
  }

  const admin = createServerAdminClient();
  const { data, error } = await admin
    .from("v_grookai_dex_card_prints_v1")
    .select(
      "species_id,species_slug,species_display_name,national_dex_number,card_print_id,gv_id,name,set_code,set_name,number,rarity,variant_key,image_url,image_alt_url,image_source,image_path,representative_image_url,role,counts_for_completion",
    )
    .eq("species_slug", slug)
    .eq("mapping_active", true)
    .order("set_name", { ascending: true })
    .order("number", { ascending: true });

  if (error) {
    throw new Error(`[grookai-dex:species-detail] ${error.message}`);
  }

  const rows = ((data ?? []) as DexCardPrintViewRow[]).filter((row) => clean(row.card_print_id));
  if (rows.length === 0) {
    return null;
  }

  const cardPrintIds = rows.map((row) => clean(row.card_print_id)).filter((value): value is string => Boolean(value));
  const ownedCounts = userId ? await getOwnedCountsByCardPrintIds(userId, cardPrintIds) : new Map<string, number>();
  const resolvedCards = await Promise.all(
    rows.map(async (row) => {
      const cardPrintId = clean(row.card_print_id)!;
      const imageFields = await resolveCardImageFieldsV1(row);
      const imageUrl =
        resolveDisplayImageUrl({
          display_image_url: imageFields.display_image_url,
          image_url: row.image_url,
          image_alt_url: row.image_alt_url,
          representative_image_url: row.representative_image_url,
        }) ?? null;
      const ownedCount = ownedCounts.get(cardPrintId) ?? 0;

      return {
        cardPrintId,
        gvId: clean(row.gv_id),
        name: clean(row.name) ?? "Unknown card",
        setCode: clean(row.set_code),
        setName: clean(row.set_name),
        number: clean(row.number),
        rarity: clean(row.rarity),
        variantKey: clean(row.variant_key),
        printLabel: null,
        imageUrl,
        role: clean(row.role) ?? "primary",
        countsForCompletion: row.counts_for_completion === true,
        ownedCount,
        isOwned: ownedCount > 0,
      };
    }),
  );
  const duplicateCounts = new Map<string, number>();
  for (const card of resolvedCards) {
    const key = duplicateCaptionKey(card);
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }
  const cards = resolvedCards.map((card) => {
    const variantLabel = buildVariantLabel(card.variantKey);
    const hasDuplicateCaption = (duplicateCounts.get(duplicateCaptionKey(card)) ?? 0) > 1;
    return {
      ...card,
      printLabel: variantLabel ?? (hasDuplicateCaption ? "Standard print" : null),
    };
  });

  const completionCards = cards.filter((row) => row.countsForCompletion);
  const ownedPrintCount = completionCards.filter((row) => row.isOwned).length;
  const ownedCopyCount = completionCards.reduce((sum, row) => sum + row.ownedCount, 0);
  const totalPrintCount = completionCards.length;

  return {
    speciesId: clean(rows[0]?.species_id) ?? "",
    slug,
    displayName: clean(rows[0]?.species_display_name) ?? slug,
    nationalDexNumber: rows[0]?.national_dex_number ?? 0,
    totalPrintCount,
    ownedPrintCount,
    ownedCopyCount,
    completionPercent: totalPrintCount > 0 ? Math.round((ownedPrintCount / totalPrintCount) * 100) : 0,
    cards,
  };
}
