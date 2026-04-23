import "server-only";

import { createPublicServerClient } from "@/lib/supabase/publicServer";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { getRotationOffset } from "@/lib/cards/getFeaturedCardRotation";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";

type FeaturedExploreCardRow = {
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

export type FeaturedExploreCard = {
  gv_id: string;
  name: string;
  display_name: string;
  number: string;
  rarity?: string;
  set_code?: string;
  set_name?: string;
  variant_key?: string;
  printed_identity_modifier?: string;
  set_identity_model?: string;
  image_url?: string;
  representative_image_url?: string;
  image_status?: string;
  image_note?: string;
  image_source?: string;
  display_image_url?: string;
  display_image_kind?: "exact" | "representative" | "missing";
};

const FEATURED_EXPLORE_CARD_COUNT = 10;
const FEATURED_EXPLORE_CANDIDATE_WINDOW = 48;

async function normalizeFeaturedExploreCard(row: FeaturedExploreCardRow | null | undefined): Promise<FeaturedExploreCard | null> {
  if (!row?.gv_id) {
    return null;
  }

  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
  const imageFields = await resolveCardImageFieldsV1(row);
  const name = row.name?.trim() || "Unknown";
  const displayIdentity = resolveDisplayIdentity({
    name,
    variant_key: row.variant_key?.trim() || null,
    printed_identity_modifier: row.printed_identity_modifier?.trim() || null,
    set_identity_model: setRecord?.identity_model?.trim() || null,
    set_code: row.set_code?.trim() || "",
    number: row.number?.trim() || null,
  });

  return {
    gv_id: row.gv_id,
    name,
    display_name: displayIdentity.display_name,
    number: row.number?.trim() || "",
    rarity: row.rarity?.trim() || undefined,
    set_code: row.set_code?.trim() || undefined,
    set_name: setRecord?.name?.trim() || undefined,
    variant_key: row.variant_key?.trim() || undefined,
    printed_identity_modifier: row.printed_identity_modifier?.trim() || undefined,
    set_identity_model: setRecord?.identity_model?.trim() || undefined,
    image_url: imageFields.image_url ?? undefined,
    representative_image_url: imageFields.representative_image_url ?? undefined,
    image_status: imageFields.image_status ?? undefined,
    image_note: imageFields.image_note ?? undefined,
    image_source: imageFields.image_source ?? undefined,
    display_image_url: imageFields.display_image_url ?? undefined,
    display_image_kind: imageFields.display_image_kind,
  } satisfies FeaturedExploreCard;
}

async function fetchFeaturedExploreCardCount() {
  const supabase = createPublicServerClient();
  const { count, error } = await supabase
    .from("card_prints")
    .select("gv_id", {
      head: true,
      count: "exact",
    })
    .ilike("rarity", "%Special Illustration Rare%");

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function getFeaturedExploreCardsFromWindow(offset: number, windowSize: number) {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("card_prints")
    .select("gv_id,name,number,rarity,set_code,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(name,identity_model)")
    .ilike("rarity", "%Special Illustration Rare%")
    .order("gv_id", { ascending: true })
    .range(offset, offset + windowSize - 1);

  if (error) {
    throw error;
  }

  const normalizedRows = await Promise.all(
    ((data ?? []) as FeaturedExploreCardRow[]).map((row) => normalizeFeaturedExploreCard(row)),
  );

  return normalizedRows.filter((row): row is FeaturedExploreCard => Boolean(row?.gv_id));
}

function dedupeFeaturedExploreCards(cards: FeaturedExploreCard[]) {
  const seen = new Set<string>();
  const deduped: FeaturedExploreCard[] = [];

  for (const card of cards) {
    if (seen.has(card.gv_id)) {
      continue;
    }

    seen.add(card.gv_id);
    deduped.push(card);
  }

  return deduped;
}

export async function getFeaturedExploreCards(limit = FEATURED_EXPLORE_CARD_COUNT): Promise<FeaturedExploreCard[]> {
  const targetCount = Math.max(1, limit);
  const totalRows = await fetchFeaturedExploreCardCount();
  if (totalRows <= 0) {
    return [];
  }

  const windowSize = Math.max(targetCount, FEATURED_EXPLORE_CANDIDATE_WINDOW);
  const offset = getRotationOffset(totalRows, windowSize);
  const rotatedCards = await getFeaturedExploreCardsFromWindow(offset, windowSize);
  const dedupedRotatedCards = dedupeFeaturedExploreCards(rotatedCards).slice(0, targetCount);

  if (dedupedRotatedCards.length >= targetCount || offset === 0) {
    return dedupedRotatedCards;
  }

  const fallbackCards = await getFeaturedExploreCardsFromWindow(0, windowSize);
  return dedupeFeaturedExploreCards([...dedupedRotatedCards, ...fallbackCards]).slice(0, targetCount);
}
