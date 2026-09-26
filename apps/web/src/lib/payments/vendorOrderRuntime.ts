import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { createSellerStripeClient } from "./vendorSellerStripeGateway";
import { createOrderHttpRuntime } from "./vendorOrderRuntimeService";
import { createVendorOrderHandlers, type OrderLane, type OrderHttpRuntime } from "./vendorOrderHttp";
import { readOrderRuntimeConfig } from "./vendorOrderRuntimePolicy";

export function getVendorOrderRuntime(lane: OrderLane): OrderHttpRuntime | null {
  const config = readOrderRuntimeConfig(process.env, lane, getSiteOrigin());
  if (!config) return null;
  const admin = createServerAdminClient(), stripe = createSellerStripeClient(config);
  return createOrderHttpRuntime(admin, stripe, config, lane === "checkout", lane === "queue");
}
export const vendorOrderHandlers = createVendorOrderHandlers({
  async authenticate() {
    const client = await createServerComponentClient(), { data, error } = await client.auth.getUser();
    return error ? null : data.user?.id ?? null;
  },
  origin: getSiteOrigin, runtime: getVendorOrderRuntime,
  reconcileToken: () => process.env.GROOKAI_VENDOR_ORDER_RECONCILE_TOKEN ?? null,
});
