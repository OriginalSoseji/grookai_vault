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

type LegacyVaultBucketRow = {
  id: string;
  card_id: string | null;
  gv_id: string | null;
  qty: number | null;
  condition_label?: string | null;
  name?: string | null;
  set_name?: string | null;
  photo_url?: string | null;
};

type VaultInstanceCreateRow = {
  id: string;
  gv_vi_id: string | null;
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

async function createVaultInstanceForIncrement(
  change: VaultQuantityChange,
  row: LegacyVaultBucketRow,
): Promise<VaultInstanceCreateRow> {
  const cardPrintId = row.card_id?.trim() ?? "";
  if (!cardPrintId) {
    throw new Error("GVVI create failed: missing cardPrintId on legacy vault bucket.");
  }

  const adminClient = createServerAdminClient();
  const rpcArgs = {
    p_user_id: change.userId,
    p_card_print_id: cardPrintId,
    p_condition_label: row.condition_label?.trim() || null,
    p_name: row.name?.trim() || null,
    p_set_name: row.set_name?.trim() || null,
    p_photo_url: row.photo_url ?? null,
  };

  const { data, error } = await adminClient.rpc("admin_vault_instance_create_v1", rpcArgs);

  if (error) {
    throw new Error(formatVaultQuantityError("vault_item_instances.create-for-increment", error));
  }

  const createdInstance = Array.isArray(data) ? data[0] : data;
  const createdRow = (createdInstance ?? null) as VaultInstanceCreateRow | null;
  if (!createdRow?.id) {
    throw new Error("GVVI create failed: increment RPC returned no instance row.");
  }

  return createdRow;
}

export async function updateVaultItemQuantity(change: VaultQuantityChange): Promise<UpdateVaultItemQuantityResult> {
  const actionLabel = change.type === "increment" ? "increment" : "decrement";
  const delta = change.type === "increment" ? 1 : -1;

  const { data: row, error: readError } = await change.client
    .from("vault_items")
    .select("id,card_id,gv_id,qty,condition_label,name,set_name,photo_url")
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

  const currentRow = (row ?? null) as LegacyVaultBucketRow | null;
  if (!currentRow) {
    return {
      status: "removed",
      itemId: change.itemId,
    };
  }

  const currentQty = typeof currentRow.qty === "number" ? currentRow.qty : 0;
  const newQty = Math.max(0, currentQty + delta);

  if (change.type === "decrement") {
    if (!currentRow.card_id) {
      throw new Error("GVVI archive failed: missing cardPrintId on legacy vault bucket.");
    }

    await archiveVaultInstance(change, currentRow.card_id);

    try {
      if (newQty <= 0) {
        return await mirrorArchiveVaultItem(change, currentRow);
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
        gv_id: currentRow.gv_id,
        action: actionLabel,
        quantity: newQty,
      });
    } catch (mirrorError) {
      console.error("vault.archive.bucket_mirror_failed", {
        userId: change.userId,
        gvviId: null,
        cardPrintId: currentRow.card_id,
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

  const createdInstance = await createVaultInstanceForIncrement(change, currentRow);

  try {
    const { error: updateError } = await change.client
      .from("vault_items")
      .update({ qty: newQty })
      .eq("id", change.itemId)
      .eq("user_id", change.userId)
      .is("archived_at", null);

    if (updateError) {
      throw updateError;
    }
  } catch (mirrorError) {
    console.error("vault.increment.bucket_mirror_failed", {
      userId: change.userId,
      gvviId: createdInstance.gv_vi_id ?? null,
      cardPrintId: currentRow.card_id ?? null,
      error: mirrorError,
    });
  }

  console.info("[vault:qty]", {
    user_id: change.userId,
    item_id: change.itemId,
    gv_id: currentRow.gv_id,
    action: actionLabel,
    quantity: newQty,
    gv_vi_id: createdInstance.gv_vi_id ?? null,
  });

  return {
    status: change.type === "increment" ? "incremented" : "decremented",
    itemId: change.itemId,
    quantity: newQty,
  };
}
