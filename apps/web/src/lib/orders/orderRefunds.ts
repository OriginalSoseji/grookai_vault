import type { SupabaseClient } from "@supabase/supabase-js";
import type { createOrderRefundService } from "../payments/vendorOrderRefunds.ts";
import { readBillingBody } from "../billing/vendorBillingHttp.ts";
import { BillingError } from "../billing/vendorBillingRepository.ts";
import { acquisitionUuid } from "./orderAcquisitionTypes.ts";
import { refundAction, refundStatus } from "./orderRefunds.shared.ts";
import { projectRefundReview } from "./orderRefundReview.ts";
export async function readRefunds(client: SupabaseClient, orderId: string) {
  if (!acquisitionUuid.test(orderId)) return null;
  const { data, error } = await client.rpc("vendor_order_refund_status_v1", { p_order_id: orderId });
  if (error) throw new Error("Refund information is unavailable.");
  const result = refundStatus(data); if (result && result.orderId !== orderId) throw new Error("Refund information is unavailable."); return result;
}
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization", "Referrer-Policy": "no-referrer" } });
export function refundHandler(deps: { origin(): string; authenticate(): Promise<string | null>; service(): ReturnType<typeof createOrderRefundService> | null }) {
  return async (request: Request) => {
    try {
      if (request.method !== "POST") return json({ error: "POST required." }, 405);
      if (request.headers.get("origin") !== deps.origin()) return json({ error: "Invalid request origin." }, 403);
      const actor = await deps.authenticate(); if (!actor || !acquisitionUuid.test(actor)) return json({ error: "Sign in required." }, 401);
      let action;
      try { if (new URL(request.url).search) throw new Error(); action = refundAction(JSON.parse(await readBillingBody(request, 2048))); }
      catch (e) { return json({ error: "Invalid refund request." }, e instanceof BillingError && e.code === "billing_body_too_large" ? 413 : 400); }
      const service = deps.service(); if (!service) return json({ error: "Refund actions are unavailable." }, 503);
      if (action.action === "review") {
        const review = projectRefundReview(await service.reviewResolution(action.orderId, actor));
        if (review.orderId !== action.orderId) throw new Error("Refund review is unavailable.");
        return json(review);
      }
      if (action.action === "preview") return json(await service.preview(action.orderId, actor));
      if (action.action === "refresh") return json(await service.refresh(action.orderId, action.requestId, actor));
      return json(await service.create(action, actor));
    } catch (e) {
      const conflict = e instanceof Error && ["order_refund_busy", "order_refund_request_conflict", "order_refund_unresolved_request", "order_refund_amount_unavailable"].includes(e.message);
      return json({ error: conflict ? "The refund request is busy or has changed. Check its status before retrying the same request." : "The refund outcome could not be confirmed. Check its status before retrying the same request." }, conflict ? 409 : 503);
    }
  };
}
