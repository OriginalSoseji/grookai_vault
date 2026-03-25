"use server";

import { revalidatePath } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
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

  const admin = createServerAdminClient();
  const { data: instance, error: instanceError } = await admin
    .from("vault_item_instances")
    .select("id,user_id,archived_at,notes,gv_vi_id")
    .eq("id", normalizedInstanceId)
    .maybeSingle();

  if (instanceError || !instance || instance.user_id !== user.id || instance.archived_at !== null) {
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

  const { data, error } = await admin
    .from("vault_item_instances")
    .update({
      notes: nextNotes,
    })
    .eq("id", normalizedInstanceId)
    .select("id,notes,gv_vi_id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Notes could not be saved.",
    };
  }

  const gvviId = typeof data.gv_vi_id === "string" ? data.gv_vi_id.trim() : null;
  revalidatePath("/vault");
  if (gvviId) {
    revalidatePath(`/vault/gvvi/${gvviId}`);
  }

  return {
    ok: true,
    instanceId: data.id,
    notes: typeof data.notes === "string" && data.notes.trim().length > 0 ? data.notes.trim() : null,
  };
}
