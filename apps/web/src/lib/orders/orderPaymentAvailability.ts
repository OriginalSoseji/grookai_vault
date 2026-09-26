import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { readOrderRuntimeConfig } from "../payments/vendorOrderRuntimePolicy";
import type { OrderView } from "./orderHistory";
export async function orderPaymentAvailable(order: OrderView, authenticatedBuyerId: string) {
  try {
    if (order.paid || order.needsReview || order.stockState !== "payment_pending" || !readOrderRuntimeConfig(process.env, "checkout", getSiteOrigin())) return false;
    const { data, error } = await createServerAdminClient().from("vendor_orders").select("id").eq("id", order.id).eq("buyer_id", authenticatedBuyerId).maybeSingle();
    return !error && data?.id === order.id;
  } catch { return false; }
}
