import "server-only";

import { createServerComponentClient } from "@/lib/supabase/server";
import {
  getDefaultWallSectionLimitState,
  type OwnerWallSection,
  type OwnerWallSectionLimitState,
  type WallSectionsSettingsModel,
} from "@/lib/wallSections/wallSectionTypes";

type WallSectionRow = {
  id: string | null;
  name: string | null;
  position: number | null;
  is_active: boolean | null;
  is_public: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type WallSectionMembershipRow = {
  section_id: string | null;
};

function toOwnerWallSection(row: WallSectionRow, itemCount: number): OwnerWallSection | null {
  if (!row.id || !row.name || !row.created_at || !row.updated_at) {
    return null;
  }

  return Object.freeze({
    id: row.id,
    name: row.name,
    position: row.position ?? 0,
    is_active: Boolean(row.is_active),
    is_public: Boolean(row.is_public),
    item_count: itemCount,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

export async function getOwnerWallSectionLimitState(_userId: string): Promise<OwnerWallSectionLimitState> {
  // No stable account-plan source exists yet. Fail safe to Free until a real
  // entitlement resolver is introduced.
  return getDefaultWallSectionLimitState();
}

export async function getOwnerWallSections(userId: string): Promise<WallSectionsSettingsModel> {
  const client = createServerComponentClient();
  const limitState = await getOwnerWallSectionLimitState(userId);

  const { data: sectionRows, error: sectionError } = await client
    .from("wall_sections")
    .select("id,name,position,is_active,is_public,created_at,updated_at")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (sectionError) {
    return {
      sections: [],
      limitState,
      loadError: sectionError.message,
    };
  }

  const rows = ((sectionRows ?? []) as WallSectionRow[]).filter((row) => Boolean(row.id));
  const sectionIds = rows.map((row) => row.id).filter((id): id is string => Boolean(id));
  const itemCounts = new Map<string, number>();

  if (sectionIds.length > 0) {
    const { data: membershipRows, error: membershipError } = await client
      .from("wall_section_memberships")
      .select("section_id")
      .in("section_id", sectionIds);

    if (membershipError) {
      return {
        sections: [],
        limitState,
        loadError: membershipError.message,
      };
    }

    for (const row of (membershipRows ?? []) as WallSectionMembershipRow[]) {
      if (!row.section_id) {
        continue;
      }
      itemCounts.set(row.section_id, (itemCounts.get(row.section_id) ?? 0) + 1);
    }
  }

  return {
    sections: rows
      .map((row) => toOwnerWallSection(row, row.id ? itemCounts.get(row.id) ?? 0 : 0))
      .filter((section): section is OwnerWallSection => Boolean(section)),
    limitState,
    loadError: null,
  };
}
