import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { createSellerStripeClient } from "../payments/vendorSellerStripeGateway";
import { createOrderRefundService } from "../payments/vendorOrderRefunds";
import { refundRuntimeConfig } from "./orderRefundsRuntimePolicy";
import { refundHandler } from "./orderRefunds";
export function refundControls() { try { const c = refundRuntimeConfig(process.env, getSiteOrigin()); return { refresh: !!c, create: c?.issuanceEnabled === true }; } catch { return { refresh: false, create: false }; } }
export const handleOrderRefund = refundHandler({ origin: getSiteOrigin,
  async authenticate() { const client = await createServerComponentClient(), { data, error } = await client.auth.getUser(); return error ? null : data.user?.id ?? null; },
  service() { const c = refundRuntimeConfig(process.env, getSiteOrigin()); return c ? createOrderRefundService(createServerAdminClient(), createSellerStripeClient(c), c, { enabled: c.issuanceEnabled }) : null; },
});
