import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

type CardInteractionInsert = {
  cardPrintId: string;
  vaultItemId: string;
  senderUserId: string;
  receiverUserId: string;
  message: string;
};

type InteractionAuthorization =
  | { kind: "public-target" }
  | { kind: "existing-thread" };

type InsertedInteractionRow = {
  id: string;
};

type InsertCardInteractionResult = {
  data: InsertedInteractionRow | null;
  error: PostgrestError | null;
  usedCanonicalFallback: boolean;
};

const CONTACTABLE_INTENTS = new Set(["trade", "sell", "showcase"]);

function isRowLevelSecurityError(error: PostgrestError | null) {
  return error?.code === "42501" && /row-level security|row level security/i.test(error.message);
}

async function hasPublicTargetAuthorization(
  client: SupabaseClient,
  input: CardInteractionInsert,
) {
  const { data, error } = await client
    .from("v_card_contact_targets_v1")
    .select("vault_item_id,owner_user_id,card_print_id,intent")
    .eq("vault_item_id", input.vaultItemId)
    .eq("owner_user_id", input.receiverUserId)
    .eq("card_print_id", input.cardPrintId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Boolean(
    !error &&
      data?.vault_item_id === input.vaultItemId &&
      data.owner_user_id === input.receiverUserId &&
      data.card_print_id === input.cardPrintId &&
      typeof data.intent === "string" &&
      CONTACTABLE_INTENTS.has(data.intent),
  );
}

async function hasExistingThreadAuthorization(
  client: SupabaseClient,
  input: CardInteractionInsert,
) {
  const participantFilter = [
    `and(sender_user_id.eq.${input.senderUserId},receiver_user_id.eq.${input.receiverUserId})`,
    `and(sender_user_id.eq.${input.receiverUserId},receiver_user_id.eq.${input.senderUserId})`,
  ].join(",");
  const { data, error } = await client
    .from("card_interactions")
    .select("id")
    .eq("vault_item_id", input.vaultItemId)
    .eq("card_print_id", input.cardPrintId)
    .or(participantFilter)
    .limit(1)
    .maybeSingle();

  return Boolean(!error && data?.id);
}

async function isBlocked(
  client: SupabaseClient,
  senderUserId: string,
  receiverUserId: string,
) {
  const { data, error } = await client.rpc("trust_block_exists_between_v1", {
    p_user_id: senderUserId,
    p_other_user_id: receiverUserId,
  });

  // Fail closed when the trust check itself cannot be completed.
  return error ? true : data !== false;
}

/**
 * Insert through the authenticated client first so the database policy remains
 * authoritative. Production currently has canonical/legacy intent drift for
 * some otherwise contactable copies. Only an RLS rejection can enter the
 * server-only fallback, which re-proves the canonical target (or an existing
 * participant thread) and the two-way block state before using the owner-write
 * boundary's admin client.
 */
export async function insertCardInteraction({
  client,
  adminClient,
  input,
  authorization,
}: {
  client: SupabaseClient;
  adminClient: SupabaseClient;
  input: CardInteractionInsert;
  authorization: InteractionAuthorization;
}): Promise<InsertCardInteractionResult> {
  const payload = {
    card_print_id: input.cardPrintId,
    vault_item_id: input.vaultItemId,
    sender_user_id: input.senderUserId,
    receiver_user_id: input.receiverUserId,
    message: input.message,
  };
  const primary = await client.from("card_interactions").insert(payload).select("id").single();

  if (!primary.error) {
    return {
      data: (primary.data ?? null) as InsertedInteractionRow | null,
      error: null,
      usedCanonicalFallback: false,
    };
  }

  if (!isRowLevelSecurityError(primary.error)) {
    return { data: null, error: primary.error, usedCanonicalFallback: false };
  }

  const isAuthorized =
    authorization.kind === "public-target"
      ? await hasPublicTargetAuthorization(client, input)
      : await hasExistingThreadAuthorization(client, input);
  if (!isAuthorized || (await isBlocked(client, input.senderUserId, input.receiverUserId))) {
    return { data: null, error: primary.error, usedCanonicalFallback: false };
  }

  const fallback = await adminClient
    .from("card_interactions")
    .insert(payload)
    .select("id")
    .single();

  if (fallback.error) {
    return { data: null, error: fallback.error, usedCanonicalFallback: true };
  }

  return {
    data: (fallback.data ?? null) as InsertedInteractionRow | null,
    error: null,
    usedCanonicalFallback: true,
  };
}
