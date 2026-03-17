import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createServerAdminClient } from "@/lib/supabase/admin";

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

type ActiveVaultInstanceRow = {
  id: string;
  gv_vi_id: string | null;
  card_print_id: string | null;
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

async function selectActiveVaultInstanceForArchive({
  userId,
  cardPrintId,
}: {
  userId: string;
  cardPrintId: string;
}) {
  const adminClient = createServerAdminClient();
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select("id,gv_vi_id,card_print_id")
    .eq("user_id", userId)
    .eq("card_print_id", cardPrintId)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(formatVaultQuantityError("vault_item_instances.select-active-for-archive", error));
  }

  return (data ?? null) as ActiveVaultInstanceRow | null;
}

async function archiveVaultInstance(change: VaultQuantityChange, cardPrintId: string) {
  console.info("vault.archive.begin", {
    userId: change.userId,
    gvviId: null,
    cardPrintId,
    vaultItemId: change.itemId,
  });

  const selectedInstance = await selectActiveVaultInstanceForArchive({
    userId: change.userId,
    cardPrintId,
  });

  if (!selectedInstance?.id) {
    const missingInstanceError = new Error("No active vault instance found for archive.");
    console.error("vault.archive.instance_failed", {
      userId: change.userId,
      gvviId: null,
      cardPrintId,
      error: missingInstanceError,
    });
    throw missingInstanceError;
  }

  console.info("vault.archive.selected_instance", {
    userId: change.userId,
    selectedInstanceId: selectedInstance.id,
    selectedGvviId: selectedInstance.gv_vi_id ?? null,
    cardPrintId,
  });

  const adminClient = createServerAdminClient();
  const { error: archiveError } = await adminClient
    .from("vault_item_instances")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", selectedInstance.id)
    .eq("user_id", change.userId)
    .is("archived_at", null);

  if (archiveError) {
    console.error("vault.archive.instance_failed", {
      userId: change.userId,
      gvviId: selectedInstance.gv_vi_id ?? null,
      cardPrintId,
      error: archiveError,
    });
    throw new Error(formatVaultQuantityError("vault_item_instances.archive", archiveError));
  }

  return selectedInstance;
}

async function mirrorArchiveVaultItem(
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
  const newQty = Math.max(0, currentQty + delta);

  if (change.type === "decrement") {
    if (!row.card_id) {
      throw new Error("GVVI archive failed: missing cardPrintId on legacy vault bucket.");
    }

    await archiveVaultInstance(change, row.card_id);

    try {
      if (newQty <= 0) {
        return await mirrorArchiveVaultItem(change, row);
      }

      const { error: mirrorError } = await change.client
        .from("vault_items")
        .update({ qty: newQty })
        .eq("id", change.itemId)
        .eq("user_id", change.userId)
        .is("archived_at", null);

      if (mirrorError) {
        throw mirrorError;
      }

      console.info("[vault:qty]", {
        user_id: change.userId,
        item_id: change.itemId,
        gv_id: row.gv_id,
        action: actionLabel,
        quantity: newQty,
      });
    } catch (mirrorError) {
      console.error("vault.archive.bucket_mirror_failed", {
        userId: change.userId,
        gvviId: null,
        cardPrintId: row.card_id,
        error: mirrorError,
      });
    }

    if (newQty <= 0) {
      return {
        status: "removed",
        itemId: change.itemId,
      };
    }

    return {
      status: "decremented",
      itemId: change.itemId,
      quantity: newQty,
    };
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
