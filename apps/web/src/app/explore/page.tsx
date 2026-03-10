"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { supabase } from "@/lib/supabaseClient";
import type { CardSummary } from "@/types/cards";

const SEARCH_LIMIT = 80;
const TOKEN_SEARCH_LIMIT = 40;
const SET_CARD_SEARCH_LIMIT = 30;
const MAX_SIGNIFICANT_TEXT_TOKENS = 4;
const MAX_SET_CANDIDATES = 6;
const GENERIC_TOKENS = new Set(["set", "card", "pokemon", "pokmon", "the", "and"]);

type ExploreRow = CardSummary & {
  id: string;
  set_code?: string;
  printed_set_abbrev?: string;
  tcgdex_set_id?: string;
};

type SearchRpcRow = {
  id: string;
};

type CardPrintLookupRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  set_code?: string | null;
  printed_set_abbrev?: string | null;
  external_ids?: { tcgdex?: string | null } | null;
};

type TcgdexSetRow = {
  tcgdex_set_id: string | null;
  name: string | null;
};

type TcgdexCardRow = {
  tcgdex_card_id: string | null;
};

type ViewMode = "list" | "grid";
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

function parseViewMode(value: string | null): ViewMode {
  return value === "grid" ? "grid" : "list";
}

function parseSortMode(value: string | null): SortMode {
  if (value === "newest" || value === "oldest") {
    return value;
  }

  return "relevance";
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
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
        image_url: getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
        release_date: setMetadata?.release_date,
        release_year: setMetadata?.release_year,
        set_code: row.set_code ?? undefined,
        printed_set_abbrev: row.printed_set_abbrev ?? undefined,
        tcgdex_set_id: tcgdexSetId,
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
    "id,gv_id,name,number,rarity,image_url,image_alt_url,set_code,printed_set_abbrev,external_ids";

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

async function fetchPublicSetMetadata(setCodes: string[]) {
  if (setCodes.length === 0) {
    return new Map<string, PublicSetMetadata>();
  }

  const response = await fetch("/api/public-set-metadata", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ setCodes }),
  });

  if (!response.ok) {
    throw new Error("Set metadata lookup failed.");
  }

  const payload = (await response.json()) as { items?: PublicSetMetadata[] };
  return new Map(
    (payload.items ?? [])
      .filter((item): item is PublicSetMetadata & { set_code: string } => Boolean(item?.set_code))
      .map((item) => [item.set_code, item]),
  );
}

async function fetchExploreRows(rawQuery: string, sortMode: SortMode): Promise<ExploreRow[]> {
  const query = buildResolverQuery(rawQuery);
  if (!query.normalized) {
    return [];
  }

  const [rpcIds, setAwareResults] = await Promise.all([
    fetchRpcIds(query),
    fetchSetAwareTcgdexCardIds(query),
  ]);

  const exactRows = await fetchExactCardRows(rpcIds, setAwareResults.tcgdexCardIds, query.directGvId);
  const setMetadataByCode = await fetchPublicSetMetadata(
    uniqueValues(exactRows.map((row) => row.set_code ?? "").filter(Boolean)),
  );
  const rows = buildExploreRows(exactRows, setAwareResults.setNameById, setMetadataByCode);
  return sortRows(rows, query, sortMode);
}

function ExplorePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const viewMode = parseViewMode(searchParams.get("view"));
  const sortMode = parseSortMode(searchParams.get("sort"));
  const [draftQuery, setDraftQuery] = useState(q);
  const [rows, setRows] = useState<ExploreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftQuery(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const normalizedQuery = normalizeFreeTextQuery(q);

      if (!normalizedQuery) {
        setRows([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextRows = await fetchExploreRows(normalizedQuery, sortMode);
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
  }, [q, sortMode]);

  const commitQuery = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedQuery = normalizeFreeTextQuery(nextQuery);

    if (normalizedQuery) {
      params.set("q", normalizedQuery);
    } else {
      params.delete("q");
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const commitViewMode = (nextViewMode: ViewMode) => {
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Public Explorer</p>
        <h1 className="text-3xl font-semibold text-slate-950">Explore cards</h1>
        <p className="max-w-2xl text-sm text-slate-600">Search by name, set, number, or Grookai ID.</p>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          placeholder="Search by name, set, number, or Grookai ID"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitQuery(draftQuery);
            }
          }}
        />
        <button
          className="rounded-xl bg-slate-900 px-5 py-3 text-white shadow-sm hover:bg-slate-700 disabled:opacity-60"
          onClick={() => commitQuery(draftQuery)}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
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
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === "list" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => commitViewMode("list")}
              >
                List
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === "grid" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => commitViewMode("grid")}
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        {viewMode === "list" ? (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <PublicCardImage
                    src={row.image_url}
                    alt={row.name}
                    imageClassName="h-28 w-20 rounded-xl border border-slate-200 bg-slate-50 object-contain p-1"
                    fallbackClassName="flex h-28 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-2 text-center text-[11px] text-slate-500"
                  />
                  <div className="flex flex-1 flex-col gap-2 pt-1">
                    <Link href={`/card/${row.gv_id}`} className="text-lg font-medium text-slate-950 hover:underline">
                      {row.name}
                    </Link>
                    {([row.set_name, row.number, row.rarity].filter(Boolean).length > 0) && (
                      <p className="text-sm text-slate-600">
                        {[row.set_name, row.number ? `#${row.number}` : undefined, row.rarity].filter(Boolean).join(" • ")}
                      </p>
                    )}
                    <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{row.gv_id}</p>
                  </div>
                </div>
              </li>
            ))}
            {rows.length === 0 && !loading && (
              <li className="rounded-3xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
                No results yet.
              </li>
            )}
          </ul>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/card/${row.gv_id}`}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <PublicCardImage
                  src={row.image_url}
                  alt={row.name}
                  imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-6"
                  fallbackClassName="flex aspect-[3/4] items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                />
                <div className="space-y-2 border-t border-slate-200 px-4 py-4">
                  <p className="line-clamp-2 text-lg font-medium text-slate-950">{row.name}</p>
                  {([row.set_name, row.number, row.rarity].filter(Boolean).length > 0) && (
                    <p className="min-h-10 text-sm text-slate-600">
                      {[row.set_name, row.number ? `#${row.number}` : undefined, row.rarity].filter(Boolean).join(" • ")}
                    </p>
                  )}
                  <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{row.gv_id}</p>
                </div>
              </Link>
            ))}
            {rows.length === 0 && !loading && (
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 sm:col-span-2 xl:col-span-3">
                No results yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="py-8 text-sm text-slate-600">Loading explorer...</div>}>
      <ExplorePageContent />
    </Suspense>
  );
}
