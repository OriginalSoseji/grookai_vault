import "jsr:@supabase/functions-js/edge-runtime.d.ts";
export const cors = { methods: ["POST"], allowedHeaders: ["authorization","content-type"] };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { intent, payload } = await req.json();
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return new Response("OPENAI_API_KEY missing", { status: 500 });

  if (intent === "price_tiers_for_card") {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are the Grookai Vault assistant. Reply JSON: {tiers:[{tier,floor,median,recent,notes}],recommendation}." },
          { role: "user", content: `Summarize NM/LP/MP + graded guidance for ${payload?.card_name ?? "Unknown"} (${payload?.set_code ?? ""}).` }
        ]
      })
    });
    return new Response(await r.text(), { headers: { "Content-Type":"application/json" }});
  }

  if (intent === "add_to_vault") {
    // TODO: call RPC vault_add_item with user's JWT
    return Response.json({ ok: true });
  }

  return new Response(JSON.stringify({ ok:false, error:"unknown_intent" }), { status: 400 });
});
