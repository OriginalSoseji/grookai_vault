import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";
import { createPublicServerClient } from "@/lib/supabase/publicServer";
import { resolvePublicSetRouteCode } from "@/lib/publicSets.shared";
import {
  BASE_SET_PRINT_RUN_SOURCE_SET_CODE,
  getBaseSetPrintRunLaneSpecialVariantKeys,
} from "@/lib/baseSetPrintRunLanes";

type CardPrintIdRow = {
  id: string | null;
};

type CardPrintingRow = {
  id: string | null;
  card_print_id: string | null;
};

type VaultInstanceRow = {
  card_print_id: string | null;
  card_printing_id: string | null;
};

export type PublicSetMasterSetStats = {
  parentPrintCount: number;
  variantOptionCount: number;
  ownedVariantOptionCount: number | null;
  missingVariantOptionCount: number | null;
  completionPercent: number | null;
  unclassifiedOwnedCount: number;
};

const QUERY_CHUNK_SIZE = 500;

function normalizeIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim() ?? "").filter(Boolean)));
}

function chunkValues<T>(values: T[], size = QUERY_CHUNK_SIZE) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function fetchSetCardPrintIds(setCode: string) {
  const normalizedCode = resolvePublicSetRouteCode(setCode);
  if (!normalizedCode) {
    return [];
  }

  const supabase = createPublicServerClient();
  const ids: string[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("card_prints")
      .select("id")
      .eq("set_code", normalizedCode)
      .not("gv_id", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`[card_prints.master-set-ids] ${error.message}`);
    }

    const rows = (data ?? []) as CardPrintIdRow[];
    ids.push(...normalizeIds(rows.map((row) => row.id)));

    if (rows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  const specialVariantKeys =
    getBaseSetPrintRunLaneSpecialVariantKeys(normalizedCode);
  if (specialVariantKeys.length > 0) {
    const { data, error } = await supabase
      .from("card_prints")
      .select("id")
      .eq("set_code", BASE_SET_PRINT_RUN_SOURCE_SET_CODE)
      .in("variant_key", specialVariantKeys)
      .not("gv_id", "is", null);

    if (error) {
      throw new Error(`[card_prints.master-set-special-ids] ${error.message}`);
    }

    ids.push(
      ...normalizeIds(((data ?? []) as CardPrintIdRow[]).map((row) => row.id)),
    );
  }

  return normalizeIds(ids);
}

async function fetchCardPrintings(cardPrintIds: string[]) {
  if (cardPrintIds.length === 0) {
    return [];
  }

  const supabase = createPublicServerClient();
  const printings: Array<{ id: string; cardPrintId: string }> = [];

  for (const chunk of chunkValues(cardPrintIds)) {
    const { data, error } = await supabase
      .from("card_printings")
      .select("id,card_print_id")
      .in("card_print_id", chunk);

    if (error) {
      throw new Error(`[card_printings.master-set-options] ${error.message}`);
    }

    for (const row of (data ?? []) as CardPrintingRow[]) {
      const id = row.id?.trim();
      const cardPrintId = row.card_print_id?.trim();
      if (id && cardPrintId) {
        printings.push({ id, cardPrintId });
      }
    }
  }

  return printings;
}

async function fetchOwnedInstances(userId: string, cardPrintIds: string[]) {
  if (!userId || cardPrintIds.length === 0) {
    return [];
  }

  const supabase = createServerAdminClient();
  const instances: Array<{ cardPrintId: string; cardPrintingId: string | null }> = [];

  for (const chunk of chunkValues(cardPrintIds)) {
    const { data, error } = await supabase
      .from("vault_item_instances")
      .select("card_print_id,card_printing_id")
      .eq("user_id", userId)
      .is("archived_at", null)
      .in("card_print_id", chunk);

    if (error) {
      throw new Error(`[vault_item_instances.master-set-owned] ${error.message}`);
    }

    for (const row of (data ?? []) as VaultInstanceRow[]) {
      const cardPrintId = row.card_print_id?.trim();
      if (!cardPrintId) {
        continue;
      }

      instances.push({
        cardPrintId,
        cardPrintingId: row.card_printing_id?.trim() || null,
      });
    }
  }

  return instances;
}

export async function getPublicSetMasterSetStats(
  setCode: string,
  userId: string | null | undefined,
): Promise<PublicSetMasterSetStats> {
  const cardPrintIds = await fetchSetCardPrintIds(setCode);
  const printings = await fetchCardPrintings(cardPrintIds);
  const parentIdsWithChildPrintings = new Set(printings.map((printing) => printing.cardPrintId));
  const fallbackParentIds = cardPrintIds.filter((id) => !parentIdsWithChildPrintings.has(id));
  const availablePrintingIds = new Set(printings.map((printing) => printing.id));
  const variantOptionCount = printings.length + fallbackParentIds.length;
  const normalizedUserId = userId?.trim() ?? "";

  if (!normalizedUserId) {
    return {
      parentPrintCount: cardPrintIds.length,
      variantOptionCount,
      ownedVariantOptionCount: null,
      missingVariantOptionCount: null,
      completionPercent: null,
      unclassifiedOwnedCount: 0,
    };
  }

  const fallbackParentIdSet = new Set(fallbackParentIds);
  const instances = await fetchOwnedInstances(normalizedUserId, cardPrintIds);
  const ownedPrintingIds = new Set<string>();
  const ownedFallbackParentIds = new Set<string>();
  let unclassifiedOwnedCount = 0;

  for (const instance of instances) {
    if (instance.cardPrintingId && availablePrintingIds.has(instance.cardPrintingId)) {
      ownedPrintingIds.add(instance.cardPrintingId);
      continue;
    }

    if (fallbackParentIdSet.has(instance.cardPrintId)) {
      ownedFallbackParentIds.add(instance.cardPrintId);
      continue;
    }

    unclassifiedOwnedCount += 1;
  }

  const ownedVariantOptionCount = ownedPrintingIds.size + ownedFallbackParentIds.size;
  const missingVariantOptionCount = Math.max(0, variantOptionCount - ownedVariantOptionCount);
  const completionPercent =
    variantOptionCount > 0 ? Math.round((ownedVariantOptionCount / variantOptionCount) * 100) : 0;

  return {
    parentPrintCount: cardPrintIds.length,
    variantOptionCount,
    ownedVariantOptionCount,
    missingVariantOptionCount,
    completionPercent,
    unclassifiedOwnedCount,
  };
}
