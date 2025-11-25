// backend/pricing/import_prices_worker.mjs
//
// Tunnel entrypoint for pricing/import logic.
// This is the "highway" access for importing/updating prices.
// It uses the service-role client and should NOT rely on Edge auth quirks.

// Load environment variables
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';

async function main() {
  const supabase = createBackendClient();

  console.log('[pricing-worker] import_prices_worker start');

  // TODO: Wire this to your real pricing/import logic.
  // Recommended patterns:
  // - supabase.rpc('run_import_prices', { ... })
  // - or select rows from an "import queue" table and process them
  //
  // For now, this is a scaffold that verifies the tunnel works.

  // Example "ping" against DB (adjust table/view to something that exists):
  const { data, error } = await supabase
    .from('card_prices') // TODO: change to a table/view you know exists
    .select('*')
    .limit(1);

  if (error) {
    console.error('[pricing-worker] ERROR reading card_prices:', error);
    process.exit(1);
  }

  console.log('[pricing-worker] Tunnel OK. Example row (or empty):');
  console.log(data);

  // Later you will replace this whole section with:
  // - RPC to a pricing procedure
  // - or full import pipeline logic
  console.log('[pricing-worker] import_prices_worker complete');
}

main().catch((err) => {
  console.error('[pricing-worker] Unhandled error:', err);
  process.exit(1);
});
