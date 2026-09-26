import {randomUUID} from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";
import type Stripe from "stripe";
import type {VendorBillingConfig} from "./vendorStripeGateway.ts";
import {BillingError,createVendorBillingRepository} from "./vendorBillingRepository.ts";
import type {BillingAccount} from "./vendorBillingRepository.ts";
import {closeVendorBillingAtProvider} from "./vendorStripeCloseout.ts";

// Private support operations, not an owner/browser endpoint. The caller must
// verify the deletion request and hash its private ticket before invoking this.
// Auth/Storage deletion remains a separate exact-plan-acknowledged operation.
export function createVendorBillingCloseoutService(admin:SupabaseClient,stripe:Stripe,config:VendorBillingConfig){
 const repo=createVendorBillingRepository(admin);
 async function rpc<T>(name:string,params:Record<string,unknown>):Promise<T>{const {data,error}=await admin.rpc(name,params);if(error)throw new BillingError(/^billing_[a-z_]+$/.test(error.message)?error.message:"billing_closeout_unavailable");return data as T;}
 return {async close(ownerId:string,ticketHash:string,beforeFreeze?:()=>Promise<void>){
  if(!/^[0-9a-f]{64}$/.test(ticketHash))throw new BillingError("billing_closeout_ticket_required");
  const stored=await repo.account(ownerId,config.scope);
  if(!stored){
   const fingerprint=await rpc<string>("vendor_billing_owner_fingerprint_v1",{p_owner_id:ownerId});
   const {data,error}=await admin.from("vendor_billing_closed_accounts").select("id").eq("owner_fingerprint",fingerprint).eq("stripe_account_id",config.scope.accountId).eq("livemode",config.scope.livemode).maybeSingle();
   if(error)throw new BillingError("billing_closeout_unavailable");
   return {state:data?"archived":"no_billing",closeoutId:data?.id??null,reviewReasons:[] as string[]};
  }
  const token=randomUUID(),claim=await repo.claim(ownerId,token);if(!claim)throw new BillingError("billing_busy");
  if(claim.lease_token!==token||!Number.isSafeInteger(claim.lease_fence))throw new BillingError("billing_invalid_lease");
  const lease={ownerId,token,fence:claim.lease_fence},params={p_owner_id:ownerId,p_claim_token:token,p_fence:claim.lease_fence};
  let closeoutId:string|null=null,archived=false;
  try{
   // Operations revalidates the exact reviewed plan under this lease, before
   // freezing publication or making any provider mutation.
   if(beforeFreeze)await beforeFreeze();
   const account=await rpc<BillingAccount>("vendor_billing_request_closeout_v1",{...params,p_ticket_hash:ticketHash});closeoutId=account.closeout_id;
   if(!closeoutId||!account.closeout_requested_at)throw new BillingError("billing_closeout_mismatch");
   const pending=await repo.pending(ownerId);let reviews:string[]=[];
   if(!account.customer_id){if(account.customer_creation_started_at||pending)throw new BillingError("billing_recovery_required");}
   else{
    if(pending&&!pending.session_id)throw new BillingError("billing_recovery_required");
    const result=await closeVendorBillingAtProvider(stripe,config,{
     closeoutId,customerId:account.customer_id,subscriptionId:account.current_subscription_id,
     requestedAt:Math.floor(Date.parse(account.closeout_requested_at)/1000),paidThrough:account.closeout_paid_through?Math.floor(Date.parse(account.closeout_paid_through)/1000):null,
     pendingCheckout:pending?{attemptId:pending.id,customerId:pending.customer_id,sessionId:pending.session_id!,plan:pending.requested_plan}:null,
    },()=>rpc("vendor_billing_assert_closeout_v1",{...params,p_closeout_id:closeoutId}));
    if(pending&&result.checkout)await repo.bindCheckout(lease,pending,result.checkout.sessionId,result.checkout.state==="complete"?"completed":"expired",result.checkout.subscriptionId);
    reviews=[...result.reviewReasons];
   }
   const {data:holds,error}=await admin.from("vendor_account_financial_holds").select("id").eq("owner_id",ownerId).limit(1);
   if(error)throw new BillingError("billing_closeout_unavailable");if(holds?.length)reviews.push("financial_hold");
   await rpc("vendor_billing_record_closeout_v1",{...params,p_closeout_id:closeoutId,p_reviews:reviews});
   if(reviews.length)return {state:"review_required",closeoutId,reviewReasons:reviews};
   await rpc("vendor_billing_archive_closeout_v1",{...params,p_closeout_id:closeoutId,p_ticket_hash:ticketHash});archived=true;
   return {state:"archived",closeoutId,reviewReasons:reviews};
  }catch(error){
   if(closeoutId){try{await rpc("vendor_billing_fail_closeout_v1",{...params,p_closeout_id:closeoutId,p_code:error instanceof BillingError&&error.code==="billing_recovery_required"?"recovery_required":"provider_unavailable"});}catch{/* Frozen request remains for a newer lease/operator retry. */}}
   throw error;
  }finally{if(!archived){try{await repo.release(lease);}catch(error){if(!(error instanceof BillingError&&error.code==="billing_lease_lost"))throw error;}}}
 }};
}
