import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { getServiceRoleKey } from "../_shared/key_resolver.ts";

console.log("[pricing-live-request] version=2025-11-26");

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL") ?? "";
  const serviceRole = getServiceRoleKey() ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRole) {
    console.error("[pricing-live-request] missing Supabase configuration");
    return new Response(
      JSON.stringify({ error: "Supabase configuration missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const cardPrintId = (body?.card_print_id ?? "").toString().trim();
  if (!cardPrintId) {
    return new Response(
      JSON.stringify({ error: "card_print_id is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = createClient(supabaseUrl, serviceRole);

  const { data, error } = await client
    .from("pricing_jobs")
    .insert({
      card_print_id: cardPrintId,
      priority: "user",
      reason: "live_price_request",
      status: "pending",
    })
    .select("id, status, card_print_id")
    .maybeSingle();

  if (error) {
    console.error("[pricing-live-request] insert failed", error);
    return new Response(
      JSON.stringify({ error: "Failed to queue pricing request" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      status: "queued",
      request_id: data?.id,
      card_print_id: data?.card_print_id,
    }),
    { status: 202, headers: { "Content-Type": "application/json" } },
  );
};
