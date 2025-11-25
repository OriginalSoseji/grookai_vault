// backend/pokemon/tcgdex_import_cards_worker.mjs
//
// Imports TCGdex cards into raw_imports (source = 'tcgdex', _kind = 'card').
// Supports per-set imports (--set) or full backfills, mirroring pokemonapi importer patterns.

// Load environment variables
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { createTcgdexClient } from '../clients/tcgdex.mjs';

const SOURCE = 'tcgdex';
const KIND = 'card';
const RETRY_DELAY_MS = 750;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    setIds: [],
    limit: null,
    mode: 'full',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--set' && args[i + 1]) {
      options.setIds.push(args[i + 1]);
      i += 1;
    } else if (token === '--limit' && args[i + 1]) {
      const value = Number(args[i + 1]);
      if (!Number.isNaN(value)) options.limit = value;
      i += 1;
    } else if (token.startsWith('--mode')) {
      if (token.includes('=')) {
        options.mode = token.split('=')[1] || options.mode;
      } else if (args[i + 1]) {
        options.mode = args[i + 1];
        i += 1;
      }
    } else if (token === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

function extractSetExternalId(setData) {
  return (
    setData?._external_id ||
    setData?.id ||
    setData?.slug ||
    setData?.abbreviation ||
    setData?.code ||
    setData?._id ||
    null
  );
}

function extractCardExternalId(cardData) {
  const data = cardData?.card ?? cardData;
  return data?.id || data?._external_id || data?.uuid || null;
}

async function upsertRawImport(supabase, payload, { dryRun }) {
  if (dryRun) {
    console.log(`[tcgdex][cards][dry-run] would upsert card raw_import ${payload?._external_id}`);
    return { id: null, created: false, skipped: true };
  }

  const externalId = payload?._external_id;
  if (!externalId) throw new Error('Missing _external_id on card payload.');

  const { data: existing, error: existingError } = await supabase
    .from('raw_imports')
    .select('id')
    .eq('source', SOURCE)
    .eq('payload->>_kind', KIND)
    .eq('payload->>_external_id', externalId)
    .limit(1);
  if (existingError) throw existingError;

  if (existing && existing.length > 0) {
    const targetId = existing[0].id;
    const { error: updateError } = await supabase
      .from('raw_imports')
      .update({
        payload,
        status: 'pending',
        processed_at: null,
      })
      .eq('id', targetId);
    if (updateError) throw updateError;
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
  if (insertError) throw insertError;
  return { id: inserted?.id ?? null, created: true };
}

async function logRun(supabase, stats) {
  if (stats.dryRun) return;
  try {
    await supabase.from('admin.import_runs').insert([
      {
        kind: 'tcgdex_import_cards_for_set',
        source: SOURCE,
        scope: stats.scope ?? {},
        status: 'success',
        finished_at: new Date().toISOString(),
        counts: { created: stats.created, updated: stats.updated },
      },
    ]);
  } catch (err) {
    console.warn('[tcgdex][cards] failed to log admin.import_runs:', err?.message ?? err);
  }
}

let cachedSets = null;
let cachedSetIds = null;

async function fetchAllTcgdexSets(tcgdexClient) {
  if (cachedSets) return cachedSets;
  const sets = await tcgdexClient.fetchTcgdexSets();
  if (!Array.isArray(sets)) {
    console.warn('[tcgdex][cards] fetchAllTcgdexSets received unexpected response; defaulting to empty list.');
    cachedSets = [];
    return cachedSets;
  }
  cachedSets = sets;
  return sets;
}

async function listAllSetIds(tcgdexClient) {
  if (cachedSetIds) return cachedSetIds;
  const sets = await fetchAllTcgdexSets(tcgdexClient);
  const ids = new Set();
  for (const set of sets) {
    const id = extractSetExternalId(set);
    if (id) ids.add(id);
  }
  cachedSetIds = Array.from(ids);
  return cachedSetIds;
}

async function importSetCards(supabase, tcgdexClient, setId, context) {
  let created = 0;
  let updated = 0;
  let skippedMissingId = 0;

  if (context.remaining !== null && context.remaining <= 0) {
    return { created, updated, skippedMissingId };
  }

  const cards = await tcgdexClient.fetchTcgdexCardsBySetId(setId);
  if (!Array.isArray(cards) || cards.length === 0) {
    console.warn(`[tcgdex][cards] No cards returned from API for set=${setId}`);
    return { created, updated, skippedMissingId };
  }

  console.log(`[tcgdex][cards] fetched ${cards.length} cards for set=${setId}`);

  for (const card of cards) {
    if (context.remaining !== null && context.remaining <= 0) break;
    const externalId = extractCardExternalId(card);
    if (!externalId) {
      skippedMissingId += 1;
      continue;
    }
    const payload = {
      _kind: KIND,
      _external_id: externalId,
      _source: SOURCE,
      set_external_id: setId,
      _set_external_id: setId,
      fetched_at: new Date().toISOString(),
      card,
    };
    const result = await upsertRawImport(supabase, payload, context);
    if (result?.skipped) continue;
    if (result?.created) created += 1;
    else updated += 1;
    if (context.remaining !== null) context.remaining -= 1;
  }

  return { created, updated, skippedMissingId };
}

async function importCards(supabase, tcgdexClient, options) {
  const context = {
    dryRun: options.dryRun,
    remaining: options.limit ?? null,
  };

  const setIds =
    options.setIds.length > 0 ? options.setIds : await listAllSetIds(tcgdexClient);
  if (setIds.length === 0) {
    console.warn('[tcgdex][cards] No set ids available to import.');
    return;
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkippedMissingId = 0;
  const failedSetIds = [];

  for (const setId of setIds) {
    if (context.remaining !== null && context.remaining <= 0) break;
    try {
      const { created, updated, skippedMissingId } = await importSetCards(
        supabase,
        tcgdexClient,
        setId,
        context,
      );
      totalCreated += created;
      totalUpdated += updated;
      totalSkippedMissingId += skippedMissingId;
    } catch (err) {
      console.error(`[tcgdex][cards] ERROR importing set=${setId}:`, err?.message ?? err);
      failedSetIds.push(setId);
      await sleep(RETRY_DELAY_MS);
    }
  }

  console.log(
    `[tcgdex][cards] complete created=${totalCreated} updated=${totalUpdated} skipped_missing_id=${totalSkippedMissingId} dryRun=${options.dryRun}`,
  );

  await logRun(supabase, {
    created: totalCreated,
    updated: totalUpdated,
    dryRun: options.dryRun,
    scope: {
      set_ids: setIds,
      failed_set_ids: failedSetIds,
      limit: options.limit,
      mode: options.mode,
    },
  });
}

async function main() {
  const options = parseArgs();
  const supabase = createBackendClient();
  const tcgdexClient = createTcgdexClient();
  await importCards(supabase, tcgdexClient, options);
}

main().catch((err) => {
  console.error('[tcgdex][cards] fatal error:', err);
  process.exit(1);
});
