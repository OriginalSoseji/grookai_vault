import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { createSellerStripeClient } from "../payments/vendorSellerStripeGateway";
import { createOrderRefundService } from "../payments/vendorOrderRefunds";
import { refundRuntimeConfig } from "./orderRefundsRuntimePolicy";
import { resolutionRuntimeEnabled } from "./orderResolutionsRuntimePolicy";
import { resolutionHandler } from "./orderResolutions";
export function canOfferResolution() {
  try { return resolutionRuntimeEnabled(process.env, getSiteOrigin()); } catch { return false; }
}
export const handleOrderResolution = resolutionHandler({ origin: getSiteOrigin,
  async authenticate() { const c = await createServerComponentClient(), { data, error } = await c.auth.getUser(); return error ? null : data.user?.id ?? null; },
  enabled: () => resolutionRuntimeEnabled(process.env, getSiteOrigin()), admin: createServerAdminClient,
  refundService() { const config = refundRuntimeConfig(process.env, getSiteOrigin());
    return config ? createOrderRefundService(createServerAdminClient(), createSellerStripeClient(config), config) : null; },
});
