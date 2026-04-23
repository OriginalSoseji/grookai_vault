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
};

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function toPublicWallSectionSummary(row: PublicWallSectionRow): PublicWallSectionSummary | null {
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

export const getPublicWallSectionsBySlug = cache(async (slug: string): Promise<PublicWallSectionSummary[]> => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return [];
  }

  const client = createServerComponentClient();
  const { data, error } = await client
    .from("v_wall_sections_v1")
    // LOCK: Custom sections surface automatically when active; is_public is not a product visibility gate.
    // LOCK: Do not leak inactive or unrelated sections through public section navigation.
    .select("id,name,position,item_count,is_active")
    .eq("owner_slug", normalizedSlug)
    .eq("is_active", true)
    .order("position", { ascending: true })
    .limit(20);

  if (error || !data) {
    return [];
  }

  return ((data ?? []) as PublicWallSectionRow[])
    .map(toPublicWallSectionSummary)
    .filter((section): section is PublicWallSectionSummary => Boolean(section));
});
