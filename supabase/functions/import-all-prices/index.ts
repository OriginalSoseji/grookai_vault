const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;
const PROJECT_URL      = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL")!;
const POKEMON_TCG_KEY  = Deno.env.get("POKEMON_TCG_API_KEY") ?? "";

async function listSets() {
  const headers: Record<string, string> = { "accept": "application/json" };
  if (POKEMON_TCG_KEY.trim()) headers["X-Api-Key"] = POKEMON_TCG_KEY.trim();
  let page = 1; const out: string[] = [];
  while (true) {
    const r = await fetch(`https://api.pokemontcg.io/v2/sets?pageSize=250&page=${page}`, { headers });
    if (!r.ok) throw new Error(`sets fetch ${r.status}`);
    const j = await r.json().catch(()=>({}));
    const data = Array.isArray(j?.data) ? j.data : [];
    if (data.length === 0) break;
    out.push(...data.map((s:any)=> String(s.id)));
    page++;
  }
  return Array.from(new Set(out)).sort();
}

async function runOne(set_code: string, debug=false) {
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

export default {
  async fetch(req: Request) {
    try {
      const { throttleMs = 150, debug = false, only } = await req.json().catch(()=> ({}));
      const setIds = Array.isArray(only) && only.length ? only : await listSets();
      let tried=0, failed=0, fetched=0, inserted=0;
      for (const id of setIds) {
        tried++;
        try {
          const r = await runOne(id, debug);
          fetched  += r?.fetched  ?? 0;
          inserted += r?.inserted ?? 0;
        } catch (_e) { failed++; }
        if (throttleMs > 0) await new Promise(r => setTimeout(r, throttleMs));
      }
      return new Response(JSON.stringify({ ok:true, tried, failed, fetched, inserted }), { headers: { "content-type":"application/json" }});
    } catch (e) {
      return new Response(JSON.stringify({ ok:false, error: String(e) }), { status: 500, headers: { "content-type":"application/json" }});
    }
  }
};

