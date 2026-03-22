import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { createTcgdexClient } from '../clients/tcgdex.mjs';

const SOURCE = 'tcgdex';
const SAMPLE_LIMIT = 20;
const MAPPING_FETCH_LIMIT = 100;
const PRODUCT_ID_PATHS = [
  'normal',
  'holofoil',
  'reverse-holofoil',
  '1st-edition',
  '1st-edition-holofoil',
  'unlimited',
  'unlimited-holofoil',
];

if (typeof fetch !== 'function') {
  console.error('❌ Global fetch unavailable; use Node 18+');
  process.exit(1);
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter((value) => typeof value === 'string' && value.trim())));
}

function readProductIds(cardPayload) {
  const tcgplayerPricing = cardPayload?.pricing?.tcgplayer;
  if (!tcgplayerPricing || typeof tcgplayerPricing !== 'object') {
    return [];
  }

  const productIds = [];
  for (const key of PRODUCT_ID_PATHS) {
    const value = tcgplayerPricing?.[key]?.productId;
    if (value === undefined || value === null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized) {
      productIds.push(normalized);
    }
  }

  return productIds;
}

function evaluateProductIds(productIds) {
  if (productIds.length === 0) {
    return {
      result: 'FAIL',
      reason: 'No pricing.tcgplayer.*.productId fields were present in the full TCGdex card payload.',
    };
  }

  const distinctProductIds = uniqueValues(productIds);
  if (distinctProductIds.length === 1) {
    return {
      result: 'PASS',
      reason: 'At least one TCGplayer productId was present and all populated variant buckets agreed.',
    };
  }

  return {
    result: 'AMBIGUOUS',
    reason: `Multiple distinct TCGplayer productIds were present across variant buckets (${distinctProductIds.join(', ')}).`,
  };
}

async function loadSampleCards() {
  const supabase = createBackendClient();

  const { data: mappingRows, error: mappingError } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,synced_at')
    .eq('source', SOURCE)
    .eq('active', true)
    .order('synced_at', { ascending: false })
    .limit(MAPPING_FETCH_LIMIT);

  if (mappingError) {
    throw new Error(`[tcgdex-bridge-dryrun] mapping query failed: ${mappingError.message}`);
  }

  const uniqueMappings = [];
  const seenCardPrintIds = new Set();
  for (const row of mappingRows ?? []) {
    const cardPrintId = row.card_print_id;
    const externalId = row.external_id;
    if (!cardPrintId || !externalId || seenCardPrintIds.has(cardPrintId)) {
      continue;
    }

    seenCardPrintIds.add(cardPrintId);
    uniqueMappings.push({
      cardPrintId,
      tcgdexExternalId: externalId,
    });

    if (uniqueMappings.length >= SAMPLE_LIMIT) {
      break;
    }
  }

  if (uniqueMappings.length === 0) {
    return [];
  }

  const { data: cardRows, error: cardError } = await supabase
    .from('card_prints')
    .select('id,name')
    .in(
      'id',
      uniqueMappings.map((row) => row.cardPrintId),
    );

  if (cardError) {
    throw new Error(`[tcgdex-bridge-dryrun] card query failed: ${cardError.message}`);
  }

  const nameById = new Map((cardRows ?? []).map((row) => [row.id, row.name ?? '']));

  return uniqueMappings.map((row) => ({
    cardPrintId: row.cardPrintId,
    name: nameById.get(row.cardPrintId) ?? '',
    tcgdexExternalId: row.tcgdexExternalId,
  }));
}

function logResult(card, productIds, outcome) {
  console.log('\nCARD:');
  console.log(`card_print_id: ${card.cardPrintId}`);
  console.log(`name: ${card.name}`);
  console.log(`tcgdex external id: ${card.tcgdexExternalId}`);
  console.log('\nDETAIL:');
  console.log(`collected productIds: ${productIds.length > 0 ? JSON.stringify(productIds) : '[]'}`);
  console.log('\nRESULT:');
  console.log(outcome.result);
  console.log(`reason: ${outcome.reason}`);
}

async function main() {
  const tcgdexClient = createTcgdexClient();
  const summary = {
    total: 0,
    pass: 0,
    fail: 0,
    ambiguous: 0,
  };

  let sampleCards = [];
  try {
    sampleCards = await loadSampleCards();
  } catch (error) {
    console.error('❌ Failed to load sample cards:', error);
    process.exit(1);
  }

  if (sampleCards.length === 0) {
    console.log('SUMMARY:');
    console.log('total: 0');
    console.log('pass: 0');
    console.log('fail: 0');
    console.log('ambiguous: 0');
    return;
  }

  for (const card of sampleCards) {
    summary.total += 1;

    try {
      const payload = await tcgdexClient.fetchTcgdexCardById(card.tcgdexExternalId);
      const productIds = readProductIds(payload);
      const outcome = evaluateProductIds(productIds);

      if (outcome.result === 'PASS') {
        summary.pass += 1;
      } else if (outcome.result === 'AMBIGUOUS') {
        summary.ambiguous += 1;
      } else {
        summary.fail += 1;
      }

      logResult(card, productIds, outcome);
    } catch (error) {
      summary.fail += 1;
      logResult(card, [], {
        result: 'FAIL',
        reason: `TCGdex fetch failed for mapped external id ${card.tcgdexExternalId}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  console.log('\nSUMMARY:');
  console.log(`total: ${summary.total}`);
  console.log(`pass: ${summary.pass}`);
  console.log(`fail: ${summary.fail}`);
  console.log(`ambiguous: ${summary.ambiguous}`);
}

main().catch((error) => {
  console.error('❌ Unhandled tcgdex bridge dry-run failure:', error);
  process.exit(1);
});
