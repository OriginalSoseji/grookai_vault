import "server-only";

import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { createServerComponentClient } from "@/lib/supabase/server";
import { normalizeCompareCardsParam } from "@/lib/compareCards";

export type ComparePublicCard = {
  gv_id: string;
  name: string;
  set_name?: string;
  set_code?: string;
  number: string;
  rarity?: string;
  release_year?: number;
  artist?: string;
  image_url?: string;
};

type PublicCompareCardRow = {
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  rarity: string | null;
  artist: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  sets:
    | {
        name: string | null;
        release_date: string | null;
      }
    | {
        name: string | null;
        release_date: string | null;
      }[]
    | null;
};

function getReleaseYear(releaseDate?: string | null) {
  if (!releaseDate) {
    return undefined;
  }

  const match = releaseDate.match(/^(\d{4})/);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function getPublicCardsByGvIds(gvIds: string[]) {
  const normalizedIds = normalizeCompareCardsParam(gvIds);
  if (normalizedIds.length === 0) {
    return [] as ComparePublicCard[];
  }

  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from("card_prints")
    .select(
      `
        gv_id,
        name,
        set_code,
        number,
        rarity,
        artist,
        image_url,
        image_alt_url,
        sets(name,release_date)
      `,
    )
    .in("gv_id", normalizedIds);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as PublicCompareCardRow[];
  const rowsByGvId = new Map(
    rows
      .filter((row): row is PublicCompareCardRow & { gv_id: string } => Boolean(row.gv_id))
      .map((row) => [row.gv_id, row]),
  );

  const cards: ComparePublicCard[] = [];

  for (const gvId of normalizedIds) {
    const row = rowsByGvId.get(gvId);
    if (!row) {
      continue;
    }

    const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;

    cards.push({
      gv_id: row.gv_id,
      name: row.name?.trim() || "Unknown",
      set_name: setRecord?.name?.trim() || undefined,
      set_code: row.set_code?.trim() || undefined,
      number: row.number?.trim() || "",
      rarity: row.rarity?.trim() || undefined,
      release_year: getReleaseYear(setRecord?.release_date),
      artist: row.artist?.trim() || undefined,
      image_url: getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
    });
  }

  return cards;
}
