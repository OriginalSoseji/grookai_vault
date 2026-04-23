import "server-only";

import type {
  PromotionTransitionState,
  PublicProvisionalCard,
} from "@/lib/provisional/publicProvisionalTypes";
import { shouldShowPromotionTransitionNote } from "@/lib/provisional/shouldShowPromotionTransitionNote";
import { createPublicServerClient } from "@/lib/supabase/publicServer";

export const PROMOTION_TRANSITION_LABEL = "Now confirmed in Grookai";

export const EMPTY_PROMOTION_TRANSITION_STATE: PromotionTransitionState = Object.freeze({
  isPromotedFromProvisional: false,
  transitionLabel: null,
});

const PROMOTED_FROM_PROVISIONAL_STATE: PromotionTransitionState = Object.freeze({
  isPromotedFromProvisional: true,
  transitionLabel: PROMOTION_TRANSITION_LABEL,
});

type CanonicalCardIdentity = {
  id?: string | null;
};

type PromotionTransitionWarehouseRow = {
  id: string | null;
  promoted_card_print_id: string | null;
  promoted_at: string | null;
};

export type PromotionTransitionCanonicalCard<T extends CanonicalCardIdentity> = T & {
  promotion_transition?: PromotionTransitionState;
};

export type ProvisionalPromotionLink = PublicProvisionalCard & {
  promoted_card_print_id?: string | null;
};

function createPublicSupabase() {
  return createPublicServerClient(120);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

// LOCK: Promotion transition is read-only.
// LOCK: Never infer canonization without explicit linkage.
export function getPromotionTransitionState(input?: {
  promoted_card_print_id?: unknown;
  promoted_at?: unknown;
  promotedAt?: string | null;
  hasExplicitPromotionLinkage?: boolean;
  now?: Date;
}): PromotionTransitionState {
  const hasExplicitPromotionLinkage =
    normalizeText(input?.promoted_card_print_id) || input?.hasExplicitPromotionLinkage === true;
  const promotedAt = normalizeText(input?.promoted_at) || input?.promotedAt || null;

  if (
    hasExplicitPromotionLinkage &&
    shouldShowPromotionTransitionNote({
      promotedAt,
      now: input?.now,
    })
  ) {
    return PROMOTED_FROM_PROVISIONAL_STATE;
  }

  return EMPTY_PROMOTION_TRANSITION_STATE;
}

export function applyPromotionTransitionsToCanonicalRows<T extends CanonicalCardIdentity>(
  canonicalRows: T[],
  transitionByCardPrintId: ReadonlyMap<string, PromotionTransitionState>,
): Array<PromotionTransitionCanonicalCard<T>> {
  return canonicalRows.map((row) => {
    const cardPrintId = normalizeText(row.id);
    if (!cardPrintId) {
      return row;
    }

    const transitionState = transitionByCardPrintId.get(cardPrintId) ?? EMPTY_PROMOTION_TRANSITION_STATE;
    if (!transitionState.isPromotedFromProvisional) {
      return row;
    }

    return Object.freeze({
      ...row,
      promotion_transition: transitionState,
    });
  });
}

export function suppressPromotedProvisionalRows<T extends object>(
  provisionalRows: T[],
  canonicalRows: CanonicalCardIdentity[],
): T[] {
  if (provisionalRows.length === 0 || canonicalRows.length === 0) {
    return provisionalRows;
  }

  const canonicalCardPrintIds = new Set(
    canonicalRows.map((row) => normalizeText(row.id)).filter(Boolean),
  );

  if (canonicalCardPrintIds.size === 0) {
    return provisionalRows;
  }

  return provisionalRows.filter((row) => {
    const promotedCardPrintId = normalizeText(
      (row as { promoted_card_print_id?: unknown }).promoted_card_print_id,
    );
    return !promotedCardPrintId || !canonicalCardPrintIds.has(promotedCardPrintId);
  });
}

export async function getPromotionTransitionStateForCanonicalCards(
  cardPrintIds: Array<string | null | undefined>,
): Promise<Map<string, PromotionTransitionState>> {
  const uniqueCardPrintIds = Array.from(new Set(cardPrintIds.map(normalizeText).filter(Boolean)));
  if (uniqueCardPrintIds.length === 0) {
    return new Map();
  }

  const supabase = createPublicSupabase();

  // SECURITY: This is the only public read-side promotion-link lookup.
  // It reads only explicit candidate -> canonical card linkage.
  const { data, error } = await supabase
    .from("canon_warehouse_candidates")
    .select("id,promoted_card_print_id,promoted_at")
    .in("promoted_card_print_id", uniqueCardPrintIds)
    .not("promoted_card_print_id", "is", null)
    .not("promoted_at", "is", null)
    .limit(Math.min(uniqueCardPrintIds.length * 2, 500));

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[promotion-transition] linkage lookup failed closed", {
        message: error.message,
      });
    }

    return new Map();
  }

  const transitionByCardPrintId = new Map<string, PromotionTransitionState>();
  for (const row of (data ?? []) as PromotionTransitionWarehouseRow[]) {
    const promotedCardPrintId = normalizeText(row.promoted_card_print_id);
    if (!promotedCardPrintId) {
      continue;
    }

    transitionByCardPrintId.set(
      promotedCardPrintId,
      getPromotionTransitionState({
        promoted_card_print_id: promotedCardPrintId,
        promoted_at: row.promoted_at,
      }),
    );
  }

  return transitionByCardPrintId;
}
