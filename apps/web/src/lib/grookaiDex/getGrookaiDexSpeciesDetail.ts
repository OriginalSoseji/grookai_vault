import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import {
  getCardPrintingsSelectColumns,
  hasChildPrintingPublicIdentityColumn,
} from "@/lib/cards/childPrintingPublicIdentity";
import { getCardPrintDisplayDiscriminator } from "@/lib/cards/displayDiscriminator";
import { getCardPrintingFinishLabel } from "@/lib/cards/displayDiscriminator";
import { resolveDisplayImageUrl } from "@/lib/publicCardImage";
import { getOwnedCountsByCardPrintIds } from "@/lib/vault/getOwnedCountsByCardPrintIds";
import { getOwnedPrintingCountsByCardPrintIds } from "@/lib/vault/getOwnedPrintingCountsByCardPrintIds";

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
  printed_identity_modifier?: string | null;
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
  printedIdentityModifier: string | null;
  printLabel: string | null;
  printLabelSource: "parent_variant" | "child_finish" | "printed_identity_modifier" | "fallback" | "none";
  imageUrl: string | null;
  role: string;
  countsForCompletion: boolean;
  ownedCount: number;
  isOwned: boolean;
  printings: GrookaiDexCardPrintingOption[];
};

export type GrookaiDexCardPrintingOption = {
  id: string;
  printingGvId: string | null;
  finishKey: string | null;
  finishName: string;
  ownedCount: number;
};

type CardPrintingRow = {
  id: string | null;
  card_print_id: string | null;
  printing_gv_id?: string | null;
  finish_key: string | null;
  finish_keys:
    | { label: string | null; sort_order: number | null }
    | { label: string | null; sort_order: number | null }[]
    | null;
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
  variantOptionCount: number;
  ownedVariantOptionCount: number;
  missingVariantOptionCount: number;
  cards: GrookaiDexCardPrintRow[];
};

function clean(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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
  const { data: identityRows, error: identityError } = await admin
    .from("card_prints")
    .select("id,printed_identity_modifier")
    .in("id", cardPrintIds);

  if (identityError) {
    throw new Error(`[grookai-dex:species-detail-identity] ${identityError.message}`);
  }

  const printedIdentityModifiersByCardPrintId = new Map(
    ((identityRows ?? []) as Array<{ id: string | null; printed_identity_modifier: string | null }>)
      .map((row) => [clean(row.id), clean(row.printed_identity_modifier)] as const)
      .filter((entry): entry is readonly [string, string | null] => Boolean(entry[0])),
  );
  const [ownedCounts, ownedPrintingCounts]: [Map<string, number>, Map<string, Map<string, number>>] = userId
    ? await Promise.all([
        getOwnedCountsByCardPrintIds(userId, cardPrintIds),
        getOwnedPrintingCountsByCardPrintIds(userId, cardPrintIds),
      ])
    : [new Map<string, number>(), new Map()];
  const includePrintingPublicIdentity = await hasChildPrintingPublicIdentityColumn(admin);
  const printingSelect = getCardPrintingsSelectColumns(includePrintingPublicIdentity);
  const { data: printingRows, error: printingError } = await admin
    .from("card_printings")
    .select(printingSelect)
    .in("card_print_id", cardPrintIds);

  if (printingError) {
    throw new Error(`[grookai-dex:species-detail-printings] ${printingError.message}`);
  }

  const printingOptionsByCardPrintId = new Map<string, Array<GrookaiDexCardPrintingOption & { sortOrder: number }>>();
  for (const row of (printingRows ?? []) as unknown as CardPrintingRow[]) {
    const printingId = clean(row.id);
    const cardPrintId = clean(row.card_print_id);
    if (!printingId || !cardPrintId) {
      continue;
    }
    const finishRecord = Array.isArray(row.finish_keys) ? row.finish_keys[0] : row.finish_keys;
    const label = getCardPrintingFinishLabel({
      finishKey: row.finish_key,
      finishLabel: finishRecord?.label,
    });
    if (label) {
      const options = printingOptionsByCardPrintId.get(cardPrintId) ?? [];
      options.push({
        id: printingId,
        printingGvId: clean(row.printing_gv_id),
        finishKey: clean(row.finish_key),
        finishName: label,
        ownedCount: ownedPrintingCounts.get(cardPrintId)?.get(printingId) ?? 0,
        sortOrder: typeof finishRecord?.sort_order === "number" ? finishRecord.sort_order : Number.MAX_SAFE_INTEGER,
      });
      printingOptionsByCardPrintId.set(cardPrintId, options);
    }
  }
  for (const [cardPrintId, options] of printingOptionsByCardPrintId.entries()) {
    options.sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.finishName.localeCompare(right.finishName);
    });
    printingOptionsByCardPrintId.set(cardPrintId, options);
  }
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
      const printings = (printingOptionsByCardPrintId.get(cardPrintId) ?? []).map(({ sortOrder: _sortOrder, ...printing }) => printing);

      return {
        cardPrintId,
        gvId: clean(row.gv_id),
        name: clean(row.name) ?? "Unknown card",
        setCode: clean(row.set_code),
        setName: clean(row.set_name),
        number: clean(row.number),
        rarity: clean(row.rarity),
        variantKey: clean(row.variant_key),
        printedIdentityModifier: printedIdentityModifiersByCardPrintId.get(cardPrintId) ?? null,
        printLabel: null,
        printLabelSource: "none",
        imageUrl,
        role: clean(row.role) ?? "primary",
        countsForCompletion: row.counts_for_completion === true,
        ownedCount,
        isOwned: ownedCount > 0,
        printings,
      };
    }),
  );
  const duplicateCounts = new Map<string, number>();
  const duplicateIndexes = new Map<string, number>();
  const duplicateOrdinalByCardPrintId = new Map<string, number>();
  for (const card of resolvedCards) {
    const key = duplicateCaptionKey(card);
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
    const nextIndex = duplicateIndexes.get(key) ?? 0;
    duplicateOrdinalByCardPrintId.set(card.cardPrintId, nextIndex);
    duplicateIndexes.set(key, nextIndex + 1);
  }
  const cards = resolvedCards.map((card) => {
    const hasDuplicateCaption = (duplicateCounts.get(duplicateCaptionKey(card)) ?? 0) > 1;
    const discriminator = getCardPrintDisplayDiscriminator({
      variantKey: card.variantKey,
      printedIdentityModifier: card.printedIdentityModifier,
      hasDuplicateCaption,
      fallbackIndex: duplicateOrdinalByCardPrintId.get(card.cardPrintId) ?? 0,
    });
    return {
      ...card,
      printLabel: discriminator.label,
      printLabelSource: discriminator.source,
    };
  });

  const completionCards = cards.filter((row) => row.countsForCompletion);
  const ownedPrintCount = completionCards.filter((row) => row.isOwned).length;
  const ownedCopyCount = completionCards.reduce((sum, row) => sum + row.ownedCount, 0);
  const totalPrintCount = completionCards.length;
  const variantOptionCount = completionCards.reduce(
    (sum, row) => sum + Math.max(1, row.printings.length),
    0,
  );
  const ownedVariantOptionCount = completionCards.reduce((sum, row) => {
    if (row.printings.length === 0) {
      return sum + (row.isOwned ? 1 : 0);
    }

    return sum + row.printings.filter((printing) => printing.ownedCount > 0).length;
  }, 0);

  return {
    speciesId: clean(rows[0]?.species_id) ?? "",
    slug,
    displayName: clean(rows[0]?.species_display_name) ?? slug,
    nationalDexNumber: rows[0]?.national_dex_number ?? 0,
    totalPrintCount,
    ownedPrintCount,
    ownedCopyCount,
    completionPercent: totalPrintCount > 0 ? Math.round((ownedPrintCount / totalPrintCount) * 100) : 0,
    variantOptionCount,
    ownedVariantOptionCount,
    missingVariantOptionCount: Math.max(0, variantOptionCount - ownedVariantOptionCount),
    cards,
  };
}
