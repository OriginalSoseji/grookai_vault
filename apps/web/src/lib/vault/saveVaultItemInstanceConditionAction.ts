"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";

const ALLOWED_CONDITIONS = new Set(["NM", "LP", "MP", "HP", "DMG"]);

export type SaveVaultItemInstanceConditionInput = {
  instanceId: string;
  conditionLabel: string;
};

export type SaveVaultItemInstanceConditionResult =
  | {
      ok: true;
      instanceId: string;
      conditionLabel: string;
      gvviId: string | null;
    }
  | {
      ok: false;
      instanceId: string;
      message: string;
    };

function normalizeConditionLabel(value: string) {
  const normalized = value.trim().toUpperCase();
  return ALLOWED_CONDITIONS.has(normalized) ? normalized : null;
}

export async function saveVaultItemInstanceConditionAction(
  input: SaveVaultItemInstanceConditionInput,
): Promise<SaveVaultItemInstanceConditionResult> {
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
  const nextCondition = normalizeConditionLabel(input.conditionLabel);
  if (!normalizedInstanceId || !nextCondition) {
    return {
      ok: false,
      instanceId: input.instanceId,
      message: "Condition is invalid.",
    };
  }

  const { data: instance, error: instanceError } = await client
    .from("vault_item_instances")
    .select("id,user_id,archived_at,slab_cert_id,condition_label,gv_vi_id")
    .eq("id", normalizedInstanceId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  if (instanceError || !instance) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Condition could not be saved.",
    };
  }

  if (instance.slab_cert_id) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Graded copies keep condition through slab identity.",
    };
  }

  const currentCondition =
    typeof instance.condition_label === "string" ? instance.condition_label.trim().toUpperCase() : null;
  if (currentCondition === nextCondition) {
    return {
      ok: true,
      instanceId: normalizedInstanceId,
      conditionLabel: nextCondition,
      gvviId: typeof instance.gv_vi_id === "string" ? instance.gv_vi_id.trim() : null,
    };
  }

  const { data, error } = await client
    .from("vault_item_instances")
    .update({
      condition_label: nextCondition,
    })
    .eq("id", normalizedInstanceId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("id,condition_label,gv_vi_id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Condition could not be saved.",
    };
  }

  const gvviId = typeof data.gv_vi_id === "string" ? data.gv_vi_id.trim() : null;
  revalidatePath("/vault");
  revalidatePath("/network");
  if (gvviId) {
    revalidatePath(`/vault/gvvi/${gvviId}`);
    revalidatePath(`/gvvi/${gvviId}`);
  }

  return {
    ok: true,
    instanceId: data.id,
    conditionLabel:
      typeof data.condition_label === "string" && data.condition_label.trim().length > 0
        ? data.condition_label.trim().toUpperCase()
        : nextCondition,
    gvviId,
  };
}
