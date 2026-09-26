import type { SupabaseClient } from "@supabase/supabase-js";
import { readBillingBody } from "../billing/vendorBillingHttp.ts";
import { BillingError } from "../billing/vendorBillingRepository.ts";
import { acquisitionUuid } from "./orderAcquisitionTypes.ts";
export type CancellationStatus = { canCancel: boolean; canceledAt: string | null };
export function cancellationEnabled(env: NodeJS.ProcessEnv, origin: string) {
  if (env.GROOKAI_VENDOR_ORDER_CANCELLATION_ENABLED !== "true") return false;
  if (env.NEXT_PUBLIC_STOREFRONT_LOCAL_TEST !== "true" || env.NEXT_PUBLIC_COLLECTOR_STAGING !== "true" ||
      env.GROOKAI_DISABLE_TELEMETRY !== "1" || env.SUPABASE_URL !== "http://127.0.0.1:15439" || origin !== "http://127.0.0.1:21240" ||
      env.VERCEL || env.VERCEL_ENV || env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING === "true") throw new Error("Cancellation configuration unavailable.");
  return true;
}
export function cancellationStatus(value: unknown): CancellationStatus | null {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Cancellation status unavailable.");
  const v = value as Record<string, unknown>;
  if (typeof v.canCancel !== "boolean" || v.canceledAt !== null && (typeof v.canceledAt !== "string" || !Number.isFinite(Date.parse(v.canceledAt))) || v.canCancel && v.canceledAt !== null) throw new Error("Cancellation status unavailable.");
  return { canCancel: v.canCancel, canceledAt: v.canceledAt as string | null };
}
export async function readCancellation(client: SupabaseClient, orderId: string) {
  const { data, error } = await client.rpc("vendor_order_cancellation_status_v1", { p_order_id: orderId });
  if (error) throw new Error("Cancellation status unavailable.");
  return cancellationStatus(data);
}
export function cancellationService(admin: SupabaseClient) {
  return async (orderId: string, buyerId: string) => {
    const { data, error } = await admin.rpc("vendor_order_cancel_unstarted_v1", { p_order_id: orderId, p_buyer_id: buyerId });
    if (error) throw new Error(error.message === "order_checkout_started" ? "order_checkout_started" : "order_cancellation_unavailable");
    if (!data || data.orderId !== orderId || data.state !== "canceled" || typeof data.canceledAt !== "string" || !Number.isFinite(Date.parse(data.canceledAt))) throw new Error("order_cancellation_unavailable");
    return { orderId, state: "canceled" as const, canceledAt: data.canceledAt as string };
  };
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "Vary": "Cookie, Authorization" } });
export function cancellationHandler(deps: { origin(): string; authenticate(): Promise<string | null>; service(): ReturnType<typeof cancellationService> | null }) {
  return async (request: Request) => {
    try {
      if (request.method !== "POST") return json({ error: "POST required." }, 405);
      if (request.headers.get("origin") !== deps.origin()) return json({ error: "Invalid request origin." }, 403);
      const buyer = await deps.authenticate();if (!buyer) return json({ error: "Sign in required." }, 401);
      let body;try { body = JSON.parse(await readBillingBody(request, 512)); } catch (e) { return json({ error: "Invalid cancellation request." }, e instanceof BillingError && e.code === "billing_body_too_large" ? 413 : 400); }
      if (!body || Object.keys(body).join(",") !== "orderId" || typeof body.orderId !== "string" || !acquisitionUuid.test(body.orderId) || new URL(request.url).search) return json({ error: "Invalid cancellation request." }, 400);
      const service = deps.service();if (!service) return json({ error: "Order cancellation is unavailable." }, 503);
      return json(await service(body.orderId, buyer));
    } catch (e) {
      if (e instanceof Error && e.message === "order_checkout_started") return json({ error: "Checkout has already started. This order cannot be canceled here; its inventory remains held while payment is resolved." }, 409);
      return json({ error: "Cancellation could not be confirmed. Reload this order or retry the same request." }, 503);
    }
  };
}
