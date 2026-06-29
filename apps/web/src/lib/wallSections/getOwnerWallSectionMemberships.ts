import "server-only";

import { createServerComponentClient } from "@/lib/supabase/server";
import {
  normalizeVaultItemInstanceId,
  type OwnerWallSectionMembership,
  type OwnerWallSectionMembershipModel,
} from "@/lib/wallSections/wallSectionTypes";

type WallSectionRow = {
  id: string | null;
  name: string | null;
  position: number | null;
  is_active: boolean | null;
  is_public: boolean | null;
};

type WallSectionMembershipRow = {
  section_id: string | null;
};

type VaultInstanceOwnershipRow = {
  id: string | null;
  user_id: string | null;
  archived_at: string | null;
};

function toMembershipSection(
  row: WallSectionRow,
  assignedSectionIds: Set<string>,
): OwnerWallSectionMembership | null {
  if (!row.id || !row.name) {
    return null;
  }

  return Object.freeze({
    id: row.id,
    name: row.name,
    position: row.position ?? 0,
    is_active: Boolean(row.is_active),
    is_public: Boolean(row.is_public),
    is_member: assignedSectionIds.has(row.id),
  });
}

export async function getOwnerWallSectionMemberships(
  userId: string,
  vaultItemInstanceId: string,
): Promise<OwnerWallSectionMembershipModel> {
  const normalizedUserId = userId.trim();
  const normalizedInstanceId = normalizeVaultItemInstanceId(vaultItemInstanceId);

  if (!normalizedUserId || !normalizedInstanceId) {
    return {
      instanceId: normalizedInstanceId,
      sections: [],
      loadError: "Section assignments could not be loaded.",
    };
  }

  const client = createServerComponentClient();

  const { data: instanceRow, error: instanceError } = await client
    .from("vault_item_instances")
    .select("id,user_id,archived_at")
    .eq("id", normalizedInstanceId)
    .eq("user_id", normalizedUserId)
    .is("archived_at", null)
    .maybeSingle();

  const instance = (instanceRow ?? null) as VaultInstanceOwnershipRow | null;
  if (instanceError || !instance?.id || instance.user_id !== normalizedUserId) {
    return {
      instanceId: normalizedInstanceId,
      sections: [],
      loadError: "You can only assign cards you own.",
    };
  }

  const [{ data: sectionRows, error: sectionError }, { data: membershipRows, error: membershipError }] =
    await Promise.all([
      client
        .from("wall_sections")
        .select("id,name,position,is_active,is_public")
        .eq("user_id", normalizedUserId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      client
        .from("wall_section_memberships")
        .select("section_id")
        .eq("vault_item_instance_id", normalizedInstanceId),
    ]);

  if (sectionError || membershipError) {
    return {
      instanceId: normalizedInstanceId,
      sections: [],
      loadError: sectionError?.message ?? membershipError?.message ?? "Section assignments could not be loaded.",
    };
  }

  const assignedSectionIds = new Set(
    ((membershipRows ?? []) as WallSectionMembershipRow[])
      .map((row) => row.section_id)
      .filter((sectionId): sectionId is string => Boolean(sectionId)),
  );

  return {
    instanceId: normalizedInstanceId,
    sections: ((sectionRows ?? []) as WallSectionRow[])
      .map((row) => toMembershipSection(row, assignedSectionIds))
      .filter((section): section is OwnerWallSectionMembership => Boolean(section)),
    loadError: null,
  };
}

export async function getOwnerWallSectionMembershipsBatch(
  userId: string,
  vaultItemInstanceIds: string[],
): Promise<OwnerWallSectionMembershipModel[]> {
  const normalizedUserId = userId.trim();
  const normalizedInstanceIds = Array.from(
    new Set(vaultItemInstanceIds.map((value) => normalizeVaultItemInstanceId(value)).filter(Boolean)),
  );

  if (!normalizedUserId || normalizedInstanceIds.length === 0) {
    return normalizedInstanceIds.map((instanceId) => ({
      instanceId,
      sections: [],
      loadError: "Section assignments could not be loaded.",
    }));
  }

  const client = createServerComponentClient();
  const [
    { data: instanceRows, error: instanceError },
    { data: sectionRows, error: sectionError },
    { data: membershipRows, error: membershipError },
  ] = await Promise.all([
    client
      .from("vault_item_instances")
      .select("id,user_id,archived_at")
      .eq("user_id", normalizedUserId)
      .is("archived_at", null)
      .in("id", normalizedInstanceIds),
    client
      .from("wall_sections")
      .select("id,name,position,is_active,is_public")
      .eq("user_id", normalizedUserId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    client
      .from("wall_section_memberships")
      .select("vault_item_instance_id,section_id")
      .in("vault_item_instance_id", normalizedInstanceIds),
  ]);

  const ownershipError = instanceError?.message ?? null;
  const sectionLoadError = sectionError?.message ?? membershipError?.message ?? null;
  const ownedInstanceIds = new Set(
    ((instanceRows ?? []) as VaultInstanceOwnershipRow[])
      .filter((row) => row.id && row.user_id === normalizedUserId && !row.archived_at)
      .map((row) => row.id as string),
  );
  const baseSections = ((sectionRows ?? []) as WallSectionRow[])
    .map((row) => toMembershipSection(row, new Set()))
    .filter((section): section is OwnerWallSectionMembership => Boolean(section));
  const assignedSectionIdsByInstanceId = new Map<string, Set<string>>();

  for (const row of (membershipRows ?? []) as Array<{ vault_item_instance_id: string | null; section_id: string | null }>) {
    if (!row.vault_item_instance_id || !row.section_id) {
      continue;
    }

    const current = assignedSectionIdsByInstanceId.get(row.vault_item_instance_id) ?? new Set<string>();
    current.add(row.section_id);
    assignedSectionIdsByInstanceId.set(row.vault_item_instance_id, current);
  }

  return normalizedInstanceIds.map((instanceId) => {
    if (ownershipError || !ownedInstanceIds.has(instanceId)) {
      return {
        instanceId,
        sections: [],
        loadError: ownershipError ?? "You can only assign cards you own.",
      };
    }

    if (sectionLoadError) {
      return {
        instanceId,
        sections: [],
        loadError: sectionLoadError,
      };
    }

    const assignedSectionIds = assignedSectionIdsByInstanceId.get(instanceId) ?? new Set<string>();
    return {
      instanceId,
      sections: baseSections.map((section) => ({
        ...section,
        is_member: assignedSectionIds.has(section.id),
      })),
      loadError: null,
    };
  });
}
