import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { resolveCanonImageUrlV1 } from "@/lib/canon/resolveCanonImageV1";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import {
  SET_INTENT_ALIAS_MAP,
  normalizePublicSetFilter,
  normalizeSetQuery,
  tokenizeSetWords,
  type PublicSetCard,
  type PublicSetDetail,
  type PublicSetSummary,
} from "@/lib/publicSets.shared";

type SetRow = {
  code: string | null;
  name: string | null;
  printed_set_abbrev: string | null;
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
  image_source: string | null;
  image_path: string | null;
};

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
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
    supabase.from("sets").select("code,name,printed_set_abbrev,printed_total,release_date"),
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
      printed_set_abbrev: row.printed_set_abbrev?.trim().toUpperCase() || undefined,
      printed_total: typeof row.printed_total === "number" ? row.printed_total : undefined,
      release_date: row.release_date ?? undefined,
      release_year: getReleaseYear(row.release_date),
      card_count: cardCountBySetCode.get(code) ?? 0,
      normalized_name: normalizedName,
      normalized_tokens: tokenizeSetWords(row.name),
      normalized_printed_set_abbrev: normalizeSetQuery(row.printed_set_abbrev ?? ""),
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
    .select("gv_id,name,number,rarity,image_url,image_alt_url,image_source,image_path")
    .eq("set_code", normalizedCode)
    .not("gv_id", "is", null)
    .order("number_plain", { ascending: true, nullsFirst: false })
    .order("number", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as PublicSetCardRow[])
    .filter((row): row is PublicSetCardRow & { gv_id: string } => Boolean(row.gv_id));

  return Promise.all(
    rows.map(async (row) => ({
      gv_id: row.gv_id,
      name: row.name ?? "Unknown",
      number: row.number ?? "",
      rarity: row.rarity ?? undefined,
      image_url:
        (await resolveCanonImageUrlV1(row)) ??
        getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
    })),
  );
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

  const queryTokens = tokenizeSetWords(normalizedQuery);

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

function isSpecialSet(setInfo: PublicSetSummary) {
  const code = normalizeSetCode(setInfo.code);
  const name = normalizeSetQuery(setInfo.name);

  if (code.includes("pt5") || code.includes(".5")) {
    return true;
  }

  return [
    "trainer gallery",
    "radiant collection",
    "shiny",
    "fates",
    "crown zenith",
    "prismatic",
  ].some((marker) => name.includes(marker));
}

function compareByName(left: PublicSetSummary, right: PublicSetSummary) {
  return left.name.localeCompare(right.name);
}

function compareByReleaseYearDesc(left: PublicSetSummary, right: PublicSetSummary) {
  const leftYear = typeof left.release_year === "number" ? left.release_year : Number.NEGATIVE_INFINITY;
  const rightYear = typeof right.release_year === "number" ? right.release_year : Number.NEGATIVE_INFINITY;

  if (leftYear !== rightYear) {
    return rightYear - leftYear;
  }

  return compareByName(left, right);
}

function compareByReleaseYearAsc(left: PublicSetSummary, right: PublicSetSummary) {
  const leftYear = typeof left.release_year === "number" ? left.release_year : Number.POSITIVE_INFINITY;
  const rightYear = typeof right.release_year === "number" ? right.release_year : Number.POSITIVE_INFINITY;

  if (leftYear !== rightYear) {
    return leftYear - rightYear;
  }

  return compareByName(left, right);
}

export function applyPublicSetFilterAndSort(sets: PublicSetSummary[], rawFilter?: string | null) {
  const filter = normalizePublicSetFilter(rawFilter);
  const baseSets = [...sets];

  switch (filter) {
    case "modern":
      return baseSets.filter((setInfo) => (setInfo.release_year ?? 0) >= 2020);
    case "special":
      return baseSets.filter(isSpecialSet);
    case "a-z":
      return baseSets.sort(compareByName);
    case "newest":
      return baseSets.sort(compareByReleaseYearDesc);
    case "oldest":
      return baseSets.sort(compareByReleaseYearAsc);
    case "all":
    default:
      return baseSets;
  }
}
