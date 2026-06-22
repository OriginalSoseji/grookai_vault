"use server";

import {
  buildIdentitySearchText,
  getVariantKeyForFilter,
  isIdentityFilterActive,
  matchesIdentityFilter,
  normalizeIdentityFilterKey,
  type IdentityFilterKey,
} from "@/lib/cards/identitySearch";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import {
  getPublicPricingByCardIds,
  type PublicPricingRecord,
} from "@/lib/pricing/getPublicPricingByCardIds";
import { getChildDisplayImageFallbacks } from "@/lib/cards/childDisplayImageFallbacks";
import {
  STRUCTURED_CARD_SET_ALIAS_MAP,
  normalizeSetQuery,
  tokenizeSetWords,
} from "@/lib/publicSets.shared";
import {
  normalizeQuery,
  type NormalizedQueryPacket,
} from "@/lib/resolver/normalizeQuery";
import {
  getPrimaryFamilyTokensFromTokens,
  queryContainsNameDecoratorTokens,
  rowMatchesNameFamily,
} from "@/lib/resolver/nameFamily";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getCardPrintingFinishLabel } from "@/lib/cards/displayDiscriminator";
import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";
import type { VariantFlags } from "@/lib/cards/variantPresentation";

const SEARCH_LIMIT = 80;
const TOKEN_SEARCH_LIMIT = 40;
const SET_CARD_SEARCH_LIMIT = 30;
const SMART_FILTER_DISCOVERY_LIMIT = 500;
const MAX_SIGNIFICANT_TEXT_TOKENS = 4;
const MAX_SET_CANDIDATES = 6;
const GENERIC_TOKENS = new Set([
  "set",
  "card",
  "pokemon",
  "pokmon",
  "the",
  "and",
]);
const VARIANT_QUERY_CUE_TOKENS = new Set([
  "alt",
  "alternate",
  "art",
  "rainbow",
  "promo",
  "holo",
  "reverse",
  "full",
  "masterball",
  "pokeball",
]);
const PROMO_SET_CODE_PATTERN =
  /^(?:swshp|svp|smp|basep|bwp|xyp|dpp|pr-[a-z0-9]+)$/i;
const EXACT_NAME_MATCH_WITH_DISAMBIGUATOR_BONUS = 900;
const EXACT_NAME_MATCH_BASE_BONUS = 2200;
const EXACT_COMBINED_MATCH_WITH_DISAMBIGUATOR_BONUS = 760;
const EXACT_COMBINED_MATCH_BASE_BONUS = 1900;
const PREFIX_NAME_MATCH_WITH_DISAMBIGUATOR_BONUS = 520;
const PREFIX_NAME_MATCH_BASE_BONUS = 1500;
const EXPECTED_SET_CODE_MATCH_BONUS = 1040;
const EXPECTED_SET_CODE_MISS_PENALTY = -420;
const ALL_SET_TOKENS_MATCH_BONUS = 320;
const NO_SET_TOKEN_MATCH_PENALTY = -220;
const EXACT_NUMBER_MATCH_BONUS = 1850;
const DIGIT_NUMBER_MATCH_BONUS = 1250;
const PARTIAL_NUMBER_MATCH_BONUS = 760;
const NUMBER_MISS_PENALTY = -680;
const EXACT_FRACTION_MATCH_BONUS = 980;
const FRACTION_MISS_PENALTY = -560;
const PROMO_TOKEN_MATCH_BONUS = 760;
const PROMO_TOKEN_MISS_PENALTY = -360;
const STRUCTURED_QUERY_WITHOUT_STRUCTURED_MATCH_PENALTY = -260;
const VARIANT_MISS_PENALTY = -320;
const RARITY_INTENT_MATCH_BONUS = 140;
const RARITY_INTENT_PARTIAL_BONUS = 70;
const RARITY_INTENT_MISS_PENALTY = -90;
const TRAIT_INTENT_MATCH_BONUS = 110;
const TRAIT_INTENT_PARTIAL_BONUS = 60;
const TRAIT_INTENT_MISS_PENALTY = -80;
const NAME_FAMILY_MATCH_BONUS = 140;
const CLEAN_SINGLE_NAME_MATCH_BONUS = 360;
const DECORATED_NAME_FALLBACK_PENALTY = -220;
const NO_TEXT_TOKEN_MATCH_PENALTY = -1600;
const FAMILY_DIVERSITY_PROMOTION_LIMIT = 4;

type VariantCue =
  | "alt_art"
  | "rainbow"
  | "gold"
  | "promo"
  | "full_art"
  | "holo"
  | "masterball"
  | "pokeball"
  | "reverse";

type CollectorNumberExpectation = {
  token: string;
  digits?: string;
  exact_only: boolean;
};

type ExploreRow = ExploreResultCard & {
  printed_total?: number;
};

type SearchRpcRow = {
  id: string;
};

type PrintIdentitySearchRpcRow = {
  search_document_id: string | null;
  object_type: "parent_print" | "child_printing" | string | null;
  parent_gv_id: string | null;
  printing_gv_id: string | null;
  display_discriminator: string | null;
  route_query: string | null;
  matched_fields: string[] | null;
  rank_score: number | null;
};

type DirectChildPrintingLookupRow = {
  printing_gv_id: string | null;
  finish_key: string | null;
  card_prints:
    | {
        gv_id: string | null;
        name: string | null;
      }
    | Array<{
        gv_id: string | null;
        name: string | null;
      }>
    | null;
};

type CardPrintingImageLookupRow = {
  id: string;
  card_print_id: string | null;
  printing_gv_id: string | null;
  finish_key: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source?: string | null;
  image_path?: string | null;
  image_status?: string | null;
  image_note?: string | null;
};

type CardPrintingSmartLookupRow = CardPrintingImageLookupRow & {
  card_prints: CardPrintLookupRow | CardPrintLookupRow[] | null;
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
  image_source?: string | null;
  image_path?: string | null;
  representative_image_url?: string | null;
  image_status?: string | null;
  image_note?: string | null;
  set_code?: string | null;
  printed_set_abbrev?: string | null;
  external_ids?: { tcgdex?: string | null } | null;
  variant_key?: string | null;
  printed_identity_modifier?: string | null;
  variants?: VariantFlags;
  search_object_type?: "parent_print" | "child_printing";
  search_document_id?: string | null;
  search_card_printing_id?: string | null;
  printing_gv_id?: string | null;
  selected_printing_gv_id?: string | null;
  finish_key?: string | null;
  finish_label?: string | null;
  display_discriminator?: string | null;
  route_query?: string | null;
  search_rank_score?: number | null;
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
  printed_total: number | null;
  release_date: string | null;
  identity_model: string | null;
};

type SortMode =
  | "relevance"
  | "newest"
  | "oldest"
  | "set_order"
  | "number"
  | "value_high"
  | "value_low";

type SmartFilterImageState = "exact" | "representative" | "missing" | "any";

type SmartFilterDiscoveryOptions = {
  sortMode: SortMode;
  textQuery?: string;
  exactSetCode?: string;
  exactReleaseYear?: number;
  exactIllustrator?: string;
  identityFilter?: IdentityFilterKey;
  releaseYearMin?: number;
  releaseYearMax?: number;
  finishKeys?: string[];
  stampLabels?: string[];
  imageState?: SmartFilterImageState;
};

type PublicSetMetadata = {
  set_code: string;
  set_name?: string;
  printed_total?: number;
  release_date?: string;
  release_year?: number;
  identity_model?: string;
};

type IntentLookupRow = {
  name?: string | null;
  number?: string | null;
  rarity?: string | null;
  variant_key?: string | null;
  printed_identity_modifier?: string | null;
  variants?: VariantFlags;
  set_code?: string | null;
  set_name?: string | null;
  finish_key?: string | null;
  finish_label?: string | null;
  display_discriminator?: string | null;
  printing_gv_id?: string | null;
};

type ResolverQuery = {
  raw: string;
  normalized: string;
  tokens: string[];
  textTokens: string[];
  significantTextTokens: string[];
  numberTokens: string[];
  numberDigitTokens: string[];
  fractionTokens: string[];
  promoTokens: string[];
  setTokens: string[];
  expectedSetCodes: string[];
  rarityIntent: string[];
  traitIntent: string[];
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
  top_match: {
    gv_id: string;
    score: number;
    second_score: number | null;
    score_gap_to_second: number | null;
    components: Record<string, number>;
    evidence: {
      text: boolean;
      text_required: boolean;
      expected_set: boolean;
      number: boolean;
      fraction: boolean;
      promo: boolean;
      rarity: boolean;
      traits: string[];
      variants: VariantCue[];
    };
  } | null;
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
    (
      globalThis as typeof globalThis & {
        __grookaiResolverTiming?: ResolverTimingCollector;
      }
    ).__grookaiResolverTiming ?? null
  );
}

function snapshotRemoteTiming(): RemoteTimingSnapshot {
  return getTimingCollector()?.snapshot() ?? emptyRemoteTiming();
}

function diffRemoteTiming(
  start: RemoteTimingSnapshot,
  end: RemoteTimingSnapshot,
): RemoteTimingSnapshot {
  return {
    remote_ms: roundTiming(Math.max(0, end.remote_ms - start.remote_ms)),
    db_ms: roundTiming(Math.max(0, end.db_ms - start.db_ms)),
    network_ms: roundTiming(Math.max(0, end.network_ms - start.network_ms)),
    request_count: Math.max(0, end.request_count - start.request_count),
  };
}

function finalizeStageTiming(
  startMs: number,
  startRemote: RemoteTimingSnapshot,
): ExploreStageTiming {
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

async function measureStage<T>(
  operation: () => Promise<T> | T,
): Promise<{ value: T; timing: ExploreStageTiming }> {
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

function hasCandidateForGvId(
  candidates: Iterable<CardPrintLookupRow>,
  gvId?: string | null,
) {
  if (!gvId) {
    return false;
  }
  for (const candidate of candidates) {
    if (candidate.gv_id === gvId) {
      return true;
    }
  }
  return false;
}

function suppressParentOnlyRowsWhenChildMatchExists(
  rows: CardPrintLookupRow[],
) {
  const gvIdsWithChildMatches = new Set(
    rows
      .filter(
        (row) =>
          row.search_object_type === "child_printing" &&
          Boolean(row.selected_printing_gv_id || row.printing_gv_id),
      )
      .map((row) => row.gv_id)
      .filter((value): value is string => Boolean(value)),
  );

  if (gvIdsWithChildMatches.size === 0) {
    return rows;
  }

  return rows.filter(
    (row) =>
      !row.gv_id ||
      !gvIdsWithChildMatches.has(row.gv_id) ||
      row.search_object_type === "child_printing",
  );
}

function getReleaseYear(releaseDate?: string | null) {
  if (!releaseDate) return undefined;
  const match = releaseDate.match(/^(\d{4})/);
  if (!match) return undefined;
  const parsedYear = Number(match[1]);
  return Number.isFinite(parsedYear) ? parsedYear : undefined;
}

function normalizeTextForMatch(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeCollectorToken(value?: string | null) {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, "");
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

function mapVariantTokensToCues(
  variantTokens: NormalizedQueryPacket["variantTokens"],
): VariantCue[] {
  const cues = new Set<VariantCue>();

  for (const token of variantTokens) {
    if (token === "alt art") {
      cues.add("alt_art");
    } else if (token === "full art") {
      cues.add("full_art");
    } else if (token === "promo") {
      cues.add("promo");
    } else if (token === "holo") {
      cues.add("holo");
    } else if (token === "masterball") {
      cues.add("masterball");
    } else if (token === "pokeball") {
      cues.add("pokeball");
    } else if (token === "rainbow") {
      cues.add("rainbow");
    } else if (token === "gold") {
      cues.add("gold");
    } else if (token === "reverse") {
      cues.add("reverse");
    }
  }

  return [...cues];
}

function buildEffectiveExpectedSetCodes(
  expectedSetCodes: string[],
  promoTokens: string[],
  variantCues: VariantCue[],
  traitIntent: string[],
) {
  const normalizedExpectedSetCodes =
    normalizeExpectedSetCodes(expectedSetCodes);
  const hasPromoIntent =
    promoTokens.length > 0 ||
    variantCues.includes("promo") ||
    traitIntent.includes("promo");

  if (!hasPromoIntent) {
    return normalizedExpectedSetCodes;
  }

  const promoScopedSetCodes = normalizedExpectedSetCodes.filter((code) =>
    PROMO_SET_CODE_PATTERN.test(code),
  );
  return promoScopedSetCodes.length > 0
    ? promoScopedSetCodes
    : normalizedExpectedSetCodes;
}

function buildResolverQuery(packet: NormalizedQueryPacket): ResolverQuery {
  const normalized = packet.normalizedQuery;
  const collectorExpectations = packet.collectorExpectations.map(
    (expectation) => ({
      token: expectation.token,
      digits: expectation.digits,
      exact_only: expectation.exactOnly,
    }),
  );
  const variantCues = mapVariantTokensToCues(packet.variantTokens);
  const expectedSetCodes = buildEffectiveExpectedSetCodes(
    packet.expectedSetCodes,
    packet.promoTokens,
    variantCues,
    packet.traitIntent,
  );
  const tokens = packet.expandedSearchTokens;
  const consumedTokenSet = new Set([
    ...packet.setConsumedTokens,
    ...packet.rarityConsumedTokens,
    ...packet.traitConsumedTokens,
    ...packet.variantConsumedTokens,
  ]);
  const textTokens = uniqueValues(
    tokens.filter(
      (token) =>
        !collectorExpectations.some(
          (expectation) => normalizeTextForMatch(expectation.token) === token,
        ) &&
        !VARIANT_QUERY_CUE_TOKENS.has(token) &&
        !consumedTokenSet.has(token),
    ),
  );
  const significantTextTokens = [...textTokens]
    .filter((token) => token.length >= 3 && !GENERIC_TOKENS.has(token))
    .sort((a, b) => b.length - a.length)
    .slice(0, MAX_SIGNIFICANT_TEXT_TOKENS);

  return {
    raw: packet.rawQuery,
    normalized,
    tokens,
    textTokens,
    significantTextTokens,
    numberTokens: collectorExpectations.map((expectation) => expectation.token),
    numberDigitTokens: packet.numberDigitTokens,
    fractionTokens: packet.fractionTokens,
    promoTokens: packet.promoTokens,
    setTokens: packet.setConsumedTokens,
    expectedSetCodes,
    rarityIntent: packet.rarityIntent,
    traitIntent: packet.traitIntent,
    variantCues,
    hasStrongDisambiguator: packet.hasStrongDisambiguator,
    directGvId: packet.normalizedGvId,
  };
}

function normalizeSearchObjectType(value?: string | null): "parent_print" | "child_printing" | undefined {
  return value === "parent_print" || value === "child_printing" ? value : undefined;
}

function applyPrintIdentityContext(
  row: CardPrintLookupRow,
  doc?: PrintIdentitySearchRpcRow,
): CardPrintLookupRow {
  if (!doc) {
    return row;
  }

  const searchObjectType = normalizeSearchObjectType(doc.object_type);
  const displayDiscriminator = doc.display_discriminator?.trim() || null;

  return {
    ...row,
    search_object_type: searchObjectType,
    search_document_id: doc.search_document_id,
    search_card_printing_id: doc.printing_gv_id,
    printing_gv_id: doc.printing_gv_id,
    selected_printing_gv_id: doc.printing_gv_id,
    finish_label: displayDiscriminator,
    display_discriminator: displayDiscriminator,
    route_query: doc.route_query,
    search_rank_score: doc.rank_score,
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
  const querySetTokens =
    query.setTokens.length > 0 ? query.setTokens : query.significantTextTokens;

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

async function buildExploreRows(
  lookupRows: CardPrintLookupRow[],
  setNameById: Map<string, string>,
  setMetadataByCode: Map<string, PublicSetMetadata>,
  pricingByCardId: Map<string, PublicPricingRecord>,
) {
  const rows = lookupRows.filter(
    (row): row is CardPrintLookupRow & { gv_id: string } => Boolean(row.gv_id),
  );
  const childDisplayImageFallbacks = await getChildDisplayImageFallbacks(
    createServerComponentClient(),
    rows,
  );

  return Promise.all(
    rows.map(async (row) => {
      const tcgdexCardId = extractTcgdexCardId(row.external_ids);
      const tcgdexSetId = extractTcgdexSetId(tcgdexCardId);
      const setMetadata = row.set_code
        ? setMetadataByCode.get(row.set_code)
        : undefined;
      const imageFields = await resolveCardImageFieldsV1(row);
      const childDisplayImageFallback = childDisplayImageFallbacks.get(row.id);
      const fallbackDisplayImage = !imageFields.display_image_url
        ? childDisplayImageFallback
        : undefined;
      const displayImageUrl = imageFields.display_image_url ?? fallbackDisplayImage?.display_image_url;

      return {
        id: row.id,
        gv_id: row.gv_id,
        name: row.name ?? "Unknown",
        number: row.number ?? "",
        set_name:
          setMetadata?.set_name ??
          (tcgdexSetId ? setNameById.get(tcgdexSetId) : undefined),
        printed_total: setMetadata?.printed_total,
        rarity: row.rarity ?? undefined,
        artist: row.artist ?? undefined,
        image_url: imageFields.image_url ?? undefined,
        representative_image_url: imageFields.representative_image_url ?? undefined,
        image_source: imageFields.image_source ?? undefined,
        display_image_url: displayImageUrl ?? undefined,
        display_image_fallback_url: childDisplayImageFallback?.display_image_url ?? undefined,
        display_image_kind: fallbackDisplayImage
          ? fallbackDisplayImage.display_image_kind
          : imageFields.display_image_kind,
        image_status: fallbackDisplayImage
          ? fallbackDisplayImage.image_status
          : imageFields.image_status ?? undefined,
        image_note: fallbackDisplayImage
          ? fallbackDisplayImage.image_note
          : imageFields.image_note ?? undefined,
        release_date: setMetadata?.release_date,
        release_year: setMetadata?.release_year,
        set_code: row.set_code ?? undefined,
        set_identity_model: setMetadata?.identity_model,
        printed_set_abbrev: row.printed_set_abbrev ?? undefined,
        tcgdex_set_id: tcgdexSetId,
        raw_price: pricingByCardId.get(row.id)?.raw_price ?? undefined,
        raw_price_source:
          pricingByCardId.get(row.id)?.raw_price_source ?? undefined,
        raw_price_ts: pricingByCardId.get(row.id)?.raw_price_ts ?? undefined,
        latest_price: pricingByCardId.get(row.id)?.latest_price ?? undefined,
        confidence: pricingByCardId.get(row.id)?.confidence ?? undefined,
        listing_count: pricingByCardId.get(row.id)?.listing_count ?? undefined,
        price_source: pricingByCardId.get(row.id)?.price_source ?? undefined,
        updated_at: pricingByCardId.get(row.id)?.updated_at ?? undefined,
        active_price_updated_at:
          pricingByCardId.get(row.id)?.active_price_updated_at ?? undefined,
        last_snapshot_at:
          pricingByCardId.get(row.id)?.last_snapshot_at ?? undefined,
        variant_key: row.variant_key?.trim() || undefined,
        printed_identity_modifier:
          row.printed_identity_modifier?.trim() || undefined,
        variants: row.variants ?? undefined,
        search_object_type: row.search_object_type,
        search_card_printing_id: row.search_card_printing_id ?? undefined,
        printing_gv_id: row.printing_gv_id ?? undefined,
        selected_printing_gv_id: row.selected_printing_gv_id ?? undefined,
        finish_key: row.finish_key ?? undefined,
        finish_label: row.finish_label ?? undefined,
        display_discriminator: row.display_discriminator ?? undefined,
        route_query: row.route_query ?? undefined,
      };
    }),
  );
}

function getRowVariantCueSet(row: ExploreRow) {
  const combined = normalizeTextForMatch(
    [row.rarity, row.variant_key, row.finish_key, row.finish_label, row.display_discriminator]
      .filter(Boolean)
      .join(" "),
  );
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
    combined.includes("holo") ||
    combined.includes("master ball") ||
    combined.includes("poke ball") ||
    combined.includes("pokeball")
  ) {
    cues.add("holo");
  }

  if (combined.includes("master ball") || combined.includes("masterball")) {
    cues.add("masterball");
  }

  if (combined.includes("poke ball") || combined.includes("pokeball")) {
    cues.add("pokeball");
  }

  if (
    row.variants?.reverse ||
    row.variants?.reverseHolo ||
    combined.includes("reverse")
  ) {
    cues.add("reverse");
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

function getFractionMatchStrength(row: ExploreRow, query: ResolverQuery) {
  if (
    query.fractionTokens.length === 0 ||
    typeof row.printed_total !== "number"
  ) {
    return 0;
  }

  const normalizedNumber = normalizeCollectorToken(row.number);
  const normalizedPrintedTotal = normalizeDigits(String(row.printed_total));

  for (const fractionToken of query.fractionTokens) {
    const match = fractionToken.match(
      /^([A-Z]*\d+[A-Z]?)\/([A-Z]*\d+[A-Z]?)$/i,
    );
    if (!match) continue;

    const printedNumber = normalizeCollectorToken(match[1]);
    const printedTotalDigits = normalizeDigits(match[2]);
    if (
      normalizedNumber === printedNumber &&
      normalizedPrintedTotal === printedTotalDigits
    ) {
      return 1;
    }
  }

  return 0;
}

function isPromoFamilyRow(row: IntentLookupRow) {
  return (
    PROMO_SET_CODE_PATTERN.test(row.set_code ?? "") ||
    normalizeTextForMatch(row.set_name).includes("black star")
  );
}

function getPromoMatchStrength(row: IntentLookupRow, query: ResolverQuery) {
  if (query.promoTokens.length === 0) {
    return 0;
  }

  const normalizedNumber = normalizeCollectorToken(row.number);
  for (const promoToken of query.promoTokens) {
    if (normalizedNumber === normalizeCollectorToken(promoToken)) {
      return 1;
    }
  }

  if (isPromoFamilyRow(row)) {
    return 0.5;
  }

  return 0;
}

function phraseMatchesNormalizedText(text: string, phrase: string) {
  const normalizedPhrase = normalizeTextForMatch(phrase);
  if (!text || !normalizedPhrase) {
    return false;
  }

  return ` ${text} `.includes(` ${normalizedPhrase} `);
}

function buildRowTraitSearchText(row: IntentLookupRow) {
  return normalizeTextForMatch(
    [
      row.name,
      row.rarity,
      row.variant_key,
      row.printed_identity_modifier,
      row.set_name,
      "finish_label" in row ? row.finish_label : undefined,
      "display_discriminator" in row ? row.display_discriminator : undefined,
      buildIdentitySearchText(row),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function getRarityIntentMatchStrength(row: IntentLookupRow, intent: string) {
  const normalizedIntent = normalizeTextForMatch(intent);
  const normalizedRarity = normalizeTextForMatch(row.rarity);
  const rowTraitText = buildRowTraitSearchText(row);

  if (!normalizedIntent) {
    return 0;
  }

  if (normalizedIntent === "illustration rare") {
    return normalizedRarity === "illustration rare" ? 1 : 0;
  }

  if (normalizedIntent === "special illustration rare") {
    return normalizedRarity === "special illustration rare" ? 1 : 0;
  }

  if (normalizedIntent === "hyper rare") {
    return normalizedRarity === "hyper rare" ? 1 : 0;
  }

  if (phraseMatchesNormalizedText(rowTraitText, normalizedIntent)) {
    return 1;
  }

  return 0;
}

function getTraitIntentMatchStrength(row: IntentLookupRow, intent: string) {
  const normalizedIntent = normalizeTextForMatch(intent);
  const rowTraitText = buildRowTraitSearchText(row);
  const normalizedRarity = normalizeTextForMatch(row.rarity);

  if (!normalizedIntent) {
    return 0;
  }

  if (normalizedIntent === "promo") {
    return isPromoFamilyRow(row) ||
      phraseMatchesNormalizedText(rowTraitText, "promo")
      ? 1
      : 0;
  }

  if (normalizedIntent === "stamp") {
    if (row.variants?.stamped) {
      return 1;
    }

    return phraseMatchesNormalizedText(rowTraitText, "stamp") ||
      phraseMatchesNormalizedText(rowTraitText, "stamped")
      ? 1
      : 0;
  }

  if (normalizedIntent === "felt hat") {
    return phraseMatchesNormalizedText(rowTraitText, normalizedIntent) ? 1 : 0;
  }

  if (normalizedIntent === "baby shiny") {
    if (phraseMatchesNormalizedText(rowTraitText, normalizedIntent)) {
      return 1;
    }

    return normalizedRarity === "shiny rare" ||
      normalizedRarity === "shiny holo rare"
      ? 0.85
      : 0;
  }

  if (normalizedIntent === "shiny") {
    return phraseMatchesNormalizedText(rowTraitText, normalizedIntent) ? 1 : 0;
  }

  return phraseMatchesNormalizedText(rowTraitText, normalizedIntent) ? 1 : 0;
}

type RowScoreDetail = {
  score: number;
  components: Record<string, number>;
  evidence: {
    text: boolean;
    text_required: boolean;
    expected_set: boolean;
    number: boolean;
    fraction: boolean;
    promo: boolean;
    rarity: boolean;
    traits: string[];
    variants: VariantCue[];
  };
};

function addScoreComponent(
  components: Record<string, number>,
  key: string,
  value: number,
) {
  if (!value) return;
  components[key] = (components[key] ?? 0) + value;
}

// Resolver Quality Pass V1:
// Ranking must strongly respect explicit disambiguators already present in the user query
// (number tokens, set tokens, and variant cues) instead of over-dominating on name-only matches.
function scoreRowDetail(row: ExploreRow, query: ResolverQuery): RowScoreDetail {
  const normalizedName = normalizeTextForMatch(row.name);
  const normalizedSetName = normalizeTextForMatch(row.set_name);
  const normalizedCombined = [normalizedName, normalizedSetName]
    .filter(Boolean)
    .join(" ");
  const nameTokens = tokenizeNormalizedQuery(row.name);
  const identityTokens = tokenizeNormalizedQuery(buildIdentitySearchText(row));
  const finishTokens = tokenizeNormalizedQuery(
    [row.finish_key, row.finish_label, row.display_discriminator, row.printing_gv_id]
      .filter(Boolean)
      .join(" "),
  );
  const matchesNameFamily = rowMatchesNameFamily(row.name, query.textTokens);
  const setTokens = uniqueValues([
    ...tokenizeNormalizedQuery(row.set_name),
    ...tokenizeNormalizedQuery(row.set_code),
    ...tokenizeNormalizedQuery(row.printed_set_abbrev),
    ...tokenizeNormalizedQuery(row.tcgdex_set_id),
  ]);
  const gvTokens = uniqueValues(
    [row.gv_id, row.printing_gv_id].join(" ").toLowerCase().match(/[a-z0-9]+/g) ?? [],
  );
  const rowVariantCues = getRowVariantCueSet(row);
  const components: Record<string, number> = {};
  let matchedTextTokens = 0;
  let exactNameMatches = 0;
  let matchedSetTokens = 0;

  if (query.directGvId && row.gv_id.toUpperCase() === query.directGvId) {
    addScoreComponent(components, "direct_gv_id", 6000);
  }

  if (query.normalized && normalizedName === query.normalized.toLowerCase()) {
    addScoreComponent(
      components,
      "exact_name_match",
      query.hasStrongDisambiguator
        ? EXACT_NAME_MATCH_WITH_DISAMBIGUATOR_BONUS
        : EXACT_NAME_MATCH_BASE_BONUS,
    );
  } else if (
    query.normalized &&
    normalizedCombined === query.normalized.toLowerCase()
  ) {
    addScoreComponent(
      components,
      "exact_combined_match",
      query.hasStrongDisambiguator
        ? EXACT_COMBINED_MATCH_WITH_DISAMBIGUATOR_BONUS
        : EXACT_COMBINED_MATCH_BASE_BONUS,
    );
  } else if (
    query.normalized &&
    normalizedName.startsWith(query.normalized.toLowerCase())
  ) {
    addScoreComponent(
      components,
      "prefix_name_match",
      query.hasStrongDisambiguator
        ? PREFIX_NAME_MATCH_WITH_DISAMBIGUATOR_BONUS
        : PREFIX_NAME_MATCH_BASE_BONUS,
    );
  }

  for (const token of query.textTokens) {
    const nameSimilarity = bestTokenSimilarity(token, nameTokens);
    const identitySimilarity = bestTokenSimilarity(token, identityTokens);
    const setSimilarity = bestTokenSimilarity(token, setTokens);
    const gvSimilarity = bestTokenSimilarity(token, gvTokens);
    const bestSimilarity = Math.max(
      nameSimilarity,
      identitySimilarity,
      bestTokenSimilarity(token, finishTokens),
      setSimilarity,
      gvSimilarity,
    );
    const bestSource =
      nameSimilarity >= identitySimilarity && nameSimilarity >= setSimilarity
        ? "name"
        : identitySimilarity >= setSimilarity
          ? "identity"
          : "set";

    if (bestSimilarity >= 1) {
      addScoreComponent(
        components,
        bestSource === "name"
          ? "text_token_exact_name"
          : bestSource === "identity"
            ? "text_token_exact_identity"
            : "text_token_exact_set",
        bestSource === "name"
          ? query.hasStrongDisambiguator
            ? 240
            : 280
          : bestSource === "identity"
            ? 250
            : 260,
      );
      matchedTextTokens += 1;
      if (nameSimilarity >= 1) exactNameMatches += 1;
      continue;
    }

    if (bestSimilarity >= 0.96) {
      addScoreComponent(
        components,
        bestSource === "name"
          ? "text_token_prefix_name"
          : bestSource === "identity"
            ? "text_token_prefix_identity"
            : "text_token_prefix_set",
        bestSource === "name"
          ? query.hasStrongDisambiguator
            ? 180
            : 220
          : bestSource === "identity"
            ? 190
            : 210,
      );
      matchedTextTokens += 1;
      continue;
    }

    if (bestSimilarity >= 0.88) {
      addScoreComponent(
        components,
        bestSource === "name"
          ? "text_token_partial_name"
          : bestSource === "identity"
            ? "text_token_partial_identity"
            : "text_token_partial_set",
        bestSource === "name"
          ? query.hasStrongDisambiguator
            ? 120
            : 150
          : bestSource === "identity"
            ? 140
            : 150,
      );
      matchedTextTokens += 1;
      continue;
    }

    if (bestSimilarity >= 0.72) {
      addScoreComponent(components, "text_token_weak_overlap", 70);
    }
  }

  if (
    query.textTokens.length > 0 &&
    matchedTextTokens === query.textTokens.length
  ) {
    addScoreComponent(components, "all_text_tokens_matched", 360);
  }

  if (query.textTokens.length > 0 && matchedTextTokens === 0) {
    addScoreComponent(
      components,
      "text_tokens_missing",
      NO_TEXT_TOKEN_MATCH_PENALTY,
    );
  }

  if (query.textTokens.length > 0 && exactNameMatches > 0) {
    addScoreComponent(
      components,
      "exact_name_presence",
      query.hasStrongDisambiguator ? 80 : 140,
    );
  }

  if (
    query.textTokens.length > 0 &&
    matchesNameFamily &&
    normalizedName !== query.normalized.toLowerCase()
  ) {
    addScoreComponent(components, "name_family_match", NAME_FAMILY_MATCH_BONUS);
  }

  if (
    query.significantTextTokens.length === 1 &&
    normalizedName === query.significantTextTokens[0]
  ) {
    addScoreComponent(components, "clean_single_name_match", CLEAN_SINGLE_NAME_MATCH_BONUS);
  } else if (
    query.significantTextTokens.length === 1 &&
    matchesNameFamily &&
    !queryContainsNameDecoratorTokens(query.tokens) &&
    tokenizeNormalizedQuery(row.name).length > 1
  ) {
    addScoreComponent(components, "decorated_name_fallback", DECORATED_NAME_FALLBACK_PENALTY);
  }

  for (const setToken of query.setTokens) {
    const setSimilarity = bestTokenSimilarity(setToken, setTokens);
    if (setSimilarity >= 1) {
      addScoreComponent(components, "set_token_exact", 260);
      matchedSetTokens += 1;
      continue;
    }

    if (setSimilarity >= 0.96) {
      addScoreComponent(components, "set_token_prefix", 220);
      matchedSetTokens += 1;
      continue;
    }

    if (setSimilarity >= 0.88) {
      addScoreComponent(components, "set_token_partial", 150);
    }
  }

  const hasExpectedSetCode = query.expectedSetCodes.length > 0;
  const matchesExpectedSetCode =
    hasExpectedSetCode &&
    query.expectedSetCodes.includes(normalizeSetCode(row.set_code));
  if (matchesExpectedSetCode) {
    addScoreComponent(
      components,
      "expected_set_code_match",
      EXPECTED_SET_CODE_MATCH_BONUS,
    );
    addScoreComponent(components, "expected_set_code_visibility_boost", 0.25);
  } else if (hasExpectedSetCode) {
    addScoreComponent(
      components,
      "expected_set_code_miss",
      EXPECTED_SET_CODE_MISS_PENALTY,
    );
  }

  if (
    query.setTokens.length > 0 &&
    matchedSetTokens === query.setTokens.length
  ) {
    addScoreComponent(
      components,
      "all_set_tokens_matched",
      ALL_SET_TOKENS_MATCH_BONUS,
    );
  } else if (query.setTokens.length > 0 && matchedSetTokens === 0) {
    addScoreComponent(
      components,
      "set_tokens_missing",
      NO_SET_TOKEN_MATCH_PENALTY,
    );
  }

  const numberMatchStrength = getNumberMatchStrength(row, query);
  if (numberMatchStrength >= 1) {
    addScoreComponent(
      components,
      "collector_number_exact",
      EXACT_NUMBER_MATCH_BONUS,
    );
  } else if (numberMatchStrength >= 0.86) {
    addScoreComponent(
      components,
      "collector_number_digits",
      DIGIT_NUMBER_MATCH_BONUS,
    );
  } else if (numberMatchStrength >= 0.72) {
    addScoreComponent(
      components,
      "collector_number_partial",
      PARTIAL_NUMBER_MATCH_BONUS,
    );
  } else if (
    query.numberTokens.length > 0 ||
    query.numberDigitTokens.length > 0
  ) {
    addScoreComponent(
      components,
      "collector_number_missing",
      NUMBER_MISS_PENALTY,
    );
  }

  const fractionMatchStrength = getFractionMatchStrength(row, query);
  if (fractionMatchStrength >= 1) {
    addScoreComponent(
      components,
      "collector_fraction_exact",
      EXACT_FRACTION_MATCH_BONUS,
    );
  } else if (query.fractionTokens.length > 0) {
    addScoreComponent(
      components,
      "collector_fraction_missing",
      FRACTION_MISS_PENALTY,
    );
  }

  const promoMatchStrength = getPromoMatchStrength(row, query);
  if (promoMatchStrength >= 1) {
    addScoreComponent(components, "promo_token_exact", PROMO_TOKEN_MATCH_BONUS);
  } else if (promoMatchStrength >= 0.5) {
    addScoreComponent(
      components,
      "promo_family_match",
      Math.round(PROMO_TOKEN_MATCH_BONUS * 0.55),
    );
  } else if (query.promoTokens.length > 0) {
    addScoreComponent(
      components,
      "promo_token_missing",
      PROMO_TOKEN_MISS_PENALTY,
    );
  }

  const matchedRarityIntent: string[] = [];
  let partialRarityIntentMatchCount = 0;
  for (const intent of query.rarityIntent) {
    const rarityMatchStrength = getRarityIntentMatchStrength(row, intent);
    if (rarityMatchStrength >= 1) {
      matchedRarityIntent.push(intent);
      addScoreComponent(
        components,
        `rarity_intent_${intent.replace(/\s+/g, "_")}`,
        RARITY_INTENT_MATCH_BONUS,
      );
      continue;
    }

    if (rarityMatchStrength >= 0.75) {
      partialRarityIntentMatchCount += 1;
      addScoreComponent(
        components,
        `rarity_intent_partial_${intent.replace(/\s+/g, "_")}`,
        RARITY_INTENT_PARTIAL_BONUS,
      );
    }
  }

  if (
    query.rarityIntent.length > 0 &&
    matchedRarityIntent.length === 0 &&
    partialRarityIntentMatchCount === 0
  ) {
    addScoreComponent(
      components,
      "rarity_intent_missing",
      RARITY_INTENT_MISS_PENALTY,
    );
  }

  const matchedTraitIntent: string[] = [];
  let partialTraitIntentMatchCount = 0;
  for (const intent of query.traitIntent) {
    const traitMatchStrength = getTraitIntentMatchStrength(row, intent);
    if (traitMatchStrength >= 1) {
      matchedTraitIntent.push(intent);
      addScoreComponent(
        components,
        `trait_intent_${intent.replace(/\s+/g, "_")}`,
        TRAIT_INTENT_MATCH_BONUS,
      );
      continue;
    }

    if (traitMatchStrength >= 0.75) {
      partialTraitIntentMatchCount += 1;
      addScoreComponent(
        components,
        `trait_intent_partial_${intent.replace(/\s+/g, "_")}`,
        TRAIT_INTENT_PARTIAL_BONUS,
      );
    }
  }

  if (
    query.traitIntent.length > 0 &&
    matchedTraitIntent.length === 0 &&
    partialTraitIntentMatchCount === 0
  ) {
    addScoreComponent(
      components,
      "trait_intent_missing",
      TRAIT_INTENT_MISS_PENALTY,
    );
  }

  const matchedVariantCues: VariantCue[] = [];
  for (const cue of query.variantCues) {
    if (!rowVariantCues.has(cue)) continue;
    matchedVariantCues.push(cue);

    switch (cue) {
      case "alt_art":
        addScoreComponent(components, "variant_alt_art", 720);
        break;
      case "rainbow":
        addScoreComponent(components, "variant_rainbow", 620);
        break;
      case "promo":
        addScoreComponent(components, "variant_promo", 520);
        break;
      case "gold":
        addScoreComponent(components, "variant_gold", 420);
        break;
      case "full_art":
        addScoreComponent(components, "variant_full_art", 360);
        break;
      case "holo":
        addScoreComponent(components, "variant_holo", 220);
        break;
      case "masterball":
        addScoreComponent(components, "variant_masterball", 520);
        break;
      case "pokeball":
        addScoreComponent(components, "variant_pokeball", 520);
        break;
      case "reverse":
        addScoreComponent(components, "variant_reverse", 420);
        break;
    }
  }

  if (query.variantCues.length > 0 && matchedVariantCues.length === 0) {
    addScoreComponent(components, "variant_missing", VARIANT_MISS_PENALTY);
  }

  const hasStructuredMatch =
    matchesExpectedSetCode ||
    numberMatchStrength >= 0.72 ||
    fractionMatchStrength >= 1 ||
    promoMatchStrength >= 0.5 ||
    matchedVariantCues.length > 0;
  if (query.hasStrongDisambiguator && !hasStructuredMatch) {
    addScoreComponent(
      components,
      "structured_query_without_structured_match",
      STRUCTURED_QUERY_WITHOUT_STRUCTURED_MATCH_PENALTY,
    );
  }

  const score = Object.values(components).reduce(
    (sum, value) => sum + value,
    0,
  );
  return {
    score,
    components,
    evidence: {
      text: matchedTextTokens > 0,
      text_required: query.textTokens.length > 0,
      expected_set: matchesExpectedSetCode,
      number: numberMatchStrength >= 0.72,
      fraction: fractionMatchStrength >= 1,
      promo: promoMatchStrength >= 0.5,
      rarity:
        matchedRarityIntent.length > 0 || partialRarityIntentMatchCount > 0,
      traits: matchedTraitIntent,
      variants: matchedVariantCues,
    },
  };
}

function scoreRow(row: ExploreRow, query: ResolverQuery) {
  return scoreRowDetail(row, query).score;
}

function getTopMatchTrace(
  rows: ExploreRow[],
  query: ResolverQuery,
): ExploreRowsTiming["top_match"] {
  const topRow = rows[0];
  if (!topRow) {
    return null;
  }

  const detail = scoreRowDetail(topRow, query);
  const secondRow = rows[1];
  const secondScore = secondRow ? scoreRow(secondRow, query) : null;
  return {
    gv_id: topRow.gv_id,
    score: detail.score,
    second_score: secondScore,
    score_gap_to_second:
      secondScore === null ? null : detail.score - secondScore,
    components: detail.components,
    evidence: detail.evidence,
  };
}

function rankRows(rows: ExploreRow[], query: ResolverQuery) {
  const rankedRows = [...rows].sort((a, b) => {
    const scoreA = scoreRow(a, query);
    const scoreB = scoreRow(b, query);
    if (scoreA !== scoreB) return scoreB - scoreA;

    const nameCompare = a.name.localeCompare(b.name);
    if (nameCompare !== 0) return nameCompare;

    const setCompare = (a.set_name ?? "").localeCompare(b.set_name ?? "");
    if (setCompare !== 0) return setCompare;

    const numberCompare = a.number.localeCompare(b.number, undefined, {
      numeric: true,
    });
    if (numberCompare !== 0) return numberCompare;

    return a.gv_id.localeCompare(b.gv_id);
  });

  return promoteDecoratedFamilyRows(rankedRows, query);
}

function promoteDecoratedFamilyRows(rows: ExploreRow[], query: ResolverQuery) {
  const primaryFamilyTokens = getPrimaryFamilyTokensFromTokens(
    query.textTokens,
  );
  if (
    rows.length === 0 ||
    query.hasStrongDisambiguator ||
    query.textTokens.length === 0 ||
    primaryFamilyTokens.length === 0 ||
    queryContainsNameDecoratorTokens(query.textTokens)
  ) {
    return rows;
  }

  const normalizedQueryName = query.normalized.toLowerCase();
  const promotedRowIds = new Set<string>();
  const decoratedNameKeys = new Set<string>();
  const promotedRows: ExploreRow[] = [];

  const leadExactRow = rows.find(
    (row) => normalizeTextForMatch(row.name) === normalizedQueryName,
  );
  if (leadExactRow) {
    promotedRows.push(leadExactRow);
    promotedRowIds.add(leadExactRow.id);
  }

  for (const row of rows) {
    if (
      promotedRows.length >=
      FAMILY_DIVERSITY_PROMOTION_LIMIT + (leadExactRow ? 1 : 0)
    ) {
      break;
    }

    if (promotedRowIds.has(row.id)) {
      continue;
    }

    const normalizedRowName = normalizeTextForMatch(row.name);
    if (!normalizedRowName || normalizedRowName === normalizedQueryName) {
      continue;
    }

    if (!rowMatchesNameFamily(row.name, primaryFamilyTokens)) {
      continue;
    }

    if (decoratedNameKeys.has(normalizedRowName)) {
      continue;
    }

    decoratedNameKeys.add(normalizedRowName);
    promotedRows.push(row);
    promotedRowIds.add(row.id);
  }

  if (promotedRows.length <= (leadExactRow ? 1 : 0)) {
    return rows;
  }

  return [
    ...promotedRows,
    ...rows.filter((row) => !promotedRowIds.has(row.id)),
  ];
}

function normalizeExpectedSetCodes(expectedSetCodes: string[]) {
  return uniqueValues(
    expectedSetCodes.map((code) => normalizeSetCode(code)).filter(Boolean),
  );
}

function compareRowsByRelevance(
  a: ExploreRow,
  b: ExploreRow,
  query: ResolverQuery,
) {
  const scoreA = scoreRow(a, query);
  const scoreB = scoreRow(b, query);
  if (scoreA !== scoreB) return scoreB - scoreA;

  const nameCompare = a.name.localeCompare(b.name);
  if (nameCompare !== 0) return nameCompare;

  const setCompare = (a.set_name ?? "").localeCompare(b.set_name ?? "");
  if (setCompare !== 0) return setCompare;

  const numberCompare = a.number.localeCompare(b.number, undefined, {
    numeric: true,
  });
  if (numberCompare !== 0) return numberCompare;

  return a.gv_id.localeCompare(b.gv_id);
}

function sortRows(
  rows: ExploreRow[],
  query: ResolverQuery,
  sortMode: SortMode,
) {
  if (sortMode === "relevance") {
    return rankRows(rows, query);
  }

  return [...rows].sort((a, b) => {
    if (sortMode === "value_high" || sortMode === "value_low") {
      const leftPrice = typeof a.raw_price === "number" && Number.isFinite(a.raw_price) ? a.raw_price : null;
      const rightPrice = typeof b.raw_price === "number" && Number.isFinite(b.raw_price) ? b.raw_price : null;

      if (leftPrice !== null && rightPrice === null) return -1;
      if (leftPrice === null && rightPrice !== null) return 1;
      if (leftPrice !== null && rightPrice !== null && leftPrice !== rightPrice) {
        return sortMode === "value_high" ? rightPrice - leftPrice : leftPrice - rightPrice;
      }

      return compareRowsByRelevance(a, b, query);
    }

    if (sortMode === "number") {
      const setCompare = (a.set_name ?? "").localeCompare(b.set_name ?? "");
      if (setCompare !== 0) return setCompare;

      const numberCompare = a.number.localeCompare(b.number, undefined, {
        numeric: true,
      });
      if (numberCompare !== 0) return numberCompare;

      return compareRowsByRelevance(a, b, query);
    }

    const leftDate = a.release_date ? Date.parse(a.release_date) : Number.NaN;
    const rightDate = b.release_date ? Date.parse(b.release_date) : Number.NaN;
    const leftHasDate = Number.isFinite(leftDate);
    const rightHasDate = Number.isFinite(rightDate);

    if (leftHasDate && !rightHasDate) return -1;
    if (!leftHasDate && rightHasDate) return 1;

    if (leftHasDate && rightHasDate && leftDate !== rightDate) {
      return sortMode === "oldest"
        ? leftDate - rightDate
        : rightDate - leftDate;
    }

    if (sortMode === "set_order") {
      const setCompare = (a.set_name ?? "").localeCompare(b.set_name ?? "");
      if (setCompare !== 0) return setCompare;

      const numberCompare = a.number.localeCompare(b.number, undefined, {
        numeric: true,
      });
      if (numberCompare !== 0) return numberCompare;
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
    rpcResults.flatMap((result) =>
      ((result.data ?? []) as SearchRpcRow[])
        .map((row) => row.id)
        .filter(Boolean),
    ),
  );
}

async function fetchPrintIdentitySearchRows(query: ResolverQuery) {
  const supabase = createServerComponentClient();
  const primaryNumberToken = query.numberTokens[0] ?? query.numberDigitTokens[0] ?? null;
  const exactSetCode =
    query.expectedSetCodes.length === 1 ? query.expectedSetCodes[0] : null;

  const { data, error } = await supabase.rpc("search_print_identity_v1", {
    q: query.normalized || null,
    set_code_in: exactSetCode,
    number_in: primaryNumberToken,
    object_type_in: null,
    limit_in: SEARCH_LIMIT,
    offset_in: 0,
  });

  if (error) {
    if (
      error.message.includes("search_print_identity_v1") ||
      error.message.includes("Could not find the function") ||
      error.message.includes("function public.search_print_identity_v1")
    ) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[print-identity-search] V1 RPC unavailable; falling back to legacy resolver.");
      }
      return [] as PrintIdentitySearchRpcRow[];
    }

    throw new Error(error.message);
  }

  const rows = ((data ?? []) as PrintIdentitySearchRpcRow[]).filter((row) =>
    Boolean(row.parent_gv_id),
  );

  if (rows.length > 0 || !query.directGvId) {
    return rows;
  }

  const { data: directChildRows, error: directChildError } = await supabase
    .from("card_printings")
    .select("printing_gv_id,finish_key,card_prints(gv_id,name)")
    .eq("printing_gv_id", query.directGvId)
    .limit(1);

  if (directChildError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[print-identity-search] direct child printing fallback failed closed", {
        message: directChildError.message,
      });
    }
    return rows;
  }

  const directChild = ((directChildRows ?? []) as DirectChildPrintingLookupRow[])[0];
  const parent = Array.isArray(directChild?.card_prints)
    ? directChild.card_prints[0]
    : directChild?.card_prints;
  const parentGvId = parent?.gv_id?.trim();
  const printingGvId = directChild?.printing_gv_id?.trim();
  if (!parentGvId || !printingGvId) {
    return rows;
  }

  const finishLabel = getCardPrintingFinishLabel({
    finishKey: directChild.finish_key,
  });

  return [
    {
      search_document_id: `child:${printingGvId}`,
      object_type: "child_printing",
      parent_gv_id: parentGvId,
      printing_gv_id: printingGvId,
      display_discriminator: finishLabel,
      route_query: `printing=${printingGvId}`,
      matched_fields: ["printing_gv_id", "direct_child_printing_fallback"],
      rank_score: 20050,
    },
  ];
}

function rowMatchesScopedTextTokens(
  row: CardPrintLookupRow,
  query: ResolverQuery,
) {
  const scopedTokens =
    query.significantTextTokens.length > 0
      ? query.significantTextTokens
      : query.textTokens;
  if (scopedTokens.length === 0) {
    return true;
  }

  const nameTokens = tokenizeNormalizedQuery(row.name);
  const identityTokens = tokenizeNormalizedQuery(buildIdentitySearchText(row));
  const setTokens = uniqueValues([
    ...tokenizeNormalizedQuery(row.set_code),
    ...tokenizeNormalizedQuery(row.printed_set_abbrev),
  ]);

  if (rowMatchesNameFamily(row.name, scopedTokens)) {
    return true;
  }

  return scopedTokens.some((token) => {
    const bestSimilarity = Math.max(
      bestTokenSimilarity(token, nameTokens),
      bestTokenSimilarity(token, identityTokens),
      bestTokenSimilarity(token, setTokens),
    );
    return bestSimilarity >= 0.88;
  });
}

async function fetchReprintAnthologySetCodes() {
  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from("sets")
    .select("code")
    .eq("identity_model", "reprint_anthology");

  if (error) {
    throw new Error(error.message);
  }

  return uniqueValues(
    ((data ?? []) as Array<{ code?: string | null }>)
      .map((row) => normalizeSetCode(row.code))
      .filter(Boolean),
  );
}

async function addIdentityFilterRequests(
  filterKey: IdentityFilterKey,
  selectClause: string,
  addRequest: (
    builderPromise: PromiseLike<{
      data: unknown;
      error: { message: string } | null;
    }>,
  ) => void,
) {
  const normalizedFilter = normalizeIdentityFilterKey(filterKey);
  if (normalizedFilter === "all") {
    return;
  }

  const supabase = createServerComponentClient();
  const variantKey = getVariantKeyForFilter(normalizedFilter);
  if (variantKey) {
    addRequest(
      supabase
        .from("card_prints")
        .select(selectClause)
        .eq("variant_key", variantKey)
        .limit(160),
    );
    return;
  }

  if (normalizedFilter === "classic_collection") {
    addRequest(
      supabase
        .from("card_prints")
        .select(selectClause)
        .eq("variant_key", "cc")
        .limit(160),
    );
    const anthologySetCodes = await fetchReprintAnthologySetCodes();
    if (anthologySetCodes.length > 0) {
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .in("set_code", anthologySetCodes)
          .limit(200),
      );
    }
  }
}

async function fetchNameFamilyRows(query: ResolverQuery, selectClause: string) {
  const familyTokens = getPrimaryFamilyTokensFromTokens(
    query.significantTextTokens.length > 0
      ? query.significantTextTokens
      : query.textTokens,
  ).filter((token) => token.length >= 3);

  if (familyTokens.length === 0) {
    return [] as CardPrintLookupRow[];
  }

  const supabase = createServerComponentClient();
  const normalizedExpectedSetCodes = normalizeExpectedSetCodes(
    query.expectedSetCodes,
  );
  type LookupQueryResult = {
    data: CardPrintLookupRow[] | null;
    error: { message: string } | null;
  };
  const requests: Array<Promise<LookupQueryResult>> = [];
  const addRequest = (
    builderPromise: PromiseLike<{
      data: unknown;
      error: { message: string } | null;
    }>,
  ) => {
    requests.push(
      Promise.resolve(builderPromise).then((result) => ({
        data: ((result.data ?? []) as CardPrintLookupRow[]) ?? [],
        error: result.error,
      })),
    );
  };

  for (const token of familyTokens.slice(0, 2)) {
    let request = supabase
      .from("card_prints")
      .select(selectClause)
      .ilike("name", `%${token}%`)
      .limit(120);

    if (normalizedExpectedSetCodes.length > 0) {
      request = request.in("set_code", normalizedExpectedSetCodes);
    }

    addRequest(request);
  }

  const results = await Promise.all(requests);
  const lookupError = results.find((result) => result.error);
  if (lookupError?.error) {
    throw new Error(lookupError.error.message);
  }

  const deduped = new Map<string, CardPrintLookupRow>();
  for (const row of results.flatMap(
    (result) => (result.data ?? []) as CardPrintLookupRow[],
  )) {
    if (!rowMatchesNameFamily(row.name, familyTokens)) {
      continue;
    }

    deduped.set(row.id, row);
  }

  return [...deduped.values()];
}

async function fetchIntentScopedRows(
  query: ResolverQuery,
  selectClause: string,
) {
  if (query.expectedSetCodes.length > 0) {
    return [] as CardPrintLookupRow[];
  }

  const hasCollectorIntent =
    query.rarityIntent.length > 0 ||
    query.traitIntent.length > 0 ||
    query.variantCues.length > 0;
  if (!hasCollectorIntent) {
    return [] as CardPrintLookupRow[];
  }

  const supabase = createServerComponentClient();
  type LookupQueryResult = {
    data: CardPrintLookupRow[] | null;
    error: { message: string } | null;
  };

  const requests: Array<Promise<LookupQueryResult>> = [];
  const addRequest = (
    builderPromise: PromiseLike<{
      data: unknown;
      error: { message: string } | null;
    }>,
  ) => {
    requests.push(
      Promise.resolve(builderPromise).then((result) => ({
        data: ((result.data ?? []) as CardPrintLookupRow[]) ?? [],
        error: result.error,
      })),
    );
  };

  for (const intent of query.rarityIntent) {
    if (
      intent === "illustration rare" ||
      intent === "special illustration rare" ||
      intent === "hyper rare"
    ) {
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("rarity", `%${intent}%`)
          .limit(120),
      );
    }
  }

  for (const intent of query.traitIntent) {
    if (intent === "promo") {
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("rarity", "%promo%")
          .limit(120),
      );
      continue;
    }

    if (intent === "stamp") {
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("variant_key", "%stamp%")
          .limit(120),
      );
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .eq("variants->>stamped", "true")
          .limit(120),
      );
      continue;
    }

    if (intent === "felt hat") {
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("name", "%felt hat%")
          .limit(120),
      );
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("variant_key", "%felt hat%")
          .limit(120),
      );
      continue;
    }

    if (intent === "baby shiny") {
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("rarity", "%shiny rare%")
          .limit(120),
      );
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("name", "%baby shiny%")
          .limit(120),
      );
      continue;
    }

    if (intent === "shiny") {
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("rarity", "%shiny%")
          .limit(120),
      );
      continue;
    }

    if (
      intent === "classic collection" ||
      intent === "pokemon together stamp" ||
      intent === "trainer gallery" ||
      intent === "radiant collection" ||
      intent === "prerelease" ||
      intent === "staff"
    ) {
      await addIdentityFilterRequests(
        normalizeIdentityFilterKey(intent),
        selectClause,
        addRequest,
      );
      continue;
    }

    if (intent === "delta species") {
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .eq("printed_identity_modifier", "delta_species")
          .limit(120),
      );
    }
  }

  for (const cue of query.variantCues) {
    if (cue === "alt_art") {
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("variant_key", "%alt%")
          .limit(120),
      );
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("rarity", "%special illustration rare%")
          .limit(120),
      );
      continue;
    }

    if (cue === "gold" || cue === "rainbow") {
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("rarity", "%hyper rare%")
          .limit(120),
      );
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("variant_key", `%${cue}%`)
          .limit(120),
      );
      continue;
    }

    if (cue === "promo") {
      addRequest(
        supabase
          .from("card_prints")
          .select(selectClause)
          .ilike("rarity", "%promo%")
          .limit(120),
      );
    }
  }

  if (requests.length === 0) {
    return [] as CardPrintLookupRow[];
  }

  const results = await Promise.all(requests);
  const fetchError = results.find((result) => result.error);
  if (fetchError?.error) {
    throw new Error(fetchError.error.message);
  }

  const deduped = new Map<string, CardPrintLookupRow>();
  for (const row of results.flatMap(
    (result) => (result.data ?? []) as CardPrintLookupRow[],
  )) {
    if (!rowMatchesScopedTextTokens(row, query)) {
      continue;
    }

    deduped.set(row.id, row);
  }

  return [...deduped.values()];
}

async function fetchSetAwareTcgdexCardIds(query: ResolverQuery) {
  if (query.expectedSetCodes.length > 0) {
    return {
      setNameById: new Map<string, string>(),
      tcgdexCardIds: [] as string[],
    };
  }

  if (query.significantTextTokens.length === 0) {
    return {
      setNameById: new Map<string, string>(),
      tcgdexCardIds: [] as string[],
    };
  }

  const supabase = createServerComponentClient();
  const { data: setRows, error: setError } = await supabase
    .from("tcgdex_sets")
    .select("tcgdex_set_id,name");
  if (setError) {
    throw new Error(setError.message);
  }

  const allSetRows = (setRows ?? []) as TcgdexSetRow[];
  const setNameById = new Map(
    allSetRows
      .filter(
        (row): row is TcgdexSetRow & { tcgdex_set_id: string; name: string } =>
          Boolean(row.tcgdex_set_id && row.name),
      )
      .map((row) => [row.tcgdex_set_id, row.name]),
  );
  const rankedSets = rankSetCandidates(allSetRows, query);
  const topSetIds = rankedSets
    .map((row) => row.tcgdex_set_id)
    .filter((value): value is string => Boolean(value));

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
          .or(
            `local_number.eq.${primaryNumberToken},printed_number.eq.${primaryNumberToken}`,
          )
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
        .or(
          `local_number.eq.${primaryNumberToken},printed_number.eq.${primaryNumberToken}`,
        )
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

async function fetchExactCardRows(
  ids: string[],
  printIdentityRows: PrintIdentitySearchRpcRow[],
  tcgdexCardIds: string[],
  directGvId: string | null,
  expectedSetCodes: string[],
  query: ResolverQuery,
) {
  const supabase = createServerComponentClient();
  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set_code,printed_set_abbrev,external_ids,variant_key,printed_identity_modifier,variants";
  const normalizedExpectedSetCodes =
    normalizeExpectedSetCodes(expectedSetCodes);
  const hasExpectedSetScope = normalizedExpectedSetCodes.length > 0;
  const printIdentityParentGvIds = uniqueValues(
    printIdentityRows
      .map((row) => row.parent_gv_id ?? "")
      .filter(Boolean),
  );

  const [
    lookupById,
    lookupByPrintIdentityGvId,
    lookupByTcgdex,
    directLookup,
    expectedSetRows,
    intentScopedRows,
    nameFamilyRows,
  ] = await Promise.all([
    ids.length > 0
      ? hasExpectedSetScope
        ? supabase
            .from("card_prints")
            .select(selectClause)
            .in("set_code", normalizedExpectedSetCodes)
            .in("id", ids)
        : supabase.from("card_prints").select(selectClause).in("id", ids)
      : Promise.resolve({ data: [] as CardPrintLookupRow[], error: null }),
    printIdentityParentGvIds.length > 0
      ? hasExpectedSetScope
        ? supabase
            .from("card_prints")
            .select(selectClause)
            .in("set_code", normalizedExpectedSetCodes)
            .in("gv_id", printIdentityParentGvIds)
        : supabase
            .from("card_prints")
            .select(selectClause)
            .in("gv_id", printIdentityParentGvIds)
      : Promise.resolve({ data: [] as CardPrintLookupRow[], error: null }),
    tcgdexCardIds.length > 0
      ? hasExpectedSetScope
        ? supabase
            .from("card_prints")
            .select(selectClause)
            .in("set_code", normalizedExpectedSetCodes)
            .in("external_ids->>tcgdex", tcgdexCardIds)
        : supabase
            .from("card_prints")
            .select(selectClause)
            .in("external_ids->>tcgdex", tcgdexCardIds)
      : Promise.resolve({ data: [] as CardPrintLookupRow[], error: null }),
    directGvId
      ? hasExpectedSetScope
        ? supabase
            .from("card_prints")
            .select(selectClause)
            .in("set_code", normalizedExpectedSetCodes)
            .eq("gv_id", directGvId)
            .limit(1)
        : supabase
            .from("card_prints")
            .select(selectClause)
            .eq("gv_id", directGvId)
            .limit(1)
      : Promise.resolve({ data: [] as CardPrintLookupRow[], error: null }),
    hasExpectedSetScope
      ? supabase
          .from("card_prints")
          .select(selectClause)
          .in("set_code", normalizedExpectedSetCodes)
          .limit(250)
      : Promise.resolve({ data: [] as CardPrintLookupRow[], error: null }),
    fetchIntentScopedRows(query, selectClause).then((data) => ({
      data,
      error: null,
    })),
    fetchNameFamilyRows(query, selectClause).then((data) => ({
      data,
      error: null,
    })),
  ]);

  const lookupError =
    lookupById.error ??
    lookupByPrintIdentityGvId.error ??
    lookupByTcgdex.error ??
    directLookup.error ??
    expectedSetRows.error;
  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const parentRowsById = new Map<string, CardPrintLookupRow>();
  for (const row of [
    ...((directLookup.data ?? []) as CardPrintLookupRow[]),
    ...((lookupById.data ?? []) as CardPrintLookupRow[]),
    ...((lookupByPrintIdentityGvId.data ?? []) as CardPrintLookupRow[]),
    ...((lookupByTcgdex.data ?? []) as CardPrintLookupRow[]),
    ...((expectedSetRows.data ?? []) as CardPrintLookupRow[]),
    ...((intentScopedRows.data ?? []) as CardPrintLookupRow[]),
    ...((nameFamilyRows.data ?? []) as CardPrintLookupRow[]),
  ]) {
    parentRowsById.set(row.id, row);
  }

  const deduped = new Map<string, CardPrintLookupRow>();
  for (const doc of printIdentityRows) {
    if (!doc.parent_gv_id) {
      continue;
    }

    const parentRow = [...parentRowsById.values()].find((row) => row.gv_id === doc.parent_gv_id);
    if (!parentRow) {
      continue;
    }

    const key = doc.printing_gv_id
      ? `${doc.parent_gv_id}:${doc.printing_gv_id}`
      : doc.parent_gv_id;
    deduped.set(key, applyPrintIdentityContext(parentRow, doc));
  }

  for (const [key, row] of deduped.entries()) {
    if (
      row.gv_id &&
      row.search_object_type !== "child_printing" &&
      hasCandidateForGvId(
        [...deduped.values()].filter(
          (candidate) => candidate.search_object_type === "child_printing",
        ),
        row.gv_id,
      )
    ) {
      deduped.delete(key);
    }
  }

  for (const row of parentRowsById.values()) {
    if (!deduped.has(row.id) && !hasCandidateForGvId(deduped.values(), row.gv_id)) {
      deduped.set(row.id, row);
    }
  }

  return suppressParentOnlyRowsWhenChildMatchExists([...deduped.values()]);
}

async function fetchCardRowsBySetCode(setCode: string) {
  const supabase = createServerComponentClient();
  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set_code,printed_set_abbrev,external_ids,variant_key,printed_identity_modifier,variants";
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

async function fetchCardRowsByStructuredTextQuery(query: ResolverQuery) {
  const supabase = createServerComponentClient();
  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set_code,printed_set_abbrev,external_ids,variant_key,printed_identity_modifier,variants";
  const rowsById = new Map<string, CardPrintLookupRow>();

  if (query.directGvId) {
    const { data, error } = await supabase
      .from("card_prints")
      .select(selectClause)
      .eq("gv_id", query.directGvId)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as CardPrintLookupRow[]) {
      rowsById.set(row.id, row);
    }
  }

  const tokens = query.significantTextTokens.length > 0
    ? query.significantTextTokens
    : query.textTokens.filter((token) => token.length >= 2 && !GENERIC_TOKENS.has(token));

  if (tokens.length === 0) {
    return [...rowsById.values()];
  }

  let request = supabase
    .from("card_prints")
    .select(selectClause)
    .limit(500);

  for (const token of tokens.slice(0, 3)) {
    request = request.ilike("name", `%${token}%`);
  }

  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as CardPrintLookupRow[]) {
    rowsById.set(row.id, row);
  }

  return [...rowsById.values()];
}

async function fetchCardRowsByIdentityFilter(filterKey: IdentityFilterKey) {
  const normalizedFilter = normalizeIdentityFilterKey(filterKey);
  if (normalizedFilter === "all") {
    return [] as CardPrintLookupRow[];
  }

  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set_code,printed_set_abbrev,external_ids,variant_key,printed_identity_modifier,variants";
  const supabase = createServerComponentClient();
  const results = new Map<string, CardPrintLookupRow>();

  const variantKey = getVariantKeyForFilter(normalizedFilter);
  if (variantKey) {
    const { data, error } = await supabase
      .from("card_prints")
      .select(selectClause)
      .eq("variant_key", variantKey)
      .limit(200);
    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as CardPrintLookupRow[]) {
      results.set(row.id, row);
    }
  }

  if (normalizedFilter === "classic_collection") {
    const { data: ccRows, error: ccError } = await supabase
      .from("card_prints")
      .select(selectClause)
      .eq("variant_key", "cc")
      .limit(200);
    if (ccError) {
      throw new Error(ccError.message);
    }

    for (const row of (ccRows ?? []) as CardPrintLookupRow[]) {
      results.set(row.id, row);
    }

    const anthologySetCodes = await fetchReprintAnthologySetCodes();
    if (anthologySetCodes.length > 0) {
      const { data: anthologyRows, error: anthologyError } = await supabase
        .from("card_prints")
        .select(selectClause)
        .in("set_code", anthologySetCodes)
        .limit(250);
      if (anthologyError) {
        throw new Error(anthologyError.message);
      }

      for (const row of (anthologyRows ?? []) as CardPrintLookupRow[]) {
        results.set(row.id, row);
      }
    }
  }

  return [...results.values()].filter((row) =>
    matchesIdentityFilter(row, normalizedFilter),
  );
}

async function fetchCardRowsByIllustrator(illustrator: string) {
  const supabase = createServerComponentClient();
  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set_code,printed_set_abbrev,external_ids,variant_key,printed_identity_modifier,variants";
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

async function fetchSetCodesByReleaseYearRange(minYear?: number, maxYear?: number) {
  const startYear = typeof minYear === "number" ? minYear : 1999;
  const endYear = typeof maxYear === "number" ? maxYear : new Date().getFullYear() + 1;
  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from("sets")
    .select("code")
    .gte("release_date", `${startYear}-01-01`)
    .lt("release_date", `${endYear + 1}-01-01`);

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
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set_code,printed_set_abbrev,external_ids,variant_key,printed_identity_modifier,variants";
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

async function fetchCardRowsByReleaseYearRange(minYear?: number, maxYear?: number) {
  const supabase = createServerComponentClient();
  const setCodes = await fetchSetCodesByReleaseYearRange(minYear, maxYear);
  if (setCodes.length === 0) {
    return [] as CardPrintLookupRow[];
  }

  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set_code,printed_set_abbrev,external_ids,variant_key,printed_identity_modifier,variants";
  const { data, error } = await supabase
    .from("card_prints")
    .select(selectClause)
    .in("set_code", setCodes)
    .limit(300);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CardPrintLookupRow[];
}

async function fetchCardRowsByIds(cardPrintIds: string[]) {
  const ids = uniqueValues(cardPrintIds.map((id) => id.trim()).filter(Boolean));
  if (ids.length === 0) {
    return [] as CardPrintLookupRow[];
  }

  const supabase = createServerComponentClient();
  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set_code,printed_set_abbrev,external_ids,variant_key,printed_identity_modifier,variants";
  const rowsById = new Map<string, CardPrintLookupRow>();

  for (const idChunk of chunkArray(ids, 200)) {
    const { data, error } = await supabase
      .from("card_prints")
      .select(selectClause)
      .in("id", idChunk);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as CardPrintLookupRow[]) {
      rowsById.set(row.id, row);
    }
  }

  return [...rowsById.values()];
}

function chunkArray<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function getSmartStampSearchTokens(stampLabels: string[]) {
  return uniqueValues(
    stampLabels.flatMap((label) =>
      normalizeTextForMatch(label)
        .split(" ")
        .filter(
          (token) =>
            (token.length >= 3 || token === "e3") &&
            token !== "stamp" &&
            token !== "stamped" &&
            token !== "workshop",
        ),
    ),
  ).slice(0, 8);
}

function hasSmartLabel(stampLabels: string[], phrase: string) {
  const normalizedPhrase = normalizeTextForMatch(phrase);
  return stampLabels.some((label) =>
    normalizeTextForMatch(label).includes(normalizedPhrase),
  );
}

function getSpecialSetCodesForSmartLabels(stampLabels: string[]) {
  const setCodes: string[] = [];
  if (hasSmartLabel(stampLabels, "first partner")) {
    setCodes.push("mep");
  }
  if (hasSmartLabel(stampLabels, "poke card creator")) {
    setCodes.push("ex5.5");
  }
  return uniqueValues(setCodes);
}

function rowMatchesSmartStampLabels(row: CardPrintLookupRow, stampLabels?: string[]) {
  const labels = stampLabels ?? [];
  if (labels.length === 0) {
    return true;
  }

  const specialSetCodes = new Set(getSpecialSetCodesForSmartLabels(labels));
  if (specialSetCodes.has(normalizeSetCode(row.set_code))) {
    return true;
  }

  const tokens = getSmartStampSearchTokens(labels);
  if (tokens.length === 0) {
    return false;
  }

  const searchableIdentity = normalizeTextForMatch(
    [
      row.variant_key,
      row.printed_identity_modifier,
      ...(Array.isArray(row.variants) ? row.variants : []),
    ]
      .filter(Boolean)
      .join(" "),
  );

  return tokens.every((token) => searchableIdentity.includes(token));
}

function applySmartStampParentFilter(rows: CardPrintLookupRow[], stampLabels?: string[]) {
  if ((stampLabels ?? []).length === 0) {
    return rows;
  }

  return rows.filter((row) => rowMatchesSmartStampLabels(row, stampLabels));
}

function normalizeFinishKeys(finishKeys?: string[]) {
  return uniqueValues(
    (finishKeys ?? [])
      .map((key) => key.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getSmartDiscoveryTextTokens(textQuery?: string) {
  return uniqueValues(
    tokenizeNormalizedQuery(textQuery)
      .filter((token) => token.length >= 2 && !GENERIC_TOKENS.has(token))
      .slice(0, 6),
  );
}

function rowMatchesSmartDiscoveryText(
  row: CardPrintLookupRow,
  textQuery?: string,
) {
  const tokens = getSmartDiscoveryTextTokens(textQuery);
  if (tokens.length === 0) {
    return true;
  }

  const haystack = normalizeTextForMatch(
    [
      row.name,
      row.number,
      row.gv_id,
      row.set_code,
      row.printed_set_abbrev,
      row.rarity,
      row.artist,
      row.variant_key,
      row.printed_identity_modifier,
      row.printing_gv_id,
      row.finish_key,
      row.finish_label,
      row.display_discriminator,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return tokens.every((token) => haystack.includes(token));
}

async function fetchCardRowsBySmartText(textQuery?: string) {
  const tokens = getSmartDiscoveryTextTokens(textQuery);
  if (tokens.length === 0) {
    return [] as CardPrintLookupRow[];
  }

  const supabase = createServerComponentClient();
  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set_code,printed_set_abbrev,external_ids,variant_key,printed_identity_modifier,variants";
  const rowsById = new Map<string, CardPrintLookupRow>();
  const searchTokens = tokens
    .filter((token) => token.length >= 3)
    .slice(0, 3);
  const tokenChunks = searchTokens.length > 0 ? chunkArray(searchTokens, 3) : [tokens.slice(0, 1)];

  for (const tokenChunk of tokenChunks) {
    const orExpression = tokenChunk
      .flatMap((token) => [
        `name.ilike.%${token}%`,
        `number.ilike.%${token}%`,
        `gv_id.ilike.%${token}%`,
      ])
      .join(",");
    const { data, error } = await supabase
      .from("card_prints")
      .select(selectClause)
      .or(orExpression)
      .limit(SMART_FILTER_DISCOVERY_LIMIT);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as CardPrintLookupRow[]) {
      if (rowMatchesSmartDiscoveryText(row, textQuery)) {
        rowsById.set(row.id, row);
      }
    }
  }

  return [...rowsById.values()];
}

async function fetchCardRowsByStampLabels(stampLabels: string[]) {
  const tokens = getSmartStampSearchTokens(stampLabels);
  if (tokens.length === 0) {
    return [] as CardPrintLookupRow[];
  }

  const supabase = createServerComponentClient();
  const selectClause =
    "id,gv_id,name,number,rarity,artist,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set_code,printed_set_abbrev,external_ids,variant_key,printed_identity_modifier,variants";
  const rowsById = new Map<string, CardPrintLookupRow>();

  for (const tokenChunk of chunkArray(tokens, 3)) {
    const orExpression = tokenChunk
      .flatMap((token) => [
        `variant_key.ilike.%${token}%`,
        `printed_identity_modifier.ilike.%${token}%`,
      ])
      .join(",");
    const { data, error } = await supabase
      .from("card_prints")
      .select(selectClause)
      .or(orExpression)
      .limit(250);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as CardPrintLookupRow[]) {
      rowsById.set(row.id, row);
    }
  }

  return [...rowsById.values()];
}

async function fetchSmartDiscoverySeedParentRows(
  options: SmartFilterDiscoveryOptions,
) {
  const exactSetCode = normalizeSetCode(options.exactSetCode);
  const exactIllustrator = options.exactIllustrator?.trim();
  const identityFilter = normalizeIdentityFilterKey(options.identityFilter);
  let parentRows: CardPrintLookupRow[] = [];

  if (exactSetCode) {
    parentRows = await fetchCardRowsBySetCode(exactSetCode);
  } else if (getSmartDiscoveryTextTokens(options.textQuery).length > 0) {
    parentRows = await fetchCardRowsBySmartText(options.textQuery);
  } else if (typeof options.exactReleaseYear === "number") {
    parentRows = await fetchCardRowsByReleaseYear(options.exactReleaseYear);
  } else if (
    typeof options.releaseYearMin === "number" ||
    typeof options.releaseYearMax === "number"
  ) {
    parentRows = await fetchCardRowsByReleaseYearRange(
      options.releaseYearMin,
      options.releaseYearMax,
    );
  } else if (exactIllustrator) {
    parentRows = await fetchCardRowsByIllustrator(exactIllustrator);
  } else if (isIdentityFilterActive(identityFilter)) {
    parentRows = await fetchCardRowsByIdentityFilter(identityFilter);
  } else if ((options.stampLabels ?? []).length > 0) {
    parentRows = await fetchCardRowsByStampLabels(options.stampLabels ?? []);
  }

  return applySmartStampParentFilter(parentRows, options.stampLabels);
}

async function filterSmartDiscoveryRowsByScope(
  rows: CardPrintLookupRow[],
  options: SmartFilterDiscoveryOptions,
) {
  const exactSetCode = normalizeSetCode(options.exactSetCode);
  const exactIllustrator = options.exactIllustrator?.trim().toLowerCase();
  const identityFilter = normalizeIdentityFilterKey(options.identityFilter);
  let allowedSetCodes: Set<string> | null = null;

  if (typeof options.exactReleaseYear === "number") {
    allowedSetCodes = new Set(await fetchSetCodesByReleaseYear(options.exactReleaseYear));
  } else if (
    typeof options.releaseYearMin === "number" ||
    typeof options.releaseYearMax === "number"
  ) {
    allowedSetCodes = new Set(
      await fetchSetCodesByReleaseYearRange(
        options.releaseYearMin,
        options.releaseYearMax,
      ),
    );
  }

  return rows.filter((row) => {
    if (!rowMatchesSmartDiscoveryText(row, options.textQuery)) {
      return false;
    }

    if (exactSetCode && normalizeSetCode(row.set_code) !== exactSetCode) {
      return false;
    }

    if (allowedSetCodes && !allowedSetCodes.has(row.set_code ?? "")) {
      return false;
    }

    if (
      exactIllustrator &&
      (row.artist ?? "").trim().toLowerCase() !== exactIllustrator
    ) {
      return false;
    }

    if (isIdentityFilterActive(identityFilter) && !matchesIdentityFilter(row, identityFilter)) {
      return false;
    }

    return true;
  });
}

function getParentFromSmartChild(row: CardPrintingSmartLookupRow) {
  return Array.isArray(row.card_prints) ? row.card_prints[0] : row.card_prints;
}

function mapSmartChildRowToCardPrintLookupRow(
  row: CardPrintingSmartLookupRow,
): CardPrintLookupRow | null {
  const parent = getParentFromSmartChild(row);
  if (!parent?.id || !parent.gv_id) {
    return null;
  }

  const finishLabel = getCardPrintingFinishLabel({
    finishKey: row.finish_key,
  });
  const childHasImage = Boolean(
    row.image_path?.trim() ||
      row.image_url?.trim() ||
      row.image_alt_url?.trim(),
  );
  const parentRepresentativeImageUrl =
    parent.representative_image_url?.trim() ||
    parent.image_url?.trim() ||
    parent.image_alt_url?.trim() ||
    null;
  const shouldUseParentRepresentativeImage =
    !childHasImage && Boolean(parentRepresentativeImageUrl);

  return {
    ...parent,
    image_url: row.image_url,
    image_alt_url: row.image_alt_url,
    image_source: row.image_source,
    image_path: row.image_path,
    representative_image_url: shouldUseParentRepresentativeImage
      ? parentRepresentativeImageUrl
      : parent.representative_image_url,
    image_status:
      row.image_status ??
      (shouldUseParentRepresentativeImage
        ? "representative_missing_variant_visual"
        : undefined),
    image_note:
      row.image_note ??
      (shouldUseParentRepresentativeImage
        ? "Correct printing. Displaying a representative/base image until exact variant imagery is available."
        : undefined),
    search_object_type: "child_printing",
    search_card_printing_id: row.id,
    printing_gv_id: row.printing_gv_id ?? undefined,
    selected_printing_gv_id: row.printing_gv_id ?? undefined,
    finish_key: row.finish_key ?? undefined,
    finish_label: finishLabel,
    display_discriminator: finishLabel,
    route_query: row.printing_gv_id ? `printing=${row.printing_gv_id}` : undefined,
  };
}

function applySmartDiscoveryImageQueryFilter<
  T extends {
    eq: (column: string, value: string) => T;
    in: (column: string, values: string[]) => T;
    neq: (column: string, value: string) => T;
  },
>(request: T, imageState?: SmartFilterImageState) {
  if (imageState === "exact") {
    return request.eq("image_status", "exact");
  }

  if (imageState === "representative") {
    return request.in("image_status", [
      "representative_shared",
      "representative_shared_collision",
      "representative_shared_stamp",
      "representative_missing_variant_visual",
      "missing_variant_visual",
    ]);
  }

  if (imageState === "missing") {
    return request.neq("image_status", "exact");
  }

  return request;
}

async function fetchSmartDiscoveryChildRows(
  options: SmartFilterDiscoveryOptions,
  parentRows: CardPrintLookupRow[],
) {
  const supabase = createServerComponentClient();
  const selectClause =
    "id,card_print_id,printing_gv_id,finish_key,image_source,image_path,image_url,image_alt_url,image_status,image_note,card_prints(id,gv_id,name,number,rarity,artist,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set_code,printed_set_abbrev,external_ids,variant_key,printed_identity_modifier,variants)";
  const finishKeys = normalizeFinishKeys(options.finishKeys);
  const parentIds = uniqueValues(parentRows.map((row) => row.id).filter(Boolean));
  const rowsByKey = new Map<string, CardPrintLookupRow>();

  const runChildQuery = async (scopedParentIds?: string[]) => {
    let request = supabase
      .from("card_printings")
      .select(selectClause)
      .order("printing_gv_id", { ascending: true })
      .limit(SMART_FILTER_DISCOVERY_LIMIT);

    if (scopedParentIds && scopedParentIds.length > 0) {
      request = request.in("card_print_id", scopedParentIds);
    }

    if (finishKeys.length > 0) {
      request = request.in("finish_key", finishKeys);
    }

    request = applySmartDiscoveryImageQueryFilter(request, options.imageState);

    const { data, error } = await request;
    if (error) {
      throw new Error(error.message);
    }

    for (const childRow of (data ?? []) as CardPrintingSmartLookupRow[]) {
      const mapped = mapSmartChildRowToCardPrintLookupRow(childRow);
      if (!mapped) {
        continue;
      }
      rowsByKey.set(mapped.printing_gv_id ?? mapped.search_card_printing_id ?? mapped.id, mapped);
    }
  };

  if (parentIds.length > 0) {
    for (const parentIdChunk of chunkArray(parentIds, 200)) {
      await runChildQuery(parentIdChunk);
    }
  } else {
    await runChildQuery();
  }

  return [...rowsByKey.values()].slice(0, SMART_FILTER_DISCOVERY_LIMIT);
}

export async function getExploreRowsForSmartFilterDiscovery(
  options: SmartFilterDiscoveryOptions,
): Promise<ExploreRow[]> {
  const parentRows = await fetchSmartDiscoverySeedParentRows(options);
  const childScopedRows = await fetchSmartDiscoveryChildRows(options, parentRows);
  const shouldRequireChildScope =
    normalizeFinishKeys(options.finishKeys).length > 0 ||
    Boolean(options.imageState && options.imageState !== "any");
  const exactRows = await filterSmartDiscoveryRowsByScope(
    childScopedRows.length > 0
      ? childScopedRows
      : shouldRequireChildScope
        ? []
        : parentRows,
    options,
  );
  const query = await buildResolverQuery(normalizeQuery(""));
  const setMetadataByCode = await fetchPublicSetMetadata(
    uniqueValues(exactRows.map((row) => row.set_code ?? "").filter(Boolean)),
  );
  const supabase = createServerComponentClient();
  const pricingByCardId = await getPublicPricingByCardIds(
    supabase,
    exactRows.map((row) => row.id),
  );
  const rows = await buildExploreRows(
    exactRows,
    new Map<string, string>(),
    setMetadataByCode,
    pricingByCardId,
  );

  return sortRows(rows, query, options.sortMode).slice(0, SMART_FILTER_DISCOVERY_LIMIT);
}

export async function getExploreRowsForSmartStructuredTextSearch(
  rawQuery: string,
  options: SmartFilterDiscoveryOptions,
): Promise<ExploreRow[]> {
  const packet = normalizeQuery(rawQuery);
  const query = await buildResolverQuery(packet);

  if (!query.normalized) {
    return getExploreRowsForSmartFilterDiscovery(options);
  }

  let parentRows = await fetchCardRowsByStructuredTextQuery(query);

  const exactSetCode = normalizeSetCode(options.exactSetCode);
  const identityFilter = normalizeIdentityFilterKey(options.identityFilter);
  const exactIllustrator = options.exactIllustrator?.trim();
  const expectedSetCodes = new Set(query.expectedSetCodes.map((code) => normalizeSetCode(code)));

  if (expectedSetCodes.size > 0) {
    parentRows = parentRows.filter((row) => expectedSetCodes.has(normalizeSetCode(row.set_code)));
  }

  if (exactSetCode) {
    parentRows = parentRows.filter((row) => normalizeSetCode(row.set_code) === exactSetCode);
  }

  if (exactIllustrator) {
    parentRows = parentRows.filter(
      (row) => normalizeIllustrator(row.artist) === normalizeIllustrator(exactIllustrator),
    );
  }

  if (isIdentityFilterActive(identityFilter)) {
    parentRows = parentRows.filter((row) => matchesIdentityFilter(row, identityFilter));
  }

  parentRows = applySmartStampParentFilter(parentRows, options.stampLabels);

  const childScopedRows = await fetchSmartDiscoveryChildRows(options, parentRows);
  if (childScopedRows.length === 0) {
    return [];
  }

  const setMetadataByCode = await fetchPublicSetMetadata(
    uniqueValues(childScopedRows.map((row) => row.set_code ?? "").filter(Boolean)),
  );
  const supabase = createServerComponentClient();
  const pricingByCardId = await getPublicPricingByCardIds(
    supabase,
    childScopedRows.map((row) => row.id),
  );
  const rows = await buildExploreRows(
    childScopedRows,
    new Map<string, string>(),
    setMetadataByCode,
    pricingByCardId,
  );
  const releaseFilteredRows = rows.filter((row) => {
    if (typeof options.exactReleaseYear === "number") {
      return row.release_year === options.exactReleaseYear;
    }
    if (
      typeof options.releaseYearMin === "number" &&
      (typeof row.release_year !== "number" || row.release_year < options.releaseYearMin)
    ) {
      return false;
    }
    if (
      typeof options.releaseYearMax === "number" &&
      (typeof row.release_year !== "number" || row.release_year > options.releaseYearMax)
    ) {
      return false;
    }
    return true;
  });

  return sortRows(releaseFilteredRows, query, options.sortMode).slice(0, SMART_FILTER_DISCOVERY_LIMIT);
}

export async function getExploreRowsForOwnedSmartFilterDiscovery(
  ownedCardPrintIds: string[],
  options: SmartFilterDiscoveryOptions,
): Promise<ExploreRow[]> {
  const parentRows = await fetchCardRowsByIds(ownedCardPrintIds);
  const shouldUseChildScope =
    normalizeFinishKeys(options.finishKeys).length > 0 ||
    Boolean(options.imageState && options.imageState !== "any");
  const exactRows = await filterSmartDiscoveryRowsByScope(
    shouldUseChildScope
      ? await fetchSmartDiscoveryChildRows(options, parentRows)
      : parentRows,
    options,
  );
  const query = await buildResolverQuery(normalizeQuery(""));
  const setMetadataByCode = await fetchPublicSetMetadata(
    uniqueValues(exactRows.map((row) => row.set_code ?? "").filter(Boolean)),
  );
  const supabase = createServerComponentClient();
  const pricingByCardId = await getPublicPricingByCardIds(
    supabase,
    exactRows.map((row) => row.id),
  );
  const rows = await buildExploreRows(
    exactRows,
    new Map<string, string>(),
    setMetadataByCode,
    pricingByCardId,
  );

  return sortRows(rows, query, options.sortMode).slice(0, SMART_FILTER_DISCOVERY_LIMIT);
}

async function fetchPublicSetMetadata(setCodes: string[]) {
  if (setCodes.length === 0) {
    return new Map<string, PublicSetMetadata>();
  }

  const supabase = createServerComponentClient();
  const { data, error } = await supabase
    .from("sets")
    .select("code,name,printed_total,release_date,identity_model")
    .in("code", setCodes);
  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as SetMetadataLookupRow[])
      .filter((row): row is SetMetadataLookupRow & { code: string } =>
        Boolean(row.code),
      )
      .map((row) => [
        row.code,
        {
          set_code: row.code,
          set_name: row.name ?? undefined,
          printed_total:
            typeof row.printed_total === "number"
              ? row.printed_total
              : undefined,
          release_date: row.release_date ?? undefined,
          release_year: getReleaseYear(row.release_date),
          identity_model: row.identity_model ?? undefined,
        },
      ]),
  );
}

export async function getExploreRowsPacketWithTiming(
  packet: NormalizedQueryPacket,
  sortMode: SortMode,
  exactSetCode: string,
  exactReleaseYear?: number,
  exactIllustrator?: string,
  identityFilter: IdentityFilterKey = "all",
  releaseYearMin?: number,
  releaseYearMax?: number,
): Promise<{ rows: ExploreRow[]; timing: ExploreRowsTiming }> {
  const totalStartMs = performance.now();
  const totalStartRemote = snapshotRemoteTiming();
  const buildQueryStage = await measureStage(() => buildResolverQuery(packet));
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

  if (
    !query.normalized &&
    !exactSetCode &&
    !exactReleaseYear &&
    !releaseYearMin &&
    !releaseYearMax &&
    !exactIllustrator &&
    !isIdentityFilterActive(identityFilter)
  ) {
    const totalRemote = diffRemoteTiming(
      totalStartRemote,
      snapshotRemoteTiming(),
    );
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
        postprocess_ms: roundTiming(
          Math.max(
            0,
            totalMs - buildQueryStage.timing.total_ms - totalRemote.remote_ms,
          ),
        ),
        top_match: null,
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
  let setAwareResults = {
    setNameById: new Map<string, string>(),
    tcgdexCardIds: [] as string[],
  };

  if (query.normalized) {
    const timedCandidates = await measureStage(async () =>
      Promise.all([
        fetchRpcIds(query),
        fetchPrintIdentitySearchRows(query),
        fetchSetAwareTcgdexCardIds(query),
      ]),
    );
    Object.assign(fetchCandidatesStage, timedCandidates.timing);

    const [rpcIds, printIdentityRows, resolvedSetAwareResults] = timedCandidates.value;
    setAwareResults = resolvedSetAwareResults;

    const timedExactRows = await measureStage(() =>
      fetchExactCardRows(
        rpcIds,
        printIdentityRows,
        resolvedSetAwareResults.tcgdexCardIds,
        query.directGvId,
        query.expectedSetCodes,
        query,
      ),
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

      if (typeof releaseYearMin === "number" || typeof releaseYearMax === "number") {
        return fetchCardRowsByReleaseYearRange(releaseYearMin, releaseYearMax);
      }

      if (isIdentityFilterActive(identityFilter)) {
        return fetchCardRowsByIdentityFilter(identityFilter);
      }

      return [] as CardPrintLookupRow[];
    });

    Object.assign(fallbackFetchStage, timedFallbackRows.timing);
    exactRows = timedFallbackRows.value;
  }

  const timedExactFilters = await measureStage(() => {
    let filteredRows = exactRows;

    if (query.expectedSetCodes.length > 0) {
      const expectedSetCodeSet = new Set(
        query.expectedSetCodes.map((code) => normalizeSetCode(code)),
      );
      filteredRows = filteredRows.filter((row) =>
        expectedSetCodeSet.has(normalizeSetCode(row.set_code)),
      );
    }

    if (query.rarityIntent.length > 0) {
      const rarityScopedRows = filteredRows.filter((row) =>
        query.rarityIntent.some(
          (intent) => getRarityIntentMatchStrength(row, intent) >= 1,
        ),
      );
      if (rarityScopedRows.length > 0) {
        filteredRows = rarityScopedRows;
      }
    }

    if (query.traitIntent.length > 0) {
      const traitScopedRows = filteredRows.filter((row) =>
        query.traitIntent.some(
          (intent) => getTraitIntentMatchStrength(row, intent) >= 1,
        ),
      );
      if (traitScopedRows.length > 0) {
        filteredRows = traitScopedRows;
      }
    }

    if (exactSetCode) {
      filteredRows = filteredRows.filter(
        (row) => normalizeSetCode(row.set_code) === exactSetCode,
      );
    }

    if (exactIllustrator) {
      filteredRows = filteredRows.filter(
        (row) =>
          normalizeIllustrator(row.artist) ===
          normalizeIllustrator(exactIllustrator),
      );
    }

    if (isIdentityFilterActive(identityFilter)) {
      filteredRows = filteredRows.filter((row) =>
        matchesIdentityFilter(row, identityFilter),
      );
    }

    return filteredRows;
  });
  Object.assign(exactFiltersStage, timedExactFilters.timing);
  exactRows = timedExactFilters.value;

  const timedSetMetadata = await measureStage(() =>
    fetchPublicSetMetadata(
      uniqueValues(exactRows.map((row) => row.set_code ?? "").filter(Boolean)),
    ),
  );
  Object.assign(fetchSetMetadataStage, timedSetMetadata.timing);
  const setMetadataByCode = timedSetMetadata.value;

  const supabase = createServerComponentClient();
  const timedPricing = await measureStage(() =>
    getPublicPricingByCardIds(
      supabase,
      exactRows.map((row) => row.id),
    ),
  );
  Object.assign(fetchPricingStage, timedPricing.timing);
  const pricingByCardId = timedPricing.value;

  const timedBuildRows = await measureStage(() =>
    buildExploreRows(
      exactRows,
      setAwareResults.setNameById,
      setMetadataByCode,
      pricingByCardId,
    ),
  );
  Object.assign(buildRowsStage, timedBuildRows.timing);
  const rows = timedBuildRows.value;

  const timedReleaseYearFilter = await measureStage(() => {
    if (typeof exactReleaseYear === "number") {
      return rows.filter((row) => row.release_year === exactReleaseYear);
    }

    if (typeof releaseYearMin === "number" || typeof releaseYearMax === "number") {
      return rows.filter((row) => {
        if (typeof row.release_year !== "number") {
          return false;
        }
        if (typeof releaseYearMin === "number" && row.release_year < releaseYearMin) {
          return false;
        }
        if (typeof releaseYearMax === "number" && row.release_year > releaseYearMax) {
          return false;
        }
        return true;
      });
    }

    return rows;
  });
  Object.assign(releaseYearFilterStage, timedReleaseYearFilter.timing);
  const filteredRows = timedReleaseYearFilter.value;

  const timedSortRows = await measureStage(() =>
    sortRows(filteredRows, query, sortMode),
  );
  Object.assign(sortRowsStage, timedSortRows.timing);

  const totalRemote = diffRemoteTiming(
    totalStartRemote,
    snapshotRemoteTiming(),
  );
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
      postprocess_ms: roundTiming(
        Math.max(
          0,
          totalMs - buildQueryStage.timing.total_ms - totalRemote.remote_ms,
        ),
      ),
      top_match: getTopMatchTrace(timedSortRows.value, query),
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

export async function getExploreRowsWithTiming(
  rawQuery: string,
  sortMode: SortMode,
  exactSetCode: string,
  exactReleaseYear?: number,
  exactIllustrator?: string,
  releaseYearMin?: number,
  releaseYearMax?: number,
): Promise<{ rows: ExploreRow[]; timing: ExploreRowsTiming }> {
  return getExploreRowsPacketWithTiming(
    normalizeQuery(rawQuery),
    sortMode,
    exactSetCode,
    exactReleaseYear,
    exactIllustrator,
    "all",
    releaseYearMin,
    releaseYearMax,
  );
}

export async function getExploreRows(
  rawQuery: string,
  sortMode: SortMode,
  exactSetCode: string,
  exactReleaseYear?: number,
  exactIllustrator?: string,
  releaseYearMin?: number,
  releaseYearMax?: number,
): Promise<ExploreRow[]> {
  return (
    await getExploreRowsWithTiming(
      rawQuery,
      sortMode,
      exactSetCode,
      exactReleaseYear,
      exactIllustrator,
      releaseYearMin,
      releaseYearMax,
    )
  ).rows;
}
