import "server-only";

import { cache } from "react";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";
import { createPublicServerClient } from "@/lib/supabase/publicServer";

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
    // The public rail only needs section identity. Card-loading callers replace
    // this lazy count with the selected section's public card count.
    item_count: 0,
  });
}

export const getPublicWallSectionsBySlug = cache(async (slug: string): Promise<PublicWallSectionSummary[]> => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return [];
  }

  const profile = await getPublicProfileBySlug(normalizedSlug);
  if (!profile || !profile.vault_sharing_enabled) {
    return [];
  }

  const client = createPublicServerClient();
  const { data, error } = await client
    .from("wall_sections")
    // LOCK: Read the RLS-protected base table instead of the aggregate view.
    // The security-invoker view also touches private vault_item_instances and
    // therefore cannot be queried by the anonymous public role.
    // LOCK: Custom sections surface automatically when active; is_public is not a product visibility gate.
    // LOCK: Do not leak inactive or unrelated sections through public section navigation.
    .select("id,name,position,is_active")
    .eq("user_id", profile.user_id)
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
