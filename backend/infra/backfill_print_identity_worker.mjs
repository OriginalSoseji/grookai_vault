// backend/infra/backfill_print_identity_worker.mjs
//
// Backfills print_identity_key on existing card_prints rows where it is NULL.
// Format: <set_code>-<number_plain>-<variant|base>

// Load environment variables
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';

const BATCH_SIZE = 500;

async function main() {
  console.log('[identity-backfill] start');

  const supabase = createBackendClient();
  let totalProcessed = 0;
  let totalUpdated = 0;
  let hasMore = true;
  let page = 0;

  while (hasMore) {
    console.log(`[identity-backfill] Fetching batch ${page}`);

    const { data: rows, error } = await supabase
      .from('card_prints')
      .select('id, set_code, number_plain, variant_key, print_identity_key')
      .is('print_identity_key', null)
      .order('id', { ascending: true })
      .range(page * BATCH_SIZE, page * BATCH_SIZE + BATCH_SIZE - 1);

    if (error) {
      console.error('[identity-backfill] ERROR fetching rows:', error);
      process.exit(1);
    }

    if (!rows || rows.length === 0) {
      hasMore = false;
      break;
    }

    totalProcessed += rows.length;

    // Build updates
    const updates = rows.map((row) => {
      const variant = row.variant_key && row.variant_key.trim() !== '' ? row.variant_key : 'base';
      const identity = `${row.set_code}-${row.number_plain}-${variant}`;
      return {
        id: row.id,
        print_identity_key: identity,
      };
    });

    // Bulk update
    const { error: updateError } = await supabase
      .from('card_prints')
      .upsert(updates, { onConflict: 'id' });

    if (updateError) {
      console.error('[identity-backfill] ERROR updating rows:', updateError);
      process.exit(1);
    }

    totalUpdated += updates.length;

    console.log(`[identity-backfill] Updated ${updates.length} rows this batch`);
    page++;
  }

  console.log('[identity-backfill] complete');
  console.log(`[identity-backfill] total processed: ${totalProcessed}`);
  console.log(`[identity-backfill] total updated:   ${totalUpdated}`);
}

main().catch((err) => {
  console.error('[identity-backfill] Unhandled error:', err);
  process.exit(1);
});
