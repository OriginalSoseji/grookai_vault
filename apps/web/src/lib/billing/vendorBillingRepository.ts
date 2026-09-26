import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingScope, SubscriptionProjection, VendorPlan } from "./vendorSubscriptionPolicy.ts";

export type BillingAccount = {
  owner_id: string; stripe_account_id: string; livemode: boolean; customer_id: string | null;
  customer_attempt_id: string; customer_attempt_created_at: string; current_subscription_id: string | null;
  subscription_status: string; entitlement_id: string | null; cancel_at_period_end: boolean;
  lease_token: string | null; lease_fence: number;
  customer_creation_started_at: string|null; closeout_id:string|null;
  closeout_requested_at:string|null;closeout_paid_through:string|null;
};
export type CheckoutRow = {
  id: string; owner_id: string; customer_id: string; requested_plan: VendorPlan; created_at: string;
  session_id: string | null; subscription_id: string | null; state: "creating" | "open" | "completed" | "enrolled" | "expired" | "recovery";
};
export type Lease = { ownerId: string; token: string; fence: number };
export type BillingEventReference = { id: string; type: string; customerId: string; subscriptionId: string; created: number };
export class BillingError extends Error {
  code: string;
  constructor(code: string) { super(code); this.name = "BillingError"; this.code=code; }
}
export interface VendorBillingRepository {
  account(ownerId: string, scope: BillingScope): Promise<BillingAccount | null>;
  customer(customerId: string, scope: BillingScope): Promise<BillingAccount | null>;
  reserve(ownerId: string, scope: BillingScope): Promise<BillingAccount>;
  claim(ownerId: string, token: string): Promise<BillingAccount | null>;
  release(lease: Lease): Promise<void>;
  prepare(lease: Lease, plan: VendorPlan): Promise<BillingAccount>;
  bindCustomer(lease: Lease, customerId: string): Promise<BillingAccount>;
  noteCustomerCreation(lease:Lease):Promise<void>;
  pending(ownerId: string): Promise<CheckoutRow | null>;
  beginCheckout(lease: Lease, plan: VendorPlan): Promise<CheckoutRow>;
  bindCheckout(lease: Lease, attempt: CheckoutRow, sessionId: string, state: "open" | "completed" | "expired", subscriptionId: string | null): Promise<CheckoutRow>;
  commit(lease: Lease, projection: SubscriptionProjection, attemptId?: string, eventId?: string): Promise<void>;
  enqueue(scope: BillingScope, event: BillingEventReference): Promise<{state: string}>;
  ignore(lease: Lease, eventId: string): Promise<void>;
  fail(lease: Lease, eventId: string, code: "checkout_pending" | "binding_required" | "reconciliation_failed"): Promise<void>;
  defer(lease: Lease, code: "checkout_pending" | "binding_required" | "reconciliation_failed"): Promise<void>;
}
const leaseParams = (l: Lease) => ({ p_owner_id: l.ownerId, p_claim_token: l.token, p_fence: l.fence });
function databaseError(error: { message?: string; code?: string }): BillingError {
  return new BillingError(/^billing_[a-z_]+$/.test(error.message ?? "") ? error.message! : "billing_unavailable");
}

// Construct only from the existing server administrative client. It never accepts
// connection strings, browser-supplied owner/customer IDs or environment overrides.
export function createVendorBillingRepository(admin: SupabaseClient): VendorBillingRepository {
  async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
    const { data, error } = await admin.rpc(name, params); if (error) throw databaseError(error); return data as T;
  }
  async function find(column: "owner_id" | "customer_id", value: string, scope: BillingScope) {
    const {data,error}=await admin.from("vendor_billing_accounts").select("*").eq(column,value).eq("stripe_account_id",scope.accountId).eq("livemode",scope.livemode).maybeSingle();
    if(error)throw databaseError(error);return data as BillingAccount|null;
  }
  return {
    account: (id, scope) => find("owner_id", id, scope), customer: (id, scope) => find("customer_id", id, scope),
    reserve: (id, s) => rpc("vendor_billing_reserve_account_v1", { p_owner_id:id,p_stripe_account_id:s.accountId,p_livemode:s.livemode }),
    claim: (id, token) => rpc("vendor_billing_claim_v1", { p_owner_id:id,p_claim_token:token }),
    release: l => rpc("vendor_billing_release_v1", leaseParams(l)),
    prepare: (l, plan) => rpc("vendor_billing_prepare_checkout_v1", {...leaseParams(l),p_plan:plan}),
    bindCustomer: (l, id) => rpc("vendor_billing_bind_customer_v1", {...leaseParams(l),p_customer_id:id}),
    noteCustomerCreation:l=>rpc("vendor_billing_customer_creation_v1",leaseParams(l)),
    async pending(id) {
      const {data,error}=await admin.from("vendor_billing_checkout_attempts").select("*").eq("owner_id",id).in("state",["creating","open","completed","recovery"]).maybeSingle();
      if(error)throw databaseError(error);return data as CheckoutRow|null;
    },
    beginCheckout: (l, plan) => rpc("vendor_billing_begin_checkout_v1", {...leaseParams(l),p_plan:plan}),
    bindCheckout: (l, a, session, state, sub) => rpc("vendor_billing_bind_checkout_v1", {...leaseParams(l),p_attempt_id:a.id,p_session_id:session,p_state:state,p_subscription_id:sub}),
    commit: (l, p, attempt, event) => rpc("vendor_billing_commit_projection_v1", {...leaseParams(l),
      p_customer_id:p.customerId,p_subscription_id:p.subscriptionId,p_status:p.status,p_plan:p.plan,
      p_paid_from:p.paidFrom===null?null:new Date(p.paidFrom*1000).toISOString(),
      p_paid_through:p.paidThrough===null?null:new Date(p.paidThrough*1000).toISOString(),
      p_reason:p.reason,p_cancel_at_period_end:p.cancelAtPeriodEnd,p_attempt_id:attempt??null,p_event_id:event??null}),
    enqueue: (s,e) => rpc("vendor_billing_enqueue_event_v1", {p_stripe_account_id:s.accountId,p_livemode:s.livemode,p_event_id:e.id,
      p_event_type:e.type,p_customer_id:e.customerId,p_subscription_id:e.subscriptionId,p_provider_created_at:new Date(e.created*1000).toISOString()}),
    ignore: (l,e) => rpc("vendor_billing_ignore_event_v1", {...leaseParams(l),p_event_id:e}),
    fail: (l,e,code) => rpc("vendor_billing_fail_event_v1", {...leaseParams(l),p_event_id:e,p_code:code}),
    defer: (l,code) => rpc("vendor_billing_defer_reconcile_v1", {...leaseParams(l),p_code:code}),
  };
}
