import type { SupabaseClient } from "@supabase/supabase-js";
import { readBillingBody } from "../billing/vendorBillingHttp.ts";
import { BillingError } from "../billing/vendorBillingRepository.ts";
import { acquisitionUuid } from "./orderAcquisitionTypes.ts";

import { fulfillmentStatus, fulfillmentCommand, fulfillmentEvent, type FulfillmentCommand } from "./orderFulfillment.shared.ts";
export * from "./orderFulfillment.shared.ts";
const fail = () => new Error("Fulfillment information is unavailable.");
const id = (v: unknown): v is string => typeof v === "string" && acquisitionUuid.test(v);
export async function readFulfillment(client: SupabaseClient, orderId: string) {
  if (!id(orderId)) return null;
  const { data, error } = await client.rpc("vendor_order_fulfillment_status_v1", { p_order_id: orderId });
  if (error) throw fail();
  const v = fulfillmentStatus(data); if (v && v.orderId !== orderId) throw fail(); return v;
}
export function fulfillmentService(admin: SupabaseClient) {
  return async (value: FulfillmentCommand, actorId: string) => {
    const v = fulfillmentCommand(value); if (!id(actorId)) throw fail();
    const { data, error } = await admin.rpc("vendor_order_fulfillment_record_v1", { p_order_id: v.orderId, p_actor_id: actorId, p_request_id: v.requestId,
      p_expected_sequence: v.expectedSequence, p_action: v.action, p_carrier: v.carrier, p_tracking: v.tracking });
    if (error) throw new Error(error.message === "order_fulfillment_conflict" ? "order_fulfillment_conflict" : "order_fulfillment_unavailable");
    const receipt = fulfillmentEvent(data);
    if (data.orderId !== v.orderId || receipt.requestId !== v.requestId || receipt.sequence !== v.expectedSequence + 1 || receipt.action !== v.action) throw fail();
    return { orderId: v.orderId, ...receipt };
  };
}
export function fulfillmentEnabled(env: NodeJS.ProcessEnv, origin: string) {
  if (env.GROOKAI_VENDOR_ORDER_FULFILLMENT_ENABLED !== "true") return false;
  // Local candidate only until governed deployment approval and complete commerce proof.
  if (env.NEXT_PUBLIC_STOREFRONT_LOCAL_TEST !== "true" || env.NEXT_PUBLIC_COLLECTOR_STAGING !== "true" || env.GROOKAI_DISABLE_TELEMETRY !== "1" ||
      env.SUPABASE_URL !== "http://127.0.0.1:15439" || origin !== "http://127.0.0.1:22440" || env.VERCEL || env.VERCEL_ENV || env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING === "true") throw fail();
  return true;
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization", "Referrer-Policy": "no-referrer" } });
export function fulfillmentHandler(deps: { origin(): string; authenticate(): Promise<string | null>; service(): ReturnType<typeof fulfillmentService> | null }) {
  return async (request: Request) => {
    try {
      if (request.method !== "POST") return json({ error: "POST required." }, 405);
      if (request.headers.get("origin") !== deps.origin()) return json({ error: "Invalid request origin." }, 403);
      const actor = await deps.authenticate(); if (!actor || !id(actor)) return json({ error: "Sign in required." }, 401);
      let command;
      try { if (new URL(request.url).search) throw fail(); command = fulfillmentCommand(JSON.parse(await readBillingBody(request, 2048))); }
      catch (e) { return json({ error: "Invalid fulfillment update." }, e instanceof BillingError && e.code === "billing_body_too_large" ? 413 : 400); }
      const service = deps.service(); if (!service) return json({ error: "Fulfillment updates are unavailable." }, 503);
      return json(await service(command, actor));
    } catch (e) {
      if (e instanceof Error && e.message === "order_fulfillment_conflict") return json({ error: "This order changed. Reload its progress before recording another update." }, 409);
      return json({ error: "The update could not be confirmed. Reload this order or retry the same update." }, 503);
    }
  };
}
