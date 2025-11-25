// backend/ebay/ebay_self_orders_worker.mjs
//
// Phase 1 skeleton for ingesting eBay "self" orders into price_observations.
// - Fetches the seller's own orders via Fulfillment API.
// - Builds normalized observations (card_print_id intentionally null for now).
// - Supports --dry-run mode to inspect without writing.
// - Future phases will add OAuth token exchange, card_print mapping, and batching.

// Load environment variables
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { EbayClient } from '../clients/ebay_client.mjs';

const SOURCE = 'ebay_self';
const MAX_PAGE_SIZE = 100;
const DEFAULT_LIMIT = 100;

function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    since: null,
    limit: null,
    dryRun: false,
  };

  argv.forEach((arg) => {
    if (arg === '--dry-run') {
      opts.dryRun = true;
      return;
    }
    if (arg.startsWith('--since=')) {
      opts.since = arg.split('=')[1] || null;
      return;
    }
    if (arg.startsWith('--limit=')) {
      const value = Number(arg.split('=')[1]);
      if (!Number.isNaN(value) && value > 0) {
        opts.limit = value;
      }
      return;
    }
  });

  return opts;
}

function requireAccessToken() {
  const token =
    process.env.EBAY_SELF_ACCESS_TOKEN ||
    process.env.EBAY_ACCESS_TOKEN ||
    null;
  if (!token) {
    throw new Error(
      '[ebay-self-worker] Missing EBAY_SELF_ACCESS_TOKEN (placeholder until OAuth wiring)',
    );
  }
  return token;
}

async function fetchOrdersPage(client, { since, limit, continuationToken }) {
  const pageLimit = Math.min(limit || MAX_PAGE_SIZE, MAX_PAGE_SIZE);
  const query = {
    limit: pageLimit,
  };

  if (since) {
    // eBay Fulfillment API filter example: creationdate:[2023-11-01T00:00:00.000Z..]
    query.filter = `creationdate:[${since}..]`;
  }
  if (continuationToken) {
    query.continuation_token = continuationToken;
  }

  return client.get('/sell/fulfillment/v1/order', { query });
}

function normalizeAmount(node) {
  if (!node) return { currency: null, value: null };
  const value = Number(node.value ?? node.amount ?? 0);
  const currency =
    node.currency ??
    node.currencyCode ??
    node.convertedFromCurrency ??
    'USD';
  return {
    currency,
    value: Number.isFinite(value) ? value : null,
  };
}

function buildObservation(order, lineItem) {
  const total = normalizeAmount(lineItem?.lineItemCost ?? lineItem?.total);
  const shipping = normalizeAmount(
    lineItem?.shippingCost ?? order?.pricingSummary?.deliveryCost,
  );
  const observed =
    lineItem?.transactionDate ??
    order?.orderFulfillmentStatus?.lastModifiedDate ??
    order?.creationDate ??
    new Date().toISOString();

  return {
    print_id: null, // TODO: map from eBay identifiers via external_mappings.
    condition: null,
    grade_agency: null,
    grade_value: null,
    grade_qualifier: null,
    source: SOURCE,
    listing_type:
      lineItem?.listingType ??
      order?.orderType ??
      lineItem?.fulfillmentStartInstructions?.[0]?.type ??
      'SOLD',
    currency: total.currency || 'USD',
    price_usd: total.value ?? 0,
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
    marketplace_id: order?.marketplaceId ?? process.env.EBAY_MARKETPLACE_ID ?? null,
    order_id: order?.orderId ?? null,
    order_line_item_id: lineItem?.lineItemId ?? null,
    shipping_amount: shipping.value,
    seller_location:
      order?.fulfillmentStartInstructions?.[0]?.shipFrom?.countryCode ?? null,
    raw_payload: {
      order_id: order?.orderId,
      order,
      line_item: lineItem,
    },
  };
}

async function insertObservation(supabase, observation) {
  const { error } = await supabase.from('price_observations').insert([
    {
      ...observation,
      raw_payload: observation.raw_payload ?? {},
    },
  ]);
  if (error) throw error;
}

function summarizeObservation(obs) {
  return {
    order_id: obs.order_id,
    order_line_item_id: obs.order_line_item_id,
    listing_type: obs.listing_type,
    currency: obs.currency,
    price_usd: obs.price_usd,
    quantity: obs.quantity,
    print_id: obs.print_id,
  };
}

async function main() {
  const options = parseArgs();
  console.log('[ebay-self-worker] start', options);

  const supabase = createBackendClient();
  const accessToken = requireAccessToken();
  const ebay = new EbayClient({ accessToken });

  let continuationToken = null;
  let processedOrders = 0;
  let processedLineItems = 0;
  let inserted = 0;

  let remaining = options.limit ?? DEFAULT_LIMIT;
  if (remaining <= 0) remaining = DEFAULT_LIMIT;

  while (true) {
    const response = await fetchOrdersPage(ebay, {
      since: options.since,
      limit: Math.min(remaining, MAX_PAGE_SIZE),
      continuationToken,
    });

    const orders = response?.orders ?? response?.orderSummaries ?? [];
    continuationToken =
      response?.next ??
      response?.href ??
      response?.continuation_token ??
      null;

    if (!orders.length) {
      console.log('[ebay-self-worker] No more orders returned');
      break;
    }

    for (const order of orders) {
      processedOrders += 1;
      const lineItems =
        order?.lineItems ??
        order?.lineItemSummaries ??
        order?.orderLineItems ??
        [];

      for (const lineItem of lineItems) {
        processedLineItems += 1;
        const observation = buildObservation(order, lineItem);
        if (options.dryRun) {
          console.log('[ebay-self-worker] DRY', summarizeObservation(observation));
          continue;
        }

        try {
          await insertObservation(supabase, observation);
          inserted += 1;
        } catch (err) {
          console.error(
            '[ebay-self-worker] Failed to insert observation',
            observation.order_line_item_id,
            err.message ?? err,
          );
        }
      }

      if (processedOrders >= remaining) break;
    }

    if (processedOrders >= remaining) {
      console.log(
        `[ebay-self-worker] Reached requested limit (${remaining} orders). Stopping.`,
      );
      break;
    }

    if (!continuationToken) {
      console.log('[ebay-self-worker] No continuation token. Completed iteration.');
      break;
    }
  }

  console.log(
    `[ebay-self-worker] complete orders=${processedOrders} line_items=${processedLineItems} inserted=${inserted}`,
  );
}

main().catch((err) => {
  console.error('[ebay-self-worker] Unhandled error:', err);
  process.exit(1);
});
