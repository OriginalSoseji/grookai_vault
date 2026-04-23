"use server";

import { createServerAdminClient } from "@/lib/supabase/admin";
import { normalizeVaultIntent, type VaultIntent } from "@/lib/network/intent";

// LOCK: Ownership/trust mutations must round-trip against exact-copy truth before reporting success.
// LOCK: Wall/section owner writes must not trust grouped or compatibility surfaces.

type AdminClient = ReturnType<typeof createServerAdminClient>;

type CountSourceInstanceRow = {
  card_print_id: string | null;
  slab_cert_id: string | null;
};

type SlabCertCardRow = {
  id: string;
  card_print_id: string | null;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function resolveAdminClient(client?: AdminClient) {
  return client ?? createServerAdminClient();
}

export async function assertWallSectionStateProof(input: {
  adminClient?: AdminClient;
  sectionId: string;
  userId: string;
  expectedName?: string | null;
  expectedIsActive?: boolean;
}) {
  const adminClient = await resolveAdminClient(input.adminClient);
  const { data, error } = await adminClient
    .from("wall_sections")
    .select("id,user_id,name,is_active")
    .eq("id", input.sectionId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("wall_section_state_proof_failed:not_found");
  }

  ensure(normalizeText(data.user_id) === normalizeText(input.userId), "wall_section_state_proof_failed:owner_drift");

  if (typeof input.expectedName === "string") {
    ensure(
      normalizeText(data.name) === normalizeText(input.expectedName),
      "wall_section_state_proof_failed:name_drift",
    );
  }

  if (typeof input.expectedIsActive === "boolean") {
    ensure(Boolean(data.is_active) === input.expectedIsActive, "wall_section_state_proof_failed:active_drift");
  }
}

export async function assertWallSectionMembershipProof(input: {
  adminClient?: AdminClient;
  sectionId: string;
  vaultItemInstanceId: string;
  userId: string;
  shouldExist: boolean;
}) {
  const adminClient = await resolveAdminClient(input.adminClient);
  const [{ data: sectionRow, error: sectionError }, { data: instanceRow, error: instanceError }, { data: membershipRow, error: membershipError }] =
    await Promise.all([
      adminClient.from("wall_sections").select("id,user_id").eq("id", input.sectionId).maybeSingle(),
      adminClient
        .from("vault_item_instances")
        .select("id,user_id,archived_at")
        .eq("id", input.vaultItemInstanceId)
        .maybeSingle(),
      adminClient
        .from("wall_section_memberships")
        .select("section_id,vault_item_instance_id")
        .eq("section_id", input.sectionId)
        .eq("vault_item_instance_id", input.vaultItemInstanceId)
        .maybeSingle(),
    ]);

  if (sectionError || !sectionRow) {
    throw new Error("wall_section_membership_proof_failed:missing_section");
  }
  if (instanceError || !instanceRow) {
    throw new Error("wall_section_membership_proof_failed:missing_instance");
  }
  ensure(normalizeText(sectionRow.user_id) === normalizeText(input.userId), "wall_section_membership_proof_failed:section_owner_drift");
  ensure(normalizeText(instanceRow.user_id) === normalizeText(input.userId), "wall_section_membership_proof_failed:instance_owner_drift");

  if (input.shouldExist) {
    ensure(!membershipError && Boolean(membershipRow), "wall_section_membership_proof_failed:missing_membership");
    ensure(!instanceRow.archived_at, "wall_section_membership_proof_failed:archived_instance");
  } else {
    ensure(!membershipError && !membershipRow, "wall_section_membership_proof_failed:membership_still_present");
  }
}

export async function assertVaultInstanceArchivedProof(input: {
  adminClient?: AdminClient;
  instanceId: string;
  userId: string;
}) {
  const adminClient = await resolveAdminClient(input.adminClient);
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select("id,user_id,archived_at")
    .eq("id", input.instanceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("vault_instance_archive_proof_failed:not_found");
  }
  ensure(normalizeText(data.user_id) === normalizeText(input.userId), "vault_instance_archive_proof_failed:owner_drift");
  ensure(Boolean(data.archived_at), "vault_instance_archive_proof_failed:still_active");
}

export async function assertVaultInstanceActiveProof(input: {
  adminClient?: AdminClient;
  instanceId: string;
  userId: string;
  cardPrintId?: string | null;
}) {
  const adminClient = await resolveAdminClient(input.adminClient);
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select("id,user_id,archived_at,card_print_id")
    .eq("id", input.instanceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("vault_instance_active_proof_failed:not_found");
  }
  ensure(normalizeText(data.user_id) === normalizeText(input.userId), "vault_instance_active_proof_failed:owner_drift");
  ensure(!data.archived_at, "vault_instance_active_proof_failed:archived");

  if (typeof input.cardPrintId === "string" && input.cardPrintId.trim().length > 0) {
    ensure(
      normalizeText(data.card_print_id) === normalizeText(input.cardPrintId),
      "vault_instance_active_proof_failed:card_print_drift",
    );
  }
}

export async function countActiveInstancesForCardProof(input: {
  adminClient?: AdminClient;
  userId: string;
  cardPrintId: string;
}) {
  const adminClient = await resolveAdminClient(input.adminClient);
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select("card_print_id,slab_cert_id")
    .eq("user_id", input.userId)
    .is("archived_at", null);

  if (error) {
    throw new Error(`vault_card_count_proof_failed:instance_query:${error.message}`);
  }

  const rows = (data ?? []) as CountSourceInstanceRow[];
  const slabCertIds = Array.from(
    new Set(rows.map((row) => normalizeText(row.slab_cert_id)).filter((value) => value.length > 0)),
  );
  const slabCardByCertId = new Map<string, string>();

  if (slabCertIds.length > 0) {
    const { data: slabData, error: slabError } = await adminClient
      .from("slab_certs")
      .select("id,card_print_id")
      .in("id", slabCertIds);

    if (slabError) {
      throw new Error(`vault_card_count_proof_failed:slab_query:${slabError.message}`);
    }

    for (const row of (slabData ?? []) as SlabCertCardRow[]) {
      const slabCertId = normalizeText(row.id);
      const cardPrintId = normalizeText(row.card_print_id);
      if (slabCertId && cardPrintId) {
        slabCardByCertId.set(slabCertId, cardPrintId);
      }
    }
  }

  const normalizedCardPrintId = normalizeText(input.cardPrintId);
  return rows.filter((row) => {
    const directCardPrintId = normalizeText(row.card_print_id);
    if (directCardPrintId === normalizedCardPrintId) {
      return true;
    }
    const slabCertId = normalizeText(row.slab_cert_id);
    return Boolean(slabCertId) && slabCardByCertId.get(slabCertId) === normalizedCardPrintId;
  }).length;
}

export async function assertVaultCardCountProof(input: {
  adminClient?: AdminClient;
  userId: string;
  cardPrintId: string;
  expectedCount: number;
}) {
  const actualCount = await countActiveInstancesForCardProof(input);
  ensure(actualCount === input.expectedCount, "vault_card_count_proof_failed:count_drift");
}

export async function assertVaultIntentProof(input: {
  adminClient?: AdminClient;
  instanceId: string;
  userId: string;
  expectedIntent: VaultIntent;
}) {
  const adminClient = await resolveAdminClient(input.adminClient);
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select("id,user_id,archived_at,intent")
    .eq("id", input.instanceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("vault_intent_proof_failed:not_found");
  }
  ensure(normalizeText(data.user_id) === normalizeText(input.userId), "vault_intent_proof_failed:owner_drift");
  ensure(!data.archived_at, "vault_intent_proof_failed:archived");
  ensure(
    (normalizeVaultIntent(data.intent) ?? "hold") === input.expectedIntent,
    "vault_intent_proof_failed:intent_drift",
  );
}
