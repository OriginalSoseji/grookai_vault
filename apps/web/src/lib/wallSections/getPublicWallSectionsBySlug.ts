import "server-only";

import { cache } from "react";
import { createServerComponentClient } from "@/lib/supabase/server";

export type PublicWallSectionSummary = Readonly<{
  id: string;
  name: string;
  position: number;
  item_count: number;
}>;

type PublicWallSectionRow = {
  id: string | null;
  name: string | null;
  position: number | null;
  item_count: number | null;
  is_active: boolean | null;
  is_public: boolean | null;
};

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function toPublicWallSectionSummary(row: PublicWallSectionRow): PublicWallSectionSummary | null {
  if (!row.id || !row.name || row.is_active !== true || row.is_public !== true) {
    return null;
  }

  return Object.freeze({
    id: row.id,
    name: row.name,
    position: row.position ?? 0,
    item_count: row.item_count ?? 0,
  });
}

export const getPublicWallSectionsBySlug = cache(async (slug: string): Promise<PublicWallSectionSummary[]> => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return [];
  }

  const client = createServerComponentClient();
  const { data, error } = await client
    .from("v_wall_sections_v1")
    // LOCK: Only active public sections may render on public collector surfaces.
    // LOCK: Do not leak unrelated or private sections through public section navigation.
    .select("id,name,position,item_count,is_active,is_public")
    .eq("owner_slug", normalizedSlug)
    .eq("is_active", true)
    .eq("is_public", true)
    .order("position", { ascending: true })
    .limit(20);

  if (error || !data) {
    return [];
  }

  return ((data ?? []) as PublicWallSectionRow[])
    .map(toPublicWallSectionSummary)
    .filter((section): section is PublicWallSectionSummary => Boolean(section));
});
