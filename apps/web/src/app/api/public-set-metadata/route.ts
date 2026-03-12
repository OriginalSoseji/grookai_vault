import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SetMetadataRow = {
  code: string | null;
  name: string | null;
  release_date: string | null;
};

function createServerSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, key);
}

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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { setCodes?: unknown } | null;
  const setCodes = Array.isArray(body?.setCodes)
    ? Array.from(
        new Set(
          body.setCodes
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      )
    : [];

  if (setCodes.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("sets").select("code,name,release_date").in("code", setCodes);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = ((data ?? []) as SetMetadataRow[])
    .filter((row): row is SetMetadataRow & { code: string } => Boolean(row.code))
    .map((row) => ({
      set_code: row.code,
      set_name: row.name ?? undefined,
      release_date: row.release_date ?? undefined,
      release_year: getReleaseYear(row.release_date),
    }));

  return NextResponse.json({ items });
}
