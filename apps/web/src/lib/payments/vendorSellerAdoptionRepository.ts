import type { SupabaseClient } from "@supabase/supabase-js";
import type { SellerAdoptionRepository } from "./vendorSellerAdoptionService.ts";
import { SellerError } from "./vendorSellerRepository.ts";

export function createSellerAdoptionRepository(admin: SupabaseClient): SellerAdoptionRepository {
  return {
    async grant(ownerId) {
      const { data, error } = await admin.from("vendor_seller_adoption_grants")
        .select("id,owner_id,store_id,stripe_account_id,connected_account_id,livemode,owner_email_sha256,created_at,expires_at")
        .eq("owner_id", ownerId).eq("enabled", true).maybeSingle();
      if (error) throw new SellerError("seller_unavailable");
      return data ? { id: data.id, ownerId: data.owner_id, storeId: data.store_id, platformAccountId: data.stripe_account_id,
        connectedAccountId: data.connected_account_id, livemode: data.livemode, ownerEmailSha256: data.owner_email_sha256,
        createdAt: Math.floor(Date.parse(data.created_at) / 1000), expiresAt: Math.floor(Date.parse(data.expires_at) / 1000) } : null;
    },
    async binding(ownerId) {
      const { data, error } = await admin.from("vendor_seller_accounts")
        .select("adoption_grant_id,state,stripe_account_id,livemode").eq("owner_id", ownerId).maybeSingle();
      if (error) throw new SellerError("seller_unavailable");
      return data ? { adoptionGrantId: data.adoption_grant_id, state: data.state,
        platformAccountId: data.stripe_account_id, livemode: data.livemode } : null;
    },
    async adopt(ownerId, grantId, evidence) {
      const { data, error } = await admin.rpc("vendor_seller_adopt_v1", {
        p_owner_id: ownerId, p_grant_id: grantId, p_evidence: evidence,
      });
      if (error || !data) throw new SellerError("seller_unavailable");
      return { state: data.state };
    },
  };
}
