import type Stripe from "stripe";
import { assertSellerBinding, assertSellerScope } from "./vendorSellerPolicy.ts";
import type { SellerController } from "./vendorSellerPolicy.ts";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";

export const SELLER_ACCOUNT_MODEL = "direct_full_vendor_fees_v1";
export const SELLER_CONTROLLER: SellerController = Object.freeze({ feesPayer: "account",
  paymentLosses: "stripe", requirementCollection: "stripe", dashboard: "full" });
export type SellerCreationAttempt = {
  id: string; ownerId: string; storeId: string; platformAccountId: string;
  livemode: boolean; controller: SellerController; attemptId: string; startedAt: number;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateAttempt(a: SellerCreationAttempt, config: SellerStripeConfig, ownerId: string, now: number) {
  assertSellerScope(config.scope);
  assertSellerBinding({ ...a, connectedAccountId: "acct_validation" }, config.scope, ownerId);
  if (!uuid.test(a.attemptId) || !Number.isSafeInteger(a.startedAt) || a.startedAt < 0 ||
      !Number.isSafeInteger(now) || now < a.startedAt ||
      Object.keys(a.controller).length !== 4 ||
      Object.entries(SELLER_CONTROLLER).some(([key, value]) => a.controller[key as keyof SellerController] !== value))
    throw new Error("Invalid seller creation attempt");
}
async function provider<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch { throw new Error("Seller provider unavailable"); }
}
async function verifyPlatform(stripe: Stripe, config: SellerStripeConfig) {
  const platform = await provider(() => stripe.accounts.retrieve(null));
  if (platform.object !== "account" || platform.id !== config.scope.accountId)
    throw new Error("Seller platform account mismatch");
  // Account V1 has no livemode. Verify the credential's actual mode BEFORE POST.
  const balance = await provider(() => stripe.balance.retrieve());
  if (balance.object !== "balance" || balance.livemode !== config.scope.livemode)
    throw new Error("Seller platform mode mismatch");
}
function metadata(a: SellerCreationAttempt) {
  return { grookai_seller_version: "vendor-seller-v1", grookai_seller_binding: a.id,
    grookai_seller_attempt: a.attemptId };
}
function verifyAccount(account: Stripe.Account, id: string, a: SellerCreationAttempt, now: number) {
  const c = account.controller;
  if (account.object !== "account" || account.id !== id || !/^acct_[A-Za-z0-9]+$/.test(id) ||
      id === a.platformAccountId || typeof account.created !== "number" || !Number.isSafeInteger(account.created) ||
      account.created < a.startedAt || account.created >= a.startedAt + 86400 || account.created > now ||
      Object.entries(metadata(a)).some(([key, value]) => account.metadata?.[key] !== value) ||
      c?.type !== "application" || c.is_controller !== true || c.fees?.payer !== a.controller.feesPayer ||
      c.losses?.payments !== a.controller.paymentLosses || c.requirement_collection !== a.controller.requirementCollection ||
      c.stripe_dashboard?.type !== a.controller.dashboard)
    throw new Error("Seller account creation evidence mismatch");
}
async function readAccount(stripe: Stripe, config: SellerStripeConfig, a: SellerCreationAttempt, id: string, now: number) {
  if (!/^acct_[A-Za-z0-9]+$/.test(id) || id === config.scope.accountId) throw new Error("Invalid seller account");
  const account = await provider(() => stripe.accounts.retrieve(id));
  verifyAccount(account, id, a, now);
  const balance = await provider(() => stripe.balance.retrieve({}, { stripeAccount: id }));
  if (balance.object !== "balance" || balance.livemode !== config.scope.livemode)
    throw new Error("Seller account mode mismatch");
  return id;
}

// Called only after durable preparation and lease validation. Never create a new
// attempt on failure: a lost response retries these EXACT parameters and key.
export async function createSellerAccount(stripe: Stripe, config: SellerStripeConfig,
  a: SellerCreationAttempt, ownerId: string, clock: () => number) {
  const started = clock(); validateAttempt(a, config, ownerId, started);
  if (started - a.startedAt >= 23 * 3600) throw new Error("Seller creation needs recovery");
  await verifyPlatform(stripe, config);
  const beforePost = clock();
  if (beforePost < started || beforePost - started >= 60 || beforePost - a.startedAt >= 23 * 3600)
    throw new Error("Seller creation needs recovery");
  const account = await provider(() => stripe.accounts.create({
    controller: { fees: { payer: a.controller.feesPayer }, losses: { payments: a.controller.paymentLosses },
      requirement_collection: a.controller.requirementCollection, stripe_dashboard: { type: a.controller.dashboard } },
    metadata: metadata(a),
    // Leave country, business identity, capabilities and TOS to hosted onboarding.
  }, { idempotencyKey: `grookai-seller:${a.platformAccountId}:${a.livemode ? "live" : "test"}:${a.attemptId}` }));
  verifyAccount(account, account.id, a, clock());
  return readAccount(stripe, config, a, account.id, clock());
}

// Private recovery accepts a reviewed existing ID, never a browser request. It
// performs only GETs, including after idempotency retention or account freeze.
export async function recoverSellerAccount(stripe: Stripe, config: SellerStripeConfig,
  a: SellerCreationAttempt, ownerId: string, accountId: string, now: number) {
  validateAttempt(a, config, ownerId, now);
  await verifyPlatform(stripe, config);
  return readAccount(stripe, config, a, accountId, now);
}

export function sellerReturnOrigin(origin: string, live: boolean): string {
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password ||
      !(url.protocol === "https:" || (!live && url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))))
    throw new Error("Invalid seller return origin");
  return origin;
}
export async function createSellerOnboardingLink(stripe: Stripe, config: SellerStripeConfig,
  a: SellerCreationAttempt, ownerId: string, accountId: string, origin: string, clock: () => number) {
  sellerReturnOrigin(origin, config.scope.livemode);
  await recoverSellerAccount(stripe, config, a, ownerId, accountId, clock());
  const link = await provider(() => stripe.accountLinks.create({ account: accountId, type: "account_onboarding",
    collection_options: { fields: "eventually_due" },
    return_url: `${origin}/account/store/payments?onboarding=returned`,
    refresh_url: `${origin}/account/store/payments?onboarding=refresh`,
  }));
  const now = clock(), url = new URL(link.url);
  if (link.object !== "account_link" || !Number.isSafeInteger(link.created) || !Number.isSafeInteger(link.expires_at) ||
      link.created > now || link.expires_at <= now || link.expires_at <= link.created ||
      url.origin !== "https://connect.stripe.com" || url.username || url.password || url.hash)
    throw new Error("Invalid seller onboarding link");
  return link.url;
}
