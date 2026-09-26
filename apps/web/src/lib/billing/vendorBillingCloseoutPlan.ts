import {createHash} from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";
import type Stripe from "stripe";
import type {VendorBillingConfig} from "./vendorStripeGateway.ts";
import {BillingError,createVendorBillingRepository} from "./vendorBillingRepository.ts";
import {inspectVendorCloseout} from "./vendorStripeCloseout.ts";
import {createVendorBillingCloseoutService} from "./vendorBillingCloseoutService.ts";

const version="vendor-billing-closeout-plan-v1";
const sha=(value:string)=>createHash("sha256").update(value).digest("hex");
function canonical(value:unknown):string{
 if(value===undefined)return "null";
 if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
 if(value!==null&&typeof value==="object"){
  const fields=Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`);
  return "{"+fields.join(",")+"}";
 }
 return JSON.stringify(value);
}
export const closeoutPlanHash=(value:unknown)=>sha(canonical(value));
export type CloseoutPlanContext={ownerId:string;ticketHash:string;environment:string;implementationHash:string;createdAt:number};
export type CloseoutPlan={version:string;createdAt:number;expiresAt:number;targetFingerprint:string;ticketHash:string;environment:string;implementationHash:string;
 scope:{accountId:string;livemode:boolean};stateHash:string;decision:"close_billing"|"already_archived"|"no_billing";
 actions:string[];reviewReasons:string[];subscriptionsToCancel:number;checkoutsToExpire:number;planSha256:string};
function validate(c:CloseoutPlanContext,config:VendorBillingConfig,now:number){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(c.ownerId)||
  !/^[0-9a-f]{64}$/.test(c.ticketHash)||!/^[0-9a-f]{64}$/.test(c.implementationHash)||!Number.isSafeInteger(c.createdAt)||
  !Number.isSafeInteger(now)||c.createdAt>now||now-c.createdAt>=900)throw new BillingError("billing_closeout_plan_invalid");
 if(c.environment!==(config.scope.livemode?"https://ycdxbpibncqcchqiihfz.supabase.co":"http://127.0.0.1:17621"))throw new BillingError("billing_closeout_environment_mismatch");
}

// Read-only: no lease claim, RPC mutation, customer search or resource creation.
// Only hashes and bounded action/review summaries may enter an operator artifact.
export async function buildVendorCloseoutPlan(admin:SupabaseClient,stripe:Stripe,config:VendorBillingConfig,c:CloseoutPlanContext,now=Math.floor(Date.now()/1000)):Promise<CloseoutPlan>{
 validate(c,config,now);
 const check=<T>(r:{data:T;error:unknown}):T=>{if(r.error)throw new BillingError("billing_closeout_plan_unavailable");return r.data;};
 const account=check(await admin.from("vendor_billing_accounts").select("*").eq("owner_id",c.ownerId).maybeSingle());
 if(account&&(account.stripe_account_id!==config.scope.accountId||account.livemode!==config.scope.livemode))throw new BillingError("billing_closeout_scope_mismatch");
 const fingerprint=check(await admin.rpc("vendor_billing_owner_fingerprint_v1",{p_owner_id:c.ownerId})) as string;
 const archived=check(await admin.from("vendor_billing_closed_accounts").select("id,stripe_account_id,livemode,request_ticket_hash").eq("owner_fingerprint",fingerprint).maybeSingle());
 if(archived&&(archived.stripe_account_id!==config.scope.accountId||archived.livemode!==config.scope.livemode))throw new BillingError("billing_closeout_scope_mismatch");
 if((account?.closeout_ticket_hash&&account.closeout_ticket_hash!==c.ticketHash)||(archived&&archived.request_ticket_hash!==c.ticketHash))throw new BillingError("billing_closeout_ticket_mismatch");
 const auth=await admin.auth.admin.getUserById(c.ownerId);
 if(!archived&&(auth.error||auth.data.user?.id!==c.ownerId))throw new BillingError("billing_closeout_owner_missing");
 const holds=check(await admin.from("vendor_account_financial_holds").select("id,reason,reference_id").eq("owner_id",c.ownerId).order("id").limit(101))??[];
 if(holds.length>100)throw new BillingError("billing_closeout_inventory_incomplete");
 const pending=account?await createVendorBillingRepository(admin).pending(c.ownerId):null;
 const entitlement=account?.entitlement_id?check(await admin.from("user_entitlements").select("billing_plan,billing_paid_from,billing_paid_through").eq("id",account.entitlement_id).maybeSingle()):null;
 if(account&&!account.customer_id&&(account.customer_creation_started_at||pending))throw new BillingError("billing_recovery_required");
 if(pending&&!pending.session_id)throw new BillingError("billing_recovery_required");
 const paidThrough=account?.closeout_paid_through??entitlement?.billing_paid_through;
 const provider=account?.customer_id?await inspectVendorCloseout(stripe,config,{
  closeoutId:account.closeout_id??account.customer_attempt_id,customerId:account.customer_id,subscriptionId:account.current_subscription_id,
  requestedAt:account.closeout_requested_at?Math.floor(Date.parse(account.closeout_requested_at)/1000):c.createdAt,
  paidThrough:paidThrough?Math.floor(Date.parse(paidThrough)/1000):null,
  pendingCheckout:pending?{attemptId:pending.id,customerId:pending.customer_id,sessionId:pending.session_id!,plan:pending.requested_plan}:null,
 }):null;
 // Lease/queue clocks do not change reviewed financial identity. Everything used
 // for the closeout decision is explicitly selected; provider order is normalized.
 const snapshot={account:account?{customerId:account.customer_id,attemptId:account.customer_attempt_id,creationStarted:account.customer_creation_started_at,
  subscriptionId:account.current_subscription_id,status:account.subscription_status,entitlementId:account.entitlement_id,
  closeoutId:account.closeout_id,requestedAt:account.closeout_requested_at,paidThrough:account.closeout_paid_through}:null,
  pending,entitlement,holds,archived,provider:provider?{...provider,subscriptions:[...provider.subscriptions].sort((a,b)=>a.id.localeCompare(b.id))}:null};
 const decision=account?"close_billing":archived?"already_archived":"no_billing";
 const plan={version,createdAt:c.createdAt,expiresAt:c.createdAt+900,targetFingerprint:sha(`grookai-account-deletion-v1:${c.ownerId}`),
  ticketHash:c.ticketHash,environment:c.environment,implementationHash:c.implementationHash,scope:config.scope,stateHash:closeoutPlanHash(snapshot),decision,
  actions:account?["freeze_billing_and_publication","expire_known_checkout","cancel_known_subscriptions_without_proration","verify_financial_obligations","archive_only_if_resolved"]:[],
  reviewReasons:[...new Set([...(provider?.reviews??[]),...(holds.length?["financial_hold"]:[])])].sort(),
  subscriptionsToCancel:provider?.subscriptions.filter(s=>!["canceled","incomplete_expired"].includes(s.status)).length??0,checkoutsToExpire:provider?.checkout?.state==="open"?1:0};
 return {...plan,decision,planSha256:closeoutPlanHash(plan)} as CloseoutPlan;
}

export async function applyVendorCloseoutPlan(admin:SupabaseClient,stripe:Stripe,config:VendorBillingConfig,c:CloseoutPlanContext,reviewed:CloseoutPlan,expected:string,ack:string){
 const {planSha256,...payload}=reviewed;
 if(!/^[0-9a-f]{64}$/.test(expected)||expected!==ack||expected!==planSha256||closeoutPlanHash(payload)!==expected)throw new BillingError("billing_closeout_ack_required");
 const recheck=async()=>{const current=await buildVendorCloseoutPlan(admin,stripe,config,c);if(current.planSha256!==expected)throw new BillingError("billing_closeout_plan_changed");};
 await recheck();
 if(reviewed.decision!=="close_billing")return {state:reviewed.decision,closeoutId:null,reviewReasons:reviewed.reviewReasons};
 return createVendorBillingCloseoutService(admin,stripe,config).close(c.ownerId,c.ticketHash,recheck);
}
