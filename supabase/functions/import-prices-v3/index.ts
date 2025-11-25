// LEGACY NOTICE:
// This Edge function is part of the deprecated pricing pipeline
// (admin.import_prices_do) and remains only for historical reference.
// New pricing work must flow through the eBay-based pipelines instead.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("[IMPORT-PRICES-V3] version=GV-EDGE-2025-11-20");

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const mode = typeof body?.mode === "string" ? body.mode : undefined;

  if (mode === "health") {
    return new Response(
      JSON.stringify({
        ok: true,
        mode: "health",
        source: "edge",
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  if (mode === "env_debug") {
    const envSnapshot = {
      SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
      PROJECT_URL: !!Deno.env.get("PROJECT_URL"),
      SUPABASE_PUBLISHABLE_KEY: !!Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
      SUPABASE_ANON_KEY: !!Deno.env.get("SUPABASE_ANON_KEY"),
      ANON_KEY: !!Deno.env.get("ANON_KEY"),
      BRIDGE_IMPORT_TOKEN: !!Deno.env.get("BRIDGE_IMPORT_TOKEN"),
    };

    return new Response(
      JSON.stringify({ ok: true, mode: "env_debug", env: envSnapshot }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  const url =
    Deno.env.get("SUPABASE_URL") ??
    Deno.env.get("PROJECT_URL") ??
    "";

  const pub =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("ANON_KEY") ??
    "";

  const bridgeToken = Deno.env.get("BRIDGE_IMPORT_TOKEN") ?? "";

  if (!url || !pub) {
    return new Response(
      JSON.stringify({
        ok: false,
        code: 500,
        reason: "supabase-config-missing",
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  if (!bridgeToken) {
    return new Response(
      JSON.stringify({
        ok: false,
        code: 500,
        reason: "bridge-token-config-missing",
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const headerToken =
    req.headers.get("x-bridge-token") ??
    req.headers.get("X-Bridge-Token");

  if (!headerToken || headerToken !== bridgeToken) {
    return new Response(
      JSON.stringify({
        ok: false,
        code: 401,
        reason: "bridge-token-invalid",
      }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  const supabase = createClient(url, pub, {
    global: {
      headers: {
        "x-edge-function": "import-prices-v3",
      },
    },
  });

  const dryRun =
    typeof body?.dryRun === "boolean" ? body.dryRun : false;
  const limit =
    typeof body?.limit === "number" && Number.isFinite(body.limit)
      ? body.limit
      : 50;

  try {
    const { data, error: rpcError } = await supabase.rpc(
      "admin.import_prices_do",
      {
        dry_run: dryRun,
        limit,
      },
    );

    if (rpcError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: rpcError.message ?? String(rpcError),
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, data }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
};
