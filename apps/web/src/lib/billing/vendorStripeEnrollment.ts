import type Stripe from "stripe";
import { assertVendorStripeAccount } from "./vendorStripeGateway.ts";
import type { VendorBillingConfig } from "./vendorStripeGateway.ts";
import { referenceId, validateCatalog } from "./vendorSubscriptionPolicy.ts";
import type { VendorPlan } from "./vendorSubscriptionPolicy.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// These values must come from the durable server-owned attempt, never the browser
// return URL, webhook metadata, email address, or a caller-supplied owner ID.
export type VendorCheckoutAttempt = {
  attemptId: string; customerId: string; sessionId: string; plan: VendorPlan;
};
export type VendorCheckoutEvidence = {
  attemptId: string; customerId: string; sessionId: string;
  state: "open" | "expired" | "complete"; subscriptionId: string | null;
  checkoutUrl: string | null;
};

export async function readVendorCheckoutEvidence(stripe: Stripe, config: VendorBillingConfig,
  attempt: VendorCheckoutAttempt, creationWindow?:{createdAt:number;now:number}): Promise<VendorCheckoutEvidence> {
  validateCatalog(config.catalog);
  if (!uuid.test(attempt.attemptId) || !/^cus_[A-Za-z0-9]+$/.test(attempt.customerId) ||
      !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(attempt.sessionId) ||
      !["store_app", "store_web"].includes(attempt.plan)) throw new Error("Invalid checkout attempt");
  await assertVendorStripeAccount(stripe, config);
  const session = await stripe.checkout.sessions.retrieve(attempt.sessionId);
  if(creationWindow&&(!Number.isSafeInteger(creationWindow.createdAt)||creationWindow.createdAt<0||
      !Number.isSafeInteger(creationWindow.now)||creationWindow.now<creationWindow.createdAt||
      !Number.isSafeInteger(session.created)||session.created<creationWindow.createdAt||
      session.created>=creationWindow.createdAt+86400||session.created>creationWindow.now))
    throw new Error("Checkout creation window mismatch");
  if (session.id !== attempt.sessionId || session.object !== "checkout.session" ||
      session.mode !== "subscription" || session.livemode !== config.scope.livemode ||
      referenceId(session.customer) !== attempt.customerId || session.client_reference_id !== attempt.attemptId ||
      session.recovered_from || !["open", "expired", "complete"].includes(session.status ?? ""))
    throw new Error("Checkout enrollment mismatch");
  // Metadata alone is not enrollment evidence. Check the independently retrieved
  // session's actual line items, including pages and the original package price.
  const lines = await stripe.checkout.sessions.listLineItems(attempt.sessionId, { limit: 100 });
  const item = lines.data[0];
  const price = item?.price;
  if (lines.has_more || lines.data.length !== 1 || item?.quantity !== 1 || !price ||
      price.id !== config.catalog[attempt.plan] || price.livemode !== config.scope.livemode ||
      price.currency !== "usd" || price.unit_amount !== (attempt.plan === "store_app" ? 3000 : 5000) ||
      price.type !== "recurring" || price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1 || price.recurring.usage_type !== "licensed")
    throw new Error("Checkout package mismatch");
  const subscriptionId = referenceId(session.subscription);
  if ((session.status === "complete" && (!subscriptionId || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId))) ||
      (session.status !== "complete" && subscriptionId !== null)) throw new Error("Invalid checkout subscription state");
  let checkoutUrl: string | null = null;
  if (session.status === "open") {
    if (!session.url) throw new Error("Open checkout URL missing");
    const url = new URL(session.url);
    if (url.origin !== "https://checkout.stripe.com" || url.username || url.password)
      throw new Error("Unexpected checkout URL");
    checkoutUrl = session.url;
  }
  // This establishes which subscription may be reconciled. It deliberately grants
  // no access, even if session.payment_status says paid or no_payment_required.
  return { attemptId: attempt.attemptId, customerId: attempt.customerId, sessionId: session.id,
    state: session.status as VendorCheckoutEvidence["state"], subscriptionId, checkoutUrl };
}

// Reserve an immutable customer-creation attempt in the database before calling.
// An unresolved older attempt requires recovery/operator inspection: Stripe can
// prune idempotency keys after 24h, so replaying it could create another customer.
export async function createVendorBillingCustomer(stripe: Stripe, config: VendorBillingConfig,
  attempt: { attemptId: string; createdAt: number }, now: number): Promise<string> {
  if (!uuid.test(attempt.attemptId) || !Number.isSafeInteger(now) || !Number.isSafeInteger(attempt.createdAt) ||
      attempt.createdAt < 0 || now < attempt.createdAt || now - attempt.createdAt >= 23 * 60 * 60)
    throw new Error("Customer attempt needs recovery");
  await assertVendorStripeAccount(stripe, config);
  const customer = await stripe.customers.create({ metadata: { grookai_billing_version: "vendor-billing-v1",
    grookai_billing_customer_attempt: attempt.attemptId } },
    { idempotencyKey: `grookai-vendor-customer:${attempt.attemptId}` });
  if (!/^cus_[A-Za-z0-9]+$/.test(customer.id) || customer.livemode !== config.scope.livemode)
    throw new Error("Created customer scope mismatch");
  return customer.id;
}
