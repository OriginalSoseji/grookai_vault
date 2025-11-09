/* supabase/functions/import-prices/index.ts
   Importer: PokémonTCG -> public.price_observations
   - Input: { set_code | set | setCode | code } + optional { cardLimit, cardOffset, debug }
   - Robust set code variants (.5<->pt5, svX<->sv0X, aliases)
   - No-throw fetch with query fallbacks; returns diag when debug=true
   - Writes via PostgREST using SERVICE_ROLE_KEY from Secrets (never from clients)
*/ // --- Fast-path health, guarded vendor calls, and strict timeouts ---
const T_OUT = 5000; // 5s default timeout for vendor fetches
function fetchWithTimeout(input, init = {}, ms = T_OUT) {
  const ctrl = new AbortController();
  const id = setTimeout(()=>ctrl.abort(), ms);
  const merged = {
    ...init,
    signal: ctrl.signal
  };
  return fetch(input, merged).finally(()=>clearTimeout(id));
}
function now() {
  return new Date().toISOString();
}
function rid() {
  try {
    return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  } catch  {
    return Math.random().toString(36).slice(2);
  }
}
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL") || Deno.env.get("SB_URL") || "";
const SECRET_KEY =
  Deno.env.get("SUPABASE_SECRET_KEY") ||
  Deno.env.get("SECRET_KEY") ||
  Deno.env.get("SB_SECRET_KEY") ||
  "";
const POKEMON_TCG_KEY = Deno.env.get("POKEMON_TCG_API_KEY") ?? "";
if (!SUPABASE_URL || !SECRET_KEY) {
  throw new Error("Missing env: SECRET_KEY and/or PROJECT_URL.");
}
function srHeaders() {
  return {
    apikey: SECRET_KEY,
    Authorization: `Bearer ${SECRET_KEY}`,
    "Content-Type": "application/json",
    Prefer: "count=exact"
  };
}
async function getQueuedCount() {
  const url = `${SUPABASE_URL}/rest/v1/jobs?name=eq.refresh_latest_card_prices_mv&status=in.(queued,running)&select=id`;
  const res = await fetch(url, {
    headers: srHeaders()
  });
  if (!res.ok) return 0;
  const cr = res.headers.get('content-range');
  if (cr && cr.includes('/')) {
    const total = cr.split('/')[1];
    const n = parseInt(total, 10);
    if (!Number.isNaN(n)) return n;
  }
  const arr = await res.json().catch(()=>[]);
  return Array.isArray(arr) ? arr.length : 0;
}
async function enqueueRefreshIfNeeded() {
  try {
    const cnt = await getQueuedCount();
    if (cnt > 0) return false;
    const url = `${SUPABASE_URL}/rest/v1/jobs`;
    const res = await fetch(url, {
      method: 'POST',
      headers: srHeaders(),
      body: JSON.stringify([
        {
          name: 'refresh_latest_card_prices_mv',
          payload: {}
        }
      ])
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}
async function runWorkerOnce() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/rpc/process_jobs`;
    const res = await fetch(url, {
      method: 'POST',
      headers: srHeaders(),
      body: JSON.stringify({
        p_limit: 1
      })
    });
    if (!res.ok) return 0;
    const v = await res.json().catch(()=>0);
    return typeof v === 'number' ? v : v?.process_jobs ?? 0 ?? 0;
  } catch (_) {
    return 0;
  }
}
// ---------- Helpers ----------
function codeVariants(raw) {
  const base = (raw || "").toLowerCase().replace(/\s+/g, "");
  const out = new Set([
    base
  ]);
  const add = (s)=>{
    if (s && s.trim()) out.add(s.toLowerCase());
  };
  const mSv = base.match(/^sv0?(\d{1,2})(?:([a-z]+)|(?:\.(5))|(?:pt(5)))?$/);
  if (mSv) {
    const n = mSv[1], suf = mSv[2], dot5 = mSv[3], pt5 = mSv[4];
    add(`sv${n}`);
    add(`sv0${n}`);
    if (suf) {
      add(`sv${n}${suf}`);
      add(`sv0${n}${suf}`);
    }
    if (dot5 || pt5) {
      add(`sv${n}.5`);
      add(`sv0${n}.5`);
      add(`sv${n}pt5`);
      add(`sv0${n}pt5`);
    }
  }
  const mSw = base.match(/^swsh(\d+)(?:\.(5)|pt(5))?$/);
  if (mSw) {
    const n = mSw[1], dot5 = mSw[2], pt5 = mSw[3];
    add(`swsh${n}`);
    if (dot5 || pt5) {
      add(`swsh${n}.5`);
      add(`swsh${n}pt5`);
    }
  }
  const mSm = base.match(/^sm(\d+)(?:\.(5)|pt(5))?$/);
  if (mSm) {
    const n = mSm[1], dot5 = mSm[2], pt5 = mSm[3];
    add(`sm${n}`);
    if (dot5 || pt5) {
      add(`sm${n}.5`);
      add(`sm${n}pt5`);
    }
  }
  if (base === "pgo") add("swsh10.5");
  if (base === "swsh10.5") add("pgo");
  if (base === "rsv10pt5") add("swsh10.5");
  if (base === "zsv10pt5") add("sv10.5");
  for (const v of Array.from(out)){
    const m1 = v.match(/^sv0?(\d{1,2})$/);
    if (m1) {
      add(`sv${m1[1]}`);
      add(`sv0${m1[1]}`);
    }
    const m2 = v.match(/^sv0?(\d{1,2})pt5$/);
    if (m2) {
      add(`sv${m2[1]}pt5`);
      add(`sv0${m2[1]}pt5`);
      add(`sv${m2[1]}.5`);
      add(`sv0${m2[1]}.5`);
    }
    const m3 = v.match(/^sv0?(\d{1,2})\.5$/);
    if (m3) {
      add(`sv${m3[1]}.5`);
      add(`sv0${m3[1]}.5`);
      add(`sv${m3[1]}pt5`);
      add(`sv0${m3[1]}pt5`);
    }
  }
  return Array.from(out);
}
function normNum(n) {
  const left = String(n || "").trim().split("/")[0];
  const core = left.replace(/[^0-9a-z]/gi, "");
  if (/^\d+$/.test(core)) return String(parseInt(core, 10)).padStart(3, "0");
  const m = core.match(/^(\d+)([a-z]+)$/i);
  if (m) return `${String(parseInt(m[1], 10)).padStart(3, "0")}${m[2].toLowerCase()}`;
  return core.toLowerCase();
}
function pricesToRows(set_code, number, prices) {
  if (!prices) return [];
  const variants = [
    "holofoil",
    "normal",
    "reverseHolofoil",
    "1stEditionHolofoil",
    "unlimitedHolofoil"
  ];
  const now = new Date().toISOString();
  const rows = [];
  for (const v of variants){
    const p = prices[v];
    if (!p) continue;
    const market = typeof p.market === "number" ? p.market : null;
    const mid = typeof p.mid === "number" ? p.mid : null;
    const high = typeof p.high === "number" ? p.high : null;
    const low = typeof p.low === "number" ? p.low : null;
    const price_usd = market ?? mid ?? high ?? low;
    if (price_usd == null) continue; // satisfy NOT NULL
    rows.push({
      set_code,
      number,
      variant: v,
      price_market: market,
      price_mid: mid,
      price_low: low,
      price_high: high,
      price_usd,
      currency: "USD",
      source: "tcgplayer",
      observed_at: now
    });
  }
  return rows;
}
async function insertPriceObservations(rows) {
  if (!rows.length) return {
    count: 0
  };
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/price_observations`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(rows)
  });
  if (!resp.ok) throw new Error(`Failed to insert price_observations (${resp.status}): ${await resp.text()}`);
  return {
    count: rows.length
  };
}
async function fetchCardsBySetCode(setCode, dbg) {
  const make = (q)=>`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=250`;
  const headers = {
    Accept: "application/json"
  };
  if (POKEMON_TCG_KEY && POKEMON_TCG_KEY.trim()) headers["X-Api-Key"] = POKEMON_TCG_KEY.trim();
  const queries = [
    `set.id:${setCode}`,
    `set.id:"${setCode}"`,
    `set.id:${setCode}*`
  ];
  let lastDiag = null;
  for (const q of queries){
    const url = make(q);
    let status = 0;
    let text = "";
    try {
      const res = await fetchWithTimeout(url, {
        headers
      }, T_OUT);
      status = res.status;
      text = await res.text();
      let data = [];
      try {
        const json = JSON.parse(text);
        data = Array.isArray(json?.data) ? json.data : [];
      } catch  {}
      lastDiag = {
        url,
        tried: q,
        status,
        count: data.length,
        sample: text.slice(0, 200)
      };
      if (data.length > 0) return {
        data,
        diag: lastDiag
      };
    } catch (e) {
      const msg = e?.name === 'AbortError' ? 'timeout' : String(e);
      lastDiag = {
        url,
        tried: q,
        error: msg
      };
    }
  }
  return {
    data: [],
    diag: lastDiag
  };
}
// ---------- Handler (supports paging) ----------
export const handler = async (req)=>{
  try {
    const url = new URL(req.url);
    const id = rid();
    const method = req.method;
    console.log(`[IMPORT] start rid=${id} t=${now()} method=${method} path=${url.pathname} q=${url.search}`);
    // Quick health pings
    if (method === "GET" && url.searchParams.get("ping") === "1") {
      console.log(`[IMPORT] ping rid=${id} ok`);
      return new Response(JSON.stringify({
        ok: true,
        rid: id
      }), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    let body = await req.json().catch(()=>({}));
    if (method === "POST" && body?.ping === true) {
      console.log(`[IMPORT] ping(body) rid=${id} ok`);
      return new Response(JSON.stringify({
        ok: true,
        rid: id
      }), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const set_code = body?.set_code ?? body?.set ?? body?.setCode ?? body?.code ?? url.searchParams.get("set_code") ?? url.searchParams.get("set") ?? url.searchParams.get("setCode") ?? url.searchParams.get("code");
    const debug = !!(body?.debug ?? url.searchParams.get("debug"));
    const cardLimit = Math.max(0, Number(body?.cardLimit ?? url.searchParams.get("cardLimit") ?? 0));
    const cardOffset = Math.max(0, Number(body?.cardOffset ?? url.searchParams.get("cardOffset") ?? 0));
    if (!set_code) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Missing set_code"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Env key guard before vendor usage
    if (!POKEMON_TCG_KEY || !POKEMON_TCG_KEY.trim()) {
      console.warn(`[IMPORT] missing-key rid=${id} key=POKEMON_TCG_API_KEY`);
      return new Response(JSON.stringify({
        ok: false,
        error: "missing POKEMON_TCG_API_KEY",
        rid: id
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const tried = [];
    let fetched = [];
    let ptcg_diag = null;
    for (const c of codeVariants(set_code)){
      tried.push(c);
      const { data, diag } = await fetchCardsBySetCode(c, debug);
      if (data.length > 0) {
        fetched = data;
        ptcg_diag = diag;
        break;
      }
      ptcg_diag = diag ?? ptcg_diag;
    }
    if (!fetched.length) {
      return new Response(JSON.stringify({
        ok: true,
        tried,
        fetched: 0,
        processed: 0,
        staged: 0,
        inserted: 0,
        note: "No cards returned for any set_code variant.",
        ...debug ? {
          ptcg_diag
        } : {}
      }), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    let cardsToProcess = fetched;
    if (cardLimit > 0) cardsToProcess = fetched.slice(cardOffset, cardOffset + cardLimit);
    const setLower = String(set_code).toLowerCase();
    const rows = [];
    for (const card of cardsToProcess){
      const n = normNum(card?.number ?? "");
      rows.push(...pricesToRows(setLower, n, card?.tcgplayer?.prices));
    }
    const { count } = await insertPriceObservations(rows);
    // Post-import: enqueue refresh + run worker once (service role; deduped)
    let refreshQueued = false;
    let handled = 0;
    try {
      refreshQueued = await enqueueRefreshIfNeeded();
      handled = await runWorkerOnce();
    } catch (e) {
      console.error(`[import-prices] post-refresh err: ${String(e).slice(0, 200)}`);
    }
    const next_offset = cardLimit > 0 && cardOffset + cardLimit < fetched.length ? cardOffset + cardLimit : null;
    console.log(`[IMPORT] done rid=${id} t=${now()} ok`);
    return new Response(JSON.stringify({
      ok: true,
      tried,
      fetched: fetched.length,
      processed: cardsToProcess.length,
      staged: rows.length,
      inserted: count,
      next_offset,
      refreshQueued,
      handled,
      ...debug ? {
        ptcg_diag
      } : {}
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    const msg = err?.name === 'AbortError' ? 'timeout' : String(err);
    console.error(`[IMPORT] fail rid=? err=${msg}`);
    // Return 502 (bad gateway) for vendor/timeout failures to avoid platform 504s
    return new Response(JSON.stringify({
      ok: false,
      error: msg
    }), {
      status: 502,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};
// Deno serve adapter
export default {
  fetch: handler
};
