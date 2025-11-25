// scripts/backend/import_prices_health.mjs
import { createBackendClient } from './supabase_backend_client.mjs';

async function main() {
  const supabase = createBackendClient();

  console.log('[health] calling import-prices-v3 health...');
  const { data, error } = await supabase.functions.invoke('import-prices-v3', {
    body: { mode: 'health', source: 'backend-health' },
  });

  if (error) {
    console.error('[health] ERROR:', error);
    process.exit(1);
  }

  console.log('[health] OK:', JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error('[health] unhandled:', err);
  process.exit(1);
});
