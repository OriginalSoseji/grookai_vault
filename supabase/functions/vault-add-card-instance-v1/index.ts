import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createServiceRoleClient, requireUser } from "../_shared/auth.ts";
import { corsHeaders, corsJson } from "../_shared/cors.ts";

type VaultAddPayload = {
  card_print_id?: string;
  card_printing_id?: string | null;
  quantity?: number;
  condition_label?: string | null;
  notes?: string | null;
  name?: string | null;
  set_name?: string | null;
  photo_url?: string | null;
};

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanQuantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.trunc(value));
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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

    let auth: Awaited<ReturnType<typeof requireUser>>;
    try {
      auth = await requireUser(req);
    } catch (err) {
      const code = (err as { code?: string } | null | undefined)?.code;
      if (code === "missing_bearer_token") return corsJson(401, { error: "missing_bearer_token" });
      if (code === "invalid_jwt") return corsJson(401, { error: "invalid_jwt" });
      if (code === "server_misconfigured") return corsJson(500, { error: "server_misconfigured" });
      throw err;
    }

    const body = (await req.json()) as VaultAddPayload;
    const cardPrintId = cleanOptionalString(body.card_print_id);
    const cardPrintingId = cleanOptionalString(body.card_printing_id);

    if (!isUuid(cardPrintId)) {
      return corsJson(400, { error: "invalid_card_print_id" });
    }
    if (cardPrintingId !== null && !isUuid(cardPrintingId)) {
      return corsJson(400, { error: "invalid_card_printing_id" });
    }

    const sb = createServiceRoleClient();
    const { data, error } = await sb.rpc("vault_add_card_instance_service_v1", {
      p_actor_user_id: auth.userId,
      p_card_print_id: cardPrintId,
      p_card_printing_id: cardPrintingId,
      p_quantity: cleanQuantity(body.quantity),
      p_condition_label: cleanOptionalString(body.condition_label) ?? "NM",
      p_notes: cleanOptionalString(body.notes),
      p_name: cleanOptionalString(body.name),
      p_set_name: cleanOptionalString(body.set_name),
      p_photo_url: cleanOptionalString(body.photo_url),
    });

    if (error || !data) {
      return corsJson(500, {
        error: "vault_add_failed",
        detail: error?.message ?? "unknown",
      });
    }

    return corsJson(200, {
      success: true,
      result: data,
    });
  } catch (err) {
    return corsJson(500, {
      error: "internal_error",
      detail: String((err as Error)?.message ?? err),
    });
  }
});
