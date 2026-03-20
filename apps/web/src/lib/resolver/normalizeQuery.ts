import { STRUCTURED_CARD_SET_ALIAS_MAP, normalizeSetQuery, tokenizeSetWords } from "@/lib/publicSets.shared";

const PROMO_PREFIXES = new Set(["swsh", "svp", "smp", "xyp", "bwp", "basep", "dpp"]);
const SET_CODE_ALIASES = new Set(["151", "base1", "brs", "lor", "ltr", "obs", "sit", "svi"]);

export type CollectorNumberExpectation = {
  token: string;
  digits?: string;
  exactOnly: boolean;
};

export type NormalizedVariantToken =
  | "alt art"
  | "full art"
  | "gold"
  | "holo"
  | "promo"
  | "rainbow"
  | "reverse";

export type NormalizedQueryPacket = {
  rawQuery: string;
  normalizedQuery: string;
  normalizedResolverInput: string;
  normalizedTokens: string[];
  compactTokens: string[];
  numberTokens: string[];
  numberDigitTokens: string[];
  fractionTokens: string[];
  promoTokens: string[];
  possibleSetTokens: string[];
  expectedSetCodes: string[];
  setConsumedTokens: string[];
  variantTokens: NormalizedVariantToken[];
  variantConsumedTokens: string[];
  normalizedGvId: string | null;
  collectorExpectations: CollectorNumberExpectation[];
  hasStrongDisambiguator: boolean;
};

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeWhitespace(value: string) {
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

function normalizeTextForMatch(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeDigits(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  return digits || "0";
}

function normalizeCollectorToken(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function tokenizeNormalizedQuery(value?: string | null) {
  return normalizeTextForMatch(value).match(/[a-z0-9]+/g) ?? [];
}

function tokenizeQuerySegments(value?: string | null) {
  return normalizeTextForMatch(value).match(/[a-z0-9/]+/g) ?? [];
}

function normalizeSetCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
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

function buildCompactTokens(normalizedTokens: string[], baseSegments: string[]) {
  const compacted: string[] = [...baseSegments];

  for (let index = 0; index < normalizedTokens.length - 1; index += 1) {
    const prefix = normalizedTokens[index];
    const next = normalizedTokens[index + 1];

    if (!/^\d{1,4}[a-z]?$/.test(next)) {
      continue;
    }

    if (PROMO_PREFIXES.has(prefix) || /^sv$/i.test(prefix)) {
      compacted.push(`${prefix}${next}`);
    }
  }

  return uniqueValues(compacted);
}

function detectSetExpectations(normalizedQuery: string) {
  const normalized = normalizeSetQuery(normalizedQuery);
  const expectedCodes: string[] = [];
  const consumedTokens: string[] = [];
  const matchedPhrases: string[] = [];

  for (const [phrase, codes] of Object.entries(STRUCTURED_CARD_SET_ALIAS_MAP)) {
    const normalizedPhrase = normalizeSetQuery(phrase);
    if (!normalizedPhrase) continue;

    if (` ${normalized} `.includes(` ${normalizedPhrase} `)) {
      expectedCodes.push(...codes.map((code) => normalizeSetCode(code)));
      consumedTokens.push(...tokenizeSetWords(normalizedPhrase));
      matchedPhrases.push(normalizedPhrase);
    }
  }

  const tokenMatches = tokenizeNormalizedQuery(normalized).filter(
    (token) =>
      SET_CODE_ALIASES.has(token) ||
      /^sv\d{1,2}(?:\.\d)?$/i.test(token) ||
      /^swsh\d{1,2}(?:tg)?$/i.test(token) ||
      /^sm\d{1,2}$/i.test(token) ||
      /^xy\d{1,3}$/i.test(token) ||
      /^bw\d{1,2}$/i.test(token) ||
      /^dp\d{1,2}$/i.test(token) ||
      /^pl\d{1,2}$/i.test(token) ||
      /^hgss\d{1,2}$/i.test(token) ||
      /^base\d+$/i.test(token) ||
      /^det\d+$/i.test(token) ||
      /^pr-[a-z]{2,5}$/i.test(token),
  );

  return {
    expectedCodes: uniqueValues(expectedCodes),
    consumedTokens: uniqueValues(consumedTokens),
    possibleSetTokens: uniqueValues([...matchedPhrases, ...tokenMatches]),
  };
}

function detectVariantTokens(normalizedQuery: string, normalizedTokens: string[]) {
  const normalized = normalizeTextForMatch(normalizedQuery);
  const variantTokens: NormalizedVariantToken[] = [];
  const consumedTokens = new Set<string>();

  const phraseMap: Array<{ phrases: string[]; token: NormalizedVariantToken }> = [
    { phrases: ["reverse holo", "rev holo"], token: "reverse" },
    { phrases: ["alt art", "alternate art"], token: "alt art" },
    { phrases: ["full art", "fullart"], token: "full art" },
    { phrases: ["black star promo", "black star"], token: "promo" },
  ];

  for (const entry of phraseMap) {
    if (entry.phrases.some((phrase) => ` ${normalized} `.includes(` ${phrase} `))) {
      variantTokens.push(entry.token);
      for (const phrase of entry.phrases) {
        if (` ${normalized} `.includes(` ${phrase} `)) {
          for (const token of tokenizeNormalizedQuery(phrase)) {
            consumedTokens.add(token);
          }
        }
      }
    }
  }

  const singleTokenMap: Array<{ token: string; normalized: NormalizedVariantToken }> = [
    { token: "promo", normalized: "promo" },
    { token: "holo", normalized: "holo" },
    { token: "rainbow", normalized: "rainbow" },
    { token: "gold", normalized: "gold" },
    { token: "reverse", normalized: "reverse" },
  ];

  for (const entry of singleTokenMap) {
    if (normalizedTokens.includes(entry.token)) {
      variantTokens.push(entry.normalized);
      consumedTokens.add(entry.token);
    }
  }

  return {
    variantTokens: uniqueValues(variantTokens) as NormalizedVariantToken[],
    consumedTokens: [...consumedTokens],
  };
}

function buildCollectorArtifacts(compactTokens: string[]) {
  const expectations: CollectorNumberExpectation[] = [];
  const fractionTokens: string[] = [];
  const numberTokens: string[] = [];
  const promoTokens: string[] = [];

  for (const segment of compactTokens) {
    const fractionMatch = segment.match(/^([a-z]*\d+[a-z]?)\/([a-z]*\d+[a-z]?)$/i);
    if (fractionMatch) {
      const printedNumber = normalizeCollectorToken(fractionMatch[1]);
      const printedTotal = normalizeCollectorToken(fractionMatch[2]);
      expectations.push({
        token: printedNumber,
        digits: normalizeDigits(printedNumber),
        exactOnly: /[A-Z]/.test(printedNumber),
      });
      fractionTokens.push(`${printedNumber}/${printedTotal}`);
      numberTokens.push(printedNumber);
      if (!/[A-Z]/.test(printedNumber)) {
        numberTokens.push(normalizeDigits(printedNumber));
      }
      continue;
    }

    if (/^[a-z]+\d+[a-z]?$/i.test(segment)) {
      const token = normalizeCollectorToken(segment);
      expectations.push({
        token,
        exactOnly: true,
      });
      numberTokens.push(token);

      const lower = token.toLowerCase();
      if ([...PROMO_PREFIXES].some((prefix) => lower.startsWith(prefix))) {
        promoTokens.push(token);
      }
      continue;
    }

    if (/^\d+$/.test(segment)) {
      const normalizedDigits = normalizeDigits(segment);
      expectations.push({
        token: normalizedDigits,
        digits: normalizedDigits,
        exactOnly: false,
      });
      numberTokens.push(segment);
      numberTokens.push(normalizedDigits);
    }
  }

  const dedupedExpectations = new Map<string, CollectorNumberExpectation>();
  for (const expectation of expectations) {
    dedupedExpectations.set(expectation.token, expectation);
  }

  const normalizedExpectations = [...dedupedExpectations.values()];

  return {
    collectorExpectations: normalizedExpectations,
    fractionTokens: uniqueValues(fractionTokens),
    numberTokens: uniqueValues(numberTokens),
    numberDigitTokens: uniqueValues(
      normalizedExpectations
        .map((expectation) => expectation.digits ?? "")
        .filter(Boolean),
    ),
    promoTokens: uniqueValues(promoTokens),
  };
}

export function normalizeQuery(rawQuery: string): NormalizedQueryPacket {
  const normalizedQuery = normalizeWhitespace(rawQuery);
  const normalizedResolverInput = normalizeResolverInput(rawQuery);
  const normalizedTokens = tokenizeNormalizedQuery(normalizedQuery);
  const baseSegments = tokenizeQuerySegments(normalizedQuery);
  const compactTokens = buildCompactTokens(normalizedTokens, baseSegments);
  const setExpectations = detectSetExpectations(normalizedQuery);
  const variantArtifacts = detectVariantTokens(normalizedQuery, normalizedTokens);
  const collectorArtifacts = buildCollectorArtifacts(compactTokens);
  const normalizedGvId = normalizeGvIdInput(normalizedResolverInput);

  return {
    rawQuery,
    normalizedQuery,
    normalizedResolverInput,
    normalizedTokens,
    compactTokens,
    numberTokens: collectorArtifacts.numberTokens,
    numberDigitTokens: collectorArtifacts.numberDigitTokens,
    fractionTokens: collectorArtifacts.fractionTokens,
    promoTokens: collectorArtifacts.promoTokens,
    possibleSetTokens: setExpectations.possibleSetTokens,
    expectedSetCodes: setExpectations.expectedCodes,
    setConsumedTokens: setExpectations.consumedTokens,
    variantTokens: variantArtifacts.variantTokens,
    variantConsumedTokens: variantArtifacts.consumedTokens,
    normalizedGvId,
    collectorExpectations: collectorArtifacts.collectorExpectations,
    hasStrongDisambiguator:
      collectorArtifacts.collectorExpectations.length > 0 ||
      setExpectations.expectedCodes.length > 0 ||
      setExpectations.consumedTokens.length > 0 ||
      variantArtifacts.variantTokens.length > 0,
  };
}
