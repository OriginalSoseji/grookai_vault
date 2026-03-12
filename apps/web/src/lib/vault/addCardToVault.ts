import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { updateVaultItemQuantity } from "@/lib/vault/updateVaultItemQuantity";

type AddCardToVaultParams = {
  client: SupabaseClient;
  userId: string;
  cardId: string;
  gvId: string;
  name: string;
  setName?: string;
  imageUrl?: string;
};

export type AddCardToVaultResult = "added" | "incremented" | "exists";

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

export async function addCardToVault({
  client,
  userId,
  cardId,
  gvId,
  name,
  setName,
  imageUrl,
}: AddCardToVaultParams): Promise<AddCardToVaultResult> {
  const normalizedName = name.trim() || "Unknown card";
  const normalizedSetName = setName?.trim() || "";
  const normalizedImageUrl = imageUrl ?? null;

  const { data: insertedRows, error: upsertError } = await client
    .from("vault_items")
    .upsert(
      {
        user_id: userId,
        gv_id: gvId,
        card_id: cardId,
        name: normalizedName,
        set_name: normalizedSetName,
        photo_url: normalizedImageUrl,
        condition_label: "NM",
      },
      {
        onConflict: "user_id,gv_id",
        ignoreDuplicates: true,
      },
    )
    .select("id");

  if (upsertError) {
    throw new Error(formatVaultWriteError("vault_items.upsert-user-gv-id", upsertError));
  }

  const inserted = Array.isArray(insertedRows) ? insertedRows[0] : null;
  if (inserted?.id) {
    console.info("[vault:add]", {
      user_id: userId,
      gv_id: gvId,
      card_id: cardId,
      action: "insert",
    });
    return "added";
  }

  const { data: existing, error: existingError } = await client
    .from("vault_items")
    .select("id")
    .eq("user_id", userId)
    .eq("gv_id", gvId)
    .maybeSingle();

  if (existingError) {
    throw new Error(formatVaultWriteError("vault_items.select-after-conflict", existingError));
  }

  if (!existing?.id) {
    throw new Error("[vault_items.select-after-conflict] Existing GV-ID row could not be resolved after conflict.");
  }

  const incrementResult = await updateVaultItemQuantity({
    type: "increment",
    client,
    userId,
    itemId: existing.id,
  });

  if (incrementResult.status !== "incremented") {
    throw new Error("[vault_items.increment-existing] Existing vault row was not incremented as expected.");
  }

  console.info("[vault:add]", {
    user_id: userId,
    gv_id: gvId,
    card_id: cardId,
    action: "update",
  });

  return "incremented";
}
