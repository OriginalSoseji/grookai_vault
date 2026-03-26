import "server-only";

import { getUserCardInteractionGroups } from "@/lib/network/getUserCardInteractions";

export type OwnedCardMessageSummary = {
  cardPrintId: string;
  activeCount: number;
  unreadCount: number;
  latestCreatedAt: string | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function compareCreatedAtDescending(left: string | null, right: string | null) {
  const leftTimestamp = left ? Date.parse(left) : Number.NEGATIVE_INFINITY;
  const rightTimestamp = right ? Date.parse(right) : Number.NEGATIVE_INFINITY;
  return rightTimestamp - leftTimestamp;
}

export function buildOwnedCardMessagesHref({
  cardPrintId,
  unreadCount = 0,
}: {
  cardPrintId: string;
  unreadCount?: number;
}) {
  const params = new URLSearchParams();
  if (unreadCount > 0) {
    params.set("view", "unread");
  }
  params.set("card", cardPrintId);
  return `/network/inbox?${params.toString()}`;
}

export async function getOwnedCardMessageSummaries(
  userId: string,
  cardPrintIds?: string[] | null,
): Promise<OwnedCardMessageSummary[]> {
  const normalizedUserId = normalizeOptionalText(userId);
  if (!normalizedUserId) {
    return [];
  }

  const requestedCardPrintIds = new Set(
    (cardPrintIds ?? [])
      .map((value) => normalizeOptionalText(value))
      .filter((value): value is string => Boolean(value)),
  );

  const groups = await getUserCardInteractionGroups(normalizedUserId);
  const summariesByCardPrintId = new Map<string, OwnedCardMessageSummary>();

  for (const group of groups) {
    if (group.conversationState !== "inbox") {
      continue;
    }

    const cardPrintId = normalizeOptionalText(group.card.cardPrintId);
    if (!cardPrintId) {
      continue;
    }

    if (requestedCardPrintIds.size > 0 && !requestedCardPrintIds.has(cardPrintId)) {
      continue;
    }

    const current = summariesByCardPrintId.get(cardPrintId) ?? {
      cardPrintId,
      activeCount: 0,
      unreadCount: 0,
      latestCreatedAt: null,
    };

    current.activeCount += 1;
    if (group.hasUnread) {
      current.unreadCount += 1;
    }

    if (compareCreatedAtDescending(current.latestCreatedAt, group.latestCreatedAt) > 0) {
      current.latestCreatedAt = group.latestCreatedAt;
    }

    summariesByCardPrintId.set(cardPrintId, current);
  }

  return Array.from(summariesByCardPrintId.values());
}
