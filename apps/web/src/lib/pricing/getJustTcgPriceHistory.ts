import "server-only";

const DEFAULT_JUSTTCG_API_BASE_URL = "https://api.justtcg.com/v1";
const DEFAULT_FETCH_TIMEOUT_MS = 8000;

export const JUSTTCG_HISTORY_DURATIONS = ["7d", "30d", "90d", "180d"] as const;

type LookupMode = "variant" | "card";
type JustTcgPriceHistoryDuration = (typeof JUSTTCG_HISTORY_DURATIONS)[number];

type JustTcgPriceHistoryEntry = {
  t?: number | null;
  p?: number | null;
};

type JustTcgVariant = {
  id?: string | null;
  condition?: string | null;
  printing?: string | null;
  language?: string | null;
  tcgplayerSkuId?: string | null;
  price?: number | null;
  lastUpdated?: number | null;
  priceHistory?: JustTcgPriceHistoryEntry[] | null;
  priceHistory30d?: JustTcgPriceHistoryEntry[] | null;
};

type JustTcgCard = {
  id?: string | null;
  variants?: JustTcgVariant[] | null;
};

type JustTcgEnvelope<T> = {
  data?: T[] | T | null;
  error?: string | null;
};

type HistoryLookupAttemptResult = {
  points: PriceHistoryPoint[];
  currentPrice: number | null;
  updatedAt: string | null;
};

type HistoryLookupAttempt = {
  result: HistoryLookupAttemptResult | null;
  rawPointCount: number;
  normalizedPointCount: number;
  reason: string | null;
};

export type MarketAnalysisSelectedSlice = {
  variantId: string;
  condition: string;
  printing: string;
  language: string | null;
  currentPrice: number | null;
  updatedAt: string | null;
};

export type PriceHistoryPoint = {
  date: string;
  price: number;
};

export type JustTcgPriceHistoryDiagnostics = {
  identifierPathUsed: LookupMode | null;
  variantAttemptRawCount: number;
  variantAttemptNormalizedCount: number;
  cardAttemptRawCount: number;
  cardAttemptNormalizedCount: number;
  usedCardFallback: boolean;
  noHistoryReason: string | null;
};

export type JustTcgPriceHistoryResult = {
  duration: JustTcgPriceHistoryDuration;
  points: PriceHistoryPoint[];
  hasHistory: boolean;
  currentPrice: number | null;
  updatedAt: string | null;
  diagnostics: JustTcgPriceHistoryDiagnostics;
};

export type GetJustTcgPriceHistoryInput = {
  cardPrintId: string;
  selectedSlice: MarketAnalysisSelectedSlice;
  duration: JustTcgPriceHistoryDuration;
  justTcgCardId?: string | null;
};

function getJustTcgApiConfig() {
  const apiKey = (process.env.JUSTTCG_API_KEY ?? "").trim();
  const baseUrl = (process.env.JUSTTCG_API_BASE_URL ?? DEFAULT_JUSTTCG_API_BASE_URL).trim().replace(/\/+$/, "");

  return {
    apiKey,
    baseUrl,
  };
}

function unwrapData<T>(payload: JustTcgEnvelope<T> | null | undefined) {
  const data = payload?.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (data) {
    return [data];
  }

  return [];
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roundPrice(value: number) {
  return Math.round(value * 100) / 100;
}

function readIsoTimestampFromUnixSeconds(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000).toISOString();
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

function selectHistoryVariant(variants: JustTcgVariant[], slice: MarketAnalysisSelectedSlice) {
  const exactVariant = variants.find((variant) => normalizeText(variant.id) === normalizeText(slice.variantId));
  if (exactVariant) {
    return exactVariant;
  }

  const matching = variants.filter(
    (variant) =>
      normalizeText(variant.condition) === normalizeText(slice.condition) &&
      normalizeText(variant.printing) === normalizeText(slice.printing),
  );

  if (matching.length === 0) {
    return null;
  }

  return matching.sort((left, right) => {
    const preferredLanguage = normalizeText(slice.language);
    const leftPreferred = normalizeText(left.language) === preferredLanguage ? 1 : 0;
    const rightPreferred = normalizeText(right.language) === preferredLanguage ? 1 : 0;
    if (leftPreferred !== rightPreferred) {
      return rightPreferred - leftPreferred;
    }

    const leftEnglish = normalizeText(left.language) === "english" ? 1 : 0;
    const rightEnglish = normalizeText(right.language) === "english" ? 1 : 0;
    if (leftEnglish !== rightEnglish) {
      return rightEnglish - leftEnglish;
    }

    const updatedDelta = (right.lastUpdated ?? 0) - (left.lastUpdated ?? 0);
    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return (right.price ?? 0) - (left.price ?? 0);
  })[0];
}

function readPriceHistoryEntries(variant: JustTcgVariant, duration: JustTcgPriceHistoryDuration) {
  if (Array.isArray(variant.priceHistory)) {
    return variant.priceHistory;
  }

  if (duration === "30d" && Array.isArray(variant.priceHistory30d)) {
    return variant.priceHistory30d;
  }

  return [];
}

function normalizePriceHistory(entries: JustTcgPriceHistoryEntry[]): PriceHistoryPoint[] {
  const pointsByDate = new Map<string, { timestamp: number; price: number }>();

  const sortedEntries = entries
    .filter(
      (entry): entry is { t: number; p: number } =>
        typeof entry.t === "number" &&
        Number.isFinite(entry.t) &&
        entry.t > 0 &&
        typeof entry.p === "number" &&
        Number.isFinite(entry.p) &&
        entry.p > 0,
    )
    .sort((left, right) => left.t - right.t);

  for (const entry of sortedEntries) {
    const date = new Date(entry.t * 1000);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const key = date.toISOString().slice(0, 10);
    pointsByDate.set(key, {
      timestamp: entry.t,
      price: roundPrice(entry.p),
    });
  }

  return Array.from(pointsByDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      price: value.price,
    }));
}

function logHistoryDiagnostic(details: {
  cardPrintId: string;
  slice: MarketAnalysisSelectedSlice;
  mode: LookupMode;
  rawCount: number;
  normalizedCount: number;
  reason: string;
}) {
  console.warn("[pricing:justtcg-history] history lookup did not produce usable points", {
    cardPrintId: details.cardPrintId,
    slice: {
      variantId: details.slice.variantId,
      condition: details.slice.condition,
      printing: details.slice.printing,
      language: details.slice.language,
    },
    identifierType: details.mode,
    rawHistoryPointCount: details.rawCount,
    normalizedPointCount: details.normalizedCount,
    reason: details.reason,
  });
}

async function fetchHistoryByVariantId({
  cardPrintId,
  selectedSlice,
  duration,
}: {
  cardPrintId: string;
  selectedSlice: MarketAnalysisSelectedSlice;
  duration: JustTcgPriceHistoryDuration;
}): Promise<HistoryLookupAttempt> {
  const response = await fetchJustTcgJson<JustTcgEnvelope<JustTcgCard>>(
    "/cards",
    new URLSearchParams({
      variantId: selectedSlice.variantId,
      include_price_history: "true",
      priceHistoryDuration: duration,
    }),
  );

  if (!response.ok) {
    logHistoryDiagnostic({
      cardPrintId,
      slice: selectedSlice,
      mode: "variant",
      rawCount: 0,
      normalizedCount: 0,
      reason: response.error,
    });
    return {
      result: null,
      rawPointCount: 0,
      normalizedPointCount: 0,
      reason: response.error,
    };
  }

  const card = unwrapData(response.payload)[0] ?? null;
  const variants = Array.isArray(card?.variants) ? card.variants : [];
  const selectedVariant = selectHistoryVariant(variants, selectedSlice);
  const rawEntries = selectedVariant ? readPriceHistoryEntries(selectedVariant, duration) : [];
  const points = normalizePriceHistory(rawEntries);

  if (points.length === 0) {
    logHistoryDiagnostic({
      cardPrintId,
      slice: selectedSlice,
      mode: "variant",
      rawCount: rawEntries.length,
      normalizedCount: points.length,
      reason: selectedVariant ? "Variant lookup returned zero usable history points." : "Variant lookup returned no exact matching variant.",
    });
    return {
      result: null,
      rawPointCount: rawEntries.length,
      normalizedPointCount: points.length,
      reason: selectedVariant ? "Variant lookup returned zero usable history points." : "Variant lookup returned no exact matching variant.",
    };
  }

  return {
    result: {
      points,
      currentPrice: normalizePrice(selectedVariant?.price) ?? selectedSlice.currentPrice,
      updatedAt: readIsoTimestampFromUnixSeconds(selectedVariant?.lastUpdated) ?? selectedSlice.updatedAt,
    },
    rawPointCount: rawEntries.length,
    normalizedPointCount: points.length,
    reason: null,
  };
}

async function fetchHistoryByCardId({
  cardPrintId,
  selectedSlice,
  duration,
  justTcgCardId,
}: {
  cardPrintId: string;
  selectedSlice: MarketAnalysisSelectedSlice;
  duration: JustTcgPriceHistoryDuration;
  justTcgCardId: string;
}): Promise<HistoryLookupAttempt> {
  const response = await fetchJustTcgJson<JustTcgEnvelope<JustTcgCard>>(
    "/cards",
    new URLSearchParams({
      cardId: justTcgCardId,
      include_price_history: "true",
      priceHistoryDuration: duration,
    }),
  );

  if (!response.ok) {
    logHistoryDiagnostic({
      cardPrintId,
      slice: selectedSlice,
      mode: "card",
      rawCount: 0,
      normalizedCount: 0,
      reason: response.error,
    });
    return {
      result: null,
      rawPointCount: 0,
      normalizedPointCount: 0,
      reason: response.error,
    };
  }

  const card = unwrapData(response.payload)[0] ?? null;
  const variants = Array.isArray(card?.variants) ? card.variants : [];
  const selectedVariant = selectHistoryVariant(variants, selectedSlice);
  const rawEntries = selectedVariant ? readPriceHistoryEntries(selectedVariant, duration) : [];
  const points = normalizePriceHistory(rawEntries);

  if (points.length === 0) {
    logHistoryDiagnostic({
      cardPrintId,
      slice: selectedSlice,
      mode: "card",
      rawCount: rawEntries.length,
      normalizedCount: points.length,
      reason: selectedVariant ? "Card fallback returned zero usable history points." : "Card fallback returned no exact matching variant.",
    });
    return {
      result: null,
      rawPointCount: rawEntries.length,
      normalizedPointCount: points.length,
      reason: selectedVariant ? "Card fallback returned zero usable history points." : "Card fallback returned no exact matching variant.",
    };
  }

  return {
    result: {
      points,
      currentPrice: normalizePrice(selectedVariant?.price) ?? selectedSlice.currentPrice,
      updatedAt: readIsoTimestampFromUnixSeconds(selectedVariant?.lastUpdated) ?? selectedSlice.updatedAt,
    },
    rawPointCount: rawEntries.length,
    normalizedPointCount: points.length,
    reason: null,
  };
}

export function normalizeJustTcgHistoryDuration(
  value: string | null | undefined,
): JustTcgPriceHistoryDuration {
  return JUSTTCG_HISTORY_DURATIONS.includes(value as JustTcgPriceHistoryDuration)
    ? (value as JustTcgPriceHistoryDuration)
    : "30d";
}

export async function getJustTcgPriceHistory({
  cardPrintId,
  selectedSlice,
  duration,
  justTcgCardId,
}: GetJustTcgPriceHistoryInput): Promise<JustTcgPriceHistoryResult> {
  const normalizedCardPrintId = cardPrintId.trim();

  const variantAttempt = await fetchHistoryByVariantId({
    cardPrintId: normalizedCardPrintId,
    selectedSlice,
    duration,
  });

  if (variantAttempt.result) {
    return {
      duration,
      points: variantAttempt.result.points,
      hasHistory: true,
      currentPrice: variantAttempt.result.currentPrice,
      updatedAt: variantAttempt.result.updatedAt,
      diagnostics: {
        identifierPathUsed: "variant",
        variantAttemptRawCount: variantAttempt.rawPointCount,
        variantAttemptNormalizedCount: variantAttempt.normalizedPointCount,
        cardAttemptRawCount: 0,
        cardAttemptNormalizedCount: 0,
        usedCardFallback: false,
        noHistoryReason: null,
      },
    };
  }

  let cardAttempt: HistoryLookupAttempt | null = null;
  if (justTcgCardId) {
    cardAttempt = await fetchHistoryByCardId({
      cardPrintId: normalizedCardPrintId,
      selectedSlice,
      duration,
      justTcgCardId,
    });

    if (cardAttempt.result) {
      return {
        duration,
        points: cardAttempt.result.points,
        hasHistory: true,
        currentPrice: cardAttempt.result.currentPrice,
        updatedAt: cardAttempt.result.updatedAt,
        diagnostics: {
          identifierPathUsed: "card",
          variantAttemptRawCount: variantAttempt.rawPointCount,
          variantAttemptNormalizedCount: variantAttempt.normalizedPointCount,
          cardAttemptRawCount: cardAttempt.rawPointCount,
          cardAttemptNormalizedCount: cardAttempt.normalizedPointCount,
          usedCardFallback: true,
          noHistoryReason: null,
        },
      };
    }
  }

  return {
    duration,
    points: [],
    hasHistory: false,
    currentPrice: selectedSlice.currentPrice,
    updatedAt: selectedSlice.updatedAt,
    diagnostics: {
      identifierPathUsed: null,
      variantAttemptRawCount: variantAttempt.rawPointCount,
      variantAttemptNormalizedCount: variantAttempt.normalizedPointCount,
      cardAttemptRawCount: cardAttempt?.rawPointCount ?? 0,
      cardAttemptNormalizedCount: cardAttempt?.normalizedPointCount ?? 0,
      usedCardFallback: Boolean(justTcgCardId),
      noHistoryReason:
        cardAttempt?.reason ??
        variantAttempt.reason ??
        (justTcgCardId
          ? "Exact variant lookup and card-level fallback both produced no usable history."
          : "Exact variant lookup produced no usable history and no card-level fallback mapping existed."),
    },
  };
}
