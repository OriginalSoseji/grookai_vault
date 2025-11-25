// backend/sets/import_sets_worker.mjs
//
// Imports PokemonAPI sets into raw_imports (enrichment only; no pricing).
// Idempotent: reuses existing raw_imports rows keyed by source+_kind+_external_id in payload.

// Load environment variables
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { fetchPokemonSets } from '../clients/pokemonapi.mjs';

const PAGE_SIZE = 200;
const SOURCE = 'pokemonapi';
const KIND = 'set';

async function upsertRawImport(supabase, payload) {
  const externalId = payload?._external_id ?? payload?.id;
  if (!externalId) throw new Error('Missing external id on payload');

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

async function logRun(supabase, stats) {
  try {
    await supabase
      .from('admin.import_runs')
      .insert([
        {
          kind: 'pokemonapi_import_sets',
          scope: { page_size: PAGE_SIZE },
          status: 'success',
          finished_at: new Date().toISOString(),
          error: null,
          ...stats,
        },
      ]);
  } catch (err) {
    console.warn('[sets-worker] Failed to log admin.import_runs:', err.message ?? err);
  }
}

async function main() {
  console.log('[sets-worker] pokemonapi import start');
  const supabase = createBackendClient();

  let page = 1;
  let totalCount = null;
  let created = 0;
  let updated = 0;

  while (true) {
    const { data, totalCount: apiTotal = null } = await fetchPokemonSets(
      page,
      PAGE_SIZE,
    );
    if (totalCount === null) totalCount = apiTotal;

    if (!data || data.length === 0) break;

    for (const set of data) {
      const payload = {
        ...set,
        _kind: KIND,
        _external_id: set.id,
      };
      const { created: isCreated } = await upsertRawImport(supabase, payload);
      if (isCreated) created += 1;
      else updated += 1;
    }

    const soFar = page * PAGE_SIZE;
    console.log(
      `[sets-worker] processed page ${page} (${data.length} sets) – totalCount=${totalCount ?? 'unknown'}`,
    );
    if (totalCount !== null && soFar >= totalCount) break;
    page += 1;
  }

  await logRun(supabase, {
    counts: { created, updated },
    source: SOURCE,
    mode: KIND,
  });

  console.log(
    `[sets-worker] pokemonapi import complete. created=${created}, updated=${updated}`,
  );
}

main().catch((err) => {
  console.error('[sets-worker] Unhandled error:', err);
  process.exit(1);
});
