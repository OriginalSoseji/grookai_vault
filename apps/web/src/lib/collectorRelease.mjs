export function assertCollectorReleaseEnvironment(env) {
  if (env.GROOKAI_COLLECTOR_RELEASE_V1 !== 'true') {
    throw new Error('Collector production release requires explicit activation.');
  }
  for (const key of ['NEXT_PUBLIC_COLLECTOR_STAGING', 'NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB',
    'NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING', 'NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY', 'NEXT_PUBLIC_COLLECTR_IMPORT_LOCAL_TEST', 'NEXT_PUBLIC_RECEIPT_CLOUD_LOCAL_TEST', 'NEXT_PUBLIC_SALES_CART_LOCAL_TEST','NEXT_PUBLIC_SALES_DESK_PRO_LOCAL_TEST','NEXT_PUBLIC_SALES_TRADE_LOCAL_TEST']) {
    if (env[key] && env[key] !== 'false') throw new Error('Production cannot include collector test modes.');
  }
  if (env.VERCEL_ENV !== 'production' || env.VERCEL_PROJECT_ID !== 'prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum') {
    throw new Error('Collector release requires the existing production project and target.');
  }
  const url = new URL(env.SUPABASE_URL);
  if (url.href !== 'https://ycdxbpibncqcchqiihfz.supabase.co/') {
    throw new Error('Collector release requires the canonical production database.');
  }
  for (const key of ['SITE_URL', 'NEXT_PUBLIC_SITE_URL']) {
    if (env[key] && new URL(env[key]).href !== 'https://grookaivault.com/') {
      throw new Error('Collector release cannot emit staging share links.');
    }
  }
}
