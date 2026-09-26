import type Stripe from "stripe";
import { STRIPE_BILLING_API_VERSION } from "../billing/vendorStripeGateway.ts";
import { assertSellerScope } from "./vendorSellerPolicy.ts";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import { CheckoutEvidenceError } from "./vendorCheckoutEvidence.ts";

export type CheckoutSignal = {
  eventId: string; connectedAccountId: string; livemode: boolean; createdAt: number;
  kind: "checkout" | "payment_intent"; resourceId: string;
};
const sessionEvents = new Set(["checkout.session.completed", "checkout.session.expired",
  "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"]);
const intentEvents = new Set(["payment_intent.succeeded", "payment_intent.canceled",
  "payment_intent.processing", "payment_intent.payment_failed", "payment_intent.amount_capturable_updated"]);
const refundEvents = new Set(["refund.created", "refund.updated", "refund.failed"]);
const disputeEvents = new Set(["charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed",
  "charge.dispute.funds_withdrawn", "charge.dispute.funds_reinstated"]);

// A signed wake-up signal, not a payment decision. Resolve an existing durable
// session/intent binding by platform + account + mode + resource ID. Never route
// using caller/vendor/order IDs in event metadata. The order webhook retains
// this hint; only current-resource reconciliation can update payment authority.
export function verifyCheckoutSignal(stripe: Stripe, config: SellerStripeConfig,
  payload: string, signature: string, receivedAt = Date.now()): CheckoutSignal | null {
  assertSellerScope(config.scope);
  if (typeof payload !== "string" || Buffer.byteLength(payload, "utf8") > 256 * 1024 ||
    typeof signature !== "string" || !signature || signature.length > 2048 ||
    !Number.isSafeInteger(receivedAt) || receivedAt < 0)
    throw new CheckoutEvidenceError("checkout_signal_invalid");
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(payload, signature, config.webhookSecret, 300, undefined, receivedAt); }
  catch { throw new CheckoutEvidenceError("checkout_signature_invalid"); }
  if (event.object !== "event" || typeof event.id !== "string" || !/^evt_[A-Za-z0-9]+$/.test(event.id) || event.id.length > 255 ||
    event.api_version !== STRIPE_BILLING_API_VERSION || event.livemode !== config.scope.livemode ||
    typeof event.account !== "string" || !/^acct_[A-Za-z0-9]+$/.test(event.account) || event.account.length > 255 ||
    event.account === config.scope.accountId || event.context != null ||
    !Number.isSafeInteger(event.created) || event.created < 0 || event.created > Math.floor(receivedAt / 1000))
    throw new CheckoutEvidenceError("checkout_signal_scope_invalid");
  const session = sessionEvents.has(event.type), intent = intentEvents.has(event.type);
  const refund = refundEvents.has(event.type), dispute = disputeEvents.has(event.type), charge = event.type === "charge.refunded";
  if (!session && !intent && !refund && !dispute && !charge) return null;
  const object = event.data?.object as unknown as Record<string, unknown>;
  if (refund || dispute || charge) {
    // Refund/charge/dispute signals wake the ORIGINAL PaymentIntent binding.
    // Their status/amount/metadata never authorize financial or stock changes.
    // Refund V1 has no livemode; the signed Connect envelope supplies mode.
    if (!object || object.object !== (refund ? "refund" : dispute ? "dispute" : "charge") ||
      (!refund && object.livemode !== config.scope.livemode) ||
      typeof object.id !== "string" || object.id.length > 255 ||
      !(refund ? /^re_[A-Za-z0-9]+$/ : dispute ? /^du_[A-Za-z0-9]+$/ : /^ch_[A-Za-z0-9]+$/).test(object.id) ||
      ((refund || dispute) && (typeof object.charge !== "string" || object.charge.length > 255 || !/^ch_[A-Za-z0-9]+$/.test(object.charge))))
      throw new CheckoutEvidenceError("checkout_signal_resource_invalid");
    // Payments outside Grookai may use the Charges API without a PaymentIntent.
    if (object.payment_intent === null) return null;
    if (typeof object.payment_intent !== "string" || object.payment_intent.length > 255 || !/^pi_[A-Za-z0-9]+$/.test(object.payment_intent))
      throw new CheckoutEvidenceError("checkout_signal_resource_invalid");
    return { eventId: event.id, connectedAccountId: event.account, livemode: event.livemode,
      createdAt: event.created, kind: "payment_intent", resourceId: object.payment_intent };
  }
  if (!object || object.object !== (session ? "checkout.session" : "payment_intent") || object.livemode !== config.scope.livemode ||
    typeof object.id !== "string" || object.id.length > 255 ||
    !(session ? new RegExp(`^cs_${config.scope.livemode ? "live" : "test"}_[A-Za-z0-9]+$`) : /^pi_[A-Za-z0-9]+$/).test(object.id))
    throw new CheckoutEvidenceError("checkout_signal_resource_invalid");
  if (session && object.mode !== "payment") return null;
  return { eventId: event.id, connectedAccountId: event.account, livemode: event.livemode,
    createdAt: event.created, kind: session ? "checkout" : "payment_intent", resourceId: object.id };
}
