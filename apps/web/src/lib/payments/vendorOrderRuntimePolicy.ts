import { readSellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import type { OrderLane } from "./vendorOrderHttp.ts";

export function readOrderRuntimeConfig(env: NodeJS.ProcessEnv, lane: OrderLane, origin: string) {
  const flag = { checkout: "GROOKAI_VENDOR_ORDER_CHECKOUT_ENABLED", events: "GROOKAI_VENDOR_ORDER_EVENTS_ENABLED", reconcile: "GROOKAI_VENDOR_ORDER_RECONCILIATION_ENABLED", queue: "GROOKAI_VENDOR_ORDER_QUEUE_ENABLED" }[lane];
  if (!flag || env[flag] !== "true") return null;
  // Order obligations have their own enablement. Store subscriptions, publication,
  // onboarding and seller acquisition switches never disable retained settlement.
  // A separate endpoint has a separate signing secret; never reuse the seller one.
  const config = readSellerStripeConfig({ ...env, GROOKAI_VENDOR_PAYMENTS_ENABLED: "true", STRIPE_CONNECT_WEBHOOK_SECRET: env.STRIPE_ORDER_WEBHOOK_SECRET });
  if (!config) throw new Error("Order configuration unavailable");
  if (lane === "checkout") {
    // No production quote/tax/fee policy has been approved or implemented. Existing
    // immutable fixture orders can exercise transport only in the isolated lab.
    // This cannot be enabled for live mode or a hosted deployment by an allowlist.
    if (config.scope.livemode || env.GROOKAI_VENDOR_ORDER_QUOTE_POLICY !== "local-synthetic-pickup-v1" ||
        env.NEXT_PUBLIC_STOREFRONT_LOCAL_TEST !== "true" || env.NEXT_PUBLIC_COLLECTOR_STAGING !== "true" ||
        env.GROOKAI_DISABLE_TELEMETRY !== "1" || env.SUPABASE_URL !== "http://127.0.0.1:15439" ||
        origin !== "http://127.0.0.1:20040" || env.VERCEL || env.VERCEL_ENV || env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING === "true")
      throw new Error("Order quote policy unavailable");
  }
  return config;
}
