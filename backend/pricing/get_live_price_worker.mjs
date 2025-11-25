// Get Live Price worker (Pricing Engine V3.2)
// Returns latest price curve snapshot or triggers a fresh computation.

import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { updatePricingForCardPrint } from './ebay_browse_prices_worker.mjs';

export async function computeAndStoreV3Price(cardPrintId, { supabase = null } = {}) {
  const client = supabase || createBackendClient();
  return updatePricingForCardPrint({
    supabase: client,
    cardPrintId,
    dryRun: false,
  });
}

export async function getLivePrice(cardPrintId, { force_refresh = false } = {}) {
  if (!cardPrintId) {
    throw new Error('[getLivePrice] card_print_id is required');
  }

  const supabase = createBackendClient();

  if (force_refresh) {
    return computeAndStoreV3Price(cardPrintId, { supabase });
  }

  const { data, error } = await supabase
    .from('card_print_latest_price_curve')
    .select('*')
    .eq('card_print_id', cardPrintId)
    .maybeSingle();

  if (error) {
    console.error('[getLivePrice] ERROR reading snapshot:', error);
  }

  if (data) {
    return data;
  }

  return computeAndStoreV3Price(cardPrintId, { supabase });
}
