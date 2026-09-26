import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { createVendorSubscriptionCheckout, readVerifiedVendorSubscription } from "./vendorStripeGateway.ts";
import type { VendorBillingConfig } from "./vendorStripeGateway.ts";
import { createVendorBillingCustomer, readVendorCheckoutEvidence } from "./vendorStripeEnrollment.ts";
import { BillingError } from "./vendorBillingRepository.ts";
import type { VendorBillingRepository, BillingEventReference, Lease, CheckoutRow } from "./vendorBillingRepository.ts";
import type { VendorPlan } from "./vendorSubscriptionPolicy.ts";

export function createVendorBillingService(input: { repo: VendorBillingRepository; stripe: Stripe; config: VendorBillingConfig;
  checkoutEnabled: boolean; now?: () => number; token?: () => string }) {
  const {repo,stripe,config}=input,now=input.now??(()=>Math.floor(Date.now()/1000)),token=input.token??randomUUID;
  async function claim(ownerId: string) {
    const claimToken=token(),account=await repo.claim(ownerId,claimToken);
    if(!account)throw new BillingError("billing_busy");
    if(account.owner_id!==ownerId||account.lease_token!==claimToken||!Number.isSafeInteger(account.lease_fence))throw new BillingError("billing_invalid_lease");
    return {account,lease:{ownerId,token:claimToken,fence:account.lease_fence} satisfies Lease};
  }
  async function release(lease: Lease) {
    try {await repo.release(lease);} catch(e) {if(!(e instanceof BillingError&&e.code==="billing_lease_lost"))throw e;}
  }
  async function evidence(lease: Lease, attempt: CheckoutRow) {
    if(!attempt.session_id)throw new BillingError("billing_checkout_pending");
    const e=await readVendorCheckoutEvidence(stripe,config,{attemptId:attempt.id,customerId:attempt.customer_id,sessionId:attempt.session_id,plan:attempt.requested_plan});
    await repo.bindCheckout(lease,attempt,e.sessionId,e.state==="complete"?"completed":e.state,e.subscriptionId);
    return e;
  }
  return {
    async checkout(ownerId: string, plan: VendorPlan): Promise<{url: string|null; state: "open"|"pending"|"expired"}> {
      if(!input.checkoutEnabled)throw new BillingError("billing_checkout_disabled");
      if(!["store_app","store_web"].includes(plan))throw new BillingError("billing_plan_invalid");
      await repo.reserve(ownerId,config.scope);
      const {lease}=await claim(ownerId);
      try {
        // This check and durable identity binding MUST precede all Stripe calls.
        let account=await repo.prepare(lease,plan);
        if(!account.customer_id) {
          if(now()-Math.floor(Date.parse(account.customer_attempt_created_at)/1000)>=23*60*60)throw new BillingError("billing_recovery_required");
          await repo.noteCustomerCreation(lease);
          const id=await createVendorBillingCustomer(stripe,config,{attemptId:account.customer_attempt_id,createdAt:Math.floor(Date.parse(account.customer_attempt_created_at)/1000)},now());
          account=await repo.bindCustomer(lease,id);
        }
        const attempt=await repo.beginCheckout(lease,plan);
        if(attempt.state==="recovery")throw new BillingError("billing_recovery_required");
        if(!attempt.session_id) {
          if(now()-Math.floor(Date.parse(attempt.created_at)/1000)>=23*60*60)throw new BillingError("billing_recovery_required");
          const created=await createVendorSubscriptionCheckout(stripe,config,{customerId:account.customer_id!,plan:attempt.requested_plan,
            attemptId:attempt.id,createdAt:Math.floor(Date.parse(attempt.created_at)/1000)},now());
          // Persist identity before trusting URL/status. A crash before this write
          // retries the same durable idempotency key, never a new attempt.
          await repo.bindCheckout(lease,attempt,created.id,"open",null);
          attempt.session_id=created.id;
        }
        const e=await evidence(lease,attempt);
        return {url:e.checkoutUrl,state:e.state==="complete"?"pending":e.state};
      } finally {await release(lease);}
    },
    async reconcile(ownerId: string, event?: BillingEventReference): Promise<void> {
      const stored=await repo.account(ownerId,config.scope);if(!stored) return;
      if(stored.closeout_id)throw new BillingError("billing_account_closing");
      const {account,lease}=await claim(ownerId);let released=false;
      try {
        const attempt=await repo.pending(ownerId);
        let subscription=account.current_subscription_id,attemptId: string|undefined;
        if(!subscription && attempt) {
          const e=await evidence(lease,attempt);
          if(e.state==="open")throw new BillingError("billing_checkout_pending");
          if(e.state==="complete") {subscription=e.subscriptionId;attemptId=attempt.id;}
        }
        if(event && event.subscriptionId!==subscription) {
          await repo.ignore(lease,event.id);released=true;return;
        }
        if(!subscription)return;
        const projection=await readVerifiedVendorSubscription(stripe,config,account.customer_id!,subscription,now());
        await repo.commit(lease,projection,attemptId,event?.id);released=true;
      } catch(error) {
        const code=error instanceof BillingError&&error.code==="billing_checkout_pending"?"checkout_pending":
            error instanceof BillingError&&["billing_entitlement_binding_required","billing_entitlement_inactive"].includes(error.code)?"binding_required":"reconciliation_failed";
        try {if(event)await repo.fail(lease,event.id,code);else await repo.defer(lease,code);released=true;}
        catch { /* A successor/expired lease retains the durable pending work. */ }
        throw error;
      } finally {if(!released)await release(lease);}
    },
    async acceptEvent(event: BillingEventReference): Promise<void> {
      const account=await repo.customer(event.customerId,config.scope);
      if(!account)return; // Other existing Stripe customers are not vendor owners.
      const receipt=await repo.enqueue(config.scope,event);
      if(account.closeout_id)return; // Retained until verified closeout; never regrant.
      if(receipt.state!=="pending")return;
      await this.reconcile(account.owner_id,event);
    },
  };
}
