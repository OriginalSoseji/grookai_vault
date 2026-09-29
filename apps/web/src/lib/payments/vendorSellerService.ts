import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { createSellerAccount, createSellerOnboardingLink, recoverSellerAccount, SELLER_CONTROLLER } from "./vendorSellerEnrollment.ts";
import type { SellerCreationAttempt } from "./vendorSellerEnrollment.ts";
import { assertSellerBinding } from "./vendorSellerPolicy.ts";
import type { SellerReadiness } from "./vendorSellerPolicy.ts";
import { readVerifiedSellerReadiness } from "./vendorSellerStripeGateway.ts";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import { SellerError } from "./vendorSellerRepository.ts";
import type { VendorSellerRepository, SellerAccount, SellerLease } from "./vendorSellerRepository.ts";

export type SellerStatus = { enabled: boolean; onboardingEnabled: boolean; testMode: boolean | null;
  state: "none" | SellerAccount["state"]; hasConnectedAccount: boolean; recoveryRequired: boolean;
  readiness: Pick<SellerReadiness, "capabilitiesReady" | "reasons" | "requirements" | "checkedAt"> | null };
function attempt(a: SellerAccount): SellerCreationAttempt {
  return { id: a.id, ownerId: a.owner_id, storeId: a.store_id, platformAccountId: a.stripe_account_id,
    livemode: a.livemode, controller: a.controller, attemptId: a.creation_attempt_id ?? "",
    startedAt: a.creation_started_at === null ? NaN : Math.floor(Date.parse(a.creation_started_at) / 1000) };
}
export function createVendorSellerService(input: { repo: VendorSellerRepository; stripe: Stripe; config: SellerStripeConfig;
  onboardingEnabled: boolean; origin: string; now?: () => number; token?: () => string }) {
  const { repo, stripe, config } = input, now = input.now ?? (() => Math.floor(Date.now() / 1000)), token = input.token ?? randomUUID;
  function validate(a: SellerAccount, owner: string) {
    assertSellerBinding({ ...attempt(a), connectedAccountId: a.connected_account_id ?? "acct_validation" }, config.scope, owner);
    if (Object.entries(SELLER_CONTROLLER).some(([k, v]) => a.controller[k as keyof typeof SELLER_CONTROLLER] !== v))
      throw new SellerError("seller_scope_mismatch");
  }
  function requireBound(a: SellerAccount) {
    if (a.state !== "bound" || !a.connected_account_id || a.closeout_id) throw new SellerError("seller_onboarding_blocked");
  }
  async function claim(a: SellerAccount, owner: string) {
    validate(a, owner);
    const value = token(), next = await repo.claim(a.id, value);
    if (!next) throw new SellerError("seller_busy");
    validate(next, owner);
    if (next.id !== a.id || next.lease_token !== value || !Number.isSafeInteger(next.lease_fence) || next.lease_fence <= 0)
      throw new SellerError("seller_lease_lost");
    return { account: next, lease: { id: a.id, token: value, fence: next.lease_fence } satisfies SellerLease };
  }
  async function release(lease: SellerLease) {
    try { await repo.release(lease); } catch (e) {
      if (!(e instanceof SellerError && e.code === "seller_lease_lost")) throw e;
    }
  }
  async function current(lease: SellerLease, owner: string) {
    const a = await repo.locked(lease); validate(a, owner); return a;
  }
  return {
    async status(owner: string): Promise<SellerStatus> {
      const a = await repo.account(owner); if (a) validate(a, owner);
      let allowed = false;
      if (input.onboardingEnabled) {
        try { await repo.authorize(owner); allowed = true; } catch (e) {
          if (!(e instanceof SellerError && e.code === "seller_onboarding_unavailable")) throw e;
        }
      }
      return { enabled: true, onboardingEnabled: allowed && !a?.adoption_grant_id && (!a || ["reserved", "creating", "bound"].includes(a.state)),
        testMode: !config.scope.livemode, state: a?.state ?? "none", hasConnectedAccount: Boolean(a?.connected_account_id),
        recoveryRequired: Boolean(a && !a.connected_account_id && a.creation_started_at && now() - attempt(a).startedAt >= 23 * 3600), readiness: null };
    },
    async onboarding(owner: string): Promise<{ url: string }> {
      if (!input.onboardingEnabled) throw new SellerError("seller_onboarding_unavailable");
      if ((await repo.account(owner))?.adoption_grant_id) throw new SellerError("seller_onboarding_blocked");
      const store = await repo.store(owner); if (!store) throw new SellerError("seller_store_required");
      const reserved = await repo.reserve(owner, store, config.scope, SELLER_CONTROLLER);
      const { account, lease } = await claim(reserved, owner);
      try {
        let a = account;
        if (["deauthorized", "closing"].includes(a.state) || a.closeout_id) throw new SellerError("seller_onboarding_blocked");
        if (!a.connected_account_id) {
          a = await repo.prepare(lease); validate(a, owner);
          const id = await createSellerAccount(stripe, config, attempt(a), owner, now);
          a = await repo.bind(lease, id); validate(a, owner);
        }
        requireBound(a);
        await repo.authorize(owner); a = await current(lease, owner); requireBound(a);
        const url = await createSellerOnboardingLink(stripe, config, attempt(a), owner, a.connected_account_id!, input.origin, now);
        // A concurrent callback, closure, downgrade or disabled rollout invalidates
        // this response. Never deliver a link after losing authorization/lease.
        await repo.authorize(owner); requireBound(await current(lease, owner));
        return { url };
      } finally { await release(lease); }
    },
    async refresh(owner: string): Promise<SellerStatus> {
      const stored = await repo.account(owner); if (!stored?.connected_account_id) return this.status(owner);
      const { account, lease } = await claim(stored, owner);
      try {
        requireBound(account);
        const result = await readVerifiedSellerReadiness(stripe, config,
          { ...attempt(account), connectedAccountId: account.connected_account_id! }, owner, now);
        const status = await this.status(owner);
        requireBound(await current(lease, owner));
        if (status.state !== "bound") throw new SellerError("seller_onboarding_blocked");
        return { ...status, readiness: { capabilitiesReady: result.capabilitiesReady, reasons: result.reasons,
          requirements: result.requirements, checkedAt: result.checkedAt } };
      } finally { await release(lease); }
    },
    // Private operator primitive only: no HTTP action accepts a candidate ID.
    async recover(owner: string, candidateId: string): Promise<void> {
      const stored = await repo.account(owner); if (!stored) throw new SellerError("seller_binding_required");
      if (stored.adoption_grant_id) throw new SellerError("seller_onboarding_blocked");
      const { account, lease } = await claim(stored, owner);
      try {
        if (account.connected_account_id && account.connected_account_id !== candidateId) throw new SellerError("seller_scope_mismatch");
        const id = await recoverSellerAccount(stripe, config, attempt(account), owner, candidateId, now());
        await repo.bind(lease, id);
      } finally { await release(lease); }
    },
  };
}
