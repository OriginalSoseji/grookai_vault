import { corsHeaders, corsJson } from "../_shared/cors.ts";

type Dependencies = {
  requireUser: (request: Request) => Promise<{ userId: string }>;
  createServiceRoleClient: () => {
    rpc: (
      name: string,
      params: Record<string, unknown>,
    ) => PromiseLike<
      { data: unknown; error: { code?: string; message?: string } | null }
    >;
  };
};
const actions = new Set([
  "lot.save",
  "lots.list",
  "batches.list",
  "batch.get",
  "batch.save",
  "batch.commit",
  "lot.detail",
  "copies.filter",
  "allocation.revise",
  "sale.record",
]);
const businessErrors = new Set([
  "revision_conflict",
  "lot_currency_locked",
  "currency_mismatch",
  "total_below_allocated_cost",
  "allocation_exceeds_lot_total",
  "allocation_review_required",
  "disposed_copy_cost_locked",
  "revision_reason_required",
  "batch_copy_limit",
  "saved_batch_origin_locked",
  "lot_changed_review_costs_again",
  "request_conflict",
  "invalid_payload",
  "invalid_tags",
  "invalid_snapshot",
  "invalid_items",
  "invalid_quantity",
  "invalid_cost",
  "cost_count_mismatch",
  "card_required",
  "batch_too_large",
  "invalid_sale_amount",
  "invalid_sale_expenses",
  "invalid_sale_currency",
]);
const maxBytes = 4_000_000;

export function createIntakeHandler(dependencies: Dependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return corsJson(405, { error: "method_not_allowed" });
    }
    let auth: { userId: string };
    try {
      auth = await dependencies.requireUser(req);
    } catch {
      return corsJson(401, { error: "sign_in_required" });
    }
    let body;
    try {
      const reader = req.body?.getReader();
      if (!reader) return corsJson(400, { error: "invalid_json" });
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          return corsJson(413, { error: "batch_too_large" });
        }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return corsJson(400, { error: "invalid_json" });
    }
    if (
      !body || !actions.has(body.action) ||
      (body.payload != null &&
        (typeof body.payload !== "object" || Array.isArray(body.payload)))
    ) return corsJson(400, { error: "invalid_intake_request" });
    try {
      const { data, error } = await dependencies.createServiceRoleClient().rpc(
        "vault_intake_request_v1",
        {
          p_actor_user_id: auth.userId,
          p_action: body.action,
          p_payload: body.payload ?? {},
        },
      );
      if (error) {
        // An RPC-level error means no audited envelope was received. Business
        // failures are returned by the wrapper below, after persistence.
        console.error("[vault-intake-v1]", body.action, error.code);
        return corsJson(503, { error: "intake_service_unavailable" });
      }
      const envelope = data as Record<string, unknown> | null;
      if (
        !envelope || typeof envelope !== "object" ||
        envelope.version !== 1 || typeof envelope.ok !== "boolean" ||
        typeof envelope.operation_id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          .test(envelope.operation_id)
      ) return corsJson(503, { error: "intake_service_unavailable" });
      if (!envelope.ok) {
        const failure = envelope.error as Record<string, unknown> | null;
        const state = typeof failure?.sqlstate === "string"
          ? failure.sqlstate
          : "";
        const code = typeof failure?.code === "string" ? failure.code : "";
        if (!code || !/^[A-Z0-9]{5}$/.test(state)) {
          return corsJson(503, { error: "intake_service_unavailable" });
        }
        const unavailable = code === "intake_writes_disabled" ||
          /^(08|42|53|57|58|XX)/.test(state);
        const conflict = ["40001", "23505"].includes(state) ||
          code === "request_conflict";
        const missing = state === "P0002";
        const status = unavailable ? 503 : conflict ? 409 : missing ? 404 : 422;
        const publicCode = unavailable
          ? "intake_service_unavailable"
          : missing
          ? "not_found"
          : businessErrors.has(code)
          ? code
          : "intake_request_failed";
        console.error(
          "[vault-intake-v1]",
          body.action,
          state,
          envelope.operation_id,
        );
        return corsJson(status, {
          error: publicCode,
          operation_id: envelope.operation_id,
        });
      }
      if (!Object.prototype.hasOwnProperty.call(envelope, "result")) {
        return corsJson(503, { error: "intake_service_unavailable" });
      }
      return corsJson(200, {
        ok: true,
        result: envelope.result,
        operation_id: envelope.operation_id,
      });
    } catch {
      return corsJson(503, { error: "intake_service_unavailable" });
    }
  };
}
