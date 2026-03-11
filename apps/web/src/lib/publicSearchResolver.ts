import "server-only";

import { createClient } from "@supabase/supabase-js";

const CARD_SELECT = "id,gv_id,name,number,set_code,printed_set_abbrev";
const STRUCTURED_QUERY_LIMIT = 80;

const SET_ALIAS_MAP: Record<string, string[]> = {
  "base": ["base1"],
  "base set": ["base1"],
  "bs": ["base1"],
  "151": ["sv03.5"],
  "pokemon 151": ["sv03.5"],
  "mew": ["sv03.5"],
  "ltr": ["bw11"],
  "legendary treasures": ["bw11"],
  "brs": ["swsh9", "swsh9tg"],
  "brilliant stars": ["swsh9", "swsh9tg"],
  "brilliant stars trainer gallery": ["swsh9tg"],
  "lor": ["swsh11", "swsh11tg"],
  "lost origin": ["swsh11", "swsh11tg"],
  "lost origin trainer gallery": ["swsh11tg"],
};

type ResolverResult =
  | { kind: "card"; gv_id: string }
  | { kind: "explore"; query: string };

type ResolverCardRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  number: string | null;
  set_code: string | null;
  printed_set_abbrev: string | null;
};

type SetRow = {
  code: string | null;
  name: string | null;
  printed_total: number | null;
};

type SetInfo = {
  code: string;
  name: string;
  printed_total?: number;
  normalizedName: string;
  normalizedTokens: string[];
};

type ParsedFraction = {
  raw: string;
  printedNumber: string;
  printedNumberPrefix: string;
  printedTotal: string;
  printedTotalPrefix: string;
  printedTotalDigits: string;
};

type ParsedQuery = {
  rawQuery: string;
  normalizedInput: string;
  normalizedFallbackQuery: string;
  normalizedGvId: string | null;
  tokens: string[];
};

type SetContext = {
  setCodes: string[];
  consumedTokens: string[];
};

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
  return token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
}

function normalizeResolverInput(value: string) {
  return value
    .trim()
    .toLowerCase()
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

function normalizePrintedSetAbbrev(value?: string | null) {
  return (value ?? "").trim().toUpperCase();
}

function normalizeDigits(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  return digits || "0";
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

function parseCollectorFraction(token: string): ParsedFraction | null {
  const match = token.match(/^([a-z]*\d+)\/([a-z]*\d+)$/i);
  if (!match) {
    return null;
  }

  const printedNumber = match[1].toUpperCase();
  const printedTotal = match[2].toUpperCase();

  return {
    raw: token,
    printedNumber,
    printedNumberPrefix: printedNumber.replace(/\d/g, ""),
    printedTotal,
    printedTotalPrefix: printedTotal.replace(/\d/g, ""),
    printedTotalDigits: normalizeDigits(printedTotal),
  };
}

function parsePrintedNumberToken(token: string) {
  if (!/^[a-z]*\d+$/i.test(token)) {
    return null;
  }

  return token.toUpperCase();
}

function phraseInQuery(normalizedQuery: string, phrase: string) {
  return (` ${normalizedQuery} `).includes(` ${phrase} `);
}

function subtractTokens(tokens: string[], removeTokens: string[]) {
  const remaining = [...tokens];

  for (const token of removeTokens) {
    const matchIndex = remaining.findIndex((candidate) => candidate === token);
    if (matchIndex >= 0) {
      remaining.splice(matchIndex, 1);
    }
  }

  return remaining;
}

function parseQuery(rawQuery: string): ParsedQuery {
  const normalizedFallbackQuery = normalizeFallbackQuery(rawQuery);
  const normalizedInput = normalizeResolverInput(rawQuery);

  return {
    rawQuery,
    normalizedInput,
    normalizedFallbackQuery,
    normalizedGvId: normalizeGvIdInput(normalizedInput),
    tokens: splitTokens(normalizedInput),
  };
}

async function fetchAllSets(supabase: ReturnType<typeof createServerSupabase>) {
  const { data, error } = await supabase.from("sets").select("code,name,printed_total");
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SetRow[])
    .filter((row): row is SetRow & { code: string; name: string } => Boolean(row.code && row.name))
    .map((row) => ({
      code: row.code,
      name: row.name,
      printed_total: typeof row.printed_total === "number" ? row.printed_total : undefined,
      normalizedName: normalizeResolverInput(row.name),
      normalizedTokens: tokenizeWords(row.name),
    }));
}

function buildSetContext(normalizedInput: string, setInfos: SetInfo[]): SetContext {
  const aliasMatches = Object.entries(SET_ALIAS_MAP)
    .filter(([phrase]) => phraseInQuery(normalizedInput, phrase))
    .map(([phrase, codes]) => ({ phrase, codes }));

  const exactSetMatches = setInfos
    .filter((setInfo) => phraseInQuery(normalizedInput, setInfo.normalizedName))
    .map((setInfo) => ({ phrase: setInfo.normalizedName, codes: [setInfo.code] }));

  const matches = [...aliasMatches, ...exactSetMatches].sort((left, right) => {
    const leftTokenCount = splitTokens(left.phrase).length;
    const rightTokenCount = splitTokens(right.phrase).length;
    if (leftTokenCount !== rightTokenCount) {
      return rightTokenCount - leftTokenCount;
    }

    return right.phrase.length - left.phrase.length;
  });

  if (matches.length === 0) {
    return { setCodes: [], consumedTokens: [] };
  }

  const strongestPhrase = matches[0].phrase;
  const strongestMatches = matches.filter((match) => match.phrase === strongestPhrase);

  return {
    setCodes: uniqueValues(strongestMatches.flatMap((match) => match.codes.map((code) => normalizeSetCode(code)))),
    consumedTokens: splitTokens(strongestPhrase),
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

function matchesPrintedTotal(setInfo: SetInfo | undefined, fraction: ParsedFraction) {
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
  return nameTokens.every((token) => rowNameTokens.has(token));
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

  return uniqueValues(candidates);
}

async function resolveStructuredCollectorQuery(
  supabase: ReturnType<typeof createServerSupabase>,
  parsedQuery: ParsedQuery,
) {
  const setInfos = await fetchAllSets(supabase);
  const setInfoByCode = new Map(setInfos.map((setInfo) => [normalizeSetCode(setInfo.code), setInfo]));
  const setContext = buildSetContext(parsedQuery.normalizedInput, setInfos);
  const tokensWithoutSet = subtractTokens(parsedQuery.tokens, setContext.consumedTokens);

  const fractionToken = tokensWithoutSet.find((token) => Boolean(parseCollectorFraction(token)));
  const fraction = fractionToken ? parseCollectorFraction(fractionToken) : null;
  const tokensWithoutSetAndFraction = fractionToken
    ? tokensWithoutSet.filter((token) => token !== fractionToken)
    : tokensWithoutSet;
  const printedNumberToken = !fraction
    ? [...tokensWithoutSetAndFraction].reverse().find((token) => Boolean(parsePrintedNumberToken(token))) ?? null
    : null;
  const tokensWithoutSignals = printedNumberToken
    ? (() => {
        const reversedIndex = [...tokensWithoutSetAndFraction].reverse().findIndex((token) => token === printedNumberToken);
        const index = reversedIndex >= 0 ? tokensWithoutSetAndFraction.length - 1 - reversedIndex : -1;
        return index >= 0
          ? tokensWithoutSetAndFraction.filter((_, tokenIndex) => tokenIndex !== index)
          : tokensWithoutSetAndFraction;
      })()
    : tokensWithoutSetAndFraction;
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

async function resolveAliasOrNickname(_parsedQuery: ParsedQuery) {
  // Future semantic alias lane. Intentionally conservative until a real alias table exists.
  return null;
}

export async function resolvePublicSearch(rawQuery: string): Promise<ResolverResult> {
  const parsedQuery = parseQuery(rawQuery);
  if (!parsedQuery.normalizedInput) {
    return { kind: "explore", query: parsedQuery.normalizedFallbackQuery };
  }

  const supabase = createServerSupabase();

  if (parsedQuery.normalizedGvId) {
    const { data, error } = await supabase
      .from("card_prints")
      .select("gv_id")
      .eq("gv_id", parsedQuery.normalizedGvId)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    if ((data ?? []).length === 1) {
      return { kind: "card", gv_id: parsedQuery.normalizedGvId };
    }

    return { kind: "explore", query: parsedQuery.normalizedFallbackQuery };
  }

  const structuredMatch = await resolveStructuredCollectorQuery(supabase, parsedQuery);
  if (structuredMatch) {
    return { kind: "card", gv_id: structuredMatch };
  }

  const exactNameMatch = await resolveExactCanonicalName(supabase, parsedQuery.normalizedInput);
  if (exactNameMatch) {
    return { kind: "card", gv_id: exactNameMatch };
  }

  const aliasMatch = await resolveAliasOrNickname(parsedQuery);
  if (aliasMatch) {
    return { kind: "card", gv_id: aliasMatch };
  }

  return { kind: "explore", query: parsedQuery.normalizedFallbackQuery };
}
