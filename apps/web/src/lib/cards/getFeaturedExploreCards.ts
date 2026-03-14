import "server-only";

import { createServerComponentClient } from "@/lib/supabase/server";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

const FEATURED_EXPLORE_CARD_IDS = [
  "GV-PK-SSP-238",
  "GV-PK-MEW-199",
  "GV-PK-OBF-223",
  "GV-PK-PAF-232",
  "GV-PK-SVI-245",
  "GV-PK-BRS-TG23",
  "GV-PK-SIT-TG29",
  "GV-PK-LOR-186",
  "GV-PK-PAL-203",
  "GV-PK-PAL-269",
  "GV-PK-TWM-214",
  "GV-PK-PRE-179",
] as const;

type FeaturedExploreCardRow = {
  gv_id: string | null;
  name: string | null;
  number: string | null;
  rarity: string | null;
  set_code: string | null;
  image_url: string | null;
  image_alt_url: string | null;
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

export async function getFeaturedExploreCards(limit = 10): Promise<FeaturedExploreCard[]> {
  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from("card_prints")
    .select("gv_id,name,number,rarity,set_code,image_url,image_alt_url,sets(name)")
    .in("gv_id", [...FEATURED_EXPLORE_CARD_IDS]);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as FeaturedExploreCardRow[];
  const rowsByGvId = new Map(
    rows
      .filter((row): row is FeaturedExploreCardRow & { gv_id: string } => Boolean(row.gv_id))
      .map((row) => [row.gv_id, row]),
  );

  return FEATURED_EXPLORE_CARD_IDS
    .map((gvId) => rowsByGvId.get(gvId))
    .filter((row): row is FeaturedExploreCardRow & { gv_id: string } => Boolean(row?.gv_id))
    .map((row) => {
      const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;

      return {
        gv_id: row.gv_id,
        name: row.name?.trim() || "Unknown",
        number: row.number?.trim() || "",
        rarity: row.rarity?.trim() || undefined,
        set_code: row.set_code?.trim() || undefined,
        set_name: setRecord?.name?.trim() || undefined,
        image_url: getBestPublicCardImageUrl(row.image_url, row.image_alt_url) ?? undefined,
      };
    })
    .slice(0, limit);
}
