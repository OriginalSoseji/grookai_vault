"use server";

import { revalidatePath } from "next/cache";
import { assertWallSectionMembershipProof } from "@/lib/contracts/ownershipMutationGuards";
import { createServerComponentClient } from "@/lib/supabase/server";
import { revalidateOwnerWallSectionPaths } from "@/lib/wallSections/revalidateWallSectionPaths";
import {
  isWallSectionSystemId,
  normalizeVaultItemInstanceId,
  normalizeWallSectionId,
} from "@/lib/wallSections/wallSectionTypes";

const BULK_COPY_LIMIT = 100;

export type BulkWallSectionMembershipMode = "add" | "remove";

export type BulkWallSectionMembershipInput = {
  sectionId: string;
  instanceIds: string[];
  mode: BulkWallSectionMembershipMode;
};

export type BulkWallSectionMembershipResult =
  | {
      ok: true;
      sectionId: string;
      instanceIds: string[];
      mode: BulkWallSectionMembershipMode;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

type OwnedSectionRow = {
  id: string | null;
  user_id: string | null;
};

type OwnedInstanceRow = {
  id: string | null;
  user_id: string | null;
  gv_vi_id: string | null;
  archived_at: string | null;
};

type MembershipRow = {
  section_id: string | null;
  vault_item_instance_id: string | null;
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

export async function bulkWallSectionMembershipAction(
  input: BulkWallSectionMembershipInput,
): Promise<BulkWallSectionMembershipResult> {
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

  const sectionId = normalizeWallSectionId(input.sectionId);
  const normalizedInstanceIds = normalizeBulkInstanceIds(input.instanceIds ?? []);
  const mode: BulkWallSectionMembershipMode = input.mode === "remove" ? "remove" : "add";

  if (!sectionId || isWallSectionSystemId(sectionId)) {
    return {
      ok: false,
      message: "Choose a custom section.",
    };
  }

  if (normalizedInstanceIds.length === 0) {
    return {
      ok: false,
      message: "Choose at least one copy.",
    };
  }

  if (normalizedInstanceIds.length > BULK_COPY_LIMIT) {
    return {
      ok: false,
      message: `Choose ${BULK_COPY_LIMIT} copies or fewer at a time.`,
    };
  }

  const [{ data: sectionRow, error: sectionError }, { data: instanceRows, error: instanceError }] =
    await Promise.all([
      client
        .from("wall_sections")
        .select("id,user_id")
        .eq("id", sectionId)
        .eq("user_id", user.id)
        .maybeSingle(),
      client
        .from("vault_item_instances")
        .select("id,user_id,gv_vi_id,archived_at")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .in("id", normalizedInstanceIds),
    ]);

  const section = (sectionRow ?? null) as OwnedSectionRow | null;
  const ownedInstances = (instanceRows ?? []) as OwnedInstanceRow[];

  if (sectionError || !section?.id || section.user_id !== user.id) {
    return {
      ok: false,
      message: "You can only manage your own sections.",
    };
  }

  if (
    instanceError ||
    ownedInstances.length !== normalizedInstanceIds.length ||
    ownedInstances.some((row) => !row.id || row.user_id !== user.id || row.archived_at)
  ) {
    return {
      ok: false,
      message: "You can only assign cards you own.",
    };
  }

  if (mode === "add") {
    const { data: existingRows, error: existingError } = await client
      .from("wall_section_memberships")
      .select("section_id,vault_item_instance_id")
      .eq("section_id", sectionId)
      .in("vault_item_instance_id", normalizedInstanceIds);

    if (existingError) {
      return {
        ok: false,
        message: "Selected copies could not be added to that section.",
      };
    }

    const existingInstanceIds = new Set(
      ((existingRows ?? []) as MembershipRow[])
        .filter((row) => row.section_id === sectionId && typeof row.vault_item_instance_id === "string")
        .map((row) => row.vault_item_instance_id as string),
    );
    const rowsToInsert = normalizedInstanceIds
      .filter((instanceId) => !existingInstanceIds.has(instanceId))
      .map((instanceId) => ({
        section_id: sectionId,
        vault_item_instance_id: instanceId,
      }));

    if (rowsToInsert.length > 0) {
      // LOCK: Bulk section membership is exact-copy only (vault_item_instances.id).
      // LOCK: Do not regress to grouped vault_items or shared_cards assignment.
      const { error: insertError } = await client.from("wall_section_memberships").insert(rowsToInsert);

      if (insertError && insertError.code !== "23505") {
        return {
          ok: false,
          message: "Selected copies could not be added to that section.",
        };
      }
    }
  } else {
    // LOCK: Bulk section membership is exact-copy only (vault_item_instances.id).
    // LOCK: Do not regress to grouped vault_items or shared_cards assignment.
    const { error: deleteError } = await client
      .from("wall_section_memberships")
      .delete()
      .eq("section_id", sectionId)
      .in("vault_item_instance_id", normalizedInstanceIds);

    if (deleteError) {
      return {
        ok: false,
        message: "Selected copies could not be removed from that section.",
      };
    }
  }

  await Promise.all(
    normalizedInstanceIds.map((vaultItemInstanceId) =>
      assertWallSectionMembershipProof({
        sectionId,
        vaultItemInstanceId,
        userId: user.id,
        shouldExist: mode === "add",
      }),
    ),
  );

  await revalidateOwnerWallSectionPaths(user.id);
  for (const row of ownedInstances) {
    const gvviId = typeof row.gv_vi_id === "string" ? row.gv_vi_id.trim() : "";
    if (gvviId) {
      revalidatePath(`/vault/gvvi/${gvviId}`);
    }
  }

  return {
    ok: true,
    sectionId,
    instanceIds: normalizedInstanceIds,
    mode,
    message:
      mode === "add"
        ? `${normalizedInstanceIds.length} ${normalizedInstanceIds.length === 1 ? "copy" : "copies"} added.`
        : `${normalizedInstanceIds.length} ${normalizedInstanceIds.length === 1 ? "copy" : "copies"} removed.`,
  };
}
