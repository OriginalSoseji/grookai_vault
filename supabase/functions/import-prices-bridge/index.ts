// LEGACY NOTICE:
// This Edge function is part of the deprecated pricing pipeline
// (admin.import_prices_do) and remains only for historical reference.
// New pricing work must flow through the eBay-based pipelines instead.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("[IMPORT-PRICES-BRIDGE] version=GV-EDGE-2025-11-20");

type Json = Record<string, unknown>;

function jsonResponse(body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req: Request): Promise<Response> => {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const mode: string | undefined =
    typeof body?.mode === "string" ? body.mode : undefined;

  const dryRun: boolean =
    typeof body?.dryRun === "boolean" ? body.dryRun : false;

  const limit: number =
    typeof body?.limit === "number" ? body.limit : 50;

  if (mode === "health") {
    return jsonResponse({
      ok: true,
      mode: "health",
      source: "edge",
      timestamp: new Date().toISOString(),
    });
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

    return jsonResponse({
      ok: true,
      mode: "env_debug",
      env: envSnapshot,
    });
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
    return jsonResponse(
      {
        ok: false,
        code: 500,
        reason: "supabase-config-missing",
      },
      500,
    );
  }

  if (!bridgeToken) {
    return jsonResponse(
      {
        ok: false,
        code: 500,
        reason: "bridge-token-config-missing",
      },
      500,
    );
  }

  const headerToken =
    req.headers.get("x-bridge-token") ??
    req.headers.get("X-Bridge-Token");

  if (!headerToken || headerToken !== bridgeToken) {
    return jsonResponse(
      {
        ok: false,
        code: 401,
        reason: "bridge-token-invalid",
      },
      401,
    );
  }

  const supabase = createClient(url, pub);

  try {
    const { data, error } = await supabase.rpc(
      "admin.import_prices_do",
      {
        dry_run: dryRun,
        limit,
      },
    );

    if (error) {
      return jsonResponse(
        {
          ok: false,
          error: error.message ?? String(error),
        },
        500,
      );
    }

    return jsonResponse(
      {
        ok: true,
        data,
      },
      200,
    );
  } catch (e) {
    return jsonResponse(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      500,
    );
  }
};
