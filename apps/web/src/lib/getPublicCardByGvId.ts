import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import type { CardDetail } from "@/types/cards";

type PublicCardRow = {
  gv_id: string | null;
  name: string | null;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  artist: string | null;
  sets?: { name: string | null } | { name: string | null }[] | null;
};

type StaticParamRow = {
  gv_id: string | null;
};

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

export const getPublicCardByGvId = cache(async (gv_id: string): Promise<CardDetail | null> => {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("card_prints")
    .select(
      `
        gv_id,
        name,
        number,
        rarity,
        image_url,
        image_alt_url,
        artist,
        sets(name)
      `,
    )
    .eq("gv_id", gv_id)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as PublicCardRow;
  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;

  return {
    gv_id: row.gv_id ?? gv_id,
    name: row.name ?? "Unknown",
    number: row.number ?? "",
    set_name: setRecord?.name ?? undefined,
    rarity: row.rarity ?? undefined,
    image_url: getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
    artist: row.artist ?? undefined,
  };
});

export async function getStaticCardParams(limit = 100): Promise<Array<{ gv_id: string }>> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("card_prints")
    .select("gv_id")
    .not("gv_id", "is", null)
    .order("gv_id", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as StaticParamRow[])
    .filter((row): row is { gv_id: string } => Boolean(row.gv_id))
    .map((row) => ({ gv_id: row.gv_id }));
}
