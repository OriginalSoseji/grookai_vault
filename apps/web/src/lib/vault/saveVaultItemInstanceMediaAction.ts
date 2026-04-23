"use server";

import { revalidatePath } from "next/cache";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import { createVaultInstanceMediaProofV1 } from "@/lib/contracts/owner_write_proofs_v1";
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

  const { data: instance, error: instanceError } = await client
    .from("vault_item_instances")
    .select("id,user_id,archived_at,gv_vi_id")
    .eq("id", normalizedInstanceId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  if (instanceError || !instance) {
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

  let result: Extract<SaveVaultItemInstanceMediaResult, { ok: true }>;

  try {
    result = await executeOwnerWriteV1<Extract<SaveVaultItemInstanceMediaResult, { ok: true }>>({
      execution_name: "save_vault_item_instance_media",
      actor_id: user.id,
      write: async (context) => {
        context.setMetadata("source", "saveVaultItemInstanceMediaAction");

        const { data, error } = await context.adminClient
          .from("vault_item_instances")
          .update({
            [imageField]: input.storagePath,
            [sourceField]: input.storagePath ? "user_photo" : null,
          })
          .eq("id", normalizedInstanceId)
          .eq("user_id", user.id)
          .is("archived_at", null)
          .select("id,gv_vi_id")
          .maybeSingle();

        if (error || !data) {
          throw new Error("Copy photo could not be saved.");
        }

        return {
          ok: true,
          instanceId: data.id,
          side: input.side,
          storagePath: input.storagePath,
        };
      },
      proofs: [
        createVaultInstanceMediaProofV1(({ result }) => ({
          instanceId: result.instanceId,
          side: result.side,
          expectedStoragePath: result.storagePath,
        })),
      ],
    });
  } catch {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      side: input.side,
      message: "Copy photo could not be saved.",
    };
  }

  const gvviId = typeof instance.gv_vi_id === "string" ? instance.gv_vi_id.trim() : null;
  revalidatePath("/vault");
  if (gvviId) {
    revalidatePath(`/vault/gvvi/${gvviId}`);
    revalidatePath(`/gvvi/${gvviId}`);
  }

  return {
    ...result,
  };
}
