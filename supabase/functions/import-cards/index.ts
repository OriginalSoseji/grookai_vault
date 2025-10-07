// supabase/functions/import-cards/index.ts
// Clean importer with:
// - GET health
// - POST ?op=ping (no deps)
// - POST ?op=probe (fetch upstream only; no DB writes)
// - POST (normal importer: Edge fetch -> DB upsert)
// - POST ?op=ingest (client fetch -> server upsert)
// Features:
//   * reads SUPABASE_URL, SERVICE_ROLE_KEY, POKEMONTCG_API_KEY, POKEMON_GAME_ID
//   * non-null set names ("Unknown")
//   * retry + 20s timeout on upstream; 404 => end of pages
//   * chunked upserts
//   * conflict target (game_id,set_id,number)
//   * de-duplicate per (set_id,number) inside a page to avoid multi-hit UPDATE

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function J(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const timeoutSignal =
  (AbortSignal as any)?.timeout ? (AbortSignal as any).timeout(20000) : undefined;

async function fetchPTCG(url: URL, headers: HeadersInit, attempts = 3) {
  let res: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    res = await fetch(url, { headers, signal: timeoutSignal }).catch(() => null as any);
    if (res && (res.ok || res.status === 404)) return res;
    await new Promise((r) => setTimeout(r, 700));
  }
  return res;
}

function chunk<T>(arr: T[], n = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function isUuid(s?: string | null) {
  return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const op = url.searchParams.get("op");

    // ---------- GET / health ----------
    if (req.method === "GET") {
      return J({ ok: true, route: "GET /import-cards health", now: new Date().toISOString() });
    }

    // ---------- POST ?op=ping ----------
    if (req.method === "POST" && op === "ping") {
      return J({ ok: true, route: "POST /import-cards?op=ping" });
    }

    // Read secrets once (probe/ingest/importer use these)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    const POKEMONTCG_API_KEY = Deno.env.get("POKEMONTCG_API_KEY");
    const POKEMON_GAME_ID = Deno.env.get("POKEMON_GAME_ID");

    // ---------- POST ?op=probe (no DB writes) ----------
    if (req.method === "POST" && op === "probe") {
      if (!POKEMONTCG_API_KEY)
        return J({ error: "Missing required secrets", missing: ["POKEMONTCG_API_KEY"] }, 400);

      const body = await req.json().catch(() => ({}));
      const { setCode = "sv6", page = 1, pageSize = 5 } = body ?? {};

      const u = new URL("https://api.pokemontcg.io/v2/cards");
      u.searchParams.set("q", `set.id:${setCode}`);
      u.searchParams.set("page", String(page));
      u.searchParams.set("pageSize", String(pageSize));

      const res = await fetchPTCG(u, { "X-Api-Key": POKEMONTCG_API_KEY });
      if (!res) return J({ ok: false, status: "no-response", url: u.toString() }, 502);

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const count = Array.isArray(json?.data) ? json.data.length : null;
        return J({ ok: true, status: res.status, url: u.toString(), count, totalCount: json?.totalCount ?? null });
      } else {
        let preview = "";
        try { preview = (await res.text()).slice(0, 300); } catch {}
        return J({ ok: false, status: res.status, url: u.toString(), bodyPreview: preview }, 502);
      }
    }

    if (req.method !== "POST") return J({ error: "method not allowed" }, 405);

    // ---------- Common request body ----------
    const body = await req.json().catch(() => ({}));
    const {
      game = "pokemon",
      source = "pokemontcg",
      setCode,
      page = 1,
      pageSize = 10,
      dryRun = false,
      cards: cardsFromClient, // op=ingest
    } = body ?? {};

    // ---------- Helpers used by ingest/import ----------
    async function upsertSetsAndMapIds(admin: any, cards: any[], requestedSetCode?: string) {
      const setInfo = new Map<string, { code: string; name: string; release_date: string | null }>();
      for (const c of cards) {
        const s = c?.set;
        if (!s?.id) continue;
        const prev = setInfo.get(s.id);
        const name = s.name ?? prev?.name ?? "Unknown";
        const rd = typeof s.releaseDate === "string" ? s.releaseDate.replace(/\//g, "-") : prev?.release_date ?? null;
        setInfo.set(s.id, { code: s.id, name, release_date: rd });
      }
      if (requestedSetCode && !setInfo.has(requestedSetCode)) {
        setInfo.set(requestedSetCode, { code: requestedSetCode, name: "Unknown", release_date: null });
      }

      const setRows = Array.from(setInfo.values());
      if (setRows.length) {
        const { error: setErr } = await admin.from("sets").upsert(setRows, { onConflict: "code" });
        if (setErr) return { err: { error: "sets upsert failed", details: setErr.message } };
      }

      const codes = Array.from(setInfo.keys());
      const { data: setIdRows, error: setIdErr } = await admin.from("sets").select("id, code").in("code", codes);
      if (setIdErr) return { err: { error: "failed to read set ids", details: setIdErr.message } };

      const codeToId = new Map<string, string>((setIdRows ?? []).map((r: any) => [r.code, r.id]));
      return { codeToId };
    }

    function buildRows(cards: any[], codeToId: Map<string, string>, POKEMON_GAME_ID: string) {
      const draft = cards
        .map((c) => {
          const code = c?.set?.id as string | undefined;
          const set_id = code ? codeToId.get(code) : undefined;
          const number = (c?.number ?? null) as string | null;
          return {
            game_id: POKEMON_GAME_ID,
            set_id,
            number, // conflict key part
            name: c?.name ?? "Unknown",
            rarity: c?.rarity ?? null,
            image_url: c?.images?.large ?? c?.images?.small ?? null,
          };
        })
        .filter((r) => r.game_id && r.set_id && r.number);

      // de-duplicate by (set_id, number)
      const unique = new Map<string, (typeof draft)[number]>();
      for (const r of draft) {
        const key = `${r.set_id}|${r.number}`;
        if (!unique.has(key)) unique.set(key, r);
      }
      return Array.from(unique.values());
    }

    async function upsertCardRows(admin: any, rows: any[]) {
      let imported = 0;
      if (rows.length) {
        for (const batch of chunk(rows, 100)) {
          const { error } = await admin
            .from("card_prints")
            .upsert(batch, { onConflict: "game_id,set_id,number" });
          if (error) return { err: { error: "card_prints upsert failed", details: error.message } };
          imported += batch.length;
        }
      }
      return { imported };
    }

    // ---------- POST ?op=ingest (client fetched 'cards') ----------
    if (op === "ingest") {
      const miss: string[] = [];
      if (!SUPABASE_URL) miss.push("SUPABASE_URL");
      if (!SERVICE_ROLE_KEY) miss.push("SERVICE_ROLE_KEY");
      if (!POKEMON_GAME_ID) miss.push("POKEMON_GAME_ID");
      if (miss.length) return J({ error: "Missing required secrets", missing: miss }, 400);
      if (!isUuid(POKEMON_GAME_ID)) return J({ error: "POKEMON_GAME_ID must be a valid UUID" }, 400);
      if (game !== "pokemon") return J({ error: "Only 'pokemon' supported" }, 400);
      if (!Array.isArray(cardsFromClient) || cardsFromClient.length === 0)
        return J({ error: "cards array required in body for op=ingest" }, 400);

      const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

      const { codeToId, err: setErr } = await upsertSetsAndMapIds(admin, cardsFromClient, setCode);
      if (setErr) return J(setErr, 500);

      const rows = buildRows(cardsFromClient, codeToId!, POKEMON_GAME_ID!);
      const { imported, err } = await upsertCardRows(admin, rows);
      if (err) return J(err, 500);

      return J({ op: "ingest", setCode: setCode ?? cardsFromClient[0]?.set?.id ?? "unknown", imported, pages: 1 });
    }

    // ---------- Normal importer (Edge fetch -> DB) ----------
    if (source !== "pokemontcg") return J({ error: "Only 'pokemontcg' supported" }, 400);
    if (game !== "pokemon") return J({ error: "Only 'pokemon' supported" }, 400);
    const miss: string[] = [];
    if (!SUPABASE_URL) miss.push("SUPABASE_URL");
    if (!SERVICE_ROLE_KEY) miss.push("SERVICE_ROLE_KEY");
    if (!POKEMONTCG_API_KEY) miss.push("POKEMONTCG_API_KEY");
    if (!POKEMON_GAME_ID) miss.push("POKEMON_GAME_ID");
    if (miss.length) return J({ error: "Missing required secrets", missing: miss }, 400);
    if (!isUuid(POKEMON_GAME_ID)) return J({ error: "POKEMON_GAME_ID must be a valid UUID" }, 400);
    if (!setCode || typeof setCode !== "string") return J({ error: "setCode required" }, 400);

    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

    const u = new URL("https://api.pokemontcg.io/v2/cards");
    u.searchParams.set("q", `set.id:${setCode}`);
    u.searchParams.set("page", String(page));
    u.searchParams.set("pageSize", String(pageSize));

    const upstream = await fetchPTCG(u, { "X-Api-Key": POKEMONTCG_API_KEY! });
    if (!upstream) return J({ error: "Upstream Pokemon TCG API error", status: "no-response" }, 502);
    if (upstream.status === 404) {
      return J({ imported: 0, setCode, page, pageSize, nextPageHint: null, end: true });
    }
    if (!upstream.ok) {
      let preview = "";
      try { preview = (await upstream.text()).slice(0, 300); } catch {}
      return J({ error: "Upstream Pokemon TCG API error", status: upstream.status, bodyPreview: preview }, 502);
    }

    const payload = await upstream.json().catch(() => null);
    const cards: any[] = Array.isArray(payload?.data) ? payload.data : [];

    if (dryRun) return J({ setCode, page, pageSize, count: cards.length });

    const { codeToId, err: setErr } = await upsertSetsAndMapIds(admin, cards, setCode);
    if (setErr) return J(setErr, 500);

    const rows = buildRows(cards, codeToId!, POKEMON_GAME_ID!);
    const { imported, err } = await upsertCardRows(admin, rows);
    if (err) return J(err, 500);

    const nextPageHint = cards.length === pageSize ? page + 1 : null;
    return J({ imported, setCode, page, pageSize, nextPageHint });
  } catch (e) {
    return J({ error: "server", message: String(e?.message ?? e) }, 500);
  }
});
