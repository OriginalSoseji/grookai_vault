// scripts/import_prices_health.mjs
import { createClient } from '@supabase/supabase-js';

const url  = process.env.SUPABASE_URL;
const key  = process.env.SUPABASE_SECRET_KEY; // SECRET key, NOT publishable
const slug = 'import-prices-v3';

if (!url || !key) {
  console.error('[health] Missing SUPABASE_URL or SUPABASE_SECRET_KEY in env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`[health] Calling ${slug} via supabase-js...`);

  const { data, error } = await supabase.functions.invoke(slug, {
    body: { mode: 'health', source: 'cli-health' },
  });

  if (error) {
    console.error('[health] ERROR from import-prices:', error);
    process.exit(1);
  }

  console.log('[health] OK:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error('[health] Unhandled error:', err);
  process.exit(1);
});
