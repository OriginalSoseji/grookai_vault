import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { getChildDisplayImageFallbacks } from "@/lib/cards/childDisplayImageFallbacks";
import {
  getCardPrintingsSelectColumns,
  hasChildPrintingPublicIdentityColumn,
} from "@/lib/cards/childPrintingPublicIdentity";
import { getCardPrintDisplayDiscriminator } from "@/lib/cards/displayDiscriminator";
import { getCardPrintingFinishLabel } from "@/lib/cards/displayDiscriminator";
import { getOwnedCountsByCardPrintIds } from "@/lib/vault/getOwnedCountsByCardPrintIds";
import { getOwnedPrintingCountsByCardPrintIds } from "@/lib/vault/getOwnedPrintingCountsByCardPrintIds";
import { chunkValues, mapWithBoundedConcurrency } from "@/lib/pagination";

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
  imageFallbackUrls: string[];
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

type CameoViewRow = {
  gv_id: string | null;
  card_name: string | null;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  notes_raw: string | null;
  cameo_qualifiers: string[] | null;
};

const SUPABASE_DETAIL_PAGE_SIZE = 1_000;
const SUPABASE_IN_FILTER_CHUNK_SIZE = 250;
const SUPABASE_QUERY_CONCURRENCY = 4;
const CAMEO_RESULT_LIMIT = 60;
const CAMEO_PAGE_SIZE = 100;

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
  cameoAppearances: GrookaiDexCameoAppearance[];
};

export type GrookaiDexCameoAppearance = {
  gvId: string;
  cardName: string;
  setCode: string | null;
  setName: string | null;
  number: string | null;
  notes: string | null;
  qualifiers: string[];
};

function clean(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function duplicateCaptionKey(card: Pick<GrookaiDexCardPrintRow, "name" | "setCode" | "number">) {
  return [card.name, card.setCode ?? "", card.number ?? ""].join("\u001f").toLowerCase();
}

const SPECIES_ROLE_PRIORITY = new Map([
  ["primary", 0],
  ["form_subject", 1],
  ["tag_team", 2],
  ["multi_subject", 3],
  ["trainer_owned", 4],
  ["manual_override", 5],
  ["cameo", 6],
]);

function dedupeDexCardPrintRows(rows: DexCardPrintViewRow[]) {
  const byCardPrintId = new Map<string, DexCardPrintViewRow>();
  for (const row of rows) {
    const cardPrintId = clean(row.card_print_id);
    if (!cardPrintId) continue;

    const current = byCardPrintId.get(cardPrintId);
    if (!current) {
      byCardPrintId.set(cardPrintId, row);
      continue;
    }

    const currentCompletion = current.counts_for_completion === true;
    const candidateCompletion = row.counts_for_completion === true;
    const currentPriority =
      SPECIES_ROLE_PRIORITY.get(clean(current.role) ?? "") ?? Number.MAX_SAFE_INTEGER;
    const candidatePriority =
      SPECIES_ROLE_PRIORITY.get(clean(row.role) ?? "") ?? Number.MAX_SAFE_INTEGER;
    if (
      (candidateCompletion && !currentCompletion) ||
      (candidateCompletion === currentCompletion && candidatePriority < currentPriority)
    ) {
      byCardPrintId.set(cardPrintId, row);
    }
  }
  return Array.from(byCardPrintId.values());
}

function dedupeCameoAppearances(rows: GrookaiDexCameoAppearance[]) {
  const byGvId = new Map<string, GrookaiDexCameoAppearance>();
  for (const row of rows) {
    const current = byGvId.get(row.gvId);
    if (!current) {
      byGvId.set(row.gvId, row);
      continue;
    }

    byGvId.set(row.gvId, {
      ...current,
      notes: current.notes ?? row.notes,
      qualifiers: Array.from(new Set([...current.qualifiers, ...row.qualifiers])),
    });
  }
  return Array.from(byGvId.values());
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
  const detailRows: DexCardPrintViewRow[] = [];
  for (let detailFrom = 0; ; detailFrom += SUPABASE_DETAIL_PAGE_SIZE) {
    const detailTo = detailFrom + SUPABASE_DETAIL_PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("v_grookai_dex_card_prints_v1")
      .select(
        "species_id,species_slug,species_display_name,national_dex_number,card_print_id,gv_id,name,set_code,set_name,number,rarity,variant_key,image_url,image_alt_url,image_source,image_path,representative_image_url,role,counts_for_completion",
      )
      .eq("species_slug", slug)
      .eq("mapping_active", true)
      .order("card_print_id", { ascending: true })
      .order("role", { ascending: true })
      .range(detailFrom, detailTo);

    if (error) {
      throw new Error(`[grookai-dex:species-detail] ${error.message}`);
    }

    const detailPage = (data ?? []) as DexCardPrintViewRow[];
    detailRows.push(...detailPage);
    if (detailPage.length < SUPABASE_DETAIL_PAGE_SIZE) {
      break;
    }
  }

  const rows = dedupeDexCardPrintRows(detailRows).sort((left, right) => {
    const setComparison = (clean(left.set_name) ?? "").localeCompare(clean(right.set_name) ?? "");
    if (setComparison !== 0) return setComparison;
    return (clean(left.number) ?? "").localeCompare(clean(right.number) ?? "", undefined, {
      numeric: true,
    });
  });
  if (rows.length === 0) {
    return null;
  }

  const cardPrintIds = rows.map((row) => clean(row.card_print_id)).filter((value): value is string => Boolean(value));
  const cardPrintIdChunks = chunkValues(cardPrintIds, SUPABASE_IN_FILTER_CHUNK_SIZE);
  const identityRowGroups = await mapWithBoundedConcurrency(
    cardPrintIdChunks,
    SUPABASE_QUERY_CONCURRENCY,
    async (cardPrintIdChunk) => {
      const { data, error } = await admin
        .from("card_prints")
        .select("id,printed_identity_modifier,image_status,image_note")
        .in("id", cardPrintIdChunk)
        .order("id", { ascending: true });

      if (error) {
        throw new Error(`[grookai-dex:species-detail-identity] ${error.message}`);
      }
      return data ?? [];
    },
  );
  const identityRows = identityRowGroups.flat();

  const cardPrintMetadataByCardPrintId = new Map(
    ((identityRows ?? []) as Array<{
      id: string | null;
      printed_identity_modifier: string | null;
      image_status: string | null;
      image_note: string | null;
    }>)
      .map((row) => [
        clean(row.id),
        {
          printedIdentityModifier: clean(row.printed_identity_modifier),
          imageStatus: clean(row.image_status),
          imageNote: clean(row.image_note),
        },
      ] as const)
      .filter(
        (
          entry,
        ): entry is readonly [
          string,
          {
            printedIdentityModifier: string | null;
            imageStatus: string | null;
            imageNote: string | null;
          },
        ] => Boolean(entry[0]),
      ),
  );
  const [ownedCounts, ownedPrintingCounts]: [Map<string, number>, Map<string, Map<string, number>>] = userId
    ? await Promise.all([
        getOwnedCountsByCardPrintIds(userId, cardPrintIds),
        getOwnedPrintingCountsByCardPrintIds(userId, cardPrintIds),
      ])
    : [new Map<string, number>(), new Map()];
  const includePrintingPublicIdentity = await hasChildPrintingPublicIdentityColumn(admin);
  const printingSelect = getCardPrintingsSelectColumns(includePrintingPublicIdentity);
  const printingRowGroups = await mapWithBoundedConcurrency(
    cardPrintIdChunks,
    SUPABASE_QUERY_CONCURRENCY,
    async (cardPrintIdChunk) => {
      const chunkRows: CardPrintingRow[] = [];
      for (let printingFrom = 0; ; printingFrom += SUPABASE_DETAIL_PAGE_SIZE) {
        const printingTo = printingFrom + SUPABASE_DETAIL_PAGE_SIZE - 1;
        const { data, error } = await admin
          .from("card_printings")
          .select(printingSelect)
          .in("card_print_id", cardPrintIdChunk)
          .order("id", { ascending: true })
          .range(printingFrom, printingTo);

        if (error) {
          throw new Error(`[grookai-dex:species-detail-printings] ${error.message}`);
        }

        const pageRows = (data ?? []) as unknown as CardPrintingRow[];
        chunkRows.push(...pageRows);
        if (pageRows.length < SUPABASE_DETAIL_PAGE_SIZE) {
          break;
        }
      }
      return chunkRows;
    },
  );
  const printingRows = printingRowGroups.flat();

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
  const childDisplayImageFallbacks = await getChildDisplayImageFallbacks(
    admin,
    rows.map((row) => ({
      id: clean(row.card_print_id),
    })),
  );
  const resolvedCards = await Promise.all(
    rows.map(async (row) => {
      const cardPrintId = clean(row.card_print_id)!;
      const metadata = cardPrintMetadataByCardPrintId.get(cardPrintId);
      const imageFields = await resolveCardImageFieldsV1({
        ...row,
        id: cardPrintId,
        image_status: metadata?.imageStatus,
        image_note: metadata?.imageNote,
      });
      const childDisplayImageFallback = childDisplayImageFallbacks.get(cardPrintId);
      const fallbackDisplayImage = !imageFields.display_image_url
        ? childDisplayImageFallback
        : undefined;
      const primaryImageUrl =
        imageFields.display_image_url ??
        fallbackDisplayImage?.display_image_url ??
        null;
      const imageSources = [
        primaryImageUrl,
        imageFields.display_image_url
          ? childDisplayImageFallback?.display_image_url
          : null,
        imageFields.external_image_fallback_url,
      ].filter(
        (candidate, candidateIndex, candidates): candidate is string =>
          Boolean(candidate?.trim()) && candidates.indexOf(candidate) === candidateIndex,
      );
      const [imageUrl = null, ...imageFallbackUrls] = imageSources;
      const ownedCount = ownedCounts.get(cardPrintId) ?? 0;
      const printings = (printingOptionsByCardPrintId.get(cardPrintId) ?? []).map(({ sortOrder: _sortOrder, ...printing }) => printing);
      const resolvedPrintings =
        ownedCount > 0 && printings.length === 1 && printings[0]?.ownedCount === 0
          ? [{ ...printings[0], ownedCount }]
          : printings;

      return {
        cardPrintId,
        gvId: clean(row.gv_id),
        name: clean(row.name) ?? "Unknown card",
        setCode: clean(row.set_code),
        setName: clean(row.set_name),
        number: clean(row.number),
        rarity: clean(row.rarity),
        variantKey: clean(row.variant_key),
        printedIdentityModifier: metadata?.printedIdentityModifier ?? null,
        printLabel: null,
        printLabelSource: "none",
        imageUrl,
        imageFallbackUrls,
        role: clean(row.role) ?? "primary",
        countsForCompletion: row.counts_for_completion === true,
        ownedCount,
        isOwned: ownedCount > 0,
        printings: resolvedPrintings,
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
  const cameoAppearances: GrookaiDexCameoAppearance[] = [];
  for (let cameoFrom = 0; ; cameoFrom += CAMEO_PAGE_SIZE) {
    const cameoTo = cameoFrom + CAMEO_PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("v_card_print_cameos_public_v1")
      .select("gv_id,card_name,set_code,set_name,number,notes_raw,cameo_qualifiers")
      .eq("cameo_subject_type", "pokemon")
      .eq("pokemon_ndex", String(rows[0]?.national_dex_number ?? ""))
      .order("set_name", { ascending: true })
      .order("number", { ascending: true })
      .order("gv_id", { ascending: true })
      .range(cameoFrom, cameoTo);

    if (error) {
      throw new Error(`[grookai-dex:species-detail-cameos] ${error.message}`);
    }

    const cameoRawPage = (data ?? []) as CameoViewRow[];
    const cameoPage = cameoRawPage
      .map((row) => {
        const gvId = clean(row.gv_id);
        if (!gvId) {
          return null;
        }
        return {
          gvId,
          cardName: clean(row.card_name) ?? "Unknown card",
          setCode: clean(row.set_code),
          setName: clean(row.set_name),
          number: clean(row.number),
          notes: clean(row.notes_raw),
          qualifiers: Array.isArray(row.cameo_qualifiers)
            ? row.cameo_qualifiers.filter(
                (value): value is string =>
                  typeof value === "string" && value.trim().length > 0,
              )
            : [],
        } satisfies GrookaiDexCameoAppearance;
      })
      .filter((row): row is GrookaiDexCameoAppearance => row !== null);
    cameoAppearances.splice(
      0,
      cameoAppearances.length,
      ...dedupeCameoAppearances([...cameoAppearances, ...cameoPage]),
    );
    if (cameoAppearances.length >= CAMEO_RESULT_LIMIT || cameoRawPage.length < CAMEO_PAGE_SIZE) {
      break;
    }
  }
  cameoAppearances.splice(CAMEO_RESULT_LIMIT);

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
    cameoAppearances,
  };
}
