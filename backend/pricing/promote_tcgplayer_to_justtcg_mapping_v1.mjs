/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * Legacy discovery only. Mapping writes are retired pending Master Index review.
 *
 * RULES:
 * - not part of runtime authority
 * - must not be imported into application code
 * - requires explicit maintenance mode
 * - defaults to DRY RUN
 */
import { assertLegacyMappingReviewOnly, legacyMappingReviewRecord } from '../maintenance/legacy_mapping_review_only_v1.mjs';
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  chunkArray,
  fetchJustTcgCardsByTcgplayerIdsBatch,
  getJustTcgApiConfig,
  resolveJustTcgBatchByTcgplayerIds,
  resolveJustTcgPostBatchSize,
  uniqueValues,
} from './justtcg_client.mjs';
import {
  getCanonMaintenanceDryRun,
} from '../maintenance/canon_maintenance_boundary_v1.mjs';

const SOURCE = 'tcgplayer';
const TARGET_SOURCE = 'justtcg';
const PAGE_SIZE = 200;

if (process.env.ENABLE_CANON_MAINTENANCE_MODE !== 'true') {
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
    limit: 50,
    batchSize: null,
    unmappedOnly: false,
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
    } else if (token === '--unmapped-only') {
      options.unmappedOnly = true;
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

function getSelectionMode(options) {
  if (options.unmappedOnly) {
    return 'unmapped-only';
  }

  return 'unmapped-first';
}

async function fetchTcgplayerMappingPage(supabase, offset, pageSize) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,synced_at')
    .eq('source', SOURCE)
    .eq('active', true)
    .order('synced_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`[tcgplayer-justtcg-promotion] tcgplayer mapping query failed: ${error.message}`);
  }

  return data ?? [];
}

async function fetchCardNames(supabase, cardPrintIds) {
  if (!Array.isArray(cardPrintIds) || cardPrintIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('card_prints')
    .select('id,name,gv_id,set_id,set_code,number,number_plain,variant_key,identity_domain,print_identity_key,printed_identity_modifier')
    .in('id', cardPrintIds);

  if (error) {
    throw new Error(`[tcgplayer-justtcg-promotion] card name query failed: ${error.message}`);
  }

  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function fetchActiveJustTcgMappedCardPrintIds(supabase, cardPrintIds) {
  if (!Array.isArray(cardPrintIds) || cardPrintIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id')
    .eq('source', TARGET_SOURCE)
    .eq('active', true)
    .in('card_print_id', cardPrintIds);

  if (error) {
    throw new Error(`[tcgplayer-justtcg-promotion] active justtcg candidate query failed: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.card_print_id).filter(Boolean));
}

async function loadScopedCards(supabase, limit, options = {}) {
  const unmappedOnly = options.unmappedOnly === true;
  const seenCardPrintIds = new Set();
  const unmapped = [];
  const mapped = [];
  let offset = 0;

  while (true) {
    if (limit != null && unmapped.length >= limit) {
      break;
    }

    const rows = await fetchTcgplayerMappingPage(supabase, offset, PAGE_SIZE);
    if (rows.length === 0) {
      break;
    }

    offset += rows.length;

    const pageScoped = [];
    for (const row of rows) {
      const cardPrintId = row.card_print_id;
      if (!cardPrintId || seenCardPrintIds.has(cardPrintId)) {
        continue;
      }

      seenCardPrintIds.add(cardPrintId);
      pageScoped.push({ cardPrintId });
    }

    const cardPrintIds = pageScoped.map((row) => row.cardPrintId);
    const [nameById, activeJustTcgMappedIds] = await Promise.all([
      fetchCardNames(supabase, cardPrintIds),
      fetchActiveJustTcgMappedCardPrintIds(supabase, cardPrintIds),
    ]);

    for (const row of pageScoped) {
      const scopedRow = {
        cardPrintId: row.cardPrintId,
        name: nameById.get(row.cardPrintId)?.name ?? '',
        canonical_identity: nameById.get(row.cardPrintId) ?? null,
      };
      const hasActiveJustTcgMapping = activeJustTcgMappedIds.has(row.cardPrintId);

      if (hasActiveJustTcgMapping) {
        if (!unmappedOnly) {
          mapped.push(scopedRow);
        }
      } else {
        unmapped.push(scopedRow);
      }
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
  }

  const ordered = unmappedOnly ? unmapped : [...unmapped, ...mapped];
  return limit == null ? ordered : ordered.slice(0, limit);
}

async function loadActiveTcgplayerMappingsForCard(supabase, cardPrintId) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,active')
    .eq('source', SOURCE)
    .eq('card_print_id', cardPrintId)
    .eq('active', true);

  if (error) {
    throw new Error(`[tcgplayer-justtcg-promotion] active tcgplayer mapping query failed: ${error.message}`);
  }

  return data ?? [];
}

async function loadActiveJustTcgMappingsForCard(supabase, cardPrintId) {
  const { data, error } = await supabase
    .from('external_mappings')
    .select('card_print_id,external_id,active')
    .eq('source', TARGET_SOURCE)
    .eq('card_print_id', cardPrintId)
    .eq('active', true);

  if (error) {
    throw new Error(`[tcgplayer-justtcg-promotion] active justtcg mapping query failed: ${error.message}`);
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
    throw new Error(`[tcgplayer-justtcg-promotion] justtcg external id query failed: ${error.message}`);
  }

  return data ?? [];
}

function logResult(row) {
  console.log(JSON.stringify(legacyMappingReviewRecord(row)));
  console.log('\nROW:');
  console.log(`card_print_id: ${row.cardPrintId}`);
  console.log(`name: ${row.name}`);
  console.log(`tcgplayer external id: ${row.tcgplayerExternalId ?? 'null'}`);
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
  assertLegacyMappingReviewOnly();
  const options = parseArgs();
  if (DRY_RUN) {
    options.apply = false;
  }
  const supabase = createBackendClient();
  const { apiKey } = getJustTcgApiConfig();
  const batchSize = resolveJustTcgPostBatchSize(options.batchSize);
  const batchSizeSource = getBatchSizeSource(options);
  const selectionMode = getSelectionMode(options);
  const summary = {
    inspected: 0,
    review_candidates: 0,
    database_writes: 0,
    existing_requires_review: 0,
    no_justtcg_match: 0,
    ambiguous: 0,
    conflicting_existing: 0,
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
  console.log(`selection_mode: ${selectionMode}`);
  console.log(`limit: ${options.limit ?? 'none'}`);

  let scopedCards = [];
  try {
    scopedCards = await loadScopedCards(supabase, options.limit, options);
  } catch (error) {
    console.error('❌ Failed to load tcgplayer-mapped cards:', error);
    process.exit(1);
  }

  const batchReadyRows = [];

  for (const card of scopedCards) {
    summary.inspected += 1;

    try {
      const activeTcgplayerMappings = await loadActiveTcgplayerMappingsForCard(supabase, card.cardPrintId);
      const activeTcgplayerExternalIds = uniqueValues(activeTcgplayerMappings.map((row) => row.external_id));

      if (activeTcgplayerExternalIds.length === 0) {
        summary.errors += 1;
        logResult({
          ...card,
          tcgplayerExternalId: null,
          justTcgCardId: null,
          status: 'SKIP_ERROR',
          reason: 'No active tcgplayer mapping could be resolved for this card_print_id.',
        });
        continue;
      }

      if (activeTcgplayerExternalIds.length > 1) {
        summary.errors += 1;
        logResult({
          ...card,
          tcgplayerExternalId: activeTcgplayerExternalIds.join(', '),
          justTcgCardId: null,
          status: 'SKIP_ERROR',
          reason: `Multiple active tcgplayer mappings exist for this card_print_id (${activeTcgplayerExternalIds.join(', ')}).`,
        });
        continue;
      }

      batchReadyRows.push({
        ...card,
        tcgplayerExternalId: activeTcgplayerExternalIds[0],
      });
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
          summary.no_justtcg_match += 1;
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

        if (activeJustTcgExternalIds.length === 1 && activeJustTcgExternalIds[0] === justTcgCardId) {
          summary.existing_requires_review += 1;
          logResult({ ...row, justTcgCardId, status: 'EXISTING_MAPPING_REQUIRES_REVIEW',
            provider_evidence: lookup.card,
            reason: 'Existing provider ID agreement does not establish canonical identity authority.' });
          continue;
        }

        const meta = {
          resolved_via: 'tcgplayerId',
          tcgplayer_external_id: row.tcgplayerExternalId,
          promoted_by: 'promote_tcgplayer_to_justtcg_mapping_v1',
        };
        if (typeof lookup.card?.set_name === 'string' && lookup.card.set_name.trim()) {
          meta.justtcg_set_name = lookup.card.set_name.trim();
        }
        if (typeof lookup.card?.number === 'string' && lookup.card.number.trim()) {
          meta.justtcg_number = lookup.card.number.trim();
        }

        if (options.dryRun) {
          summary.review_candidates += 1;
          logResult({
            ...row,
            justTcgCardId,
            status: 'MAPPING_CANDIDATE_REQUIRES_REVIEW',
            provider_evidence: lookup.card,
            mapping_evidence: meta,
            reason: 'Provider ID agreement is a review lead, not permission to insert a mapping.',
          });
          continue;
        }

        throw new Error('LEGACY_MAPPING_APPLY_RETIRED');
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
  console.log(`review_candidates: ${summary.review_candidates}`);
  console.log(`database_writes: ${summary.database_writes}`);
  console.log(`existing_requires_review: ${summary.existing_requires_review}`);
  console.log(`no_justtcg_match: ${summary.no_justtcg_match}`);
  console.log(`ambiguous: ${summary.ambiguous}`);
  console.log(`conflicting_existing: ${summary.conflicting_existing}`);
  console.log(`errors: ${summary.errors}`);

  printVerificationQueries();
}

main().catch((error) => {
  console.error('❌ Unhandled tcgplayer to justtcg mapping promotion failure:', error);
  process.exit(1);
});
