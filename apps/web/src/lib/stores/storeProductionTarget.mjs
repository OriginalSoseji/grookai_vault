export const STORE_PRODUCTION_DATABASE = 'https://ycdxbpibncqcchqiihfz.supabase.co';
export const STORE_PRODUCTION_ORIGIN = 'https://grookaivault.com';
// This only selects a reviewed deployment. Database permissions, rollout and
// package access remain required at each operation; no client flag grants access.
export function productionStoreTarget(env = process.env) {
  return env.GROOKAI_STORE_PRODUCTION_V1 === 'true'
    && env.GROOKAI_COLLECTOR_RELEASE_V1 === 'true'
    && env.VERCEL_ENV === 'production'
    && env.VERCEL_PROJECT_ID === 'prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum'
    && env.SUPABASE_URL === STORE_PRODUCTION_DATABASE
    && env.NEXT_PUBLIC_SUPABASE_URL === STORE_PRODUCTION_DATABASE
    && env.NEXT_PUBLIC_SITE_URL === STORE_PRODUCTION_ORIGIN
    && (!env.SITE_URL || env.SITE_URL === STORE_PRODUCTION_ORIGIN)
    && ['NEXT_PUBLIC_VENDOR_PILOT','NEXT_PUBLIC_VENDOR_DEVICE_QA','NEXT_PUBLIC_COLLECTOR_STAGING',
      'NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB','NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING',
      'NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY','NEXT_PUBLIC_STOREFRONT_LOCAL_TEST',
      'NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST','NEXT_PUBLIC_RECEIPT_CLOUD_LOCAL_TEST'].every(key => !env[key] || env[key] === 'false');
}
export function storeBatchTarget(operation, env = process.env) {
  if (!['commit','cancel'].includes(operation)) return false;
  if (productionStoreTarget(env)) return true;
  const local = operation === 'commit' ? ['http://127.0.0.1:26421','http://127.0.0.1:27621','http://127.0.0.1:29021'] : ['http://127.0.0.1:27621','http://127.0.0.1:29021'];
  return [...local,'https://hrtbjchobencariqclab.supabase.co'].includes(env.SUPABASE_URL)
    && env.NEXT_PUBLIC_SUPABASE_URL === env.SUPABASE_URL;
}
