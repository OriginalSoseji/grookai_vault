"use server";

import { revalidatePath } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { normalizeVaultIntent, type VaultIntent } from "@/lib/network/intent";

export type SaveVaultItemInstanceIntentInput = {
  instanceId: string;
  intent: VaultIntent;
};

export type SaveVaultItemInstanceIntentResult =
  | {
      ok: true;
      instanceId: string;
      intent: VaultIntent;
    }
  | {
      ok: false;
      instanceId: string;
      message: string;
    };

export async function saveVaultItemInstanceIntentAction(
  input: SaveVaultItemInstanceIntentInput,
): Promise<SaveVaultItemInstanceIntentResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      instanceId: input.instanceId,
      message: "Sign in required.",
    };
  }

  const nextIntent = normalizeVaultIntent(input.intent);
  const normalizedInstanceId = input.instanceId.trim();
  if (!normalizedInstanceId || !nextIntent) {
    return {
      ok: false,
      instanceId: input.instanceId,
      message: "Copy intent is invalid.",
    };
  }

  const admin = createServerAdminClient();
  const { data: instance, error: instanceError } = await admin
    .from("vault_item_instances")
    .select("id,user_id,archived_at,intent")
    .eq("id", normalizedInstanceId)
    .maybeSingle();

  if (instanceError || !instance || instance.user_id !== user.id || instance.archived_at !== null) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Copy intent could not be saved.",
    };
  }

  const { data, error } = await admin
    .from("vault_item_instances")
    .update({
      intent: nextIntent,
    })
    .eq("id", normalizedInstanceId)
    .select("id,intent,gv_vi_id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Copy intent could not be saved.",
    };
  }

  revalidatePath("/vault");
  revalidatePath("/network");
  const gvviId = typeof data.gv_vi_id === "string" ? data.gv_vi_id.trim() : null;
  if (gvviId) {
    revalidatePath(`/vault/gvvi/${gvviId}`);
  }

  return {
    ok: true,
    instanceId: data.id,
    intent: normalizeVaultIntent(data.intent) ?? "hold",
  };
}
