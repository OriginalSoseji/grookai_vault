"use server";

import { revalidatePath } from "next/cache";
import { IMPORT_CONDITION_OPTIONS, type ImportCondition } from "@/lib/import/normalizeRow";
import { createServerComponentClient } from "@/lib/supabase/server";
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

type ExistingVaultRow = {
  id: string;
  gv_id: string;
  qty: number | null;
};

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

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

async function fetchExistingVaultRows(client: ReturnType<typeof createServerComponentClient>, userId: string, gvIds: string[]) {
  const existingByGvId = new Map<string, ExistingVaultRow>();

  for (const gvIdChunk of chunkArray(gvIds, 100)) {
    const { data, error } = await client
      .from("vault_items")
      .select("id,gv_id,qty")
      .eq("user_id", userId)
      .in("gv_id", gvIdChunk);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as ExistingVaultRow[]) {
      existingByGvId.set(row.gv_id, row);
    }
  }

  return existingByGvId;
}

function reconcileAggregatedRows(rows: AggregatedImportRow[], existingByGvId: Map<string, ExistingVaultRow>) {
  return rows
    .map((row) => {
      const existingQty = existingByGvId.get(row.gvId)?.qty ?? 0;
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

export async function importVaultItems(rows: MatchResult[]): Promise<ImportVaultItemsResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Sign in required.");
  }

  const aggregatedRows = mergeImportRows(rows);
  const needsManualMatch = rows.filter((row) => row.status !== "matched").length;

  if (aggregatedRows.length === 0) {
    revalidatePath("/vault");
    return {
      importedCards: 0,
      importedEntries: 0,
      needsManualMatch,
      skippedRows: needsManualMatch,
    };
  }

  const existingByGvId = await fetchExistingVaultRows(
    client,
    user.id,
    aggregatedRows.map((row) => row.gvId),
  );
  const reconciledRows = reconcileAggregatedRows(aggregatedRows, existingByGvId);

  if (reconciledRows.length === 0) {
    revalidatePath("/vault");
    revalidatePath("/wall");
    revalidatePath("/founder");
    return {
      importedCards: 0,
      importedEntries: 0,
      needsManualMatch,
      skippedRows: needsManualMatch,
    };
  }

  const rowsToIncrement = reconciledRows.filter((row) => existingByGvId.has(row.gvId));
  const rowsToInsert = reconciledRows.filter((row) => !existingByGvId.has(row.gvId));

  for (const row of rowsToIncrement) {
    const itemId = existingByGvId.get(row.gvId)?.id;
    if (!itemId || row.quantityToImport <= 0) {
      continue;
    }

    const { error } = await client.rpc("vault_inc_qty", {
      item_id: itemId,
      inc: row.quantityToImport,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  if (rowsToInsert.length > 0) {
    const insertPayload = rowsToInsert.map((row) => ({
      user_id: user.id,
      card_id: row.cardId,
      gv_id: row.gvId,
      qty: row.quantityToImport,
      condition_label: row.condition,
      acquisition_cost: row.acquisitionCost,
      created_at: row.createdAt,
      notes: row.notes,
      name: row.name,
      set_name: row.setName,
    }));

    const { data: insertedRows, error: insertError } = await client
      .from("vault_items")
      .upsert(insertPayload, {
        onConflict: "user_id,gv_id",
        ignoreDuplicates: true,
      })
      .select("gv_id");

    if (insertError) {
      throw new Error(insertError.message);
    }

    const insertedGvIds = new Set(
      ((insertedRows ?? []) as Array<{ gv_id: string | null }>)
        .map((row) => row.gv_id ?? "")
        .filter(Boolean),
    );
    const conflictedRows = rowsToInsert.filter((row) => !insertedGvIds.has(row.gvId));

    if (conflictedRows.length > 0) {
      const refreshedExistingByGvId = await fetchExistingVaultRows(
        client,
        user.id,
        conflictedRows.map((row) => row.gvId),
      );

      for (const row of conflictedRows) {
        const existing = refreshedExistingByGvId.get(row.gvId);
        if (!existing?.id) {
          continue;
        }

        const remainingQuantity = row.desiredQuantity - (existing.qty ?? 0);
        if (remainingQuantity <= 0) {
          continue;
        }

        const { error } = await client.rpc("vault_inc_qty", {
          item_id: existing.id,
          inc: remainingQuantity,
        });

        if (error) {
          throw new Error(error.message);
        }
      }
    }
  }

  const importedCards = reconciledRows.reduce((sum, row) => sum + row.quantityToImport, 0);
  const importedEntries = reconciledRows.length;

  console.info("[import:write]", {
    importedCards,
    importedEntries,
    needsManualMatch,
  });

  revalidatePath("/vault");
  revalidatePath("/wall");
  revalidatePath("/founder");

  return {
    importedCards,
    importedEntries,
    needsManualMatch,
    skippedRows: needsManualMatch,
  };
}
