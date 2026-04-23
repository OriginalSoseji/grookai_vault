"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  executeOwnerWriteV1,
  getActiveOwnerWriteContextV1,
} from "@/lib/contracts/execute_owner_write_v1";
import {
  createImportResultSummaryProofV1,
  createVaultCardCountBatchProofV1,
} from "@/lib/contracts/owner_write_proofs_v1";
import { IMPORT_CONDITION_OPTIONS, type ImportCondition } from "@/lib/import/normalizeRow";
import { createServerComponentClient } from "@/lib/supabase/server";
import { assertAuthenticatedVaultUser } from "@/lib/vault/assertAuthenticatedVaultUser";
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

type ImportCountProofTarget = {
  cardPrintId: string;
  expectedCount: number;
};

type ImportVaultItemsExecutionParams = {
  client: SupabaseClient;
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

function requireImportOwnerWriteContext() {
  const context = getActiveOwnerWriteContextV1();
  if (!context) {
    throw new Error("OWNER_WRITE: importVaultItems mutation helper called outside executeOwnerWriteV1");
  }
  return context;
}

// LOCK: Import write helpers must only execute from inside executeOwnerWriteV1.
async function mirrorLegacyBucketQuantity(
  client: SupabaseClient,
  row: AggregatedImportRow,
  anchor: ActiveVaultAnchor,
  insertedAnchorId: string | null,
) {
  requireImportOwnerWriteContext();

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

function buildImportCountProofTargets(
  rows: AggregatedImportRow[],
  existingOwnedCounts: Map<string, number>,
) {
  return rows
    .map((row) => ({
      cardPrintId: row.cardId,
      expectedCount: (existingOwnedCounts.get(row.cardId) ?? 0) + row.quantityToImport,
    }))
    .sort((left, right) => left.cardPrintId.localeCompare(right.cardPrintId));
}

async function createCanonicalImportInstances(
  userId: string,
  row: AggregatedImportRow,
  legacyVaultItemId: string,
) {
  const { adminClient } = requireImportOwnerWriteContext();

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
  userId,
  rows,
}: ImportVaultItemsExecutionParams): Promise<ImportVaultItemsResult> {
  const normalizedUserId = userId.trim();
  await assertAuthenticatedVaultUser(client, normalizedUserId);

  console.info("vault.import.begin", {
    userId: normalizedUserId,
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
    normalizedUserId,
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

  const importProofTargets = buildImportCountProofTargets(
    reconciledRows,
    existingOwnedCounts,
  );
  const importedCards = reconciledRows.reduce((sum, row) => sum + row.quantityToImport, 0);
  const importedEntries = reconciledRows.length;

  return executeOwnerWriteV1<ImportVaultItemsResult>({
    execution_name: "import_vault_items",
    actor_id: normalizedUserId,
    write: async (context) => {
      context.setMetadata("import_source", "importVaultItems");
      context.setMetadata("import_count", rows.length);
      context.setMetadata("import_count_proof_targets", importProofTargets);
      context.setMetadata("expected_imported_cards", importedCards);
      context.setMetadata("expected_imported_entries", importedEntries);
      context.setMetadata("expected_needs_manual_match", needsManualMatch);
      context.setMetadata("expected_skipped_rows", needsManualMatch);

      for (const row of reconciledRows) {
        const quantity = Math.max(0, Math.trunc(row.quantityToImport));
        if (quantity <= 0) {
          continue;
        }

        console.info("vault.import.item", {
          userId: normalizedUserId,
          cardPrintId: row.cardId,
          quantity,
        });

        try {
          const { anchor, insertedAnchorId } = await resolveActiveVaultAnchor({
            client,
            userId: normalizedUserId,
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

          await createCanonicalImportInstances(
            normalizedUserId,
            {
              ...row,
              quantityToImport: quantity,
            },
            anchor.id,
          );

          try {
            // TEMP COMPATIBILITY MIRROR (to be removed after read cutover)
            await mirrorLegacyBucketQuantity(
              client,
              {
                ...row,
                quantityToImport: quantity,
              },
              anchor,
              insertedAnchorId,
            );
          } catch (error) {
            console.error("vault.import.bucket_mirror_failed", {
              userId: normalizedUserId,
              cardPrintId: row.cardId,
              quantity,
              error,
            });
          }
        } catch (error) {
          console.error("vault.import.instance_create_failed", {
            userId: normalizedUserId,
            cardPrintId: row.cardId,
            quantity,
            error,
          });
          throw error instanceof Error ? error : new Error("Canonical import create failed.");
        }
      }

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
    },
    proofs: [
      createVaultCardCountBatchProofV1<ImportVaultItemsResult>(({ getMetadata }) => {
        return getMetadata<ImportCountProofTarget[]>("import_count_proof_targets") ?? null;
      }),
      createImportResultSummaryProofV1<ImportVaultItemsResult>(({ getMetadata }) => {
        const expectedImportedCards = getMetadata<number>("expected_imported_cards");
        const expectedImportedEntries = getMetadata<number>("expected_imported_entries");
        const expectedNeedsManualMatch = getMetadata<number>("expected_needs_manual_match");
        const expectedSkippedRows = getMetadata<number>("expected_skipped_rows");

        if (
          typeof expectedImportedCards !== "number" ||
          typeof expectedImportedEntries !== "number"
        ) {
          return null;
        }

        return {
          importedCards: expectedImportedCards,
          importedEntries: expectedImportedEntries,
          needsManualMatch:
            typeof expectedNeedsManualMatch === "number"
              ? expectedNeedsManualMatch
              : undefined,
          skippedRows:
            typeof expectedSkippedRows === "number" ? expectedSkippedRows : undefined,
        };
      }),
    ],
  });
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
    userId: user.id,
    rows,
  });

  revalidatePath("/vault");
  revalidatePath("/wall");
  revalidatePath("/founder");

  return result;
}
