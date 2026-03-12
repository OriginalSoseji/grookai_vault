import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

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
  const { data: existing, error: existingError } = await client
    .from("vault_items")
    .select("id,qty")
    .eq("user_id", userId)
    .eq("gv_id", gvId)
    .maybeSingle();

  if (existingError) {
    throw new Error(formatVaultWriteError("vault_items.select-existing", existingError));
  }

  if (existing) {
    const nextQty = ((existing.qty as number | null) ?? 0) + 1;
    const { error: updateError } = await client
      .from("vault_items")
      .update({
        qty: nextQty,
        gv_id: gvId,
        card_id: cardId,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(formatVaultWriteError("vault_items.update-existing", updateError));
    }

    return "incremented";
  }

  const { error: insertError } = await client.from("vault_items").insert({
    user_id: userId,
    gv_id: gvId,
    card_id: cardId,
    qty: 1,
    name,
    set_name: setName ?? "",
    photo_url: imageUrl ?? null,
    condition_label: "NM",
  });

  if (insertError) {
    const maybeCode = "code" in insertError ? insertError.code : undefined;
    if (maybeCode === "23505") {
      return "exists";
    }

    throw new Error(formatVaultWriteError("vault_items.insert", insertError));
  }

  return "added";
}
