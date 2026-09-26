import type Stripe from "stripe";
import type { VendorBillingConfig } from "./vendorStripeGateway.ts";
import { verifyVendorBillingEvent } from "./vendorStripeGateway.ts";
import { billingEventTarget } from "./vendorSubscriptionPolicy.ts";
import { BillingError } from "./vendorBillingRepository.ts";
import { BILLING_NO_STORE, billingErrorResponse, checkBillingOrigin, parseBillingAction, readBillingBody } from "./vendorBillingHttp.ts";
import type { createVendorBillingService } from "./vendorBillingService.ts";
import type { VendorBillingStatus } from "./vendorBillingTypes.ts";
export type VendorBillingRuntime = {
  stripe: Stripe; config: VendorBillingConfig; service: ReturnType<typeof createVendorBillingService>;
  status(ownerId: string): Promise<VendorBillingStatus>; portal(ownerId: string): Promise<string>;
};
export function createVendorBillingHandlers(deps: {
  authenticate(): Promise<string|null>; origin(): string; runtime(): VendorBillingRuntime|null;
}) {
  const json=(value:unknown,status=200)=>Response.json(value,{status,headers:BILLING_NO_STORE});
  return {
    async ownerGET() {
      try {const owner=await deps.authenticate();if(!owner)return json({error:"Sign in required."},401);
        const runtime=deps.runtime();return json(runtime?await runtime.status(owner):{enabled:false,checkoutEnabled:false,environment:null});
      } catch(error){return billingErrorResponse(error);}
    },
    async ownerPOST(request: Request) {
      try {
        if(!checkBillingOrigin(request,deps.origin()))return json({error:"Invalid request origin."},403);
        const owner=await deps.authenticate();if(!owner)return json({error:"Sign in required."},401);
        const action=parseBillingAction(await readBillingBody(request,1024));
        const runtime=deps.runtime();if(!runtime)throw new BillingError("billing_checkout_disabled");
        if(action.action==="checkout")return json(await runtime.service.checkout(owner,action.plan));
        if(action.action==="portal")return json({url:await runtime.portal(owner)});
        await runtime.service.reconcile(owner);return json({status:await runtime.status(owner)});
      } catch(error){return billingErrorResponse(error);}
    },
    async webhook(request: Request) {
      let runtime:VendorBillingRuntime|null;
      try {runtime=deps.runtime();}catch{return json({error:"Billing unavailable."},503);}
      if(!runtime)return json({error:"Billing unavailable."},503);
      let event:Stripe.Event,target:ReturnType<typeof billingEventTarget>;
      try {
        const payload=await readBillingBody(request,256*1024);
        event=verifyVendorBillingEvent(runtime.stripe,runtime.config,payload,request.headers.get("stripe-signature")??"");
        if(!Number.isSafeInteger(event.created)||event.created<0||event.created>Math.floor(Date.now()/1000)+300)throw new Error("Invalid event time");
        target=billingEventTarget(event,runtime.config.scope);
      }catch(error){if(error instanceof BillingError)return billingErrorResponse(error);return json({error:"Invalid webhook."},400);}
      if(!target)return json({received:true});
      try {
        await runtime.service.acceptEvent({id:event.id,type:event.type,created:event.created,...target});
        return json({received:true});
      }catch{return json({error:"Event retained or unavailable; retry required."},503);}
    },
  };
}
