import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createServerAdminClient } from "@/lib/supabase/admin";

type AddCardToVaultParams = {
  client: SupabaseClient;
  userId: string;
  cardPrintId: string;
  gvId: string;
  name: string;
  setName?: string;
  imageUrl?: string;
};

type VaultInstanceCreateRow = {
  id: string;
  gv_vi_id: string | null;
};

type LegacyBucketRow = {
  id: string;
  qty: number | null;
};

export type AddCardToVaultResult = {
  success: true;
  gvvi_id: string | null;
};

function formatVaultWriteError(step: string, error: PostgrestError) {
  const parts = [
    `[${step}]`,
    error.message,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.join(" | ");
}

async function mirrorLegacyVaultBucket({
  client,
  userId,
  cardPrintId,
  gvId,
  normalizedName,
  normalizedSetName,
  normalizedImageUrl,
}: {
  client: SupabaseClient;
  userId: string;
  cardPrintId: string;
  gvId: string;
  normalizedName: string;
  normalizedSetName: string;
  normalizedImageUrl: string | null;
}) {
  const { data: activeExisting, error: activeExistingError } = await client
    .from("vault_items")
    .select("id,qty")
    .eq("user_id", userId)
    .eq("card_id", cardPrintId)
    .is("archived_at", null)
    .maybeSingle();

  if (activeExistingError) {
    throw new Error(formatVaultWriteError("vault_items.select-active-existing", activeExistingError));
  }

  const activeRow = activeExisting as LegacyBucketRow | null;
  if (activeRow?.id) {
    const { error: updateError } = await client
      .from("vault_items")
      .update({
        qty: (typeof activeRow.qty === "number" ? activeRow.qty : 0) + 1,
      })
      .eq("id", activeRow.id)
      .eq("user_id", userId)
      .is("archived_at", null);

    if (updateError) {
      throw new Error(formatVaultWriteError("vault_items.increment-existing-active", updateError));
    }

    console.info("[vault:add:mirror]", {
      user_id: userId,
      gv_id: gvId,
      card_print_id: cardPrintId,
      action: "update",
    });

    return;
  }

  const { data: insertedRows, error: insertError } = await client
    .from("vault_items")
    .insert({
      user_id: userId,
      gv_id: gvId,
      card_id: cardPrintId,
      name: normalizedName,
      set_name: normalizedSetName,
      photo_url: normalizedImageUrl,
      condition_label: "NM",
      qty: 1,
    })
    .select("id");

  if (!insertError) {
    const inserted = Array.isArray(insertedRows) ? insertedRows[0] : null;
    if (inserted?.id) {
      console.info("[vault:add:mirror]", {
        user_id: userId,
        gv_id: gvId,
        card_print_id: cardPrintId,
        action: "insert",
      });
      return;
    }
  }

  if (insertError && insertError.code !== "23505") {
    throw new Error(formatVaultWriteError("vault_items.insert-active-episode", insertError));
  }

  const { data: existing, error: existingError } = await client
    .from("vault_items")
    .select("id,qty")
    .eq("user_id", userId)
    .eq("card_id", cardPrintId)
    .is("archived_at", null)
    .maybeSingle();

  if (existingError) {
    throw new Error(formatVaultWriteError("vault_items.select-after-active-conflict", existingError));
  }

  const conflictRow = existing as LegacyBucketRow | null;
  if (!conflictRow?.id) {
    throw new Error("[vault_items.select-after-active-conflict] Active card row could not be resolved after conflict.");
  }

  const { error: updateError } = await client
    .from("vault_items")
    .update({
      qty: (typeof conflictRow.qty === "number" ? conflictRow.qty : 0) + 1,
    })
    .eq("id", conflictRow.id)
    .eq("user_id", userId)
    .is("archived_at", null);

  if (updateError) {
    throw new Error(formatVaultWriteError("vault_items.increment-existing-active", updateError));
  }

  console.info("[vault:add:mirror]", {
    user_id: userId,
    gv_id: gvId,
    card_print_id: cardPrintId,
    action: "update",
  });
}

export async function addCardToVault({
  client,
  userId,
  cardPrintId,
  gvId,
  name,
  setName,
  imageUrl,
}: AddCardToVaultParams): Promise<AddCardToVaultResult> {
  if (!userId?.trim()) {
    throw new Error("GVVI create failed: missing authenticated user id.");
  }

  if (!cardPrintId?.trim()) {
    throw new Error("GVVI create failed: missing cardPrintId.");
  }

  const normalizedName = name.trim() || "Unknown card";
  const normalizedSetName = setName?.trim() || "";
  const normalizedImageUrl = imageUrl ?? null;
  const adminClient = createServerAdminClient();
  const rpcArgs = {
    p_user_id: userId,
    p_card_print_id: cardPrintId,
    p_condition_label: "NM",
    p_name: normalizedName,
    p_set_name: normalizedSetName || null,
    p_photo_url: normalizedImageUrl,
  };

  console.info("vault.addCardToVault.begin", {
    userId,
    cardPrintId,
    canonicalClient: "server_admin_client",
    mirrorClient: "authenticated_server_client",
    rpcArgs,
  });

  const { data: instance, error: instanceError } = await adminClient.rpc("admin_vault_instance_create_v1", rpcArgs);

  if (instanceError) {
    console.error("vault.addCardToVault.instance_rpc_failed", {
      userId,
      cardPrintId,
      error: instanceError,
    });
    throw new Error(`GVVI create failed: ${instanceError.message}`);
  }

  const createdInstance = Array.isArray(instance) ? instance[0] : instance;
  const createdRow = (createdInstance ?? null) as VaultInstanceCreateRow | null;
  if (!createdRow?.id) {
    throw new Error("GVVI create failed: RPC returned no instance row.");
  }

  console.info("[vault:add]", {
    user_id: userId,
    gv_id: gvId,
    card_print_id: cardPrintId,
    gv_vi_id: createdRow.gv_vi_id,
    action: "instance_create",
  });

  try {
    // TEMP COMPATIBILITY MIRROR (to be removed after read cutover)
    await mirrorLegacyVaultBucket({
      client,
      userId,
      cardPrintId,
      gvId,
      normalizedName,
      normalizedSetName,
      normalizedImageUrl,
    });
  } catch (mirrorError) {
    console.error("vault.addCardToVault.bucket_mirror_failed", {
      userId,
      cardPrintId,
      gvvi_id: createdRow.gv_vi_id ?? null,
      error: mirrorError,
    });
  }

  return {
    success: true,
    gvvi_id: createdRow.gv_vi_id ?? null,
  };
}
