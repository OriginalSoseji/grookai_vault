import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import type { OrderHttpRuntime } from "./vendorOrderHttp.ts";
import { createCheckoutRepository, createVendorCheckoutService } from "./vendorCheckoutCreation.ts";
import { recordVendorCheckoutSignal, reconcileVendorOrder } from "./vendorOrderService.ts";
import { reconcileVendorOrderPage } from "./vendorOrderReconciliation.ts";
import { createVendorOrderQueue } from "./vendorOrderQueue.ts";

export function createOrderHttpRuntime(admin: SupabaseClient, stripe: Stripe, config: SellerStripeConfig, checkoutEnabled = false, queueEnabled = false): OrderHttpRuntime {
  return {
    checkout: (id, buyer) => createVendorCheckoutService({ repo: createCheckoutRepository(admin, stripe, config), stripe, config, enabled: checkoutEnabled }).checkout(id, buyer),
    signal: (payload, signature) => recordVendorCheckoutSignal(admin, stripe, config, payload, signature),
    reconcile: input => reconcileVendorOrderPage(admin, stripe, config, input),
    retry: id => reconcileVendorOrder(admin, stripe, config, id),
    discover: id => createVendorCheckoutService({ repo: createCheckoutRepository(admin, stripe, config), stripe, config }).discover(id),
    queueTick: () => createVendorOrderQueue(admin, stripe, config, queueEnabled).tick(),
    queueStatus: () => createVendorOrderQueue(admin, stripe, config).status(),
  };
}
