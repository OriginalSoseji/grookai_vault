"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMPORT_CONDITION_OPTIONS, type ImportCondition } from "@/lib/import/normalizeRow";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getOwnedCountsByCardPrintIds } from "@/lib/vault/getOwnedCountsByCardPrintIds";
import { resolveActiveVaultAnchor, type ActiveVaultAnchor } from "@/lib/vault/resolveActiveVaultAnchor";
import type { ImportVaultItemsResult, MatchResult } from "@/types/import";

type MatchImportMeta = {
  compareKey: string;
  desiredQuantity: number;
  importQuantity: number;
};

type MatchResultWithImportMeta = MatchResult & {
  importMeta?: MatchImportMeta;
};

type AggregatedImportRow = {
  cardId: string;
  gvId: string;
  name: string;
  setName: string | null;
  desiredQuantity: number;
  quantityToImport: number;
  condition: ImportCondition;
  acquisitionCost: number | null;
  createdAt: string | null;
  notes: string | null;
};

type ImportVaultItemsExecutionParams = {
  client: SupabaseClient;
  adminClient: SupabaseClient;
  userId: string;
  rows: MatchResult[];
};

function coerceCondition(value: string): ImportCondition {
  return IMPORT_CONDITION_OPTIONS.includes(value as ImportCondition) ? (value as ImportCondition) : "NM";
}

function getDesiredQuantity(row: MatchResultWithImportMeta) {
  return Math.max(1, row.importMeta?.desiredQuantity ?? row.row.quantity);
}

function mergeImportRows(rows: MatchResult[]): AggregatedImportRow[] {
  const merged = new Map<string, AggregatedImportRow>();

  for (const row of rows as MatchResultWithImportMeta[]) {
    if (row.status !== "matched" || !row.match?.card_id || !row.match.gv_id) {
      continue;
    }

    const desiredQuantity = getDesiredQuantity(row);
    const current = merged.get(row.match.gv_id);
    const nextCost =
      typeof row.row.cost === "number"
        ? row.row.cost
        : current?.acquisitionCost ?? null;
    const nextCreatedAt = [current?.createdAt, row.row.added]
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;
    const nextNotes =
      current?.notes ??
      (row.row.notes && row.row.notes.trim().length > 0 ? row.row.notes.trim() : null);

    merged.set(row.match.gv_id, {
      cardId: row.match.card_id,
      gvId: row.match.gv_id,
      name: row.match.name ?? row.row.displayName,
      setName: row.match.set_name ?? null,
      desiredQuantity: (current?.desiredQuantity ?? 0) + desiredQuantity,
      quantityToImport: 0,
      condition: current?.condition ?? coerceCondition(row.row.condition),
      acquisitionCost: nextCost,
      createdAt: nextCreatedAt,
      notes: nextNotes,
    });
  }

  return Array.from(merged.values()).sort((left, right) => left.gvId.localeCompare(right.gvId));
}

async function fetchExistingOwnedCounts(userId: string, cardIds: string[]) {
  return getOwnedCountsByCardPrintIds(userId, cardIds);
}

async function mirrorLegacyBucketQuantity(
  client: SupabaseClient,
  row: AggregatedImportRow,
  anchor: ActiveVaultAnchor,
  insertedAnchorId: string | null,
) {
  if (insertedAnchorId === anchor.id) {
    return;
  }

  const { error: updateError } = await client
    .from("vault_items")
    .update({
      qty: (typeof anchor.qty === "number" ? anchor.qty : 0) + row.quantityToImport,
    })
    .eq("id", anchor.id)
    .eq("user_id", anchor.user_id)
    .is("archived_at", null);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

function reconcileAggregatedRows(rows: AggregatedImportRow[], existingByCardId: Map<string, number>) {
  return rows
    .map((row) => {
      const existingQty = existingByCardId.get(row.cardId) ?? 0;
      const delta = row.desiredQuantity - existingQty;

      if (delta <= 0) {
        return null;
      }

      return {
        ...row,
        quantityToImport: delta,
      };
    })
    .filter((row): row is AggregatedImportRow => Boolean(row))
    .sort((left, right) => left.gvId.localeCompare(right.gvId));
}

async function createCanonicalImportInstances(
  adminClient: SupabaseClient,
  userId: string,
  row: AggregatedImportRow,
  legacyVaultItemId: string,
) {
  for (let copyIndex = 0; copyIndex < row.quantityToImport; copyIndex += 1) {
    const { error } = await adminClient.rpc("admin_vault_instance_create_v1", {
      p_user_id: userId,
      p_card_print_id: row.cardId,
      p_legacy_vault_item_id: legacyVaultItemId,
      p_acquisition_cost: row.acquisitionCost,
      p_condition_label: row.condition,
      p_notes: row.notes,
      p_name: row.name,
      p_set_name: row.setName,
      p_created_at: row.createdAt,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function importVaultItemsForUser({
  client,
  adminClient,
  userId,
  rows,
}: ImportVaultItemsExecutionParams): Promise<ImportVaultItemsResult> {
  console.info("vault.import.begin", {
    userId,
    itemCount: rows.length,
  });

  const aggregatedRows = mergeImportRows(rows);
  const needsManualMatch = rows.filter((row) => row.status !== "matched").length;

  if (aggregatedRows.length === 0) {
    return {
      importedCards: 0,
      importedEntries: 0,
      needsManualMatch,
      skippedRows: needsManualMatch,
    };
  }

  const existingOwnedCounts = await fetchExistingOwnedCounts(
    userId,
    aggregatedRows.map((row) => row.cardId),
  );
  const reconciledRows = reconcileAggregatedRows(aggregatedRows, existingOwnedCounts);

  if (reconciledRows.length === 0) {
    return {
      importedCards: 0,
      importedEntries: 0,
      needsManualMatch,
      skippedRows: needsManualMatch,
    };
  }

  for (const row of reconciledRows) {
    const quantity = Math.max(0, Math.trunc(row.quantityToImport));
    if (quantity <= 0) {
      continue;
    }

    console.info("vault.import.item", {
      userId,
      cardPrintId: row.cardId,
      quantity,
    });

    try {
      const { anchor, insertedAnchorId } = await resolveActiveVaultAnchor({
        client,
        userId,
        cardId: row.cardId,
        createData: {
          gvId: row.gvId,
          quantity,
          conditionLabel: row.condition,
          acquisitionCost: row.acquisitionCost,
          createdAt: row.createdAt,
          notes: row.notes,
          name: row.name,
          setName: row.setName,
        },
      });

      await createCanonicalImportInstances(adminClient, userId, {
        ...row,
        quantityToImport: quantity,
      }, anchor.id);

      try {
        // TEMP COMPATIBILITY MIRROR (to be removed after read cutover)
        await mirrorLegacyBucketQuantity(client, {
          ...row,
          quantityToImport: quantity,
        }, anchor, insertedAnchorId);
      } catch (error) {
        console.error("vault.import.bucket_mirror_failed", {
          userId,
          cardPrintId: row.cardId,
          quantity,
          error,
        });
      }
    } catch (error) {
      console.error("vault.import.instance_create_failed", {
        userId,
        cardPrintId: row.cardId,
        quantity,
        error,
      });
      throw error instanceof Error ? error : new Error("Canonical import create failed.");
    }
  }

  const importedCards = reconciledRows.reduce((sum, row) => sum + row.quantityToImport, 0);
  const importedEntries = reconciledRows.length;

  console.info("[import:write]", {
    importedCards,
    importedEntries,
    needsManualMatch,
  });

  return {
    importedCards,
    importedEntries,
    needsManualMatch,
    skippedRows: needsManualMatch,
  };
}

export async function importVaultItems(rows: MatchResult[]): Promise<ImportVaultItemsResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Sign in required.");
  }

  const result = await importVaultItemsForUser({
    client,
    adminClient: createServerAdminClient(),
    userId: user.id,
    rows,
  });

  revalidatePath("/vault");
  revalidatePath("/wall");
  revalidatePath("/founder");

  return result;
}
