import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getCompatiblePublicGvIdCandidates, pickResolvedPublicGvIdRow } from "@/lib/gvIdAlias";
import { getPublicSets } from "@/lib/publicSets";
import {
  normalizeSetQuery,
  SET_INTENT_ALIAS_MAP,
  STRUCTURED_CARD_SET_ALIAS_MAP,
  type PublicSetSummary,
} from "@/lib/publicSets.shared";
import {
  expandResolverNicknameTokens,
  normalizeQuery,
  type NormalizedQueryPacket,
} from "@/lib/resolver/normalizeQuery";

const CARD_SELECT = "id,gv_id,name,number,set_code,printed_set_abbrev";
const STRUCTURED_QUERY_LIMIT = 80;

type ResolverResult =
  | { kind: "card"; gv_id: string }
  | { kind: "set"; set_code: string }
  | { kind: "sets"; query: string }
  | { kind: "explore"; query: string };

type ResolverCardRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  number: string | null;
  set_code: string | null;
  printed_set_abbrev: string | null;
};

type ParsedFraction = {
  printedNumber: string;
  printedNumberPrefix: string;
  printedTotal: string;
  printedTotalPrefix: string;
  printedTotalDigits: string;
};

type ParsedQuery = {
  normalizedInput: string;
  normalizedFallbackQuery: string;
  normalizedGvId: string | null;
  tokens: string[];
  expectedSetCodes: string[];
  setConsumedTokens: string[];
};

type SetContext = {
  setCodes: string[];
  consumedTokens: string[];
};

type RemoteTimingSnapshot = {
  remote_ms: number;
  db_ms: number;
  network_ms: number;
  request_count: number;
};

type ResolverStageTiming = RemoteTimingSnapshot & {
  total_ms: number;
  app_ms: number;
};

export type ResolvePublicSearchTiming = RemoteTimingSnapshot & {
  total_ms: number;
  app_ms: number;
  normalize_ms: number;
  postprocess_ms: number;
  stages: {
    normalize: ResolverStageTiming;
    direct_gv_lookup: ResolverStageTiming;
    structured_collector: ResolverStageTiming;
    exact_name: ResolverStageTiming;
    set_intent: ResolverStageTiming;
    alias: ResolverStageTiming;
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

function emptyStageTiming(): ResolverStageTiming {
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

function finalizeStageTiming(startMs: number, startRemote: RemoteTimingSnapshot): ResolverStageTiming {
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

async function measureStage<T>(operation: () => Promise<T> | T): Promise<{ value: T; timing: ResolverStageTiming }> {
  const startMs = performance.now();
  const startRemote = snapshotRemoteTiming();
  const value = await operation();

  return {
    value,
    timing: finalizeStageTiming(startMs, startRemote),
  };
}

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

function normalizeFallbackQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanResolverToken(token: string) {
  return token.replace(/^[^a-z0-9/.-]+|[^a-z0-9/.-]+$/gi, "");
}

function normalizeResolverInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/\s+/)
    .map(cleanResolverToken)
    .filter(Boolean)
    .join(" ");
}

function splitTokens(value: string) {
  return value ? value.split(" ").filter(Boolean) : [];
}

function tokenizeWords(value?: string | null) {
  return (value ?? "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeDigits(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  return digits || "0";
}

function parseCollectorFraction(token: string): ParsedFraction | null {
  const match = token.match(/^([a-z]*\d+)\/([a-z]*\d+)$/i);
  if (!match) {
    return null;
  }

  const printedNumber = match[1].toUpperCase();
  const printedTotal = match[2].toUpperCase();

  return {
    printedNumber,
    printedNumberPrefix: printedNumber.replace(/\d/g, ""),
    printedTotal,
    printedTotalPrefix: printedTotal.replace(/\d/g, ""),
    printedTotalDigits: normalizeDigits(printedTotal),
  };
}

function parsePrintedNumberToken(token: string) {
  return /^[a-z]*\d+$/i.test(token) ? token.toUpperCase() : null;
}

function phraseInQuery(normalizedQuery: string, phrase: string) {
  return (` ${normalizedQuery} `).includes(` ${normalizeResolverInput(phrase)} `);
}

function subtractTokens(tokens: string[], removeTokens: string[]) {
  const remaining = [...tokens];

  for (const token of removeTokens) {
    const index = remaining.findIndex((candidate) => candidate === token);
    if (index >= 0) {
      remaining.splice(index, 1);
    }
  }

  return remaining;
}

function parseQuery(packet: NormalizedQueryPacket): ParsedQuery {
  return {
    normalizedInput: packet.normalizedResolverInput,
    normalizedFallbackQuery: normalizeFallbackQuery(packet.normalizedQuery),
    normalizedGvId: packet.normalizedGvId,
    tokens: splitTokens(packet.normalizedResolverInput),
    expectedSetCodes: packet.expectedSetCodes,
    setConsumedTokens: packet.setConsumedTokens,
  };
}

function buildSetContext(
  normalizedInput: string,
  setInfos: PublicSetSummary[],
  aliasMap: Record<string, string[]>,
  expectedSetCodes: string[] = [],
  consumedTokens: string[] = [],
): SetContext {
  const aliasMatches = Object.entries(aliasMap)
    .filter(([phrase]) => phraseInQuery(normalizedInput, phrase))
    .map(([phrase, codes]) => ({ phrase: normalizeResolverInput(phrase), codes }));

  const exactSetMatches = setInfos
    .flatMap((setInfo) => {
      const matches: Array<{ phrase: string; codes: string[] }> = [];

      if (phraseInQuery(normalizedInput, setInfo.normalized_name)) {
        matches.push({ phrase: setInfo.normalized_name, codes: [setInfo.code] });
      }

      if (
        setInfo.normalized_printed_set_abbrev &&
        phraseInQuery(normalizedInput, setInfo.normalized_printed_set_abbrev)
      ) {
        matches.push({
          phrase: setInfo.normalized_printed_set_abbrev,
          codes: [setInfo.code],
        });
      }

      return matches;
    });

  const matches = [...aliasMatches, ...exactSetMatches].sort((left, right) => {
    const leftTokenCount = splitTokens(left.phrase).length;
    const rightTokenCount = splitTokens(right.phrase).length;
    if (leftTokenCount !== rightTokenCount) {
      return rightTokenCount - leftTokenCount;
    }

    return right.phrase.length - left.phrase.length;
  });

  if (matches.length === 0) {
    return {
      setCodes: uniqueValues(expectedSetCodes.map((code) => normalizeSetCode(code))),
      consumedTokens: uniqueValues(consumedTokens),
    };
  }

  const strongestPhrase = matches[0].phrase;
  const strongestMatches = matches.filter((match) => match.phrase === strongestPhrase);

  return {
    setCodes: uniqueValues([
      ...strongestMatches.flatMap((match) => match.codes.map((code) => normalizeSetCode(code))),
      ...expectedSetCodes.map((code) => normalizeSetCode(code)),
    ]),
    consumedTokens: uniqueValues([...splitTokens(strongestPhrase), ...consumedTokens]),
  };
}

function matchesPrintedNumber(rowNumber: string | null, token: string) {
  const normalizedRow = (rowNumber ?? "").trim().toUpperCase();
  const normalizedToken = token.trim().toUpperCase();

  if (!normalizedRow || !normalizedToken) {
    return false;
  }

  if (normalizedRow === normalizedToken) {
    return true;
  }

  const rowDigits = normalizeDigits(normalizedRow);
  const tokenDigits = normalizeDigits(normalizedToken);
  const rowPrefix = normalizedRow.replace(/\d/g, "");
  const tokenPrefix = normalizedToken.replace(/\d/g, "");

  return rowDigits === tokenDigits && rowPrefix === tokenPrefix;
}

function matchesPrintedTotal(setInfo: PublicSetSummary | undefined, fraction: ParsedFraction) {
  if (!setInfo?.printed_total) {
    return false;
  }

  if (String(setInfo.printed_total) !== fraction.printedTotalDigits) {
    return false;
  }

  if (!fraction.printedTotalPrefix) {
    return true;
  }

  return fraction.printedTotalPrefix === fraction.printedNumberPrefix;
}

function rowMatchesNameTokens(row: ResolverCardRow, nameTokens: string[]) {
  if (nameTokens.length === 0) {
    return true;
  }

  const rowNameTokens = new Set(tokenizeWords(row.name));
  return nameTokens.every((token) => {
    if (rowNameTokens.has(token)) {
      return true;
    }

    const expanded = expandResolverNicknameTokens([token]).expandedTokens.filter((candidate) => candidate !== token);
    return expanded.some((candidate) => rowNameTokens.has(candidate));
  });
}

async function fetchRowsByNumberCandidates(
  supabase: ReturnType<typeof createServerSupabase>,
  numberCandidates: string[],
  setCodes: string[],
) {
  if (numberCandidates.length === 0) {
    return [] as ResolverCardRow[];
  }

  let query = supabase.from("card_prints").select(CARD_SELECT).in("number", numberCandidates).limit(STRUCTURED_QUERY_LIMIT);

  if (setCodes.length > 0) {
    query = query.in("set_code", setCodes);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ResolverCardRow[];
}

function buildNumberCandidates(numberToken: string) {
  const normalizedToken = numberToken.toUpperCase();
  const candidates = [normalizedToken];
  const prefix = normalizedToken.replace(/\d/g, "");
  const digits = normalizedToken.replace(/^[A-Z]+/i, "");

  if (!prefix && digits && digits !== normalizedToken) {
    candidates.push(digits);
  }

  if (!prefix && /^\d+$/.test(digits) && digits.length < 3) {
    candidates.push(digits.padStart(3, "0"));
  }

  return uniqueValues(candidates);
}

async function resolveStructuredCollectorQuery(
  supabase: ReturnType<typeof createServerSupabase>,
  parsedQuery: ParsedQuery,
) {
  const setInfos = await getPublicSets();
  const setInfoByCode = new Map(setInfos.map((setInfo) => [normalizeSetCode(setInfo.code), setInfo]));
  const setContext = buildSetContext(
    parsedQuery.normalizedInput,
    setInfos,
    STRUCTURED_CARD_SET_ALIAS_MAP,
    parsedQuery.expectedSetCodes,
    parsedQuery.setConsumedTokens,
  );
  const tokensWithoutSet = subtractTokens(parsedQuery.tokens, setContext.consumedTokens);

  const fractionToken = tokensWithoutSet.find((token) => Boolean(parseCollectorFraction(token)));
  const fraction = fractionToken ? parseCollectorFraction(fractionToken) : null;
  const tokensWithoutFraction = fractionToken
    ? tokensWithoutSet.filter((token) => token !== fractionToken)
    : tokensWithoutSet;

  const printedNumberToken = !fraction
    ? [...tokensWithoutFraction].reverse().find((token) => Boolean(parsePrintedNumberToken(token))) ?? null
    : null;

  const tokensWithoutSignals = printedNumberToken
    ? (() => {
        const reversedIndex = [...tokensWithoutFraction].reverse().findIndex((token) => token === printedNumberToken);
        const index = reversedIndex >= 0 ? tokensWithoutFraction.length - 1 - reversedIndex : -1;
        return index >= 0 ? tokensWithoutFraction.filter((_, tokenIndex) => tokenIndex !== index) : tokensWithoutFraction;
      })()
    : tokensWithoutFraction;

  const nameTokens = tokenizeWords(tokensWithoutSignals.join(" "));

  if (fraction) {
    if (setContext.setCodes.length === 0 && nameTokens.length === 0) {
      return null;
    }

    const candidateRows = await fetchRowsByNumberCandidates(
      supabase,
      buildNumberCandidates(fraction.printedNumber),
      setContext.setCodes,
    );

    const matches = uniqueValues(
      candidateRows
        .filter((row) => row.gv_id)
        .filter((row) => matchesPrintedNumber(row.number, fraction.printedNumber))
        .filter((row) => matchesPrintedTotal(setInfoByCode.get(normalizeSetCode(row.set_code)), fraction))
        .filter((row) => rowMatchesNameTokens(row, nameTokens))
        .map((row) => row.gv_id ?? ""),
    );

    return matches.length === 1 ? matches[0] : null;
  }

  if (printedNumberToken && setContext.setCodes.length > 0) {
    const candidateRows = await fetchRowsByNumberCandidates(
      supabase,
      buildNumberCandidates(printedNumberToken),
      setContext.setCodes,
    );

    const matches = uniqueValues(
      candidateRows
        .filter((row) => row.gv_id)
        .filter((row) => matchesPrintedNumber(row.number, printedNumberToken))
        .filter((row) => rowMatchesNameTokens(row, nameTokens))
        .map((row) => row.gv_id ?? ""),
    );

    return matches.length === 1 ? matches[0] : null;
  }

  return null;
}

function exactAliasSetMatches(normalizedInput: string) {
  return uniqueValues(
    Object.entries(SET_INTENT_ALIAS_MAP)
      .filter(([alias]) => normalizeSetQuery(alias) === normalizedInput)
      .flatMap(([, codes]) => codes.map((code) => normalizeSetCode(code))),
  );
}

function findSetIntentMatches(normalizedInput: string, sets: PublicSetSummary[]) {
  const queryTokens = tokenizeWords(normalizedInput);

  // Single-token queries are too ambiguous for fuzzy set routing.
  // Exact aliases, exact codes, and exact set names are handled earlier.
  if (queryTokens.length < 2) {
    return [];
  }

  return uniqueValues(
    sets
      .filter((setInfo) => {
        if (queryTokens.length === 0) {
          return false;
        }

        if (setInfo.normalized_name.includes(normalizedInput)) {
          return true;
        }

        return queryTokens.every((token) => setInfo.normalized_tokens.includes(token));
      })
      .map((setInfo) => setInfo.code),
  );
}

async function resolveSetIntent(parsedQuery: ParsedQuery): Promise<ResolverResult | null> {
  const sets = await getPublicSets();
  const normalizedExpectedSetCodes = uniqueValues(parsedQuery.expectedSetCodes.map((code) => normalizeSetCode(code)));
  const aliasMatches = exactAliasSetMatches(parsedQuery.normalizedInput);
  const exactSetMatches = uniqueValues(
    sets
      .filter(
        (setInfo) =>
          setInfo.normalized_name === parsedQuery.normalizedInput ||
          normalizeSetCode(setInfo.code) === parsedQuery.normalizedInput ||
          setInfo.normalized_printed_set_abbrev === parsedQuery.normalizedInput,
      )
      .map((setInfo) => setInfo.code),
  );

  if (
    normalizedExpectedSetCodes.length === 1 &&
    parsedQuery.tokens.length > 0 &&
    parsedQuery.tokens.every((token) => parsedQuery.setConsumedTokens.includes(token))
  ) {
    return { kind: "set", set_code: normalizedExpectedSetCodes[0] };
  }

  if (aliasMatches.length === 1) {
    return { kind: "set", set_code: aliasMatches[0] };
  }

  if (aliasMatches.length > 1) {
    return { kind: "sets", query: parsedQuery.normalizedFallbackQuery };
  }

  if (exactSetMatches.length === 1) {
    return { kind: "set", set_code: exactSetMatches[0] };
  }

  if (exactSetMatches.length > 1) {
    return { kind: "sets", query: parsedQuery.normalizedFallbackQuery };
  }

  const setMatches = findSetIntentMatches(parsedQuery.normalizedInput, sets);
  if (setMatches.length === 1) {
    return { kind: "set", set_code: setMatches[0] };
  }

  if (setMatches.length > 1) {
    return { kind: "sets", query: parsedQuery.normalizedFallbackQuery };
  }

  return null;
}

async function resolveExactCanonicalName(
  supabase: ReturnType<typeof createServerSupabase>,
  normalizedInput: string,
) {
  const { data, error } = await supabase
    .from("card_prints")
    .select("gv_id")
    .ilike("name", normalizedInput)
    .limit(2);

  if (error) {
    throw new Error(error.message);
  }

  const matches = uniqueValues(
    ((data ?? []) as Array<{ gv_id?: string | null }>)
      .map((row) => row.gv_id ?? "")
      .filter(Boolean),
  );

  return matches.length === 1 ? matches[0] : null;
}

async function resolveAliasOrNickname() {
  // Future semantic alias lane. Intentionally conservative until a real alias table exists.
  return null;
}

export async function resolvePublicSearchPacketWithTiming(
  packet: NormalizedQueryPacket,
): Promise<{
  result: ResolverResult;
  timing: ResolvePublicSearchTiming;
  matchedStage: "direct_gv_lookup" | "structured_collector" | "exact_name" | "set_intent" | "alias" | "fallback";
}> {
  const totalStartMs = performance.now();
  const totalStartRemote = snapshotRemoteTiming();

  const normalizeStage = await measureStage(() => parseQuery(packet));
  const parsedQuery = normalizeStage.value;
  const directLookupStage = emptyStageTiming();
  const structuredStage = emptyStageTiming();
  const exactNameStage = emptyStageTiming();
  const setIntentStage = emptyStageTiming();
  const aliasStage = emptyStageTiming();

  if (!parsedQuery.normalizedInput) {
    const totalRemote = diffRemoteTiming(totalStartRemote, snapshotRemoteTiming());
    const totalMs = roundTiming(performance.now() - totalStartMs);

    return {
      result: { kind: "explore", query: parsedQuery.normalizedFallbackQuery },
      matchedStage: "fallback",
      timing: {
        total_ms: totalMs,
        remote_ms: totalRemote.remote_ms,
        db_ms: totalRemote.db_ms,
        network_ms: totalRemote.network_ms,
        request_count: totalRemote.request_count,
        app_ms: roundTiming(Math.max(0, totalMs - totalRemote.remote_ms)),
        normalize_ms: normalizeStage.timing.total_ms,
        postprocess_ms: roundTiming(Math.max(0, totalMs - normalizeStage.timing.total_ms - totalRemote.remote_ms)),
        stages: {
          normalize: normalizeStage.timing,
          direct_gv_lookup: directLookupStage,
          structured_collector: structuredStage,
          exact_name: exactNameStage,
          set_intent: setIntentStage,
          alias: aliasStage,
        },
      },
    };
  }

  const supabase = createServerSupabase();
  let result: ResolverResult = { kind: "explore", query: parsedQuery.normalizedFallbackQuery };
  let matchedStage: "direct_gv_lookup" | "structured_collector" | "exact_name" | "set_intent" | "alias" | "fallback" =
    "fallback";

  if (parsedQuery.normalizedGvId) {
    const directGvId = parsedQuery.normalizedGvId;
    const timedLookup = await measureStage(async () => {
      const { data, error } = await supabase
        .from("card_prints")
        .select("gv_id")
        .in("gv_id", getCompatiblePublicGvIdCandidates(directGvId))
        .limit(2);

      if (error) {
        throw new Error(error.message);
      }

      const matchedRow = pickResolvedPublicGvIdRow(
        (data ?? []) as Array<{ gv_id: string | null }>,
        directGvId,
      );
      if (matchedRow?.gv_id) {
        return { kind: "card", gv_id: matchedRow.gv_id } satisfies ResolverResult;
      }

      return { kind: "explore", query: parsedQuery.normalizedFallbackQuery } satisfies ResolverResult;
    });

    result = timedLookup.value;
    if (result.kind === "card") {
      matchedStage = "direct_gv_lookup";
    }
    Object.assign(directLookupStage, timedLookup.timing);
  } else {
    const timedStructured = await measureStage(() => resolveStructuredCollectorQuery(supabase, parsedQuery));
    Object.assign(structuredStage, timedStructured.timing);

    if (timedStructured.value) {
      result = { kind: "card", gv_id: timedStructured.value };
      matchedStage = "structured_collector";
    } else {
      const timedExactName = await measureStage(() => resolveExactCanonicalName(supabase, parsedQuery.normalizedInput));
      Object.assign(exactNameStage, timedExactName.timing);

      if (timedExactName.value) {
        result = { kind: "card", gv_id: timedExactName.value };
        matchedStage = "exact_name";
      } else {
        const timedSetIntent = await measureStage(() => resolveSetIntent(parsedQuery));
        Object.assign(setIntentStage, timedSetIntent.timing);

        if (timedSetIntent.value) {
          result = timedSetIntent.value;
          matchedStage = "set_intent";
        } else {
          const timedAlias = await measureStage(() => resolveAliasOrNickname());
          Object.assign(aliasStage, timedAlias.timing);

          if (timedAlias.value) {
            result = { kind: "card", gv_id: timedAlias.value };
            matchedStage = "alias";
          }
        }
      }
    }
  }

  const totalRemote = diffRemoteTiming(totalStartRemote, snapshotRemoteTiming());
  const totalMs = roundTiming(performance.now() - totalStartMs);

  return {
    result,
    matchedStage,
    timing: {
      total_ms: totalMs,
      remote_ms: totalRemote.remote_ms,
      db_ms: totalRemote.db_ms,
      network_ms: totalRemote.network_ms,
      request_count: totalRemote.request_count,
      app_ms: roundTiming(Math.max(0, totalMs - totalRemote.remote_ms)),
      normalize_ms: normalizeStage.timing.total_ms,
      postprocess_ms: roundTiming(Math.max(0, totalMs - normalizeStage.timing.total_ms - totalRemote.remote_ms)),
      stages: {
        normalize: normalizeStage.timing,
        direct_gv_lookup: directLookupStage,
        structured_collector: structuredStage,
        exact_name: exactNameStage,
        set_intent: setIntentStage,
        alias: aliasStage,
      },
    },
  };
}

export async function resolvePublicSearchWithTiming(
  rawQuery: string,
): Promise<{ result: ResolverResult; timing: ResolvePublicSearchTiming }> {
  return resolvePublicSearchPacketWithTiming(normalizeQuery(rawQuery));
}

export async function resolvePublicSearch(rawQuery: string): Promise<ResolverResult> {
  return (await resolvePublicSearchWithTiming(rawQuery)).result;
}
