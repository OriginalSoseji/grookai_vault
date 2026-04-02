import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { getJustTcgApiConfig, requestJustTcgJson, unwrapJustTcgData } from './justtcg_client.mjs';

const SOURCE = 'justtcg';
const KIND = 'card';
const GAME = 'pokemon';
const CARD_PAGE_SIZE = 100;

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`[justtcg-import][cards] ${label} must be a non-negative integer.`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    apply: false,
    setId: null,
    limitSets: null,
    offset: 0,
    limitCardsPerSet: null,
    updatedAfter: null,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--apply') {
      options.apply = true;
    } else if (token === '--set-id' && argv[index + 1]) {
      options.setId = normalizeTextOrNull(argv[index + 1]);
      index += 1;
    } else if (token.startsWith('--set-id=')) {
      options.setId = normalizeTextOrNull(token.slice('--set-id='.length));
    } else if (token === '--limit-sets' && argv[index + 1]) {
      const value = parsePositiveInteger(argv[index + 1], '--limit-sets');
      options.limitSets = value > 0 ? value : null;
      index += 1;
    } else if (token.startsWith('--limit-sets=')) {
      const value = parsePositiveInteger(token.slice('--limit-sets='.length), '--limit-sets');
      options.limitSets = value > 0 ? value : null;
    } else if (token === '--offset' && argv[index + 1]) {
      options.offset = parsePositiveInteger(argv[index + 1], '--offset');
      index += 1;
    } else if (token.startsWith('--offset=')) {
      options.offset = parsePositiveInteger(token.slice('--offset='.length), '--offset');
    } else if (token === '--limit-cards-per-set' && argv[index + 1]) {
      const value = parsePositiveInteger(argv[index + 1], '--limit-cards-per-set');
      options.limitCardsPerSet = value > 0 ? value : null;
      index += 1;
    } else if (token.startsWith('--limit-cards-per-set=')) {
      const value = parsePositiveInteger(
        token.slice('--limit-cards-per-set='.length),
        '--limit-cards-per-set',
      );
      options.limitCardsPerSet = value > 0 ? value : null;
    } else if (token === '--updated-after' && argv[index + 1]) {
      options.updatedAfter = normalizeTextOrNull(argv[index + 1]);
      index += 1;
    } else if (token.startsWith('--updated-after=')) {
      options.updatedAfter = normalizeTextOrNull(token.slice('--updated-after='.length));
    } else if (token === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

function sortSetsStable(sets) {
  return [...sets].sort((left, right) => {
    const leftId = normalizeTextOrNull(left?.id) ?? '';
    const rightId = normalizeTextOrNull(right?.id) ?? '';
    const idCompare = leftId.localeCompare(rightId);
    if (idCompare !== 0) {
      return idCompare;
    }

    const leftName = normalizeTextOrNull(left?.name) ?? '';
    const rightName = normalizeTextOrNull(right?.name) ?? '';
    return leftName.localeCompare(rightName);
  });
}

function buildErrorSnippet(payload) {
  if (payload === null || payload === undefined) {
    return '(empty body)';
  }

  try {
    return JSON.stringify(payload).slice(0, 300);
  } catch {
    return String(payload).slice(0, 300);
  }
}

function createCardPayload(card, fetchedAtIso) {
  const externalId = normalizeTextOrNull(card?.id);
  if (!externalId) {
    throw new Error('[justtcg-import][cards] Missing upstream card id.');
  }

  return {
    ...card,
    _kind: KIND,
    _external_id: externalId,
    _set_external_id: normalizeTextOrNull(card?.set),
    _fetched_at: fetchedAtIso,
  };
}

async function upsertRawImport(supabase, payload) {
  const externalId = payload?._external_id ?? payload?.id;
  if (!externalId) {
    throw new Error('Missing external id on payload');
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('raw_imports')
    .select('id')
    .eq('source', SOURCE)
    .eq('payload->>_kind', KIND)
    .eq('payload->>_external_id', externalId)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existingRows && existingRows.length > 0) {
    const targetId = existingRows[0].id;
    const { error: updateError } = await supabase
      .from('raw_imports')
      .update({
        payload,
        status: 'pending',
        processed_at: null,
      })
      .eq('id', targetId);

    if (updateError) {
      throw updateError;
    }

    return { id: targetId, created: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('raw_imports')
    .insert({
      source: SOURCE,
      status: 'pending',
      payload,
    })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  return { id: inserted?.id ?? null, created: true };
}

async function fetchPokemonSets() {
  const params = new URLSearchParams();
  params.set('game', GAME);
  params.set('orderBy', 'name');
  params.set('order', 'asc');

  const response = await requestJustTcgJson('GET', '/sets', { params });
  if (!response.ok) {
    throw new Error(
      `[justtcg-import][cards] /sets failed status=${response.status || 'n/a'} body=${buildErrorSnippet(
        response.payload ?? response.error,
      )}`,
    );
  }

  return sortSetsStable(unwrapJustTcgData(response.payload));
}

function scopeSets(allSets, options) {
  let scoped = allSets;

  if (options.setId) {
    scoped = scoped.filter((setRow) => normalizeTextOrNull(setRow?.id) === options.setId);
  }

  if (options.offset > 0) {
    scoped = scoped.slice(options.offset);
  }

  if (options.limitSets != null) {
    scoped = scoped.slice(0, options.limitSets);
  }

  return scoped;
}

async function fetchCardsForSet(setId, options) {
  const cards = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams();
    params.set('game', GAME);
    params.set('set', setId);
    params.set('limit', String(CARD_PAGE_SIZE));
    params.set('offset', String(offset));

    if (options.updatedAfter) {
      params.set('updated_after', options.updatedAfter);
    }

    const response = await requestJustTcgJson('GET', '/cards', { params });
    if (!response.ok) {
      throw new Error(
        `[justtcg-import][cards] /cards failed set=${setId} status=${response.status || 'n/a'} body=${buildErrorSnippet(
          response.payload ?? response.error,
        )}`,
      );
    }

    const payload = response.payload ?? {};
    const batch = unwrapJustTcgData(payload);

    if (batch.length === 0) {
      break;
    }

    const remaining =
      options.limitCardsPerSet == null ? batch.length : Math.max(options.limitCardsPerSet - cards.length, 0);
    if (remaining <= 0) {
      break;
    }

    cards.push(...batch.slice(0, remaining));

    if (options.limitCardsPerSet != null && cards.length >= options.limitCardsPerSet) {
      break;
    }

    const nextOffset = Number(payload?.meta?.offset ?? offset) + Number(payload?.meta?.limit ?? CARD_PAGE_SIZE);
    const metaHasMore =
      typeof payload?.meta?.hasMore === 'boolean' ? payload.meta.hasMore : batch.length === CARD_PAGE_SIZE;
    hasMore = metaHasMore;
    offset = nextOffset;
  }

  return cards;
}

function summarizeCardShape(card) {
  const tcgplayerId = normalizeTextOrNull(card?.tcgplayerId);
  const number = normalizeTextOrNull(card?.number);
  const normalizedNumber = String(number ?? '').trim().toUpperCase();

  return {
    hasTcgplayerId: Boolean(tcgplayerId),
    isNumbered: normalizedNumber.length > 0 && normalizedNumber !== 'N/A',
  };
}

function printSummary(summary, perSetSummaries, options) {
  console.log(`[justtcg-import][cards] intake_run_source=${SOURCE}`);
  console.log(`[justtcg-import][cards] mode=${summary.mode}`);
  console.log(`[justtcg-import][cards] intake_scope=${JSON.stringify(summary.intakeScope)}`);
  console.log(`[justtcg-import][cards] sets_seen=${summary.setsSeen}`);
  console.log(`[justtcg-import][cards] sets_fetched=${summary.setsFetched}`);
  console.log(`[justtcg-import][cards] cards_seen_total=${summary.cardsSeenTotal}`);
  console.log(`[justtcg-import][cards] rows_written=${summary.rowsWritten}`);
  console.log(`[justtcg-import][cards] rows_skipped_or_duplicates=${summary.rowsSkippedOrDuplicates}`);
  console.log(`[justtcg-import][cards] cards_with_tcgplayer_id=${summary.cardsWithTcgplayerId}`);
  console.log(`[justtcg-import][cards] cards_without_tcgplayer_id=${summary.cardsWithoutTcgplayerId}`);
  console.log(`[justtcg-import][cards] numbered_cards=${summary.numberedCards}`);
  console.log(`[justtcg-import][cards] non_numbered_cards=${summary.nonNumberedCards}`);
  console.log(`[justtcg-import][cards] failed_sets=${summary.failedSets}`);

  if (!options.verbose) {
    return;
  }

  for (const setSummary of perSetSummaries) {
    console.log(
      `[justtcg-import][cards][set] set_id=${setSummary.setId} set_name=${JSON.stringify(
        setSummary.setName,
      )} cards_seen=${setSummary.cardsSeen} rows_written=${setSummary.rowsWritten} duplicates=${setSummary.duplicates} failures=${setSummary.failures}`,
    );
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const { apiKey } = getJustTcgApiConfig();
  if (!apiKey) {
    throw new Error('Missing JUSTTCG_API_KEY.');
  }

  if (!options.apply) {
    console.log('[justtcg-import][cards] Dry run. Use --apply to execute.');
  }

  const allSets = await fetchPokemonSets();
  const scopedSets = scopeSets(allSets, options);

  if (options.setId && scopedSets.length === 0) {
    throw new Error(`[justtcg-import][cards] Requested set not found upstream: ${options.setId}`);
  }

  const supabase = options.apply ? createBackendClient() : null;
  const perSetSummaries = [];
  const summary = {
    mode: options.apply ? 'apply' : 'dry-run',
    intakeScope: {
      game: GAME,
      set_id: options.setId,
      limit_sets: options.limitSets,
      offset: options.offset,
      limit_cards_per_set: options.limitCardsPerSet,
      updated_after: options.updatedAfter,
    },
    setsSeen: allSets.length,
    setsFetched: 0,
    cardsSeenTotal: 0,
    rowsWritten: 0,
    rowsSkippedOrDuplicates: 0,
    cardsWithTcgplayerId: 0,
    cardsWithoutTcgplayerId: 0,
    numberedCards: 0,
    nonNumberedCards: 0,
    failedSets: 0,
  };

  for (const setRow of scopedSets) {
    const setId = normalizeTextOrNull(setRow?.id);
    const setName = normalizeTextOrNull(setRow?.name);
    if (!setId) {
      summary.failedSets += 1;
      perSetSummaries.push({
        setId: '(missing)',
        setName,
        cardsSeen: 0,
        rowsWritten: 0,
        duplicates: 0,
        failures: 1,
      });
      continue;
    }

    const setSummary = {
      setId,
      setName,
      cardsSeen: 0,
      rowsWritten: 0,
      duplicates: 0,
      failures: 0,
    };

    try {
      const cards = await fetchCardsForSet(setId, options);
      summary.setsFetched += 1;
      setSummary.cardsSeen = cards.length;
      summary.cardsSeenTotal += cards.length;

      for (const card of cards) {
        const shape = summarizeCardShape(card);
        if (shape.hasTcgplayerId) {
          summary.cardsWithTcgplayerId += 1;
        } else {
          summary.cardsWithoutTcgplayerId += 1;
        }

        if (shape.isNumbered) {
          summary.numberedCards += 1;
        } else {
          summary.nonNumberedCards += 1;
        }

        if (!options.apply) {
          continue;
        }

        const payload = createCardPayload(card, new Date().toISOString());
        const result = await upsertRawImport(supabase, payload);
        if (result.created) {
          summary.rowsWritten += 1;
          setSummary.rowsWritten += 1;
        } else {
          summary.rowsSkippedOrDuplicates += 1;
          setSummary.duplicates += 1;
        }
      }
    } catch (error) {
      summary.failedSets += 1;
      setSummary.failures += 1;
      console.error(
        `[justtcg-import][cards] set=${setId} failed: ${error instanceof Error ? error.message : error}`,
      );
    }

    perSetSummaries.push(setSummary);
  }

  printSummary(summary, perSetSummaries, options);
}

run().catch((error) => {
  console.error('[justtcg-import][cards] Unhandled error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
