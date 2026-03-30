import "server-only";

import { createServerComponentClient } from "@/lib/supabase/server";
import { resolveCanonImageUrlV1 } from "@/lib/canon/resolveCanonImageV1";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { getRotationOffset } from "@/lib/cards/getFeaturedCardRotation";

type FeaturedExploreCardRow = {
  gv_id: string | null;
  name: string | null;
  number: string | null;
  rarity: string | null;
  set_code: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  sets:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

export type FeaturedExploreCard = {
  gv_id: string;
  name: string;
  number: string;
  rarity?: string;
  set_code?: string;
  set_name?: string;
  image_url?: string;
};

const FEATURED_EXPLORE_CARD_COUNT = 10;
const FEATURED_EXPLORE_CANDIDATE_WINDOW = 48;

async function normalizeFeaturedExploreCard(row: FeaturedExploreCardRow | null | undefined): Promise<FeaturedExploreCard | null> {
  if (!row?.gv_id) {
    return null;
  }

  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
  const imageUrl = await resolveCanonImageUrlV1(row);

  return {
    gv_id: row.gv_id,
    name: row.name?.trim() || "Unknown",
    number: row.number?.trim() || "",
    rarity: row.rarity?.trim() || undefined,
    set_code: row.set_code?.trim() || undefined,
    set_name: setRecord?.name?.trim() || undefined,
    image_url: imageUrl ?? getBestPublicCardImageUrl(row.image_url, row.image_alt_url) ?? undefined,
  } satisfies FeaturedExploreCard;
}

async function fetchFeaturedExploreCardCount() {
  const supabase = createServerComponentClient();
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
  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from("card_prints")
    .select("gv_id,name,number,rarity,set_code,image_url,image_alt_url,image_source,image_path,sets(name)")
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
