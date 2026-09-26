import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getVendorBillingServer } from "./vendorStripeServer";
import { createVendorBillingRepository, BillingError } from "./vendorBillingRepository";
import { createVendorBillingService } from "./vendorBillingService";
import { createVendorBillingHandlers } from "./vendorBillingHandlers";
import { createVendorBillingPortal } from "./vendorStripePortal";
import type { VendorBillingStatus } from "./vendorBillingTypes";
export function getVendorBillingRuntime() {
  const server=getVendorBillingServer();if(!server)return null;
  const admin=createServerAdminClient(),repo=createVendorBillingRepository(admin);
  const checkoutEnabled=process.env.GROOKAI_VENDOR_CHECKOUT_ENABLED==="true";
  const portalConfiguration=process.env.STRIPE_VENDOR_PORTAL_CONFIGURATION_ID??"";
  const {config,stripe}=server;
  return {config,stripe,service:createVendorBillingService({repo,stripe,config,checkoutEnabled}),
    async status(ownerId:string):Promise<VendorBillingStatus> {
      const {data,error}=await admin.rpc("vendor_billing_owner_status_v1",{p_owner_id:ownerId,p_stripe_account_id:config.scope.accountId,p_livemode:config.scope.livemode});
      if(error||!data)throw new BillingError("billing_unavailable");
      return {...data,enabled:true,checkoutEnabled,environment:config.scope.livemode?"live":"test"};
    },
    async portal(ownerId:string) {
      const account=await repo.account(ownerId,config.scope);
      if(account?.closeout_id)throw new BillingError("billing_account_closing");
      if(!account?.customer_id)throw new BillingError("billing_unavailable");
      return createVendorBillingPortal(stripe,config,account.customer_id,portalConfiguration);
    },
  };
}
export const vendorBillingHandlers=createVendorBillingHandlers({
  async authenticate(){const client=await createServerComponentClient();const {data,error}=await client.auth.getUser();return error?null:data.user?.id??null;},
  origin:getSiteOrigin,runtime:getVendorBillingRuntime,
});
