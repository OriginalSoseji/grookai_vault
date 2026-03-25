"use server";

import { revalidatePath } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  isOwnedVaultInstanceMediaPath,
  type VaultInstanceMediaSide,
} from "@/lib/vaultInstanceMedia";

export type SaveVaultItemInstanceMediaInput = {
  instanceId: string;
  side: VaultInstanceMediaSide;
  storagePath: string | null;
};

export type SaveVaultItemInstanceMediaResult =
  | {
      ok: true;
      instanceId: string;
      side: VaultInstanceMediaSide;
      storagePath: string | null;
    }
  | {
      ok: false;
      instanceId: string;
      side: VaultInstanceMediaSide;
      message: string;
    };

export async function saveVaultItemInstanceMediaAction(
  input: SaveVaultItemInstanceMediaInput,
): Promise<SaveVaultItemInstanceMediaResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      instanceId: input.instanceId,
      side: input.side,
      message: "Sign in required.",
    };
  }

  const normalizedInstanceId = input.instanceId.trim();
  if (!normalizedInstanceId || (input.side !== "front" && input.side !== "back")) {
    return {
      ok: false,
      instanceId: input.instanceId,
      side: input.side,
      message: "Copy photo could not be saved.",
    };
  }

  const admin = createServerAdminClient();
  const { data: instance, error: instanceError } = await admin
    .from("vault_item_instances")
    .select("id,user_id,archived_at,gv_vi_id")
    .eq("id", normalizedInstanceId)
    .maybeSingle();

  if (instanceError || !instance || instance.user_id !== user.id || instance.archived_at !== null) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      side: input.side,
      message: "Copy photo could not be saved.",
    };
  }

  if (
    input.storagePath &&
    !isOwnedVaultInstanceMediaPath(user.id, normalizedInstanceId, input.side, input.storagePath)
  ) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      side: input.side,
      message: "Copy photo path is invalid.",
    };
  }

  const imageField = input.side === "front" ? "image_url" : "image_back_url";
  const sourceField = input.side === "front" ? "image_source" : "image_back_source";

  const { data, error } = await admin
    .from("vault_item_instances")
    .update({
      [imageField]: input.storagePath,
      [sourceField]: input.storagePath ? "user_photo" : null,
    })
    .eq("id", normalizedInstanceId)
    .select("id,gv_vi_id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      side: input.side,
      message: "Copy photo could not be saved.",
    };
  }

  const gvviId = typeof data.gv_vi_id === "string" ? data.gv_vi_id.trim() : null;
  revalidatePath("/vault");
  if (gvviId) {
    revalidatePath(`/vault/gvvi/${gvviId}`);
    revalidatePath(`/gvvi/${gvviId}`);
  }

  return {
    ok: true,
    instanceId: data.id,
    side: input.side,
    storagePath: input.storagePath,
  };
}
