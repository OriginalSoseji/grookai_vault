import "server-only";

import { cache } from "react";
import { hasChildPrintingPublicIdentityColumn } from "@/lib/cards/childPrintingPublicIdentity";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { hasChildPrintingImageStorageColumns } from "@/lib/cards/childPrintingImageStorage";
import { getCardPrintingFinishLabel } from "@/lib/cards/displayDiscriminator";
import {
  BASE_SET_PRINT_RUN_SOURCE_SET_CODE,
  getBaseSetPrintRunLaneCardCountAdjustment,
  getBaseSetPrintRunLaneSpecialVariantKeys,
} from "@/lib/baseSetPrintRunLanes";
import { createPublicServerClient } from "@/lib/supabase/publicServer";
import {
  matchesPublicSetSearch,
  isSpecialPublicSet,
  normalizePublicSetDisplayName,
  normalizePublicSetFilter,
  normalizeSetSearchQuery,
  normalizeSetQuery,
  resolvePublicSetRouteCode,
  tokenizeSetWords,
  type PublicSetCard,
  type PublicSetDetail,
  type PublicSetSummary,
  type PublicWorldChampionshipDecklist,
  type PublicWorldChampionshipDecklistEntry,
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
  id: string | null;
  gv_id: string | null;
  name: string | null;
  number: string | null;
  number_plain: string | null;
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
  card_printings?:
    | {
        id: string | null;
        printing_gv_id?: string | null;
        finish_key: string | null;
        image_url?: string | null;
        image_alt_url?: string | null;
        image_source?: string | null;
        image_path?: string | null;
        image_status?: string | null;
        image_note?: string | null;
        finish_keys:
          | { label: string | null; sort_order: number | null }
          | { label: string | null; sort_order: number | null }[]
          | null;
      }[]
    | null;
  sets:
    | {
        identity_model: string | null;
      }
    | {
        identity_model: string | null;
      }[]
    | null;
};

type WorldChampionshipDecklistRow = {
  id: string | null;
  gv_id: string | null;
  name: string | null;
  number: string | null;
  number_plain: string | null;
  rarity: string | null;
  external_ids: Record<string, unknown> | null;
};

function createServerSupabase() {
  return createPublicServerClient();
}

type PublicSetCardPrinting = NonNullable<
  PublicSetCardRow["card_printings"]
>[number];

function getCardPrintingsSelectColumns(
  includePublicIdentity: boolean,
  includeImageColumns: boolean,
) {
  const columns = ["id", "finish_key"];
  if (includePublicIdentity) {
    columns.push("printing_gv_id");
  }
  if (includeImageColumns) {
    columns.push(
      "image_source",
      "image_path",
      "image_url",
      "image_alt_url",
      "image_status",
      "image_note",
    );
  }
  columns.push("finish_keys(label,sort_order)");
  return columns.join(",\n");
}

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getNestedString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNestedNumber(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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

async function mapPublicSetCardPrintings(
  rows?: PublicSetCardRow["card_printings"],
) {
  const mapped = (
    await Promise.all(
      (rows ?? []).map(async (printing: PublicSetCardPrinting) => {
        const finishRecord = Array.isArray(printing.finish_keys)
          ? printing.finish_keys[0]
          : printing.finish_keys;
        const finishName = getCardPrintingFinishLabel({
          finishKey: printing.finish_key,
          finishLabel: finishRecord?.label,
        });
        const imageFields = await resolveCardImageFieldsV1(printing);

        return {
          id: printing.id?.trim() || undefined,
          printing_gv_id: printing.printing_gv_id?.trim() || undefined,
          finish_key: printing.finish_key?.trim() || undefined,
          finish_name: finishName ?? undefined,
          image_url: imageFields.image_url ?? undefined,
          image_status: imageFields.image_status ?? undefined,
          image_note: imageFields.image_note ?? undefined,
          image_source: imageFields.image_source ?? undefined,
          display_image_url: imageFields.display_image_url ?? undefined,
          display_image_kind: imageFields.display_image_kind,
          finish_sort_order:
            typeof finishRecord?.sort_order === "number"
              ? finishRecord.sort_order
              : Number.MAX_SAFE_INTEGER,
        };
      }),
    )
  ).filter((printing) => Boolean(printing.finish_name));

  mapped.sort((left, right) => {
    if (left.finish_sort_order !== right.finish_sort_order) {
      return left.finish_sort_order - right.finish_sort_order;
    }

    return (left.finish_name ?? "").localeCompare(right.finish_name ?? "");
  });

  return mapped.map(
    ({ finish_sort_order: _finishSortOrder, ...printing }) => printing,
  );
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

async function fetchAllCanonicalSetCodes(
  supabase: ReturnType<typeof createServerSupabase>,
) {
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
    supabase
      .from("sets")
      .select(
        "code,name,printed_set_abbrev,printed_total,release_date,created_at",
      ),
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
    const displayName = normalizePublicSetDisplayName(row.name);
    const canonicalNameKey = normalizeSetQuery(row.name);
    const normalizedName = normalizeSetQuery(displayName);
    const candidate: PublicSetSummary = {
      code,
      name: displayName,
      printed_set_abbrev:
        row.printed_set_abbrev?.trim().toUpperCase() || undefined,
      printed_total:
        typeof row.printed_total === "number" ? row.printed_total : undefined,
      release_date: row.release_date ?? undefined,
      sort_date: getSetSortDate(row),
      release_year: getReleaseYear(row.release_date),
      card_count:
        (cardCountBySetCode.get(code) ?? 0) +
        getBaseSetPrintRunLaneCardCountAdjustment(code),
      normalized_code: normalizeSetCode(code),
      normalized_name: normalizedName,
      normalized_tokens: tokenizeSetWords(displayName),
      normalized_printed_set_abbrev: normalizeSetQuery(
        row.printed_set_abbrev ?? "",
      ),
    };

    const existing = canonicalSetsByName.get(canonicalNameKey);
    if (!existing) {
      canonicalSetsByName.set(canonicalNameKey, candidate);
      continue;
    }

    canonicalSetsByName.set(
      canonicalNameKey,
      chooseCanonicalSetRow(existing, candidate),
    );
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

export const getPublicSetByCode = cache(async function getPublicSetByCode(
  setCode: string,
): Promise<PublicSetSummary | null> {
  const normalizedCode = resolvePublicSetRouteCode(setCode);
  if (!normalizedCode) {
    return null;
  }

  const sets = await getPublicSets();
  return sets.find((setInfo) => setInfo.code === normalizedCode) ?? null;
});

export const getPublicSetCards = cache(async function getPublicSetCards(
  setCode: string,
  offset = 0,
  limit = 36,
): Promise<PublicSetCard[]> {
  const normalizedCode = resolvePublicSetRouteCode(setCode);
  if (!normalizedCode || limit <= 0) {
    return [];
  }

  const supabase = createServerSupabase();
  const [includePrintingPublicIdentity, includeChildPrintingImageFields] =
    await Promise.all([
      hasChildPrintingPublicIdentityColumn(supabase),
      hasChildPrintingImageStorageColumns(supabase),
    ]);
  const cardPrintingsSelect = getCardPrintingsSelectColumns(
    includePrintingPublicIdentity,
    includeChildPrintingImageFields,
  );

  const selectClause = `
      id,
      gv_id,
      name,
      number,
      number_plain,
      set_code,
      variant_key,
      printed_identity_modifier,
      rarity,
      image_url,
      image_alt_url,
      image_source,
      image_path,
      representative_image_url,
      image_status,
      image_note,
      card_printings(
        ${cardPrintingsSelect}
      ),
      sets(identity_model)
    `;
  const specialVariantKeys =
    getBaseSetPrintRunLaneSpecialVariantKeys(normalizedCode);

  if (specialVariantKeys.length > 0) {
    const [primaryResult, specialResult] = await Promise.all([
      supabase
        .from("card_prints")
        .select(selectClause)
        .eq("set_code", normalizedCode)
        .not("gv_id", "is", null)
        .order("number_plain", { ascending: true, nullsFirst: false })
        .order("number", { ascending: true }),
      supabase
        .from("card_prints")
        .select(selectClause)
        .eq("set_code", BASE_SET_PRINT_RUN_SOURCE_SET_CODE)
        .in("variant_key", specialVariantKeys)
        .not("gv_id", "is", null)
        .order("number_plain", { ascending: true, nullsFirst: false })
        .order("variant_key", { ascending: true }),
    ]);

    if (primaryResult.error) {
      throw new Error(primaryResult.error.message);
    }
    if (specialResult.error) {
      throw new Error(specialResult.error.message);
    }

    const rows = [
      ...((primaryResult.data ?? []) as unknown as PublicSetCardRow[]),
      ...((specialResult.data ?? []) as unknown as PublicSetCardRow[]),
    ]
      .filter((row): row is PublicSetCardRow & { gv_id: string } =>
        Boolean(row.gv_id),
      )
      .sort(comparePublicSetCardRows)
      .slice(offset, offset + limit);

    return mapPublicSetCardRows(rows);
  }

  const { data, error } = await supabase
    .from("card_prints")
    .select(selectClause)
    .eq("set_code", normalizedCode)
    .not("gv_id", "is", null)
    .order("number_plain", { ascending: true, nullsFirst: false })
    .order("number", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as unknown as PublicSetCardRow[]).filter(
    (row): row is PublicSetCardRow & { gv_id: string } => Boolean(row.gv_id),
  );

  return mapPublicSetCardRows(rows);
});

export const getPublicWorldChampionshipDecklist = cache(
  async function getPublicWorldChampionshipDecklist(
    setCode: string,
  ): Promise<PublicWorldChampionshipDecklist | null> {
    const normalizedCode = resolvePublicSetRouteCode(setCode);
    if (!normalizedCode || !normalizedCode.startsWith("wcd")) {
      return null;
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("card_prints")
      .select("id,gv_id,name,number,number_plain,rarity,external_ids")
      .eq("set_code", normalizedCode)
      .eq("variant_key", "world_championship_deck_replica")
      .not("gv_id", "is", null)
      .order("number_plain", { ascending: true, nullsFirst: false })
      .order("number", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const rows = ((data ?? []) as WorldChampionshipDecklistRow[]).filter(
      (row): row is WorldChampionshipDecklistRow & { gv_id: string } =>
        Boolean(row.gv_id),
    );

    if (rows.length === 0) {
      return null;
    }

    let deckName: string | undefined;
    let deckYear: number | undefined;
    let playerName: string | undefined;
    const entries: PublicWorldChampionshipDecklistEntry[] = rows.map((row) => {
      const grookai = asRecord(asRecord(row.external_ids)?.grookai);
      deckName ??= getNestedString(grookai, "deck_name");
      deckYear ??= getNestedNumber(grookai, "deck_year") ?? undefined;
      playerName ??= getNestedString(grookai, "player_name");

      return {
        id: row.id ?? undefined,
        gv_id: row.gv_id,
        name: row.name ?? "Unknown",
        number: row.number ?? "",
        quantity: getNestedNumber(grookai, "deck_quantity"),
        source_set_name: getNestedString(grookai, "source_set_name"),
        source_card_number: getNestedString(grookai, "source_card_number"),
        rarity: row.rarity ?? undefined,
      };
    });

    const totalQuantity = entries.reduce(
      (sum, entry) => sum + (entry.quantity ?? 0),
      0,
    );

    return {
      set_code: normalizedCode,
      deck_name: deckName,
      deck_year: deckYear,
      player_name: playerName,
      total_quantity: totalQuantity,
      unique_card_count: entries.length,
      entries,
    };
  },
);

function getCardRowSortNumber(row: PublicSetCardRow) {
  const parsed = Number.parseInt(row.number_plain ?? row.number ?? "", 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function comparePublicSetCardRows(left: PublicSetCardRow, right: PublicSetCardRow) {
  const numberCompare = getCardRowSortNumber(left) - getCardRowSortNumber(right);
  if (numberCompare !== 0) {
    return numberCompare;
  }

  return [
    (left.number ?? "").localeCompare(right.number ?? ""),
    (left.name ?? "").localeCompare(right.name ?? ""),
    (left.variant_key ?? "").localeCompare(right.variant_key ?? ""),
    (left.gv_id ?? "").localeCompare(right.gv_id ?? ""),
  ].find((value) => value !== 0) ?? 0;
}

async function mapPublicSetCardRows(rows: Array<PublicSetCardRow & { gv_id: string }>) {
  return Promise.all(
    rows.map(async (row) => {
      const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
      const imageFields = await resolveCardImageFieldsV1(row);

      return {
        id: row.id ?? undefined,
        gv_id: row.gv_id,
        name: row.name ?? "Unknown",
        number: row.number ?? "",
        set_code: row.set_code?.trim() || undefined,
        variant_key: row.variant_key?.trim() || undefined,
        printed_identity_modifier:
          row.printed_identity_modifier?.trim() || undefined,
        set_identity_model: setRecord?.identity_model?.trim() || undefined,
        rarity: row.rarity ?? undefined,
        image_url: imageFields.image_url ?? undefined,
        representative_image_url:
          imageFields.representative_image_url ?? undefined,
        image_status: imageFields.image_status ?? undefined,
        image_note: imageFields.image_note ?? undefined,
        image_source: imageFields.image_source ?? undefined,
        display_image_url: imageFields.display_image_url ?? undefined,
        display_image_kind: imageFields.display_image_kind,
        printings: await mapPublicSetCardPrintings(row.card_printings),
      };
    }),
  );
}

export const getPublicSetDetail = cache(async function getPublicSetDetail(
  setCode: string,
): Promise<PublicSetDetail | null> {
  const setInfo = await getPublicSetByCode(setCode);
  if (!setInfo) {
    return null;
  }

  return {
    ...setInfo,
    cards: await getPublicSetCards(setInfo.code, 0, setInfo.card_count),
  };
});

export function filterPublicSets(sets: PublicSetSummary[], rawQuery: string) {
  const queryTokens = normalizeSetSearchQuery(rawQuery);
  if (queryTokens.length === 0) {
    return sets;
  }

  return sets.filter((setInfo) => matchesPublicSetSearch(setInfo, queryTokens));
}

function compareByName(left: PublicSetSummary, right: PublicSetSummary) {
  return left.name.localeCompare(right.name);
}

function compareByReleaseYearDesc(
  left: PublicSetSummary,
  right: PublicSetSummary,
) {
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

function compareByReleaseYearAsc(
  left: PublicSetSummary,
  right: PublicSetSummary,
) {
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

export function applyPublicSetFilterAndSort(
  sets: PublicSetSummary[],
  rawFilter?: string | null,
) {
  const filter = normalizePublicSetFilter(rawFilter);
  const baseSets = [...sets];

  switch (filter) {
    case "modern":
      return baseSets.filter((setInfo) => (setInfo.release_year ?? 0) >= 2020);
    case "special":
      return baseSets.filter(isSpecialPublicSet);
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
