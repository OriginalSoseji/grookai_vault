import "server-only";

import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { normalizeVaultIntent, type VaultIntent } from "@/lib/network/intent";
import { resolveDisplayImageUrl } from "@/lib/publicCardImage";
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
  variant_key: string | null;
  printed_identity_modifier: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
  display_image_url?: string | null;
  sets:
    | {
        name: string | null;
        identity_model: string | null;
      }
    | {
        name: string | null;
        identity_model: string | null;
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

type OwnedSourceInstanceRow = {
  id: string;
  gv_vi_id: string | null;
  card_print_id: string | null;
  legacy_vault_item_id: string | null;
  condition_label: string | null;
  intent: string | null;
  is_graded: boolean | null;
  grade_company: string | null;
  grade_value: string | null;
  grade_label: string | null;
  created_at: string | null;
};

type CardInteractionOutcomeSourceRow = {
  id: string;
  execution_event_id: string | null;
  latest_interaction_id: string | null;
  source_user_id: string | null;
  target_user_id: string | null;
  outcome_type: string | null;
  price_amount: string | number | null;
  price_currency: string | null;
  executed_by_user_id: string | null;
  created_at: string | null;
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
      variant_key?: string;
      printed_identity_modifier?: string;
      set_identity_model?: string;
      setCode: string;
      setName: string;
      number: string;
      imageUrl: string | null;
    };
};

export type UserCardInteractionGroupState = "inbox" | "closed" | "archived";
export type UserCardInteractionInboxView = "unread" | "inbox" | "sent" | "closed";

export type UserCardInteractionOwnedSourceInstance = {
  instanceId: string;
  gvviId: string | null;
  label: string;
  intent: VaultIntent;
  conditionLabel: string | null;
  isGraded: boolean;
  gradeCompany: string | null;
  gradeValue: string | null;
  gradeLabel: string | null;
  createdAt: string | null;
};

export type UserCardInteractionOutcome = {
  outcomeId: string;
  executionEventId: string;
  latestInteractionId: string;
  outcomeType: "sale" | "trade";
  priceAmount: string | null;
  priceCurrency: string | null;
  sourceUserId: string;
  targetUserId: string;
  executedByUserId: string;
  createdAt: string | null;
};

export type UserCardInteractionGroup = {
  groupKey: string;
  latestInteractionId: string;
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
    variant_key?: string;
    printed_identity_modifier?: string;
    set_identity_model?: string;
    setCode: string;
    setName: string;
    number: string;
    imageUrl: string | null;
  };
  hasUnread: boolean;
  conversationState: UserCardInteractionGroupState;
  messageCount: number;
  latestCreatedAt: string | null;
  ownedSourceInstances: UserCardInteractionOwnedSourceInstance[];
  latestOutcome: UserCardInteractionOutcome | null;
  pendingTradeExecutionEventId: string | null;
  hasAmbiguousPendingTradeEvent: boolean;
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

function normalizeOptionalNumericText(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }

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

function buildOwnedInstanceLabel(row: OwnedSourceInstanceRow) {
  const gradeLabel = normalizeOptionalText(row.grade_label);
  const gradeCompany = normalizeOptionalText(row.grade_company);
  const gradeValue = normalizeOptionalText(row.grade_value);
  const conditionLabel = normalizeOptionalText(row.condition_label);
  const gvviId = normalizeOptionalText(row.gv_vi_id);

  const parts = row.is_graded
    ? [gradeLabel, [gradeCompany, gradeValue].filter(Boolean).join(" "), gvviId]
    : [conditionLabel, gvviId];

  return parts.map((value) => normalizeOptionalText(value)).filter(Boolean).join(" • ") || "Owned instance";
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
  const adminClient = createServerAdminClient();
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

  const [cardPrintsResponse, profilesResponse, groupStatesResponse, tradeOutcomesResponse] = await Promise.all([
    cardPrintIds.length > 0
      ? client
          .from("card_prints")
          .select(
            "id,gv_id,name,set_code,number,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(name,identity_model)",
          )
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
    client
      .from("card_interaction_outcomes")
      .select("id,execution_event_id,latest_interaction_id,source_user_id,target_user_id,outcome_type,price_amount,price_currency,executed_by_user_id,created_at")
      .eq("outcome_type", "trade")
      .or(`source_user_id.eq.${normalizedUserId},target_user_id.eq.${normalizedUserId}`),
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

  if (tradeOutcomesResponse.error) {
    throw new Error(`[network:inbox] trade outcome lookup failed: ${tradeOutcomesResponse.error.message}`);
  }

  const resolvedCardRows = await Promise.all(
    ((cardPrintsResponse.data ?? []) as CardPrintSourceRow[]).map(async (row) => {
      const imageFields = await resolveCardImageFieldsV1(row);
      return { ...row, display_image_url: imageFields.display_image_url };
    }),
  );
  const cardById = new Map(
    resolvedCardRows.map((row) => [row.id, row]),
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
          variant_key: normalizeOptionalText(card.variant_key) ?? undefined,
          printed_identity_modifier: normalizeOptionalText(card.printed_identity_modifier) ?? undefined,
          set_identity_model: normalizeOptionalText(setRecord?.identity_model) ?? undefined,
          setCode: normalizeOptionalText(card.set_code) ?? "Unknown set",
          setName:
            normalizeOptionalText(setRecord?.name) ??
            normalizeOptionalText(card.set_code) ??
            "Unknown set",
          number: normalizeOptionalText(card.number) ?? "—",
          imageUrl: resolveDisplayImageUrl({
            display_image_url: card.display_image_url,
            image_url: card.image_url,
            image_alt_url: card.image_alt_url,
            representative_image_url: card.representative_image_url,
          }),
        },
      } satisfies UserCardInteractionRow,
    ];
  });

  const groups = new Map<
    string,
    Omit<
      UserCardInteractionGroup,
      "startedByCurrentUser" | "hasUnread" | "conversationState" | "ownedSourceInstances" | "latestOutcome" | "pendingTradeExecutionEventId" | "hasAmbiguousPendingTradeEvent"
    > & {
      startedByCurrentUser: boolean;
      hasUnread: boolean;
      conversationState: UserCardInteractionGroupState;
      ownedSourceInstances: UserCardInteractionOwnedSourceInstance[];
      latestOutcome: UserCardInteractionOutcome | null;
      pendingTradeExecutionEventId: string | null;
      hasAmbiguousPendingTradeEvent: boolean;
    }
  >();
  const interactionIdToGroupKey = new Map<string, string>();

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
    interactionIdToGroupKey.set(row.id, groupKey);

    if (!existingGroup) {
      const stateRow = stateByGroupKey.get(groupKey) ?? null;
      groups.set(groupKey, {
        groupKey,
        latestInteractionId: row.id,
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
        ownedSourceInstances: [],
        latestOutcome: null,
        pendingTradeExecutionEventId: null,
        hasAmbiguousPendingTradeEvent: false,
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

  const groupList = Array.from(groups.values())
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

  const groupByKey = new Map(groupList.map((group) => [group.groupKey, group]));
  const groupVaultItemIds = uniqueValues(
    groupList
      .map((group) => normalizeOptionalText(group.vaultItemId))
      .filter((value): value is string => Boolean(value)),
  );

  if (groupVaultItemIds.length > 0) {
    const { data: ownedInstancesData, error: ownedInstancesError } = await adminClient
      .from("vault_item_instances")
      .select("id,gv_vi_id,card_print_id,legacy_vault_item_id,condition_label,intent,is_graded,grade_company,grade_value,grade_label,created_at")
      .eq("user_id", normalizedUserId)
      .is("archived_at", null)
      .in("legacy_vault_item_id", groupVaultItemIds);

    if (ownedInstancesError) {
      throw new Error(`[network:inbox] owned source instance lookup failed: ${ownedInstancesError.message}`);
    }

    const ownedInstancesByVaultItemId = new Map<string, UserCardInteractionOwnedSourceInstance[]>();

    for (const row of (ownedInstancesData ?? []) as OwnedSourceInstanceRow[]) {
      const legacyVaultItemId = normalizeOptionalText(row.legacy_vault_item_id);
      const cardPrintId = normalizeOptionalText(row.card_print_id);
      if (!legacyVaultItemId || !cardPrintId) {
        continue;
      }

      const group = groupList.find(
        (candidate) => candidate.vaultItemId === legacyVaultItemId && candidate.card.cardPrintId === cardPrintId,
      );

      if (!group) {
        continue;
      }

      const instances = ownedInstancesByVaultItemId.get(legacyVaultItemId) ?? [];
      instances.push({
        instanceId: row.id,
        gvviId: normalizeOptionalText(row.gv_vi_id),
        label: buildOwnedInstanceLabel(row),
        intent: normalizeVaultIntent(row.intent) ?? "hold",
        conditionLabel: normalizeOptionalText(row.condition_label),
        isGraded: Boolean(row.is_graded),
        gradeCompany: normalizeOptionalText(row.grade_company),
        gradeValue: normalizeOptionalText(row.grade_value),
        gradeLabel: normalizeOptionalText(row.grade_label),
        createdAt: row.created_at ?? null,
      });
      ownedInstancesByVaultItemId.set(legacyVaultItemId, instances);
    }

    for (const group of groupList) {
      if (!group.vaultItemId) {
        continue;
      }

      group.ownedSourceInstances = [...(ownedInstancesByVaultItemId.get(group.vaultItemId) ?? [])].sort((left, right) =>
        compareCreatedAtDescending(left.createdAt, right.createdAt),
      );
    }
  }

  const interactionIds = uniqueValues(groupList.flatMap((group) => group.messages.map((message) => message.id)));

  if (interactionIds.length > 0) {
    const { data: outcomeRowsData, error: outcomesError } = await client
      .from("card_interaction_outcomes")
      .select("id,execution_event_id,latest_interaction_id,source_user_id,target_user_id,outcome_type,price_amount,price_currency,executed_by_user_id,created_at")
      .in("latest_interaction_id", interactionIds);

    if (outcomesError) {
      throw new Error(`[network:inbox] interaction outcome lookup failed: ${outcomesError.message}`);
    }

    for (const row of (outcomeRowsData ?? []) as CardInteractionOutcomeSourceRow[]) {
      const interactionId = normalizeOptionalText(row.latest_interaction_id);
      const groupKey = interactionId ? interactionIdToGroupKey.get(interactionId) : null;
      const group = groupKey ? groupByKey.get(groupKey) : null;
      const executionEventId = normalizeOptionalText(row.execution_event_id);
      const outcomeId = normalizeOptionalText(row.id);
      const sourceUserId = normalizeOptionalText(row.source_user_id);
      const targetUserId = normalizeOptionalText(row.target_user_id);
      const executedByUserId = normalizeOptionalText(row.executed_by_user_id);
      const outcomeType = normalizeOptionalText(row.outcome_type);

      if (!group || !interactionId || !executionEventId || !outcomeId || !sourceUserId || !targetUserId || !executedByUserId) {
        continue;
      }

      if (outcomeType !== "sale" && outcomeType !== "trade") {
        continue;
      }

      const candidateOutcome: UserCardInteractionOutcome = {
        outcomeId,
        executionEventId,
        latestInteractionId: interactionId,
        outcomeType,
        priceAmount: normalizeOptionalNumericText(row.price_amount),
        priceCurrency: normalizeOptionalText(row.price_currency),
        sourceUserId,
        targetUserId,
        executedByUserId,
        createdAt: row.created_at ?? null,
      };

      if (!group.latestOutcome || compareCreatedAtDescending(group.latestOutcome.createdAt, candidateOutcome.createdAt) > 0) {
        group.latestOutcome = candidateOutcome;
      }
    }
  }

  const tradeEventRows = (tradeOutcomesResponse.data ?? []) as CardInteractionOutcomeSourceRow[];
  const tradeEventCandidatesByCounterpart = new Map<string, string[]>();
  const tradeEventRowsByEventId = new Map<string, CardInteractionOutcomeSourceRow[]>();

  for (const row of tradeEventRows) {
    const eventId = normalizeOptionalText(row.execution_event_id);
    if (!eventId) {
      continue;
    }

    const rows = tradeEventRowsByEventId.get(eventId) ?? [];
    rows.push(row);
    tradeEventRowsByEventId.set(eventId, rows);
  }

  for (const [eventId, rows] of tradeEventRowsByEventId) {
    if (rows.length !== 1) {
      continue;
    }

    const row = rows[0];
    const sourceUserId = normalizeOptionalText(row.source_user_id);
    const targetUserId = normalizeOptionalText(row.target_user_id);

    if (!sourceUserId || !targetUserId) {
      continue;
    }

    if (sourceUserId === normalizedUserId || targetUserId !== normalizedUserId) {
      continue;
    }

    const candidates = tradeEventCandidatesByCounterpart.get(sourceUserId) ?? [];
    candidates.push(eventId);
    tradeEventCandidatesByCounterpart.set(sourceUserId, candidates);
  }

  for (const group of groupList) {
    const candidates = tradeEventCandidatesByCounterpart.get(group.counterpartUserId) ?? [];
    group.pendingTradeExecutionEventId = candidates.length === 1 ? candidates[0] : null;
    group.hasAmbiguousPendingTradeEvent = candidates.length > 1;
  }

  return groupList;
}
