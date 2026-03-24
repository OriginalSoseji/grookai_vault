"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import { normalizeVaultIntent, type VaultIntent } from "@/lib/network/intent";

export type SaveVaultItemIntentInput = {
  itemId: string;
  intent: VaultIntent;
};

export type SaveVaultItemIntentResult =
  | {
      ok: true;
      itemId: string;
      intent: VaultIntent;
    }
  | {
      ok: false;
      itemId: string;
      message: string;
    };

export async function saveVaultItemIntentAction(
  input: SaveVaultItemIntentInput,
): Promise<SaveVaultItemIntentResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Sign in required.",
    };
  }

  const nextIntent = normalizeVaultIntent(input.intent);
  if (!input.itemId.trim() || !nextIntent) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Vault intent is invalid.",
    };
  }

  const { data, error } = await client
    .from("vault_items")
    .update({
      intent: nextIntent,
    })
    .eq("id", input.itemId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("id,intent")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Vault intent could not be saved.",
    };
  }

  revalidatePath("/vault");
  revalidatePath("/network");

  return {
    ok: true,
    itemId: data.id,
    intent: normalizeVaultIntent(data.intent) ?? "hold",
  };
}
