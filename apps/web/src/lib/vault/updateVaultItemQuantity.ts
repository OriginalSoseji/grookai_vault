import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import {
  createNoArchivedLeakProofV1,
  createVaultCardCountProofV1,
  createVaultInstanceActiveProofV1,
  createVaultInstanceArchivedProofV1,
} from "@/lib/contracts/owner_write_proofs_v1";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { assertAuthenticatedVaultUser } from "@/lib/vault/assertAuthenticatedVaultUser";

export type VaultQuantityChange =
  | {
      type: "increment";
      client: SupabaseClient;
      userId: string;
      itemId: string;
    }
  | {
      type: "decrement";
      client: SupabaseClient;
      userId: string;
      itemId: string;
    };

export type UpdateVaultItemQuantityResult =
  | {
      status: "incremented" | "decremented";
      itemId: string;
      quantity: number;
    }
  | {
      status: "removed";
      itemId: string;
    };

type ActiveVaultInstanceRow = {
  id: string;
  gv_vi_id: string | null;
  card_print_id: string | null;
};

type LegacyVaultBucketRow = {
  id: string;
  card_id: string | null;
  gv_id: string | null;
  condition_label?: string | null;
  name?: string | null;
  set_name?: string | null;
  photo_url?: string | null;
};

type VaultInstanceCreateRow = {
  id: string;
  gv_vi_id: string | null;
};

type ActiveInstanceCounts = {
  totalCount: number;
  rawCount: number;
  slabCount: number;
};

type CountSourceInstanceRow = {
  card_print_id: string | null;
  slab_cert_id: string | null;
};

type SlabCertCardRow = {
  id: string;
  card_print_id: string | null;
};

function formatVaultQuantityError(step: string, error: PostgrestError) {
  const parts = [
    `[${step}]`,
    error.message,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.join(" | ");
}

async function selectActiveRawVaultInstanceForArchive({
  userId,
  cardPrintId,
}: {
  userId: string;
  cardPrintId: string;
}) {
  const adminClient = createServerAdminClient();
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select("id,gv_vi_id,card_print_id")
    .eq("user_id", userId)
    .eq("card_print_id", cardPrintId)
    .is("slab_cert_id", null)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(formatVaultQuantityError("vault_item_instances.select-active-raw-for-archive", error));
  }

  return (data ?? null) as ActiveVaultInstanceRow | null;
}

async function archiveRawVaultInstance(change: VaultQuantityChange, cardPrintId: string) {
  console.info("vault.archive.begin", {
    userId: change.userId,
    gvviId: null,
    cardPrintId,
    vaultItemId: change.itemId,
  });

  const selectedInstance = await selectActiveRawVaultInstanceForArchive({
    userId: change.userId,
    cardPrintId,
  });

  if (!selectedInstance?.id) {
    const missingInstanceError = new Error("No active raw vault instance found for decrement.");
    console.error("vault.archive.instance_failed", {
      userId: change.userId,
      gvviId: null,
      cardPrintId,
      error: missingInstanceError,
    });
    throw missingInstanceError;
  }

  console.info("vault.archive.selected_instance", {
    userId: change.userId,
    selectedInstanceId: selectedInstance.id,
    selectedGvviId: selectedInstance.gv_vi_id ?? null,
    cardPrintId,
  });

  const adminClient = createServerAdminClient();
  const { error: archiveError } = await adminClient
    .from("vault_item_instances")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", selectedInstance.id)
    .eq("user_id", change.userId)
    .is("archived_at", null);

  if (archiveError) {
    console.error("vault.archive.instance_failed", {
      userId: change.userId,
      gvviId: selectedInstance.gv_vi_id ?? null,
      cardPrintId,
      error: archiveError,
    });
    throw new Error(formatVaultQuantityError("vault_item_instances.archive", archiveError));
  }

  return selectedInstance;
}

async function createVaultInstanceForIncrement(
  change: VaultQuantityChange,
  row: LegacyVaultBucketRow,
): Promise<VaultInstanceCreateRow> {
  const cardPrintId = row.card_id?.trim() ?? "";
  if (!cardPrintId) {
    throw new Error("GVVI create failed: missing cardPrintId on legacy vault bucket.");
  }

  const adminClient = createServerAdminClient();
  const rpcArgs = {
    p_user_id: change.userId,
    p_card_print_id: cardPrintId,
    p_legacy_vault_item_id: row.id,
    p_condition_label: row.condition_label?.trim() || null,
    p_name: row.name?.trim() || null,
    p_set_name: row.set_name?.trim() || null,
    p_photo_url: row.photo_url ?? null,
  };

  const { data, error } = await adminClient.rpc("admin_vault_instance_create_v1", rpcArgs);

  if (error) {
    throw new Error(formatVaultQuantityError("vault_item_instances.create-for-increment", error));
  }

  const createdInstance = Array.isArray(data) ? data[0] : data;
  const createdRow = (createdInstance ?? null) as VaultInstanceCreateRow | null;
  if (!createdRow?.id) {
    throw new Error("GVVI create failed: increment RPC returned no instance row.");
  }

  return createdRow;
}

async function countActiveInstancesForCard({
  userId,
  cardPrintId,
}: {
  userId: string;
  cardPrintId: string;
}): Promise<ActiveInstanceCounts> {
  const adminClient = createServerAdminClient();
  const { data, error } = await adminClient
    .from("vault_item_instances")
    .select("card_print_id,slab_cert_id")
    .eq("user_id", userId)
    .is("archived_at", null);

  if (error) {
    throw new Error(formatVaultQuantityError("vault_item_instances.count-active-by-card", error));
  }

  const rows = (data ?? []) as CountSourceInstanceRow[];
  const slabCertIds = Array.from(
    new Set(rows.map((row) => row.slab_cert_id?.trim() ?? "").filter((value) => value.length > 0)),
  );
  const slabCardByCertId = new Map<string, string>();

  if (slabCertIds.length > 0) {
    const { data: slabData, error: slabError } = await adminClient
      .from("slab_certs")
      .select("id,card_print_id")
      .in("id", slabCertIds);

    if (slabError) {
      throw new Error(formatVaultQuantityError("slab_certs.count-active-by-card", slabError));
    }

    for (const row of (slabData ?? []) as SlabCertCardRow[]) {
      const id = row.id?.trim() ?? "";
      const resolvedCardPrintId = row.card_print_id?.trim() ?? "";
      if (id && resolvedCardPrintId) {
        slabCardByCertId.set(id, resolvedCardPrintId);
      }
    }
  }

  const matchingRows = rows.filter((row) => {
    const directCardPrintId = row.card_print_id?.trim() ?? "";
    if (directCardPrintId === cardPrintId) {
      return true;
    }

    const slabCertId = row.slab_cert_id?.trim() ?? "";
    if (!slabCertId) {
      return false;
    }

    return slabCardByCertId.get(slabCertId) === cardPrintId;
  });

  const rawCount = matchingRows.filter((row) => row.slab_cert_id === null).length;
  const slabCount = matchingRows.length - rawCount;

  return {
    totalCount: matchingRows.length,
    rawCount,
    slabCount,
  };
}

export async function updateVaultItemQuantity(change: VaultQuantityChange): Promise<UpdateVaultItemQuantityResult> {
  const normalizedUserId = change.userId.trim();
  await assertAuthenticatedVaultUser(change.client, normalizedUserId);

  const normalizedItemId = change.itemId.trim();
  const normalizedChange = {
    ...change,
    userId: normalizedUserId,
    itemId: normalizedItemId,
  } as VaultQuantityChange;
  const actionLabel = change.type === "increment" ? "increment" : "decrement";

  return executeOwnerWriteV1({
    execution_name: "update_vault_item_quantity",
    actor_id: normalizedChange.userId,
    write: async (context) => {
      const { data: row, error: readError } = await normalizedChange.client
        .from("vault_items")
        .select("id,card_id,gv_id,condition_label,name,set_name,photo_url")
        .eq("id", normalizedChange.itemId)
        .eq("user_id", normalizedChange.userId)
        .is("archived_at", null)
        .maybeSingle();

      if (readError) {
        throw new Error(formatVaultQuantityError("vault_items.read-before-change", readError));
      }

      if (!row) {
        console.info("[vault:qty]", {
          user_id: normalizedChange.userId,
          item_id: normalizedChange.itemId,
          action: "remove",
        });

        return {
          status: "removed",
          itemId: normalizedChange.itemId,
        };
      }

      const currentRow = (row ?? null) as LegacyVaultBucketRow | null;
      if (!currentRow) {
        return {
          status: "removed",
          itemId: normalizedChange.itemId,
        };
      }

      const cardPrintId = currentRow.card_id?.trim() ?? "";
      if (!cardPrintId) {
        throw new Error("Instance mutation failed: missing cardPrintId on compatibility anchor.");
      }

      context.setMetadata("card_print_id", cardPrintId);

      if (change.type === "decrement") {
        const archivedInstance = await archiveRawVaultInstance(normalizedChange, cardPrintId);
        const counts = await countActiveInstancesForCard({
          userId: normalizedChange.userId,
          cardPrintId,
        });

        context.setMetadata("archived_instance_id", archivedInstance.id);
        context.setMetadata("expected_card_count", counts.totalCount);

        console.info("[vault:qty]", {
          user_id: normalizedChange.userId,
          item_id: normalizedChange.itemId,
          gv_id: currentRow.gv_id,
          action: actionLabel,
          quantity: counts.totalCount,
          raw_count: counts.rawCount,
          slab_count: counts.slabCount,
          gv_vi_id: archivedInstance.gv_vi_id ?? null,
        });

        if (counts.totalCount <= 0) {
          return {
            status: "removed",
            itemId: normalizedChange.itemId,
          };
        }

        return {
          status: "decremented",
          itemId: normalizedChange.itemId,
          quantity: counts.totalCount,
        };
      }

      const createdInstance = await createVaultInstanceForIncrement(normalizedChange, currentRow);
      const counts = await countActiveInstancesForCard({
        userId: normalizedChange.userId,
        cardPrintId,
      });

      context.setMetadata("created_instance_id", createdInstance.id);
      context.setMetadata("expected_card_count", counts.totalCount);

      console.info("[vault:qty]", {
        user_id: normalizedChange.userId,
        item_id: normalizedChange.itemId,
        gv_id: currentRow.gv_id,
        action: actionLabel,
        quantity: counts.totalCount,
        raw_count: counts.rawCount,
        slab_count: counts.slabCount,
        gv_vi_id: createdInstance.gv_vi_id ?? null,
      });

      return {
        status: change.type === "increment" ? "incremented" : "decremented",
        itemId: normalizedChange.itemId,
        quantity: counts.totalCount,
      };
    },
    proofs: [
      createVaultInstanceArchivedProofV1(({ getMetadata }) => {
        const instanceId = getMetadata<string>("archived_instance_id");
        return instanceId ? { instanceId } : null;
      }),
      createVaultInstanceActiveProofV1(({ getMetadata }) => {
        const instanceId = getMetadata<string>("created_instance_id");
        const cardPrintId = getMetadata<string>("card_print_id");
        return instanceId ? { instanceId, cardPrintId } : null;
      }),
      createNoArchivedLeakProofV1(({ getMetadata }) => {
        const instanceId = getMetadata<string>("created_instance_id");
        const cardPrintId = getMetadata<string>("card_print_id");
        return instanceId ? { instanceId, cardPrintId } : null;
      }),
      createVaultCardCountProofV1(({ getMetadata }) => {
        const cardPrintId = getMetadata<string>("card_print_id");
        const expectedCount = getMetadata<number>("expected_card_count");
        if (!cardPrintId || typeof expectedCount !== "number") {
          return null;
        }

        return {
          cardPrintId,
          expectedCount,
        };
      }),
    ],
  });
}
