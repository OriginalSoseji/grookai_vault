/**
 * check-prices: Audit latest price coverage and staleness by set_code
 *
 * POST JSON body:
 * {
 *   maxAgeDays?: number   // default 7
 *   only?: string[]       // restrict to specific set codes
 *   dry_run?: boolean     // if true, do not invoke import-prices
 *   throttleMs?: number   // delay between import-prices calls (default 150ms)
 * }
 *
 * Response: {
 *   ok: boolean,
 *   cutoff: string, // ISO cutoff date
 *   total_sets: number,
 *   considered_sets: number,
 *   to_import: number,
 *   triggered?: number,
 *   sets: Array<{
 *     set_code: string,
 *     total_prints: number,
 *     priced_prints: number,
 *     fresh_prints: number,
 *     stale_prints: number,
 *     unpriced_prints: number,
 *     last_observed_max: string | null,
 *     coverage_pct: number,
 *     fresh_pct: number,
 *   }>
 * }
 */

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ||
  Deno.env.get("PROJECT_URL") ||
  Deno.env.get("SB_URL") || "";

const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY") ||
  Deno.env.get("SB_SERVICE_ROLE_KEY") || "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing env: SERVICE_ROLE_KEY and/or SUPABASE_URL/PROJECT_URL.");
}

type ReportRow = {
  set_code: string;
  total_prints: number;
  priced_prints: number;
  fresh_prints: number;
  stale_prints: number;
  unpriced_prints: number;
  last_observed_max: string | null;
  coverage_pct: number;
  fresh_pct: number;
};

async function listDistinctSetCodes(): Promise<string[]> {
  const out = new Set<string>();
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/card_prints?select=set_code&order=set_code&limit=${pageSize}&offset=${offset}`;
    const r = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Accept: "application/json",
      },
    });
    if (!r.ok) throw new Error(`card_prints list ${r.status}`);
    const arr = (await r.json().catch(() => [])) as Array<{ set_code?: string }>;
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const row of arr) if (row?.set_code) out.add(String(row.set_code));
    if (arr.length < pageSize) break;
    offset += pageSize;
  }
  return Array.from(out).sort();
}

async function countPrintsForSet(setCode: string): Promise<number> {
  // Iterate pages to avoid relying on Content-Range headers
  const pageSize = 2000;
  let offset = 0;
  let total = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/card_prints?select=id&set_code=eq.${encodeURIComponent(
      setCode,
    )}&limit=${pageSize}&offset=${offset}`;
    const r = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Accept: "application/json",
      },
    });
    if (!r.ok) throw new Error(`card_prints count ${setCode} ${r.status}`);
    const arr = (await r.json().catch(() => [])) as Array<{ id?: string }>;
    const n = Array.isArray(arr) ? arr.length : 0;
    total += n;
    if (n < pageSize) break;
    offset += pageSize;
  }
  return total;
}

async function latestByPrintForSet(setCode: string): Promise<Map<string, string>> {
  // Returns map of print_id -> max(observed_at) as ISO string
  const pageSize = 2000;
  let offset = 0;
  const byPrint = new Map<string, string>();
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/v_latest_print_prices?select=print_id,observed_at&set_code=eq.${encodeURIComponent(
      setCode,
    )}&order=print_id&limit=${pageSize}&offset=${offset}`;
    const r = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Accept: "application/json",
      },
    });
    if (!r.ok) throw new Error(`v_latest_print_prices ${setCode} ${r.status}`);
    const arr = (await r.json().catch(() => [])) as Array<{ print_id?: string; observed_at?: string }>;
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const row of arr) {
      const pid = row?.print_id ? String(row.print_id) : null;
      const obs = row?.observed_at ? String(row.observed_at) : null;
      if (!pid || !obs) continue;
      const prev = byPrint.get(pid);
      if (!prev || new Date(obs).getTime() > new Date(prev).getTime()) byPrint.set(pid, obs);
    }
    if (arr.length < pageSize) break;
    offset += pageSize;
  }
  return byPrint;
}

async function runImportPrices(set_code: string) {
  const url = `${SUPABASE_URL}/functions/v1/import-prices`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ set_code }),
  });
  if (!res.ok) throw new Error(`import-prices ${set_code} -> ${res.status}: ${await res.text()}`);
  return await res.json().catch(() => ({}));
}

export default {
  async fetch(req: Request) {
    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const maxAgeDays = Math.max(0, Number(body?.maxAgeDays ?? 7));
      const cutoff = new Date(Date.now() - maxAgeDays * 24 * 3600 * 1000);
      const only = Array.isArray(body?.only) ? (body!.only as unknown[]).map((s) => String(s)) : null;
      const dryRun = Boolean(body?.dry_run ?? false);
      const throttleMs = Math.max(0, Number(body?.throttleMs ?? 150));

      const allSets = await listDistinctSetCodes();
      const targetSets = only && only.length ? allSets.filter((s) => only.includes(s)) : allSets;

      const rows: ReportRow[] = [];
      let toImport = 0;
      let triggered = 0;
      let lastErr: string | null = null;

      for (const sc of targetSets) {
        try {
          const total = await countPrintsForSet(sc);
          const latest = await latestByPrintForSet(sc);
          const priced = latest.size;
          let fresh = 0;
          let lastMax: string | null = null;
          for (const obs of latest.values()) {
            if (!lastMax || new Date(obs).getTime() > new Date(lastMax).getTime()) lastMax = obs;
            if (new Date(obs).getTime() >= cutoff.getTime()) fresh++;
          }
          const stale = Math.max(0, priced - fresh);
          const unpriced = Math.max(0, total - priced);
          const coverage = total > 0 ? Math.round((priced / total) * 1000) / 10 : 0;
          const freshPct = total > 0 ? Math.round((fresh / total) * 1000) / 10 : 0;

          rows.push({
            set_code: sc,
            total_prints: total,
            priced_prints: priced,
            fresh_prints: fresh,
            stale_prints: stale,
            unpriced_prints: unpriced,
            last_observed_max: lastMax,
            coverage_pct: coverage,
            fresh_pct: freshPct,
          });

          const needs = unpriced > 0 || stale > 0;
          if (needs) {
            toImport++;
            if (!dryRun) {
              try {
                await runImportPrices(sc);
                triggered++;
              } catch (e) {
                lastErr = String(e);
              }
              if (throttleMs > 0) await new Promise((r) => setTimeout(r, throttleMs));
            }
          }
        } catch (e) {
          // Continue with next set; attach minimal error info
          lastErr = String(e);
          rows.push({
            set_code: sc,
            total_prints: 0,
            priced_prints: 0,
            fresh_prints: 0,
            stale_prints: 0,
            unpriced_prints: 0,
            last_observed_max: null,
            coverage_pct: 0,
            fresh_pct: 0,
          });
        }
      }

      const res = {
        ok: true,
        cutoff: cutoff.toISOString(),
        total_sets: allSets.length,
        considered_sets: targetSets.length,
        to_import: toImport,
        ...(dryRun ? {} : { triggered }),
        ...(lastErr ? { last_error: lastErr } : {}),
        sets: rows,
      };
      return new Response(JSON.stringify(res), { headers: { "content-type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e) }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  },
};

