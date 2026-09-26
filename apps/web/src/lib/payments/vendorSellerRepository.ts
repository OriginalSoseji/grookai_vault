import type { SupabaseClient } from "@supabase/supabase-js";
import type { SellerController, SellerScope } from "./vendorSellerPolicy.ts";
import type { SellerAccountSignal } from "./vendorSellerStripeGateway.ts";
export type SellerAccount = {
  id: string; owner_id: string; store_id: string; stripe_account_id: string; livemode: boolean;
  controller: SellerController; connected_account_id: string | null; creation_attempt_id: string;
  creation_started_at: string | null; state: "reserved" | "creating" | "bound" | "deauthorized" | "closing";
  lease_token: string | null; lease_fence: number; lease_expires_at: string | null; closeout_id: string | null;
};
export type SellerLease = { id: string; token: string; fence: number };
export class SellerError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.name = "SellerError"; this.code = code; }
}
export interface VendorSellerRepository {
  account(ownerId: string): Promise<SellerAccount | null>;
  store(ownerId: string): Promise<string | null>;
  reserve(ownerId: string, storeId: string, scope: SellerScope, controller: SellerController): Promise<SellerAccount>;
  claim(id: string, token: string): Promise<SellerAccount | null>;
  locked(lease: SellerLease): Promise<SellerAccount>;
  authorize(ownerId: string): Promise<void>;
  prepare(lease: SellerLease): Promise<SellerAccount>;
  bind(lease: SellerLease, accountId: string): Promise<SellerAccount>;
  release(lease: SellerLease): Promise<void>;
  enqueue(scope: SellerScope, event: SellerAccountSignal): Promise<{ inserted: boolean }>;
}
function databaseError(error: { message?: string }) {
  return new SellerError(/^seller_[a-z_]+$/.test(error.message ?? "") ? error.message! : "seller_unavailable");
}
const leaseParams = (l: SellerLease) => ({ p_id: l.id, p_token: l.token, p_fence: l.fence });
export function createVendorSellerRepository(admin: SupabaseClient): VendorSellerRepository {
  async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
    const { data, error } = await admin.rpc(name, params);
    if (error) throw databaseError(error); return data as T;
  }
  return {
    async account(ownerId) {
      const { data, error } = await admin.from("vendor_seller_accounts").select("*").eq("owner_id", ownerId).maybeSingle();
      if (error) throw databaseError(error); return data as SellerAccount | null;
    },
    async store(ownerId) {
      const { data, error } = await admin.from("vendor_stores").select("id").eq("owner_id", ownerId).maybeSingle();
      if (error) throw databaseError(error); return data?.id ?? null;
    },
    reserve: (owner, store, s, c) => rpc("vendor_seller_reserve_v1", { p_owner_id: owner, p_store_id: store,
      p_stripe_account_id: s.accountId, p_livemode: s.livemode, p_controller: c }),
    claim: (id, token) => rpc("vendor_seller_claim_v1", { p_id: id, p_token: token }),
    locked: l => rpc("vendor_seller_locked_v1", leaseParams(l)),
    authorize: owner => rpc("vendor_seller_require_onboarding_v1", { p_owner_id: owner }),
    prepare: l => rpc("vendor_seller_prepare_creation_v1", leaseParams(l)),
    bind: (l, id) => rpc("vendor_seller_bind_v1", { ...leaseParams(l), p_connected_account_id: id }),
    release: l => rpc("vendor_seller_release_v1", leaseParams(l)),
    enqueue: (s, e) => rpc("vendor_seller_enqueue_v1", { p_stripe_account_id: s.accountId, p_livemode: s.livemode,
      p_event_id: e.eventId, p_connected_account_id: e.connectedAccountId, p_kind: e.kind,
      p_provider_created_at: new Date(e.createdAt * 1000).toISOString() }),
  };
}
