"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CompareTray from "@/components/compare/CompareTray";
import ExploreCardDetailsRow from "@/components/explore/ExploreCardDetailsRow";
import ExploreCardGridItem from "@/components/explore/ExploreCardGridItem";
import ExploreCardListItem from "@/components/explore/ExploreCardListItem";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import ExploreViewModeToggle from "@/components/explore/ExploreViewModeToggle";
import type { VariantFlags } from "@/lib/cards/variantPresentation";
import { buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";
import { normalizeExploreViewMode, type ExploreViewMode } from "@/lib/exploreViewModes";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { supabase } from "@/lib/supabaseClient";

const SEARCH_LIMIT = 80;
const TOKEN_SEARCH_LIMIT = 40;
const SET_CARD_SEARCH_LIMIT = 30;
const MAX_SIGNIFICANT_TEXT_TOKENS = 4;
const MAX_SET_CANDIDATES = 6;
const GENERIC_TOKENS = new Set(["set", "card", "pokemon", "pokmon", "the", "and"]);

type ExploreRow = ExploreResultCard;

type SearchRpcRow = {
  id: string;
};

type CardPrintLookupRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  number: string | null;
  rarity: string | null;
  artist?: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  set_code?: string | null;
  printed_set_abbrev?: string | null;
  external_ids?: { tcgdex?: string | null } | null;
  variant_key?: string | null;
  variants?: VariantFlags;
};

type GrookaiValueRow = {
  card_print_id?: string | null;
  grookai_value_nm?: number | null;
  confidence?: number | null;
  listing_count?: number | null;
  updated_at?: string | null;
};

type TcgdexSetRow = {
  tcgdex_set_id: string | null;
  name: string | null;
};

type TcgdexCardRow = {
  tcgdex_card_id: string | null;
};

type SetMetadataLookupRow = {
  code: string | null;
  name: string | null;
  release_date: string | null;
};

type SortMode = "relevance" | "newest" | "oldest";

type PublicSetMetadata = {
  set_code: string;
  set_name?: string;
  release_date?: string;
  release_year?: number;
};

type ResolverQuery = {
  raw: string;
  normalized: string;
  tokens: string[];
  textTokens: string[];
  significantTextTokens: string[];
  numberTokens: string[];
  directGvId: string | null;
};

function parseViewMode(value: string | null): ExploreViewMode {
  return normalizeExploreViewMode(value);
}

function parseSortMode(value: string | null): SortMode {
  if (value === "newest" || value === "oldest") {
    return value;
  }

  return "relevance";
}

function normalizeSetCode(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized || "";
}

function normalizeIllustrator(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseReleaseYear(value?: string | null) {
  const normalized = (value ?? "").trim();
  if (!/^\d{4}$/.test(normalized)) {
    return undefined;
  }

  const parsedYear = Number(normalized);
  return Number.isFinite(parsedYear) ? parsedYear : undefined;
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

function normalizeFreeTextQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeTextForMatch(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenizeNormalizedQuery(value?: string | null) {
  return normalizeTextForMatch(value).match(/[a-z0-9]+/g) ?? [];
}

function normalizeGvIdInput(value: string) {
  const tokens = value.trim().toUpperCase().match(/[A-Z0-9]+/g);
  if (!tokens || tokens.length < 3) return null;

  const expandedTokens = tokens[0] === "GVPK" ? ["GV", "PK", ...tokens.slice(1)] : tokens;
  if (expandedTokens[0] !== "GV" || expandedTokens[1] !== "PK" || expandedTokens.length < 4) {
    return null;
  }

  return `GV-PK-${expandedTokens.slice(2).join("-")}`;
}

function buildResolverQuery(rawQuery: string): ResolverQuery {
  const normalized = normalizeFreeTextQuery(rawQuery);
  const tokens = tokenizeNormalizedQuery(normalized);
  const numberTokens = uniqueValues(tokens.filter((token) => /^\d+$/.test(token)));
  const textTokens = uniqueValues(tokens.filter((token) => !/^\d+$/.test(token)));
  const significantTextTokens = [...textTokens]
    .filter((token) => token.length >= 3 && !GENERIC_TOKENS.has(token))
    .sort((a, b) => b.length - a.length)
    .slice(0, MAX_SIGNIFICANT_TEXT_TOKENS);

  return {
    raw: rawQuery,
    normalized,
    tokens,
    textTokens,
    significantTextTokens,
    numberTokens,
    directGvId: normalizeGvIdInput(normalized),
  };
}

function extractTcgdexCardId(externalIds?: { tcgdex?: string | null } | null) {
  const tcgdexId = externalIds?.tcgdex;
  return tcgdexId && typeof tcgdexId === "string" ? tcgdexId : undefined;
}

function extractTcgdexSetId(tcgdexCardId?: string) {
  if (!tcgdexCardId) return undefined;

  const separatorIndex = tcgdexCardId.lastIndexOf("-");
  return separatorIndex > 0 ? tcgdexCardId.slice(0, separatorIndex) : undefined;
}

function toNumberDigits(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits || undefined;
}

function buildBigrams(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 2) {
    return new Set(normalized ? [normalized] : []);
  }

  const grams = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    grams.add(normalized.slice(index, index + 2));
  }
  return grams;
}

function diceCoefficient(a: string, b: string) {
  const left = buildBigrams(a);
  const right = buildBigrams(b);
  if (left.size === 0 || right.size === 0) return 0;

  let overlap = 0;
  for (const gram of left) {
    if (right.has(gram)) overlap += 1;
  }

  return (2 * overlap) / (left.size + right.size);
}

function bestTokenSimilarity(token: string, candidates: string[]) {
  let best = 0;

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate === token) return 1;
    if (candidate.startsWith(token) || token.startsWith(candidate)) {
      best = Math.max(best, 0.96);
      continue;
    }
    if (candidate.includes(token) || token.includes(candidate)) {
      best = Math.max(best, 0.88);
      continue;
    }

    if (token.length >= 4 && candidate.length >= 4) {
      best = Math.max(best, diceCoefficient(token, candidate));
    }
  }

  return best;
}

function rankSetCandidates(setRows: TcgdexSetRow[], query: ResolverQuery) {
  return setRows
    .map((row) => {
      const setName = row.name ?? "";
      const setTokens = tokenizeNormalizedQuery(setName);
      const normalizedSetName = normalizeTextForMatch(setName);
      let score = 0;
      let matchedTokens = 0;

      for (const token of query.significantTextTokens) {
        const similarity = bestTokenSimilarity(token, setTokens);
        if (similarity >= 1) {
          score += 140;
          matchedTokens += 1;
        } else if (similarity >= 0.96) {
          score += 110;
          matchedTokens += 1;
        } else if (similarity >= 0.88) {
          score += 85;
          matchedTokens += 1;
        } else if (similarity >= 0.72) {
          score += 55;
        }
      }

      if (query.normalized && normalizedSetName.includes(query.normalized)) {
        score += 180;
      }

      if (matchedTokens === query.significantTextTokens.length && matchedTokens > 0) {
        score += 120;
      }

      return {
        tcgdex_set_id: row.tcgdex_set_id,
        name: setName,
        score,
      };
    })
    .filter((row) => row.tcgdex_set_id && row.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_SET_CANDIDATES);
}

function buildExploreRows(
  lookupRows: CardPrintLookupRow[],
  setNameById: Map<string, string>,
  setMetadataByCode: Map<string, PublicSetMetadata>,
  pricingByCardId: Map<string, GrookaiValueRow>,
) {
  return lookupRows
    .filter((row): row is CardPrintLookupRow & { gv_id: string } => Boolean(row.gv_id))
    .map((row) => {
      const tcgdexCardId = extractTcgdexCardId(row.external_ids);
      const tcgdexSetId = extractTcgdexSetId(tcgdexCardId);
      const setMetadata = row.set_code ? setMetadataByCode.get(row.set_code) : undefined;

      return {
        id: row.id,
        gv_id: row.gv_id,
        name: row.name ?? "Unknown",
        number: row.number ?? "",
        set_name: setMetadata?.set_name ?? (tcgdexSetId ? setNameById.get(tcgdexSetId) : undefined),
        rarity: row.rarity ?? undefined,
        artist: row.artist ?? undefined,
        image_url: getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
        release_date: setMetadata?.release_date,
        release_year: setMetadata?.release_year,
        set_code: row.set_code ?? undefined,
        printed_set_abbrev: row.printed_set_abbrev ?? undefined,
        tcgdex_set_id: tcgdexSetId,
        latest_price: pricingByCardId.get(row.id)?.grookai_value_nm ?? undefined,
        confidence: pricingByCardId.get(row.id)?.confidence ?? undefined,
        listing_count: pricingByCardId.get(row.id)?.listing_count ?? undefined,
        price_source: typeof pricingByCardId.get(row.id)?.grookai_value_nm === "number" ? "grookai.value.v1_1" : undefined,
        updated_at: pricingByCardId.get(row.id)?.updated_at ?? undefined,
        variant_key: row.variant_key?.trim() || undefined,
        variants: row.variants ?? undefined,
      };
    });
}

function scoreRow(row: ExploreRow, query: ResolverQuery) {
  const normalizedName = normalizeTextForMatch(row.name);
  const normalizedSetName = normalizeTextForMatch(row.set_name);
  const normalizedCombined = [normalizedName, normalizedSetName].filter(Boolean).join(" ");
  const nameTokens = tokenizeNormalizedQuery(row.name);
  const setTokens = uniqueValues([
    ...tokenizeNormalizedQuery(row.set_name),
    ...tokenizeNormalizedQuery(row.set_code),
    ...tokenizeNormalizedQuery(row.printed_set_abbrev),
    ...tokenizeNormalizedQuery(row.tcgdex_set_id),
  ]);
  const gvTokens = uniqueValues(row.gv_id.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const numberDigits = toNumberDigits(row.number);
  let score = 0;
  let matchedTextTokens = 0;
  let exactNameMatches = 0;

  if (query.directGvId && row.gv_id.toUpperCase() === query.directGvId) {
    score += 6000;
  }

  if (query.normalized && normalizedName === query.normalized.toLowerCase()) {
    score += 2200;
  } else if (query.normalized && normalizedCombined === query.normalized.toLowerCase()) {
    score += 1900;
  } else if (query.normalized && normalizedName.startsWith(query.normalized.toLowerCase())) {
    score += 1500;
  }

  for (const token of query.textTokens) {
    const nameSimilarity = bestTokenSimilarity(token, nameTokens);
    const setSimilarity = bestTokenSimilarity(token, setTokens);
    const gvSimilarity = bestTokenSimilarity(token, gvTokens);
    const bestSimilarity = Math.max(nameSimilarity, setSimilarity, gvSimilarity);

    if (bestSimilarity >= 1) {
      score += nameSimilarity >= setSimilarity ? 280 : 210;
      matchedTextTokens += 1;
      if (nameSimilarity >= 1) exactNameMatches += 1;
      continue;
    }

    if (bestSimilarity >= 0.96) {
      score += nameSimilarity >= setSimilarity ? 220 : 170;
      matchedTextTokens += 1;
      continue;
    }

    if (bestSimilarity >= 0.88) {
      score += nameSimilarity >= setSimilarity ? 150 : 115;
      matchedTextTokens += 1;
      continue;
    }

    if (bestSimilarity >= 0.72) {
      score += 70;
    }
  }

  if (query.textTokens.length > 0 && matchedTextTokens === query.textTokens.length) {
    score += 360;
  }

  if (query.textTokens.length > 0 && exactNameMatches > 0) {
    score += 140;
  }

  for (const numberToken of query.numberTokens) {
    if (numberDigits && numberDigits === numberToken.replace(/^0+/, "") ) {
      score += 260;
      continue;
    }

    if (normalizeTextForMatch(row.number) === numberToken) {
      score += 220;
      continue;
    }

    if (row.gv_id.toLowerCase().includes(`-${numberToken.toLowerCase()}`)) {
      score += 120;
    }
  }

  if (query.numberTokens.length > 0 && exactNameMatches > 0) {
    score += 160;
  }

  return score;
}

function rankRows(rows: ExploreRow[], query: ResolverQuery) {
  return [...rows].sort((a, b) => {
    const scoreA = scoreRow(a, query);
    const scoreB = scoreRow(b, query);
    if (scoreA !== scoreB) return scoreB - scoreA;

    const nameCompare = a.name.localeCompare(b.name);
    if (nameCompare !== 0) return nameCompare;

    const setCompare = (a.set_name ?? "").localeCompare(b.set_name ?? "");
    if (setCompare !== 0) return setCompare;

    const numberCompare = a.number.localeCompare(b.number, undefined, { numeric: true });
    if (numberCompare !== 0) return numberCompare;

    return a.gv_id.localeCompare(b.gv_id);
  });
}

function compareRowsByRelevance(a: ExploreRow, b: ExploreRow, query: ResolverQuery) {
  const scoreA = scoreRow(a, query);
  const scoreB = scoreRow(b, query);
  if (scoreA !== scoreB) return scoreB - scoreA;

  const nameCompare = a.name.localeCompare(b.name);
  if (nameCompare !== 0) return nameCompare;

  const setCompare = (a.set_name ?? "").localeCompare(b.set_name ?? "");
  if (setCompare !== 0) return setCompare;

  const numberCompare = a.number.localeCompare(b.number, undefined, { numeric: true });
  if (numberCompare !== 0) return numberCompare;

  return a.gv_id.localeCompare(b.gv_id);
}

function sortRows(rows: ExploreRow[], query: ResolverQuery, sortMode: SortMode) {
  if (sortMode === "relevance") {
    return rankRows(rows, query);
  }

  return [...rows].sort((a, b) => {
    const leftDate = a.release_date ? Date.parse(a.release_date) : Number.NaN;
    const rightDate = b.release_date ? Date.parse(b.release_date) : Number.NaN;
    const leftHasDate = Number.isFinite(leftDate);
    const rightHasDate = Number.isFinite(rightDate);

    if (leftHasDate && !rightHasDate) return -1;
    if (!leftHasDate && rightHasDate) return 1;

    if (leftHasDate && rightHasDate && leftDate !== rightDate) {
      return sortMode === "newest" ? rightDate - leftDate : leftDate - rightDate;
    }

    return compareRowsByRelevance(a, b, query);
  });
}

async function fetchRpcIds(query: ResolverQuery) {
  const rpcPromises = [
    supabase.rpc("search_card_prints_v1", {
      q: query.normalized,
      limit_in: SEARCH_LIMIT,
    }),
  ];

  for (const token of query.significantTextTokens) {
    rpcPromises.push(
      supabase.rpc("search_card_prints_v1", {
        q: token,
        limit_in: TOKEN_SEARCH_LIMIT,
      }),
    );
  }

  const primaryNumberToken = query.numberTokens[0];
  if (primaryNumberToken) {
    if (query.significantTextTokens.length > 0) {
      for (const token of query.significantTextTokens.slice(0, 2)) {
        rpcPromises.push(
          supabase.rpc("search_card_prints_v1", {
            q: token,
            number_in: primaryNumberToken,
            limit_in: TOKEN_SEARCH_LIMIT,
          }),
        );
      }
    } else {
      rpcPromises.push(
        supabase.rpc("search_card_prints_v1", {
          number_in: primaryNumberToken,
          limit_in: TOKEN_SEARCH_LIMIT,
        }),
      );
    }
  }

  const rpcResults = await Promise.all(rpcPromises);
  const rpcError = rpcResults.find((result) => result.error);
  if (rpcError?.error) {
    throw new Error(rpcError.error.message);
  }

  return uniqueValues(
    rpcResults.flatMap((result) => ((result.data ?? []) as SearchRpcRow[]).map((row) => row.id).filter(Boolean)),
  );
}

async function fetchSetAwareTcgdexCardIds(query: ResolverQuery) {
  if (query.significantTextTokens.length === 0) {
    return { setNameById: new Map<string, string>(), tcgdexCardIds: [] as string[] };
  }

  const { data: setRows, error: setError } = await supabase.from("tcgdex_sets").select("tcgdex_set_id,name");
  if (setError) {
    throw new Error(setError.message);
  }

  const allSetRows = (setRows ?? []) as TcgdexSetRow[];
  const setNameById = new Map(
    allSetRows
      .filter((row): row is TcgdexSetRow & { tcgdex_set_id: string; name: string } => Boolean(row.tcgdex_set_id && row.name))
      .map((row) => [row.tcgdex_set_id, row.name]),
  );
  const rankedSets = rankSetCandidates(allSetRows, query);
  const topSetIds = rankedSets.map((row) => row.tcgdex_set_id).filter((value): value is string => Boolean(value));

  if (topSetIds.length === 0) {
    return { setNameById, tcgdexCardIds: [] as string[] };
  }

  const tcgdexCardPromises = [];
  const primaryNumberToken = query.numberTokens[0];

  for (const token of query.significantTextTokens.slice(0, 2)) {
    tcgdexCardPromises.push(
      supabase
        .from("tcgdex_cards")
        .select("tcgdex_card_id")
        .in("tcgdex_set_id", topSetIds)
        .ilike("name", `%${token}%`)
        .limit(SET_CARD_SEARCH_LIMIT),
    );

    if (primaryNumberToken) {
      tcgdexCardPromises.push(
        supabase
          .from("tcgdex_cards")
          .select("tcgdex_card_id")
          .in("tcgdex_set_id", topSetIds)
          .ilike("name", `%${token}%`)
          .or(`local_number.eq.${primaryNumberToken},printed_number.eq.${primaryNumberToken}`)
          .limit(SET_CARD_SEARCH_LIMIT),
      );
    }
  }

  if (primaryNumberToken) {
    tcgdexCardPromises.push(
      supabase
        .from("tcgdex_cards")
        .select("tcgdex_card_id")
        .in("tcgdex_set_id", topSetIds)
        .or(`local_number.eq.${primaryNumberToken},printed_number.eq.${primaryNumberToken}`)
        .limit(SET_CARD_SEARCH_LIMIT),
    );
  }

  const tcgdexResults = await Promise.all(tcgdexCardPromises);
  const tcgdexError = tcgdexResults.find((result) => result.error);
  if (tcgdexError?.error) {
    throw new Error(tcgdexError.error.message);
  }

  return {
    setNameById,
    tcgdexCardIds: uniqueValues(
      tcgdexResults.flatMap((result) =>
        ((result.data ?? []) as TcgdexCardRow[])
          .map((row) => row.tcgdex_card_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ),
  };
}

async function fetchExactCardRows(ids: string[], tcgdexCardIds: string[], directGvId: string | null) {
  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,set_code,printed_set_abbrev,external_ids,variant_key,variants";

  const [lookupById, lookupByTcgdex, directLookup] = await Promise.all([
    ids.length > 0
      ? supabase.from("card_prints").select(selectClause).in("id", ids)
      : Promise.resolve({ data: [] as CardPrintLookupRow[], error: null }),
    tcgdexCardIds.length > 0
      ? supabase.from("card_prints").select(selectClause).in("external_ids->>tcgdex", tcgdexCardIds)
      : Promise.resolve({ data: [] as CardPrintLookupRow[], error: null }),
    directGvId
      ? supabase.from("card_prints").select(selectClause).eq("gv_id", directGvId).limit(1)
      : Promise.resolve({ data: [] as CardPrintLookupRow[], error: null }),
  ]);

  const lookupError = lookupById.error ?? lookupByTcgdex.error ?? directLookup.error;
  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const deduped = new Map<string, CardPrintLookupRow>();
  for (const row of [
    ...((directLookup.data ?? []) as CardPrintLookupRow[]),
    ...((lookupById.data ?? []) as CardPrintLookupRow[]),
    ...((lookupByTcgdex.data ?? []) as CardPrintLookupRow[]),
  ]) {
    deduped.set(row.id, row);
  }

  return [...deduped.values()];
}

async function fetchCardRowsBySetCode(setCode: string) {
  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,set_code,printed_set_abbrev,external_ids,variant_key,variants";
  const { data, error } = await supabase
    .from("card_prints")
    .select(selectClause)
    .eq("set_code", setCode)
    .limit(250);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CardPrintLookupRow[];
}

async function fetchCardRowsByIllustrator(illustrator: string) {
  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,set_code,printed_set_abbrev,external_ids,variant_key,variants";
  const { data, error } = await supabase
    .from("card_prints")
    .select(selectClause)
    .eq("artist", illustrator)
    .limit(250);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CardPrintLookupRow[];
}

async function fetchSetCodesByReleaseYear(year: number) {
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  const { data, error } = await supabase
    .from("sets")
    .select("code")
    .gte("release_date", start)
    .lt("release_date", end);

  if (error) {
    throw new Error(error.message);
  }

  return uniqueValues(
    ((data ?? []) as Array<{ code?: string | null }>)
      .map((row) => row.code ?? "")
      .filter(Boolean),
  );
}

async function fetchCardRowsByReleaseYear(year: number) {
  const setCodes = await fetchSetCodesByReleaseYear(year);
  if (setCodes.length === 0) {
    return [] as CardPrintLookupRow[];
  }

  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,set_code,printed_set_abbrev,external_ids,variant_key,variants";
  const { data, error } = await supabase
    .from("card_prints")
    .select(selectClause)
    .in("set_code", setCodes)
    .limit(250);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CardPrintLookupRow[];
}

async function fetchPublicSetMetadata(setCodes: string[]) {
  if (setCodes.length === 0) {
    return new Map<string, PublicSetMetadata>();
  }

  try {
    const response = await fetch("/api/public-set-metadata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ setCodes }),
    });

    if (!response.ok) {
      throw new Error("Set metadata API lookup failed.");
    }

    const payload = (await response.json()) as { items?: PublicSetMetadata[] };
    const metadataFromApi = new Map(
      (payload.items ?? [])
        .filter((item): item is PublicSetMetadata & { set_code: string } => Boolean(item?.set_code))
        .map((item) => [item.set_code, item]),
    );

    if (metadataFromApi.size > 0) {
      return metadataFromApi;
    }
  } catch {
    // Fall through to direct public read.
  }

  try {
    const { data, error } = await supabase.from("sets").select("code,name,release_date").in("code", setCodes);
    if (error) {
      return new Map<string, PublicSetMetadata>();
    }

    return new Map(
      ((data ?? []) as SetMetadataLookupRow[])
        .filter((row): row is SetMetadataLookupRow & { code: string } => Boolean(row.code))
        .map((row) => [
          row.code,
          {
            set_code: row.code,
            set_name: row.name ?? undefined,
            release_date: row.release_date ?? undefined,
            release_year: getReleaseYear(row.release_date),
          },
        ]),
    );
  } catch {
    return new Map<string, PublicSetMetadata>();
  }
}

async function fetchGrookaiValuesByCardId(cardIds: string[]) {
  if (cardIds.length === 0) {
    return new Map<string, GrookaiValueRow>();
  }

  const [{ data, error }, { data: metadataData, error: metadataError }] = await Promise.all([
    supabase
      .from("v_grookai_value_v1_1")
      .select("card_print_id,grookai_value_nm,confidence,listing_count")
      .in("card_print_id", cardIds),
    supabase
      .from("card_print_active_prices")
      .select("card_print_id,updated_at")
      .in("card_print_id", cardIds),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  if (metadataError) {
    throw new Error(metadataError.message);
  }

  const updatedAtByCardId = new Map(
    ((metadataData ?? []) as Array<{ card_print_id?: string | null; updated_at?: string | null }>)
      .filter((row): row is { card_print_id: string; updated_at?: string | null } => Boolean(row.card_print_id))
      .map((row) => [row.card_print_id, row.updated_at ?? undefined]),
  );

  return new Map(
    ((data ?? []) as GrookaiValueRow[])
      .filter((row): row is GrookaiValueRow & { card_print_id: string } => Boolean(row.card_print_id))
      .map((row) => [row.card_print_id, { ...row, updated_at: updatedAtByCardId.get(row.card_print_id) }]),
  );
}

async function fetchExploreRows(
  rawQuery: string,
  sortMode: SortMode,
  exactSetCode: string,
  exactReleaseYear?: number,
  exactIllustrator?: string,
): Promise<ExploreRow[]> {
  const query = buildResolverQuery(rawQuery);
  if (!query.normalized && !exactSetCode && !exactReleaseYear && !exactIllustrator) {
    return [];
  }

  let exactRows: CardPrintLookupRow[] = [];
  let setAwareResults = { setNameById: new Map<string, string>(), tcgdexCardIds: [] as string[] };

  if (query.normalized) {
    const [rpcIds, resolvedSetAwareResults] = await Promise.all([
      fetchRpcIds(query),
      fetchSetAwareTcgdexCardIds(query),
    ]);

    setAwareResults = resolvedSetAwareResults;
    exactRows = await fetchExactCardRows(rpcIds, resolvedSetAwareResults.tcgdexCardIds, query.directGvId);
  }

  if (!query.normalized) {
    if (exactSetCode) {
      exactRows = await fetchCardRowsBySetCode(exactSetCode);
    } else if (exactIllustrator) {
      exactRows = await fetchCardRowsByIllustrator(exactIllustrator);
    } else if (exactReleaseYear) {
      exactRows = await fetchCardRowsByReleaseYear(exactReleaseYear);
    }
  }

  if (exactSetCode) {
    exactRows = exactRows.filter((row) => normalizeSetCode(row.set_code) === exactSetCode);
  }

  if (exactIllustrator) {
    exactRows = exactRows.filter((row) => normalizeIllustrator(row.artist) === normalizeIllustrator(exactIllustrator));
  }

  const setMetadataByCode = await fetchPublicSetMetadata(
    uniqueValues(exactRows.map((row) => row.set_code ?? "").filter(Boolean)),
  );
  const pricingByCardId = await fetchGrookaiValuesByCardId(exactRows.map((row) => row.id));
  const rows = buildExploreRows(exactRows, setAwareResults.setNameById, setMetadataByCode, pricingByCardId);
  const filteredRows = typeof exactReleaseYear === "number"
    ? rows.filter((row) => row.release_year === exactReleaseYear)
    : rows;
  return sortRows(filteredRows, query, sortMode);
}

type ExplorePageClientProps = {
  discoveryContent?: ReactNode;
  canViewPricing: boolean;
};

export default function ExplorePageClient({ discoveryContent = null, canViewPricing }: ExplorePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const exactSetCode = normalizeSetCode(searchParams.get("set"));
  const exactReleaseYear = parseReleaseYear(searchParams.get("year"));
  const exactIllustrator = (searchParams.get("illustrator") ?? "").trim() || "";
  const viewMode = parseViewMode(searchParams.get("view"));
  const sortMode = parseSortMode(searchParams.get("sort"));
  const compareCards = normalizeCompareCardsParam(searchParams.get("cards"));
  const normalizedQuery = normalizeFreeTextQuery(q);
  const isDiscoveryMode = !normalizedQuery && !exactSetCode && !exactReleaseYear && !exactIllustrator;
  const [rows, setRows] = useState<ExploreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!normalizedQuery && !exactSetCode && !exactReleaseYear && !exactIllustrator) {
        setRows([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextRows = await fetchExploreRows(
          normalizedQuery,
          sortMode,
          exactSetCode,
          exactReleaseYear,
          exactIllustrator || undefined,
        );
        if (cancelled) return;
        setRows(nextRows);
      } catch (searchError) {
        if (cancelled) return;
        setError(searchError instanceof Error ? searchError.message : "Search failed.");
        setRows([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [q, sortMode, exactSetCode, exactReleaseYear, exactIllustrator]);

  const commitViewMode = (nextViewMode: ExploreViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextViewMode);
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const commitSortMode = (nextSortMode: SortMode) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSortMode === "relevance") {
      params.delete("sort");
    } else {
      params.set("sort", nextSortMode);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const buildCardHref = (gvId: string) => buildPathWithCompareCards(`/card/${gvId}`, "", compareCards);
  const currentPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const pricingSignInHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const emptyState = (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
      No results yet.
    </div>
  );

  return (
    <div className={`space-y-6 ${compareCards.length > 0 ? "pb-32 md:pb-36" : ""}`}>
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Public Explorer</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Explore cards</h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          Discover iconic cards, standout artwork, and notable sets collectors are chasing.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isDiscoveryMode ? (
        <>
          {discoveryContent}
          <CompareTray
            cards={compareCards}
            addHref={buildPathWithCompareCards(pathname, searchParams.toString(), compareCards)}
          />
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-600">
              {rows.length > 0 ? `${rows.length} result${rows.length === 1 ? "" : "s"}` : "Results"}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>Sort</span>
                <select
                  value={sortMode}
                  onChange={(event) => commitSortMode(event.target.value as SortMode)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
              <ExploreViewModeToggle value={viewMode} onChange={commitViewMode} />
            </div>
          </div>

          {viewMode === "list" ? (
            <ul className="space-y-3">
              {rows.map((row) => (
                <ExploreCardListItem
                  key={row.id}
                  card={row}
                  href={buildCardHref(row.gv_id)}
                  canViewPricing={canViewPricing}
                  signInHref={pricingSignInHref}
                />
              ))}
              {rows.length === 0 && !loading && <li>{emptyState}</li>}
            </ul>
          ) : viewMode === "details" ? (
            <div className="space-y-3">
              <div className="md:hidden">
                <ul className="space-y-3">
                  {rows.map((row) => (
                    <ExploreCardListItem
                      key={row.id}
                      card={row}
                      href={buildCardHref(row.gv_id)}
                      canViewPricing={canViewPricing}
                      signInHref={pricingSignInHref}
                    />
                  ))}
                  {rows.length === 0 && !loading && <li>{emptyState}</li>}
                </ul>
              </div>
              <div className="hidden overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Card</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Set</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Number</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rarity</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Variant</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grookai Value</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Compare</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <ExploreCardDetailsRow
                          key={row.id}
                          card={row}
                          href={buildCardHref(row.gv_id)}
                          canViewPricing={canViewPricing}
                          signInHref={pricingSignInHref}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length === 0 && !loading ? <div className="p-4">{emptyState}</div> : null}
              </div>
            </div>
          ) : viewMode === "thumb-lg" ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <ExploreCardGridItem
                  key={row.id}
                  card={row}
                  href={buildCardHref(row.gv_id)}
                  mode="thumb-lg"
                  canViewPricing={canViewPricing}
                />
              ))}
              {rows.length === 0 && !loading ? <div className="sm:col-span-2 xl:col-span-3">{emptyState}</div> : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map((row) => (
                <ExploreCardGridItem
                  key={row.id}
                  card={row}
                  href={buildCardHref(row.gv_id)}
                  mode="thumb"
                  canViewPricing={canViewPricing}
                />
              ))}
              {rows.length === 0 && !loading ? <div className="sm:col-span-2 xl:col-span-4">{emptyState}</div> : null}
            </div>
          )}
        </div>
      )}

      {!isDiscoveryMode && rows.length > 0 && canViewPricing && viewMode === "details" ? (
        <div className="text-xs text-slate-500 md:hidden">
          Beta market estimate.
        </div>
      ) : null}

      {!isDiscoveryMode && rows.length > 0 && canViewPricing && (viewMode === "thumb" || viewMode === "thumb-lg" || viewMode === "list") ? (
        <div className="hidden text-xs text-slate-500 sm:block">
          Beta market estimate. Derived from active listings and market data.
        </div>
      ) : null}

      {!isDiscoveryMode ? (
        <CompareTray
          cards={compareCards}
          addHref={buildPathWithCompareCards(pathname, searchParams.toString(), compareCards)}
        />
      ) : null}
    </div>
  );
}
