import "server-only";

import { createClient } from "@supabase/supabase-js";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import type { FeaturedExploreCard } from "@/lib/cards/getFeaturedExploreCards";
import {
  getPromotionTransitionState,
  type PromotionTransitionCanonicalCard,
} from "@/lib/provisional/getPromotionTransitionState";
import { shouldShowPromotionTransitionNote } from "@/lib/provisional/shouldShowPromotionTransitionNote";
import type { PromotionTransitionState } from "@/lib/provisional/publicProvisionalTypes";

const RECENTLY_CONFIRMED_CARD_LIMIT = 6;

type PromotionLinkRow = {
  promoted_card_print_id: string | null;
  promoted_at: string | null;
};

type RecentlyConfirmedCardPrintRow = {
  id: string | null;
  gv_id: string | null;
  name: string | null;
  number: string | null;
  rarity: string | null;
  set_code: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
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

export type RecentlyConfirmedCanonicalCard = PromotionTransitionCanonicalCard<
  FeaturedExploreCard & {
    id: string;
    promoted_at: string;
    promotion_transition: PromotionTransitionState;
  }
>;

function createPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizePromotionLinks(rows: PromotionLinkRow[], limit: number, now?: Date) {
  const seenCardPrintIds = new Set<string>();
  const links: Array<{ cardPrintId: string; promotedAt: string }> = [];

  for (const row of rows) {
    const cardPrintId = normalizeText(row.promoted_card_print_id);
    const promotedAt = normalizeText(row.promoted_at);

    if (!cardPrintId || seenCardPrintIds.has(cardPrintId)) {
      continue;
    }

    if (!shouldShowPromotionTransitionNote({ promotedAt, now })) {
      continue;
    }

    seenCardPrintIds.add(cardPrintId);
    links.push({ cardPrintId, promotedAt });

    if (links.length >= limit) {
      break;
    }
  }

  return links;
}

async function normalizeCanonicalCard(
  row: RecentlyConfirmedCardPrintRow | null | undefined,
  promotedAt: string | undefined,
): Promise<RecentlyConfirmedCanonicalCard | null> {
  if (!row?.id || !row.gv_id || !promotedAt) {
    return null;
  }

  const transition = getPromotionTransitionState({
    promoted_card_print_id: row.id,
    promoted_at: promotedAt,
  });
  if (!transition.isPromotedFromProvisional) {
    return null;
  }

  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
  const imageFields = await resolveCardImageFieldsV1(row);
  const name = normalizeText(row.name) || "Unknown";
  const displayIdentity = resolveDisplayIdentity({
    name,
    variant_key: normalizeText(row.variant_key) || null,
    printed_identity_modifier: normalizeText(row.printed_identity_modifier) || null,
    set_identity_model: normalizeText(setRecord?.identity_model) || null,
    set_code: normalizeText(row.set_code),
    number: normalizeText(row.number) || null,
  });

  return Object.freeze({
    id: row.id,
    gv_id: row.gv_id,
    name,
    display_name: displayIdentity.display_name,
    number: normalizeText(row.number),
    rarity: normalizeText(row.rarity) || undefined,
    set_code: normalizeText(row.set_code) || undefined,
    set_name: normalizeText(setRecord?.name) || undefined,
    variant_key: normalizeText(row.variant_key) || undefined,
    printed_identity_modifier: normalizeText(row.printed_identity_modifier) || undefined,
    set_identity_model: normalizeText(setRecord?.identity_model) || undefined,
    image_url: imageFields.image_url ?? undefined,
    representative_image_url: imageFields.representative_image_url ?? undefined,
    image_status: imageFields.image_status ?? undefined,
    image_note: imageFields.image_note ?? undefined,
    image_source: imageFields.image_source ?? undefined,
    display_image_url: imageFields.display_image_url ?? undefined,
    display_image_kind: imageFields.display_image_kind,
    promoted_at: promotedAt,
    promotion_transition: transition,
  });
}

// LOCK: Recently confirmed cards are canonical cards with historical context only.
// LOCK: Never render warehouse candidates as canonical discovery cards.
export async function getRecentlyConfirmedCanonicalCards(
  limit = RECENTLY_CONFIRMED_CARD_LIMIT,
): Promise<RecentlyConfirmedCanonicalCard[]> {
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), 12)
    : RECENTLY_CONFIRMED_CARD_LIMIT;
  const supabase = createPublicSupabase();

  const { data: promotionRows, error: promotionError } = await supabase
    .from("canon_warehouse_candidates")
    .select("promoted_card_print_id,promoted_at")
    .not("promoted_card_print_id", "is", null)
    .not("promoted_at", "is", null)
    .order("promoted_at", { ascending: false })
    .limit(safeLimit * 4);

  if (promotionError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[recently-confirmed] promotion linkage query failed closed", {
        message: promotionError.message,
      });
    }

    return [];
  }

  const promotionLinks = normalizePromotionLinks((promotionRows ?? []) as PromotionLinkRow[], safeLimit);
  if (promotionLinks.length === 0) {
    return [];
  }

  const promotedAtByCardPrintId = new Map(
    promotionLinks.map((row) => [row.cardPrintId, row.promotedAt] as const),
  );
  const cardPrintIds = promotionLinks.map((row) => row.cardPrintId);
  const { data: cardRows, error: cardError } = await supabase
    .from("card_prints")
    .select("id,gv_id,name,number,rarity,set_code,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(name,identity_model)")
    .in("id", cardPrintIds);

  if (cardError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[recently-confirmed] canonical card query failed closed", {
        message: cardError.message,
      });
    }

    return [];
  }

  const cardById = new Map(
    ((cardRows ?? []) as RecentlyConfirmedCardPrintRow[])
      .filter((row) => row.id)
      .map((row) => [row.id as string, row]),
  );
  const normalizedCards = await Promise.all(
    cardPrintIds.map((cardPrintId) =>
      normalizeCanonicalCard(cardById.get(cardPrintId), promotedAtByCardPrintId.get(cardPrintId)),
    ),
  );

  return normalizedCards.filter((card): card is RecentlyConfirmedCanonicalCard => Boolean(card));
}

export const recentlyConfirmedTestInternals = {
  normalizePromotionLinks,
};
