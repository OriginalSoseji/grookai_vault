"use server";

import { revalidatePath } from "next/cache";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import { createVaultInstanceNotesProofV1 } from "@/lib/contracts/owner_write_proofs_v1";
import { createServerComponentClient } from "@/lib/supabase/server";

export type SaveVaultItemInstanceNotesInput = {
  instanceId: string;
  notes: string;
};

export type SaveVaultItemInstanceNotesResult =
  | {
      ok: true;
      instanceId: string;
      notes: string | null;
    }
  | {
      ok: false;
      instanceId: string;
      message: string;
    };

function normalizeNotes(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 2000);
}

export async function saveVaultItemInstanceNotesAction(
  input: SaveVaultItemInstanceNotesInput,
): Promise<SaveVaultItemInstanceNotesResult> {
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

  const normalizedInstanceId = input.instanceId.trim();
  if (!normalizedInstanceId) {
    return {
      ok: false,
      instanceId: input.instanceId,
      message: "Notes could not be saved.",
    };
  }

  const { data: instance, error: instanceError } = await client
    .from("vault_item_instances")
    .select("id,user_id,archived_at,notes,gv_vi_id")
    .eq("id", normalizedInstanceId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  if (instanceError || !instance) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Notes could not be saved.",
    };
  }

  const nextNotes = normalizeNotes(input.notes);
  const currentNotes = typeof instance.notes === "string" ? instance.notes.trim() : null;

  if (currentNotes === nextNotes) {
    return {
      ok: true,
      instanceId: normalizedInstanceId,
      notes: nextNotes,
    };
  }

  let result: Extract<SaveVaultItemInstanceNotesResult, { ok: true }>;

  try {
    result = await executeOwnerWriteV1<Extract<SaveVaultItemInstanceNotesResult, { ok: true }>>({
      execution_name: "save_vault_item_instance_notes",
      actor_id: user.id,
      write: async (context) => {
        context.setMetadata("source", "saveVaultItemInstanceNotesAction");

        const { data, error } = await context.adminClient
          .from("vault_item_instances")
          .update({
            notes: nextNotes,
          })
          .eq("id", normalizedInstanceId)
          .eq("user_id", user.id)
          .is("archived_at", null)
          .select("id,notes,gv_vi_id")
          .maybeSingle();

        if (error || !data) {
          throw new Error("Notes could not be saved.");
        }

        return {
          ok: true,
          instanceId: data.id,
          notes:
            typeof data.notes === "string" && data.notes.trim().length > 0
              ? data.notes.trim()
              : null,
        };
      },
      proofs: [
        createVaultInstanceNotesProofV1(({ result }) => ({
          instanceId: result.instanceId,
          expectedNotes: result.notes,
        })),
      ],
    });
  } catch {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Notes could not be saved.",
    };
  }

  const gvviId = typeof instance.gv_vi_id === "string" ? instance.gv_vi_id.trim() : null;
  revalidatePath("/vault");
  if (gvviId) {
    revalidatePath(`/vault/gvvi/${gvviId}`);
  }

  return {
    ...result,
  };
}
