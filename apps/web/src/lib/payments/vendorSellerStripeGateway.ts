import Stripe from "stripe";
import { STRIPE_BILLING_API_VERSION } from "../billing/vendorStripeGateway.ts";
import { assertSellerBinding, assertSellerScope, projectSellerReadiness } from "./vendorSellerPolicy.ts";
import type { SellerBinding, SellerScope } from "./vendorSellerPolicy.ts";

export type SellerStripeConfig = { secretKey: string; webhookSecret: string; scope: SellerScope };

// Deliberately separate from subscriptions. Enabling paid vendor packages must
// never enable seller onboarding, buyer checkout, or payout operations.
export function readSellerStripeConfig(env: NodeJS.ProcessEnv): SellerStripeConfig | null {
  if (env.GROOKAI_VENDOR_PAYMENTS_ENABLED !== "true") return null;
  const mode = env.STRIPE_PAYMENTS_MODE;
  if (mode !== "test" && mode !== "live") throw new Error("Invalid seller Stripe mode");
  const secretKey = env.STRIPE_SECRET_KEY ?? "";
  if (!(mode === "live" ? /^(sk|rk)_live_[A-Za-z0-9]+$/ : /^(sk|rk)_test_[A-Za-z0-9]+$/).test(secretKey))
    throw new Error("Seller credential mode mismatch");
  const scope = { accountId: env.STRIPE_ACCOUNT_ID ?? "", livemode: mode === "live" };
  assertSellerScope(scope);
  const webhookSecret = env.STRIPE_CONNECT_WEBHOOK_SECRET ?? "";
  if (!/^whsec_[A-Za-z0-9]{16,}$/.test(webhookSecret)) throw new Error("Connect webhook secret required");
  return { secretKey, scope, webhookSecret };
}

export function createSellerStripeClient(config: SellerStripeConfig): Stripe {
  return new Stripe(config.secretKey, { apiVersion: STRIPE_BILLING_API_VERSION,
    maxNetworkRetries: 2, timeout: 10_000, telemetry: false,
    appInfo: { name: "Grookai Vault seller payments", version: "1" } });
}

async function providerRead<T>(read: () => Promise<T>): Promise<T> {
  try { return await read(); }
  catch { throw new Error("Seller provider verification unavailable"); }
}

// This read-only boundary accepts a SERVER-LOADED binding and authenticated
// owner, never account IDs supplied in a browser form. No account creation,
// update, money movement, entitlement write or return-URL handling occurs here.
export async function readVerifiedSellerReadiness(stripe: Stripe, config: SellerStripeConfig,
  binding: SellerBinding, ownerId: string, clock: () => number = () => Math.floor(Date.now() / 1000)) {
  assertSellerBinding(binding, config.scope, ownerId);
  const startedAt = clock();
  if (!Number.isSafeInteger(startedAt) || startedAt < 0) throw new Error("Invalid seller observation time");
  const platform = await providerRead(() => stripe.accounts.retrieve(null));
  if (platform.object !== "account" || platform.id !== config.scope.accountId)
    throw new Error("Seller platform account mismatch");
  const account = await providerRead(() => stripe.accounts.retrieve(binding.connectedAccountId));
  if (account.object !== "account" || account.id !== binding.connectedAccountId)
    throw new Error("Seller account evidence mismatch");
  const balance = await providerRead(() => stripe.balance.retrieve({}, { stripeAccount: binding.connectedAccountId }));
  const finishedAt = clock();
  // A stalled verification is not a recent observation; never retain a prior
  // ready result if any retrieval fails or this bounded read takes too long.
  if (!Number.isSafeInteger(finishedAt) || finishedAt < startedAt || finishedAt - startedAt >= 60)
    throw new Error("Seller observation expired");
  return projectSellerReadiness({ binding, scope: config.scope, ownerId, account, balance, checkedAt: startedAt });
}

export type SellerAccountSignal = { eventId: string; connectedAccountId: string;
  kind: "refresh" | "deauthorized"; createdAt: number };

// A verified event is a reconciliation signal, never authoritative readiness.
// The future inbox must bind it to durable storage and retrieve current Account
// state. Deauthorization must invalidate the binding before checkout can resume.
export function verifySellerAccountSignal(stripe: Stripe, config: SellerStripeConfig,
  payload: string, signature: string, receivedAt = Date.now()): SellerAccountSignal | null {
  assertSellerScope(config.scope);
  if (Buffer.byteLength(payload, "utf8") > 256 * 1024 || !signature || signature.length > 2048 ||
      !Number.isSafeInteger(receivedAt) || receivedAt < 0) throw new Error("Invalid Connect webhook envelope");
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(payload, signature, config.webhookSecret, 300, undefined, receivedAt); }
  catch { throw new Error("Invalid Connect webhook signature"); }
  if (event.object !== "event" || !/^evt_[A-Za-z0-9]+$/.test(event.id) ||
      event.api_version !== STRIPE_BILLING_API_VERSION || event.livemode !== config.scope.livemode ||
      typeof event.account !== "string" || !/^acct_[A-Za-z0-9]+$/.test(event.account) ||
      event.account === config.scope.accountId || event.context != null ||
      !Number.isSafeInteger(event.created) || event.created < 0 || event.created > Math.floor(receivedAt / 1000))
    throw new Error("Connect event scope mismatch");
  // Verify scope even for ignored types. Billing events cannot become seller
  // readiness and payment-completed events cannot become order confirmation here.
  if (event.type !== "account.updated" && event.type !== "account.application.deauthorized") return null;
  if (event.type === "account.updated" &&
      (event.data.object.object !== "account" || event.data.object.id !== event.account))
    throw new Error("Connect event account mismatch");
  if (event.type === "account.application.deauthorized" && event.data.object.object !== "application")
    throw new Error("Connect deauthorization evidence mismatch");
  return { eventId: event.id, connectedAccountId: event.account,
    kind: event.type === "account.updated" ? "refresh" : "deauthorized", createdAt: event.created };
}
