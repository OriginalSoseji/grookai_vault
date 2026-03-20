"use server";

import { getExploreRowsPacketWithTiming } from "@/lib/explore/getExploreRows";
import { normalizeQuery } from "@/lib/resolver/normalizeQuery";
import { resolvePublicSearchPacketWithTiming } from "@/lib/publicSearchResolver";

type DirectResolverResult = Awaited<ReturnType<typeof resolvePublicSearchPacketWithTiming>>["result"];
type RankedResolverResult = Awaited<ReturnType<typeof getExploreRowsPacketWithTiming>>["rows"];

type DirectResolveOptions = {
  mode: "direct";
};

type RankedResolveOptions = {
  mode: "ranked";
  sortMode: "relevance" | "newest" | "oldest";
  exactSetCode: string;
  exactReleaseYear?: number;
  exactIllustrator?: string;
};

function logResolverTrace(payload: {
  rawQuery: string;
  normalizedQuery: string;
  normalizedTokens: string[];
  numberTokens: string[];
  fractionTokens: string[];
  promoTokens: string[];
  possibleSetTokens: string[];
  variantTokens: string[];
  resolverPathUsed: "direct" | "ranked";
  candidateCount: number;
  executionMs: number;
  requestCount?: number;
  resultKind?: string;
}) {
  console.info("[resolver]", payload);
}

export async function resolveQuery(rawQuery: string, options: DirectResolveOptions): Promise<DirectResolverResult>;
export async function resolveQuery(rawQuery: string, options: RankedResolveOptions): Promise<RankedResolverResult>;
export async function resolveQuery(rawQuery: string, options: DirectResolveOptions | RankedResolveOptions) {
  const packet = normalizeQuery(rawQuery);

  if (options.mode === "direct") {
    const resolved = await resolvePublicSearchPacketWithTiming(packet);
    const result = resolved.result;
    const candidateCount = result.kind === "card" || result.kind === "set" ? 1 : 0;

    logResolverTrace({
      rawQuery,
      normalizedQuery: packet.normalizedQuery,
      normalizedTokens: packet.normalizedTokens,
      numberTokens: packet.numberTokens,
      fractionTokens: packet.fractionTokens,
      promoTokens: packet.promoTokens,
      possibleSetTokens: packet.possibleSetTokens,
      variantTokens: packet.variantTokens,
      resolverPathUsed: "direct",
      candidateCount,
      executionMs: resolved.timing.total_ms,
      requestCount: resolved.timing.request_count,
      resultKind: result.kind,
    });

    return result;
  }

  const resolved = await getExploreRowsPacketWithTiming(
    packet,
    options.sortMode,
    options.exactSetCode,
    options.exactReleaseYear,
    options.exactIllustrator,
  );

  logResolverTrace({
    rawQuery,
    normalizedQuery: packet.normalizedQuery,
    normalizedTokens: packet.normalizedTokens,
    numberTokens: packet.numberTokens,
    fractionTokens: packet.fractionTokens,
    promoTokens: packet.promoTokens,
    possibleSetTokens: packet.possibleSetTokens,
    variantTokens: packet.variantTokens,
    resolverPathUsed: "ranked",
    candidateCount: resolved.rows.length,
    executionMs: resolved.timing.total_ms,
    requestCount: resolved.timing.request_count,
  });

  return resolved.rows;
}
