// RESOLVER_CONTRACT_V2 ENFORCED
// Any changes must comply with deterministic pipeline + ambiguity preservation.

"use server";

import type { IdentityFilterKey } from "@/lib/cards/identitySearch";
import { getExploreRowsPacketWithTiming } from "@/lib/explore/getExploreRows";
import { normalizeQuery } from "@/lib/resolver/normalizeQuery";
import { resolvePublicSearchPacketWithTiming } from "@/lib/publicSearchResolver";

type DirectResolverResult = Awaited<
  ReturnType<typeof resolvePublicSearchPacketWithTiming>
>["result"];
type RankedResolverResult = Awaited<
  ReturnType<typeof getExploreRowsPacketWithTiming>
>["rows"];
type RankedResolverTiming = Awaited<
  ReturnType<typeof getExploreRowsPacketWithTiming>
>["timing"];
type DirectResolverMatchedStage = Awaited<
  ReturnType<typeof resolvePublicSearchPacketWithTiming>
>["matchedStage"];

type DirectResolveOptions = {
  mode: "direct";
};

type RankedResolveOptions = {
  mode: "ranked";
  sortMode: "relevance" | "newest" | "oldest";
  exactSetCode: string;
  exactReleaseYear?: number;
  exactIllustrator?: string;
  identityFilter: IdentityFilterKey;
};

export type ResolverState =
  | "DIRECT_MATCH"
  | "AMBIGUOUS_MATCH"
  | "WEAK_MATCH"
  | "NO_MATCH";

export type ResolverMeta = {
  resolverState: ResolverState;
  topScore: number | null;
  candidateCount: number;
  autoResolved: boolean;
  intentSummary: {
    expectedSetCodes: string[];
    nameTokens: string[];
  };
  structuredEvidenceFlags: {
    text: boolean;
    textRequired: boolean;
    expectedSet: boolean;
    number: boolean;
    fraction: boolean;
    promo: boolean;
    variants: string[];
  } | null;
};

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildIntentSummary(packet: ReturnType<typeof normalizeQuery>) {
  const consumedTokens = new Set([
    ...packet.setConsumedTokens,
    ...packet.rarityConsumedTokens,
    ...packet.traitConsumedTokens,
    ...packet.variantConsumedTokens,
    ...packet.numberDigitTokens,
    ...packet.numberTokens.map((token) => token.toLowerCase()),
    ...packet.promoTokens.map((token) => token.toLowerCase()),
  ]);

  return {
    expectedSetCodes: packet.expectedSetCodes,
    nameTokens: uniqueValues(
      packet.expandedNameTokens.filter((token) => !consumedTokens.has(token)),
    ),
  };
}

function logResolverTrace(payload: {
  rawQuery: string;
  normalizedQuery: string;
  normalizedTokens: string[];
  numberTokens: string[];
  fractionTokens: string[];
  promoTokens: string[];
  possibleSetTokens: string[];
  rarityIntent: string[];
  traitIntent: string[];
  variantTokens: string[];
  coverageSignals: {
    setRules: string[];
    promoRules: string[];
    variantRules: string[];
    rarityRules: string[];
    specialRules: string[];
    shorthandRules: string[];
    familyRules: string[];
    traitRules: string[];
  };
  resolverPathUsed: "direct" | "ranked";
  candidateCount: number;
  executionMs: number;
  requestCount?: number;
  resultKind?: string;
  resolverState: ResolverState;
  autoResolved: boolean;
  topScore?: number | null;
  topMatch?: {
    gvId: string;
    score: number;
    secondScore: number | null;
    scoreGapToSecond: number | null;
    components: Record<string, number>;
    evidence: {
      text: boolean;
      textRequired: boolean;
      expectedSet: boolean;
      number: boolean;
      fraction: boolean;
      promo: boolean;
      rarity: boolean;
      traits: string[];
      variants: string[];
    };
  };
}) {
  console.info("[resolver]", payload);
}

function hasStructuredEvidence(
  topMatch: RankedResolverTiming["top_match"],
): topMatch is NonNullable<RankedResolverTiming["top_match"]> {
  if (!topMatch) {
    return false;
  }

  return (
    (!topMatch.evidence.text_required || topMatch.evidence.text) &&
    (topMatch.evidence.expected_set ||
      topMatch.evidence.number ||
      topMatch.evidence.fraction ||
      topMatch.evidence.promo ||
      topMatch.evidence.variants.length > 0)
  );
}

function classifyRankedResolverState(
  candidateCount: number,
  topMatch: RankedResolverTiming["top_match"],
): ResolverState {
  if (candidateCount === 0 || !topMatch) {
    return "NO_MATCH";
  }

  const scoreGap = topMatch.score_gap_to_second ?? Number.POSITIVE_INFINITY;
  const structured = hasStructuredEvidence(topMatch);

  if (topMatch.score >= 2200 && structured && scoreGap >= 400) {
    return "DIRECT_MATCH";
  }

  if (topMatch.score >= 2800 && scoreGap >= 600) {
    return "DIRECT_MATCH";
  }

  if (
    (candidateCount > 1 && topMatch.score >= 2200 && scoreGap < 400) ||
    (candidateCount > 1 && topMatch.score >= 1800 && !structured)
  ) {
    return "AMBIGUOUS_MATCH";
  }

  return "WEAK_MATCH";
}

function buildRankedResolverMeta(
  rows: RankedResolverResult,
  timing: RankedResolverTiming,
  packet: ReturnType<typeof normalizeQuery>,
): ResolverMeta {
  return {
    resolverState: classifyRankedResolverState(rows.length, timing.top_match),
    topScore: timing.top_match?.score ?? null,
    candidateCount: rows.length,
    autoResolved: false,
    intentSummary: buildIntentSummary(packet),
    structuredEvidenceFlags: timing.top_match
      ? {
          text: timing.top_match.evidence.text,
          textRequired: timing.top_match.evidence.text_required,
          expectedSet: timing.top_match.evidence.expected_set,
          number: timing.top_match.evidence.number,
          fraction: timing.top_match.evidence.fraction,
          promo: timing.top_match.evidence.promo,
          variants: timing.top_match.evidence.variants,
        }
      : null,
  };
}

function buildDirectResolverMeta(
  result: DirectResolverResult,
  rawQuery: string,
  matchedStage: DirectResolverMatchedStage,
  packet: ReturnType<typeof normalizeQuery>,
): ResolverMeta {
  // Decorated name-family recall is ranked-only. Direct resolution remains exact/structured.
  const hasQuery = rawQuery.trim().length > 0;
  const exactNameOnlyMatch = matchedStage === "exact_name";

  if (result.kind === "card" || result.kind === "set") {
    return {
      resolverState: exactNameOnlyMatch ? "AMBIGUOUS_MATCH" : "DIRECT_MATCH",
      topScore: null,
      candidateCount: 1,
      autoResolved: !exactNameOnlyMatch,
      intentSummary: buildIntentSummary(packet),
      structuredEvidenceFlags: null,
    };
  }

  if (result.kind === "sets") {
    return {
      resolverState: "AMBIGUOUS_MATCH",
      topScore: null,
      candidateCount: 0,
      autoResolved: false,
      intentSummary: buildIntentSummary(packet),
      structuredEvidenceFlags: null,
    };
  }

  return {
    resolverState: hasQuery ? "WEAK_MATCH" : "NO_MATCH",
    topScore: null,
    candidateCount: 0,
    autoResolved: false,
    intentSummary: buildIntentSummary(packet),
    structuredEvidenceFlags: null,
  };
}

export async function resolveQueryWithMeta(
  rawQuery: string,
  options: DirectResolveOptions,
): Promise<{ result: DirectResolverResult; meta: ResolverMeta }>;
export async function resolveQueryWithMeta(
  rawQuery: string,
  options: RankedResolveOptions,
): Promise<{ rows: RankedResolverResult; meta: ResolverMeta }>;
export async function resolveQueryWithMeta(
  rawQuery: string,
  options: DirectResolveOptions | RankedResolveOptions,
) {
  const packet = normalizeQuery(rawQuery);

  if (options.mode === "direct") {
    const resolved = await resolvePublicSearchPacketWithTiming(packet);
    const result = resolved.result;
    const meta = buildDirectResolverMeta(
      result,
      rawQuery,
      resolved.matchedStage,
      packet,
    );
    const candidateCount = meta.candidateCount;

    logResolverTrace({
      rawQuery,
      normalizedQuery: packet.normalizedQuery,
      normalizedTokens: packet.normalizedTokens,
      numberTokens: packet.numberTokens,
      fractionTokens: packet.fractionTokens,
      promoTokens: packet.promoTokens,
      possibleSetTokens: packet.possibleSetTokens,
      rarityIntent: packet.rarityIntent,
      traitIntent: packet.traitIntent,
      variantTokens: packet.variantTokens,
      coverageSignals: packet.coverageSignals,
      resolverPathUsed: "direct",
      candidateCount,
      executionMs: resolved.timing.total_ms,
      requestCount: resolved.timing.request_count,
      resultKind: result.kind,
      resolverState: meta.resolverState,
      autoResolved: meta.autoResolved,
      topScore: meta.topScore,
    });

    return { result, meta };
  }

  const resolved = await getExploreRowsPacketWithTiming(
    packet,
    options.sortMode,
    options.exactSetCode,
    options.exactReleaseYear,
    options.exactIllustrator,
    options.identityFilter,
  );
  const meta = buildRankedResolverMeta(resolved.rows, resolved.timing, packet);

  logResolverTrace({
    rawQuery,
    normalizedQuery: packet.normalizedQuery,
    normalizedTokens: packet.normalizedTokens,
    numberTokens: packet.numberTokens,
    fractionTokens: packet.fractionTokens,
    promoTokens: packet.promoTokens,
    possibleSetTokens: packet.possibleSetTokens,
    rarityIntent: packet.rarityIntent,
    traitIntent: packet.traitIntent,
    variantTokens: packet.variantTokens,
    coverageSignals: packet.coverageSignals,
    resolverPathUsed: "ranked",
    candidateCount: resolved.rows.length,
    executionMs: resolved.timing.total_ms,
    requestCount: resolved.timing.request_count,
    resolverState: meta.resolverState,
    autoResolved: false,
    topScore: meta.topScore,
    topMatch: resolved.timing.top_match
      ? {
          gvId: resolved.timing.top_match.gv_id,
          score: resolved.timing.top_match.score,
          secondScore: resolved.timing.top_match.second_score,
          scoreGapToSecond: resolved.timing.top_match.score_gap_to_second,
          components: resolved.timing.top_match.components,
          evidence: {
            text: resolved.timing.top_match.evidence.text,
            textRequired: resolved.timing.top_match.evidence.text_required,
            expectedSet: resolved.timing.top_match.evidence.expected_set,
            number: resolved.timing.top_match.evidence.number,
            fraction: resolved.timing.top_match.evidence.fraction,
            promo: resolved.timing.top_match.evidence.promo,
            rarity: resolved.timing.top_match.evidence.rarity,
            traits: resolved.timing.top_match.evidence.traits,
            variants: resolved.timing.top_match.evidence.variants,
          },
        }
      : undefined,
  });

  return { rows: resolved.rows, meta };
}

export async function resolveQuery(
  rawQuery: string,
  options: DirectResolveOptions,
): Promise<DirectResolverResult>;
export async function resolveQuery(
  rawQuery: string,
  options: RankedResolveOptions,
): Promise<RankedResolverResult>;
export async function resolveQuery(
  rawQuery: string,
  options: DirectResolveOptions | RankedResolveOptions,
) {
  if (options.mode === "direct") {
    return (await resolveQueryWithMeta(rawQuery, options)).result;
  }

  return (await resolveQueryWithMeta(rawQuery, options)).rows;
}
