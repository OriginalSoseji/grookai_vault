/* supabase/functions/import-prices/index.ts
   Importer: PokémonTCG -> public.price_observations
   - Input: { set_code | set | setCode | code } + optional { cardLimit, cardOffset, debug }
   - Robust set code variants (.5<->pt5, svX<->sv0X, aliases)
   - No-throw fetch with query fallbacks; returns diag when debug=true
   - Writes via PostgREST using SERVICE_ROLE_KEY from Secrets (never from clients)
*/

const SUPABASE_URL =
  Deno.env.get("PROJECT_URL") ||
  Deno.env.get("SUPABASE_URL") ||
  Deno.env.get("SB_URL") || "";

const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ||
  Deno.env.get("SB_SERVICE_ROLE_KEY") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const POKEMON_TCG_KEY = Deno.env.get("POKEMON_TCG_API_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing env: SERVICE_ROLE_KEY and/or PROJECT_URL.");
}

// ---------- Helpers ----------
function codeVariants(raw: string): string[] {
  const base = (raw || "").toLowerCase().replace(/\s+/g, "");
  const out = new Set<string>([base]);
  const add = (s?: string | null) => { if (s && s.trim()) out.add(s.toLowerCase()); };

  const mSv = base.match(/^sv0?(\d{1,2})(?:([a-z]+)|(?:\.(5))|(?:pt(5)))?$/);
  if (mSv) {
    const n = mSv[1], suf = mSv[2], dot5 = mSv[3], pt5 = mSv[4];
    add(`sv${n}`); add(`sv0${n}`);
    if (suf) { add(`sv${n}${suf}`); add(`sv0${n}${suf}`); }
    if (dot5 || pt5) { add(`sv${n}.5`); add(`sv0${n}.5`); add(`sv${n}pt5`); add(`sv0${n}pt5`); }
  }
  const mSw = base.match(/^swsh(\d+)(?:\.(5)|pt(5))?$/);
  if (mSw) { const n = mSw[1], dot5 = mSw[2], pt5 = mSw[3]; add(`swsh${n}`); if (dot5||pt5){ add(`swsh${n}.5`); add(`swsh${n}pt5`);} }
  const mSm = base.match(/^sm(\d+)(?:\.(5)|pt(5))?$/);
  if (mSm) { const n = mSm[1], dot5 = mSm[2], pt5 = mSm[3]; add(`sm${n}`);   if (dot5||pt5){ add(`sm${n}.5`);   add(`sm${n}pt5`);  } }

  if (base === "pgo") add("swsh10.5");
  if (base === "swsh10.5") add("pgo");
  if (base === "rsv10pt5") add("swsh10.5");
  if (base === "zsv10pt5") add("sv10.5");

  for (const v of Array.from(out)) {
    const m1 = v.match(/^sv0?(\d{1,2})$/);   if (m1) { add(`sv${m1[1]}`); add(`sv0${m1[1]}`); }
    const m2 = v.match(/^sv0?(\d{1,2})pt5$/);if (m2) { add(`sv${m2[1]}pt5`); add(`sv0${m2[1]}pt5`); add(`sv${m2[1]}.5`); add(`sv0${m2[1]}.5`); }
    const m3 = v.match(/^sv0?(\d{1,2})\.5$/);if (m3) { add(`sv${m3[1]}.5`);  add(`sv0${m3[1]}.5`);  add(`sv${m3[1]}pt5`); add(`sv0${m3[1]}pt5`); }
  }
  return Array.from(out);
}

function normNum(n: string): string {
  const left = String(n || "").trim().split("/")[0];
  const core = left.replace(/[^0-9a-z]/gi, "");
  if (/^\d+$/.test(core)) return String(parseInt(core, 10)).padStart(3, "0");
  const m = core.match(/^(\d+)([a-z]+)$/i);
  if (m) return `${String(parseInt(m[1], 10)).padStart(3, "0")}${m[2].toLowerCase()}`;
  return core.toLowerCase();
}

function pricesToRows(set_code: string, number: string, prices: any | undefined) {
  if (!prices) return [];
  const variants = ["holofoil","normal","reverseHolofoil","1stEditionHolofoil","unlimitedHolofoil"] as const;
  const now = new Date().toISOString();
  const rows: any[] = [];
  for (const v of variants) {
    const p: any = (prices as any)[v];
    if (!p) continue;
    const market = typeof p.market === "number" ? p.market : null;
    const mid    = typeof p.mid    === "number" ? p.mid    : null;
    const high   = typeof p.high   === "number" ? p.high   : null;
    const low    = typeof p.low    === "number" ? p.low    : null;
    const price_usd = market ?? mid ?? high ?? low;
    if (price_usd == null) continue; // satisfy NOT NULL
    rows.push({
      set_code, number, variant: v,
      price_market: market, price_mid: mid, price_low: low, price_high: high,
      price_usd, currency: "USD", source: "tcgplayer", observed_at: now,
    });
  }
  return rows;
}

async function insertPriceObservations(rows: any[]) {
  if (!rows.length) return { count: 0 };
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/price_observations`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!resp.ok) throw new Error(`Failed to insert price_observations (${resp.status}): ${await resp.text()}`);
  return { count: rows.length };
}

async function fetchCardsBySetCode(setCode: string, dbg: boolean) {
  const make = (q: string) => `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=250`;
  const headers: Record<string,string> = { Accept: "application/json" };
  if (POKEMON_TCG_KEY && POKEMON_TCG_KEY.trim()) headers["X-Api-Key"] = POKEMON_TCG_KEY.trim();

  const queries = [`set.id:${setCode}`, `set.id:"${setCode}"`, `set.id:${setCode}*`];
  let lastDiag: any = null;

  for (const q of queries) {
    const url = make(q); let status = 0; let text = "";
    try {
      const res = await fetch(url, { headers }); status = res.status; text = await res.text();
      let data: any[] = []; try { const json = JSON.parse(text); data = Array.isArray(json?.data) ? json.data : []; } catch {}
      lastDiag = { url, tried: q, status, count: data.length, sample: text.slice(0,200) };
      if (data.length > 0) return { data, diag: lastDiag };
    } catch (e) {
      lastDiag = { url, tried: q, error: String(e) };
    }
  }
  return { data: [] as any[], diag: lastDiag };
}

// ---------- Handler (supports paging) ----------
export const handler = async (req: Request) => {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({} as any));

    const set_code: string | null =
      body?.set_code ?? body?.set ?? body?.setCode ?? body?.code ??
      url.searchParams.get("set_code") ?? url.searchParams.get("set") ??
      url.searchParams.get("setCode") ?? url.searchParams.get("code");

    const debug = !!(body?.debug ?? url.searchParams.get("debug"));

    const cardLimit  = Math.max(0, Number(body?.cardLimit  ?? url.searchParams.get("cardLimit")  ?? 0));
    const cardOffset = Math.max(0, Number(body?.cardOffset ?? url.searchParams.get("cardOffset") ?? 0));

    if (!set_code) {
      return new Response(JSON.stringify({ ok:false, error:"Missing set_code" }),
        { status:400, headers:{ "Content-Type":"application/json" }});
    }

    const tried: string[] = [];
    let fetched: any[] = [];
    let ptcg_diag: any = null;

    for (const c of codeVariants(set_code)) {
      tried.push(c);
      const { data, diag } = await fetchCardsBySetCode(c, debug);
      if (data.length > 0) { fetched = data; ptcg_diag = diag; break; }
      ptcg_diag = diag ?? ptcg_diag;
    }

    if (!fetched.length) {
      return new Response(JSON.stringify({
        ok:true, tried, fetched:0, processed:0, staged:0, inserted:0,
        note:"No cards returned for any set_code variant.",
        ...(debug ? { ptcg_diag } : {}),
      }), { headers:{ "Content-Type":"application/json" }});
    }

    let cardsToProcess = fetched;
    if (cardLimit > 0) cardsToProcess = fetched.slice(cardOffset, cardOffset + cardLimit);

    const setLower = String(set_code).toLowerCase();
    const rows: any[] = [];
    for (const card of cardsToProcess) {
      const n = normNum(card?.number ?? "");
      rows.push(...pricesToRows(setLower, n, card?.tcgplayer?.prices));
    }

    const { count } = await insertPriceObservations(rows);
    const next_offset = (cardLimit > 0 && (cardOffset + cardLimit) < fetched.length)
      ? (cardOffset + cardLimit) : null;

    return new Response(JSON.stringify({
      ok:true, tried, fetched: fetched.length,
      processed: cardsToProcess.length, staged: rows.length, inserted: count,
      next_offset,
      ...(debug ? { ptcg_diag } : {}),
    }), { headers:{ "Content-Type":"application/json" }});

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok:false, error:String(err) }),
      { status:500, headers:{ "Content-Type":"application/json" }});
  }
};

// Deno serve adapter
export default { fetch: handler } as Record<string, unknown>;
