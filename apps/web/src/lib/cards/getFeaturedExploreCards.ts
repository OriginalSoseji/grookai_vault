import "server-only";

import { cache } from "react";
import { createPublicServerClient } from "@/lib/supabase/publicServer";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import {
  getChildDisplayImageFallbacks,
  type ChildDisplayImageFallback,
} from "@/lib/cards/childDisplayImageFallbacks";
import { getRotationOffset } from "@/lib/cards/getFeaturedCardRotation";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { getPublicSets } from "@/lib/publicSets";

type FeaturedExploreCardRow = {
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
  display_image_fallback_url?: string;
  external_image_fallback_url?: string;
  display_image_kind?: "exact" | "representative" | "missing_variant_visual" | "missing" | "blocked";
};

const FEATURED_EXPLORE_CARD_COUNT = 10;
const FEATURED_EXPLORE_CANDIDATE_WINDOW = 48;
const FEATURED_EXPLORE_MAX_COUNT = 24;
const FEATURED_EXPLORE_CANDIDATE_LIMIT = 240;
const FEATURED_EXPLORE_SET_LOOKBACK = 24;
const FEATURED_EXPLORE_RARITIES = [
  "Special Illustration Rare",
  "Special illustration rare",
] as const;
const FEATURED_EXPLORE_FALLBACK_SET_CODES = [
  "sv02",
  "sv06",
  "sv08",
  "sv8pt5",
] as const;

async function normalizeFeaturedExploreCard(
  row: FeaturedExploreCardRow | null | undefined,
  childDisplayImageFallbacks = new Map<string, ChildDisplayImageFallback>(),
): Promise<FeaturedExploreCard | null> {
  if (!row?.gv_id) {
    return null;
  }

  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
  const imageFields = await resolveCardImageFieldsV1(row);
  const childDisplayImageFallback = row.id
    ? childDisplayImageFallbacks.get(row.id)
    : undefined;
  const fallbackDisplayImage = !imageFields.display_image_url
    ? childDisplayImageFallback
    : undefined;
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
    image_source: imageFields.image_source ?? undefined,
    display_image_url:
      imageFields.display_image_url ??
      fallbackDisplayImage?.display_image_url ??
      undefined,
    display_image_fallback_url:
      childDisplayImageFallback?.display_image_url ?? undefined,
    external_image_fallback_url:
      imageFields.external_image_fallback_url ?? undefined,
    display_image_kind: fallbackDisplayImage
      ? fallbackDisplayImage.display_image_kind
      : imageFields.display_image_kind,
    image_status: fallbackDisplayImage
      ? fallbackDisplayImage.image_status
      : imageFields.image_status ?? undefined,
    image_note: fallbackDisplayImage
      ? fallbackDisplayImage.image_note
      : imageFields.image_note ?? undefined,
  } satisfies FeaturedExploreCard;
}

async function getFeaturedExploreCandidates() {
  const supabase = createPublicServerClient();
  const recentSetCodes = (await getPublicSets().catch(() => []))
    .slice(0, FEATURED_EXPLORE_SET_LOOKBACK)
    .map((setInfo) => setInfo.code);
  const setCodes = Array.from(new Set([
    ...recentSetCodes,
    ...FEATURED_EXPLORE_FALLBACK_SET_CODES,
  ]));

  const { data, error } = await supabase
    .from("card_prints")
    .select("id,gv_id,name,number,rarity,set_code,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(name,identity_model)")
    // card_prints has a set_code index but no rarity index. Keep the query on
    // the indexed recent-set lane and use exact rarity values so discovery
    // never falls back to the former full-table leading-wildcard scan.
    .in("set_code", setCodes)
    .in("rarity", [...FEATURED_EXPLORE_RARITIES])
    .not("gv_id", "is", null)
    .order("gv_id", { ascending: true })
    .limit(FEATURED_EXPLORE_CANDIDATE_LIMIT);

  if (error) {
    throw error;
  }

  return (data ?? []) as FeaturedExploreCardRow[];
}

async function normalizeFeaturedExploreCards(rows: FeaturedExploreCardRow[]) {
  const supabase = createPublicServerClient();
  const childDisplayImageFallbacks = await getChildDisplayImageFallbacks(
    supabase,
    rows,
  );
  const normalizedRows = await Promise.all(
    rows.map((row) =>
      normalizeFeaturedExploreCard(row, childDisplayImageFallbacks),
    ),
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

export const getFeaturedExploreCards = cache(async function getFeaturedExploreCards(
  limit = FEATURED_EXPLORE_CARD_COUNT,
): Promise<FeaturedExploreCard[]> {
  const targetCount = Math.min(
    Math.max(1, Math.trunc(limit)),
    FEATURED_EXPLORE_MAX_COUNT,
  );
  const candidates = await getFeaturedExploreCandidates();
  if (candidates.length === 0) {
    return [];
  }

  const windowSize = Math.min(
    candidates.length,
    Math.max(targetCount, FEATURED_EXPLORE_CANDIDATE_WINDOW),
  );
  const offset = getRotationOffset(candidates.length, windowSize);
  const rotatedRows = candidates.slice(offset, offset + windowSize);
  const rotatedCards = await normalizeFeaturedExploreCards(rotatedRows);
  return dedupeFeaturedExploreCards(rotatedCards).slice(0, targetCount);
});
