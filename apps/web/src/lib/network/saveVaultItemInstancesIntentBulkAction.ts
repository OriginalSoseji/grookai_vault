"use server";

import { revalidatePath } from "next/cache";
import { assertVaultIntentProof } from "@/lib/contracts/ownershipMutationGuards";
import { normalizeVaultIntent, type VaultIntent } from "@/lib/network/intent";
import { createServerComponentClient } from "@/lib/supabase/server";
import { normalizeVaultItemInstanceId } from "@/lib/wallSections/wallSectionTypes";

const BULK_COPY_LIMIT = 100;

export type SaveVaultItemInstancesIntentBulkInput = {
  instanceIds: string[];
  intent: VaultIntent;
};

export type SaveVaultItemInstancesIntentBulkResult =
  | {
      ok: true;
      instanceIds: string[];
      intent: VaultIntent;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

type OwnedInstanceRow = {
  id: string | null;
  user_id: string | null;
  gv_vi_id: string | null;
  archived_at: string | null;
};

function normalizeBulkInstanceIds(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeVaultItemInstanceId(value))
        .filter((value): value is string => value.length > 0),
    ),
  );
}

export async function saveVaultItemInstancesIntentBulkAction(
  input: SaveVaultItemInstancesIntentBulkInput,
): Promise<SaveVaultItemInstancesIntentBulkResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Sign in required.",
    };
  }

  const normalizedInstanceIds = normalizeBulkInstanceIds(input.instanceIds ?? []);
  const nextIntent = normalizeVaultIntent(input.intent);

  if (normalizedInstanceIds.length === 0 || !nextIntent) {
    return {
      ok: false,
      message: "Choose at least one copy and a valid intent.",
    };
  }

  if (normalizedInstanceIds.length > BULK_COPY_LIMIT) {
    return {
      ok: false,
      message: `Choose ${BULK_COPY_LIMIT} copies or fewer at a time.`,
    };
  }

  // LOCK: Bulk intent authority is exact-copy only (vault_item_instances.id).
  // LOCK: Do not write grouped vault_items or shared_cards from bulk copy actions.
  const { data: ownedRows, error: ownedError } = await client
    .from("vault_item_instances")
    .select("id,user_id,gv_vi_id,archived_at")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .in("id", normalizedInstanceIds);

  const ownedInstances = (ownedRows ?? []) as OwnedInstanceRow[];
  if (
    ownedError ||
    ownedInstances.length !== normalizedInstanceIds.length ||
    ownedInstances.some((row) => !row.id || row.user_id !== user.id || row.archived_at)
  ) {
    return {
      ok: false,
      message: "One or more selected copies could not be updated.",
    };
  }

  const { data: updatedRows, error: updateError } = await client
    .from("vault_item_instances")
    .update({
      intent: nextIntent,
    })
    .eq("user_id", user.id)
    .is("archived_at", null)
    .in("id", normalizedInstanceIds)
    .select("id,intent,gv_vi_id");

  if (updateError || (updatedRows ?? []).length !== normalizedInstanceIds.length) {
    return {
      ok: false,
      message: "Selected copies could not be updated.",
    };
  }

  await Promise.all(
    normalizedInstanceIds.map((instanceId) =>
      assertVaultIntentProof({
        instanceId,
        userId: user.id,
        expectedIntent: nextIntent,
      }),
    ),
  );

  revalidatePath("/vault");
  revalidatePath("/network");
  for (const row of ownedInstances) {
    const gvviId = typeof row.gv_vi_id === "string" ? row.gv_vi_id.trim() : "";
    if (gvviId) {
      revalidatePath(`/vault/gvvi/${gvviId}`);
      revalidatePath(`/gvvi/${gvviId}`);
    }
  }

  return {
    ok: true,
    instanceIds: normalizedInstanceIds,
    intent: nextIntent,
    message: `${normalizedInstanceIds.length} ${normalizedInstanceIds.length === 1 ? "copy" : "copies"} updated.`,
  };
}
