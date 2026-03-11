import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

export const SET_INTENT_ALIAS_MAP: Record<string, string[]> = {
  "pokemon 151": ["sv03.5"],
  "151": ["sv03.5"],
  "prismatic evolutions": ["sv8pt5"],
  "pris evo": ["sv8pt5"],
  "brilliant stars": ["swsh9"],
  "brs": ["swsh9"],
  "lost origin": ["swsh11"],
  "lor": ["swsh11"],
  "legendary treasures": ["bw11"],
  "ltr": ["bw11"],
  "silver tempest": ["swsh12"],
  "sit": ["swsh12"],
  "base set": ["base1"],
  "svi": ["sv01"],
  "obs": ["sv03"],
};

export const STRUCTURED_CARD_SET_ALIAS_MAP: Record<string, string[]> = {
  ...SET_INTENT_ALIAS_MAP,
  "base": ["base1"],
  "brilliant stars trainer gallery": ["swsh9tg"],
  "lost origin trainer gallery": ["swsh11tg"],
  "trainer gallery": ["swsh9tg", "swsh10tg", "swsh11tg", "swsh12tg"],
  "brs": ["swsh9", "swsh9tg"],
  "lor": ["swsh11", "swsh11tg"],
  "brilliant stars": ["swsh9", "swsh9tg"],
  "lost origin": ["swsh11", "swsh11tg"],
};

type SetRow = {
  code: string | null;
  name: string | null;
  printed_total: number | null;
  release_date: string | null;
};

type SetCodeRow = {
  set_code: string | null;
};

type PublicSetCardRow = {
  gv_id: string | null;
  name: string | null;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  image_alt_url: string | null;
};

export type PublicSetSummary = {
  code: string;
  name: string;
  printed_total?: number;
  release_date?: string;
  release_year?: number;
  card_count: number;
  normalized_name: string;
  normalized_tokens: string[];
};

export type PublicSetCard = {
  gv_id: string;
  name: string;
  number: string;
  rarity?: string;
  image_url?: string;
};

export type PublicSetDetail = PublicSetSummary & {
  cards: PublicSetCard[];
};

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

export function normalizeSetQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function tokenizeWords(value?: string | null) {
  return normalizeSetQuery(value ?? "").match(/[a-z0-9]+/g) ?? [];
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
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

function scoreSetCandidate(
  row: SetRow & { code: string; name: string },
  cardCount: number,
) {
  let score = 0;

  if (cardCount > 0) score += 1000;
  if (row.release_date) score += 100;
  score += Math.min(cardCount, 500);

  return score;
}

function chooseCanonicalSetRow(
  existing: PublicSetSummary,
  candidate: PublicSetSummary,
) {
  if (candidate.card_count !== existing.card_count) {
    return candidate.card_count > existing.card_count ? candidate : existing;
  }

  if (Boolean(candidate.release_date) !== Boolean(existing.release_date)) {
    return candidate.release_date ? candidate : existing;
  }

  return candidate.code.length < existing.code.length ? candidate : existing;
}

async function fetchAllCanonicalSetCodes(supabase: ReturnType<typeof createServerSupabase>) {
  const rows: SetCodeRow[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("card_prints")
      .select("set_code")
      .not("gv_id", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    const batch = (data ?? []) as SetCodeRow[];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

export const getPublicSets = cache(async (): Promise<PublicSetSummary[]> => {
  const supabase = createServerSupabase();
  const [{ data: setRows, error: setError }, setCodeRows] = await Promise.all([
    supabase.from("sets").select("code,name,printed_total,release_date"),
    fetchAllCanonicalSetCodes(supabase),
  ]);

  if (setError) {
    throw new Error(setError.message);
  }

  const cardCountBySetCode = new Map<string, number>();
  for (const row of setCodeRows) {
    const setCode = (row.set_code ?? "").trim().toLowerCase();
    if (!setCode) continue;
    cardCountBySetCode.set(setCode, (cardCountBySetCode.get(setCode) ?? 0) + 1);
  }

  const canonicalSetsByName = new Map<string, PublicSetSummary>();

  for (const row of (setRows ?? []) as SetRow[]) {
    if (!row.code || !row.name) {
      continue;
    }

    const code = row.code.trim().toLowerCase();
    const normalizedName = normalizeSetQuery(row.name);
    const candidate: PublicSetSummary = {
      code,
      name: row.name,
      printed_total: typeof row.printed_total === "number" ? row.printed_total : undefined,
      release_date: row.release_date ?? undefined,
      release_year: getReleaseYear(row.release_date),
      card_count: cardCountBySetCode.get(code) ?? 0,
      normalized_name: normalizedName,
      normalized_tokens: tokenizeWords(row.name),
    };

    const existing = canonicalSetsByName.get(normalizedName);
    if (!existing) {
      canonicalSetsByName.set(normalizedName, candidate);
      continue;
    }

    canonicalSetsByName.set(normalizedName, chooseCanonicalSetRow(existing, candidate));
  }

  return [...canonicalSetsByName.values()]
    .filter((setInfo) => setInfo.card_count > 0)
    .sort((left, right) => {
      const leftDate = left.release_date ? Date.parse(left.release_date) : Number.NaN;
      const rightDate = right.release_date ? Date.parse(right.release_date) : Number.NaN;
      const leftHasDate = Number.isFinite(leftDate);
      const rightHasDate = Number.isFinite(rightDate);

      if (leftHasDate && rightHasDate && leftDate !== rightDate) {
        return rightDate - leftDate;
      }

      if (leftHasDate !== rightHasDate) {
        return leftHasDate ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
});

export async function getPublicSetByCode(setCode: string): Promise<PublicSetSummary | null> {
  const normalizedCode = setCode.trim().toLowerCase();
  if (!normalizedCode) {
    return null;
  }

  const sets = await getPublicSets();
  return sets.find((setInfo) => setInfo.code === normalizedCode) ?? null;
}

export async function getPublicSetCards(setCode: string, offset = 0, limit = 36): Promise<PublicSetCard[]> {
  const normalizedCode = setCode.trim().toLowerCase();
  if (!normalizedCode || limit <= 0) {
    return [];
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("card_prints")
    .select("gv_id,name,number,rarity,image_url,image_alt_url")
    .eq("set_code", normalizedCode)
    .not("gv_id", "is", null)
    .order("number_plain", { ascending: true, nullsFirst: false })
    .order("number", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PublicSetCardRow[])
    .filter((row): row is PublicSetCardRow & { gv_id: string } => Boolean(row.gv_id))
    .map((row) => ({
      gv_id: row.gv_id,
      name: row.name ?? "Unknown",
      number: row.number ?? "",
      rarity: row.rarity ?? undefined,
      image_url: getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
    }));
}

export async function getPublicSetDetail(setCode: string): Promise<PublicSetDetail | null> {
  const setInfo = await getPublicSetByCode(setCode);
  if (!setInfo) {
    return null;
  }

  return {
    ...setInfo,
    cards: await getPublicSetCards(setInfo.code, 0, setInfo.card_count),
  };
}

export function filterPublicSets(sets: PublicSetSummary[], rawQuery: string) {
  const normalizedQuery = normalizeSetQuery(rawQuery);
  if (!normalizedQuery) {
    return sets;
  }

  const queryTokens = tokenizeWords(normalizedQuery);

  return sets.filter((setInfo) => {
    if (
      setInfo.normalized_name.includes(normalizedQuery) ||
      normalizeSetCode(setInfo.code) === normalizedQuery
    ) {
      return true;
    }

    if (queryTokens.length > 0 && queryTokens.every((token) => setInfo.normalized_tokens.includes(token))) {
      return true;
    }

    return Object.entries(SET_INTENT_ALIAS_MAP).some(([alias, codes]) => {
      return normalizeSetQuery(alias).includes(normalizedQuery) && codes.includes(setInfo.code);
    });
  });
}
