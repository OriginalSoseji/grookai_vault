import "server-only";

import { cache } from "react";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";
import { createPublicServerClient } from "@/lib/supabase/publicServer";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getCatalogImageSourcesByCardPrintIdsV1 } from "@/lib/canon/catalogImageSourcesV1";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import {
  mapSectionCardRowsToPublicWallCards,
  type PublicWallCardViewRow,
} from "@/lib/wallSections/publicWallSectionCardMapping";
import { normalizeWallSectionId } from "@/lib/wallSections/wallSectionTypes";

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

type ProvenPublicSectionRead = Readonly<{
  ownerSlug: string;
  ownerUserId: string;
  sectionId: string;
}>;

const provePublicSectionRead = cache(
  async (slug: string, sectionId: string): Promise<ProvenPublicSectionRead | null> => {
    const normalizedSlug = normalizeSlug(slug);
    const normalizedSectionId = normalizeWallSectionId(sectionId);
    if (!normalizedSlug || !normalizedSectionId) {
      return null;
    }

    const profile = await getPublicProfileBySlug(normalizedSlug);
    if (!profile || !profile.vault_sharing_enabled) {
      return null;
    }

    const publicClient = createPublicServerClient();
    const { data, error } = await publicClient
      .from("wall_sections")
      .select("id")
      .eq("user_id", profile.user_id)
      .eq("id", normalizedSectionId)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data?.id) {
      return null;
    }

    return Object.freeze({
      ownerSlug: profile.slug,
      ownerUserId: profile.user_id,
      sectionId: data.id,
    });
  },
);

export const getPublicSectionCardsBySlug = cache(
  async (slug: string, sectionId: string): Promise<PublicWallCard[]> => {
    // LOCK: Prove the public profile, sharing gate, owner, active section, and
    // slug/section relationship through the anonymous RLS path before creating
    // a service-role client. The admin client is server-only and is used solely
    // to read the already-proven public projection whose security-invoker view
    // joins owner-private vault_item_instances.
    const proof = await provePublicSectionRead(slug, sectionId);
    if (!proof) {
      return [];
    }

    const admin = createServerAdminClient();
    const { data, error } = await admin
      .from("v_section_cards_v1")
      // LOCK: Section share routes expose active custom sections automatically.
      // LOCK: Do not leak inactive or unrelated sections through share rendering.
      // LOCK: The explicit proof above is mandatory; constrain the privileged
      // projection again by owner slug, owner id, and section id.
      .select(
        "section_id,section_name,section_position,instance_id,gv_vi_id,vault_item_id,card_print_id,intent,condition_label,is_graded,grade_company,grade_value,grade_label,section_added_at,instance_created_at,gv_id,name,set_code,set_name,number,image_url,representative_image_url,image_status,image_note,display_image_url,display_image_kind,image_back_url,image_display_mode,public_note",
      )
      .eq("owner_slug", proof.ownerSlug)
      .eq("owner_user_id", proof.ownerUserId)
      .eq("section_id", proof.sectionId)
      .order("section_added_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    const rows = (data ?? []) as PublicWallCardViewRow[];
    const catalogImageSourcesByCardPrintId =
      await getCatalogImageSourcesByCardPrintIdsV1(
        admin,
        rows
          .map((row) => row.card_print_id)
          .filter((value): value is string => Boolean(value?.trim())),
      );

    return mapSectionCardRowsToPublicWallCards(
      rows,
      catalogImageSourcesByCardPrintId,
    );
  },
);
