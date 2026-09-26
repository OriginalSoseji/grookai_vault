import { readSellerStripeConfig } from "../payments/vendorSellerStripeGateway.ts";
export function refundRuntimeConfig(env: NodeJS.ProcessEnv, origin: string) {
  if (env.GROOKAI_VENDOR_ORDER_REFUNDS_ENABLED !== "true") return null;
  const config = readSellerStripeConfig({ ...env, GROOKAI_VENDOR_PAYMENTS_ENABLED: "true", STRIPE_CONNECT_WEBHOOK_SECRET: env.STRIPE_ORDER_WEBHOOK_SECRET });
  if (!config || config.scope.livemode || env.NEXT_PUBLIC_STOREFRONT_LOCAL_TEST !== "true" || env.NEXT_PUBLIC_COLLECTOR_STAGING !== "true" ||
    env.GROOKAI_DISABLE_TELEMETRY !== "1" || env.SUPABASE_URL !== "http://127.0.0.1:15439" ||
    !["http://127.0.0.1:22840", "http://127.0.0.1:24040", "http://127.0.0.1:24840"].includes(origin) ||
    env.VERCEL || env.VERCEL_ENV || env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING === "true") throw new Error("Refund configuration unavailable");
  return { ...config, issuanceEnabled: env.GROOKAI_VENDOR_ORDER_REFUND_ISSUANCE_ENABLED === "true" };
}
