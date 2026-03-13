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
  const actionLabel = change.type === "increment" ? "increment" : "decrement";
  const delta = change.type === "increment" ? 1 : -1;

  const { data: row, error: readError } = await change.client
    .from("vault_items")
    .select("id,gv_id,qty")
    .eq("id", change.itemId)
    .eq("user_id", change.userId)
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
    const { error: deleteError } = await change.client
      .from("vault_items")
      .delete()
      .eq("id", change.itemId)
      .eq("user_id", change.userId);

    if (deleteError) {
      throw new Error(formatVaultQuantityError("vault_items.delete-corrupt-nonpositive", deleteError));
    }

    console.info("[vault:qty]", {
      user_id: change.userId,
      item_id: change.itemId,
      gv_id: row.gv_id,
      action: "remove-corrupt",
      quantity: 0,
    });

    return {
      status: "removed",
      itemId: change.itemId,
    };
  }

  const newQty = Math.max(0, currentQty + delta);

  if (newQty === 0) {
    const { error: deleteError } = await change.client
      .from("vault_items")
      .delete()
      .eq("id", change.itemId)
      .eq("user_id", change.userId);

    if (deleteError) {
      throw new Error(formatVaultQuantityError("vault_items.delete-on-zero", deleteError));
    }

    console.info("[vault:qty]", {
      user_id: change.userId,
      item_id: change.itemId,
      gv_id: row.gv_id,
      action: "remove",
      quantity: 0,
    });

    return {
      status: "removed",
      itemId: change.itemId,
    };
  }

  const { error: updateError } = await change.client
    .from("vault_items")
    .update({ qty: newQty })
    .eq("id", change.itemId)
    .eq("user_id", change.userId);

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
