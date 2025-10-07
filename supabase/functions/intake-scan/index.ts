// deno-lint-ignore-file no-explicit-any
// File: supabase/functions/intake-scan/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- Helpers
function err(status: number, message: string) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  try {
    // --- Enforce auth (verify_jwt should be true or config.toml removed)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err(401, "Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Get user from JWT
    const { data: { user }, error: userErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !user) return err(401, "Invalid or expired token");
    const userId = user.id;

    // Parse input
    const body = await req.json().catch(() => ({}));
    const { set_code, number, image_url } = body as { set_code?: string; number?: string; image_url?: string };
    if (!set_code || !number) return err(400, "Missing set_code or number");

    // --- Identify
    const { data: cp, error: cpErr } = await admin
      .from("card_prints")
      .select("id, name, set_code, number, image_url")
      .eq("set_code", set_code)
      .eq("number", number)
      .maybeSingle();

    if (cpErr) throw cpErr;
    if (!cp) return err(404, `No card_print found for ${set_code} #${number}`);

    // --- Grade: call grade-scan (best-effort)
    let label: string | null = null;
    try {
      const gradeRes = await fetch(new URL("/functions/v1/grade-scan", supabaseUrl).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({ image_url, card_id: cp.id }),
      });
      if (gradeRes.ok) {
        const g = await gradeRes.json();
        label = (g?.label ?? null) as string | null;
      }
    } catch {}

    // --- Pricing: via RPC
    let marketPrice = 0;
    try {
      const { data: mp, error: mpErr } = await admin.rpc("get_market_price", { p_card_id: cp.id });
      if (!mpErr && typeof mp === "number") marketPrice = mp;
    } catch {}

    // --- Idempotent upsert into vault_items
    const { data: existing } = await admin
      .from("vault_items")
      .select("id, qty")
      .eq("user_id", userId)
      .eq("card_id", cp.id)
      .maybeSingle();

    let vaultItemId: string;
    let newQty = 1;

    if (existing) {
      const nextQty = (existing.qty ?? 0) + 1;
      const { data: upd, error: upErr } = await admin
        .from("vault_items")
        .update({
          qty: nextQty,
          condition_label: label,
          market_price: marketPrice,
          name: cp.name,
          set_name: cp.set_code,
          photo_url: cp.image_url ?? image_url ?? null,
        })
        .eq("id", existing.id)
        .select("id, qty")
        .single();
      if (upErr) throw upErr;
      vaultItemId = upd.id;
      newQty = upd.qty ?? nextQty;
    } else {
      const { data: ins, error: inErr } = await admin
        .from("vault_items")
        .insert({
          user_id: userId,
          card_id: cp.id,
          name: cp.name,
          set_name: cp.set_code,
          photo_url: cp.image_url ?? image_url ?? null,
          qty: 1,
          condition_label: label,
          market_price: marketPrice,
        })
        .select("id, qty")
        .single();
      if (inErr) throw inErr;
      vaultItemId = ins.id;
      newQty = ins.qty ?? 1;
    }

    return new Response(
      JSON.stringify({
        vault_item_id: vaultItemId,
        qty: newQty,
        card: {
          id: cp.id,
          name: cp.name,
          set_code: cp.set_code,
          number: cp.number,
          image_url: cp.image_url,
        },
        condition_label: label,
        market_price: marketPrice,
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e: any) {
    console.error("intake-scan error", e);
    return err(500, e?.message ?? "Unknown error");
  }
});
