import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export type VaultQuantityChange =
  | {
      type: "increment";
      client: SupabaseClient;
      userId: string;
      itemId: string;
    }
  | {
      type: "decrement";
      client: SupabaseClient;
      userId: string;
      itemId: string;
    };

export type UpdateVaultItemQuantityResult =
  | {
      status: "incremented" | "decremented";
      itemId: string;
      quantity: number;
    }
  | {
      status: "removed";
      itemId: string;
    };

function formatVaultQuantityError(step: string, error: PostgrestError) {
  const parts = [
    `[${step}]`,
    error.message,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.join(" | ");
}

async function archiveVaultItem(
  change: VaultQuantityChange,
  currentRow: { card_id: string | null; gv_id: string | null },
): Promise<UpdateVaultItemQuantityResult> {
  const { error: archiveError } = await change.client
    .from("vault_items")
    .update({
      qty: 0,
      archived_at: new Date().toISOString(),
    })
    .eq("id", change.itemId)
    .eq("user_id", change.userId)
    .is("archived_at", null);

  if (archiveError) {
    throw new Error(formatVaultQuantityError("vault_items.archive", archiveError));
  }

  console.info("[vault:qty]", {
    user_id: change.userId,
    item_id: change.itemId,
    card_id: currentRow.card_id,
    gv_id: currentRow.gv_id,
    action: "archive",
    quantity: 0,
  });

  return {
    status: "removed",
    itemId: change.itemId,
  };
}

export async function updateVaultItemQuantity(change: VaultQuantityChange): Promise<UpdateVaultItemQuantityResult> {
  const actionLabel = change.type === "increment" ? "increment" : "decrement";
  const delta = change.type === "increment" ? 1 : -1;

  const { data: row, error: readError } = await change.client
    .from("vault_items")
    .select("id,card_id,gv_id,qty")
    .eq("id", change.itemId)
    .eq("user_id", change.userId)
    .is("archived_at", null)
    .maybeSingle();

  if (readError) {
    throw new Error(formatVaultQuantityError("vault_items.read-before-change", readError));
  }

  if (!row) {
    console.info("[vault:qty]", {
      user_id: change.userId,
      item_id: change.itemId,
      action: "remove",
    });

    return {
      status: "removed",
      itemId: change.itemId,
    };
  }

  const currentQty = typeof row.qty === "number" ? row.qty : 0;
  if (currentQty <= 0) {
    return archiveVaultItem(change, row);
  }

  const newQty = Math.max(0, currentQty + delta);

  if (newQty === 0) {
    return archiveVaultItem(change, row);
  }

  const { error: updateError } = await change.client
    .from("vault_items")
    .update({ qty: newQty })
    .eq("id", change.itemId)
    .eq("user_id", change.userId)
    .is("archived_at", null);

  if (updateError) {
    throw new Error(formatVaultQuantityError("vault_items.update-quantity", updateError));
  }

  console.info("[vault:qty]", {
    user_id: change.userId,
    item_id: change.itemId,
    gv_id: row.gv_id,
    action: actionLabel,
    quantity: newQty,
  });

  return {
    status: change.type === "increment" ? "incremented" : "decremented",
    itemId: change.itemId,
    quantity: newQty,
  };
}
