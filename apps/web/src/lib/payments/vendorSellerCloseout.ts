import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertSellerBinding } from "./vendorSellerPolicy.ts";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import { createVendorSellerRepository, SellerError } from "./vendorSellerRepository.ts";
import type { SellerAccount, SellerLease, VendorSellerRepository } from "./vendorSellerRepository.ts";
import { readSellerFinancialReview, sellerReviewHash } from "./vendorSellerFinancialReview.ts";
import type { SellerFinancialReview } from "./vendorSellerFinancialReview.ts";

export interface SellerCloseoutRepository extends VendorSellerRepository {
  holds(ownerId: string): Promise<{ id: string; reason: string; reference_id: string | null }[]>;
  freeze(lease: SellerLease, closeoutId: string): Promise<SellerAccount>;
}
export function createSellerCloseoutRepository(admin: SupabaseClient): SellerCloseoutRepository {
  return { ...createVendorSellerRepository(admin),
    async holds(ownerId) {
      const { data, error } = await admin.from("vendor_account_financial_holds").select("id,reason,reference_id").eq("owner_id", ownerId).order("id").limit(101);
      if (error || !data || data.length > 100) throw new SellerError("seller_closeout_holds_unavailable");
      return data;
    },
    async freeze(l, id) {
      const { data, error } = await admin.rpc("vendor_seller_freeze_v1", { p_id: l.id, p_token: l.token, p_fence: l.fence, p_closeout_id: id });
      if (error) throw new SellerError(/^seller_[a-z_]+$/.test(error.message) ? error.message : "seller_closeout_unavailable");
      return data as SellerAccount;
    },
  };
}
export type SellerCloseoutContext = { ownerId: string; closeoutId: string; ticketHash: string;
  environment: string; implementationHash: string; createdAt: number };
export type SellerCloseoutPlan = { version: "vendor-seller-closeout-plan-v1"; createdAt: number; expiresAt: number;
  targetFingerprint: string; requestFingerprint: string; environment: string; implementationHash: string;
  stateHash: string; decision: "freeze_and_retain" | "already_frozen" | "no_seller";
  deletionPermitted: false; providerActions: []; reviewReasons: string[];
  financial: Omit<SellerFinancialReview, "checkedAt" | "evidenceHash"> | null; planSha256: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function context(c: SellerCloseoutContext, config: SellerStripeConfig, now: number) {
  if (!uuid.test(c.ownerId) || !uuid.test(c.closeoutId) || !/^[0-9a-f]{64}$/.test(c.ticketHash) ||
      !/^[0-9a-f]{64}$/.test(c.implementationHash) || !Number.isSafeInteger(c.createdAt) || !Number.isSafeInteger(now) ||
      c.createdAt < 0 || now < c.createdAt || now - c.createdAt >= 900)
    throw new SellerError("seller_closeout_plan_invalid");
  if (c.environment !== (config.scope.livemode ? "https://ycdxbpibncqcchqiihfz.supabase.co" : "http://127.0.0.1:18821"))
    throw new SellerError("seller_closeout_environment_mismatch");
}
function validate(a: SellerAccount, c: SellerCloseoutContext, config: SellerStripeConfig) {
  assertSellerBinding({ id: a.id, ownerId: a.owner_id, storeId: a.store_id, platformAccountId: a.stripe_account_id,
    livemode: a.livemode, connectedAccountId: a.connected_account_id ?? "acct_validation", controller: a.controller }, config.scope, c.ownerId);
  if (a.closeout_id && a.closeout_id !== c.closeoutId) throw new SellerError("seller_closeout_request_mismatch");
}
function identity(a: SellerAccount | null) {
  return a ? { id: a.id, owner: a.owner_id, store: a.store_id, platform: a.stripe_account_id, mode: a.livemode,
    account: a.connected_account_id, controller: a.controller, attempt: a.creation_attempt_id,
    startedAt: a.creation_started_at, state: a.state, closeoutId: a.closeout_id } : null;
}

// A review is bounded, non-atomic provider evidence, never financial clearance.
// This private plan can authorize only a local binding freeze with data retained.
export async function buildSellerCloseoutPlan(repo: SellerCloseoutRepository, stripe: Stripe, config: SellerStripeConfig,
  c: SellerCloseoutContext, clock: () => number = () => Math.floor(Date.now() / 1000)): Promise<SellerCloseoutPlan> {
  context(c, config, clock());
  const account = await repo.account(c.ownerId); if (account) validate(account, c, config);
  const holds = await repo.holds(c.ownerId), reasons = new Set<string>(["retained_order_ledger_required", "future_claims_require_retention"]);
  let financial: SellerFinancialReview | null = null;
  if (holds.length) reasons.add("financial_hold");
  if (account?.connected_account_id) {
    if (account.state === "deauthorized") reasons.add("provider_access_revoked");
    else financial = await readSellerFinancialReview(stripe, config, { id: account.id, ownerId: account.owner_id,
      storeId: account.store_id, platformAccountId: account.stripe_account_id, connectedAccountId: account.connected_account_id,
      livemode: account.livemode, controller: account.controller }, c.ownerId, clock);
  } else if (account?.creation_started_at) reasons.add("ambiguous_creation_requires_recovery");
  for (const reason of financial?.reviewReasons ?? []) reasons.add(reason);
  const final = await repo.account(c.ownerId);
  if (sellerReviewHash(identity(final)) !== sellerReviewHash(identity(account))) throw new SellerError("seller_closeout_state_changed");
  context(c, config, clock());
  // Observation timestamps and lease tokens are not financial identity. Exact
  // provider/resource evidence and all durable target fields ARE plan-bound.
  const projection = financial ? { version: financial.version, deletionPermitted: financial.deletionPermitted,
    completeLists: financial.completeLists, nonzeroBalance: financial.nonzeroBalance, counts: financial.counts, reviewReasons: financial.reviewReasons } : null;
  const plan = { version: "vendor-seller-closeout-plan-v1" as const, createdAt: c.createdAt, expiresAt: c.createdAt + 900,
    targetFingerprint: sellerReviewHash({ owner: c.ownerId, scope: config.scope }),
    requestFingerprint: sellerReviewHash({ ticket: c.ticketHash, closeout: c.closeoutId }), environment: c.environment, implementationHash: c.implementationHash,
    stateHash: sellerReviewHash({ account: identity(account), holds, provider: financial?.evidenceHash ?? null }),
    decision: !account ? "no_seller" as const : account.closeout_id ? "already_frozen" as const : "freeze_and_retain" as const,
    deletionPermitted: false as const, providerActions: [] as [], reviewReasons: [...reasons].sort(), financial: projection };
  return { ...plan, planSha256: sellerReviewHash(plan) };
}

export async function applySellerCloseoutPlan(repo: SellerCloseoutRepository, stripe: Stripe, config: SellerStripeConfig,
  c: SellerCloseoutContext, reviewed: SellerCloseoutPlan, expectedHash: string,
  clock: () => number = () => Math.floor(Date.now() / 1000), token: () => string = randomUUID) {
  context(c, config, clock());
  const { planSha256, ...payload } = reviewed;
  if (!/^[0-9a-f]{64}$/.test(expectedHash) || expectedHash !== planSha256 || sellerReviewHash(payload) !== expectedHash ||
      reviewed.targetFingerprint !== sellerReviewHash({ owner: c.ownerId, scope: config.scope }) ||
      reviewed.requestFingerprint !== sellerReviewHash({ ticket: c.ticketHash, closeout: c.closeoutId }) ||
      reviewed.environment !== c.environment || reviewed.implementationHash !== c.implementationHash || reviewed.createdAt !== c.createdAt)
    throw new SellerError("seller_closeout_review_required");
  const initial = await repo.account(c.ownerId);
  if (initial) validate(initial, c, config);
  // Lost freeze-response recovery: only the same immutable closeout request can
  // read this outcome. No second freeze, provider mutation or deletion occurs.
  if (initial?.state === "closing" && initial.closeout_id === c.closeoutId)
    return { state: "frozen_retained" as const, deletionPermitted: false as const };
  const current = await buildSellerCloseoutPlan(repo, stripe, config, c, clock);
  if (current.planSha256 !== expectedHash) throw new SellerError("seller_closeout_plan_changed");
  if (!initial) return { state: "no_seller" as const, deletionPermitted: false as const };
  const claimToken = token(), claimed = await repo.claim(initial.id, claimToken);
  if (!claimed) throw new SellerError("seller_busy");
  validate(claimed, c, config);
  if (claimed.id !== initial.id || claimed.lease_token !== claimToken || !Number.isSafeInteger(claimed.lease_fence) || claimed.lease_fence <= 0)
    throw new SellerError("seller_lease_lost");
  const lease = { id: initial.id, token: claimToken, fence: claimed.lease_fence }; let frozen = false;
  try {
    const recheck = await buildSellerCloseoutPlan(repo, stripe, config, c, clock);
    if (recheck.planSha256 !== expectedHash) throw new SellerError("seller_closeout_plan_changed");
    const locked = await repo.locked(lease); validate(locked, c, config);
    if (sellerReviewHash(identity(locked)) !== sellerReviewHash(identity(initial))) throw new SellerError("seller_closeout_state_changed");
    context(c, config, clock());
    const result = await repo.freeze(lease, c.closeoutId);
    validate(result, c, config);
    if (result.state !== "closing" || result.closeout_id !== c.closeoutId || result.lease_token !== null || result.lease_fence <= lease.fence)
      throw new SellerError("seller_closeout_unverified");
    frozen = true;
    return { state: "frozen_retained" as const, deletionPermitted: false as const };
  } finally {
    if (!frozen) try { await repo.release(lease); } catch (e) {
      if (!(e instanceof SellerError && e.code === "seller_lease_lost")) throw e;
    }
  }
}
