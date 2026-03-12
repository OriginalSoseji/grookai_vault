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

export async function updateVaultItemQuantity(change: VaultQuantityChange): Promise<UpdateVaultItemQuantityResult> {
  const inc = change.type === "increment" ? 1 : -1;
  const actionLabel = change.type === "increment" ? "increment" : "decrement";

  const { error: quantityError } = await change.client.rpc("vault_inc_qty", {
    item_id: change.itemId,
    inc,
  });

  if (quantityError) {
    throw new Error(formatVaultQuantityError("vault_items.change-quantity", quantityError));
  }

  const { data: row, error: readbackError } = await change.client
    .from("vault_items")
    .select("id,qty")
    .eq("id", change.itemId)
    .eq("user_id", change.userId)
    .maybeSingle();

  if (readbackError) {
    throw new Error(formatVaultQuantityError("vault_items.readback-after-change", readbackError));
  }

  if (!row) {
    console.info("[vault:qty]", {
      user_id: change.userId,
      item_id: change.itemId,
      action: "remove",
      delta: inc,
    });

    return {
      status: "removed",
      itemId: change.itemId,
    };
  }

  const quantity = typeof row.qty === "number" ? row.qty : 0;
  console.info("[vault:qty]", {
    user_id: change.userId,
    item_id: change.itemId,
    action: actionLabel,
    delta: inc,
    quantity,
  });

  return {
    status: change.type === "increment" ? "incremented" : "decremented",
    itemId: change.itemId,
    quantity,
  };
}
