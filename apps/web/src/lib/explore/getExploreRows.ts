"use server";

import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { getPublicPricingByCardIds, type PublicPricingRecord } from "@/lib/pricing/getPublicPricingByCardIds";
import { STRUCTURED_CARD_SET_ALIAS_MAP, normalizeSetQuery, tokenizeSetWords } from "@/lib/publicSets.shared";
import { createServerComponentClient } from "@/lib/supabase/server";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import type { VariantFlags } from "@/lib/cards/variantPresentation";

const SEARCH_LIMIT = 80;
const TOKEN_SEARCH_LIMIT = 40;
const SET_CARD_SEARCH_LIMIT = 30;
const MAX_SIGNIFICANT_TEXT_TOKENS = 4;
const MAX_SET_CANDIDATES = 6;
const GENERIC_TOKENS = new Set(["set", "card", "pokemon", "pokmon", "the", "and"]);
const VARIANT_QUERY_CUE_TOKENS = new Set(["alt", "alternate", "art", "rainbow", "promo", "holo", "reverse", "full"]);
const PROMO_SET_CODE_PATTERN = /^(?:swshp|svp|smp|basep|bwp|xyp|dpp|pr-[a-z0-9]+)$/i;

type VariantCue = "alt_art" | "rainbow" | "gold" | "promo" | "full_art" | "holo";

type CollectorNumberExpectation = {
  token: string;
  digits?: string;
  exact_only: boolean;
};

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
  numberDigitTokens: string[];
  setTokens: string[];
  expectedSetCodes: string[];
  variantCues: VariantCue[];
  hasStrongDisambiguator: boolean;
  directGvId: string | null;
};

type RemoteTimingSnapshot = {
  remote_ms: number;
  db_ms: number;
  network_ms: number;
  request_count: number;
};

type ExploreStageTiming = RemoteTimingSnapshot & {
  total_ms: number;
  app_ms: number;
};

export type ExploreRowsTiming = RemoteTimingSnapshot & {
  total_ms: number;
  app_ms: number;
  normalize_ms: number;
  postprocess_ms: number;
  stages: {
    build_query: ExploreStageTiming;
    fetch_candidates: ExploreStageTiming;
    fetch_exact_rows: ExploreStageTiming;
    fallback_fetch: ExploreStageTiming;
    exact_filters: ExploreStageTiming;
    fetch_set_metadata: ExploreStageTiming;
    fetch_pricing: ExploreStageTiming;
    build_rows: ExploreStageTiming;
    release_year_filter: ExploreStageTiming;
    sort_rows: ExploreStageTiming;
  };
};

type ResolverTimingCollector = {
  snapshot: () => RemoteTimingSnapshot;
};

function roundTiming(value: number) {
  return Math.round(value * 100) / 100;
}

function emptyRemoteTiming(): RemoteTimingSnapshot {
  return {
    remote_ms: 0,
    db_ms: 0,
    network_ms: 0,
    request_count: 0,
  };
}

function emptyStageTiming(): ExploreStageTiming {
  return {
    total_ms: 0,
    app_ms: 0,
    ...emptyRemoteTiming(),
  };
}

function getTimingCollector() {
  return (
    (globalThis as typeof globalThis & { __grookaiResolverTiming?: ResolverTimingCollector }).__grookaiResolverTiming ??
    null
  );
}

function snapshotRemoteTiming(): RemoteTimingSnapshot {
  return getTimingCollector()?.snapshot() ?? emptyRemoteTiming();
}

function diffRemoteTiming(start: RemoteTimingSnapshot, end: RemoteTimingSnapshot): RemoteTimingSnapshot {
  return {
    remote_ms: roundTiming(Math.max(0, end.remote_ms - start.remote_ms)),
    db_ms: roundTiming(Math.max(0, end.db_ms - start.db_ms)),
    network_ms: roundTiming(Math.max(0, end.network_ms - start.network_ms)),
    request_count: Math.max(0, end.request_count - start.request_count),
  };
}

function finalizeStageTiming(startMs: number, startRemote: RemoteTimingSnapshot): ExploreStageTiming {
  const remote = diffRemoteTiming(startRemote, snapshotRemoteTiming());
  const totalMs = roundTiming(performance.now() - startMs);

  return {
    total_ms: totalMs,
    remote_ms: remote.remote_ms,
    db_ms: remote.db_ms,
    network_ms: remote.network_ms,
    request_count: remote.request_count,
    app_ms: roundTiming(Math.max(0, totalMs - remote.remote_ms)),
  };
}

async function measureStage<T>(operation: () => Promise<T> | T): Promise<{ value: T; timing: ExploreStageTiming }> {
  const startMs = performance.now();
  const startRemote = snapshotRemoteTiming();
  const value = await operation();

  return {
    value,
    timing: finalizeStageTiming(startMs, startRemote),
  };
}

function normalizeSetCode(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized || "";
}

function normalizeIllustrator(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getReleaseYear(releaseDate?: string | null) {
  if (!releaseDate) return undefined;
  const match = releaseDate.match(/^(\d{4})/);
  if (!match) return undefined;
  const parsedYear = Number(match[1]);
  return Number.isFinite(parsedYear) ? parsedYear : undefined;
}

function normalizeFreeTextQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeTextForMatch(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeCollectorToken(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeDigits(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  return digits || "0";
}

function tokenizeNormalizedQuery(value?: string | null) {
  return normalizeTextForMatch(value).match(/[a-z0-9]+/g) ?? [];
}

function tokenizeQuerySegments(value?: string | null) {
  return normalizeTextForMatch(value).match(/[a-z0-9/]+/g) ?? [];
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

function detectSetExpectations(normalizedQuery: string) {
  const normalized = normalizeSetQuery(normalizedQuery);
  const expectedCodes: string[] = [];
  const consumedTokens: string[] = [];

  for (const [phrase, codes] of Object.entries(STRUCTURED_CARD_SET_ALIAS_MAP)) {
    const normalizedPhrase = normalizeSetQuery(phrase);
    if (!normalizedPhrase) continue;

    if (` ${normalized} `.includes(` ${normalizedPhrase} `)) {
      expectedCodes.push(...codes.map((code) => normalizeSetCode(code)));
      consumedTokens.push(...tokenizeSetWords(normalizedPhrase));
    }
  }

  return {
    expectedCodes: uniqueValues(expectedCodes),
    consumedTokens: uniqueValues(consumedTokens),
  };
}

function detectVariantCues(normalizedQuery: string) {
  const normalized = normalizeTextForMatch(normalizedQuery);
  const cues = new Set<VariantCue>();
  const consumedTokens = new Set<string>();
  const phrases: Array<{ phrase: string; cue: VariantCue }> = [
    { phrase: "alt art", cue: "alt_art" },
    { phrase: "alternate art", cue: "alt_art" },
    { phrase: "full art", cue: "full_art" },
    { phrase: "black star promo", cue: "promo" },
    { phrase: "black star", cue: "promo" },
  ];

  for (const { phrase, cue } of phrases) {
    if (` ${normalized} `.includes(` ${phrase} `)) {
      cues.add(cue);
      for (const token of tokenizeNormalizedQuery(phrase)) {
        consumedTokens.add(token);
      }
    }
  }

  if (` ${normalized} `.includes(" promo ")) {
    cues.add("promo");
    consumedTokens.add("promo");
  }

  if (` ${normalized} `.includes(" holo ")) {
    cues.add("holo");
    consumedTokens.add("holo");
  }

  if (` ${normalized} `.includes(" rainbow ")) {
    cues.add("rainbow");
    consumedTokens.add("rainbow");
  }

  if (` ${normalized} `.includes(" gold ")) {
    cues.add("gold");
  }

  return {
    cues: [...cues],
    consumedTokens: [...consumedTokens],
  };
}

function buildCollectorNumberExpectations(normalizedQuery: string) {
  const expectations: CollectorNumberExpectation[] = [];

  for (const segment of tokenizeQuerySegments(normalizedQuery)) {
    const fractionMatch = segment.match(/^([a-z]*\d+)\/([a-z]*\d+)$/i);
    if (fractionMatch) {
      const printedNumber = normalizeCollectorToken(fractionMatch[1]);
      expectations.push({
        token: printedNumber,
        digits: normalizeDigits(printedNumber),
        exact_only: /[A-Z]/.test(printedNumber),
      });
      continue;
    }

    if (/^[a-z]+\d+$/i.test(segment)) {
      expectations.push({
        token: normalizeCollectorToken(segment),
        exact_only: true,
      });
      continue;
    }

    if (/^\d+$/.test(segment)) {
      const normalizedDigits = normalizeDigits(segment);
      expectations.push({
        token: normalizedDigits,
        digits: normalizedDigits,
        exact_only: false,
      });
    }
  }

  const deduped = new Map<string, CollectorNumberExpectation>();
  for (const expectation of expectations) {
    deduped.set(expectation.token, expectation);
  }

  return [...deduped.values()];
}

function buildResolverQuery(rawQuery: string): ResolverQuery {
  const normalized = normalizeFreeTextQuery(rawQuery);
  const setExpectations = detectSetExpectations(normalized);
  const variantExpectations = detectVariantCues(normalized);
  const collectorExpectations = buildCollectorNumberExpectations(normalized);
  const tokens = tokenizeNormalizedQuery(normalized);
  const consumedTokenSet = new Set([
    ...setExpectations.consumedTokens,
    ...variantExpectations.consumedTokens,
  ]);
  const textTokens = uniqueValues(
    tokens.filter(
      (token) =>
        !collectorExpectations.some((expectation) => normalizeTextForMatch(expectation.token) === token) &&
        !VARIANT_QUERY_CUE_TOKENS.has(token) &&
        !consumedTokenSet.has(token),
    ),
  );
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
    numberTokens: collectorExpectations.map((expectation) => expectation.token),
    numberDigitTokens: uniqueValues(
      collectorExpectations
        .map((expectation) => expectation.digits ?? "")
        .filter(Boolean),
    ),
    setTokens: setExpectations.consumedTokens,
    expectedSetCodes: setExpectations.expectedCodes,
    variantCues: variantExpectations.cues,
    hasStrongDisambiguator:
      collectorExpectations.length > 0 ||
      setExpectations.expectedCodes.length > 0 ||
      setExpectations.consumedTokens.length > 0 ||
      variantExpectations.cues.length > 0,
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
  const querySetTokens = query.setTokens.length > 0 ? query.setTokens : query.significantTextTokens;

  return setRows
    .map((row) => {
      const setName = row.name ?? "";
      const setTokens = tokenizeNormalizedQuery(setName);
      const normalizedSetName = normalizeTextForMatch(setName);
      let score = 0;
      let matchedTokens = 0;

      for (const token of querySetTokens) {
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

      if (matchedTokens === querySetTokens.length && matchedTokens > 0) {
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
  pricingByCardId: Map<string, PublicPricingRecord>,
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
        latest_price: pricingByCardId.get(row.id)?.latest_price ?? undefined,
        confidence: pricingByCardId.get(row.id)?.confidence ?? undefined,
        listing_count: pricingByCardId.get(row.id)?.listing_count ?? undefined,
        price_source: pricingByCardId.get(row.id)?.price_source ?? undefined,
        updated_at: pricingByCardId.get(row.id)?.updated_at ?? undefined,
        variant_key: row.variant_key?.trim() || undefined,
        variants: row.variants ?? undefined,
      };
    });
}

function getRowVariantCueSet(row: ExploreRow) {
  const combined = normalizeTextForMatch([row.rarity, row.variant_key].filter(Boolean).join(" "));
  const cues = new Set<VariantCue>();

  if (
    row.variant_key?.toLowerCase().includes("alt") ||
    combined.includes("alternate art") ||
    combined.includes("special illustration")
  ) {
    cues.add("alt_art");
  }

  if (combined.includes("rainbow")) {
    cues.add("rainbow");
  }

  if (combined.includes("gold")) {
    cues.add("gold");
  }

  if (combined.includes("full art")) {
    cues.add("full_art");
  }

  if (
    row.variants?.holo ||
    row.variants?.reverse ||
    row.variants?.reverseHolo ||
    combined.includes("holo")
  ) {
    cues.add("holo");
  }

  if (
    PROMO_SET_CODE_PATTERN.test(row.set_code ?? "") ||
    combined.includes("promo") ||
    normalizeTextForMatch(row.set_name).includes("black star")
  ) {
    cues.add("promo");
  }

  return cues;
}

function getNumberMatchStrength(row: ExploreRow, query: ResolverQuery) {
  const normalizedNumber = normalizeCollectorToken(row.number);
  const numberDigits = normalizeDigits(row.number ?? "");
  const normalizedGvId = row.gv_id.toUpperCase();
  let bestStrength = 0;

  for (const numberToken of query.numberTokens) {
    const normalizedToken = normalizeCollectorToken(numberToken);
    if (!normalizedToken) continue;

    if (normalizedNumber === normalizedToken) {
      bestStrength = Math.max(bestStrength, 1);
      continue;
    }

    if (normalizedGvId.includes(`-${normalizedToken}`)) {
      bestStrength = Math.max(bestStrength, 0.72);
    }
  }

  for (const digitToken of query.numberDigitTokens) {
    if (!digitToken) continue;
    if (numberDigits === digitToken) {
      bestStrength = Math.max(bestStrength, 0.86);
    }
  }

  return bestStrength;
}

// Resolver Quality Pass V1:
// Ranking must strongly respect explicit disambiguators already present in the user query
// (number tokens, set tokens, and variant cues) instead of over-dominating on name-only matches.
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
  const rowVariantCues = getRowVariantCueSet(row);
  let score = 0;
  let matchedTextTokens = 0;
  let exactNameMatches = 0;
  let matchedSetTokens = 0;

  if (query.directGvId && row.gv_id.toUpperCase() === query.directGvId) {
    score += 6000;
  }

  if (query.normalized && normalizedName === query.normalized.toLowerCase()) {
    score += query.hasStrongDisambiguator ? 1500 : 2200;
  } else if (query.normalized && normalizedCombined === query.normalized.toLowerCase()) {
    score += query.hasStrongDisambiguator ? 1300 : 1900;
  } else if (query.normalized && normalizedName.startsWith(query.normalized.toLowerCase())) {
    score += query.hasStrongDisambiguator ? 950 : 1500;
  }

  for (const token of query.textTokens) {
    const nameSimilarity = bestTokenSimilarity(token, nameTokens);
    const setSimilarity = bestTokenSimilarity(token, setTokens);
    const gvSimilarity = bestTokenSimilarity(token, gvTokens);
    const bestSimilarity = Math.max(nameSimilarity, setSimilarity, gvSimilarity);

    if (bestSimilarity >= 1) {
      score += nameSimilarity >= setSimilarity ? (query.hasStrongDisambiguator ? 240 : 280) : 260;
      matchedTextTokens += 1;
      if (nameSimilarity >= 1) exactNameMatches += 1;
      continue;
    }

    if (bestSimilarity >= 0.96) {
      score += nameSimilarity >= setSimilarity ? (query.hasStrongDisambiguator ? 180 : 220) : 210;
      matchedTextTokens += 1;
      continue;
    }

    if (bestSimilarity >= 0.88) {
      score += nameSimilarity >= setSimilarity ? (query.hasStrongDisambiguator ? 120 : 150) : 150;
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
    score += query.hasStrongDisambiguator ? 80 : 140;
  }

  for (const setToken of query.setTokens) {
    const setSimilarity = bestTokenSimilarity(setToken, setTokens);
    if (setSimilarity >= 1) {
      score += 260;
      matchedSetTokens += 1;
      continue;
    }

    if (setSimilarity >= 0.96) {
      score += 220;
      matchedSetTokens += 1;
      continue;
    }

    if (setSimilarity >= 0.88) {
      score += 150;
    }
  }

  const hasExpectedSetCode = query.expectedSetCodes.length > 0;
  const matchesExpectedSetCode = hasExpectedSetCode && query.expectedSetCodes.includes(normalizeSetCode(row.set_code));
  if (matchesExpectedSetCode) {
    score += 880;
  } else if (hasExpectedSetCode) {
    score -= 360;
  }

  if (query.setTokens.length > 0 && matchedSetTokens === query.setTokens.length) {
    score += 260;
  } else if (query.setTokens.length > 0 && matchedSetTokens === 0) {
    score -= 180;
  }

  const numberMatchStrength = getNumberMatchStrength(row, query);
  if (numberMatchStrength >= 1) {
    score += 1600;
  } else if (numberMatchStrength >= 0.86) {
    score += 1120;
  } else if (numberMatchStrength >= 0.72) {
    score += 760;
  } else if (query.numberTokens.length > 0 || query.numberDigitTokens.length > 0) {
    score -= 520;
  }

  let matchedVariantCues = 0;
  for (const cue of query.variantCues) {
    if (!rowVariantCues.has(cue)) continue;
    matchedVariantCues += 1;

    switch (cue) {
      case "alt_art":
        score += 720;
        break;
      case "rainbow":
        score += 620;
        break;
      case "promo":
        score += 520;
        break;
      case "gold":
        score += 320;
        break;
      case "full_art":
        score += 320;
        break;
      case "holo":
        score += 220;
        break;
    }
  }

  if (query.variantCues.length > 0 && matchedVariantCues === 0) {
    score -= 240;
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
  const supabase = createServerComponentClient();
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

  const supabase = createServerComponentClient();
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
  const supabase = createServerComponentClient();
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
  const supabase = createServerComponentClient();
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
  const supabase = createServerComponentClient();
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
  const supabase = createServerComponentClient();
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
  const supabase = createServerComponentClient();
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

  const supabase = createServerComponentClient();
  const { data, error } = await supabase.from("sets").select("code,name,release_date").in("code", setCodes);
  if (error) {
    throw new Error(error.message);
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
}

export async function getExploreRowsWithTiming(
  rawQuery: string,
  sortMode: SortMode,
  exactSetCode: string,
  exactReleaseYear?: number,
  exactIllustrator?: string,
): Promise<{ rows: ExploreRow[]; timing: ExploreRowsTiming }> {
  const totalStartMs = performance.now();
  const totalStartRemote = snapshotRemoteTiming();
  const buildQueryStage = await measureStage(() => buildResolverQuery(rawQuery));
  const query = buildQueryStage.value;

  const fetchCandidatesStage = emptyStageTiming();
  const fetchExactRowsStage = emptyStageTiming();
  const fallbackFetchStage = emptyStageTiming();
  const exactFiltersStage = emptyStageTiming();
  const fetchSetMetadataStage = emptyStageTiming();
  const fetchPricingStage = emptyStageTiming();
  const buildRowsStage = emptyStageTiming();
  const releaseYearFilterStage = emptyStageTiming();
  const sortRowsStage = emptyStageTiming();

  if (!query.normalized && !exactSetCode && !exactReleaseYear && !exactIllustrator) {
    const totalRemote = diffRemoteTiming(totalStartRemote, snapshotRemoteTiming());
    const totalMs = roundTiming(performance.now() - totalStartMs);

    return {
      rows: [],
      timing: {
        total_ms: totalMs,
        remote_ms: totalRemote.remote_ms,
        db_ms: totalRemote.db_ms,
        network_ms: totalRemote.network_ms,
        request_count: totalRemote.request_count,
        app_ms: roundTiming(Math.max(0, totalMs - totalRemote.remote_ms)),
        normalize_ms: buildQueryStage.timing.total_ms,
        postprocess_ms: roundTiming(Math.max(0, totalMs - buildQueryStage.timing.total_ms - totalRemote.remote_ms)),
        stages: {
          build_query: buildQueryStage.timing,
          fetch_candidates: fetchCandidatesStage,
          fetch_exact_rows: fetchExactRowsStage,
          fallback_fetch: fallbackFetchStage,
          exact_filters: exactFiltersStage,
          fetch_set_metadata: fetchSetMetadataStage,
          fetch_pricing: fetchPricingStage,
          build_rows: buildRowsStage,
          release_year_filter: releaseYearFilterStage,
          sort_rows: sortRowsStage,
        },
      },
    };
  }

  let exactRows: CardPrintLookupRow[] = [];
  let setAwareResults = { setNameById: new Map<string, string>(), tcgdexCardIds: [] as string[] };

  if (query.normalized) {
    const timedCandidates = await measureStage(async () =>
      Promise.all([fetchRpcIds(query), fetchSetAwareTcgdexCardIds(query)]),
    );
    Object.assign(fetchCandidatesStage, timedCandidates.timing);

    const [rpcIds, resolvedSetAwareResults] = timedCandidates.value;
    setAwareResults = resolvedSetAwareResults;

    const timedExactRows = await measureStage(() =>
      fetchExactCardRows(rpcIds, resolvedSetAwareResults.tcgdexCardIds, query.directGvId),
    );
    Object.assign(fetchExactRowsStage, timedExactRows.timing);
    exactRows = timedExactRows.value;
  }

  if (!query.normalized) {
    const timedFallbackRows = await measureStage(async () => {
      if (exactSetCode) {
        return fetchCardRowsBySetCode(exactSetCode);
      }

      if (exactIllustrator) {
        return fetchCardRowsByIllustrator(exactIllustrator);
      }

      if (exactReleaseYear) {
        return fetchCardRowsByReleaseYear(exactReleaseYear);
      }

      return [] as CardPrintLookupRow[];
    });

    Object.assign(fallbackFetchStage, timedFallbackRows.timing);
    exactRows = timedFallbackRows.value;
  }

  const timedExactFilters = await measureStage(() => {
    let filteredRows = exactRows;

    if (exactSetCode) {
      filteredRows = filteredRows.filter((row) => normalizeSetCode(row.set_code) === exactSetCode);
    }

    if (exactIllustrator) {
      filteredRows = filteredRows.filter(
        (row) => normalizeIllustrator(row.artist) === normalizeIllustrator(exactIllustrator),
      );
    }

    return filteredRows;
  });
  Object.assign(exactFiltersStage, timedExactFilters.timing);
  exactRows = timedExactFilters.value;

  const timedSetMetadata = await measureStage(() =>
    fetchPublicSetMetadata(uniqueValues(exactRows.map((row) => row.set_code ?? "").filter(Boolean))),
  );
  Object.assign(fetchSetMetadataStage, timedSetMetadata.timing);
  const setMetadataByCode = timedSetMetadata.value;

  const supabase = createServerComponentClient();
  const timedPricing = await measureStage(() => getPublicPricingByCardIds(supabase, exactRows.map((row) => row.id)));
  Object.assign(fetchPricingStage, timedPricing.timing);
  const pricingByCardId = timedPricing.value;

  const timedBuildRows = await measureStage(() =>
    buildExploreRows(exactRows, setAwareResults.setNameById, setMetadataByCode, pricingByCardId),
  );
  Object.assign(buildRowsStage, timedBuildRows.timing);
  const rows = timedBuildRows.value;

  const timedReleaseYearFilter = await measureStage(() =>
    typeof exactReleaseYear === "number"
      ? rows.filter((row) => row.release_year === exactReleaseYear)
      : rows,
  );
  Object.assign(releaseYearFilterStage, timedReleaseYearFilter.timing);
  const filteredRows = timedReleaseYearFilter.value;

  const timedSortRows = await measureStage(() => sortRows(filteredRows, query, sortMode));
  Object.assign(sortRowsStage, timedSortRows.timing);

  const totalRemote = diffRemoteTiming(totalStartRemote, snapshotRemoteTiming());
  const totalMs = roundTiming(performance.now() - totalStartMs);

  return {
    rows: timedSortRows.value,
    timing: {
      total_ms: totalMs,
      remote_ms: totalRemote.remote_ms,
      db_ms: totalRemote.db_ms,
      network_ms: totalRemote.network_ms,
      request_count: totalRemote.request_count,
      app_ms: roundTiming(Math.max(0, totalMs - totalRemote.remote_ms)),
      normalize_ms: buildQueryStage.timing.total_ms,
      postprocess_ms: roundTiming(Math.max(0, totalMs - buildQueryStage.timing.total_ms - totalRemote.remote_ms)),
      stages: {
        build_query: buildQueryStage.timing,
        fetch_candidates: fetchCandidatesStage,
        fetch_exact_rows: fetchExactRowsStage,
        fallback_fetch: fallbackFetchStage,
        exact_filters: exactFiltersStage,
        fetch_set_metadata: fetchSetMetadataStage,
        fetch_pricing: fetchPricingStage,
        build_rows: buildRowsStage,
        release_year_filter: releaseYearFilterStage,
        sort_rows: sortRowsStage,
      },
    },
  };
}

export async function getExploreRows(
  rawQuery: string,
  sortMode: SortMode,
  exactSetCode: string,
  exactReleaseYear?: number,
  exactIllustrator?: string,
): Promise<ExploreRow[]> {
  return (await getExploreRowsWithTiming(rawQuery, sortMode, exactSetCode, exactReleaseYear, exactIllustrator)).rows;
}
