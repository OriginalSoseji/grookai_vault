import "server-only";

import { cache } from "react";
import { createPublicServerClient } from "@/lib/supabase/publicServer";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import {
  mapWallCardRowsToPublicWallCards,
  type PublicWallCardViewRow,
} from "@/lib/wallSections/publicWallSectionCardMapping";

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

export const getPublicWallCardsBySlug = cache(async (slug: string): Promise<PublicWallCard[]> => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return [];
  }

  const client = createPublicServerClient();
  const { data, error } = await client
    .from("v_wall_cards_v1")
    // LOCK: Wall is system-derived and always first.
    // LOCK: Custom Sections are durable public presentation layers, not grouped shared_cards categories.
    .select(
      "instance_id,gv_vi_id,vault_item_id,card_print_id,intent,condition_label,is_graded,grade_company,grade_value,grade_label,created_at,gv_id,name,set_code,set_name,number,image_url,representative_image_url,image_status,image_note,display_image_url,display_image_kind,public_note",
    )
    .eq("owner_slug", normalizedSlug)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return mapWallCardRowsToPublicWallCards((data ?? []) as PublicWallCardViewRow[]);
});
