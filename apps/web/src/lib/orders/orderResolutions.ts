import type { SupabaseClient } from "@supabase/supabase-js";
import type { createOrderRefundService } from "../payments/vendorOrderRefunds.ts";
import { readBillingBody } from "../billing/vendorBillingHttp.ts";
import { acquisitionUuid } from "./orderAcquisitionTypes.ts";
import { resolutionCommand, resolutionStatus } from "./orderResolutions.shared.ts";

export async function readResolutions(client: SupabaseClient, orderId: string) {
  if (!acquisitionUuid.test(orderId)) return null;
  const { data, error } = await client.rpc("vendor_order_resolution_status_v1", { p_order_id: orderId });
  if (error) throw new Error("Order resolution information is unavailable.");
  const result = resolutionStatus(data);
  if (result && result.orderId !== orderId) throw new Error("Order resolution information is unavailable.");
  return result;
}
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: {
  "Cache-Control": "private, no-store", Vary: "Cookie, Authorization", "Referrer-Policy": "no-referrer",
} });
export function resolutionHandler(deps: {
  origin(): string; authenticate(): Promise<string | null>; enabled(): boolean;
  admin(): SupabaseClient; refundService(): ReturnType<typeof createOrderRefundService> | null;
}) {
  return async (request: Request) => {
    try {
      if (request.method !== "POST") return json({ error: "POST required." }, 405);
      if (request.headers.get("origin") !== deps.origin()) return json({ error: "Invalid request origin." }, 403);
      const actor = await deps.authenticate();
      if (!actor || !acquisitionUuid.test(actor)) return json({ error: "Sign in required." }, 401);
      let command;
      try {
        if (new URL(request.url).search) throw new Error();
        command = resolutionCommand(JSON.parse(await readBillingBody(request, 2048)));
      } catch { return json({ error: "Invalid resolution request." }, 400); }
      if (!deps.enabled()) return json({ error: "Order resolution actions are unavailable." }, 503);
      if (command.action === "request") {
        const service = deps.refundService();
        if (!service) return json({ error: "Current refund information is unavailable." }, 503);
        return json(await service.requestResolution(command.orderId, command.requestId, actor));
      }
      const { data, error } = await deps.admin().rpc("vendor_order_resolution_record_v1", {
        p_order_id: command.orderId, p_case_id: command.caseId, p_actor_id: actor, p_request_id: command.requestId,
        p_expected_sequence: command.expectedSequence, p_action: command.action, p_terms_hash: command.termsHash,
      });
      if (error) throw new Error(error.message);
      if (data !== command.caseId) throw new Error("order_resolution_unavailable");
      return json({ caseId: data });
    } catch (error) {
      const changed = error instanceof Error && ["order_resolution_conflict", "order_resolution_changed", "order_revision_conflict", "order_resolution_not_ready"].includes(error.message);
      return json({ error: changed ? "The order or resolution changed. Reload its current status before responding."
        : "The resolution could not be confirmed. Reload its status before retrying the same request." }, changed ? 409 : 503);
    }
  };
}
