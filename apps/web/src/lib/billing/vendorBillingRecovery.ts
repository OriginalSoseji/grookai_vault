import {randomUUID,createHash} from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";
import type Stripe from "stripe";
import type {VendorBillingConfig} from "./vendorStripeGateway.ts";
import {BillingError,createVendorBillingRepository} from "./vendorBillingRepository.ts";
import type {BillingAccount,CheckoutRow} from "./vendorBillingRepository.ts";
import {readVendorCustomerRecovery} from "./vendorStripeCloseout.ts";
import {readVendorCheckoutEvidence} from "./vendorStripeEnrollment.ts";
import type {VendorCheckoutEvidence} from "./vendorStripeEnrollment.ts";
import {closeoutPlanHash} from "./vendorBillingCloseoutPlan.ts";

const fingerprint=(value:string)=>createHash("sha256").update(value).digest("hex");
export type RecoveryContext={ownerId:string;ticketHash:string;environment:string;implementationHash:string;createdAt:number;kind:"customer"|"checkout";resourceId:string};
export type RecoveryPlan={version:string;createdAt:number;expiresAt:number;targetFingerprint:string;ticketHash:string;environment:string;implementationHash:string;
 scope:{accountId:string;livemode:boolean};kind:"customer"|"checkout";resourceFingerprint:string;stateHash:string;
 decision:"bind_customer"|"bind_checkout"|"already_bound";checkoutState:string|null;grantsAccess:false;changesProvider:false;planSha256:string};
function valid(c:RecoveryContext,config:VendorBillingConfig,now:number){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(c.ownerId)||
  !/^[0-9a-f]{64}$/.test(c.ticketHash)||!/^[0-9a-f]{64}$/.test(c.implementationHash)||!Number.isSafeInteger(c.createdAt)||
  !Number.isSafeInteger(now)||c.createdAt>now||now-c.createdAt>=900||
  !["customer","checkout"].includes(c.kind)||!(c.kind==="customer"?/^cus_[A-Za-z0-9]+$/:/^cs_(test_|live_)?[A-Za-z0-9]+$/).test(c.resourceId))throw new BillingError("billing_recovery_plan_invalid");
 if(c.environment!==(config.scope.livemode?"https://ycdxbpibncqcchqiihfz.supabase.co":"http://127.0.0.1:17621"))throw new BillingError("billing_recovery_environment_mismatch");
}
async function inspect(admin:SupabaseClient,stripe:Stripe,config:VendorBillingConfig,c:RecoveryContext,now:number){
 valid(c,config,now);
 const check=<T>(r:{data:T;error:unknown}):T=>{if(r.error)throw new BillingError("billing_recovery_unavailable");return r.data;};
 const account=check(await admin.from("vendor_billing_accounts").select("*").eq("owner_id",c.ownerId).maybeSingle()) as BillingAccount|null;
 if(!account)throw new BillingError("billing_recovery_account_missing");
 if(account.stripe_account_id!==config.scope.accountId||account.livemode!==config.scope.livemode)throw new BillingError("billing_recovery_scope_mismatch");
 const auth=await admin.auth.admin.getUserById(c.ownerId);
 if(auth.error||auth.data.user?.id!==c.ownerId)throw new BillingError("billing_recovery_owner_missing");
 const repo=createVendorBillingRepository(admin);
 let attempt=await repo.pending(c.ownerId),evidence:VendorCheckoutEvidence|null=null,decision:RecoveryPlan["decision"];
 if(c.kind==="customer"){
  if(account.customer_id&&account.customer_id!==c.resourceId)throw new BillingError("billing_customer_already_bound");
  if(!account.customer_id&&(!account.customer_creation_started_at||attempt))throw new BillingError("billing_recovery_attempt_unverified");
  await readVendorCustomerRecovery(stripe,config,{customerId:c.resourceId,attemptId:account.customer_attempt_id,
   attemptCreatedAt:Math.floor(Date.parse(account.customer_attempt_created_at)/1000)},now);
  decision=account.customer_id?"already_bound":"bind_customer";
 }else{
  if(!account.customer_id)throw new BillingError("billing_customer_required");
  if(!attempt)attempt=check(await admin.from("vendor_billing_checkout_attempts").select("*").eq("owner_id",c.ownerId).eq("session_id",c.resourceId).maybeSingle()) as CheckoutRow|null;
  if(!attempt||attempt.customer_id!==account.customer_id)throw new BillingError("billing_recovery_attempt_unverified");
  if(attempt.session_id&&attempt.session_id!==c.resourceId)throw new BillingError("billing_checkout_already_bound");
  if(!attempt.session_id&&!["creating","recovery"].includes(attempt.state))throw new BillingError("billing_recovery_attempt_unverified");
  evidence=await readVendorCheckoutEvidence(stripe,config,{attemptId:attempt.id,customerId:account.customer_id,sessionId:c.resourceId,plan:attempt.requested_plan},
   {createdAt:Math.floor(Date.parse(attempt.created_at)/1000),now});
  decision=attempt.session_id?"already_bound":"bind_checkout";
 }
 const snapshot={account:{customerId:account.customer_id,attemptId:account.customer_attempt_id,createdAt:account.customer_attempt_created_at,
  creationStarted:account.customer_creation_started_at,subscriptionId:account.current_subscription_id,closeoutId:account.closeout_id,closeoutRequestedAt:account.closeout_requested_at},
  attempt,evidence:evidence?{...evidence,checkoutUrl:null}:null};
 const payload={version:"vendor-billing-recovery-plan-v1",createdAt:c.createdAt,expiresAt:c.createdAt+900,
  targetFingerprint:fingerprint(`grookai-account-deletion-v1:${c.ownerId}`),ticketHash:c.ticketHash,environment:c.environment,implementationHash:c.implementationHash,
  scope:config.scope,kind:c.kind,resourceFingerprint:fingerprint(c.resourceId),stateHash:closeoutPlanHash(snapshot),decision,checkoutState:evidence?.state??null,
  grantsAccess:false as const,changesProvider:false as const};
 return {plan:{...payload,planSha256:closeoutPlanHash(payload)},account,attempt,evidence};
}
export async function buildVendorRecoveryPlan(admin:SupabaseClient,stripe:Stripe,config:VendorBillingConfig,c:RecoveryContext,now=Math.floor(Date.now()/1000)):Promise<RecoveryPlan>{
 return (await inspect(admin,stripe,config,c,now)).plan;
}
export async function applyVendorRecoveryPlan(admin:SupabaseClient,stripe:Stripe,config:VendorBillingConfig,c:RecoveryContext,reviewed:RecoveryPlan,expected:string,ack:string){
 const {planSha256,...payload}=reviewed;
 if(!/^[0-9a-f]{64}$/.test(expected)||expected!==ack||expected!==planSha256||closeoutPlanHash(payload)!==expected)throw new BillingError("billing_recovery_ack_required");
 const recheck=async()=>{const state=await inspect(admin,stripe,config,c,Math.floor(Date.now()/1000));if(state.plan.planSha256!==expected)throw new BillingError("billing_recovery_plan_changed");return state;};
 await recheck();
 if(reviewed.decision==="already_bound")return {state:"already_bound",kind:c.kind,grantsAccess:false,changesProvider:false};
 const repo=createVendorBillingRepository(admin),token=randomUUID(),claim=await repo.claim(c.ownerId,token);
 if(!claim)throw new BillingError("billing_busy");
 if(claim.lease_token!==token||!Number.isSafeInteger(claim.lease_fence))throw new BillingError("billing_invalid_lease");
 const lease={ownerId:c.ownerId,token,fence:claim.lease_fence};
 try{
  const state=await recheck();
  if(c.kind==="customer")await repo.bindCustomer(lease,c.resourceId);
  else{
   const e=state.evidence!;
   await repo.bindCheckout(lease,state.attempt!,e.sessionId,e.state==="complete"?"completed":e.state,e.subscriptionId);
  }
  // Independent readback proves only durable identity, never paid enrollment.
  if(c.kind==="customer"){
   if((await repo.account(c.ownerId,config.scope))?.customer_id!==c.resourceId)throw new BillingError("billing_recovery_readback_failed");
  }else{
   const {data,error}=await admin.from("vendor_billing_checkout_attempts").select("session_id,state,subscription_id").eq("id",state.attempt!.id).eq("owner_id",c.ownerId).single();
   if(error||data?.session_id!==c.resourceId||data?.state!==(state.evidence!.state==="complete"?"completed":state.evidence!.state)||data?.subscription_id!==state.evidence!.subscriptionId)throw new BillingError("billing_recovery_readback_failed");
  }
  return {state:"bound",kind:c.kind,grantsAccess:false,changesProvider:false};
 }finally{await repo.release(lease);}
}
