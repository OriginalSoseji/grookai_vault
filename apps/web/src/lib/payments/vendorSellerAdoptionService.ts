import type Stripe from "stripe";
import type { SellerScope } from "./vendorSellerPolicy.ts";
import { SellerError } from "./vendorSellerRepository.ts";
import { verifySellerAdoption } from "./vendorSellerAdoption.ts";
import type { AdoptionOwner, SellerAdoptionGrant, SellerAdoptionEvidence } from "./vendorSellerAdoption.ts";

export interface SellerAdoptionRepository {
  grant(ownerId: string): Promise<SellerAdoptionGrant | null>;
  binding(ownerId: string): Promise<{ adoptionGrantId: string | null; state: string; platformAccountId: string; livemode: boolean } | null>;
  adopt(ownerId: string, grantId: string, evidence: SellerAdoptionEvidence): Promise<{ state: string }>;
}
export function createSellerAdoptionService(input: {
  repo: SellerAdoptionRepository; stripe: Stripe; scope: SellerScope; now?: () => number;
}) {
  const { repo, stripe, scope } = input, clock = input.now ?? (() => Math.floor(Date.now() / 1000));
  return {
    async available(ownerId: string) {
      if (await repo.binding(ownerId)) return false;
      const grant = await repo.grant(ownerId);
      return Boolean(grant && grant.ownerId === ownerId && grant.platformAccountId === scope.accountId &&
        grant.livemode === scope.livemode && grant.createdAt <= clock() && grant.expiresAt > clock());
    },
    async connect(owner: AdoptionOwner) {
      const existing = await repo.binding(owner.id);
      if (existing) {
        if (!existing.adoptionGrantId || existing.state !== "bound" || existing.platformAccountId !== scope.accountId ||
            existing.livemode !== scope.livemode) throw new SellerError("seller_onboarding_blocked");
        return { connected: true as const };
      }
      const grant = await repo.grant(owner.id);
      if (!grant) throw new SellerError("seller_onboarding_unavailable");
      const evidence = await verifySellerAdoption(stripe, scope, grant, owner, clock);
      const result = await repo.adopt(owner.id, grant.id, evidence);
      if (result.state !== "bound") throw new SellerError("seller_onboarding_blocked");
      return { connected: true as const };
    },
  };
}
