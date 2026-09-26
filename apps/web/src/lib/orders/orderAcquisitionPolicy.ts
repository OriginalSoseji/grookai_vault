import { ACQUISITION_POLICY } from "./orderAcquisitionTypes.ts";
export type AcquisitionConfig = { secret: string; platformAccountId: string };
export function readAcquisitionConfig(env: NodeJS.ProcessEnv, origin: string): AcquisitionConfig | null {
  if (env.GROOKAI_VENDOR_ORDER_ACQUISITION_ENABLED !== "true") return null;
  if (env.GROOKAI_VENDOR_ORDER_QUOTE_POLICY !== ACQUISITION_POLICY || env.STRIPE_PAYMENTS_MODE !== "test" ||
      env.NEXT_PUBLIC_STOREFRONT_LOCAL_TEST !== "true" || env.NEXT_PUBLIC_COLLECTOR_STAGING !== "true" ||
      env.GROOKAI_DISABLE_TELEMETRY !== "1" || env.SUPABASE_URL !== "http://127.0.0.1:15439" || !["http://127.0.0.1:20040", "http://127.0.0.1:21240"].includes(origin) ||
      env.VERCEL || env.VERCEL_ENV || env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING === "true" ||
      !/^[a-f0-9]{64}$/.test(env.GROOKAI_VENDOR_ORDER_QUOTE_SECRET ?? "") || !/^acct_[A-Za-z0-9]{1,250}$/.test(env.STRIPE_ACCOUNT_ID ?? ""))
    throw new Error("Purchase quote policy unavailable.");
  return { secret: env.GROOKAI_VENDOR_ORDER_QUOTE_SECRET!, platformAccountId: env.STRIPE_ACCOUNT_ID! };
}
