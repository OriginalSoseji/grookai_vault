import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { assertSellerBinding } from "./vendorSellerPolicy.ts";
import type { SellerScope } from "./vendorSellerPolicy.ts";
import { SELLER_CONTROLLER } from "./vendorSellerEnrollment.ts";

export type SellerAdoptionGrant = {
  id: string; ownerId: string; storeId: string; platformAccountId: string;
  connectedAccountId: string; livemode: boolean; ownerEmailSha256: string;
  createdAt: number; expiresAt: number;
};
export type AdoptionOwner = { id: string; email: string; emailConfirmed: boolean };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function sellerOwnerEmailHash(email: string): string {
  if (typeof email !== "string" || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    throw new Error("Seller owner identity unavailable");
  return digest(email.trim().toLowerCase());
}
function validate(g: SellerAdoptionGrant, scope: SellerScope, owner: AdoptionOwner, now: number) {
  assertSellerBinding({ ...g, controller: SELLER_CONTROLLER }, scope, owner.id);
  if (!owner.emailConfirmed || !/^[a-f0-9]{64}$/.test(g.ownerEmailSha256) ||
      sellerOwnerEmailHash(owner.email) !== g.ownerEmailSha256 ||
      !Number.isSafeInteger(now) || !Number.isSafeInteger(g.createdAt) || !Number.isSafeInteger(g.expiresAt) ||
      g.createdAt < 0 || g.createdAt > now || g.expiresAt <= now || g.expiresAt - g.createdAt > 7 * 86400)
    throw new Error("Seller adoption approval unavailable");
}
async function read<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch { throw new Error("Seller adoption provider unavailable"); }
}

// Private server input only. The grant is loaded from operator-approved storage;
// matching email is supplementary evidence, never authority to claim an account.
// This boundary performs GETs only and cannot create/update a Stripe account.
export async function verifySellerAdoption(stripe: Stripe, scope: SellerScope,
  grant: SellerAdoptionGrant, owner: AdoptionOwner, clock: () => number) {
  const startedAt = clock(); validate(grant, scope, owner, startedAt);
  const platform = await read(() => stripe.accounts.retrieve(null));
  if (platform.object !== "account" || platform.id !== scope.accountId)
    throw new Error("Seller adoption platform mismatch");
  const platformBalance = await read(() => stripe.balance.retrieve());
  if (platformBalance.object !== "balance" || platformBalance.livemode !== scope.livemode)
    throw new Error("Seller adoption platform mode mismatch");
  // Stripe supports reading dashboard-created v2 accounts through this v1 API.
  const account = await read(() => stripe.accounts.retrieve(grant.connectedAccountId));
  const c = account.controller;
  if (account.object !== "account" || account.id !== grant.connectedAccountId ||
      typeof account.created !== "number" || !Number.isSafeInteger(account.created) || account.created < 0 || account.created > startedAt + 5 ||
      !account.email || sellerOwnerEmailHash(account.email) !== grant.ownerEmailSha256 ||
      !account.metadata || Object.keys(account.metadata).some(key => key.startsWith("grookai_")) ||
      c?.type !== "application" || c.is_controller !== true ||
      c.fees?.payer !== SELLER_CONTROLLER.feesPayer || c.losses?.payments !== SELLER_CONTROLLER.paymentLosses ||
      c.requirement_collection !== SELLER_CONTROLLER.requirementCollection ||
      c.stripe_dashboard?.type !== SELLER_CONTROLLER.dashboard)
    throw new Error("Seller adoption account mismatch");
  const balance = await read(() => stripe.balance.retrieve({}, { stripeAccount: grant.connectedAccountId }));
  if (balance.object !== "balance" || balance.livemode !== scope.livemode)
    throw new Error("Seller adoption account mode mismatch");
  const finishedAt = clock(); validate(grant, scope, owner, finishedAt);
  if (finishedAt < startedAt || finishedAt - startedAt >= 60)
    throw new Error("Seller adoption observation expired");
  const evidence = { version: "vendor-seller-adoption-v1" as const, grantId: grant.id,
    ownerId: owner.id, storeId: grant.storeId, platformAccountId: scope.accountId,
    connectedAccountId: grant.connectedAccountId, livemode: scope.livemode,
    ownerEmailSha256: grant.ownerEmailSha256, controller: SELLER_CONTROLLER,
    providerCreatedAt: account.created, checkedAt: startedAt };
  // No raw account object, email, identity documents, bank details or balances.
  return { ...evidence, sha256: digest(JSON.stringify(evidence)) };
}
export type SellerAdoptionEvidence = Awaited<ReturnType<typeof verifySellerAdoption>>;
