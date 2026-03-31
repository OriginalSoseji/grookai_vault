import { STRUCTURED_CARD_SET_ALIAS_MAP, normalizeSetQuery, tokenizeSetWords } from "@/lib/publicSets.shared";
import { NAME_SHORTHANDS, SET_SHORTHANDS } from "@/lib/resolver/shorthand";

const PROMO_PREFIXES = new Set(["swsh", "svp", "smp", "xyp", "bwp", "basep", "dpp"]);
const SET_CODE_ALIASES = new Set(["151", "base1", "brs", "lor", "ltr", "obs", "sit", "svi", ...Object.keys(SET_SHORTHANDS)]);
const PROMO_SET_CODE_MAP: Record<string, string> = {
  swsh: "swshp",
  svp: "svp",
  smp: "smp",
  xyp: "xyp",
  bwp: "bwp",
  basep: "basep",
  dpp: "dpp",
};
const PROMO_MIN_DIGITS_BY_PREFIX: Record<string, number> = {
  swsh: 3,
  svp: 2,
  smp: 2,
  xyp: 2,
  bwp: 2,
  basep: 1,
  dpp: 1,
};

type CoverageSignals = {
  setRules: string[];
  promoRules: string[];
  variantRules: string[];
  specialRules: string[];
  shorthandRules: string[];
  familyRules: string[];
};

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
  expandedSearchTokens: string[];
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
  coverageSignals: CoverageSignals;
};

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function expandResolverNicknameTokens(tokens: string[]) {
  const expanded = new Set<string>();
  const appliedRules = new Set<string>();

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    expanded.add(token);

    const aliases = NAME_SHORTHANDS[token] ?? [];
    for (const alias of aliases) {
      expanded.add(alias);
      appliedRules.add(`nickname:${token}->${alias}`);
    }
  }

  return {
    expandedTokens: [...expanded],
    appliedRules: [...appliedRules],
  };
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function applySpecialPhraseNormalizations(value: string) {
  let normalized = normalizeWhitespace(value);
  const appliedRules = new Set<string>();

  if (/\bscarlet(?:\s+and|\s*&)?\s+violet(?:\s+black\s+star)?\s+promo\b/i.test(normalized)) {
    normalized = normalized.replace(/\bscarlet(?:\s+and|\s*&)?\s+violet(?:\s+black\s+star)?\s+promo\b/gi, "sv promo");
    appliedRules.add("special_family:scarlet violet promo->sv promo");
  }

  if (/\bsv(?:\s+black\s+star)?\s+promo\b/i.test(normalized)) {
    normalized = normalized.replace(/\bsv(?:\s+black\s+star)?\s+promo\b/gi, "sv promo");
    appliedRules.add("special_family:sv promo->sv promo");
  }

  if (/\bsword(?:\s+and|\s*&)?\s+shield(?:\s+black\s+star)?\s+promo\b/i.test(normalized)) {
    normalized = normalized.replace(/\bsword(?:\s+and|\s*&)?\s+shield(?:\s+black\s+star)?\s+promo\b/gi, "swsh promo");
    appliedRules.add("special_family:sword shield promo->swsh promo");
  }

  if (/\bswsh(?:\s+black\s+star)?\s+promo\b/i.test(normalized)) {
    normalized = normalized.replace(/\bswsh(?:\s+black\s+star)?\s+promo\b/gi, "swsh promo");
    appliedRules.add("special_family:swsh promo->swsh promo");
  }

  if (/\bgold(?:\s+|-)+star\b/i.test(normalized)) {
    normalized = normalized.replace(/\bgold(?:\s+|-)+star\b/gi, "★");
    appliedRules.add("special_family:gold star->★");
  }

  return {
    normalizedQuery: normalized,
    appliedRules: [...appliedRules],
  };
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

function detectCoverageFamilyHints(normalizedQuery: string, normalizedTokens: string[]) {
  const normalizedSetText = normalizeSetQuery(normalizedQuery);
  const expectedSetCodes: string[] = [];
  const possibleSetTokens: string[] = [];
  const consumedTokens = new Set<string>();
  const shorthandRules = new Set<string>();
  const familyRules = new Set<string>();

  const phraseRules: Array<{ phrases: string[]; expectedSetCode: string; tokenLabel: string }> = [
    {
      phrases: ["sv promo", "scarlet violet promo", "scarlet and violet promo"],
      expectedSetCode: "svp",
      tokenLabel: "sv promo",
    },
    {
      phrases: ["swsh promo", "sword shield promo", "sword and shield promo"],
      expectedSetCode: "swshp",
      tokenLabel: "swsh promo",
    },
  ];

  for (const rule of phraseRules) {
    if (!rule.phrases.some((phrase) => ` ${normalizedSetText} `.includes(` ${phrase} `))) {
      continue;
    }

    expectedSetCodes.push(rule.expectedSetCode);
    possibleSetTokens.push(rule.tokenLabel);
    familyRules.add(`family_phrase:${rule.tokenLabel}->${rule.expectedSetCode}`);

    for (const phrase of rule.phrases) {
      if (` ${normalizedSetText} `.includes(` ${phrase} `)) {
        for (const token of tokenizeSetWords(phrase)) {
          if (token !== "promo") {
            consumedTokens.add(token);
          }
        }
      }
    }
  }

  const shorthandTokenMap: Record<string, string> = {
    svp: "svp",
    swshp: "swshp",
  };

  for (const token of normalizedTokens) {
    const expectedSetCode = shorthandTokenMap[token];
    if (!expectedSetCode) {
      continue;
    }

    expectedSetCodes.push(expectedSetCode);
    possibleSetTokens.push(token);
    consumedTokens.add(token);
    shorthandRules.add(`set_shorthand:${token}->${expectedSetCode}`);
  }

  return {
    expectedSetCodes: uniqueValues(expectedSetCodes),
    possibleSetTokens: uniqueValues(possibleSetTokens),
    consumedTokens: [...consumedTokens],
    shorthandRules: [...shorthandRules],
    familyRules: [...familyRules],
  };
}

function canonicalizeSetLikeToken(token: string) {
  const lower = token.toLowerCase();

  const svMatch = lower.match(/^sv(\d{1,2})(\.\d)?$/);
  if (svMatch) {
    const main = svMatch[1].padStart(2, "0");
    return `sv${main}${svMatch[2] ?? ""}`;
  }

  return lower;
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
  const appliedRules = new Set<string>();

  for (const [phrase, codes] of Object.entries(STRUCTURED_CARD_SET_ALIAS_MAP)) {
    const normalizedPhrase = normalizeSetQuery(phrase);
    if (!normalizedPhrase) continue;

    if (` ${normalized} `.includes(` ${normalizedPhrase} `)) {
      expectedCodes.push(...codes.map((code) => normalizeSetCode(code)));
      consumedTokens.push(...tokenizeSetWords(normalizedPhrase));
      matchedPhrases.push(normalizedPhrase);
      appliedRules.add(`alias:${normalizedPhrase}`);
    }
  }

  const tokenMatches = tokenizeNormalizedQuery(normalized)
    .filter(
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
    )
    .map((token) => {
      const canonical = canonicalizeSetLikeToken(token);
      if (canonical !== token) {
        appliedRules.add(`set_token:${token}->${canonical}`);
      }
      return canonical;
    });

  for (const token of tokenMatches) {
    if (
      /^sv\d{2}(?:\.\d)?$/i.test(token) ||
      /^swsh\d{1,2}(?:tg)?$/i.test(token) ||
      /^sm\d{1,2}$/i.test(token) ||
      /^xy\d{1,3}$/i.test(token) ||
      /^bw\d{1,2}$/i.test(token) ||
      /^dp\d{1,2}$/i.test(token) ||
      /^pl\d{1,2}$/i.test(token) ||
      /^hgss\d{1,2}$/i.test(token) ||
      /^base\d+$/i.test(token) ||
      /^det\d+$/i.test(token) ||
      /^pr-[a-z]{2,5}$/i.test(token)
    ) {
      expectedCodes.push(token);
    }
  }

  return {
    expectedCodes: uniqueValues(expectedCodes),
    consumedTokens: uniqueValues(consumedTokens),
    possibleSetTokens: uniqueValues([...matchedPhrases, ...tokenMatches]),
    appliedRules: [...appliedRules],
  };
}

function detectVariantTokens(normalizedQuery: string, normalizedTokens: string[]) {
  const normalized = normalizeTextForMatch(normalizedQuery);
  const variantTokens: NormalizedVariantToken[] = [];
  const consumedTokens = new Set<string>();
  const appliedRules = new Set<string>();

  const phraseMap: Array<{ phrases: string[]; token: NormalizedVariantToken }> = [
    { phrases: ["reverse holo", "rev holo", "reverse-holo", "reverseholo", "revholo"], token: "reverse" },
    { phrases: ["alt art", "alternate art", "alt-art"], token: "alt art" },
    { phrases: ["full art", "fullart", "full-art"], token: "full art" },
    { phrases: ["black star promo", "black star", "black-star promo", "black-star"], token: "promo" },
  ];

  for (const entry of phraseMap) {
    if (entry.phrases.some((phrase) => ` ${normalized} `.includes(` ${phrase} `))) {
      variantTokens.push(entry.token);
      for (const phrase of entry.phrases) {
        if (` ${normalized} `.includes(` ${phrase} `)) {
          appliedRules.add(`variant:${phrase}->${entry.token}`);
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
      appliedRules.add(`variant:${entry.token}`);
    }
  }

  return {
    variantTokens: uniqueValues(variantTokens) as NormalizedVariantToken[],
    consumedTokens: [...consumedTokens],
    appliedRules: [...appliedRules],
  };
}

function buildCollectorArtifacts(compactTokens: string[]) {
  const expectations: CollectorNumberExpectation[] = [];
  const fractionTokens: string[] = [];
  const numberTokens: string[] = [];
  const promoTokens: string[] = [];
  const expectedSetCodes: string[] = [];
  const appliedRules = new Set<string>();

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
      const matchedPrefix = [...PROMO_PREFIXES].find((prefix) => lower.startsWith(prefix));
      if (matchedPrefix) {
        const suffixDigits = lower.slice(matchedPrefix.length).replace(/\D/g, "");
        const minDigits = PROMO_MIN_DIGITS_BY_PREFIX[matchedPrefix] ?? Number.POSITIVE_INFINITY;
        if (suffixDigits.length >= minDigits) {
          promoTokens.push(token);
          const promoSetCode = PROMO_SET_CODE_MAP[matchedPrefix];
          if (promoSetCode) {
            expectedSetCodes.push(promoSetCode);
            appliedRules.add(`promo_family:${matchedPrefix}->${promoSetCode}`);
          }
        }
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
    expectedSetCodes: uniqueValues(expectedSetCodes),
    appliedRules: [...appliedRules],
  };
}

export function normalizeQuery(rawQuery: string): NormalizedQueryPacket {
  const specialPhraseArtifacts = applySpecialPhraseNormalizations(rawQuery);
  const normalizedQuery = specialPhraseArtifacts.normalizedQuery;
  const normalizedResolverInput = normalizeResolverInput(normalizedQuery);
  const normalizedTokens = tokenizeNormalizedQuery(normalizedQuery);
  const nicknameArtifacts = expandResolverNicknameTokens(normalizedTokens);
  const baseSegments = tokenizeQuerySegments(normalizedQuery);
  const compactTokens = buildCompactTokens(normalizedTokens, baseSegments);
  const setExpectations = detectSetExpectations(normalizedQuery);
  const coverageFamilyHints = detectCoverageFamilyHints(normalizedQuery, normalizedTokens);
  const variantArtifacts = detectVariantTokens(normalizedQuery, normalizedTokens);
  const collectorArtifacts = buildCollectorArtifacts(compactTokens);
  const normalizedGvId = normalizeGvIdInput(normalizedResolverInput);
  const expectedSetCodes = uniqueValues([
    ...setExpectations.expectedCodes,
    ...coverageFamilyHints.expectedSetCodes,
    ...collectorArtifacts.expectedSetCodes,
  ]);

  return {
    rawQuery,
    normalizedQuery,
    normalizedResolverInput,
    normalizedTokens,
    expandedSearchTokens: nicknameArtifacts.expandedTokens,
    compactTokens,
    numberTokens: collectorArtifacts.numberTokens,
    numberDigitTokens: collectorArtifacts.numberDigitTokens,
    fractionTokens: collectorArtifacts.fractionTokens,
    promoTokens: collectorArtifacts.promoTokens,
    possibleSetTokens: uniqueValues([
      ...setExpectations.possibleSetTokens,
      ...coverageFamilyHints.possibleSetTokens,
    ]),
    expectedSetCodes,
    setConsumedTokens: uniqueValues([
      ...setExpectations.consumedTokens,
      ...coverageFamilyHints.consumedTokens,
    ]),
    variantTokens: variantArtifacts.variantTokens,
    variantConsumedTokens: variantArtifacts.consumedTokens,
    normalizedGvId,
    collectorExpectations: collectorArtifacts.collectorExpectations,
    hasStrongDisambiguator:
      collectorArtifacts.collectorExpectations.length > 0 ||
      expectedSetCodes.length > 0 ||
      setExpectations.consumedTokens.length > 0 ||
      coverageFamilyHints.consumedTokens.length > 0 ||
      variantArtifacts.variantTokens.length > 0,
    coverageSignals: {
      setRules: setExpectations.appliedRules,
      promoRules: collectorArtifacts.appliedRules,
      variantRules: variantArtifacts.appliedRules,
      specialRules: specialPhraseArtifacts.appliedRules,
      shorthandRules: uniqueValues([
        ...coverageFamilyHints.shorthandRules,
        ...nicknameArtifacts.appliedRules,
      ]),
      familyRules: coverageFamilyHints.familyRules,
    },
  };
}
