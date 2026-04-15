import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAuthUser } from "../_shared/auth.ts";
import { corsHeaders, corsJson } from "../_shared/cors.ts";
import { loadFounderMarketSignals } from "../_shared/founder_market_signals.ts";

const FOUNDER_EMAIL = "ccabrl@gmail.com";

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders,
      });
    }
    if (req.method !== "POST") {
      return corsJson(405, { error: "method_not_allowed" });
    }

    let auth: Awaited<ReturnType<typeof requireAuthUser>>;
    try {
      auth = await requireAuthUser(req);
    } catch (err) {
      const code = (err as { code?: string } | null | undefined)?.code;
      if (code === "missing_bearer_token") {
        return corsJson(401, { error: "missing_bearer_token" });
      }
      if (code === "invalid_jwt") {
        return corsJson(401, { error: "invalid_jwt" });
      }
      if (code === "server_misconfigured") {
        return corsJson(500, { error: "server_misconfigured" });
      }
      throw err;
    }

    const userEmail = auth.userEmail?.trim().toLowerCase() ?? "";
    if (userEmail != FOUNDER_EMAIL) {
      return corsJson(403, { error: "forbidden" });
    }

    const bundle = await loadFounderMarketSignals(auth.sb);
    return corsJson(200, bundle);
  } catch (_err) {
    return corsJson(500, { error: "internal_error" });
  }
});
