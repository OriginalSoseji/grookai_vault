import "server-only";

import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { createServerComponentClient } from "@/lib/supabase/server";

type CardInteractionSourceRow = {
  id: string;
  card_print_id: string | null;
  vault_item_id: string | null;
  sender_user_id: string | null;
  receiver_user_id: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

type CardPrintSourceRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  sets:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

type PublicProfileRow = {
  user_id: string | null;
  slug: string | null;
  display_name: string | null;
};

type CardInteractionGroupStateRow = {
  user_id: string | null;
  card_print_id: string | null;
  counterpart_user_id: string | null;
  has_unread: boolean | null;
  last_read_at: string | null;
  latest_message_at: string | null;
  archived_at: string | null;
  closed_at: string | null;
};

export type UserCardInteractionRow = {
  id: string;
  vaultItemId: string;
  direction: "sent" | "received";
  message: string;
  status: "open" | "closed";
  createdAt: string | null;
  counterpartUserId: string;
  counterpartSlug: string | null;
  counterpartDisplayName: string;
  card: {
    cardPrintId: string;
    gvId: string;
    name: string;
    setCode: string;
    setName: string;
    number: string;
    imageUrl: string | null;
  };
};

export type UserCardInteractionGroupState = "inbox" | "closed" | "archived";
export type UserCardInteractionInboxView = "unread" | "inbox" | "sent" | "closed";

export type UserCardInteractionGroup = {
  groupKey: string;
  vaultItemId: string | null;
  direction: "sent" | "received";
  startedByCurrentUser: boolean;
  counterpartUserId: string;
  counterpartSlug: string | null;
  counterpartDisplayName: string;
  card: {
    cardPrintId: string;
    gvId: string;
    name: string;
    setCode: string;
    setName: string;
    number: string;
    imageUrl: string | null;
  };
  hasUnread: boolean;
  conversationState: UserCardInteractionGroupState;
  messageCount: number;
  latestCreatedAt: string | null;
  messages: Array<{
    id: string;
    message: string;
    createdAt: string | null;
    direction: "sent" | "received";
    status: "open" | "closed";
  }>;
};

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function compareCreatedAtDescending(left: string | null, right: string | null) {
  const leftTimestamp = left ? Date.parse(left) : Number.NEGATIVE_INFINITY;
  const rightTimestamp = right ? Date.parse(right) : Number.NEGATIVE_INFINITY;
  return rightTimestamp - leftTimestamp;
}

function buildInteractionGroupKey(cardPrintId: string, counterpartUserId: string) {
  return `${cardPrintId}:${counterpartUserId}`;
}

function getConversationState(row: CardInteractionGroupStateRow | null): UserCardInteractionGroupState {
  if (normalizeOptionalText(row?.archived_at)) {
    return "archived";
  }

  if (normalizeOptionalText(row?.closed_at)) {
    return "closed";
  }

  return "inbox";
}

export async function getUnreadCardInteractionGroupCount(userId: string): Promise<number> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return 0;
  }

  const client = createServerComponentClient();
  const { count, error } = await client
    .from("card_interaction_group_states")
    .select("user_id", { head: true, count: "exact" })
    .eq("user_id", normalizedUserId)
    .eq("has_unread", true)
    .is("archived_at", null)
    .is("closed_at", null);

  if (error) {
    throw new Error(`[network:inbox] unread count query failed: ${error.message}`);
  }

  return count ?? 0;
}

export async function getUserCardInteractionGroups(userId: string): Promise<UserCardInteractionGroup[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return [];
  }

  const client = createServerComponentClient();
  const { data, error } = await client
    .from("card_interactions")
    .select("id,card_print_id,vault_item_id,sender_user_id,receiver_user_id,message,status,created_at")
    .or(`sender_user_id.eq.${normalizedUserId},receiver_user_id.eq.${normalizedUserId}`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`[network:inbox] interactions query failed: ${error.message}`);
  }

  const interactionRows = (data ?? []) as CardInteractionSourceRow[];
  const cardPrintIds = uniqueValues(
    interactionRows
      .map((row) => normalizeOptionalText(row.card_print_id))
      .filter((value): value is string => Boolean(value)),
  );
  const counterpartUserIds = uniqueValues(
    interactionRows.flatMap((row) => {
      const senderUserId = normalizeOptionalText(row.sender_user_id);
      const receiverUserId = normalizeOptionalText(row.receiver_user_id);
      return [senderUserId, receiverUserId].filter(
        (value): value is string => Boolean(value) && value !== normalizedUserId,
      );
    }),
  );

  const [cardPrintsResponse, profilesResponse, groupStatesResponse] = await Promise.all([
    cardPrintIds.length > 0
      ? client
          .from("card_prints")
          .select("id,gv_id,name,set_code,number,image_url,image_alt_url,sets(name)")
          .in("id", cardPrintIds)
      : Promise.resolve({ data: [], error: null }),
    counterpartUserIds.length > 0
      ? client
          .from("public_profiles")
          .select("user_id,slug,display_name")
          .in("user_id", counterpartUserIds)
      : Promise.resolve({ data: [], error: null }),
    client
      .from("card_interaction_group_states")
      .select("user_id,card_print_id,counterpart_user_id,has_unread,last_read_at,latest_message_at,archived_at,closed_at")
      .eq("user_id", normalizedUserId),
  ]);

  if (cardPrintsResponse.error) {
    throw new Error(`[network:inbox] card print lookup failed: ${cardPrintsResponse.error.message}`);
  }

  if (profilesResponse.error) {
    throw new Error(`[network:inbox] profile lookup failed: ${profilesResponse.error.message}`);
  }

  if (groupStatesResponse.error) {
    throw new Error(`[network:inbox] group state lookup failed: ${groupStatesResponse.error.message}`);
  }

  const cardById = new Map(
    ((cardPrintsResponse.data ?? []) as CardPrintSourceRow[]).map((row) => [row.id, row]),
  );
  const profileByUserId = new Map(
    ((profilesResponse.data ?? []) as PublicProfileRow[])
      .map((row) => [normalizeOptionalText(row.user_id), row] as const)
      .filter((entry): entry is [string, PublicProfileRow] => Boolean(entry[0])),
  );
  const stateByGroupKey = new Map(
    ((groupStatesResponse.data ?? []) as CardInteractionGroupStateRow[])
      .map((row) => {
        const cardPrintId = normalizeOptionalText(row.card_print_id);
        const counterpartUserId = normalizeOptionalText(row.counterpart_user_id);
        if (!cardPrintId || !counterpartUserId) {
          return null;
        }

        return [buildInteractionGroupKey(cardPrintId, counterpartUserId), row] as const;
      })
      .filter((entry): entry is [string, CardInteractionGroupStateRow] => Boolean(entry)),
  );

  const flatRows = interactionRows.flatMap((row) => {
    const vaultItemId = normalizeOptionalText(row.vault_item_id);
    const cardPrintId = normalizeOptionalText(row.card_print_id);
    const senderUserId = normalizeOptionalText(row.sender_user_id);
    const receiverUserId = normalizeOptionalText(row.receiver_user_id);
    const status = normalizeOptionalText(row.status) === "closed" ? "closed" : "open";
    const message = normalizeOptionalText(row.message);

    if (!vaultItemId || !cardPrintId || !senderUserId || !receiverUserId || !message) {
      return [];
    }

    const card = cardById.get(cardPrintId);
    if (!card) {
      return [];
    }

    const direction = senderUserId === normalizedUserId ? "sent" : "received";
    const counterpartUserId = direction === "sent" ? receiverUserId : senderUserId;
    const counterpartProfile = profileByUserId.get(counterpartUserId);
    const setRecord = Array.isArray(card.sets) ? card.sets[0] : card.sets;

    return [
      {
        id: row.id,
        vaultItemId,
        direction,
        message,
        status,
        createdAt: row.created_at ?? null,
        counterpartUserId,
        counterpartSlug: normalizeOptionalText(counterpartProfile?.slug),
        counterpartDisplayName:
          normalizeOptionalText(counterpartProfile?.display_name) ??
          (direction === "sent" ? "Collector" : "Interested collector"),
        card: {
          cardPrintId,
          gvId: normalizeOptionalText(card.gv_id) ?? cardPrintId,
          name: normalizeOptionalText(card.name) ?? "Unknown card",
          setCode: normalizeOptionalText(card.set_code) ?? "Unknown set",
          setName:
            normalizeOptionalText(setRecord?.name) ??
            normalizeOptionalText(card.set_code) ??
            "Unknown set",
          number: normalizeOptionalText(card.number) ?? "—",
          imageUrl:
            getBestPublicCardImageUrl(card.image_url, card.image_alt_url) ??
            normalizeOptionalText(card.image_url),
        },
      } satisfies UserCardInteractionRow,
    ];
  });

  const groups = new Map<
    string,
    Omit<UserCardInteractionGroup, "startedByCurrentUser" | "hasUnread" | "conversationState"> & {
      hasUnread: boolean;
      conversationState: UserCardInteractionGroupState;
      startedByCurrentUser: boolean;
    }
  >();

  for (const row of flatRows) {
    const groupKey = buildInteractionGroupKey(row.card.cardPrintId, row.counterpartUserId);
    const existingGroup = groups.get(groupKey);
    const message = {
      id: row.id,
      message: row.message,
      createdAt: row.createdAt,
      direction: row.direction,
      status: row.status,
    };

    if (!existingGroup) {
      const stateRow = stateByGroupKey.get(groupKey) ?? null;
      groups.set(groupKey, {
        groupKey,
        vaultItemId: row.vaultItemId,
        direction: row.direction,
        startedByCurrentUser: row.direction === "sent",
        counterpartUserId: row.counterpartUserId,
        counterpartSlug: row.counterpartSlug,
        counterpartDisplayName: row.counterpartDisplayName,
        card: row.card,
        hasUnread: Boolean(stateRow?.has_unread ?? row.direction === "received"),
        conversationState: getConversationState(stateRow),
        messageCount: 1,
        latestCreatedAt: normalizeOptionalText(stateRow?.latest_message_at) ?? row.createdAt,
        messages: [message],
      });
      continue;
    }

    if (existingGroup.vaultItemId !== row.vaultItemId) {
      existingGroup.vaultItemId = null;
    }

    existingGroup.messages.push(message);
    existingGroup.messageCount += 1;
  }

  return Array.from(groups.values())
    .map((group) => {
      const messages = [...group.messages].reverse();
      return {
        ...group,
        startedByCurrentUser: messages[0]?.direction === "sent",
        hasUnread: group.conversationState === "inbox" ? group.hasUnread : false,
        messages,
      };
    })
    .sort((left, right) => compareCreatedAtDescending(left.latestCreatedAt, right.latestCreatedAt));
}
