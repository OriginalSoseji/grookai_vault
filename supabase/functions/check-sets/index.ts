/**
 * check-sets: Nightly validator to ensure we have all sets present in-app.
 * - Compares PokémonTCG set IDs vs. distinct set_code in public.card_prints
 * - Returns missing/extra lists and summary
 * - Optional: fix=true triggers import-prices for missing sets (with throttle)
 *
 * Requires secrets in project:
 *   SERVICE_ROLE_KEY, PROJECT_URL, (optional) POKEMON_TCG_API_KEY
 */

const PROJECT_URL      = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL") || Deno.env.get("SB_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SRK = SERVICE_ROLE_KEY;
const REST_BASE        = PROJECT_URL ? `${PROJECT_URL}/rest/v1` : "";
const REST_HEADERS: Record<string,string> = SERVICE_ROLE_KEY ? {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "content-type": "application/json",
  "Accept-Profile": "public",
  "Content-Profile": "public",
} : {} as any;
const POKEMON_TCG_KEY  = Deno.env.get("POKEMON_TCG_API_KEY") ?? "";

if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing env: SERVICE_ROLE_KEY and/or PROJECT_URL (or SUPABASE_URL/SB_URL).");
}

// ---- Helpers ---------------------------------------------------------------

async function listAllSetIds(): Promise<string[]> {
  const USE_GATEWAY = (Deno.env.get('USE_EXT_GATEWAY') || '').toLowerCase() === 'true'
  if (USE_GATEWAY && PROJECT_URL && SERVICE_ROLE_KEY) {
    try {
      const gw = await fetch(`${PROJECT_URL}/functions/v1/ext_gateway`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'apikey': SERVICE_ROLE_KEY },
        body: JSON.stringify({ provider: 'ptcg', endpoint: 'sets', params: { page: 1, pageSize: 250 }, ttlSec: 86400 })
      })
      if (gw.ok) {
        const gj: any = await gw.json().catch(() => ({}))
        const data: any[] = Array.isArray(gj?.data?.data) ? gj.data.data : []
        const out = data.map((s: any) => String(s?.id)).filter(Boolean)
        if (out.length) return Array.from(new Set(out)).sort()
      }
    } catch {}
  }
  // Fallback to direct
  const headers: Record<string,string> = { accept: "application/json" };
  if (POKEMON_TCG_KEY.trim()) headers["X-Api-Key"] = POKEMON_TCG_KEY.trim();
  let page = 1; const out = new Set<string>()
  while (true) {
    const r = await fetch(`https://api.pokemontcg.io/v2/sets?pageSize=250&page=${page}`, { headers });
    if (!r.ok) throw new Error(`PTCG sets ${r.status}`);
    const j = await r.json().catch(()=> ({}));
    const arr = Array.isArray(j?.data) ? j.data : [];
    for (const s of arr) if (s?.id) out.add(String(s.id));
    if (arr.length < 250) break;
    page++;
  }
  return Array.from(out).sort();
}

async function listDbSetCodesFromCardPrints(): Promise<string[]> {
  const out = new Set<string>();
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const url = `${REST_BASE}/card_prints?select=set_code&order=set_code&limit=${pageSize}&offset=${offset}`;
    const r = await fetch(url, { headers: REST_HEADERS });
    if (!r.ok) throw new Error(`card_prints ${r.status}`);
    const arr = await r.json().catch(()=> []);
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const row of arr) if (row?.set_code) out.add(String(row.set_code));
    if (arr.length < pageSize) break;
    offset += pageSize;
  }

  return Array.from(out).sort();
}

async function writeAudit(row: any) {
  // Optional: persist a summary row if table exists
  try {
    const r = await fetch(`${REST_BASE}/set_sync_audit`, {
      method: "POST",
      headers: { ...REST_HEADERS, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify([row])
    });
    // ignore failure (table might not exist)
    await r.text().catch(()=>{});
  } catch { /* no-op */ }
}

async function runImportPrices(set_code: string, debug=false) {
  const url = `${PROJECT_URL}/functions/v1/import-prices`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY
    },
    body: JSON.stringify({ set_code, debug })
  });
  if (!res.ok) throw new Error(`import-prices ${set_code} -> ${res.status}: ${await res.text()}`);
  return await res.json().catch(()=> ({}));
}

async function runImportCards(set_code: string, pageSize = 200, throttleMs = 150) {
  let page = 1;
  let totalImported = 0;
  async function fetchWithRetry(url: string, init: RequestInit, attempts = 5) {
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const r = await fetch(url, init);
        if (r.ok) return r;
        // Retry only on transient upstream errors propagated by import-cards
        if (r.status >= 500 && r.status < 600) {
          lastErr = new Error(`HTTP ${r.status}: ${await r.text().catch(()=>"")}`);
        } else {
          // Non-retryable
          const txt = await r.text().catch(()=>"");
          throw new Error(`HTTP ${r.status}: ${txt}`);
        }
      } catch (e) {
        lastErr = e;
      }
      await new Promise(res => setTimeout(res, Math.min(2000, 200 * (2 ** i))));
    }
    throw lastErr ?? new Error("fetch failed");
  }
  while (true) {
    const res = await fetchWithRetry(`${PROJECT_URL}/functions/v1/import-cards`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "apikey": SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ setCode: set_code, page, pageSize }),
    });
    if (!res.ok) throw new Error(`import-cards ${set_code} page=${page} -> ${res.status}: ${await res.text()}`);
    const j = await res.json().catch(()=> ({} as any));
    totalImported += Number(j?.imported ?? 0);
    const next = j?.nextPageHint as number | null | undefined;
    if (!next || next === page) break;
    page = next;
    if (throttleMs > 0) await new Promise(r => setTimeout(r, throttleMs));
  }
  return { imported: totalImported };
}

// ---- HTTP handler ----------------------------------------------------------

export default {
  async fetch(req: Request) {
    try {
      // Early REST probe to surface base URL or header issues
      const probe = await fetch(`${REST_BASE}/card_prints?select=id&limit=1`, { headers: REST_HEADERS });
      if (probe.status === 404) {
        const txt = await probe.text().catch(()=>"");
        return new Response(JSON.stringify({ ok:false, error:"rest_404_card_prints", detail: txt }), { status: 500, headers: { "content-type": "application/json" }});
      }
      if (!probe.ok) {
        const txt = await probe.text().catch(()=>"");
        return new Response(JSON.stringify({ ok:false, error:"rest_probe_failed", status: probe.status, detail: txt }), { status: 500, headers: { "content-type": "application/json" }});
      }
      const AUTO_FIX = (Deno.env.get("CHECK_SETS_AUTO_FIX") || "").toLowerCase();
      const DEFAULT_FIX = AUTO_FIX === "1" || AUTO_FIX === "true" || AUTO_FIX === "yes";
      const DEFAULT_THROTTLE = Number.parseInt(Deno.env.get("CHECK_SETS_THROTTLE_MS") || "150", 10) || 150;
      const DEFAULT_FIX_MODE = Deno.env.get("CHECK_SETS_FIX_MODE") || 'prices';

      const { fix = DEFAULT_FIX, throttleMs = DEFAULT_THROTTLE, only, fixMode = DEFAULT_FIX_MODE } = await req.json().catch(()=> ({} as any));

      const apiSetIds = Array.isArray(only) && only.length
        ? Array.from(new Set(only.map(String))).sort()
        : await listAllSetIds();

      const dbSetCodes = await listDbSetCodesFromCardPrints();

      const api = new Set(apiSetIds);
      const db  = new Set(dbSetCodes);

      const missing = apiSetIds.filter(id => !db.has(id));
      const extra   = dbSetCodes.filter(code => !api.has(code));

      // Optional: auto-fix by seeding prices for missing sets
      let fixTried = 0, fixOk = 0;
      if (fix && missing.length) {
        for (const id of missing) {
          fixTried++;
          try {
            if (fixMode === 'cards' || fixMode === 'both') {
              await runImportCards(id, 200, throttleMs);
            }
            if (fixMode === 'prices' || fixMode === 'both') {
              const r = await runImportPrices(id, false);
              if (typeof r?.fetched === "number") fixOk++;
            } else {
              // If only cards were imported, count as ok
              fixOk++;
            }
          } catch {
            // count as failure
          }
          if (throttleMs > 0) await new Promise(r => setTimeout(r, throttleMs));
        }
      }

      const report = {
        ok: true,
        total_api: apiSetIds.length,
        total_db: dbSetCodes.length,
        missing_count: missing.length,
        extra_count: extra.length,
        missing,
        extra,
        fix: { requested: !!fix, mode: String(fixMode), tried: fixTried, ok: fixOk }
      };

      await writeAudit({ run_at: new Date().toISOString(), ...report });
      return new Response(JSON.stringify(report), { headers: { "content-type": "application/json" }});
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "content-type": "application/json" }});
    }
  }
};


