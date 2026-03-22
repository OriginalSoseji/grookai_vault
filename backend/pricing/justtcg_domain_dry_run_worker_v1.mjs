// Dry-run only.
// Reads active JustTCG mappings from external_mappings, fetches JustTCG cards in
// deterministic batches, parses variants[], and writes NDJSON artifacts only.
//
// Usage:
//   node backend/pricing/justtcg_domain_dry_run_worker_v1.mjs
//   node backend/pricing/justtcg_domain_dry_run_worker_v1.mjs --limit=100 --batch-size=50
//   node backend/pricing/justtcg_domain_dry_run_worker_v1.mjs --batch-size=100
//   node backend/pricing/justtcg_domain_dry_run_worker_v1.mjs --batch-size=180
//   node backend/pricing/justtcg_domain_dry_run_worker_v1.mjs --output-dir=temp/justtcg_dry_run
//
// Batch-size guidance:
//   - dry-run sample: 50 or 100
//   - full dry-run: 100
//   - future real ingestion target: 180
//   - absolute upstream ceiling: 200
//
// Output files:
//   temp/justtcg_dry_run/variants.ndjson
//   temp/justtcg_dry_run/snapshots.ndjson
//   temp/justtcg_dry_run/summary.json

import '../env.mjs';

import path from 'node:path';
import { mkdir, open, writeFile } from 'node:fs/promises';
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
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'temp', 'justtcg_dry_run');
const FETCH_PAGE_SIZE = 1000;
const POKEMON_GAME_ID = 'pokemon';
const MAX_BATCH_SIZE = 200;

if (typeof fetch !== 'function') {
  console.error('❌ Global fetch unavailable; use Node 18+');
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    limit: null,
    batchSize: null,
    outputDir: DEFAULT_OUTPUT_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--limit' && argv[index + 1]) {
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
    } else if (token === '--batch-size') {
      throw new Error('[justtcg-domain-dry-run] --batch-size requires a value.');
    } else if (token === '--output-dir' && argv[index + 1]) {
      const value = String(argv[index + 1]).trim();
      if (value) {
        options.outputDir = path.resolve(process.cwd(), value);
      }
      index += 1;
    } else if (token.startsWith('--output-dir=')) {
      const value = String(token.split('=')[1] ?? '').trim();
      if (value) {
        options.outputDir = path.resolve(process.cwd(), value);
      }
    }
  }

  return options;
}

function parseBatchSizeValue(rawValue, sourceLabel) {
  const parsed = Number.parseInt(String(rawValue ?? '').trim(), 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_BATCH_SIZE) {
    throw new Error(
      `[justtcg-domain-dry-run] ${sourceLabel} must be an integer between 1 and ${MAX_BATCH_SIZE}.`,
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
    throw new Error(`[justtcg-domain-dry-run] mapping query failed: ${error.message}`);
  }

  return data ?? [];
}

async function loadMappedCards(supabase, limit = null) {
  const mapped = [];
  const seenExternalIds = new Set();
  let from = 0;

  while (limit == null || mapped.length < limit) {
    const to = from + FETCH_PAGE_SIZE - 1;
    const rows = await fetchMappedJustTcgPage(supabase, from, to);
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const externalId = normalizeExternalId(row.external_id);
      if (!row.card_print_id || !externalId) {
        console.warn('[justtcg-domain-dry-run] skipped malformed mapping row', row);
        continue;
      }

      if (seenExternalIds.has(externalId)) {
        console.warn(`[justtcg-domain-dry-run] duplicate active justtcg external_id skipped: ${externalId}`);
        continue;
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
    console.warn('[justtcg-domain-dry-run] skipped malformed variant payload', {
      sourceCardExternalId: row.justTcgExternalId,
      variant,
    });
    return null;
  }

  return {
    variant_id: variantId,
    card_print_id: row.cardPrintId,
    condition,
    printing,
    language,
    source_card_external_id: row.justTcgExternalId,
  };
}

function buildSnapshotArtifact(row, variant, fetchedAt) {
  const variantId = normalizeTextOrNull(variant?.id);
  if (!variantId) {
    return null;
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

async function createNdjsonArtifactWriter(outputDir) {
  await mkdir(outputDir, { recursive: true });

  const variantsPath = path.join(outputDir, 'variants.ndjson');
  const snapshotsPath = path.join(outputDir, 'snapshots.ndjson');
  const summaryPath = path.join(outputDir, 'summary.json');

  const variantsHandle = await open(variantsPath, 'w');
  const snapshotsHandle = await open(snapshotsPath, 'w');

  async function appendObjects(handle, objects) {
    if (!Array.isArray(objects) || objects.length === 0) {
      return;
    }

    const payload = `${objects.map((item) => JSON.stringify(item)).join('\n')}\n`;
    await handle.write(payload, null, 'utf8');
  }

  return {
    paths: {
      variantsPath,
      snapshotsPath,
      summaryPath,
    },
    async appendBatch({ variants = [], snapshots = [] }) {
      await appendObjects(variantsHandle, variants);
      await appendObjects(snapshotsHandle, snapshots);
    },
    async writeSummary(summary) {
      await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    },
    async close() {
      await Promise.all([
        variantsHandle.close(),
        snapshotsHandle.close(),
      ]);
    },
  };
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  const supabase = createBackendClient();
  const { apiKey } = getJustTcgApiConfig();
  const batchSize = resolveWorkerBatchSize(options.batchSize);
  const startedAt = new Date().toISOString();

  if (!apiKey) {
    console.error('❌ Missing JUSTTCG_API_KEY in env');
    process.exit(1);
  }

  console.log('RUN_CONFIG:');
  console.log('mode: dry-run');
  console.log(`source: ${SOURCE}`);
  console.log(`batch_size: ${batchSize}`);
  console.log(`batch_size_ceiling: ${MAX_BATCH_SIZE}`);
  console.log(`limit: ${options.limit ?? 'none'}`);
  console.log(`output_dir: ${options.outputDir}`);
  console.log('artifact_format: variants.ndjson + snapshots.ndjson + summary.json');

  const mappedCards = await loadMappedCards(supabase, options.limit);
  const artifactWriter = await createNdjsonArtifactWriter(options.outputDir);
  const unresolvedExternalIds = new Set();
  const duplicateVariantIds = new Set();
  const cardsWithZeroVariants = new Set();
  const seenVariantIds = new Set();

  let totalBatchesSent = 0;
  let totalCardsReturned = 0;
  let totalVariantsEmitted = 0;
  let totalSnapshotsEmitted = 0;

  try {
    for (const [batchIndex, batch] of chunkArray(mappedCards, batchSize).entries()) {
      const requestIds = batch.map((row) => row.justTcgExternalId);
      totalBatchesSent += 1;

      const response = await fetchJustTcgCardsByCardIdsBatch(requestIds);
      if (!response.ok) {
        console.error(`[justtcg-domain-dry-run] batch ${batchIndex + 1} transport error: ${response.error}`);
        for (const externalId of requestIds) {
          unresolvedExternalIds.add(externalId);
        }
        continue;
      }

      const resolved = resolveJustTcgBatchByCardIds(requestIds, response.payload);
      totalCardsReturned += resolved.cards.length;
      const batchFetchedAt = new Date().toISOString();
      const batchVariantArtifacts = [];
      const batchSnapshotArtifacts = [];

      console.log(
        `BATCH_DONE index=${batchIndex + 1} success=${resolved.summary.success} missing=${resolved.summary.missing} duplicate=${resolved.summary.duplicate} malformed=${resolved.summary.malformed} unexpected=${resolved.summary.unexpected}`,
      );

      if (resolved.malformedRowCount > 0) {
        console.warn(`[justtcg-domain-dry-run] batch ${batchIndex + 1} malformed rows: ${resolved.malformedRowCount}`);
      }

      if (resolved.unexpectedReturnedIds.length > 0) {
        console.warn(
          `[justtcg-domain-dry-run] batch ${batchIndex + 1} unexpected card ids: ${resolved.unexpectedReturnedIds.join(', ')}`,
        );
      }

      for (const row of batch) {
        const lookup = resolved.results[row.justTcgExternalId] ?? {
          status: 'missing',
          card: null,
          reason: 'No JustTCG card was returned for this external_id.',
        };

        if (lookup.status !== 'success' || !lookup.card) {
          unresolvedExternalIds.add(row.justTcgExternalId);
          console.warn('[justtcg-domain-dry-run] unresolved mapped card', {
            cardPrintId: row.cardPrintId,
            justTcgExternalId: row.justTcgExternalId,
            reason: lookup.reason,
          });
          continue;
        }

        const rawVariants = Array.isArray(lookup.card.variants) ? lookup.card.variants : [];
        let emittedForCard = 0;

        if (rawVariants.length === 0) {
          cardsWithZeroVariants.add(row.justTcgExternalId);
          console.warn(`[justtcg-domain-dry-run] card returned zero variants: ${row.justTcgExternalId}`);
          continue;
        }

        for (const rawVariant of rawVariants) {
          const variantArtifact = buildVariantArtifact(row, rawVariant);
          if (!variantArtifact) {
            continue;
          }

          if (seenVariantIds.has(variantArtifact.variant_id)) {
            duplicateVariantIds.add(variantArtifact.variant_id);
          }
          seenVariantIds.add(variantArtifact.variant_id);

          batchVariantArtifacts.push(variantArtifact);
          totalVariantsEmitted += 1;

          const snapshotArtifact = buildSnapshotArtifact(row, rawVariant, batchFetchedAt);
          if (snapshotArtifact) {
            batchSnapshotArtifacts.push(snapshotArtifact);
            totalSnapshotsEmitted += 1;
          }

          emittedForCard += 1;
        }

        if (emittedForCard === 0) {
          cardsWithZeroVariants.add(row.justTcgExternalId);
          console.warn(`[justtcg-domain-dry-run] card returned variants but none were usable: ${row.justTcgExternalId}`);
        }
      }

      await artifactWriter.appendBatch({
        variants: batchVariantArtifacts,
        snapshots: batchSnapshotArtifacts,
      });
    }

    const finishedAt = new Date().toISOString();
    const summary = {
      total_mapped_cards_read: mappedCards.length,
      total_batches_sent: totalBatchesSent,
      total_cards_returned: totalCardsReturned,
      total_variants_emitted: totalVariantsEmitted,
      total_snapshots_emitted: totalSnapshotsEmitted,
      unresolved_external_ids: sortStable(Array.from(unresolvedExternalIds)),
      duplicate_variant_ids_detected: sortStable(Array.from(duplicateVariantIds)),
      cards_with_zero_variants: sortStable(Array.from(cardsWithZeroVariants)),
      started_at: startedAt,
      finished_at: finishedAt,
    };

    await artifactWriter.writeSummary(summary);

    console.log('ARTIFACTS_WRITTEN:');
    console.log(`variants: ${artifactWriter.paths.variantsPath}`);
    console.log(`snapshots: ${artifactWriter.paths.snapshotsPath}`);
    console.log(`summary: ${artifactWriter.paths.summaryPath}`);
    console.log('SUMMARY:');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await artifactWriter.close();
  }
}

main().catch((error) => {
  console.error('❌ Unhandled JustTCG domain dry-run failure:', error);
  process.exit(1);
});
