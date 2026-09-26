import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { assertSellerBinding } from "./vendorSellerPolicy.ts";
import type { SellerBinding, SellerScope } from "./vendorSellerPolicy.ts";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import { readOrderRefundInventory } from "./vendorOrderRefundEvidence.ts";
import type { OrderRefundInventory } from "./vendorOrderRefundEvidence.ts";
import { readOrderDisputeInventory, type OrderDisputeInventory } from "./vendorOrderDisputeEvidence.ts";

// The private order repository loads this immutable projection from storage.
// It is never an HTTP request DTO or a source of authorization by itself.
export type CheckoutOrderBinding = {
  orderId: string; reservationId: string; attemptId: string; buyerId: string;
  seller: SellerBinding; revision: number; createdAt: number; creationStartedAt: number;
  sessionId: string; sessionCreatedAt: number; paymentIntentId: string | null;
  currency: "usd"; unitAmountMinor: number; quantity: number;
  shippingAmountMinor: number; taxAmountMinor: number;
  stockState: "payment_pending" | "consumed" | "released";
};
export type CheckoutEvidence = {
  version: "vendor-checkout-evidence-v1"; orderId: string; attemptId: string;
  checkedAt: number; orderHash: string; evidenceHash: string;
  sessionId: string; paymentIntentId: string | null; chargeId: string | null;
  amountMinor: number; currency: "usd"; payment: "paid" | "unpaid" | "pending";
  stockAction: "consume" | "release" | "retain" | "none"; reviewReasons: string[];
};
export class CheckoutEvidenceError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.name = "CheckoutEvidenceError"; this.code = code; }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const issued = new WeakMap<CheckoutEvidence, string>();
const disputeInventories = new WeakMap<CheckoutEvidence, OrderDisputeInventory>();
const refundInventories = new WeakMap<CheckoutEvidence, OrderRefundInventory>();
function requireValue(value: unknown): asserts value {
  if (!value) throw new CheckoutEvidenceError("checkout_evidence_invalid");
}
function record(value: unknown): Record<string, unknown> {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function integer(value: unknown, minimum = 0): number {
  requireValue(Number.isSafeInteger(value) && (value as number) >= minimum); return value as number;
}
function reference(value: unknown, prefix: string): string {
  requireValue(typeof value === "string" && value.length <= 255 && new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(value)); return value;
}
function nullableReference(value: unknown, prefix: string): string | null { return value === null ? null : reference(value, prefix); }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  requireValue(value !== undefined && (typeof value !== "number" || Number.isFinite(value)));
  return JSON.stringify(value);
}
function hash(value: unknown): string { return createHash("sha256").update(canonical(value)).digest("hex"); }
function total(order: CheckoutOrderBinding): number {
  return order.unitAmountMinor * order.quantity + order.shippingAmountMinor + order.taxAmountMinor;
}
export function assertCheckoutOrderBinding(order: CheckoutOrderBinding, scope: SellerScope, now: number): void {
  requireValue(order && Number.isSafeInteger(now) && now >= 0);
  assertSellerBinding(order.seller, scope, order.seller?.ownerId);
  requireValue(scope.accountId.length <= 255 && order.seller.connectedAccountId.length <= 255);
  for (const id of [order.orderId, order.reservationId, order.attemptId, order.buyerId]) requireValue(typeof id === "string" && uuid.test(id));
  requireValue(order.buyerId !== order.seller.ownerId && order.currency === "usd");
  integer(order.revision); integer(order.createdAt); integer(order.creationStartedAt); integer(order.sessionCreatedAt);
  requireValue(order.createdAt <= order.creationStartedAt && order.creationStartedAt <= now &&
    order.sessionCreatedAt >= order.creationStartedAt - 5 && order.sessionCreatedAt <= now &&
    order.sessionCreatedAt < order.creationStartedAt + 23 * 3600);
  requireValue(typeof order.sessionId === "string" && order.sessionId.length <= 255 &&
    new RegExp(`^cs_${scope.livemode ? "live" : "test"}_[A-Za-z0-9]+$`).test(order.sessionId));
  nullableReference(order.paymentIntentId, "pi");
  integer(order.unitAmountMinor, 1); integer(order.quantity, 1); integer(order.shippingAmountMinor); integer(order.taxAmountMinor);
  requireValue(order.quantity <= 100 && Number.isSafeInteger(total(order)) && total(order) <= 99_999_999);
  requireValue(["payment_pending", "consumed", "released"].includes(order.stockState));
}
function metadata(value: unknown, order: CheckoutOrderBinding) {
  const m = record(value);
  requireValue(m.grookai_order_id === order.orderId && m.grookai_attempt_id === order.attemptId && m.grookai_reservation_id === order.reservationId);
  return { orderId: m.grookai_order_id, attemptId: m.grookai_attempt_id, reservationId: m.grookai_reservation_id };
}
function timestamp(value: unknown, minimum: number, now: number): number {
  const t = integer(value); requireValue(t >= minimum && t <= now); return t;
}
function cardsOnly(value: unknown): void { requireValue(Array.isArray(value) && value.length === 1 && value[0] === "card"); }
function sessionEvidence(raw: unknown, order: CheckoutOrderBinding, now: number) {
  const s = record(raw), details = record(s.total_details);
  requireValue(s.object === "checkout.session" && s.id === order.sessionId && s.livemode === order.seller.livemode &&
    s.created === order.sessionCreatedAt && s.mode === "payment" && s.currency === order.currency &&
    s.client_reference_id === order.orderId && s.subscription === null && s.setup_intent === null &&
    s.payment_link === null && s.recovered_from === null);
  cardsOnly(s.payment_method_types);
  requireValue(["open", "complete", "expired"].includes(s.status as string) && ["paid", "unpaid", "no_payment_required"].includes(s.payment_status as string));
  requireValue(s.amount_subtotal === order.unitAmountMinor * order.quantity && s.amount_total === total(order) &&
    details.amount_discount === 0 && details.amount_shipping === order.shippingAmountMinor && details.amount_tax === order.taxAmountMinor);
  const after = s.after_expiration === null ? null : record(s.after_expiration);
  // Recovered sessions require a new governed reservation and attempt; they may
  // not silently revive a released reservation through Stripe's recovery link.
  if (after) requireValue(after.recovery === null || record(after.recovery).enabled === false);
  const intent = nullableReference(s.payment_intent, "pi");
  requireValue(order.paymentIntentId === null || intent === order.paymentIntentId);
  const expiresAt = integer(s.expires_at); requireValue(expiresAt > order.sessionCreatedAt);
  // Manual expiration can precede the original deadline. Terminal provider
  // status, never our clock or expires_at alone, is the release evidence.
  requireValue(now >= order.sessionCreatedAt);
  return { id: s.id, created: s.created, metadata: metadata(s.metadata, order), status: s.status as string,
    paymentStatus: s.payment_status as string, paymentIntentId: intent, expiresAt,
    subtotal: s.amount_subtotal, total: s.amount_total, shipping: details.amount_shipping, tax: details.amount_tax };
}
function lineEvidence(raw: unknown, order: CheckoutOrderBinding) {
  const list = record(raw); requireValue(list.object === "list" && list.has_more === false && Array.isArray(list.data) && list.data.length === 1);
  const item = record(list.data[0]), price = record(item.price);
  requireValue(item.object === "item" && item.quantity === order.quantity && item.currency === order.currency &&
    item.amount_subtotal === order.unitAmountMinor * order.quantity && item.amount_discount === 0 &&
    price.object === "price" && price.currency === order.currency && price.unit_amount === order.unitAmountMinor &&
    price.type === "one_time" && price.recurring === null && price.billing_scheme === "per_unit");
  const tax = integer(item.amount_tax); requireValue(tax <= order.taxAmountMinor && item.amount_total === (item.amount_subtotal as number) + tax);
  return { id: reference(item.id, "li"), priceId: reference(price.id, "price"), productId: reference(price.product, "prod"),
    quantity: item.quantity, subtotal: item.amount_subtotal, tax, total: item.amount_total };
}
function intentEvidence(raw: unknown, id: string, order: CheckoutOrderBinding, now: number) {
  const p = record(raw);
  requireValue(p.object === "payment_intent" && p.id === id && p.livemode === order.seller.livemode && p.currency === order.currency &&
    p.amount === total(order) && p.capture_method === "automatic" && p.transfer_data === null && p.on_behalf_of === null &&
    (p.application_fee_amount === null || p.application_fee_amount === 0));
  cardsOnly(p.payment_method_types);
  requireValue(["requires_payment_method", "requires_confirmation", "requires_action", "processing", "requires_capture", "canceled", "succeeded"].includes(p.status as string));
  const created = timestamp(p.created, order.sessionCreatedAt - 5, now);
  const received = integer(p.amount_received), capturable = integer(p.amount_capturable);
  requireValue(received <= total(order) && capturable <= total(order));
  const canceledAt = p.canceled_at === null ? null : timestamp(p.canceled_at, created, now);
  requireValue((p.status === "canceled") === (canceledAt !== null));
  return { id, created, metadata: metadata(p.metadata, order), status: p.status as string,
    received, capturable, canceledAt, chargeId: nullableReference(p.latest_charge, "ch") };
}
function chargeEvidence(raw: unknown, id: string, intentId: string, createdAfter: number, order: CheckoutOrderBinding, now: number) {
  const c = record(raw);
  requireValue(c.object === "charge" && c.id === id && c.payment_intent === intentId && c.livemode === order.seller.livemode &&
    c.currency === order.currency && c.amount === total(order) && c.on_behalf_of === null && c.transfer_data === null &&
    (c.application_fee_amount === null || c.application_fee_amount === 0));
  requireValue(["succeeded", "pending", "failed"].includes(c.status as string) &&
    typeof c.paid === "boolean" && typeof c.captured === "boolean" && typeof c.refunded === "boolean" && typeof c.disputed === "boolean");
  const captured = integer(c.amount_captured), refunded = integer(c.amount_refunded);
  requireValue(captured <= total(order) && refunded <= captured && c.refunded === (refunded === total(order)));
  return { id, created: timestamp(c.created, createdAfter - 5, now), status: c.status as string,
    paid: c.paid, captured: c.captured, capturedAmount: captured, refundedAmount: refunded, disputed: c.disputed };
}

// GET-only and bounded. Webhook events are merely wake-up signals; this always
// retrieves current resources under the immutable server-loaded seller scope.
// No provider readiness/subscription requirement gates reconciliation of an
// existing obligation. Disabled payouts or a package downgrade cannot erase it.
export async function readVerifiedCheckoutEvidence(stripe: Stripe, config: SellerStripeConfig, order: CheckoutOrderBinding,
  clock: () => number = () => Math.floor(Date.now() / 1000)): Promise<CheckoutEvidence> {
  const start = clock(); assertCheckoutOrderBinding(order, config.scope, start);
  const orderHash = hash(order), scopeHash = hash(config.scope);
  function time() { const now = clock(); if (!Number.isSafeInteger(now) || now < start || now - start >= 60)
    throw new CheckoutEvidenceError("checkout_observation_expired"); return now; }
  async function read<T>(fn: () => Promise<T>): Promise<T> {
    time(); let result: T; try { result = await fn(); } catch { throw new CheckoutEvidenceError("checkout_provider_unavailable"); }
    time(); requireValue(hash(order) === orderHash && hash(config.scope) === scopeHash); return result;
  }
  const platform = await read(() => stripe.accounts.retrieve(null));
  requireValue(platform.object === "account" && platform.id === config.scope.accountId);
  const balance = await read(() => stripe.balance.retrieve()); requireValue(balance.object === "balance" && balance.livemode === config.scope.livemode);
  const account = await read(() => stripe.accounts.retrieve(order.seller.connectedAccountId));
  requireValue(account.object === "account" && account.id === order.seller.connectedAccountId);
  const options = { stripeAccount: order.seller.connectedAccountId };
  const connectedBalance = await read(() => stripe.balance.retrieve({}, options));
  requireValue(connectedBalance.object === "balance" && connectedBalance.livemode === config.scope.livemode);
  async function observation() {
    const session = sessionEvidence(await read(() => stripe.checkout.sessions.retrieve(order.sessionId, {}, options)), order, time());
    const line = lineEvidence(await read(() => stripe.checkout.sessions.listLineItems(order.sessionId, { limit: 2 }, options)), order);
    const intent = session.paymentIntentId === null ? null : intentEvidence(
      await read(() => stripe.paymentIntents.retrieve(session.paymentIntentId!, {}, options)), session.paymentIntentId, order, time());
    const charge = intent?.chargeId ? chargeEvidence(await read(() => stripe.charges.retrieve(intent.chargeId!, {}, options)),
      intent.chargeId, intent.id, intent.created, order, time()) : null;
    const refunds = charge && intent ? await readOrderRefundInventory(stripe, {
      connectedAccountId: order.seller.connectedAccountId, chargeId: charge.id, paymentIntentId: intent.id,
      currency: order.currency, capturedMinor: charge.capturedAmount, chargeRefundedMinor: charge.refundedAmount,
      chargeCreatedAt: charge.created,
    }, read, time) : null;
    const disputes = charge && intent ? await readOrderDisputeInventory(stripe, {
      connectedAccountId: order.seller.connectedAccountId, chargeId: charge.id, paymentIntentId: intent.id,
      livemode: order.seller.livemode, chargeCreatedAt: charge.created, chargeDisputed: charge.disputed,
    }, read, time) : null;
    return { session, line, intent, charge, refunds, disputes };
  }
  const first = await observation(), second = await observation();
  if (hash(first) !== hash(second)) throw new CheckoutEvidenceError("checkout_evidence_changed");
  const { session, intent, charge, refunds, disputes } = second;
  let payment: CheckoutEvidence["payment"] = "pending", stockAction: CheckoutEvidence["stockAction"] = "retain";
  const reviewReasons: string[] = [...(disputes?.reviewReasons ?? [])];
  const paid = intent?.status === "succeeded" && intent.received === total(order) && intent.capturable === 0 &&
    charge?.status === "succeeded" && charge.paid && charge.captured && charge.capturedAmount === total(order);
  const unpaid = session.status === "expired" && session.paymentStatus === "unpaid" &&
    (intent === null || (intent.status === "canceled" && intent.received === 0 && intent.capturable === 0 &&
      (charge === null || (charge.status === "failed" && !charge.paid && !charge.captured && charge.capturedAmount === 0 &&
        charge.refundedAmount === 0 && !charge.disputed && disputes?.complete === true && disputes.rows.length === 0))));
  if (paid) {
    payment = "paid";
    if (session.status !== "complete" || session.paymentStatus !== "paid") reviewReasons.push("checkout_payment_conflict");
    reviewReasons.push(...(refunds?.reviewReasons ?? []));
    if (order.stockState === "released") reviewReasons.push("paid_after_stock_release");
    stockAction = order.stockState === "consumed" ? "none" : reviewReasons.length ? "retain" : "consume";
  } else if (unpaid) {
    payment = "unpaid";
    if (order.stockState === "consumed") reviewReasons.push("unpaid_after_stock_consumption");
    stockAction = order.stockState === "payment_pending" ? "release" : "none";
  } else {
    if (session.paymentStatus !== "unpaid" || intent?.status === "succeeded" || (intent?.received ?? 0) > 0 || charge?.paid || charge?.captured)
      reviewReasons.push("inconsistent_payment_evidence");
    if (order.stockState !== "payment_pending") reviewReasons.push("nonterminal_after_stock_resolution");
  }
  const result: CheckoutEvidence = { version: "vendor-checkout-evidence-v1", orderId: order.orderId, attemptId: order.attemptId,
    checkedAt: start, orderHash, evidenceHash: hash(second), sessionId: order.sessionId, paymentIntentId: intent?.id ?? null,
    chargeId: charge?.id ?? null, amountMinor: total(order), currency: "usd", payment, stockAction, reviewReasons };
  issued.set(result, hash(result));
  if (refunds) refundInventories.set(result, structuredClone(refunds));
  if (disputes) disputeInventories.set(result, structuredClone(disputes));
  return result;
}

// Ledger callers must accept only the original in-process result, then
// recheck the persisted order revision/stock under a transaction lock. A JSON
// response, evidence hash or copied object cannot be supplied as payment proof.
export function requireVerifiedCheckoutEvidence(result: CheckoutEvidence, order: CheckoutOrderBinding, scope: SellerScope, now: number): void {
  assertCheckoutOrderBinding(order, scope, now);
  if (!result || issued.get(result) !== hash(result) || result.orderHash !== hash(order) ||
    now < result.checkedAt || now - result.checkedAt >= 60) throw new CheckoutEvidenceError("checkout_proof_invalid_or_stale");
}

// Private financial consumers retrieve the exact inventory that contributed to
// this original proof. Serialized or caller-supplied refund lists are not proof.
export function requireVerifiedCheckoutRefundInventory(result: CheckoutEvidence, order: CheckoutOrderBinding,
  scope: SellerScope, now: number): OrderRefundInventory {
  requireVerifiedCheckoutEvidence(result, order, scope, now);
  const inventory = refundInventories.get(result);
  if (result.payment !== "paid" || !result.paymentIntentId || !result.chargeId || !inventory)
    throw new CheckoutEvidenceError("checkout_refund_proof_unavailable");
  return structuredClone(inventory);
}

export function requireVerifiedCheckoutDisputeInventory(result: CheckoutEvidence, order: CheckoutOrderBinding,
  scope: SellerScope, now: number): OrderDisputeInventory {
  requireVerifiedCheckoutEvidence(result, order, scope, now);
  const inventory = disputeInventories.get(result);
  if (result.payment !== "paid" || !inventory) throw new CheckoutEvidenceError("checkout_dispute_proof_unavailable");
  return structuredClone(inventory);
}
