"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import { IMPORT_CONDITION_OPTIONS, type ImportCondition } from "@/lib/import/normalizeRow";
import type { ImportVaultItemsResult, MatchResult } from "@/types/import";

type AggregatedImportRow = {
  cardId: string;
  gvId: string;
  name: string;
  setName: string | null;
  quantity: number;
  condition: ImportCondition;
  acquisitionCost: number | null;
  createdAt: string | null;
  notes: string | null;
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

function mergeImportRows(rows: MatchResult[]) {
  const merged = new Map<string, AggregatedImportRow>();

  for (const row of rows) {
    if (row.status !== "matched" || !row.match?.card_id || !row.match.gv_id) {
      continue;
    }

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
      quantity: (current?.quantity ?? 0) + Math.max(1, row.row.quantity),
      condition: current?.condition ?? coerceCondition(row.row.condition),
      acquisitionCost: nextCost,
      createdAt: nextCreatedAt,
      notes: nextNotes,
    });
  }

  return Array.from(merged.values());
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

  const gvIds = aggregatedRows.map((row) => row.gvId);
  const { data: existingRows, error: existingError } = await client
    .from("vault_items")
    .select("id,gv_id")
    .eq("user_id", user.id)
    .in("gv_id", gvIds);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingByGvId = new Map(
    ((existingRows ?? []) as Array<{ id: string; gv_id: string }>).map((row) => [row.gv_id, row.id]),
  );

  const rowsToIncrement = aggregatedRows.filter((row) => existingByGvId.has(row.gvId));
  const rowsToInsert = aggregatedRows.filter((row) => !existingByGvId.has(row.gvId));

  for (const row of rowsToIncrement) {
    const itemId = existingByGvId.get(row.gvId);
    if (!itemId) {
      continue;
    }

    const { error } = await client.rpc("vault_inc_qty", {
      item_id: itemId,
      inc: row.quantity,
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
      qty: row.quantity,
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
      for (const gvIdChunk of chunkArray(conflictedRows.map((row) => row.gvId), 100)) {
        const { data: conflictedExistingRows, error: conflictedExistingError } = await client
          .from("vault_items")
          .select("id,gv_id")
          .eq("user_id", user.id)
          .in("gv_id", gvIdChunk);

        if (conflictedExistingError) {
          throw new Error(conflictedExistingError.message);
        }

        for (const row of (conflictedExistingRows ?? []) as Array<{ id: string; gv_id: string }>) {
          existingByGvId.set(row.gv_id, row.id);
        }
      }

      for (const row of conflictedRows) {
        const itemId = existingByGvId.get(row.gvId);
        if (!itemId) {
          continue;
        }

        const { error } = await client.rpc("vault_inc_qty", {
          item_id: itemId,
          inc: row.quantity,
        });

        if (error) {
          throw new Error(error.message);
        }
      }
    }
  }

  revalidatePath("/vault");
  revalidatePath("/wall");
  revalidatePath("/founder");

  return {
    importedCards: aggregatedRows.reduce((sum, row) => sum + row.quantity, 0),
    importedEntries: aggregatedRows.length,
    needsManualMatch,
    skippedRows: needsManualMatch,
  };
}
