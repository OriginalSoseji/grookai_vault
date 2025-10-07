import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const ok = (d:any)=>new Response(JSON.stringify(d),{headers:{"Content-Type":"application/json"}});
function authed(req: Request) {
  const t = req.headers.get("Authorization")?.replace("Bearer ","");
  return t && t === Deno.env.get("GPT_ACTION_TOKEN");
}
Deno.serve(async (req) => {
  if (!authed(req)) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const body = req.method==="POST" ? await req.json() : {};

  if (url.pathname.endsWith("/search_cards"))    return ok({ results: [] }); // TODO
  if (url.pathname.endsWith("/get_price_tiers")) return ok({ tiers: [] });   // TODO
  if (url.pathname.endsWith("/add_to_vault"))    return ok({ ok: true });    // TODO: call RPC
  if (url.pathname.endsWith("/seed"))            return ok({ ok: true });    // TODO
  if (url.pathname.endsWith("/run_migration"))   return ok({ ok: true, applied: body.name });

  return new Response("Not found", { status: 404 });
});
