export function resolutionRuntimeEnabled(env: NodeJS.ProcessEnv, origin: string): boolean {
  if (env.GROOKAI_VENDOR_ORDER_RESOLUTIONS_ENABLED !== "true") return false;
  if (env.NEXT_PUBLIC_STOREFRONT_LOCAL_TEST !== "true" || env.NEXT_PUBLIC_COLLECTOR_STAGING !== "true" ||
      env.GROOKAI_DISABLE_TELEMETRY !== "1" || env.SUPABASE_URL !== "http://127.0.0.1:15439" ||
      origin !== "http://127.0.0.1:24840" || env.VERCEL || env.VERCEL_ENV || env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING === "true")
    throw new Error("Order resolution configuration unavailable.");
  return true;
}
