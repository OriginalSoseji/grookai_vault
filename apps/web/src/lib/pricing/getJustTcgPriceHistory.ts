import "server-only";

import { createClient } from "@supabase/supabase-js";

const DEFAULT_JUSTTCG_API_BASE_URL = "https://api.justtcg.com/v1";
const DEFAULT_FETCH_TIMEOUT_MS = 8000;

const HISTORY_DURATIONS = ["7d", "30d", "90d", "180d"] as const;

type JustTcgPriceHistoryDuration = (typeof HISTORY_DURATIONS)[number];

type ExternalMappingRow = {
  external_id: string | null;
};

type VariantSliceRow = {
  condition: string | null;
  printing: string | null;
  language: string | null;
  price: number | null;
  updated_at: string | null;
};

type JustTcgPriceHistoryEntry = {
  t?: number | null;
  p?: number | null;
};

type JustTcgVariant = {
  condition?: string | null;
  printing?: string | null;
  language?: string | null;
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

type SelectedSlice = {
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

export type JustTcgPriceHistoryResult = {
  condition: string;
  printing: string;
  duration: JustTcgPriceHistoryDuration;
  points: PriceHistoryPoint[];
  currentPrice: number | null;
  updatedAt: string | null;
};

export type GetJustTcgPriceHistoryInput = {
  cardPrintId: string;
  duration: JustTcgPriceHistoryDuration;
};

function createServerSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createClient(url, key);
}

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

function normalizeDate(value: string | null | undefined) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function roundPrice(value: number) {
  return Math.round(value * 100) / 100;
}

function conditionRank(value: string) {
  switch (normalizeText(value)) {
    case "near mint":
    case "nm":
      return 5;
    case "lightly played":
    case "lp":
      return 4;
    case "moderately played":
    case "mp":
      return 3;
    case "heavily played":
    case "hp":
      return 2;
    case "damaged":
    case "dmg":
      return 1;
    default:
      return 0;
  }
}

function printingRank(value: string) {
  const normalized = normalizeText(value);
  if (normalized === "normal") {
    return 3;
  }

  if (normalized === "reverse holofoil" || normalized === "reverse-holofoil") {
    return 2;
  }

  return 1;
}

function languageRank(value: string | null) {
  const normalized = normalizeText(value);
  if (normalized === "english") {
    return 2;
  }

  if (!normalized) {
    return 1;
  }

  return 0;
}

function toConditionLabel(value: string) {
  switch (normalizeText(value)) {
    case "near mint":
    case "nm":
      return "Near Mint";
    case "lightly played":
    case "lp":
      return "Lightly Played";
    case "moderately played":
    case "mp":
      return "Moderately Played";
    case "heavily played":
    case "hp":
      return "Heavily Played";
    case "damaged":
    case "dmg":
      return "Damaged";
    default:
      return value.trim();
  }
}

function toPrintingLabel(value: string) {
  const normalized = normalizeText(value);
  if (normalized === "normal") {
    return "Normal";
  }

  if (normalized === "reverse holofoil" || normalized === "reverse-holofoil") {
    return "Reverse Holofoil";
  }

  return value.trim();
}

function isNearMint(value: string) {
  const normalized = normalizeText(value);
  return normalized === "near mint" || normalized === "nm";
}

function isNormalPrinting(value: string) {
  return normalizeText(value) === "normal";
}

function isReverseHolofoilPrinting(value: string) {
  const normalized = normalizeText(value);
  return normalized === "reverse holofoil" || normalized === "reverse-holofoil";
}

function sortSliceRows(left: SelectedSlice, right: SelectedSlice) {
  const conditionDelta = conditionRank(right.condition) - conditionRank(left.condition);
  if (conditionDelta !== 0) {
    return conditionDelta;
  }

  const printingDelta = printingRank(right.printing) - printingRank(left.printing);
  if (printingDelta !== 0) {
    return printingDelta;
  }

  const languageDelta = languageRank(right.language) - languageRank(left.language);
  if (languageDelta !== 0) {
    return languageDelta;
  }

  const updatedDelta =
    new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime();
  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  return (right.currentPrice ?? 0) - (left.currentPrice ?? 0);
}

function pickSelectedSlice(rows: VariantSliceRow[]): SelectedSlice | null {
  const candidates = rows
    .map((row) => {
      const condition = row.condition?.trim() ?? "";
      const printing = row.printing?.trim() ?? "";
      if (!condition || !printing) {
        return null;
      }

      return {
        condition: toConditionLabel(condition),
        printing: toPrintingLabel(printing),
        language: row.language?.trim() || null,
        currentPrice: normalizePrice(row.price),
        updatedAt: normalizeDate(row.updated_at),
      } satisfies SelectedSlice;
    })
    .filter((row): row is SelectedSlice => Boolean(row));

  if (candidates.length === 0) {
    return null;
  }

  const nearMintNormal = candidates.filter(
    (row) => isNearMint(row.condition) && isNormalPrinting(row.printing),
  );
  if (nearMintNormal.length > 0) {
    return nearMintNormal.sort(sortSliceRows)[0];
  }

  const nearMintReverse = candidates.filter(
    (row) => isNearMint(row.condition) && isReverseHolofoilPrinting(row.printing),
  );
  if (nearMintReverse.length > 0) {
    return nearMintReverse.sort(sortSliceRows)[0];
  }

  const nearMintAny = candidates.filter((row) => isNearMint(row.condition));
  if (nearMintAny.length > 0) {
    return nearMintAny.sort(sortSliceRows)[0];
  }

  return candidates.sort(sortSliceRows)[0];
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

function selectHistoryVariant(variants: JustTcgVariant[], slice: SelectedSlice) {
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

    const englishDelta = languageRank(right.language ?? null) - languageRank(left.language ?? null);
    if (englishDelta !== 0) {
      return englishDelta;
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

function normalizePriceHistory(
  entries: JustTcgPriceHistoryEntry[],
): PriceHistoryPoint[] {
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

export function normalizeJustTcgHistoryDuration(
  value: string | null | undefined,
): JustTcgPriceHistoryDuration {
  return HISTORY_DURATIONS.includes(value as JustTcgPriceHistoryDuration)
    ? (value as JustTcgPriceHistoryDuration)
    : "30d";
}

export async function getJustTcgPriceHistory({
  cardPrintId,
  duration,
}: GetJustTcgPriceHistoryInput): Promise<JustTcgPriceHistoryResult | null> {
  const normalizedCardPrintId = cardPrintId.trim();
  if (!normalizedCardPrintId) {
    return null;
  }

  try {
    const supabase = createServerSupabase();

    const [{ data: mappingData, error: mappingError }, { data: sliceData, error: sliceError }] =
      await Promise.all([
        supabase
          .from("external_mappings")
          .select("external_id")
          .eq("card_print_id", normalizedCardPrintId)
          .eq("source", "justtcg")
          .eq("active", true)
          .maybeSingle(),
        supabase
          .from("justtcg_variant_prices_latest")
          .select("condition,printing,language,price,updated_at")
          .eq("card_print_id", normalizedCardPrintId),
      ]);

    if (mappingError) {
      console.error("[pricing:justtcg-history] mapping lookup failed", {
        cardPrintId: normalizedCardPrintId,
        error: mappingError,
      });
      return null;
    }

    if (sliceError) {
      console.error("[pricing:justtcg-history] slice lookup failed", {
        cardPrintId: normalizedCardPrintId,
        error: sliceError,
      });
      return null;
    }

    const justTcgCardId = (mappingData as ExternalMappingRow | null)?.external_id?.trim() ?? null;
    const selectedSlice = pickSelectedSlice((sliceData ?? []) as VariantSliceRow[]);

    if (!justTcgCardId || !selectedSlice) {
      return null;
    }

    const params = new URLSearchParams({
      cardId: justTcgCardId,
      condition: selectedSlice.condition,
      printing: selectedSlice.printing,
      include_price_history: "true",
      priceHistoryDuration: duration,
    });

    const response = await fetchJustTcgJson<JustTcgEnvelope<JustTcgCard>>("/cards", params);
    if (!response.ok) {
      console.error("[pricing:justtcg-history] history fetch failed", {
        cardPrintId: normalizedCardPrintId,
        justTcgCardId,
        condition: selectedSlice.condition,
        printing: selectedSlice.printing,
        duration,
        error: response.error,
      });

      return {
        condition: selectedSlice.condition,
        printing: selectedSlice.printing,
        duration,
        points: [],
        currentPrice: selectedSlice.currentPrice,
        updatedAt: selectedSlice.updatedAt,
      };
    }

    const card = unwrapData(response.payload)[0] ?? null;
    const variants = Array.isArray(card?.variants) ? card.variants : [];
    const selectedVariant = selectHistoryVariant(variants, selectedSlice);
    const points = selectedVariant ? normalizePriceHistory(readPriceHistoryEntries(selectedVariant, duration)) : [];
    const variantUpdatedAt =
      typeof selectedVariant?.lastUpdated === "number" && Number.isFinite(selectedVariant.lastUpdated)
        ? new Date(selectedVariant.lastUpdated * 1000).toISOString()
        : null;

    return {
      condition: selectedSlice.condition,
      printing: selectedSlice.printing,
      duration,
      points,
      currentPrice: normalizePrice(selectedVariant?.price) ?? selectedSlice.currentPrice,
      updatedAt: variantUpdatedAt ?? selectedSlice.updatedAt,
    };
  } catch (error) {
    console.error("[pricing:justtcg-history] getJustTcgPriceHistory failed", {
      cardPrintId: normalizedCardPrintId,
      duration,
      error,
    });
    return null;
  }
}
