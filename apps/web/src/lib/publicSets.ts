import "server-only";

import { cache } from "react";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { createPublicServerClient } from "@/lib/supabase/publicServer";
import {
  matchesPublicSetSearch,
  normalizePublicSetFilter,
  normalizeSetSearchQuery,
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
  created_at: string | null;
};

type SetCodeRow = {
  set_code: string | null;
};

type PublicSetCardRow = {
  gv_id: string | null;
  name: string | null;
  number: string | null;
  set_code: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  rarity: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
  sets:
    | {
        identity_model: string | null;
      }
    | {
        identity_model: string | null;
      }[]
    | null;
};

function createServerSupabase() {
  return createPublicServerClient();
}

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
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

function getSetSortDate(row: Pick<SetRow, "release_date" | "created_at">) {
  return row.release_date ?? row.created_at ?? undefined;
}

function parseSetSortTimestamp(setInfo: Pick<PublicSetSummary, "sort_date">) {
  if (!setInfo.sort_date) {
    return Number.NaN;
  }

  return Date.parse(setInfo.sort_date);
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
    supabase.from("sets").select("code,name,printed_set_abbrev,printed_total,release_date,created_at"),
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
      sort_date: getSetSortDate(row),
      release_year: getReleaseYear(row.release_date),
      card_count: cardCountBySetCode.get(code) ?? 0,
      normalized_code: normalizeSetCode(code),
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
      const leftDate = parseSetSortTimestamp(left);
      const rightDate = parseSetSortTimestamp(right);
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
    .select("gv_id,name,number,set_code,variant_key,printed_identity_modifier,rarity,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(identity_model)")
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
    rows.map(async (row) => {
      const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
      const imageFields = await resolveCardImageFieldsV1(row);

      return {
        gv_id: row.gv_id,
        name: row.name ?? "Unknown",
        number: row.number ?? "",
        set_code: row.set_code?.trim() || undefined,
        variant_key: row.variant_key?.trim() || undefined,
        printed_identity_modifier: row.printed_identity_modifier?.trim() || undefined,
        set_identity_model: setRecord?.identity_model?.trim() || undefined,
        rarity: row.rarity ?? undefined,
        image_url: imageFields.image_url ?? undefined,
        representative_image_url: imageFields.representative_image_url ?? undefined,
        image_status: imageFields.image_status ?? undefined,
        image_note: imageFields.image_note ?? undefined,
        image_source: imageFields.image_source ?? undefined,
        display_image_url: imageFields.display_image_url ?? undefined,
        display_image_kind: imageFields.display_image_kind,
      };
    }),
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
  const queryTokens = normalizeSetSearchQuery(rawQuery);
  if (queryTokens.length === 0) {
    return sets;
  }

  return sets.filter((setInfo) => matchesPublicSetSearch(setInfo, queryTokens));
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
  const leftDate = parseSetSortTimestamp(left);
  const rightDate = parseSetSortTimestamp(right);
  const leftHasDate = Number.isFinite(leftDate);
  const rightHasDate = Number.isFinite(rightDate);

  if (leftHasDate && rightHasDate && leftDate !== rightDate) {
    return rightDate - leftDate;
  }

  if (leftHasDate !== rightHasDate) {
    return leftHasDate ? -1 : 1;
  }

  return compareByName(left, right);
}

function compareByReleaseYearAsc(left: PublicSetSummary, right: PublicSetSummary) {
  const leftDate = parseSetSortTimestamp(left);
  const rightDate = parseSetSortTimestamp(right);
  const leftHasDate = Number.isFinite(leftDate);
  const rightHasDate = Number.isFinite(rightDate);

  if (leftHasDate && rightHasDate && leftDate !== rightDate) {
    return leftDate - rightDate;
  }

  if (leftHasDate !== rightHasDate) {
    return leftHasDate ? -1 : 1;
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
