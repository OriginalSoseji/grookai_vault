// Write mode only.
// Reads active JustTCG mappings from external_mappings, fetches JustTCG cards in
// deterministic batches, parses variants[], upserts justtcg_variants, and inserts
// append-only justtcg_variant_price_snapshots.
//
// Usage:
//   node backend/pricing/justtcg_domain_ingest_worker_v1.mjs --apply
//   node backend/pricing/justtcg_domain_ingest_worker_v1.mjs --apply --limit=500 --batch-size=180

import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  chunkArray,
  getJustTcgApiConfig,
  requestJustTcgJson,
  resolveJustTcgPostBatchSize,
  uniqueValues,
  unwrapJustTcgData,
} from './justtcg_client.mjs';

const SOURCE = 'justtcg';
const FETCH_PAGE_SIZE = 1000;
const POKEMON_GAME_ID = 'pokemon';
const MAX_BATCH_SIZE = 200;
const WRITE_CHUNK_SIZE = 500;

if (typeof fetch !== 'function') {
  console.error('❌ Global fetch unavailable; use Node 18+');
  process.exit(1);
}

function parseBatchSizeValue(rawValue, sourceLabel) {
  const parsed = Number.parseInt(String(rawValue ?? '').trim(), 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_BATCH_SIZE) {
    throw new Error(
      `[justtcg-domain-ingest] ${sourceLabel} must be an integer between 1 and ${MAX_BATCH_SIZE}.`,
    );
  }

  return parsed;
}

function resolveWorkerBatchSize(overrideValue = null) {
  if (overrideValue != null) {
    return parseBatchSizeValue(overrideValue, '--batch-size');
  }

  const envValue = String(process.env.JUSTTCG_BATCH_SIZE ?? '').trim();
  if (envValue) {
    return parseBatchSizeValue(envValue, 'JUSTTCG_BATCH_SIZE');
  }

  return resolveJustTcgPostBatchSize(null);
}

function parseArgs(argv) {
  const options = {
    apply: false,
    limit: null,
    batchSize: null,
    setCode: null,
    gvId: null,
    cardPrintId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      options.apply = true;
    } else if (token === '--limit' && argv[index + 1]) {
      const value = Number.parseInt(argv[index + 1], 10);
      if (Number.isFinite(value) && value > 0) {
        options.limit = value;
      }
      index += 1;
    } else if (token.startsWith('--limit=')) {
      const value = Number.parseInt(token.split('=')[1], 10);
      if (Number.isFinite(value) && value > 0) {
        options.limit = value;
      }
    } else if (token === '--batch-size' && argv[index + 1]) {
      options.batchSize = parseBatchSizeValue(argv[index + 1], '--batch-size');
      index += 1;
    } else if (token.startsWith('--batch-size=')) {
      options.batchSize = parseBatchSizeValue(token.split('=')[1], '--batch-size');
    } else if (token === '--set-code' && argv[index + 1]) {
      options.setCode = String(argv[index + 1]).trim().toLowerCase() || null;
      index += 1;
    } else if (token.startsWith('--set-code=')) {
      options.setCode = String(token.split('=').slice(1).join('=')).trim().toLowerCase() || null;
    } else if (token === '--gv-id' && argv[index + 1]) {
      options.gvId = String(argv[index + 1]).trim().toUpperCase() || null;
      index += 1;
    } else if (token.startsWith('--gv-id=')) {
      options.gvId = String(token.split('=').slice(1).join('=')).trim().toUpperCase() || null;
    } else if (token === '--card-print-id' && argv[index + 1]) {
      options.cardPrintId = String(argv[index + 1]).trim().toLowerCase() || null;
      index += 1;
    } else if (token.startsWith('--card-print-id=')) {
      options.cardPrintId = String(token.split('=').slice(1).join('=')).trim().toLowerCase() || null;
    } else if (token === '--batch-size') {
      throw new Error('[justtcg-domain-ingest] --batch-size requires a value.');
    }
  }

  return options;
}

function normalizeExternalId(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumericOrNull(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortStable(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

async function fetchMappedJustTcgPage(supabase, from, to) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,synced_at')
    .eq('source', SOURCE)
    .eq('active', true)
    .order('card_print_id', { ascending: true })
    .order('external_id', { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`[justtcg-domain-ingest] mapping query failed: ${error.message}`);
  }

  return data ?? [];
}

function hasScopedCardFilter(options) {
  return Boolean(options.setCode || options.gvId || options.cardPrintId);
}

async function loadScopedCardPrintIds(supabase, options) {
  const ids = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('card_prints')
      .select('id')
      .order('id', { ascending: true })
      .range(from, from + FETCH_PAGE_SIZE - 1);

    if (options.setCode) {
      query = query.eq('set_code', options.setCode);
    }

    if (options.gvId) {
      query = query.eq('gv_id', options.gvId);
    }

    if (options.cardPrintId) {
      query = query.eq('id', options.cardPrintId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`[justtcg-domain-ingest] scoped card_print query failed: ${error.message}`);
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      break;
    }

    ids.push(...rows.map((row) => row.id));

    if (rows.length < FETCH_PAGE_SIZE) {
      break;
    }

    from += FETCH_PAGE_SIZE;
  }

  return ids;
}

async function fetchMappedJustTcgByCardPrintIds(supabase, cardPrintIds) {
  if (cardPrintIds.length === 0) {
    return [];
  }

  const mapped = [];
  const seenExternalIds = new Set();

  for (const chunk of chunkArray(cardPrintIds, 200)) {
    const { data, error } = await supabase
      .from('external_mappings')
      .select('card_print_id,external_id,synced_at')
      .eq('source', SOURCE)
      .eq('active', true)
      .in('card_print_id', chunk)
      .order('card_print_id', { ascending: true })
      .order('external_id', { ascending: true });

    if (error) {
      throw new Error(`[justtcg-domain-ingest] scoped mapping query failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      const externalId = normalizeExternalId(row.external_id);
      if (!row.card_print_id || !externalId) {
        throw new Error('[justtcg-domain-ingest] encountered malformed scoped active justtcg mapping row.');
      }

      if (seenExternalIds.has(externalId)) {
        throw new Error(`[justtcg-domain-ingest] duplicate active justtcg external_id detected: ${externalId}`);
      }

      seenExternalIds.add(externalId);
      mapped.push({
        cardPrintId: row.card_print_id,
        justTcgExternalId: externalId,
      });
    }
  }

  return mapped.sort((left, right) => {
    const cardPrintDelta = left.cardPrintId.localeCompare(right.cardPrintId);
    if (cardPrintDelta !== 0) {
      return cardPrintDelta;
    }

    return left.justTcgExternalId.localeCompare(right.justTcgExternalId);
  });
}

async function loadMappedCards(supabase, options) {
  if (hasScopedCardFilter(options)) {
    const scopedCardPrintIds = await loadScopedCardPrintIds(supabase, options);
    const mapped = await fetchMappedJustTcgByCardPrintIds(supabase, scopedCardPrintIds);
    return options.limit != null ? mapped.slice(0, options.limit) : mapped;
  }

  const mapped = [];
  const seenExternalIds = new Set();
  let from = 0;
  const limit = options.limit ?? null;

  while (limit == null || mapped.length < limit) {
    const to = from + FETCH_PAGE_SIZE - 1;
    const rows = await fetchMappedJustTcgPage(supabase, from, to);
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const externalId = normalizeExternalId(row.external_id);
      if (!row.card_print_id || !externalId) {
        throw new Error('[justtcg-domain-ingest] encountered malformed active justtcg mapping row.');
      }

      if (seenExternalIds.has(externalId)) {
        throw new Error(`[justtcg-domain-ingest] duplicate active justtcg external_id detected: ${externalId}`);
      }

      seenExternalIds.add(externalId);
      mapped.push({
        cardPrintId: row.card_print_id,
        justTcgExternalId: externalId,
      });

      if (limit != null && mapped.length >= limit) {
        break;
      }
    }

    if (rows.length < FETCH_PAGE_SIZE) {
      break;
    }

    from += FETCH_PAGE_SIZE;
  }

  return mapped;
}

async function fetchJustTcgCardsByCardIdsBatch(cardIds, { game = POKEMON_GAME_ID } = {}) {
  const requestedIds = uniqueValues(cardIds.map(normalizeExternalId));
  if (requestedIds.length === 0) {
    return {
      ok: true,
      status: 0,
      error: null,
      payload: { data: [] },
      requestedIds,
    };
  }

  const body = requestedIds.map((cardId) => ({
    cardId,
    game,
  }));

  const response = await requestJustTcgJson('POST', '/cards', { body });
  return {
    ...response,
    requestedIds,
  };
}

function resolveJustTcgBatchByCardIds(requestedIds, payload) {
  const normalizedRequestedIds = uniqueValues(requestedIds.map(normalizeExternalId));
  const requestedIdSet = new Set(normalizedRequestedIds);
  const cards = unwrapJustTcgData(payload);
  const results = Object.fromEntries(
    normalizedRequestedIds.map((externalId) => [
      externalId,
      {
        status: 'missing',
        card: null,
        reason: 'No JustTCG card was returned for this external_id.',
      },
    ]),
  );

  const returnedById = new Map();
  const duplicateReturnedIds = [];
  const unexpectedReturnedIds = [];
  const malformedRows = [];

  for (const card of cards) {
    const returnedId = normalizeExternalId(card?.id);
    if (!returnedId) {
      malformedRows.push(card);
      continue;
    }

    if (!requestedIdSet.has(returnedId)) {
      unexpectedReturnedIds.push(returnedId);
      continue;
    }

    if (returnedById.has(returnedId)) {
      duplicateReturnedIds.push(returnedId);
      continue;
    }

    returnedById.set(returnedId, card);
  }

  const duplicateIds = uniqueValues(duplicateReturnedIds);
  const unexpectedIds = uniqueValues(unexpectedReturnedIds);

  for (const requestedId of normalizedRequestedIds) {
    if (duplicateIds.includes(requestedId)) {
      results[requestedId] = {
        status: 'duplicate',
        card: null,
        reason: `JustTCG returned duplicate rows for cardId ${requestedId}.`,
      };
      continue;
    }

    const card = returnedById.get(requestedId) ?? null;
    if (card) {
      results[requestedId] = {
        status: 'success',
        card,
        reason: 'Matched JustTCG card row by cardId.',
      };
    }
  }

  const summary = {
    success: 0,
    missing: 0,
    duplicate: 0,
    malformed: malformedRows.length,
    unexpected: unexpectedIds.length,
  };

  for (const requestedId of normalizedRequestedIds) {
    const status = results[requestedId]?.status ?? 'missing';
    if (status === 'success') {
      summary.success += 1;
    } else if (status === 'duplicate') {
      summary.duplicate += 1;
    } else {
      summary.missing += 1;
    }
  }

  return {
    cards,
    duplicateReturnedIds: duplicateIds,
    unexpectedReturnedIds: unexpectedIds,
    malformedRowCount: malformedRows.length,
    results,
    summary,
  };
}

function buildVariantArtifact(row, variant) {
  const variantId = normalizeTextOrNull(variant?.id);
  const condition = normalizeTextOrNull(variant?.condition);
  const printing = normalizeTextOrNull(variant?.printing);
  const language = normalizeTextOrNull(variant?.language);

  if (!variantId || !condition || !printing) {
    throw new Error(
      `[justtcg-domain-ingest] malformed variant payload for source card ${row.justTcgExternalId}.`,
    );
  }

  return {
    variant_id: variantId,
    card_print_id: row.cardPrintId,
    condition,
    printing,
    language,
  };
}

function buildSnapshotArtifact(row, variant, fetchedAt) {
  const variantId = normalizeTextOrNull(variant?.id);
  if (!variantId) {
    throw new Error(
      `[justtcg-domain-ingest] snapshot build failed because variant id was missing for source card ${row.justTcgExternalId}.`,
    );
  }

  return {
    variant_id: variantId,
    card_print_id: row.cardPrintId,
    price: normalizeNumericOrNull(variant?.price),
    avg_price: normalizeNumericOrNull(variant?.avgPrice),
    price_change_24h: normalizeNumericOrNull(variant?.price_change_24h ?? variant?.priceChange24h),
    price_change_7d: normalizeNumericOrNull(variant?.price_change_7d ?? variant?.priceChange7d),
    fetched_at: fetchedAt,
    raw_payload: variant,
  };
}

async function upsertVariantRows(supabase, variantArtifacts) {
  if (variantArtifacts.length === 0) {
    return 0;
  }

  for (const rows of chunkArray(variantArtifacts, WRITE_CHUNK_SIZE)) {
    const { error } = await supabase
      .from('justtcg_variants')
      .upsert(rows, { onConflict: 'variant_id', ignoreDuplicates: true });

    if (error) {
      throw new Error(`[justtcg-domain-ingest] variant upsert failed: ${error.message}`);
    }
  }

  return variantArtifacts.length;
}

async function insertSnapshotRows(supabase, snapshotArtifacts) {
  if (snapshotArtifacts.length === 0) {
    return 0;
  }

  for (const rows of chunkArray(snapshotArtifacts, WRITE_CHUNK_SIZE)) {
    const { error } = await supabase
      .from('justtcg_variant_price_snapshots')
      .insert(rows);

    if (error) {
      throw new Error(`[justtcg-domain-ingest] snapshot insert failed: ${error.message}`);
    }
  }

  return snapshotArtifacts.length;
}

function printSummary(summary) {
  console.log('SUMMARY:');
  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (!options.apply) {
    console.error('[justtcg-domain-ingest] Refusing to run without explicit --apply.');
    process.exit(1);
  }

  const supabase = createBackendClient();
  const { apiKey } = getJustTcgApiConfig();
  const batchSize = resolveWorkerBatchSize(options.batchSize);
  const startedAt = new Date().toISOString();
  const unresolvedExternalIds = new Set();
  const duplicateVariantIds = new Set();
  const cardsWithZeroVariants = new Set();
  const seenVariantIds = new Set();

  const summary = {
    total_mapped_cards_read: 0,
    total_batches_sent: 0,
    total_cards_returned: 0,
    total_variants_upserted: 0,
    total_snapshots_inserted: 0,
    unresolved_external_ids: [],
    duplicate_variant_ids_detected: [],
    cards_with_zero_variants: [],
    started_at: startedAt,
    finished_at: null,
  };

  if (!apiKey) {
    console.error('❌ Missing JUSTTCG_API_KEY in env');
    process.exit(1);
  }

  console.log('RUN_CONFIG:');
  console.log('mode: apply');
  console.log(`source: ${SOURCE}`);
  console.log(`batch_size: ${batchSize}`);
  console.log(`batch_size_ceiling: ${MAX_BATCH_SIZE}`);
  console.log(`limit: ${options.limit ?? 'none'}`);
  console.log(`scope_set_code: ${options.setCode ?? 'none'}`);
  console.log(`scope_gv_id: ${options.gvId ?? 'none'}`);
  console.log(`scope_card_print_id: ${options.cardPrintId ?? 'none'}`);
  console.log('writes: justtcg_variants + justtcg_variant_price_snapshots');
  console.log('does_not_write: justtcg_variant_prices_latest');

  try {
    const mappedCards = await loadMappedCards(supabase, options);
    summary.total_mapped_cards_read = mappedCards.length;

    for (const [batchIndex, batch] of chunkArray(mappedCards, batchSize).entries()) {
      const requestIds = batch.map((row) => row.justTcgExternalId);
      summary.total_batches_sent += 1;

      const response = await fetchJustTcgCardsByCardIdsBatch(requestIds);
      if (!response.ok) {
        for (const externalId of requestIds) {
          unresolvedExternalIds.add(externalId);
        }
        throw new Error(`[justtcg-domain-ingest] batch ${batchIndex + 1} transport error: ${response.error}`);
      }

      const resolved = resolveJustTcgBatchByCardIds(requestIds, response.payload);
      summary.total_cards_returned += resolved.cards.length;

      console.log(
        `BATCH_START index=${batchIndex + 1} cards=${batch.length} returned=${resolved.cards.length} success=${resolved.summary.success} missing=${resolved.summary.missing} duplicate=${resolved.summary.duplicate} malformed=${resolved.summary.malformed} unexpected=${resolved.summary.unexpected}`,
      );

      if (resolved.summary.missing > 0 || resolved.summary.duplicate > 0 || resolved.summary.malformed > 0 || resolved.summary.unexpected > 0) {
        for (const row of batch) {
          const lookup = resolved.results[row.justTcgExternalId];
          if (!lookup || lookup.status !== 'success') {
            unresolvedExternalIds.add(row.justTcgExternalId);
          }
        }

        if (resolved.unexpectedReturnedIds.length > 0) {
          console.error(
            `[justtcg-domain-ingest] unexpected upstream card ids in batch ${batchIndex + 1}: ${resolved.unexpectedReturnedIds.join(', ')}`,
          );
        }

        throw new Error(`[justtcg-domain-ingest] batch ${batchIndex + 1} failed deterministic resolution checks.`);
      }

      const batchFetchedAt = new Date().toISOString();
      const batchVariantArtifacts = [];
      const batchSnapshotArtifacts = [];

      for (const row of batch) {
        const lookup = resolved.results[row.justTcgExternalId];
        if (!lookup?.card) {
          unresolvedExternalIds.add(row.justTcgExternalId);
          throw new Error(`[justtcg-domain-ingest] resolved card missing for ${row.justTcgExternalId}.`);
        }

        const rawVariants = Array.isArray(lookup.card.variants) ? lookup.card.variants : [];
        if (rawVariants.length === 0) {
          cardsWithZeroVariants.add(row.justTcgExternalId);
          throw new Error(`[justtcg-domain-ingest] card returned zero variants: ${row.justTcgExternalId}`);
        }

        let emittedForCard = 0;
        for (const rawVariant of rawVariants) {
          const variantArtifact = buildVariantArtifact(row, rawVariant);
          if (seenVariantIds.has(variantArtifact.variant_id)) {
            duplicateVariantIds.add(variantArtifact.variant_id);
          }
          seenVariantIds.add(variantArtifact.variant_id);
          batchVariantArtifacts.push(variantArtifact);
          batchSnapshotArtifacts.push(buildSnapshotArtifact(row, rawVariant, batchFetchedAt));
          emittedForCard += 1;
        }

        if (emittedForCard === 0) {
          cardsWithZeroVariants.add(row.justTcgExternalId);
          throw new Error(`[justtcg-domain-ingest] no usable variants emitted for ${row.justTcgExternalId}`);
        }
      }

      if (duplicateVariantIds.size > 0) {
        throw new Error(
          `[justtcg-domain-ingest] duplicate variant ids detected in transform: ${sortStable(Array.from(duplicateVariantIds)).join(', ')}`,
        );
      }

      const variantsUpserted = await upsertVariantRows(supabase, batchVariantArtifacts);
      const snapshotsInserted = await insertSnapshotRows(supabase, batchSnapshotArtifacts);

      summary.total_variants_upserted += variantsUpserted;
      summary.total_snapshots_inserted += snapshotsInserted;

      console.log(
        `BATCH_DONE index=${batchIndex + 1} variants_upserted=${variantsUpserted} snapshots_inserted=${snapshotsInserted}`,
      );
    }
  } catch (error) {
    summary.unresolved_external_ids = sortStable(Array.from(unresolvedExternalIds));
    summary.duplicate_variant_ids_detected = sortStable(Array.from(duplicateVariantIds));
    summary.cards_with_zero_variants = sortStable(Array.from(cardsWithZeroVariants));
    summary.finished_at = new Date().toISOString();
    printSummary(summary);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  summary.unresolved_external_ids = sortStable(Array.from(unresolvedExternalIds));
  summary.duplicate_variant_ids_detected = sortStable(Array.from(duplicateVariantIds));
  summary.cards_with_zero_variants = sortStable(Array.from(cardsWithZeroVariants));
  summary.finished_at = new Date().toISOString();
  printSummary(summary);
}

main().catch((error) => {
  console.error('❌ Unhandled JustTCG domain ingest failure:', error);
  process.exit(1);
});
