// backend/pokemon/pokemonapi_import_cards_worker.mjs
//
// Imports PokemonAPI cards into raw_imports (enrichment only; no pricing).
// Idempotent on source+_kind+_external_id inside payload.

// Load environment variables
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { fetchPokemonCardsBySetId } from '../clients/pokemonapi.mjs';

const PAGE_SIZE = 200;
const SOURCE = 'pokemonapi';
const KIND = 'card';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const setIds = [];
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--set' && args[i + 1]) {
      setIds.push(args[i + 1]);
      i += 1;
    }
  }
  return setIds;
}

async function upsertRawImport(supabase, payload) {
  const externalId = payload?._external_id ?? payload?.id;
  if (!externalId) throw new Error('Missing external id on payload');

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
  return { id: inserted?.id, created: true };
}

async function fetchAllPokemonSetIds(supabase) {
  const { data, error } = await supabase
    .from('raw_imports')
    .select('payload')
    .eq('source', SOURCE)
    .eq('payload->>_kind', 'set');

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    console.warn(
      '[pokemonapi][cards] No set raw_imports found for source=pokemonapi, kind=set.',
    );
    return [];
  }

  const ids = data
    .map((row) => row?.payload?._external_id ?? row?.payload?.id)
    .filter((id) => typeof id === 'string' && id.length > 0);

  return Array.from(new Set(ids));
}

async function importSetCards(supabase, setId) {
  let page = 1;
  let created = 0;
  let updated = 0;
  let totalCount = null;

  while (true) {
    let data = null;
    let apiTotal = null;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const result = await fetchPokemonCardsBySetId(setId, page, PAGE_SIZE);
        data = result.data;
        apiTotal = result.totalCount ?? result.total ?? null;
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `[pokemonapi][cards] set=${setId} page=${page} attempt=${attempt}/${MAX_RETRIES} failed:`,
          err?.message ?? err,
        );
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * attempt;
          await sleep(delay);
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    if (totalCount === null) totalCount = apiTotal;
    if (!data || data.length === 0) break;

    for (const card of data) {
      const payload = {
        ...card,
        _kind: KIND,
        _external_id: card.id,
        _set_external_id: setId,
      };
      const { created: isCreated } = await upsertRawImport(supabase, payload);
      if (isCreated) created += 1;
      else updated += 1;
    }

    const soFar = page * PAGE_SIZE;
    console.log(
      `[pokemonapi][cards] set=${setId} page=${page} count=${data.length} total=${totalCount ?? 'unknown'}`,
    );
    if (totalCount !== null && soFar >= totalCount) break;
    page += 1;
  }

  return { created, updated };
}

async function logRun(supabase, stats) {
  try {
    await supabase.from('admin.import_runs').insert([
      {
        kind: 'pokemonapi_import_cards_for_set',
        scope: stats.scope ?? {},
        status: 'success',
        finished_at: new Date().toISOString(),
        error: null,
        source: SOURCE,
        mode: KIND,
        counts: { created: stats.created, updated: stats.updated },
      },
    ]);
  } catch (err) {
    console.warn('[pokemonapi][cards] Failed to log admin.import_runs:', err.message ?? err);
  }
}

async function main() {
  const explicitSetIds = parseArgs();
  const supabase = createBackendClient();

  const setIds =
    explicitSetIds.length > 0
      ? explicitSetIds
      : await fetchAllPokemonSetIds(supabase);
  if (setIds.length === 0) {
    console.log('[pokemonapi][cards] No set ids found to import.');
    return;
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  const failedSetIds = [];

  for (const setId of setIds) {
    try {
      const { created, updated } = await importSetCards(supabase, setId);
      totalCreated += created;
      totalUpdated += updated;
    } catch (err) {
      console.error(
        `[pokemonapi][cards] ERROR importing set=${setId}:`,
        err?.message ?? err,
      );
      failedSetIds.push(setId);
      await sleep(RETRY_DELAY_MS);
    }
  }

  await logRun(supabase, {
    created: totalCreated,
    updated: totalUpdated,
    scope: { set_ids: setIds, failed_set_ids: failedSetIds },
  });

  console.log(
    `[pokemonapi][cards] import complete. created=${totalCreated}, updated=${totalUpdated}, sets=${setIds.length}, failed_sets=${failedSetIds.length}`,
  );
}

main().catch((err) => {
  console.error('[pokemonapi][cards] Unhandled error:', err);
  process.exit(1);
});
