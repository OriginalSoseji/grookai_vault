import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SellerBinding } from "./vendorSellerPolicy.ts";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import { readVerifiedSellerReadiness } from "./vendorSellerStripeGateway.ts";
import { SELLER_CONTROLLER } from "./vendorSellerEnrollment.ts";
import { assertCheckoutOrderBinding, readVerifiedCheckoutEvidence, requireVerifiedCheckoutEvidence } from "./vendorCheckoutEvidence.ts";
import type { CheckoutOrderBinding } from "./vendorCheckoutEvidence.ts";
import { reconcileVendorOrder, VendorOrderError } from "./vendorOrderService.ts";
import { discoverCheckoutSession } from "./vendorCheckoutDiscovery.ts";

// V1 request bytes are a compatibility contract across ambiguous retries.
// Never change its origin, line naming or parameters for an existing attempt.
const origin = (live: boolean) => live ? "https://grookaivault.com" : "http://127.0.0.1:20040";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Attempt = { id: string; order_id: string; stripe_account_id: string; connected_account_id: string; livemode: boolean;
  creation_started_at: string; session_id: string | null; session_created_at: string | null; payment_intent_id: string | null;
  lease_token: string | null; lease_fence: number; lease_expires_at: string | null };
export type CheckoutPreparation = {
  order: { id: string; reservation_id: string; buyer_id: string; owner_id: string; seller: SellerBinding;
    quantity: number; unit_amount_minor: number; shipping_amount_minor: number; tax_amount_minor: number;
    currency: "usd"; fulfillment: "pickup" | "shipping"; quote_reference: string;
    created_at: string; revision: number; paid: boolean; review_reasons: string[] };
  attempt: Attempt; stockState: CheckoutOrderBinding["stockState"];
};
export type CheckoutResult = { orderId: string; state: "open"; url: string } | { orderId: string; state: "reconciled" };
export interface CheckoutRepository {
  prepare(orderId: string, buyerId: string, token: string): Promise<CheckoutPreparation>;
  recovery(orderId: string, token: string): Promise<CheckoutPreparation>;
  bind(orderId: string, token: string, fence: number, session: string, created: number): Promise<void>;
  reconcile(orderId: string): Promise<unknown>;
}
export function createCheckoutRepository(admin: SupabaseClient, stripe: Stripe, config: SellerStripeConfig): CheckoutRepository {
  async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
    const { data, error } = await admin.rpc(name, params);
    if (error) throw new VendorOrderError(/^order_[a-z_]+$/.test(error.message ?? "") ? error.message : "order_storage_unavailable");
    return data as T;
  }
  return {
    prepare: (id, buyer, token) => rpc("vendor_order_checkout_prepare_v1", { p_order_id: id, p_buyer_id: buyer, p_token: token }),
    recovery: (id, token) => rpc("vendor_order_checkout_recovery_v1", { p_order_id: id, p_token: token }),
    bind: (id, token, fence, session, created) => rpc("vendor_order_bind_v1", { p_order_id: id, p_token: token,
      p_fence: fence, p_session: session, p_created: new Date(created * 1000).toISOString() }),
    reconcile: id => reconcileVendorOrder(admin, stripe, config, id),
  };
}
function requireValue(ok: unknown): asserts ok { if (!ok) throw new VendorOrderError("order_checkout_invalid"); }
const seconds = (s: string | null) => s === null ? NaN : Math.floor(Date.parse(s) / 1000);
function projection(p: CheckoutPreparation, config: SellerStripeConfig, id: string, now: number): CheckoutOrderBinding {
  const o = p?.order, a = p?.attempt;
  requireValue(o && a && o.id === id && a.order_id === id && o.owner_id === o.seller?.ownerId && uuid.test(o.quote_reference));
  requireValue(a.stripe_account_id === config.scope.accountId && a.connected_account_id === o.seller.connectedAccountId &&
    a.livemode === config.scope.livemode && typeof o.paid === "boolean" && Array.isArray(o.review_reasons));
  requireValue(Object.keys(o.seller.controller).length === 4 && Object.entries(SELLER_CONTROLLER)
    .every(([k, v]) => o.seller.controller[k as keyof typeof SELLER_CONTROLLER] === v));
  const b: CheckoutOrderBinding = { orderId: o.id, reservationId: o.reservation_id, attemptId: a.id, buyerId: o.buyer_id,
    seller: o.seller, revision: o.revision, createdAt: seconds(o.created_at), creationStartedAt: seconds(a.creation_started_at),
    sessionId: a.session_id ?? `cs_${config.scope.livemode ? "live" : "test"}_validation`,
    sessionCreatedAt: a.session_id ? seconds(a.session_created_at) : seconds(a.creation_started_at), paymentIntentId: a.payment_intent_id,
    currency: o.currency, unitAmountMinor: o.unit_amount_minor, quantity: o.quantity,
    shippingAmountMinor: o.shipping_amount_minor, taxAmountMinor: o.tax_amount_minor, stockState: p.stockState };
  assertCheckoutOrderBinding(b, config.scope, now); return b;
}
function lease(p: CheckoutPreparation, token: string, now: number) {
  requireValue(p.attempt.lease_token === token && Number.isSafeInteger(p.attempt.lease_fence) && p.attempt.lease_fence > 0 &&
    seconds(p.attempt.lease_expires_at) > now);
}
function payable(p: CheckoutPreparation, b: CheckoutOrderBinding, buyer: string) {
  requireValue(b.buyerId === buyer && !p.order.paid && p.order.review_reasons.length === 0 && b.stockState === "payment_pending");
  // No production tax policy has been selected. Only a pre-existing immutable
  // zero-tax pickup quote is supported; shipping/tax are never silently dropped.
  if (p.order.fulfillment !== "pickup" || b.shippingAmountMinor !== 0 || b.taxAmountMinor !== 0)
    throw new VendorOrderError("order_quote_policy_unavailable");
}
function metadata(b: CheckoutOrderBinding) {
  return { grookai_order_id: b.orderId, grookai_attempt_id: b.attemptId, grookai_reservation_id: b.reservationId };
}
function parameters(b: CheckoutOrderBinding): Stripe.Checkout.SessionCreateParams {
  return { mode: "payment", ui_mode: "hosted_page", payment_method_types: ["card"],
    client_reference_id: b.orderId, metadata: metadata(b),
    line_items: [{ quantity: b.quantity, price_data: { currency: "usd", unit_amount: b.unitAmountMinor,
      product_data: { name: "Grookai Vault order" } } }],
    payment_intent_data: { capture_method: "automatic", metadata: metadata(b) },
    success_url: `${origin(b.seller.livemode)}/account/orders/${b.orderId}?checkout=returned`,
    cancel_url: `${origin(b.seller.livemode)}/account/orders/${b.orderId}?checkout=returned`,
    automatic_tax: { enabled: false }, adaptive_pricing: { enabled: false }, allow_promotion_codes: false,
    invoice_creation: { enabled: false }, customer_creation: "if_required", after_expiration: { recovery: { enabled: false } },
  };
}
function sameRequest(before: CheckoutPreparation, after: CheckoutPreparation) {
  // Metadata/quote/identity are immutable. Lease and terminal projection may move.
  requireValue(JSON.stringify(before.order) === JSON.stringify(after.order) && before.stockState === after.stockState);
  const keys = ["id", "order_id", "stripe_account_id", "connected_account_id", "livemode", "creation_started_at"] as const;
  requireValue(keys.every(k => before.attempt[k] === after.attempt[k]));
}
async function provider<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch { throw new VendorOrderError("order_checkout_provider_unavailable"); }
}
function sessionIdentity(s: Stripe.Checkout.Session, b: CheckoutOrderBinding, now: number): CheckoutOrderBinding {
  requireValue(s.object === "checkout.session" && s.livemode === b.seller.livemode && s.mode === "payment" && s.client_reference_id === b.orderId &&
    Object.entries(metadata(b)).every(([k, v]) => s.metadata?.[k] === v));
  const bound = { ...b, sessionId: s.id, sessionCreatedAt: s.created };
  assertCheckoutOrderBinding(bound, { accountId: b.seller.platformAccountId, livemode: b.seller.livemode }, now);
  return bound;
}
function link(s: Stripe.Checkout.Session, b: CheckoutOrderBinding, now: number): string | null {
  if (s.status !== "open" || s.payment_status !== "unpaid") return null;
  requireValue(s.ui_mode === "hosted_page" && s.expires_at > now && typeof s.url === "string" && s.url.length <= 4096);
  const expected = parameters(b), url = new URL(s.url);
  requireValue(s.success_url === expected.success_url && s.cancel_url === expected.cancel_url && s.automatic_tax?.enabled === false &&
    s.adaptive_pricing?.enabled === false && s.allow_promotion_codes === false && s.invoice_creation?.enabled === false &&
    s.customer === null && s.customer_creation === "if_required" && s.shipping_address_collection === null && s.shipping_options.length === 0);
  requireValue(url.origin === "https://checkout.stripe.com" && !url.username && !url.password && !url.search &&
    url.pathname === `/c/pay/${b.sessionId}`);
  return s.url;
}

// The factory is private and defaults disabled. No HTTP module instantiates it.
// An authenticated buyer ID must be supplied by a future server handler.
export function createVendorCheckoutService(input: { repo: CheckoutRepository; stripe: Stripe; config: SellerStripeConfig;
  enabled?: boolean; now?: () => number; token?: () => string }) {
  const { repo, stripe, config } = input, now = input.now ?? (() => Math.floor(Date.now() / 1000)), token = input.token ?? randomUUID;
  async function verified(b: CheckoutOrderBinding) {
    const e = await readVerifiedCheckoutEvidence(stripe, config, b, now); requireVerifiedCheckoutEvidence(e, b, config.scope, now());
  }
  async function recoverPrepared(orderId: string, p: CheckoutPreparation, t: string, candidateSessionId: string,
    clock: () => number = now): Promise<{ orderId: string; state: "reconciled" }> {
    const b = projection(p, config, orderId, clock());
    requireValue(new RegExp(`^cs_${config.scope.livemode ? "live" : "test"}_[A-Za-z0-9]+$`).test(candidateSessionId) && candidateSessionId.length <= 255);
    requireValue(p.attempt.session_id === null || p.attempt.session_id === candidateSessionId);
    if (!p.attempt.session_id) lease(p, t, clock());
    const s = await provider(() => stripe.checkout.sessions.retrieve(candidateSessionId, {}, { stripeAccount: b.seller.connectedAccountId }));
    const bound = sessionIdentity(s, b, clock()); requireValue(bound.sessionId === candidateSessionId);
    const evidence = await readVerifiedCheckoutEvidence(stripe, config, bound, clock);
    requireVerifiedCheckoutEvidence(evidence, bound, config.scope, clock());
    if (!p.attempt.session_id) await repo.bind(orderId, t, p.attempt.lease_fence, bound.sessionId, bound.sessionCreatedAt);
    clock(); await repo.reconcile(orderId); return { orderId, state: "reconciled" };
  }
  return {
    async checkout(orderId: string, buyerId: string): Promise<CheckoutResult> {
      if (input.enabled !== true) throw new VendorOrderError("order_checkout_disabled");
      requireValue(uuid.test(orderId) && uuid.test(buyerId));
      const t = token(); requireValue(uuid.test(t));
      const first = await repo.prepare(orderId, buyerId, t), b = projection(first, config, orderId, now()); payable(first, b, buyerId);
      const started = now();
      const readiness = await readVerifiedSellerReadiness(stripe, config, b.seller, b.seller.ownerId, now);
      if (!readiness.capabilitiesReady) throw new VendorOrderError("order_seller_not_ready");
      const platformBalance = await provider(() => stripe.balance.retrieve());
      requireValue(platformBalance.object === "balance" && platformBalance.livemode === config.scope.livemode);
      const current = await repo.prepare(orderId, buyerId, t); sameRequest(first, current);
      const currentBinding = projection(current, config, orderId, now()); payable(current, currentBinding, buyerId);
      requireValue(now() >= started && now() - started < 60);
      let session: Stripe.Checkout.Session;
      if (current.attempt.session_id) {
        session = await provider(() => stripe.checkout.sessions.retrieve(current.attempt.session_id!, {}, { stripeAccount: b.seller.connectedAccountId }));
      } else {
        lease(current, t, now());
        requireValue(current.attempt.lease_fence === first.attempt.lease_fence && seconds(current.attempt.lease_expires_at) - now() >= 60);
        if (now() - b.creationStartedAt >= 23 * 3600) throw new VendorOrderError("order_creation_recovery_required");
        session = await provider(() => stripe.checkout.sessions.create(parameters(b), { stripeAccount: b.seller.connectedAccountId,
          idempotencyKey: `grookai-order-v1:${b.attemptId}` }));
      }
      const bound = sessionIdentity(session, currentBinding, now());
      requireValue(current.attempt.session_id === null || current.attempt.session_id === bound.sessionId);
      await verified(bound); // Current GET chain, never the create response's payment flag.
      if (!current.attempt.session_id) await repo.bind(orderId, t, current.attempt.lease_fence, bound.sessionId, bound.sessionCreatedAt);
      // Persisting the binding before reconciliation/redirect makes a lost
      // response recoverable. Never erase the attempt or release stock on error.
      await repo.reconcile(orderId);
      if (session.status !== "open" || session.payment_status !== "unpaid") return { orderId, state: "reconciled" };
      const latest = await repo.prepare(orderId, buyerId, t);
      projection(latest, config, orderId, now()); payable(latest, bound, buyerId);
      requireValue(latest.attempt.session_id === bound.sessionId);
      const refreshed = await provider(() => stripe.checkout.sessions.retrieve(bound.sessionId, {}, { stripeAccount: b.seller.connectedAccountId }));
      const finalBinding = sessionIdentity(refreshed, bound, now()); requireValue(finalBinding.sessionId === bound.sessionId);
      await verified(finalBinding);
      const url = link(refreshed, bound, now());
      if (url) {
        const latestReadiness = await readVerifiedSellerReadiness(stripe, config, b.seller, b.seller.ownerId, now);
        if (!latestReadiness.capabilitiesReady) throw new VendorOrderError("order_seller_not_ready");
      } else await repo.reconcile(orderId);
      // Final DB authorization after provider IO catches downgrade/freeze/paid races.
      if (url) await repo.prepare(orderId, buyerId, t);
      return url ? { orderId, state: "open", url } : { orderId, state: "reconciled" };
    },
    // Reviewed server-only candidate ID. Works after downgrade/freeze/23h using
    // GET evidence; never starts a new session, returns a link or clears a hold.
    async recover(orderId: string, candidateSessionId: string): Promise<{ orderId: string; state: "reconciled" }> {
      requireValue(uuid.test(orderId));
      const t = token(); requireValue(uuid.test(t));
      return recoverPrepared(orderId, await repo.recovery(orderId, t), t, candidateSessionId);
    },
    // Operator-only order ID, never a browser-provided session/account/cursor.
    // No candidate or an incomplete scan leaves the existing hold untouched.
    async discover(orderId: string) {
      requireValue(uuid.test(orderId));
      const t = token(); requireValue(uuid.test(t));
      const started = now();
      const clock = () => {
        const value = now();
        if (!Number.isSafeInteger(value) || value < started || value - started >= 60)
          throw new VendorOrderError("order_discovery_budget_exhausted");
        return value;
      };
      const p = await repo.recovery(orderId, t), b = projection(p, config, orderId, clock());
      if (p.attempt.session_id) return recoverPrepared(orderId, p, t, p.attempt.session_id, clock);
      lease(p, t, clock());
      const found = await discoverCheckoutSession(stripe, config, b, clock);
      if (found.state === "unresolved") return { orderId, ...found };
      return recoverPrepared(orderId, p, t, found.sessionId, clock);
    },
  };
}
