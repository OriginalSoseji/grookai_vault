// backend/ebay/ebay_sellers_sync_worker.mjs
//
// Iterates all connected sellers (public.ebay_accounts) and ingests their sold
// orders into price_observations. Phase 1 keeps card_print_id null until the
// mapping layer is wired. Supports --dry-run for safe inspection.

// Load environment variables
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { EbayClient } from '../clients/ebay_client.mjs';
import { getSellerEbayAuth } from './ebay_tokens.mjs';

const SOURCE_ID = 'ebay_self';
const DEFAULT_SELLER_LIMIT = 10;
const DEFAULT_PAGE_LIMIT = 50;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    limit: DEFAULT_PAGE_LIMIT,
    sellerLimit: DEFAULT_SELLER_LIMIT,
    since: null,
    dryRun: false,
    write: false,
  };

  args.forEach((arg, idx) => {
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--write') {
      opts.write = true;
    } else if (arg.startsWith('--limit=')) {
      const value = Number(arg.split('=')[1]);
      if (!Number.isNaN(value) && value > 0) opts.limit = value;
    } else if (arg === '--limit') {
      const value = Number(args[idx + 1]);
      if (!Number.isNaN(value) && value > 0) opts.limit = value;
    } else if (arg.startsWith('--seller-limit=')) {
      const value = Number(arg.split('=')[1]);
      if (!Number.isNaN(value) && value > 0) opts.sellerLimit = value;
    } else if (arg === '--seller-limit') {
      const value = Number(args[idx + 1]);
      if (!Number.isNaN(value) && value > 0) opts.sellerLimit = value;
    } else if (arg.startsWith('--since=')) {
      opts.since = arg.split('=')[1] || null;
    } else if (arg === '--since' && args[idx + 1]) {
      opts.since = args[idx + 1];
    }
  });

  if (opts.dryRun && opts.write) {
    console.error(
      '[ebay-sellers-sync] Cannot use --dry-run and --write together; pick one.',
    );
    process.exit(1);
  }

  if (!opts.dryRun && !opts.write) {
    opts.dryRun = true;
    console.log(
      '[ebay-sellers-sync] No mode flag provided; defaulting to --dry-run',
    );
  }

  return opts;
}

function normalizeAmount(node) {
  if (!node) return { currency: null, value: null };
  const value = Number(node.value ?? node.amount ?? 0);
  const currency =
    node.currency ?? node.currencyCode ?? node.convertedFromCurrency ?? 'USD';
  return {
    currency,
    value: Number.isFinite(value) ? value : null,
  };
}

function buildObservation(order, lineItem, marketplaceId) {
  const lineAmount = normalizeAmount(
    lineItem?.lineItemCost ?? lineItem?.total ?? lineItem?.netPrice,
  );
  const shippingAmount = normalizeAmount(
    lineItem?.shippingCost ?? order?.pricingSummary?.deliveryCost,
  );
  const observed =
    lineItem?.transactionDate ??
    order?.orderFulfillmentStatus?.lastModifiedDate ??
    order?.creationDate ??
    new Date().toISOString();

  return {
    card_print_id: null, // TODO: map via external_mappings.
    source: SOURCE_ID,
    marketplace_id: marketplaceId,
    order_id: order?.orderId ?? null,
    order_line_item_id: lineItem?.lineItemId ?? null,
    listing_type:
      lineItem?.listingType ??
      order?.orderType ??
      lineItem?.fulfillmentStartInstructions?.[0]?.type ??
      null,
    currency: lineAmount.currency || 'USD',
    price_usd: lineAmount.value ?? 0,
    quantity: Number(lineItem?.quantity ?? 1),
    observed_at: observed,
    imported_at: new Date().toISOString(),
    set_code: '',
    number: '',
    variant: '',
    price_market: null,
    price_mid: null,
    price_low: null,
    price_high: null,
    shipping_amount: shippingAmount.value,
    seller_location:
      order?.fulfillmentStartInstructions?.[0]?.shipFrom?.countryCode ?? null,
    raw_payload: {
      seller_order_id: order?.orderId,
      order,
      line_item: lineItem,
    },
  };
}

async function fetchOrdersPage(client, { since, limit, continuationToken }) {
  const pageLimit = Math.min(limit || DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_LIMIT);
  const query = { limit: pageLimit };
  if (since) {
    query.filter = `creationdate:[${since}..]`;
  }
  if (continuationToken) {
    query.continuation_token = continuationToken;
  }
  return client.get('/sell/fulfillment/v1/order', { query });
}

async function syncSeller(supabase, seller, options) {
  console.log(
    `[ebay-sellers-sync] Syncing seller ${seller.id} (user=${seller.user_id})`,
  );
  const auth = await getSellerEbayAuth(supabase, {
    ebayAccountId: seller.id,
  });
  if (!auth.accessToken) {
    console.warn(
      `[ebay-sellers-sync] Seller ${seller.id} missing access token; skipping.`,
    );
    return { inserted: 0, processed: 0 };
  }

  const client = new EbayClient({
    accessToken: auth.accessToken,
    marketplaceId: seller.marketplace_id || auth.marketplaceId,
  });

  let continuationToken = null;
  let processed = 0;
  let inserted = 0;
  const since = options.since ?? seller.last_sync_at ?? null;

  while (true) {
    const response = await fetchOrdersPage(client, {
      since,
      limit: options.limit,
      continuationToken,
    });
    const orders = response?.orders ?? response?.orderSummaries ?? [];
    continuationToken =
      response?.continuation_token ?? response?.next ?? response?.href ?? null;

    if (!orders.length) break;

    for (const order of orders) {
      const lineItems =
        order?.lineItems ??
        order?.lineItemSummaries ??
        order?.orderLineItems ??
        [];
      for (const lineItem of lineItems) {
        processed += 1;
        const observation = buildObservation(
          order,
          lineItem,
          seller.marketplace_id || auth.marketplaceId,
        );
        if (options.dryRun) {
          console.log(
            '[DRY RUN]',
            `seller=${seller.id}`,
            `order_id=${observation.order_id}`,
            `line_item_id=${observation.order_line_item_id}`,
            `card_print_id=${observation.card_print_id}`,
            `price=${observation.price_usd}`,
            `currency=${observation.currency}`,
          );
          continue;
        }
        if (!observation.card_print_id) {
          console.warn(
            `[WARN] inserting price_observation with null card_print_id (seller=${seller.id} order_id=${observation.order_id} line_item_id=${observation.order_line_item_id}). Mapping not yet implemented.`,
          );
        }
        const { error } = await supabase
          .from('price_observations')
          .insert([{ ...observation }]);
        if (error) {
          console.error(
            '[ebay-sellers-sync] Insert failed',
            error.message ?? error,
          );
        } else {
          inserted += 1;
        }
      }
    }

    if (!continuationToken) break;
  }

  if (options.write) {
    const nowIso = new Date().toISOString();
    const { error: syncError } = await supabase
      .from('ebay_accounts')
      .update({ last_sync_at: nowIso, updated_at: nowIso })
      .eq('id', seller.id);
    if (syncError) {
      console.warn(
        '[ebay-sellers-sync] Failed to update last_sync_at',
        syncError.message ?? syncError,
      );
    }
  }

  return { inserted, processed };
}

async function main() {
  const options = parseArgs();
  if (options.dryRun) {
    console.log('[ebay-sellers-sync] starting in DRY RUN mode');
  } else if (options.write) {
    console.log('[ebay-sellers-sync] starting in WRITE mode');
  }
  const supabase = createBackendClient();

  const { data: sellers, error } = await supabase
    .from('ebay_accounts')
    .select('id, user_id, marketplace_id, last_sync_at')
    .eq('is_active', true)
    .order('last_sync_at', { ascending: true, nullsFirst: true })
    .limit(options.sellerLimit);

  if (error) {
    console.error('[ebay-sellers-sync] Failed to load sellers:', error);
    process.exit(1);
  }
  if (!sellers || sellers.length === 0) {
    console.log('[ebay-sellers-sync] No active sellers to process');
    return;
  }

  let totalProcessed = 0;
  let totalInserted = 0;

  for (const seller of sellers) {
    try {
      const stats = await syncSeller(supabase, seller, options);
      totalProcessed += stats.processed;
      totalInserted += stats.inserted;
    } catch (err) {
      console.error(
        `[ebay-sellers-sync] Seller ${seller.id} failed:`,
        err?.message ?? err,
      );
    }
  }

  if (options.dryRun) {
    console.log(
      `[ebay-sellers-sync] complete (DRY RUN): sellers=${sellers.length} line_items_seen=${totalProcessed}`,
    );
  } else {
    console.log(
      `[ebay-sellers-sync] complete (WRITE): sellers=${sellers.length} line_items_inserted=${totalInserted}`,
    );
  }
}

main().catch((err) => {
  console.error('[ebay-sellers-sync] fatal error:', err);
  process.exit(1);
});
