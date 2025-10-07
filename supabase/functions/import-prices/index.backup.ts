// supabase/functions/import-prices/index.ts
// Importer: PokémonTCG -> price_observations
// Notes:
// - Handles set_code variants (sv2 vs sv02) via codeVariants()
// - Normalizes numbers via normNum()

import type { Serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface PtcgPrices {
  market?: number;
  mid?: number;
  low?: number;
  high?: number;
}

interface PtcgCardPrices {
  holofoil?: PtcgPrices;
  normal?: PtcgPrices;
  reverseHolofoil?: PtcgPrices;
  "1stEditionHolofoil"?: PtcgPrices;
  unlimitedHolofoil?: PtcgPrices;
  // add others here if needed
}

interface PtcgCard {
  id: string;
  name: string;
  set: { id: string; name: string; series: string };
  number: string; // e.g. "1", "001", "1a", "1/198"
  tcgplayer?: { prices?: PtcgCardPrices };
}

type DbPriceObservation = {
  set_code: string;
  number: string;
  variant: string;    // 'holofoil', 'normal', etc.
  price_market: number | null;
  price_mid: number | null;
  price_low: number | null;
  price_high: number | null;
  source: "tcgplayer";
  observed_at: string; // ISO
};

// --- Helpers ---------------------------------------------------------------

/**
 * Produce reasonable variants for a set code:
 *  - lowercases and strips spaces
 *  - toggles svX <-> sv0X (e.g. sv2 <-> sv02)
 *  - dedupes
 */
function codeVariants(raw: string): string[] {
  const base = (raw || "").toLowerCase().replace(/\s+/g, "");
  const out = new Set<string>([base]);

  // Toggle svX <-> sv0X
  const m1 = base.match(/^sv(\d{1,2})$/);
  if (m1) out.add(`sv0${m1[1]}`);
  const m2 = base.match(/^sv0(\d{1,2})$/);
  if (m2) out.add(`sv${m2[1]}`);

  // Add dash version (some DBs use sv02-)
  for (const v of Array.from(out)) {
    out.add(v.replace(/^sv0?(\d{1,2})$/, (_m, d) => `sv${d}`));
    out.add(v.replace(/^sv0?(\d{1,2})$/, (_m, d) => `sv0${d}`));
  }

  return Array.from(out);
}

/**
 * Normalize a card number to match DB:
 *  - Keep alphanumerics only for the "core" (e.g., 1a stays 1a)
 *  - If purely numeric, left-pad to 3 (001..999)
 *  - Drop trailing "/xxx" if present (store the left side)
 */
function normNum(n: string): string {
  const left = String(n || "")
    .trim()
    .split("/")[0]; // "1/198" -> "1"

  // keep alphanumerics only (dash, spaces -> removed)
  const core = left.replace(/[^0-9a-z]/gi, "");

  if (/^\d+$/.test(core)) {
    // pure numeric -> pad to 3
    const num = parseInt(core, 10);
    if (Number.isFinite(num)) return num.toString().padStart(3, "0");
  }

  // mixed like "1a", "001a" -> normalize leading zeros on the numeric prefix
  const m = core.match(/^(\d+)([a-z]+)$/i);
  if (m) {
    const nPart = parseInt(m[1], 10);
    const suffix = m[2].toLowerCase();
    return `${nPart.toString().padStart(3, "0")}${suffix}`;
  }

  return core.toLowerCase();
}

/**
 * Flatten TCGplayer prices into rows for each known variant.
 */
function pricesToRows(
  set_code: string,
  number: string,
  prices?: PtcgCardPrices
): DbPriceObservation[] {
  if (!prices) return [];
  const variants = [
    "holofoil",
    "normal",
    "reverseHolofoil",
    "1stEditionHolofoil",
    "unlimitedHolofoil",
  ] as const;

  const now = new Date().toISOString();
  const rows: DbPriceObservation[] = [];

  for (const v of variants) {
    // deno-lint-ignore no-explicit-any
    const p: any = (prices as any)[v];
    if (!p) continue;

    rows.push({
      set_code,
      number,
      variant: v,
      price_market: typeof p.market === "number" ? p.market : null,
      price_mid: typeof p.mid === "number" ? p.mid : null,
      price_low: typeof p.low === "number" ? p.low : null,
      price_high: typeof p.high === "number" ? p.high : null,
      source: "tcgplayer",
      observed_at: now,
    });
  }
  return rows;
}

// --- Minimal pg client via Deno KV/HTTP fetch to Supabase PostgREST --------
// We’ll write via PostgREST (service key in env) to avoid adding deps.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Insert rows with upsert-like behavior (let your DB constraints/indexes dedupe).
async function insertPriceObservations(rows: DbPriceObservation[]) {
  if (!rows.length) return { count: 0 };

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/price_observations`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Failed to insert price_observations (${resp.status}): ${text}`
    );
  }
  return { count: rows.length };
}

// --- PokémonTCG API fetch ---------------------------------------------------

const POKEMON_TCG_KEY = Deno.env.get("POKEMON_TCG_API_KEY") ?? "";

async function fetchCardsBySetCode(setCode: string): Promise<PtcgCard[]> {
  // PokemonTCG API v2: https://api.pokemontcg.io/v2/cards?q=set.id:<setid>
  const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${encodeURIComponent(
    setCode
  )}&pageSize=250`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (POKEMON_TCG_KEY) headers["X-Api-Key"] = POKEMON_TCG_KEY;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`PokémonTCG fetch ${res.status}`);
  const json = await res.json();
  return json?.data ?? [];
}

// --- Main handler -----------------------------------------------------------

export const handler: Parameters<Serve>[0] = async (req) => {
  try {
    const { set_code, debug } = await req.json().catch(() => ({}));

    if (!set_code) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing set_code" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const tried: string[] = [];
    let fetched: PtcgCard[] = [];

    for (const c of codeVariants(set_code)) {
      tried.push(c);
      try {
        const cards = await fetchCardsBySetCode(c);
        if (cards.length > 0) {
          fetched = cards;
          if (debug) console.log(`[import-prices] using set_code=${c}, cards=${cards.length}`);
          break;
        }
      } catch (_e) {
        // try next variant
      }
    }

    if (!fetched.length) {
      return new Response(
        JSON.stringify({
          ok: true,
          tried,
          fetched: 0,
          inserted: 0,
          note:
            "No cards returned for any set_code variant. Check DB set_code vs PokémonTCG set.id.",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Build rows
    const rows: DbPriceObservation[] = [];
    for (const card of fetched) {
      const n = normNum(card.number);
      rows.push(...pricesToRows(set_code.toLowerCase(), n, card.tcgplayer?.prices));
    }

    // Filter out rows with all-null prices (optional)
    const filtered = rows.filter(
      (r) =>
        r.price_market !== null ||
        r.price_mid !== null ||
        r.price_low !== null ||
        r.price_high !== null
    );

    const { count } = await insertPriceObservations(filtered);

    return new Response(
      JSON.stringify({
        ok: true,
        tried,
        fetched: fetched.length,
        staged: rows.length,
        inserted: count,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Deno serve
export default {
  fetch: handler,
} satisfies Record<string, unknown>;
