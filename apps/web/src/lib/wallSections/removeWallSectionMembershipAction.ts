"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getOwnerWallSectionMemberships } from "@/lib/wallSections/getOwnerWallSectionMemberships";
import { revalidateOwnerWallSectionPaths } from "@/lib/wallSections/revalidateWallSectionPaths";
import {
  isWallSectionSystemId,
  normalizeVaultItemInstanceId,
  normalizeWallSectionId,
  type WallSectionMembershipActionResult,
} from "@/lib/wallSections/wallSectionTypes";

type RemoveWallSectionMembershipInput = {
  sectionId: string;
  vaultItemInstanceId: string;
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

async function loadOwnedRemovalTargets(input: {
  sectionId: string;
  vaultItemInstanceId: string;
  userId: string;
}) {
  const client = createServerComponentClient();

  const [{ data: sectionRow, error: sectionError }, { data: instanceRow, error: instanceError }] =
    await Promise.all([
      client
        .from("wall_sections")
        .select("id,user_id")
        .eq("id", input.sectionId)
        .eq("user_id", input.userId)
        .maybeSingle(),
      client
        .from("vault_item_instances")
        .select("id,user_id,gv_vi_id,archived_at")
        .eq("id", input.vaultItemInstanceId)
        .eq("user_id", input.userId)
        .is("archived_at", null)
        .maybeSingle(),
    ]);

  const section = (sectionRow ?? null) as OwnedSectionRow | null;
  const instance = (instanceRow ?? null) as OwnedInstanceRow | null;

  if (sectionError || !section?.id || section.user_id !== input.userId) {
    return {
      ok: false as const,
      message: "You can only manage your own sections.",
      client,
    };
  }

  if (instanceError || !instance?.id || instance.user_id !== input.userId || instance.archived_at) {
    return {
      ok: false as const,
      message: "You can only assign cards you own.",
      client,
    };
  }

  return {
    ok: true as const,
    client,
    section,
    instance,
  };
}

export async function removeWallSectionMembershipAction(
  input: RemoveWallSectionMembershipInput,
): Promise<WallSectionMembershipActionResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const sectionId = normalizeWallSectionId(input.sectionId);
  const vaultItemInstanceId = normalizeVaultItemInstanceId(input.vaultItemInstanceId);

  if (!user) {
    return {
      ok: false,
      message: "Sign in required.",
    };
  }

  if (!sectionId || isWallSectionSystemId(sectionId)) {
    return {
      ok: false,
      message: "Wall is managed automatically.",
    };
  }

  if (!vaultItemInstanceId) {
    return {
      ok: false,
      message: "This card can't be removed from that section.",
    };
  }

  const targets = await loadOwnedRemovalTargets({
    sectionId,
    vaultItemInstanceId,
    userId: user.id,
  });

  if (!targets.ok) {
    return {
      ok: false,
      message: targets.message,
    };
  }

  // LOCK: Section membership is exact-copy only (vault_item_instances.id).
  // LOCK: Do not regress to grouped or card-level assignment.
  const { error } = await targets.client
    .from("wall_section_memberships")
    .delete()
    .eq("section_id", sectionId)
    .eq("vault_item_instance_id", vaultItemInstanceId);

  if (error) {
    return {
      ok: false,
      message: "This card can't be removed from that section.",
    };
  }

  await revalidateOwnerWallSectionPaths(user.id);
  const gvviId = typeof targets.instance.gv_vi_id === "string" ? targets.instance.gv_vi_id.trim() : "";
  if (gvviId) {
    revalidatePath(`/vault/gvvi/${gvviId}`);
  }

  const next = await getOwnerWallSectionMemberships(user.id, vaultItemInstanceId);

  return {
    ok: true,
    message: "Removed from section.",
    sections: next.sections,
  };
}
