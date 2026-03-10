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
  set_code: string | null;
  sets?:
    | { name: string | null; printed_total: number | null; release_date: string | null }
    | { name: string | null; printed_total: number | null; release_date: string | null }[]
    | null;
};

type StaticParamRow = {
  gv_id: string | null;
};

type SetRow = {
  name: string | null;
  printed_total: number | null;
  release_date: string | null;
};

function getReleaseYear(releaseDate?: string | null) {
  if (!releaseDate) {
    return undefined;
  }

  const match = releaseDate.match(/^(\d{4})/);
  if (!match) {
    return undefined;
  }

  const parsedYear = Number(match[1]);
  return Number.isFinite(parsedYear) ? parsedYear : undefined;
}

function createServerSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, key);
}

const getSetDetailsByCode = cache(async (setCode?: string | null) => {
  if (!setCode) {
    return { name: undefined, printedTotal: undefined, releaseDate: undefined, releaseYear: undefined };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("sets")
    .select("name,printed_total,release_date")
    .eq("code", setCode)
    .maybeSingle();

  if (error || !data) {
    return { name: undefined, printedTotal: undefined, releaseDate: undefined, releaseYear: undefined };
  }

  const row = data as SetRow;
  return {
    name: row.name ?? undefined,
    printedTotal: typeof row.printed_total === "number" ? row.printed_total : undefined,
    releaseDate: row.release_date ?? undefined,
    releaseYear: getReleaseYear(row.release_date),
  };
});

export async function getPublicCardByGvId(gv_id: string): Promise<CardDetail | null> {
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
        set_code,
        sets(name,printed_total,release_date)
      `,
    )
    .eq("gv_id", gv_id)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as PublicCardRow;
  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
  const fallbackSet = await getSetDetailsByCode(row.set_code);
  const setName = setRecord?.name ?? fallbackSet.name;
  const printedTotal =
    typeof setRecord?.printed_total === "number" ? setRecord.printed_total : fallbackSet.printedTotal;
  const releaseDate = setRecord?.release_date ?? fallbackSet.releaseDate;

  return {
    gv_id: row.gv_id ?? gv_id,
    name: row.name ?? "Unknown",
    number: row.number ?? "",
    set_name: setName,
    set_code: row.set_code ?? undefined,
    rarity: row.rarity ?? undefined,
    image_url: getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
    artist: row.artist ?? undefined,
    printed_total: printedTotal,
    release_date: releaseDate ?? undefined,
    release_year: getReleaseYear(releaseDate),
  };
}

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
