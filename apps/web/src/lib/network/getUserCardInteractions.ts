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

export type UserCardInteractionGroup = {
  groupKey: string;
  vaultItemId: string | null;
  direction: "sent" | "received";
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
  status: "open" | "closed";
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

function buildInteractionGroupKey(cardPrintId: string, counterpartUserId: string) {
  return `${cardPrintId}:${counterpartUserId}`;
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

  const [cardPrintsResponse, profilesResponse] = await Promise.all([
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
  ]);

  if (cardPrintsResponse.error) {
    throw new Error(`[network:inbox] card print lookup failed: ${cardPrintsResponse.error.message}`);
  }

  if (profilesResponse.error) {
    throw new Error(`[network:inbox] profile lookup failed: ${profilesResponse.error.message}`);
  }

  const cardById = new Map(
    ((cardPrintsResponse.data ?? []) as CardPrintSourceRow[]).map((row) => [row.id, row]),
  );
  const profileByUserId = new Map(
    ((profilesResponse.data ?? []) as PublicProfileRow[])
      .map((row) => [normalizeOptionalText(row.user_id), row] as const)
      .filter((entry): entry is [string, PublicProfileRow] => Boolean(entry[0])),
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
          imageUrl: getBestPublicCardImageUrl(card.image_url, card.image_alt_url) ?? normalizeOptionalText(card.image_url),
        },
      } satisfies UserCardInteractionRow,
    ];
  });

  const groups = new Map<string, UserCardInteractionGroup>();

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
      groups.set(groupKey, {
        groupKey,
        vaultItemId: row.vaultItemId,
        direction: row.direction,
        counterpartUserId: row.counterpartUserId,
        counterpartSlug: row.counterpartSlug,
        counterpartDisplayName: row.counterpartDisplayName,
        card: row.card,
        status: row.status,
        messageCount: 1,
        latestCreatedAt: row.createdAt,
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

  return Array.from(groups.values()).map((group) => ({
    ...group,
    messages: [...group.messages].reverse(),
  }));
}
