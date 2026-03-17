import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export type ActiveVaultAnchor = {
  id: string;
  user_id: string;
  card_id: string | null;
  gv_id: string | null;
  qty: number | null;
  created_at: string | null;
  archived_at: string | null;
  condition_label: string | null;
  acquisition_cost: number | null;
  notes: string | null;
  name: string | null;
  set_name: string | null;
  photo_url: string | null;
};

type ResolveActiveVaultAnchorParams = {
  client: SupabaseClient;
  userId: string;
  cardId: string;
  createData: {
    gvId: string;
    quantity: number;
    conditionLabel?: string | null;
    acquisitionCost?: number | null;
    createdAt?: string | null;
    notes?: string | null;
    name?: string | null;
    setName?: string | null;
    photoUrl?: string | null;
  };
};

export type ResolveActiveVaultAnchorResult = {
  anchor: ActiveVaultAnchor;
  insertedAnchorId: string | null;
  archivedDuplicateIds: string[];
};

function formatAnchorError(step: string, error: PostgrestError) {
  const parts = [
    `[${step}]`,
    error.message,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.join(" | ");
}

async function fetchActiveVaultAnchors(client: SupabaseClient, userId: string, cardId: string) {
  const { data, error } = await client
    .from("vault_items")
    .select(
      "id,user_id,card_id,gv_id,qty,created_at,archived_at,condition_label,acquisition_cost,notes,name,set_name,photo_url",
    )
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw new Error(formatAnchorError("vault_items.fetch-active-anchors", error));
  }

  return (data ?? []) as ActiveVaultAnchor[];
}

async function archiveExtraVaultAnchors(client: SupabaseClient, extraIds: string[]) {
  if (extraIds.length === 0) {
    return;
  }

  const { error } = await client
    .from("vault_items")
    .update({
      qty: 0,
      archived_at: new Date().toISOString(),
    })
    .in("id", extraIds)
    .is("archived_at", null);

  if (error) {
    throw new Error(formatAnchorError("vault_items.archive-extra-active-anchors", error));
  }
}

async function insertActiveVaultAnchor(
  client: SupabaseClient,
  userId: string,
  cardId: string,
  createData: ResolveActiveVaultAnchorParams["createData"],
) {
  const { data, error } = await client
    .from("vault_items")
    .insert({
      user_id: userId,
      card_id: cardId,
      gv_id: createData.gvId,
      qty: createData.quantity,
      condition_label: createData.conditionLabel ?? "NM",
      acquisition_cost: createData.acquisitionCost ?? null,
      created_at: createData.createdAt ?? null,
      notes: createData.notes ?? null,
      name: createData.name ?? null,
      set_name: createData.setName ?? null,
      photo_url: createData.photoUrl ?? null,
    })
    .select(
      "id,user_id,card_id,gv_id,qty,created_at,archived_at,condition_label,acquisition_cost,notes,name,set_name,photo_url",
    )
    .single();

  if (error) {
    throw error;
  }

  return data as ActiveVaultAnchor;
}

export async function resolveActiveVaultAnchor({
  client,
  userId,
  cardId,
  createData,
}: ResolveActiveVaultAnchorParams): Promise<ResolveActiveVaultAnchorResult> {
  let activeAnchors = await fetchActiveVaultAnchors(client, userId, cardId);
  let insertedAnchorId: string | null = null;

  if (activeAnchors.length === 0) {
    try {
      const insertedAnchor = await insertActiveVaultAnchor(client, userId, cardId, createData);
      insertedAnchorId = insertedAnchor.id;
    } catch (error) {
      activeAnchors = await fetchActiveVaultAnchors(client, userId, cardId);
      if (activeAnchors.length === 0) {
        throw error instanceof Error ? error : new Error("Active vault anchor insert failed.");
      }
    }

    activeAnchors = await fetchActiveVaultAnchors(client, userId, cardId);
  }

  if (activeAnchors.length === 0) {
    throw new Error("Active vault anchor could not be resolved.");
  }

  const primaryAnchor = activeAnchors[0];
  if (!primaryAnchor?.id) {
    throw new Error("Resolved active vault anchor is missing id.");
  }

  const archivedDuplicateIds = activeAnchors
    .slice(1)
    .map((row) => row.id)
    .filter((value): value is string => Boolean(value));

  if (archivedDuplicateIds.length > 0) {
    await archiveExtraVaultAnchors(client, archivedDuplicateIds);
  }

  return {
    anchor: primaryAnchor,
    insertedAnchorId,
    archivedDuplicateIds,
  };
}
