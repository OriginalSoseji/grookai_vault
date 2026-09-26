import Stripe from "stripe";
import { billingEventTarget, projectVendorSubscription, referenceId, validateCatalog } from "./vendorSubscriptionPolicy.ts";
import type { BillingScope, InvoiceSnapshot, PriceCatalog, SubscriptionSnapshot, VendorPlan } from "./vendorSubscriptionPolicy.ts";

// Pin both the SDK and webhook destination to this version. No SDK auto-upgrades.
export const STRIPE_BILLING_API_VERSION = "2026-08-26.dahlia" as const;
export type VendorBillingConfig = {
  secretKey: string; webhookSecret: string; scope: BillingScope;
  catalog: PriceCatalog; siteOrigin: string;
};

export function readVendorBillingConfig(env: NodeJS.ProcessEnv): VendorBillingConfig | null {
  if (env.GROOKAI_VENDOR_BILLING_ENABLED !== "true") return null;
  const mode = env.STRIPE_BILLING_MODE;
  if (mode !== "test" && mode !== "live") throw new Error("Invalid Stripe billing mode");
  const secretKey = env.STRIPE_SECRET_KEY ?? "";
  if (!(mode === "live" ? /^(sk|rk)_live_[A-Za-z0-9]+$/ : /^(sk|rk)_test_[A-Za-z0-9]+$/).test(secretKey))
    throw new Error("Stripe credential mode mismatch");
  const webhookSecret = env.STRIPE_BILLING_WEBHOOK_SECRET ?? "";
  if (!/^whsec_[A-Za-z0-9]{16,}$/.test(webhookSecret)) throw new Error("Stripe webhook secret required");
  const accountId = env.STRIPE_ACCOUNT_ID ?? "";
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) throw new Error("Stripe account binding required");
  const catalog = { store_app: env.STRIPE_STORE_APP_PRICE_ID ?? "", store_web: env.STRIPE_STORE_WEB_PRICE_ID ?? "" };
  validateCatalog(catalog);
  const siteOrigin = env.SITE_URL ?? "";
  const parsed = new URL(siteOrigin);
  if (parsed.origin !== siteOrigin || (mode === "live" && siteOrigin !== "https://grookaivault.com") ||
      (mode === "test" && !(parsed.protocol === "https:" || (parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname)))))
    throw new Error("Invalid billing return origin");
  return { secretKey, webhookSecret, scope: { accountId, livemode: mode === "live" }, catalog, siteOrigin };
}

export function createVendorStripeClient(config: VendorBillingConfig): Stripe {
  return new Stripe(config.secretKey, {
    apiVersion: STRIPE_BILLING_API_VERSION, maxNetworkRetries: 2, timeout: 10_000,
    telemetry: false, appInfo: { name: "Grookai Vault vendor billing", version: "1" },
  });
}

export function verifyVendorBillingEvent(stripe: Stripe, config: VendorBillingConfig,
  payload: string, signature: string, receivedAt = Date.now()): Stripe.Event {
  if (Buffer.byteLength(payload, "utf8") > 256 * 1024 || !signature || signature.length > 2048)
    throw new Error("Invalid Stripe webhook envelope");
  const event = stripe.webhooks.constructEvent(payload, signature, config.webhookSecret, 300, undefined, receivedAt);
  if (event.api_version !== STRIPE_BILLING_API_VERSION || event.object !== "event" ||
      !/^evt_[A-Za-z0-9]+$/.test(event.id)) throw new Error("Unsupported Stripe event version");
  // Validate account/mode even for ignored events. Connect checkout is a separate
  // payment authority and must never flow into vendor subscription grants.
  billingEventTarget(event, config.scope);
  return event;
}

export async function assertVendorStripeAccount(stripe: Stripe, config: VendorBillingConfig): Promise<void> {
  const account = await stripe.accounts.retrieve(null);
  if (account.id !== config.scope.accountId) throw new Error("Stripe account mismatch");
}

export async function readVerifiedVendorSubscription(stripe: Stripe, config: VendorBillingConfig,
  customerId: string, subscriptionId: string, now: number) {
  // Caller MUST acquire a fenced customer lease before fetching. Event timestamps
  // alone cannot serialize concurrent callbacks or a reconciliation worker.
  await assertVendorStripeAccount(stripe, config);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const invoiceId = referenceId(subscription.latest_invoice);
  let invoice: Stripe.Invoice | null = null;
  if (subscription.status === "active" && invoiceId) {
    invoice = await stripe.invoices.retrieve(invoiceId);
    // More than one page cannot silently hide an invoice line. Bound the scan.
    if (invoice.lines.has_more) {
      const lines = await stripe.invoices.listLineItems(invoiceId, { limit: 100 });
      invoice = { ...invoice, lines };
    }
  }
  return projectVendorSubscription({
    subscription: subscription as SubscriptionSnapshot, invoice: invoice as InvoiceSnapshot | null,
    customerId, now, catalog: config.catalog, scope: config.scope,
  });
}

// Input comes from authenticated account + durable checkout attempt, never a
// caller-supplied customer, price, entitlement, arbitrary redirect or amount.
export async function createVendorSubscriptionCheckout(stripe: Stripe, config: VendorBillingConfig,
  input: { customerId: string; plan: VendorPlan; attemptId: string; createdAt: number }, now: number) {
  validateCatalog(config.catalog);
  if (!["store_app", "store_web"].includes(input.plan) || !/^cus_[A-Za-z0-9]+$/.test(input.customerId) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.attemptId))
    throw new Error("Invalid vendor checkout identity");
  // Never replay an ambiguous creation after the provider may have pruned the
  // idempotency key. Recover its known session or inspect the durable attempt.
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(input.createdAt) || input.createdAt < 0 ||
      now < input.createdAt || now - input.createdAt >= 23 * 60 * 60)
    throw new Error("Checkout attempt needs recovery");
  await assertVendorStripeAccount(stripe, config);
  const price = await stripe.prices.retrieve(config.catalog[input.plan]);
  if (!price.active || price.livemode !== config.scope.livemode || price.currency !== "usd" ||
      price.unit_amount !== (input.plan === "store_app" ? 3000 : 5000) || price.type !== "recurring" ||
      price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 || price.recurring.usage_type !== "licensed")
    throw new Error("Configured vendor price does not match package");
  return stripe.checkout.sessions.create({
    mode: "subscription", customer: input.customerId,
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: input.attemptId,
    success_url: `${config.siteOrigin}/account/store/billing?checkout=returned`,
    cancel_url: `${config.siteOrigin}/account/store/billing`,
    subscription_data: { metadata: { grookai_billing_version: "vendor-billing-v1" } },
    metadata: { grookai_billing_attempt: input.attemptId },
  }, { idempotencyKey: `grookai-vendor-subscription:${input.attemptId}` });
}
