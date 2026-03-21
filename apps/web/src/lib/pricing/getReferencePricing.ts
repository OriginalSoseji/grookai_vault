import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { VariantFlags } from "@/lib/cards/variantPresentation";

export type ReferencePricingSource = "justtcg" | "none";
export type ReferencePricingConfidence = "medium" | "low" | "none";

export type ReferencePricing = {
  referenceAvailable: boolean;
  referenceSource: ReferencePricingSource;
  psa10Value: number | null;
  rawReferenceValue: number | null;
  referenceUpdatedAt: string | null;
  referenceConfidence: ReferencePricingConfidence;
  referenceNotes: string[];
  unavailableReason: string | null;
};

type CardReferenceRow = {
  id: string | null;
  name: string | null;
  number: string | null;
  number_plain: string | null;
  rarity: string | null;
  set_code: string | null;
  variant_key: string | null;
  variants: VariantFlags;
  external_ids: Record<string, unknown> | null;
  sets:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
  card_printings:
    | {
        finish_key: string | null;
        finish_keys:
          | {
              label: string | null;
              sort_order: number | null;
            }
          | {
              label: string | null;
              sort_order: number | null;
            }[]
          | null;
      }[]
    | null;
};

type ExternalMappingRow = {
  source: string | null;
  external_id: string | null;
};

type CardReferenceContext = {
  cardPrintId: string;
  name: string;
  number: string | null;
  numberPlain: string | null;
  rarity: string | null;
  setCode: string | null;
  setName: string | null;
  variantKey: string | null;
  variants: VariantFlags;
  finishNames: string[];
  externalIds: Record<string, unknown> | null;
  externalMappings: Record<string, string>;
};

type JustTcgSet = {
  id?: string;
  name?: string;
  game_id?: string;
  game?: string;
};

type JustTcgVariant = {
  id?: string;
  condition?: string;
  printing?: string;
  language?: string;
  price?: number;
  lastUpdated?: number;
};

type JustTcgCard = {
  id?: string;
  name?: string;
  game?: string;
  set?: string;
  set_name?: string;
  number?: string;
  rarity?: string;
  tcgplayerId?: string;
  variants?: JustTcgVariant[];
};

type JustTcgEnvelope<T> = {
  data?: T[] | T | null;
  error?: string | null;
  code?: string | null;
};

type JustTcgLookupMode = "justtcg-card-id" | "tcgplayer-id" | "search";

type JustTcgLookupResult = {
  card: JustTcgCard | null;
  notes: string[];
  mode: JustTcgLookupMode | null;
};

type ReferenceVariantSelection = {
  rawVariant: JustTcgVariant | null;
  psa10Variant: JustTcgVariant | null;
  notes: string[];
  confidence: ReferencePricingConfidence;
};

const DEFAULT_JUSTTCG_API_BASE_URL = "https://api.justtcg.com/v1";
const DEFAULT_FETCH_TIMEOUT_MS = 8000;
const POKEMON_GAME_ID = "pokemon";

function createServerSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, key);
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim())));
}

function normalizeText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeNumberToken(value?: string | null) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return null;
  }

  const upper = trimmed.toUpperCase();
  const slashMatch = upper.match(/^([A-Z]{0,4})(\d+)\s*\/\s*(\d+)$/);
  if (slashMatch) {
    const [, prefix, number] = slashMatch;
    return `${prefix}${String(Number.parseInt(number, 10))}`;
  }

  const plainMatch = upper.match(/^([A-Z]{0,4})(\d+)$/);
  if (plainMatch) {
    const [, prefix, number] = plainMatch;
    return `${prefix}${String(Number.parseInt(number, 10))}`;
  }

  return upper.replace(/\s+/g, "");
}

function toIsoTimestampFromUnixSeconds(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function readExternalId(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function loadCardReferenceContext(cardPrintId: string): Promise<CardReferenceContext | null> {
  const supabase = createServerSupabase();

  const [{ data: cardData, error: cardError }, { data: mappingData, error: mappingError }] = await Promise.all([
    supabase
      .from("card_prints")
      .select(
        `
          id,
          name,
          number,
          number_plain,
          rarity,
          set_code,
          variant_key,
          variants,
          external_ids,
          sets(name),
          card_printings(
            finish_key,
            finish_keys(label,sort_order)
          )
        `,
      )
      .eq("id", cardPrintId)
      .maybeSingle(),
    supabase
      .from("external_mappings")
      .select("source,external_id")
      .eq("card_print_id", cardPrintId)
      .eq("active", true)
      .in("source", ["justtcg", "tcgplayer"]),
  ]);

  if (cardError) {
    throw cardError;
  }

  if (mappingError) {
    throw mappingError;
  }

  if (!cardData) {
    return null;
  }

  const row = cardData as CardReferenceRow;
  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
  const finishNames = uniqueValues(
    (row.card_printings ?? []).flatMap((printing) => {
      const finishRecord = Array.isArray(printing.finish_keys) ? printing.finish_keys[0] : printing.finish_keys;
      return [printing.finish_key, finishRecord?.label];
    }),
  );
  const externalMappings = Object.fromEntries(
    ((mappingData ?? []) as ExternalMappingRow[])
      .filter((item): item is ExternalMappingRow & { source: string; external_id: string } => Boolean(item.source && item.external_id))
      .map((item) => [item.source, item.external_id]),
  );

  return {
    cardPrintId,
    name: row.name?.trim() ?? "",
    number: row.number?.trim() || null,
    numberPlain: row.number_plain?.trim() || null,
    rarity: row.rarity?.trim() || null,
    setCode: row.set_code?.trim() || null,
    setName: setRecord?.name?.trim() || null,
    variantKey: row.variant_key?.trim() || null,
    variants: row.variants ?? null,
    finishNames,
    externalIds: row.external_ids,
    externalMappings,
  };
}

function getJustTcgApiConfig() {
  const apiKey = (process.env.JUSTTCG_API_KEY ?? "").trim();
  const baseUrl = (process.env.JUSTTCG_API_BASE_URL ?? DEFAULT_JUSTTCG_API_BASE_URL).trim().replace(/\/+$/, "");

  return {
    apiKey,
    baseUrl,
  };
}

async function fetchJustTcgJson<T>(path: string, params: URLSearchParams) {
  const { apiKey, baseUrl } = getJustTcgApiConfig();
  if (!apiKey) {
    return {
      ok: false as const,
      status: 0,
      error: "Missing JUSTTCG_API_KEY.",
      payload: null as T | null,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}?${params.toString()}`, {
      headers: {
        "x-api-key": apiKey,
        accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as T | null;

    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        error:
          (payload as { error?: string | null } | null)?.error ??
          `JustTCG request failed with status ${response.status}.`,
        payload,
      };
    }

    return {
      ok: true as const,
      status: response.status,
      error: null,
      payload,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "JustTCG request timed out."
          : error.message
        : "Unknown JustTCG fetch error.";
    return {
      ok: false as const,
      status: 0,
      error: message,
      payload: null as T | null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function unwrapData<T>(envelope: JustTcgEnvelope<T> | null | undefined) {
  const data = envelope?.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (data) {
    return [data];
  }

  return [];
}

function chooseSetMatch(sets: JustTcgSet[], setName?: string | null) {
  const normalizedTarget = normalizeText(setName);
  if (!normalizedTarget) {
    return null;
  }

  const exact = sets.filter((item) => normalizeText(item.name) === normalizedTarget);
  if (exact.length === 1) {
    return exact[0];
  }

  if (exact.length > 1) {
    return null;
  }

  const contains = sets.filter((item) => normalizeText(item.name).includes(normalizedTarget) || normalizedTarget.includes(normalizeText(item.name)));
  if (contains.length === 1) {
    return contains[0];
  }

  return null;
}

function chooseCardCandidate(cards: JustTcgCard[], context: CardReferenceContext) {
  const targetName = normalizeText(context.name);
  const targetNumber = normalizeNumberToken(context.numberPlain ?? context.number);
  const targetSetName = normalizeText(context.setName);

  const matches = cards
    .map((card) => {
      let score = 0;

      if (normalizeText(card.name) === targetName) {
        score += 4;
      }
      if (targetNumber && normalizeNumberToken(card.number) === targetNumber) {
        score += 5;
      }
      if (targetSetName && normalizeText(card.set_name) === targetSetName) {
        score += 4;
      }
      if (context.rarity && card.rarity && normalizeText(card.rarity) === normalizeText(context.rarity)) {
        score += 1;
      }

      return { card, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1 && matches[0].score === matches[1].score) {
    return null;
  }

  const best = matches[0];
  if (best.score < 9) {
    return null;
  }

  return best.card;
}

function derivePrintingPreference(context: CardReferenceContext) {
  const finishText = normalizeText([context.variantKey, ...context.finishNames].join(" "));

  if (context.variants?.reverseHolo || context.variants?.reverse || finishText.includes("reverse")) {
    return {
      required: true,
      tokens: ["reverse"],
      note: "Reference printing preference matched reverse-holo style finishing.",
    };
  }

  if (context.variants?.stamped || finishText.includes("stamped")) {
    return {
      required: true,
      tokens: ["stamped"],
      note: "Reference printing preference matched stamped finishing.",
    };
  }

  if (context.variants?.holo || finishText.includes("foil") || finishText.includes("holo")) {
    return {
      required: true,
      tokens: ["foil", "holo"],
      note: "Reference printing preference matched holo/foil finishing.",
    };
  }

  return {
    required: false,
    tokens: ["normal"],
    note: "Reference printing preference defaulted to normal finishing.",
  };
}

function matchesPrinting(variant: JustTcgVariant, tokens: string[]) {
  const printing = normalizeText(variant.printing);
  if (!printing) {
    return false;
  }

  return tokens.some((token) => printing.includes(token));
}

function conditionRank(condition?: string | null) {
  const normalized = normalizeText(condition);
  switch (normalized) {
    case "near mint":
    case "nm":
      return 60;
    case "sealed":
    case "s":
      return 55;
    case "lightly played":
    case "lp":
      return 40;
    case "moderately played":
    case "mp":
      return 30;
    case "heavily played":
    case "hp":
      return 20;
    case "damaged":
    case "dmg":
      return 10;
    default:
      return 0;
  }
}

function chooseRawReferenceVariant(variants: JustTcgVariant[], context: CardReferenceContext, notes: string[]) {
  const englishVariants = variants.filter((variant) => normalizeText(variant.language || "english") === "english");
  const languageScoped = englishVariants.length > 0 ? englishVariants : variants;
  if (englishVariants.length > 0) {
    notes.push("Reference variant selection preferred English-language JustTCG variants.");
  } else if (variants.length > 0) {
    notes.push("No English-language JustTCG variants were found; reference selection used available language data.");
  }

  const printingPreference = derivePrintingPreference(context);
  const printingMatched = languageScoped.filter((variant) => matchesPrinting(variant, printingPreference.tokens));
  const printingScoped =
    printingMatched.length > 0
      ? printingMatched
      : printingPreference.required
        ? []
        : languageScoped;

  if (printingMatched.length > 0) {
    notes.push(printingPreference.note);
  } else if (printingPreference.required) {
    notes.push("No JustTCG variants matched the card's finish-specific printing cues.");
  } else {
    notes.push("Reference selection did not find a named normal printing and used available variants conservatively.");
  }

  return printingScoped
    .filter((variant) => typeof variant.price === "number" && Number.isFinite(variant.price) && variant.price > 0)
    .sort((left, right) => {
      const conditionDelta = conditionRank(right.condition) - conditionRank(left.condition);
      if (conditionDelta !== 0) {
        return conditionDelta;
      }

      const updatedDelta = (right.lastUpdated ?? 0) - (left.lastUpdated ?? 0);
      if (updatedDelta !== 0) {
        return updatedDelta;
      }

      return (right.price ?? 0) - (left.price ?? 0);
    })[0] ?? null;
}

function choosePsa10ReferenceVariant(rawVariant: JustTcgVariant | null, variants: JustTcgVariant[], notes: string[]) {
  const gradedVariant =
    variants.find((variant) => /(^|\s)(psa|bgs|cgc|sgc|tag)(\s|$)/i.test([variant.id, variant.condition, variant.printing].filter(Boolean).join(" "))) ??
    variants.find((variant) => /(gem mint 10|mint 10|pristine 10|black label 10)/i.test([variant.id, variant.condition, variant.printing].filter(Boolean).join(" ")));

  if (gradedVariant && typeof gradedVariant.price === "number" && Number.isFinite(gradedVariant.price) && gradedVariant.price > 0) {
    notes.push("JustTCG returned an explicit graded-style top-end variant, which was used as the PSA 10 reference input.");
    return {
      variant: gradedVariant,
      confidence: "medium" as const,
    };
  }

  // Current public JustTCG docs prove condition-specific raw variants, not PSA-grade slab variants.
  // V1 therefore uses the highest-grade clearly available raw-equivalent variant as a projection proxy
  // only when the best available condition is Near Mint or Sealed. If that proxy is not available,
  // the PSA 10 reference lane stays unavailable rather than silently guessing.
  if (rawVariant && conditionRank(rawVariant.condition) >= 55) {
    notes.push("JustTCG does not doc-prove PSA 10 slab pricing for this lane; V1 used the highest-grade available variant as a conservative PSA 10 proxy.");
    return {
      variant: rawVariant,
      confidence: "low" as const,
    };
  }

  notes.push("No explicit PSA 10-grade JustTCG variant was available, and no safe highest-grade proxy was found.");
  return {
    variant: null,
    confidence: "none" as const,
  };
}

function selectReferenceVariants(card: JustTcgCard, context: CardReferenceContext): ReferenceVariantSelection {
  const notes: string[] = [];
  const variants = Array.isArray(card.variants) ? card.variants : [];

  const rawVariant = chooseRawReferenceVariant(variants, context, notes);
  const psa10Selection = choosePsa10ReferenceVariant(rawVariant, variants, notes);

  return {
    rawVariant,
    psa10Variant: psa10Selection.variant,
    notes,
    confidence: psa10Selection.confidence,
  };
}

async function lookupBySetSearch(context: CardReferenceContext): Promise<JustTcgLookupResult> {
  if (!context.setName || !context.name) {
    return {
      card: null,
      notes: ["Reference lookup could not search JustTCG safely because set/name context was incomplete."],
      mode: null,
    };
  }

  const setParams = new URLSearchParams({
    game: POKEMON_GAME_ID,
    q: context.setName,
  });

  const setResponse = await fetchJustTcgJson<JustTcgEnvelope<JustTcgSet>>("/sets", setParams);
  if (!setResponse.ok) {
    return {
      card: null,
      notes: [`JustTCG set lookup failed: ${setResponse.error}`],
      mode: null,
    };
  }

  const setMatch = chooseSetMatch(unwrapData(setResponse.payload), context.setName);
  if (!setMatch?.id) {
    return {
      card: null,
      notes: ["JustTCG set search did not produce a unique safe set match for this card."],
      mode: null,
    };
  }

  const searchParams = new URLSearchParams({
    game: POKEMON_GAME_ID,
    set: setMatch.id,
    q: context.name,
    include_price_history: "false",
    include_statistics: "7d",
  });
  const normalizedNumber = normalizeNumberToken(context.numberPlain ?? context.number);
  if (normalizedNumber) {
    searchParams.set("number", normalizedNumber);
  }

  const cardsResponse = await fetchJustTcgJson<JustTcgEnvelope<JustTcgCard>>("/cards", searchParams);
  if (!cardsResponse.ok) {
    return {
      card: null,
      notes: [`JustTCG card search failed: ${cardsResponse.error}`],
      mode: null,
    };
  }

  const candidate = chooseCardCandidate(unwrapData(cardsResponse.payload), context);
  if (!candidate) {
    return {
      card: null,
      notes: ["JustTCG card search did not return a unique deterministic card match."],
      mode: null,
    };
  }

  return {
    card: candidate,
    notes: [
      `Reference lookup used search-based set resolution for "${context.setName}" before selecting a JustTCG card.`,
    ],
    mode: "search",
  };
}

async function fetchReferenceCard(context: CardReferenceContext): Promise<JustTcgLookupResult> {
  const justTcgCardId = readExternalId(context.externalIds, "justtcg") ?? context.externalMappings.justtcg ?? null;
  if (justTcgCardId) {
    const response = await fetchJustTcgJson<JustTcgEnvelope<JustTcgCard>>("/cards", new URLSearchParams({ cardId: justTcgCardId }));
    if (response.ok) {
      const card = unwrapData(response.payload)[0] ?? null;
      if (card) {
        return {
          card,
          notes: ["Reference lookup used an existing JustTCG card mapping."],
          mode: "justtcg-card-id",
        };
      }
    }
    const fallback = await lookupBySetSearch(context);
    return {
      card: fallback.card,
      notes: [`JustTCG mapped card lookup failed: ${response.error}`, ...fallback.notes],
      mode: fallback.mode,
    };
  }

  const tcgplayerId =
    readExternalId(context.externalIds, "tcgplayer") ??
    readExternalId(context.externalIds, "tcgplayerId") ??
    context.externalMappings.tcgplayer ??
    null;
  if (tcgplayerId) {
    const response = await fetchJustTcgJson<JustTcgEnvelope<JustTcgCard>>("/cards", new URLSearchParams({ tcgplayerId }));
    if (response.ok) {
      const card = unwrapData(response.payload)[0] ?? null;
      if (card) {
        return {
          card,
          notes: ["Reference lookup used an existing TCGplayer external identifier."],
          mode: "tcgplayer-id",
        };
      }
    }
    const fallback = await lookupBySetSearch(context);
    return {
      card: fallback.card,
      notes: [`JustTCG tcgplayerId lookup failed: ${response.error}`, ...fallback.notes],
      mode: fallback.mode,
    };
  }

  return lookupBySetSearch(context);
}

function buildUnavailableReference(reason: string, notes: string[] = []): ReferencePricing {
  return {
    referenceAvailable: false,
    referenceSource: "none",
    psa10Value: null,
    rawReferenceValue: null,
    referenceUpdatedAt: null,
    referenceConfidence: "none",
    referenceNotes: uniqueValues([
      "Reference lane only. Never market truth.",
      "Projection only. Not current market price.",
      ...notes,
    ]),
    unavailableReason: reason,
  };
}

// Reference-lane invariant:
// This helper is read-only and non-authoritative. It may call an external vendor API,
// but it never writes to Grookai storage, never feeds `pricing_observations`, and never
// returns values that should be treated as Grookai raw market truth.
export async function getReferencePricing(cardPrintId: string): Promise<ReferencePricing> {
  const { apiKey } = getJustTcgApiConfig();
  if (!apiKey) {
    return buildUnavailableReference("No JustTCG reference source is configured for this environment yet.");
  }

  try {
    const context = await loadCardReferenceContext(cardPrintId);
    if (!context) {
      return buildUnavailableReference("Card context could not be resolved for reference pricing.");
    }

    const lookup = await fetchReferenceCard(context);
    if (!lookup.card) {
      return buildUnavailableReference(
        "No JustTCG reference value is available for this card yet.",
        lookup.notes,
      );
    }

    const selection = selectReferenceVariants(lookup.card, context);
    const rawReferenceValue =
      typeof selection.rawVariant?.price === "number" && Number.isFinite(selection.rawVariant.price)
        ? selection.rawVariant.price
        : null;
    const psa10Value =
      typeof selection.psa10Variant?.price === "number" && Number.isFinite(selection.psa10Variant.price)
        ? selection.psa10Variant.price
        : null;
    const referenceUpdatedAt =
      toIsoTimestampFromUnixSeconds(selection.psa10Variant?.lastUpdated ?? null) ??
      toIsoTimestampFromUnixSeconds(selection.rawVariant?.lastUpdated ?? null);
    const referenceAvailable = rawReferenceValue !== null || psa10Value !== null;
    const referenceConfidence =
      selection.confidence === "medium" && lookup.mode === "search" ? "low" : selection.confidence;

    if (!referenceAvailable) {
      return buildUnavailableReference(
        "No usable JustTCG reference value is available for this card yet.",
        [...lookup.notes, ...selection.notes],
      );
    }

    return {
      referenceAvailable: true,
      referenceSource: "justtcg",
      psa10Value,
      rawReferenceValue,
      referenceUpdatedAt,
      referenceConfidence,
      referenceNotes: uniqueValues([
        "Reference lane only. Never market truth.",
        "Projection only. Not current market price.",
        ...lookup.notes,
        ...selection.notes,
      ]),
      unavailableReason: null,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown JustTCG reference error.";
    console.error("[pricing:reference] getReferencePricing failed", {
      cardPrintId,
      detail,
      error,
    });
    return buildUnavailableReference("JustTCG reference lookup failed for this card.", [detail]);
  }
}
