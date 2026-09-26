import { createHash, timingSafeEqual } from "node:crypto";
import { readBillingBody } from "../billing/vendorBillingHttp.ts";
import { BillingError } from "../billing/vendorBillingRepository.ts";
import { CheckoutEvidenceError } from "./vendorCheckoutEvidence.ts";
import { VendorOrderError } from "./vendorOrderService.ts";
import type { CheckoutResult } from "./vendorCheckoutCreation.ts";
import type { reconcileVendorOrderPage } from "./vendorOrderReconciliation.ts";
import { projectOrderQueueStatus, projectOrderQueueTick, orderQueueAlerts } from "./vendorOrderQueue.ts";
import type { createOrderQueueService, QueueStatus } from "./vendorOrderQueue.ts";

export type OrderLane = "checkout" | "events" | "reconcile" | "queue";
export interface OrderHttpRuntime {
  checkout(orderId: string, buyerId: string): Promise<CheckoutResult>;
  signal(payload: string, signature: string): Promise<unknown>;
  reconcile(input: { after?: string; limit?: number }): Promise<Awaited<ReturnType<typeof reconcileVendorOrderPage>>>;
  retry(orderId: string): Promise<unknown>;
  discover(orderId: string): Promise<{ orderId: string; state: "reconciled" } |
    { orderId: string; state: "unresolved"; reason: "not_found" | "conflicting_sessions" | "scan_limit" }>;
  queueTick(): Promise<Awaited<ReturnType<ReturnType<typeof createOrderQueueService>["tick"]>>>;
  queueStatus(): Promise<QueueStatus>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization", "Referrer-Policy": "no-referrer" };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
function failure(error: unknown) {
  if (error instanceof BillingError) return json({ error: "Invalid request body." }, error.code === "billing_body_too_large" ? 413 : 400);
  if (error instanceof VendorOrderError && ["order_claim_busy", "order_lease_lost", "order_revision_conflict"].includes(error.code))
    return json({ error: "An order update is running. Reload your order before trying again." }, 409);
  return json({ error: "Order payments are unavailable. Reload your order to check its recorded status." }, 503);
}
function input(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
  return value as Record<string, unknown>;
}
export function validOrderReconcileToken(token: unknown): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}
function operatorAuthorized(request: Request, expected: string | null) {
  if (!validOrderReconcileToken(expected)) return false;
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer [a-f0-9]{64}$/.test(authorization)) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(authorization.slice(7)), digest(expected));
}
export function createVendorOrderHandlers(deps: {
  authenticate(): Promise<string | null>; origin(): string;
  runtime(lane: OrderLane): OrderHttpRuntime | null; reconcileToken(): string | null;
}) {
  return {
    async queue(request: Request) {
      try {
        if (request.method !== "POST") return json({ error: "POST required." }, 405);
        if (!operatorAuthorized(request, deps.reconcileToken())) return json({ error: "Operator authentication required." }, 401);
        let body;
        try { body = input(JSON.parse(await readBillingBody(request, 512))); }
        catch (e) { return e instanceof BillingError ? failure(e) : json({ error: "Invalid queue request." }, 400); }
        if (new URL(request.url).search || Object.keys(body).join(",") !== "action" || !["tick", "status"].includes(body.action as string))
          return json({ error: "Invalid queue request." }, 400);
        // Pausing queue work must not hide retained monitoring. Status uses the
        // separate reconciliation lane and never invokes provider IO or seeding.
        const runtime = deps.runtime(body.action === "tick" ? "queue" : "reconcile");
        if (!runtime) return json({ error: "Order queue unavailable." }, 503);
        if (body.action === "status") {
          const status = projectOrderQueueStatus(await runtime.queueStatus()), alerts = orderQueueAlerts(status);
          return json({ status, alerts }, alerts.length ? 503 : 200);
        }
        const result = projectOrderQueueTick(await runtime.queueTick());
        return json(result, result.processed === 1 && result.receipt.result !== "verified" ? 503 : 200);
      } catch { return json({ error: "Order queue operation incomplete; retry required." }, 503); }
    },
    async checkout(request: Request) {
      try {
        if (request.method !== "POST") return json({ error: "POST required." }, 405);
        if (request.headers.get("origin") !== deps.origin()) return json({ error: "Invalid request origin." }, 403);
        const buyer = await deps.authenticate();
        if (!buyer) return json({ error: "Sign in required." }, 401);
        if (!uuid.test(buyer)) throw new Error("invalid Auth identity");
        let body;
        try { body = input(JSON.parse(await readBillingBody(request, 512))); }
        catch (e) { return e instanceof BillingError ? failure(e) : json({ error: "Invalid order request." }, 400); }
        if (new URL(request.url).search || Object.keys(body).join(",") !== "orderId" || typeof body.orderId !== "string" || !uuid.test(body.orderId))
          return json({ error: "Invalid order request." }, 400);
        const runtime = deps.runtime("checkout"); if (!runtime) return failure(null);
        // Buyer is server Auth, never body metadata. SQL rechecks this exact buyer
        // and all acquisition rights before creation or returning an existing URL.
        const result = await runtime.checkout(body.orderId, buyer);
        if (result.orderId !== body.orderId) throw new Error("wrong order");
        if (result.state === "reconciled") return json({ orderId: result.orderId, state: "reconciled" });
        if (result.state !== "open") throw new Error("invalid checkout result");
        const url = new URL(result.url);
        if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com" || url.port || url.username || url.password || url.search || !/^\/c\/pay\/cs_(test|live)_[A-Za-z0-9]+$/.test(url.pathname)) throw new Error("invalid checkout URL");
        return json({ orderId: result.orderId, state: "open", url: result.url });
      } catch (e) { return failure(e); }
    },
    async webhook(request: Request) {
      try {
        if (request.method !== "POST") return json({ error: "POST required." }, 405);
        const runtime = deps.runtime("events"); if (!runtime) return json({ error: "Order events unavailable." }, 503);
        // The exact signed UTF-8 body goes into the existing signature verifier.
        // ACK only durable retention; no provider fetch, stock mutation or payment
        // inference in the webhook. Repeated delivery uses the same SQL unique key.
        await runtime.signal(await readBillingBody(request, 256 * 1024), request.headers.get("stripe-signature") ?? "");
        return json({ received: true });
      } catch (e) {
        if (e instanceof CheckoutEvidenceError) return json({ error: "Invalid order webhook." }, 400);
        if (e instanceof BillingError) return failure(e);
        return json({ error: "Event could not be retained; retry required." }, 503);
      }
    },
    async reconcile(request: Request) {
      try {
        if (request.method !== "POST") return json({ error: "POST required." }, 405);
        // No user cookie, Stripe signature or query-string credential grants this
        // operation. Authenticate BEFORE parsing or creating an admin/provider client.
        if (!operatorAuthorized(request, deps.reconcileToken())) return json({ error: "Operator authentication required." }, 401);
        let body;
        try { body = input(JSON.parse(await readBillingBody(request, 512))); }
        catch (e) { return e instanceof BillingError ? failure(e) : json({ error: "Invalid reconciliation request." }, 400); }
        const keys = Object.keys(body);
        const targeted = keys.length === 1 && keys[0] === "orderId" && typeof body.orderId === "string" && uuid.test(body.orderId);
        const discovery = keys.length === 1 && keys[0] === "discoverOrderId" && typeof body.discoverOrderId === "string" && uuid.test(body.discoverOrderId);
        const page = keys.every(k => ["after", "limit"].includes(k)) &&
          (body.after === undefined || typeof body.after === "string" && uuid.test(body.after)) &&
          (body.limit === undefined || Number.isInteger(body.limit) && Number(body.limit) >= 1 && Number(body.limit) <= 25);
        if (new URL(request.url).search || (!targeted && !page && !discovery)) return json({ error: "Invalid reconciliation request." }, 400);
        const runtime = deps.runtime("reconcile"); if (!runtime) return json({ error: "Order reconciliation unavailable." }, 503);
        if (discovery) {
          const result = await runtime.discover(body.discoverOrderId as string);
          if (result.orderId !== body.discoverOrderId) throw new Error("Invalid discovery result");
          if (result.state === "reconciled") return json({ orderId: result.orderId, state: "reconciled" });
          if (result.state !== "unresolved" || !["not_found", "conflicting_sessions", "scan_limit"].includes(result.reason))
            throw new Error("Invalid discovery result");
          return json({ orderId: result.orderId, state: "unresolved", reason: result.reason }, 503);
        }
        if (targeted) { await runtime.retry(body.orderId as string); return json({ reconciled: true, orderId: body.orderId }); }
        // Explicit failed IDs and continuation are for this authenticated operator
        // only. A partial pass is retryable, never reported as a complete success.
        const result = await runtime.reconcile(body as { after?: string; limit?: number });
        return json(result, result.failed.length || result.budgetExhausted ? 503 : 200);
      } catch { return json({ error: "Order reconciliation did not complete; retry required." }, 503); }
    },
  };
}
