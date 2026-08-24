import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createServiceRoleClient } from "../_shared/auth.ts";
import { corsJson } from "../_shared/cors.ts";

type Json = Record<string, unknown>;

const MAX_PAYLOAD_BYTES = 256 * 1024;
const SUPPORTED_SEVERITIES = new Set(["critical", "high", "warning", "info"]);

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return mismatch === 0;
}

function authorize(req: Request): Response | null {
  const expected = cleanString(
    Deno.env.get("OPERATIONS_WEBHOOK_SHARED_SECRET"),
  );
  if (!expected) {
    return corsJson(500, { error: "operations_webhook_secret_not_configured" });
  }
  const bearer = req.headers.get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!bearer || !constantTimeEqual(bearer, expected)) {
    return corsJson(401, { error: "unauthorized" });
  }
  return null;
}

function validatePayload(payload: Json): string | null {
  if (!cleanString(payload.notification_id)) return "missing_notification_id";
  if (!cleanString(payload.event)) return "missing_event";
  if (!SUPPORTED_SEVERITIES.has(cleanString(payload.severity) ?? "")) {
    return "unsupported_severity";
  }
  if (!cleanString(payload.host)) return "missing_host";
  if (!cleanString(payload.unit)) return "missing_unit";
  return null;
}

async function dispatchNotification(notificationId: string) {
  const supabaseUrl = cleanString(Deno.env.get("SUPABASE_URL"));
  const dispatcherSecret = cleanString(
    Deno.env.get("NOTIFICATION_DISPATCHER_SHARED_SECRET"),
  );
  if (!supabaseUrl || !dispatcherSecret) {
    throw new Error("operations_notification_dispatcher_not_configured");
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/notification-dispatcher`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${dispatcherSecret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        operations_notification_id: notificationId,
      }),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok !== true) {
    throw new Error(`operations_notification_dispatch_failed:${response.status}`);
  }
  return body;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return corsJson(405, { error: "method_not_allowed" });
    }

    const authFailure = authorize(req);
    if (authFailure) return authFailure;

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_PAYLOAD_BYTES) {
      return corsJson(413, { error: "payload_too_large" });
    }

    const payload = JSON.parse(rawBody) as Json;
    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      return corsJson(400, { error: "payload_must_be_object" });
    }
    const validationError = validatePayload(payload);
    if (validationError) {
      return corsJson(400, { error: validationError });
    }

    const notificationId = cleanString(payload.notification_id)!;
    const sb = createServiceRoleClient();
    const { data, error } = await sb.rpc(
      "enqueue_operations_notification_v1",
      { p_payload: payload },
    );
    if (error) {
      throw new Error(`operations_notification_enqueue_failed:${error.message}`);
    }

    const dispatch = await dispatchNotification(notificationId);
    return corsJson(200, {
      ok: true,
      notification_id: notificationId,
      enqueue: Array.isArray(data) ? data[0] ?? null : data,
      dispatch,
    });
  } catch (error) {
    console.error("[operations-webhook-v1] request failed", error);
    return corsJson(500, {
      ok: false,
      error: "operations_webhook_failed",
    });
  }
});
