import "server-only";

import { cache } from "react";
import { getPublicProfileBySlug, type PublicProfile } from "@/lib/getPublicProfileBySlug";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import { createPublicServerClient } from "@/lib/supabase/publicServer";
import { getPublicSectionCardsBySlug } from "@/lib/wallSections/getPublicSectionCardsBySlug";
import { normalizeWallSectionId } from "@/lib/wallSections/wallSectionTypes";

export type PublicSectionShareModel = Readonly<{
  collector: PublicProfile;
  section: Readonly<{
    id: string;
    name: string;
    position: number;
    item_count: number;
  }>;
  cards: PublicWallCard[];
}>;

type PublicSectionRow = {
  id: string | null;
  name: string | null;
  position: number | null;
  item_count: number | null;
  is_active: boolean | null;
};

function toPublicSection(row: PublicSectionRow): PublicSectionShareModel["section"] | null {
  if (!row.id || !row.name || row.is_active !== true) {
    return null;
  }

  return Object.freeze({
    id: row.id,
    name: row.name,
    position: row.position ?? 0,
    item_count: row.item_count ?? 0,
  });
}

export const getPublicSectionBySlugAndId = cache(async (
  slug: string,
  sectionId: string,
): Promise<PublicSectionShareModel | null> => {
  const profile = await getPublicProfileBySlug(slug);
  const normalizedSectionId = normalizeWallSectionId(sectionId);
  if (!profile || !profile.vault_sharing_enabled || !normalizedSectionId) {
    return null;
  }

  const client = createPublicServerClient();
  const { data, error } = await client
    .from("v_wall_sections_v1")
    // LOCK: Section share routes expose active custom sections automatically.
    // LOCK: Do not leak inactive or unrelated sections through share rendering.
    .select("id,name,position,item_count,is_active")
    .eq("owner_slug", profile.slug)
    .eq("id", normalizedSectionId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const section = toPublicSection(data as PublicSectionRow);
  if (!section) {
    return null;
  }

  const cards = await getPublicSectionCardsBySlug(profile.slug, section.id);

  return Object.freeze({
    collector: profile,
    section,
    cards,
  });
});
