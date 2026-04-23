import "server-only";

import { cache } from "react";
import { createPublicServerClient } from "@/lib/supabase/publicServer";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import {
  mapSectionCardRowsToPublicWallCards,
  type PublicWallCardViewRow,
} from "@/lib/wallSections/publicWallSectionCardMapping";
import { normalizeWallSectionId } from "@/lib/wallSections/wallSectionTypes";

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

export const getPublicSectionCardsBySlug = cache(async (
  slug: string,
  sectionId: string,
): Promise<PublicWallCard[]> => {
  const normalizedSlug = normalizeSlug(slug);
  const normalizedSectionId = normalizeWallSectionId(sectionId);
  if (!normalizedSlug || !normalizedSectionId) {
    return [];
  }

  const client = createPublicServerClient();
  const { data, error } = await client
    .from("v_section_cards_v1")
    // LOCK: Section share routes expose active custom sections automatically.
    // LOCK: Do not leak inactive or unrelated sections through share rendering.
    // LOCK: Section rendering is public-safe, instance-level, and fails closed through the view gates.
    .select(
      "section_id,section_name,section_position,instance_id,gv_vi_id,vault_item_id,card_print_id,intent,condition_label,is_graded,grade_company,grade_value,grade_label,section_added_at,instance_created_at,gv_id,name,set_code,set_name,number,image_url,representative_image_url,image_status,image_note,display_image_url,display_image_kind,public_note",
    )
    .eq("owner_slug", normalizedSlug)
    .eq("section_id", normalizedSectionId)
    .order("section_added_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return mapSectionCardRowsToPublicWallCards((data ?? []) as PublicWallCardViewRow[]);
});
