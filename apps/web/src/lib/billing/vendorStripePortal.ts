import type Stripe from "stripe";
import { assertVendorStripeAccount } from "./vendorStripeGateway.ts";
import type { VendorBillingConfig } from "./vendorStripeGateway.ts";
export async function createVendorBillingPortal(stripe: Stripe, config: VendorBillingConfig, customerId: string, configurationId: string) {
  if(!/^cus_[A-Za-z0-9]+$/.test(customerId)||!/^bpc_[A-Za-z0-9]+$/.test(configurationId))throw new Error("Invalid vendor portal binding");
  await assertVendorStripeAccount(stripe,config);
  // Stripe omits the allowed product list unless it is explicitly expanded.
  // Validate the actual configured prices before issuing a customer portal URL.
  const configuration=await stripe.billingPortal.configurations.retrieve(configurationId,{expand:["features.subscription_update.products"]});
  const features=configuration.features,update=features.subscription_update;
  const prices=update.products?.flatMap(p=>p.prices).sort()??[];
  if(!configuration.active||configuration.livemode!==config.scope.livemode||!features.invoice_history.enabled||!features.payment_method_update.enabled||
    !features.subscription_cancel.enabled||features.subscription_cancel.mode!=="at_period_end"||!update.enabled||
    update.default_allowed_updates.length!==1||update.default_allowed_updates[0]!=="price"||update.proration_behavior!=="always_invoice"||
    update.products?.some(p=>p.adjustable_quantity.enabled)||prices.join(',')!==Object.values(config.catalog).sort().join(','))
    throw new Error("Vendor portal configuration requires review");
  const session=await stripe.billingPortal.sessions.create({customer:customerId,configuration:configurationId,return_url:`${config.siteOrigin}/account/store/billing`});
  const url=new URL(session.url);
  if(session.customer!==customerId||session.livemode!==config.scope.livemode||url.origin!=="https://billing.stripe.com"||url.username||url.password)
    throw new Error("Vendor portal session mismatch");
  return url.toString();
}
