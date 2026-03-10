import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { json, requireUser } from "../_shared/auth.ts";
import { getServiceRoleKey } from "../_shared/key_resolver.ts";

console.log("[pricing-live-request] version=2025-11-26");

type LivePriceRequestBody = {
  card_print_id?: unknown;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();

  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed", detail: "POST required" });
  }

  let userId = "";
  try {
    const auth = await requireUser(req);
    userId = auth.userId;
  } catch (err) {
    const code = (typeof err === "object" && err !== null && "code" in err)
      ? String((err as { code?: unknown }).code ?? "unknown")
      : "unknown";
    const detail = code === "missing_bearer_token"
      ? "Missing bearer token"
      : code === "invalid_jwt"
      ? "Invalid JWT"
      : "Authentication failed";

    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        outcome: "rejected_auth",
        detail,
      }),
    );

    if (code === "missing_bearer_token" || code === "invalid_jwt") {
      return json(401, { error: "auth_required", detail });
    }
    if (code === "server_misconfigured") {
      return json(500, { error: "server_misconfigured", detail: "Auth environment missing" });
    }
    return json(401, { error: "auth_required", detail });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL") ?? "";
  const serviceRole = getServiceRoleKey() ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRole) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        outcome: "rejected_server_config",
      }),
    );
    return json(500, { error: "server_misconfigured", detail: "Supabase configuration missing" });
  }

  let body: LivePriceRequestBody = {};
  try {
    body = (await req.json()) as LivePriceRequestBody;
  } catch {
    body = {};
  }

  const fields: Record<string, string> = {};
  const cardPrintId = typeof body.card_print_id === "string" ? body.card_print_id.trim() : "";
  if (!cardPrintId) {
    fields.card_print_id = "required";
  } else if (!isUuid(cardPrintId)) {
    fields.card_print_id = "must_be_uuid";
  }

  if (Object.keys(fields).length > 0) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId || null,
        outcome: "rejected_invalid_request",
        fields,
      }),
    );
    return json(400, {
      error: "invalid_request",
      detail: "Invalid request payload",
      fields,
    });
  }

  const client = createClient(supabaseUrl, serviceRole);

  const { data, error } = await client
    .from("pricing_jobs")
    .insert({
      card_print_id: cardPrintId,
      requester_user_id: userId,
      priority: "user",
      reason: "live_price_request",
      status: "pending",
    })
    .select("id, status, card_print_id")
    .maybeSingle();

  if (error) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "enqueue_failed",
        detail: error.message,
      }),
    );
    return json(500, { error: "enqueue_failed", detail: "Failed to queue pricing request" });
  }

  console.log(
    JSON.stringify({
      route: "pricing-live-request",
      request_id: requestId,
      user_id: userId,
      card_print_id: cardPrintId,
      outcome: "enqueued",
      pricing_job_id: data?.id ?? null,
    }),
  );

  return json(201, {
    status: "queued",
    request_id: data?.id,
    card_print_id: data?.card_print_id,
  });
};

if (import.meta.main) {
  Deno.serve(handler);
}

export default handler;
