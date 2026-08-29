import "server-only";

import { cache } from "react";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { getCardPrintingFinishLabel } from "@/lib/cards/displayDiscriminator";
import {
  getPublicCardPrintingOptions,
  groupPublicCardPrintingOptionsByCardPrintId,
  type PublicCardPrintingOptionRow,
} from "@/lib/cards/getPublicCardPrintingOptions";
import {
  BASE_SET_PRINT_RUN_SOURCE_SET_CODE,
  getBaseSetPrintRunLaneCardCountAdjustment,
  getBaseSetPrintRunLaneSpecialVariantKeys,
} from "@/lib/baseSetPrintRunLanes";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  chooseCanonicalSetRow,
  choosePreferredEquivalentSetRow,
  escapePostgrestLikePattern,
  getManifestCardPrintCount,
} from "@/lib/publicSetCanonicalization";
import {
  resolveVisiblePublicSetCodes,
  resolveVisiblePublicSetReferences,
} from "@/lib/publicSetExactCodes";
import publicSetCardCountManifest from "@/lib/publicSetCardCounts.generated.json";
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
  id: string | null;
  game: string | null;
  code: string | null;
  name: string | null;
  printed_set_abbrev: string | null;
  printed_total: number | null;
  release_date: string | null;
  created_at: string | null;
  hero_image_url: string | null;
  hero_image_source: string | null;
  set_role: string | null;
  catalog_set_type: string | null;
};

type PublicSetCardCountRow = {
  set_code: string | null;
  card_count: number | string | null;
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

async function createServerSupabase() {
  return createServerComponentClient();
}

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
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
  // Catalog insertion time is not a release date. Falling back to created_at
  // makes newly ingested legacy/unknown sets outrank current releases.
  return row.release_date ?? undefined;
}

async function mapPublicSetCardPrintings(rows?: PublicCardPrintingOptionRow[]) {
  const mapped = (
    await Promise.all(
      (rows ?? []).map(async (printing) => {
        const finishName = getCardPrintingFinishLabel({
          finishKey: printing.finish_key,
          finishLabel: printing.finish_label,
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
          external_image_fallback_url: imageFields.external_image_fallback_url ?? undefined,
          display_image_kind: imageFields.display_image_kind,
          finish_sort_order:
            typeof printing.finish_sort_order === "number" ? printing.finish_sort_order : Number.MAX_SAFE_INTEGER,
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

  return mapped.map(({ finish_sort_order: _finishSortOrder, ...printing }) => printing);
}

function parseSetSortTimestamp(setInfo: Pick<PublicSetSummary, "sort_date">) {
  if (!setInfo.sort_date) {
    return Number.NaN;
  }

  return Date.parse(setInfo.sort_date);
}

const PUBLIC_SET_LIST_SELECT = `
  id,
  game,
  code,
  name,
  printed_set_abbrev,
  printed_total,
  release_date,
  created_at,
  hero_image_url,
  hero_image_source,
  set_role,
  catalog_set_type:source->scryfall->>set_type
`;

const PUBLIC_SET_DETAIL_SELECT = PUBLIC_SET_LIST_SELECT;

const publicSetCardCounts = publicSetCardCountManifest.counts as Readonly<Record<string, number>>;
const PUBLIC_SET_ROW_PAGE_SIZE = 1000;
const PUBLIC_SET_COUNT_CHUNK_SIZE = 500;

async function getAllVisibleSetRows(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  gameCode?: string | null,
) {
  const rows: SetRow[] = [];
  for (let offset = 0; ; offset += PUBLIC_SET_ROW_PAGE_SIZE) {
    let query = supabase
      .from("sets")
      .select(PUBLIC_SET_LIST_SELECT)
      .order("id", { ascending: true });
    const normalizedGameCode = gameCode?.trim().toLowerCase();
    if (normalizedGameCode) {
      query = query.eq("game", normalizedGameCode);
    }
    const { data, error } = await query.range(
      offset,
      offset + PUBLIC_SET_ROW_PAGE_SIZE - 1,
    );
    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as SetRow[];
    rows.push(...page);
    if (page.length < PUBLIC_SET_ROW_PAGE_SIZE) {
      return rows;
    }
  }
}

async function getDynamicPublicSetCardCounts(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  setCodes: string[],
) {
  const exactCodes = Array.from(new Set(setCodes.map((code) => code.trim()).filter(Boolean)));
  if (exactCodes.length === 0) {
    return new Map<string, number>();
  }

  const counts = new Map<string, number>();
  for (let offset = 0; offset < exactCodes.length; offset += PUBLIC_SET_COUNT_CHUNK_SIZE) {
    const { data, error } = await supabase.rpc("get_public_set_card_counts_v1", {
      p_set_codes: exactCodes.slice(offset, offset + PUBLIC_SET_COUNT_CHUNK_SIZE),
    });
    if (error) {
      throw new Error(`[sets.card-counts] ${error.message}`);
    }

    for (const row of (data ?? []) as PublicSetCardCountRow[]) {
      const normalizedCode = normalizeSetCode(row.set_code);
      const parsedCount = Number(row.card_count ?? 0);
      if (!normalizedCode || !Number.isFinite(parsedCount) || parsedCount < 0) {
        continue;
      }
      counts.set(normalizedCode, (counts.get(normalizedCode) ?? 0) + parsedCount);
    }
  }
  return counts;
}

async function getVisibleCardCountBySetIds(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  setIds: string[],
) {
  const exactSetIds = Array.from(new Set(setIds.map((id) => id.trim()).filter(Boolean)));
  if (exactSetIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("card_prints")
    .select("id", { count: "exact", head: true })
    .in("set_id", exactSetIds)
    .not("gv_id", "is", null);
  if (error) {
    throw new Error(`[sets.card-count-by-id] ${error.message}`);
  }
  return count ?? 0;
}

function getCatalogSetType(row: Pick<SetRow, "set_role" | "catalog_set_type">) {
  const value = row.catalog_set_type ?? row.set_role;
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : undefined;
}

function mapSetRowToSummary(
  row: SetRow,
  canonicalCardCount: number,
  cardCountIsExact = true,
): PublicSetSummary | null {
  if (!row.code || !row.name) {
    return null;
  }

  const code = row.code.trim().toLowerCase();
  const displayName = normalizePublicSetDisplayName(row.name);

  return {
    game_code: row.game?.trim().toLowerCase() || "pokemon",
    code,
    name: displayName,
    printed_set_abbrev: row.printed_set_abbrev?.trim().toUpperCase() || undefined,
    printed_total: typeof row.printed_total === "number" ? row.printed_total : undefined,
    release_date: row.release_date ?? undefined,
    sort_date: getSetSortDate(row),
    release_year: getReleaseYear(row.release_date),
    card_count: canonicalCardCount + getBaseSetPrintRunLaneCardCountAdjustment(code),
    card_count_is_exact: cardCountIsExact,
    hero_image_url: row.hero_image_url?.trim() || undefined,
    hero_image_source: row.hero_image_source?.trim() || undefined,
    catalog_set_type: getCatalogSetType(row),
    normalized_code: normalizeSetCode(code),
    normalized_name: normalizeSetQuery(displayName),
    normalized_tokens: tokenizeSetWords(displayName),
    normalized_printed_set_abbrev: normalizeSetQuery(row.printed_set_abbrev ?? ""),
  };
}

export const getPublicSets = cache(async (
  gameCode?: string,
  includeDynamicCounts = true,
): Promise<PublicSetSummary[]> => {
  const supabase = await createServerSupabase();
  const visibleRows = await getAllVisibleSetRows(supabase, gameCode);
  const dynamicCounts = includeDynamicCounts
    ? await getDynamicPublicSetCardCounts(
        supabase,
        visibleRows.map((row) => row.code ?? ""),
      )
    : new Map<string, number>();

  const equivalentSetsByCode = new Map<
    string,
    { row: SetRow; cardCount: number; cardCountIsExact: boolean }
  >();

  for (const row of visibleRows) {
    const normalizedCode = normalizeSetCode(row.code);
    if (!normalizedCode || !row.name) {
      continue;
    }

    const manifestCount = getManifestCardPrintCount(publicSetCardCounts, normalizedCode);
    const cardCount = includeDynamicCounts
      ? Math.max(manifestCount, dynamicCounts.get(normalizedCode) ?? 0)
      : Math.max(manifestCount, row.printed_total ?? 0);
    const existing = equivalentSetsByCode.get(normalizedCode);
    equivalentSetsByCode.set(normalizedCode, {
      row: existing ? choosePreferredEquivalentSetRow(existing.row, row) : row,
      cardCount: Math.max(existing?.cardCount ?? 0, cardCount),
      cardCountIsExact: Boolean(
        existing?.cardCountIsExact || includeDynamicCounts || manifestCount > 0,
      ),
    });
  }

  const canonicalSetsByName = new Map<string, PublicSetSummary>();

  for (const { row, cardCount, cardCountIsExact } of equivalentSetsByCode.values()) {
    const candidate = mapSetRowToSummary(row, cardCount, cardCountIsExact);
    if (!candidate) continue;

    const canonicalNameKey = `${candidate.game_code}:${normalizeSetQuery(candidate.name)}`;

    const existing = canonicalSetsByName.get(canonicalNameKey);
    if (!existing) {
      canonicalSetsByName.set(canonicalNameKey, candidate);
      continue;
    }

    canonicalSetsByName.set(canonicalNameKey, chooseCanonicalSetRow(existing, candidate));
  }

  return [...canonicalSetsByName.values()]
    .filter((setInfo) => !setInfo.card_count_is_exact || setInfo.card_count > 0)
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
  gameCode?: string,
): Promise<PublicSetSummary | null> {
  const normalizedCode = resolvePublicSetRouteCode(setCode);
  if (!normalizedCode) {
    return null;
  }

  const supabase = await createServerSupabase();
  let query = supabase
    .from("sets")
    .select(PUBLIC_SET_DETAIL_SELECT)
    .ilike("code", escapePostgrestLikePattern(normalizedCode));
  const normalizedGameCode = gameCode?.trim().toLowerCase();
  if (normalizedGameCode) {
    query = query.eq("game", normalizedGameCode);
  }
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as SetRow[];
  const preferredRow = rows.reduce<SetRow | null>(
    (preferred, row) => (preferred ? choosePreferredEquivalentSetRow(preferred, row) : row),
    null,
  );
  const combinedCardCount = await getVisibleCardCountBySetIds(
    supabase,
    rows.map((row) => row.id ?? ""),
  );
  const setInfo = preferredRow ? mapSetRowToSummary(preferredRow, combinedCardCount) : null;
  return setInfo && setInfo.card_count > 0 ? setInfo : null;
});

export const getPublicSetCards = cache(async function getPublicSetCards(
  setCode: string,
  offset = 0,
  limit = 36,
  gameCode?: string,
): Promise<PublicSetCard[]> {
  const normalizedCode = resolvePublicSetRouteCode(setCode);
  if (!normalizedCode || limit <= 0) {
    return [];
  }

  const supabase = await createServerSupabase();
  const exactSetReferences = await resolveVisiblePublicSetReferences(
    supabase,
    normalizedCode,
    gameCode,
  );
  const exactSetIds = exactSetReferences.map((reference) => reference.id);
  if (exactSetIds.length === 0) {
    return [];
  }

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
      sets(identity_model)
    `;
  const specialVariantKeys = getBaseSetPrintRunLaneSpecialVariantKeys(normalizedCode);

  if (specialVariantKeys.length > 0) {
    const [primaryResult, specialResult] = await Promise.all([
      supabase
        .from("card_prints")
        .select(selectClause)
        .in("set_id", exactSetIds)
        .not("gv_id", "is", null)
        .order("number_plain", { ascending: true, nullsFirst: false })
        .order("number", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("card_prints")
        .select(selectClause)
        .eq("set_code", BASE_SET_PRINT_RUN_SOURCE_SET_CODE)
        .in("variant_key", specialVariantKeys)
        .not("gv_id", "is", null)
        .order("number_plain", { ascending: true, nullsFirst: false })
        .order("variant_key", { ascending: true })
        .order("id", { ascending: true }),
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
      .filter((row): row is PublicSetCardRow & { gv_id: string } => Boolean(row.gv_id))
      .sort(comparePublicSetCardRows)
      .slice(offset, offset + limit);

    const printingRows = await getPublicCardPrintingOptions(
      supabase,
      rows.map((row) => row.id ?? ""),
    );
    return mapPublicSetCardRows(rows, groupPublicCardPrintingOptionsByCardPrintId(printingRows));
  }

  const { data, error } = await supabase
    .from("card_prints")
    .select(selectClause)
    .in("set_id", exactSetIds)
    .not("gv_id", "is", null)
    .order("number_plain", { ascending: true, nullsFirst: false })
    .order("number", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as unknown as PublicSetCardRow[]).filter(
    (row): row is PublicSetCardRow & { gv_id: string } => Boolean(row.gv_id),
  );

  const printingRows = await getPublicCardPrintingOptions(
    supabase,
    rows.map((row) => row.id ?? ""),
  );
  return mapPublicSetCardRows(rows, groupPublicCardPrintingOptionsByCardPrintId(printingRows));
});

export const getPublicWorldChampionshipDecklist = cache(async function getPublicWorldChampionshipDecklist(
  setCode: string,
): Promise<PublicWorldChampionshipDecklist | null> {
  const normalizedCode = resolvePublicSetRouteCode(setCode);
  if (!normalizedCode || !normalizedCode.startsWith("wcd")) {
    return null;
  }

  const supabase = await createServerSupabase();
  const exactSetCodes = await resolveVisiblePublicSetCodes(supabase, normalizedCode);
  if (exactSetCodes.length === 0) {
    return null;
  }
  const { data, error } = await supabase
    .from("card_prints")
    .select("id,gv_id,name,number,number_plain,rarity,external_ids")
    .in("set_code", exactSetCodes)
    .eq("variant_key", "world_championship_deck_replica")
    .not("gv_id", "is", null)
    .order("number_plain", { ascending: true, nullsFirst: false })
    .order("number", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as WorldChampionshipDecklistRow[]).filter(
    (row): row is WorldChampionshipDecklistRow & { gv_id: string } => Boolean(row.gv_id),
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

  const totalQuantity = entries.reduce((sum, entry) => sum + (entry.quantity ?? 0), 0);

  return {
    set_code: normalizedCode,
    deck_name: deckName,
    deck_year: deckYear,
    player_name: playerName,
    total_quantity: totalQuantity,
    unique_card_count: entries.length,
    entries,
  };
});

function getCardRowSortNumber(row: PublicSetCardRow) {
  const parsed = Number.parseInt(row.number_plain ?? row.number ?? "", 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function comparePublicSetCardRows(left: PublicSetCardRow, right: PublicSetCardRow) {
  const numberCompare = getCardRowSortNumber(left) - getCardRowSortNumber(right);
  if (numberCompare !== 0) {
    return numberCompare;
  }

  return (
    [
      (left.number ?? "").localeCompare(right.number ?? ""),
      (left.name ?? "").localeCompare(right.name ?? ""),
      (left.variant_key ?? "").localeCompare(right.variant_key ?? ""),
      (left.gv_id ?? "").localeCompare(right.gv_id ?? ""),
      (left.id ?? "").localeCompare(right.id ?? ""),
    ].find((value) => value !== 0) ?? 0
  );
}

async function mapPublicSetCardRows(
  rows: Array<PublicSetCardRow & { gv_id: string }>,
  printingRowsByCardPrintId: Map<string, PublicCardPrintingOptionRow[]>,
) {
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
        printed_identity_modifier: row.printed_identity_modifier?.trim() || undefined,
        set_identity_model: setRecord?.identity_model?.trim() || undefined,
        rarity: row.rarity ?? undefined,
        image_url: imageFields.image_url ?? undefined,
        representative_image_url: imageFields.representative_image_url ?? undefined,
        image_status: imageFields.image_status ?? undefined,
        image_note: imageFields.image_note ?? undefined,
        image_source: imageFields.image_source ?? undefined,
        display_image_url: imageFields.display_image_url ?? undefined,
        external_image_fallback_url: imageFields.external_image_fallback_url ?? undefined,
        display_image_kind: imageFields.display_image_kind,
        printings: await mapPublicSetCardPrintings(printingRowsByCardPrintId.get(row.id ?? "")),
      };
    }),
  );
}

export const getPublicSetDetail = cache(async function getPublicSetDetail(
  setCode: string,
  gameCode?: string,
): Promise<PublicSetDetail | null> {
  const setInfo = await getPublicSetByCode(setCode, gameCode);
  if (!setInfo) {
    return null;
  }

  return {
    ...setInfo,
    cards: await getAllPublicSetCards(setInfo.code, setInfo.game_code),
  };
});

async function getAllPublicSetCards(setCode: string, gameCode?: string) {
  const pageSize = 500;
  const cards: PublicSetCard[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await getPublicSetCards(setCode, offset, pageSize, gameCode);
    cards.push(...page);
    if (page.length < pageSize) return cards;
  }
}

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
