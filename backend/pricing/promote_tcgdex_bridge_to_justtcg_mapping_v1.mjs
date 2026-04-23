/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * This script mutates canonical data outside runtime executor.
 *
 * RULES:
 * - not part of runtime authority
 * - must not be imported into application code
 * - requires explicit maintenance mode
 * - defaults to DRY RUN
 */
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { createTcgdexClient } from '../clients/tcgdex.mjs';
import {
  chunkArray,
  fetchJustTcgCardsByTcgplayerIdsBatch,
  getJustTcgApiConfig,
  resolveJustTcgBatchByTcgplayerIds,
  resolveJustTcgPostBatchSize,
  uniqueValues,
} from './justtcg_client.mjs';
import {
  assertCanonMaintenanceWriteAllowed,
  getCanonMaintenanceDryRun,
} from '../maintenance/canon_maintenance_boundary_v1.mjs';

const SOURCE = 'tcgdex';
const TARGET_SOURCE = 'justtcg';
const BLOCKING_SOURCE = 'tcgplayer';
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

if (!process.env.ENABLE_CANON_MAINTENANCE_MODE) {
  throw new Error(
    'RUNTIME_ENFORCEMENT: canon maintenance is disabled. Set ENABLE_CANON_MAINTENANCE_MODE=true.',
  );
}

if (process.env.CANON_MAINTENANCE_MODE !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be 'EXPLICIT'.",
  );
}

if (process.env.CANON_MAINTENANCE_ENTRYPOINT !== 'backend/maintenance/run_canon_maintenance_v1.mjs') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: canon maintenance scripts must be launched from backend/maintenance/run_canon_maintenance_v1.mjs.',
  );
}

const DRY_RUN = getCanonMaintenanceDryRun();

if (DRY_RUN) {
  console.log('CANON MAINTENANCE: DRY RUN');
}

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
    batchSize: null,
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
    } else if (token === '--batch-size' && args[index + 1]) {
      const value = Number(args[index + 1]);
      if (!Number.isNaN(value) && value > 0) {
        options.batchSize = value;
      }
      index += 1;
    } else if (token.startsWith('--batch-size=')) {
      const value = Number(token.split('=')[1]);
      if (!Number.isNaN(value) && value > 0) {
        options.batchSize = value;
      }
    }
  }

  return options;
}

function getBatchSizeSource(options) {
  if (options.batchSize != null) {
    return 'cli';
  }

  if ((process.env.JUSTTCG_BATCH_SIZE ?? '').trim()) {
    return 'env';
  }

  return 'default';
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
    .order('card_print_id', { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`[tcgdex-justtcg-bridge] tcgdex mapping query failed: ${error.message}`);
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
    throw new Error(`[tcgdex-justtcg-bridge] card name query failed: ${error.message}`);
  }

  return new Map((data ?? []).map((row) => [row.id, row.name ?? '']));
}

async function fetchActiveSourceMappedCardPrintIds(supabase, source, cardPrintIds) {
  if (!Array.isArray(cardPrintIds) || cardPrintIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id')
    .eq('source', source)
    .eq('active', true)
    .in('card_print_id', cardPrintIds);

  if (error) {
    throw new Error(`[tcgdex-justtcg-bridge] active ${source} candidate query failed: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.card_print_id).filter(Boolean));
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
    }

    const cardPrintIds = pageScoped.map((row) => row.cardPrintId);
    const [nameById, activeJustTcgMappedIds, activeTcgplayerMappedIds] = await Promise.all([
      fetchCardNames(supabase, cardPrintIds),
      fetchActiveSourceMappedCardPrintIds(supabase, TARGET_SOURCE, cardPrintIds),
      fetchActiveSourceMappedCardPrintIds(supabase, BLOCKING_SOURCE, cardPrintIds),
    ]);

    for (const row of pageScoped) {
      if (activeJustTcgMappedIds.has(row.cardPrintId)) {
        continue;
      }

      if (activeTcgplayerMappedIds.has(row.cardPrintId)) {
        continue;
      }

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

async function loadActiveJustTcgMappingsForCard(supabase, cardPrintId) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,active')
    .eq('source', TARGET_SOURCE)
    .eq('card_print_id', cardPrintId)
    .eq('active', true);

  if (error) {
    throw new Error(`[tcgdex-justtcg-bridge] active justtcg mapping query failed: ${error.message}`);
  }

  return data ?? [];
}

async function loadAnyJustTcgMappingsByExternalId(supabase, externalId) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,active')
    .eq('source', TARGET_SOURCE)
    .eq('external_id', externalId);

  if (error) {
    throw new Error(`[tcgdex-justtcg-bridge] justtcg external id query failed: ${error.message}`);
  }

  return data ?? [];
}

async function upsertJustTcgMapping(supabase, cardPrintId, externalId, meta) {
  if (DRY_RUN) {
    console.log(
      `[DRY RUN] would execute: promote_tcgdex_bridge_to_justtcg_mapping_v1 :: UPSERT :: public.external_mappings :: card_print_id=${cardPrintId} external_id=${externalId}`,
    );
    return;
  }

  assertCanonMaintenanceWriteAllowed();
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
    throw new Error(`[tcgdex-justtcg-bridge] upsert failed: ${error.message}`);
  }
}

function logResult(row) {
  console.log('\nROW:');
  console.log(`card_print_id: ${row.cardPrintId}`);
  console.log(`name: ${row.name}`);
  console.log(`tcgdex external id: ${row.tcgdexExternalId ?? 'null'}`);
  console.log(`derived tcgplayer external id: ${row.tcgplayerExternalId ?? 'null'}`);
  console.log(`returned justtcg card id: ${row.justTcgCardId ?? 'null'}`);
  console.log(`status: ${row.status}`);
  console.log(`reason: ${row.reason}`);
}

function printVerificationQueries() {
  console.log('\nVERIFICATION_SQL:');
  console.log("select count(*) as active_justtcg_rows from public.external_mappings where source = 'justtcg' and active = true;");
  console.log("select count(distinct card_print_id) as covered_card_prints from public.external_mappings where source = 'justtcg' and active = true;");
  console.log("select count(*) as conflicting_external_ids from (select external_id from public.external_mappings where source = 'justtcg' and active = true group by external_id having count(distinct card_print_id) > 1) s;");
  console.log("select count(*) as card_prints_with_multiple_active_justtcg_mappings from (select card_print_id from public.external_mappings where source = 'justtcg' and active = true group by card_print_id having count(*) > 1) s;");
}

async function main() {
  const options = parseArgs();
  if (DRY_RUN) {
    options.apply = false;
  }
  const supabase = createBackendClient();
  const tcgdexClient = createTcgdexClient();
  const { apiKey } = getJustTcgApiConfig();
  const batchSize = resolveJustTcgPostBatchSize(options.batchSize);
  const batchSizeSource = getBatchSizeSource(options);
  const summary = {
    inspected: 0,
    batch_ready: 0,
    no_bridge: 0,
    no_match: 0,
    ambiguous: 0,
    conflicting_existing: 0,
    already_correct: 0,
    upstream_path_tcgplayer: 0,
    upstream_path_cardid: 0,
    upstream_path_exact_identity: 0,
    would_upsert: 0,
    upserted: 0,
    errors: 0,
  };

  if (!apiKey) {
    console.error('❌ Missing JUSTTCG_API_KEY in env');
    process.exit(1);
  }

  console.log('RUN_CONFIG:');
  console.log(`mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log(`batch_size: ${batchSize}`);
  console.log(`batch_size_source: ${batchSizeSource}`);
  console.log('selection_mode: tcgdex-only-without-tcgplayer-without-justtcg');
  console.log('selection_order: synced_at desc, card_print_id asc');
  console.log(`limit: ${options.limit ?? 'none'}`);

  let scopedCards = [];
  try {
    scopedCards = await loadScopedCards(supabase, options.limit);
  } catch (error) {
    console.error('❌ Failed to load tcgdex-only justtcg candidates:', error);
    process.exit(1);
  }

  const batchReadyRows = [];

  for (const card of scopedCards) {
    summary.inspected += 1;

    try {
      const payload = await tcgdexClient.fetchTcgdexCardById(card.tcgdexExternalId);
      const { productIds, validatedVariantPaths } = collectProductIdDetails(payload);
      const evaluation = evaluateProductIds(productIds);

      if (evaluation.result === 'FAIL') {
        summary.no_bridge += 1;
        logResult({
          ...card,
          tcgplayerExternalId: null,
          justTcgCardId: null,
          status: 'SKIP_NO_TCGPLAYER_BRIDGE',
          reason: evaluation.reason,
        });
        continue;
      }

      if (evaluation.result === 'AMBIGUOUS') {
        summary.ambiguous += 1;
        logResult({
          ...card,
          tcgplayerExternalId: null,
          justTcgCardId: null,
          status: 'SKIP_AMBIGUOUS_TCGPLAYER_BRIDGE',
          reason: evaluation.reason,
        });
        continue;
      }

      batchReadyRows.push({
        ...card,
        tcgplayerExternalId: evaluation.validatedProductId,
        validatedVariantPaths,
      });
      summary.batch_ready += 1;
    } catch (error) {
      summary.errors += 1;
      logResult({
        ...card,
        tcgplayerExternalId: null,
        justTcgCardId: null,
        status: 'SKIP_ERROR',
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const [batchIndex, batch] of chunkArray(batchReadyRows, batchSize).entries()) {
    const requestIds = batch.map((row) => row.tcgplayerExternalId);
    const response = await fetchJustTcgCardsByTcgplayerIdsBatch(requestIds);

    if (!response.ok) {
      console.log(
        `BATCH_DONE index=${batchIndex + 1} success=0 missing=0 duplicate=0 malformed=0 unexpected=0 transport_errors=${batch.length}`,
      );

      for (const row of batch) {
        summary.errors += 1;
        logResult({
          ...row,
          justTcgCardId: null,
          status: 'SKIP_ERROR',
          reason: `JustTCG batch lookup failed: ${response.error}`,
        });
      }
      continue;
    }

    const resolved = resolveJustTcgBatchByTcgplayerIds(requestIds, response.payload);
    console.log(
      `BATCH_DONE index=${batchIndex + 1} success=${resolved.summary.success} missing=${resolved.summary.missing} duplicate=${resolved.summary.duplicate} malformed=${resolved.summary.malformed} unexpected=${resolved.summary.unexpected} transport_errors=0`,
    );

    for (const row of batch) {
      try {
        const lookup = resolved.results[row.tcgplayerExternalId] ?? {
          status: 'missing',
          card: null,
          reason: 'No JustTCG card was returned for this tcgplayerId.',
        };

        if (lookup.status === 'missing') {
          summary.no_match += 1;
          logResult({
            ...row,
            justTcgCardId: null,
            status: 'SKIP_NO_JUSTTCG_MATCH',
            reason: lookup.reason,
          });
          continue;
        }

        if (lookup.status === 'duplicate') {
          summary.ambiguous += 1;
          logResult({
            ...row,
            justTcgCardId: null,
            status: 'SKIP_AMBIGUOUS_JUSTTCG_MATCH',
            reason: lookup.reason,
          });
          continue;
        }

        if (lookup.status !== 'success') {
          summary.errors += 1;
          logResult({
            ...row,
            justTcgCardId: null,
            status: 'SKIP_ERROR',
            reason: lookup.reason,
          });
          continue;
        }

        summary.upstream_path_tcgplayer += 1;

        const justTcgCardId = typeof lookup.card?.id === 'string' ? lookup.card.id.trim() : '';
        if (!justTcgCardId) {
          summary.errors += 1;
          logResult({
            ...row,
            justTcgCardId: null,
            status: 'SKIP_ERROR',
            reason: 'JustTCG returned a matched row without a valid card id.',
          });
          continue;
        }

        const activeJustTcgMappings = await loadActiveJustTcgMappingsForCard(supabase, row.cardPrintId);
        const activeJustTcgExternalIds = uniqueValues(activeJustTcgMappings.map((mapping) => mapping.external_id));
        if (activeJustTcgExternalIds.some((externalId) => externalId !== justTcgCardId)) {
          summary.conflicting_existing += 1;
          logResult({
            ...row,
            justTcgCardId,
            status: 'SKIP_CONFLICTING_EXISTING_JUSTTCG_MAPPING',
            reason: `Active justtcg mapping already exists for this card_print_id with a different external_id (${activeJustTcgExternalIds.join(', ')}).`,
          });
          continue;
        }

        if (activeJustTcgExternalIds.length === 1 && activeJustTcgExternalIds[0] === justTcgCardId) {
          summary.already_correct += 1;
          logResult({
            ...row,
            justTcgCardId,
            status: 'SKIP_ALREADY_CORRECT',
            reason: 'Active justtcg mapping already matches the validated JustTCG card id.',
          });
          continue;
        }

        const existingRowsByJustTcgId = await loadAnyJustTcgMappingsByExternalId(supabase, justTcgCardId);
        const conflictingExternalRows = existingRowsByJustTcgId.filter(
          (mapping) => mapping.card_print_id && mapping.card_print_id !== row.cardPrintId,
        );
        if (conflictingExternalRows.length > 0) {
          summary.conflicting_existing += 1;
          logResult({
            ...row,
            justTcgCardId,
            status: 'SKIP_CONFLICTING_EXISTING_JUSTTCG_MAPPING',
            reason: `Validated justtcg external_id ${justTcgCardId} is already attached to a different card_print_id (${conflictingExternalRows.map((mapping) => mapping.card_print_id).join(', ')}).`,
          });
          continue;
        }

        const meta = {
          resolved_via: 'tcgdex_pricing_productId_then_tcgplayerId',
          tcgdex_external_id: row.tcgdexExternalId,
          tcgplayer_external_id: row.tcgplayerExternalId,
          validated_variant_paths: row.validatedVariantPaths,
          promoted_by: 'promote_tcgdex_bridge_to_justtcg_mapping_v1',
        };
        if (typeof lookup.card?.set_name === 'string' && lookup.card.set_name.trim()) {
          meta.justtcg_set_name = lookup.card.set_name.trim();
        }
        if (typeof lookup.card?.number === 'string' && lookup.card.number.trim()) {
          meta.justtcg_number = lookup.card.number.trim();
        }

        if (options.dryRun) {
          summary.would_upsert += 1;
          logResult({
            ...row,
            justTcgCardId,
            status: 'WOULD_UPSERT',
            reason: `Would upsert source='justtcg' external_id=${justTcgCardId} resolved via deterministic tcgdex productId bridge -> JustTCG tcgplayerId lookup.`,
          });
          continue;
        }

        await upsertJustTcgMapping(supabase, row.cardPrintId, justTcgCardId, meta);
        summary.upserted += 1;
        logResult({
          ...row,
          justTcgCardId,
          status: 'UPSERTED',
          reason: `Upserted source='justtcg' external_id=${justTcgCardId} resolved via deterministic tcgdex productId bridge -> JustTCG tcgplayerId lookup.`,
        });
      } catch (error) {
        summary.errors += 1;
        logResult({
          ...row,
          justTcgCardId: null,
          status: 'SKIP_ERROR',
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  console.log('\nSUMMARY:');
  console.log(`inspected: ${summary.inspected}`);
  console.log(`batch_ready: ${summary.batch_ready}`);
  console.log(`no_bridge: ${summary.no_bridge}`);
  console.log(`no_match: ${summary.no_match}`);
  console.log(`ambiguous: ${summary.ambiguous}`);
  console.log(`conflicting_existing: ${summary.conflicting_existing}`);
  console.log(`already_correct: ${summary.already_correct}`);
  console.log(`upstream_path_tcgplayer: ${summary.upstream_path_tcgplayer}`);
  console.log(`upstream_path_cardid: ${summary.upstream_path_cardid}`);
  console.log(`upstream_path_exact_identity: ${summary.upstream_path_exact_identity}`);
  console.log(`would_upsert: ${summary.would_upsert}`);
  console.log(`upserted: ${summary.upserted}`);
  console.log(`errors: ${summary.errors}`);

  printVerificationQueries();
}

main().catch((error) => {
  console.error('❌ Unhandled tcgdex bridge to justtcg mapping promotion failure:', error);
  process.exit(1);
});
