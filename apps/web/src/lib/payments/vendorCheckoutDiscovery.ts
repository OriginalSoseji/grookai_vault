import type Stripe from "stripe";
import type { CheckoutOrderBinding } from "./vendorCheckoutEvidence.ts";
import { assertCheckoutOrderBinding } from "./vendorCheckoutEvidence.ts";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import { VendorOrderError } from "./vendorOrderService.ts";

export type CheckoutDiscovery = { state: "candidate"; sessionId: string } |
  { state: "unresolved"; reason: "not_found" | "conflicting_sessions" | "scan_limit" };

// A bounded lookup hint, never payment evidence or permission to release stock.
// Search the entire closed V1 creation window, regardless of session status.
export async function discoverCheckoutSession(stripe: Stripe, config: SellerStripeConfig,
  order: CheckoutOrderBinding, clock: () => number): Promise<CheckoutDiscovery> {
  const start = clock();
  assertCheckoutOrderBinding(order, config.scope, start);
  const end = order.creationStartedAt + 23 * 3600;
  if (start < end + 120) throw new VendorOrderError("order_discovery_not_due");
  const time = () => {
    const now = clock();
    if (!Number.isSafeInteger(now) || now < start || now - start >= 60)
      throw new VendorOrderError("order_discovery_budget_exhausted");
  };
  async function read<T>(fn: () => Promise<T>): Promise<T> {
    time(); let result: T;
    try { result = await fn(); } catch { throw new VendorOrderError("order_discovery_provider_unavailable"); }
    time(); return result;
  }
  const platform = await read(() => stripe.accounts.retrieve(null));
  const balance = await read(() => stripe.balance.retrieve());
  if (platform.object !== "account" || platform.id !== config.scope.accountId ||
      balance.object !== "balance" || balance.livemode !== config.scope.livemode)
    throw new VendorOrderError("order_discovery_scope_mismatch");
  const seen = new Set<string>(), candidates: string[] = [];
  let after: string | undefined, previousCreated = end, conflicting = false;
  for (let page = 0; page < 3; page++) {
    const result = await read(() => stripe.checkout.sessions.list({ limit: 100,
      created: { gte: Math.max(0, order.creationStartedAt - 5), lt: end },
      ...(after ? { starting_after: after } : {}) }, { stripeAccount: order.seller.connectedAccountId }));
    if (result.object !== "list" || result.url !== "/v1/checkout/sessions" || !Array.isArray(result.data) ||
        result.data.length > 100 || typeof result.has_more !== "boolean" || (result.has_more && !result.data.length))
      throw new VendorOrderError("order_discovery_invalid_page");
    for (const session of result.data) {
      if (session.object !== "checkout.session" || typeof session.id !== "string" || session.id.length > 255 ||
          !new RegExp(`^cs_${config.scope.livemode ? "live" : "test"}_[A-Za-z0-9]+$`).test(session.id) ||
          seen.has(session.id) || session.livemode !== config.scope.livemode || !Number.isSafeInteger(session.created) ||
          session.created < Math.max(0, order.creationStartedAt - 5) || session.created >= end || session.created > previousCreated)
        throw new VendorOrderError("order_discovery_invalid_page");
      seen.add(session.id); previousCreated = session.created;
      const m = session.metadata;
      const related = session.client_reference_id === order.orderId || m?.grookai_order_id === order.orderId ||
        m?.grookai_attempt_id === order.attemptId || m?.grookai_reservation_id === order.reservationId;
      if (!related) continue;
      if (session.mode !== "payment" || session.client_reference_id !== order.orderId ||
          m?.grookai_order_id !== order.orderId || m?.grookai_attempt_id !== order.attemptId ||
          m?.grookai_reservation_id !== order.reservationId) conflicting = true;
      else candidates.push(session.id);
    }
    if (conflicting || candidates.length > 1) return { state: "unresolved", reason: "conflicting_sessions" };
    if (!result.has_more) return candidates.length === 1 ? { state: "candidate", sessionId: candidates[0] } :
      { state: "unresolved", reason: "not_found" };
    after = result.data[result.data.length - 1].id;
  }
  return { state: "unresolved", reason: "scan_limit" };
}
