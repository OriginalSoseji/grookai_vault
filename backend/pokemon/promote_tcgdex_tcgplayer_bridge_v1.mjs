import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { createTcgdexClient } from '../clients/tcgdex.mjs';

const SOURCE = 'tcgdex';
const TARGET_SOURCE = 'tcgplayer';
const PAGE_SIZE = 200;
const PRODUCT_ID_PATHS = [
  { key: 'normal', path: 'pricing.tcgplayer.normal.productId' },
  { key: 'holofoil', path: 'pricing.tcgplayer.holofoil.productId' },
  { key: 'reverse-holofoil', path: 'pricing.tcgplayer.reverse-holofoil.productId' },
  { key: '1st-edition', path: 'pricing.tcgplayer.1st-edition.productId' },
  { key: '1st-edition-holofoil', path: 'pricing.tcgplayer.1st-edition-holofoil.productId' },
  { key: 'unlimited', path: 'pricing.tcgplayer.unlimited.productId' },
  { key: 'unlimited-holofoil', path: 'pricing.tcgplayer.unlimited-holofoil.productId' },
];

if (typeof fetch !== 'function') {
  console.error('❌ Global fetch unavailable; use Node 18+');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: true,
    apply: false,
    limit: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--dry-run') {
      options.dryRun = true;
      options.apply = false;
    } else if (token === '--apply') {
      options.apply = true;
      options.dryRun = false;
    } else if (token === '--limit' && args[index + 1]) {
      const value = Number(args[index + 1]);
      if (!Number.isNaN(value) && value > 0) {
        options.limit = value;
      }
      index += 1;
    } else if (token.startsWith('--limit=')) {
      const value = Number(token.split('=')[1]);
      if (!Number.isNaN(value) && value > 0) {
        options.limit = value;
      }
    }
  }

  return options;
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter((value) => typeof value === 'string' && value.trim())));
}

function collectProductIdDetails(cardPayload) {
  const tcgplayerPricing = cardPayload?.pricing?.tcgplayer;
  if (!tcgplayerPricing || typeof tcgplayerPricing !== 'object') {
    return {
      productIds: [],
      validatedVariantPaths: [],
    };
  }

  const productIds = [];
  const validatedVariantPaths = [];

  for (const entry of PRODUCT_ID_PATHS) {
    const value = tcgplayerPricing?.[entry.key]?.productId;
    if (value === undefined || value === null) {
      continue;
    }

    const normalized = String(value).trim();
    if (!normalized) {
      continue;
    }

    productIds.push(normalized);
    validatedVariantPaths.push(entry.path);
  }

  return {
    productIds,
    validatedVariantPaths,
  };
}

function evaluateProductIds(productIds) {
  if (productIds.length === 0) {
    return {
      result: 'FAIL',
      reason: 'No pricing.tcgplayer.*.productId fields were present in the full TCGdex card payload.',
      validatedProductId: null,
    };
  }

  const distinctProductIds = uniqueValues(productIds);
  if (distinctProductIds.length === 1) {
    return {
      result: 'PASS',
      reason: 'At least one TCGplayer productId was present and all populated variant buckets agreed.',
      validatedProductId: distinctProductIds[0],
    };
  }

  return {
    result: 'AMBIGUOUS',
    reason: `Multiple distinct TCGplayer productIds were present across variant buckets (${distinctProductIds.join(', ')}).`,
    validatedProductId: null,
  };
}

async function fetchTcgdexMappingPage(supabase, offset, pageSize) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,synced_at')
    .eq('source', SOURCE)
    .eq('active', true)
    .order('synced_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`[tcgdex-tcgplayer-bridge] tcgdex mapping query failed: ${error.message}`);
  }

  return data ?? [];
}

async function fetchCardNames(supabase, cardPrintIds) {
  if (!Array.isArray(cardPrintIds) || cardPrintIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('card_prints')
    .select('id,name')
    .in('id', cardPrintIds);

  if (error) {
    throw new Error(`[tcgdex-tcgplayer-bridge] card name query failed: ${error.message}`);
  }

  return new Map((data ?? []).map((row) => [row.id, row.name ?? '']));
}

async function loadScopedCards(supabase, limit) {
  const seenCardPrintIds = new Set();
  const scoped = [];
  let offset = 0;

  while (limit == null || scoped.length < limit) {
    const rows = await fetchTcgdexMappingPage(supabase, offset, PAGE_SIZE);
    if (rows.length === 0) {
      break;
    }

    offset += rows.length;

    const pageScoped = [];
    for (const row of rows) {
      const cardPrintId = row.card_print_id;
      const tcgdexExternalId = row.external_id;
      if (!cardPrintId || !tcgdexExternalId || seenCardPrintIds.has(cardPrintId)) {
        continue;
      }

      seenCardPrintIds.add(cardPrintId);
      pageScoped.push({ cardPrintId, tcgdexExternalId });

      if (limit != null && scoped.length + pageScoped.length >= limit) {
        break;
      }
    }

    const nameById = await fetchCardNames(
      supabase,
      pageScoped.map((row) => row.cardPrintId),
    );

    for (const row of pageScoped) {
      scoped.push({
        cardPrintId: row.cardPrintId,
        tcgdexExternalId: row.tcgdexExternalId,
        name: nameById.get(row.cardPrintId) ?? '',
      });

      if (limit != null && scoped.length >= limit) {
        break;
      }
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
  }

  return scoped;
}

async function loadActiveTcgplayerMappingsForCard(supabase, cardPrintId) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,active')
    .eq('source', TARGET_SOURCE)
    .eq('card_print_id', cardPrintId)
    .eq('active', true);

  if (error) {
    throw new Error(`[tcgdex-tcgplayer-bridge] existing card mapping query failed: ${error.message}`);
  }

  return data ?? [];
}

async function loadAnyTcgplayerMappingsByExternalId(supabase, externalId) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,active')
    .eq('source', TARGET_SOURCE)
    .eq('external_id', externalId);

  if (error) {
    throw new Error(`[tcgdex-tcgplayer-bridge] existing external id query failed: ${error.message}`);
  }

  return data ?? [];
}

async function upsertTcgplayerMapping(supabase, cardPrintId, externalId, meta) {
  const { error } = await supabase
    .from('external_mappings')
    .upsert(
      {
        card_print_id: cardPrintId,
        source: TARGET_SOURCE,
        external_id: externalId,
        active: true,
        synced_at: new Date().toISOString(),
        meta,
      },
      { onConflict: 'source,external_id' },
    );

  if (error) {
    throw new Error(`[tcgdex-tcgplayer-bridge] upsert failed: ${error.message}`);
  }
}

function logResult(row) {
  console.log('\nROW:');
  console.log(`card_print_id: ${row.cardPrintId}`);
  console.log(`name: ${row.name}`);
  console.log(`tcgdex external id: ${row.tcgdexExternalId}`);
  console.log(`collected productIds: ${row.productIds.length > 0 ? JSON.stringify(row.productIds) : '[]'}`);
  console.log(`status: ${row.status}`);
  console.log(`reason: ${row.reason}`);
}

function printVerificationQueries() {
  console.log('\nVERIFICATION_SQL:');
  console.log("select count(*) as active_tcgplayer_rows from public.external_mappings where source = 'tcgplayer' and active = true;");
  console.log("select count(distinct card_print_id) as covered_card_prints from public.external_mappings where source = 'tcgplayer' and active = true;");
  console.log("select count(*) as conflicting_external_ids from (select external_id from public.external_mappings where source = 'tcgplayer' and active = true group by external_id having count(distinct card_print_id) > 1) s;");
  console.log("select count(*) as card_prints_with_multiple_active_tcgplayer_mappings from (select card_print_id from public.external_mappings where source = 'tcgplayer' and active = true group by card_print_id having count(*) > 1) s;");
}

async function main() {
  const options = parseArgs();
  const supabase = createBackendClient();
  const tcgdexClient = createTcgdexClient();
  const summary = {
    inspected: 0,
    would_upsert: 0,
    upserted: 0,
    already_correct: 0,
    no_product_id: 0,
    ambiguous: 0,
    conflicting_existing: 0,
    errors: 0,
  };

  let scopedCards = [];
  try {
    scopedCards = await loadScopedCards(supabase, options.limit);
  } catch (error) {
    console.error('❌ Failed to load tcgdex-mapped cards:', error);
    process.exit(1);
  }

  for (const card of scopedCards) {
    summary.inspected += 1;

    try {
      const payload = await tcgdexClient.fetchTcgdexCardById(card.tcgdexExternalId);
      const { productIds, validatedVariantPaths } = collectProductIdDetails(payload);
      const evaluation = evaluateProductIds(productIds);

      if (evaluation.result === 'FAIL') {
        summary.no_product_id += 1;
        logResult({
          ...card,
          productIds,
          status: 'SKIP_NO_PRODUCT_ID',
          reason: evaluation.reason,
        });
        continue;
      }

      if (evaluation.result === 'AMBIGUOUS') {
        summary.ambiguous += 1;
        logResult({
          ...card,
          productIds,
          status: 'SKIP_AMBIGUOUS_PRODUCT_IDS',
          reason: evaluation.reason,
        });
        continue;
      }

      const validatedProductId = evaluation.validatedProductId;
      const activeMappingsForCard = await loadActiveTcgplayerMappingsForCard(supabase, card.cardPrintId);
      const activeExternalIdsForCard = uniqueValues(activeMappingsForCard.map((row) => row.external_id));
      if (activeExternalIdsForCard.some((externalId) => externalId !== validatedProductId)) {
        summary.conflicting_existing += 1;
        logResult({
          ...card,
          productIds,
          status: 'SKIP_CONFLICTING_EXISTING_TCGPLAYER_MAPPING',
          reason: `Active tcgplayer mapping already exists for this card_print_id with a different external_id (${activeExternalIdsForCard.join(', ')}).`,
        });
        continue;
      }

      if (activeExternalIdsForCard.length === 1 && activeExternalIdsForCard[0] === validatedProductId) {
        summary.already_correct += 1;
        logResult({
          ...card,
          productIds,
          status: 'SKIP_ALREADY_CORRECT',
          reason: 'Active tcgplayer mapping already matches the validated productId.',
        });
        continue;
      }

      const existingRowsByExternalId = await loadAnyTcgplayerMappingsByExternalId(supabase, validatedProductId);
      const conflictingExternalRows = existingRowsByExternalId.filter(
        (row) => row.card_print_id && row.card_print_id !== card.cardPrintId,
      );
      if (conflictingExternalRows.length > 0) {
        summary.conflicting_existing += 1;
        logResult({
          ...card,
          productIds,
          status: 'SKIP_CONFLICTING_EXISTING_TCGPLAYER_MAPPING',
          reason: `Validated tcgplayer external_id ${validatedProductId} is already attached to a different card_print_id (${conflictingExternalRows.map((row) => row.card_print_id).join(', ')}).`,
        });
        continue;
      }

      const meta = {
        derived_from: 'tcgdex_pricing_productId',
        tcgdex_external_id: card.tcgdexExternalId,
        validated_variant_paths: validatedVariantPaths,
        promoted_by: 'promote_tcgdex_tcgplayer_bridge_v1',
      };

      if (options.dryRun) {
        summary.would_upsert += 1;
        logResult({
          ...card,
          productIds,
          status: 'WOULD_UPSERT',
          reason: `Would upsert source='tcgplayer' external_id=${validatedProductId} using the validated derived bridge candidate.`,
        });
        continue;
      }

      await upsertTcgplayerMapping(supabase, card.cardPrintId, validatedProductId, meta);
      summary.upserted += 1;
      logResult({
        ...card,
        productIds,
        status: 'UPSERTED',
        reason: `Upserted source='tcgplayer' external_id=${validatedProductId} from validated TCGdex pricing productId agreement.`,
      });
    } catch (error) {
      summary.errors += 1;
      logResult({
        ...card,
        productIds: [],
        status: 'SKIP_ERROR',
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log('\nSUMMARY:');
  console.log(`inspected: ${summary.inspected}`);
  console.log(`would_upsert: ${summary.would_upsert}`);
  console.log(`upserted: ${summary.upserted}`);
  console.log(`already_correct: ${summary.already_correct}`);
  console.log(`no_product_id: ${summary.no_product_id}`);
  console.log(`ambiguous: ${summary.ambiguous}`);
  console.log(`conflicting_existing: ${summary.conflicting_existing}`);
  console.log(`errors: ${summary.errors}`);

  printVerificationQueries();
}

main().catch((error) => {
  console.error('❌ Unhandled tcgdex tcgplayer bridge promotion failure:', error);
  process.exit(1);
});
