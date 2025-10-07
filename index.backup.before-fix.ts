import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PtcgCard = {
  id?: string;
  name?: string;
  number?: string | number;
  images?: { small?: string; large?: string };
  set?: { id?: string };
  tcgplayer?: {
    prices?: Record<string, { low?: number; mid?: number; high?: number; market?: number }>;
  };
  cardmarket?: {
    prices?: { averageSellPrice?: number; trendPrice?: number; lowPrice?: number };
  };
};

type PriceRow = {
  card_id: string;
  ts: string;
  market_price: number;
  source: string;
  currency: string;
  set_code?: string | null;
  number?: string | null;
  name?: string | null;
  image_url?: string | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Normalize base so we end up with exactly ONE "/v2"
const RAW_BASE = (Deno.env.get("POKEMONTCG_API_BASE") ?? "https://api.pokemontcg.io").replace(/\/+$/,"");
const PTCG_API = RAW_BASE.endsWith("/v2") ? RAW_BASE : `${RAW_BASE}/v2`;
const PTCG_KEY = Deno.env.get("POKEMONTCG_API_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

// ---------- helpers ----------
function sleep(ms:number) { return new Promise(r => setTimeout(r, ms)); }
function jitter(ms:number) { return ms + Math.floor(Math.random() * (ms * 0.25)); }

/** GET JSON with retries on 429/500/502/503/504 */
async function getJsonWithRetry(url: string, dbg: any, max = 3): Promise<any> {
  for (let i = 0; i < max; i++) {
    const r = await fetch(url, { headers: { "X-Api-Key": PTCG_KEY, accept: "application/json" } });
    dbg.statuses.push({ url, status: r.status });
    if (r.ok) return await r.json();
    if ([429,500,502,503,504].includes(r.status)) {
      await sleep(jitter(400 * Math.pow(2, i)));
      continue;
    }
    throw new Error(`PokemonTCG.io ${r.status}`);
  }
  throw new Error(`PokemonTCG.io retry_exhausted`);
}

/** Normalize a card number for matching to DB */
function normNum(v: unknown): string {
  let s = (v ?? "").toString().trim().toUpperCase();
  if (!s) return s;
  s = s.replace(/[–—−]/g, "-");
  const m = s.match(/^0*([0-9]+)([A-Z]*)$/);
  if (m) s = String(parseInt(m[1], 10)) + (m[2] ?? "");
  return s;
}

const imgOf = (c: PtcgCard) => c.images?.large ?? c.images?.small ?? null;

/** Variant-aware price picker */
function priceOf(c: PtcgCard): number {
  const tp = c.tcgplayer?.prices ?? {};
  const variants = [
    "holofoil",
    "normal",
    "reverseHolofoil",
    "1stEditionHolofoil",
    "unlimitedHolofoil"
  ];

  for (const v of variants) {
    const p = (tp as any)[v];
    if (p && typeof p.market === "number" && isFinite(p.market) && p.market > 0) {
      return p.market;
    }
  }

  const first = Object.values(tp)[0] as any;
  const fromTp =
    typeof first?.market === "number" ? first.market :
    typeof first?.mid    === "number" ? first.mid    :
    typeof first?.high   === "number" ? first.high   :
    typeof first?.low    === "number" ? first.low    : null;
  if (typeof fromTp === "number" && isFinite(fromTp) && fromTp > 0) return fromTp;

  const cm = c.cardmarket?.prices ?? {};
  const fromCm =
    typeof cm.averageSellPrice === "number" ? cm.averageSellPrice :
    typeof cm.trendPrice       === "number" ? cm.trendPrice       :
    typeof cm.lowPrice         === "number" ? cm.lowPrice         : 0;
  return Number.isFinite(fromCm) ? fromCm : 0;
}

/** sv06 -> ["sv06","sv6"] */
function setCandidates(setCode: string): string[] {
  const m = setCode.match(/^([a-zA-Z]+)0+(\d+)$/);
  const alt = m ? `${m[1]}${m[2]}` : setCode;
  return alt !== setCode ? [setCode, alt] : [setCode];
}

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const setCode = (body?.setCode ?? body?.set_code ?? "").toString().trim();
    const page     = Math.max(1, Number(body?.page ?? 1));
    const pageSize = Math.max(25, Math.min(Number(body?.pageSize ?? 50), 100)); // default 50
    const source   = (body?.source ?? "tcgplayer").toString();
    const debug    = !!body?.debug;

    if (!setCode) {
      return new Response(JSON.stringify({ error: "Missing setCode" }), { status: 400 });
    }

    const dbg: any = { ptcgApi: PTCG_API, setCode, page, pageSize, candidates: setCandidates(setCode), statuses: [] };

    // Map set_code+number -> card_prints.id (once per call)
    const { data: prints, error: printsErr } = await sb
      .from("card_prints")
      .select("id, number")
      .eq("set_code", setCode);
    if (printsErr) {
      return new Response(JSON.stringify({ error: printsErr.message, step: "prints-query", debug: dbg }), { status: 500 });
    }
    const idByNum = new Map<string, string>();
    for (const p of prints ?? []) {
      const key = normNum((p as any).number);
      if (key) idByNum.set(key, (p as any).id);
    }

    // Pick candidate that returns data for this page
    let chosen: string | null = null;
    let j: any = null;
    for (const sid of dbg.candidates) {
      const q = encodeURIComponent(`set.id:${sid}`);
      const url = `${PTCG_API}/cards?q=${q}&page=${page}&pageSize=${pageSize}`;
      j = await getJsonWithRetry(url, dbg);
      const items = (j?.data ?? []) as PtcgCard[];
      if (items.length) { chosen = sid; break; }
    }
    if (!chosen) {
      const resp: any = { ok: true, setCode, page, pageSize, fetched: 0, matched: 0, inserted: 0, nextPage: null, totalPages: null };
      if (debug) resp.debug = dbg;
      return new Response(JSON.stringify(resp), { headers: { "Content-Type": "application/json" } });
    }
    dbg.chosen = chosen;

    // Use the previously fetched page if j is already set, else fetch
    if (!j || !j.data) {
      const q = encodeURIComponent(`set.id:${chosen}`);
      const url = `${PTCG_API}/cards?q=${q}&page=${page}&pageSize=${pageSize}`;
      j = await getJsonWithRetry(url, dbg);
    }

    const items = (j?.data ?? []) as PtcgCard[];
    const fetched = items.length;

    // Build rows for this page
    const nowIso = new Date().toISOString();
    let matched = 0;
    const rows: PriceRow[] = [];
    for (const c of items) {
      const n = normNum(c.number);
      if (!n) continue;
      const cardId = idByNum.get(n);
      if (!cardId) continue;
      matched++;
      const price = priceOf(c);
      rows.push({
        card_id: cardId,
        ts: nowIso,
        market_price: Number.isFinite(price) ? price : 0,
        source,
        currency: "USD",
        set_code: setCode,
        number: n,
        name: c.name ?? null,
        image_url: imgOf(c),
      });
    }

    // Insert this page in chunks
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 250) {
      const part = rows.slice(i, i + 250);
      const { error: insErr, count } = await sb.from("prices").insert(part, { count: "exact" });
      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message, step: "insert", page, n: part.length, debug: dbg }), { status: 500 });
      }
      inserted += count ?? part.length;
    }

    // Compute nextPage using totalCount if present, else by short page
    const totalCount = typeof j?.totalCount === "number" ? j.totalCount : null;
    const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : null;
    const nextPage = totalPages ? (page < totalPages ? page + 1 : null) : (fetched < pageSize ? null : page + 1);

    const resp: any = { ok: true, setCode, page, pageSize, fetched, matched, inserted, nextPage, totalPages };
    if (debug) resp.debug = dbg;
    return new Response(JSON.stringify(resp), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
