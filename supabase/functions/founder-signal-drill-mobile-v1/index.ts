import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAuthUser } from "../_shared/auth.ts";
import { corsHeaders, corsJson } from "../_shared/cors.ts";
import {
  loadFounderCardSignalDrilldown,
  loadFounderSetSignalDrilldown,
} from "../_shared/founder_market_signal_drilldown.ts";

const FOUNDER_EMAIL = "ccabrl@gmail.com";

type DrilldownRequest =
  | {
      kind: "card";
      card_print_id?: unknown;
    }
  | {
      kind: "set";
      set_code?: unknown;
    };

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

    const body = (await req.json()) as DrilldownRequest;

    if (body?.kind === "card") {
      const cardPrintId = typeof body.card_print_id === "string"
        ? body.card_print_id.trim()
        : "";
      if (!cardPrintId) {
        return corsJson(400, { error: "card_print_id_required" });
      }

      try {
        const payload = await loadFounderCardSignalDrilldown(auth.sb, cardPrintId);
        return corsJson(200, payload);
      } catch (err) {
        if ((err as Error).message === "card_not_found") {
          return corsJson(404, { error: "card_not_found" });
        }
        throw err;
      }
    }

    if (body?.kind === "set") {
      const setCode = typeof body.set_code === "string"
        ? body.set_code.trim()
        : "";
      if (!setCode) {
        return corsJson(400, { error: "set_code_required" });
      }

      try {
        const payload = await loadFounderSetSignalDrilldown(auth.sb, {
          setCode,
        });
        return corsJson(200, payload);
      } catch (err) {
        if ((err as Error).message === "set_not_found") {
          return corsJson(404, { error: "set_not_found" });
        }
        throw err;
      }
    }

    return corsJson(400, { error: "invalid_kind" });
  } catch (_err) {
    return corsJson(500, { error: "internal_error" });
  }
});
