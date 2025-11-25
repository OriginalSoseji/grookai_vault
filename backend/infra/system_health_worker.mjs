// backend/infra/system_health_worker.mjs
//
// Tunnel entrypoint for system-level health checks.
// This can run DB pings, queue depth checks, etc. via the service-role client.

// Load environment variables
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';

async function main() {
  const supabase = createBackendClient();

  console.log('[infra-worker] system_health_worker start');

  // Example: simple DB connectivity check via a cheap query.
  // Adjust to a small, safe table (e.g. a metadata or config table).
  const { data, error } = await supabase
    .from('card_prices') // TODO: swap to a small, stable table/view if desired
    .select('id')
    .limit(1);

  if (error) {
    console.error('[infra-worker] ERROR: DB connectivity check failed:', error);
    process.exit(1);
  }

  console.log('[infra-worker] DB connectivity OK. Example row:');
  console.log(data);

  // TODO: Later extend this worker to:
  // - Ping various subsystems
  // - Check stale prices
  // - Inspect job queues
  // - Emit a structured "system health" report

  console.log('[infra-worker] system_health_worker complete');
}

main().catch((err) => {
  console.error('[infra-worker] Unhandled error:', err);
  process.exit(1);
});
