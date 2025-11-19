// backend/sets/tcgdex_import_sets_worker.mjs
//
// Imports TCGdex sets into raw_imports (enrichment + identity support).
// Mirrors pokemonapi import pattern while supporting --dry-run, --mode, --limit, --page flags.

import { createBackendClient } from '../supabase_backend_client.mjs';
import { createTcgdexClient } from '../clients/tcgdex.mjs';

const SOURCE = 'tcgdex';
const KIND = 'set';
const DEFAULT_PAGE_SIZE = 200;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    limit: null,
    page: 1,
    mode: 'full',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--limit' && args[i + 1]) {
      const value = Number(args[i + 1]);
      if (!Number.isNaN(value)) options.limit = value;
      i += 1;
    } else if (token === '--page' && args[i + 1]) {
      const value = Number(args[i + 1]);
      if (!Number.isNaN(value) && value > 0) options.page = value;
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

async function upsertRawImport(supabase, payload, { dryRun }) {
  if (dryRun) {
    console.log(`[tcgdex][sets][dry-run] would upsert raw_import for set=${payload?._external_id}`);
    return { id: null, created: false, skipped: true };
  }

  const externalId = payload?._external_id;
  if (!externalId) throw new Error('Missing _external_id on set payload.');

  const { data: existingRows, error: existingError } = await supabase
    .from('raw_imports')
    .select('id')
    .eq('source', SOURCE)
    .eq('payload->>_kind', KIND)
    .eq('payload->>_external_id', externalId)
    .limit(1);
  if (existingError) throw existingError;

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
  return { id: inserted?.id ?? null, created: true };
}

async function logRun(supabase, stats) {
  if (stats.dryRun) return;
  try {
    await supabase.from('admin.import_runs').insert([
      {
        kind: 'tcgdex_import_sets',
        source: SOURCE,
        scope: { page_size: DEFAULT_PAGE_SIZE, mode: stats.mode },
        status: 'success',
        finished_at: new Date().toISOString(),
        counts: { created: stats.created, updated: stats.updated },
      },
    ]);
  } catch (err) {
    console.warn('[tcgdex][sets] failed to log admin.import_runs:', err?.message ?? err);
  }
}

function extractExternalId(setData) {
  return (
    setData?.id ||
    setData?.slug ||
    setData?.abbreviation ||
    setData?.code ||
    setData?._id ||
    null
  );
}

async function importSets(supabase, tcgdexClient, options) {
  const stats = {
    created: 0,
    updated: 0,
    skippedMissingId: 0,
    fetched: 0,
    dryRun: options.dryRun,
    mode: options.mode,
  };

  let page = options.page ?? 1;
  let remaining = options.limit ?? null;

  console.log('[tcgdex][sets] start import', options);

  while (true) {
    if (remaining !== null && remaining <= 0) break;
    const pageSize =
      remaining !== null ? Math.min(DEFAULT_PAGE_SIZE, remaining) : DEFAULT_PAGE_SIZE;
    const { data, totalCount } = await tcgdexClient.fetchTcgdexSets({
      page,
      pageSize,
    });
    if (!Array.isArray(data) || data.length === 0) break;

    for (const set of data) {
      const externalId = extractExternalId(set);
      if (!externalId) {
        stats.skippedMissingId += 1;
        continue;
      }
      const payload = {
        _kind: KIND,
        _external_id: externalId,
        _source: SOURCE,
        fetched_at: new Date().toISOString(),
        set,
      };

      const result = await upsertRawImport(supabase, payload, options);
      if (result?.skipped) continue;
      if (result?.created) stats.created += 1;
      else stats.updated += 1;
      stats.fetched += 1;
      if (remaining !== null) remaining -= 1;
      if (remaining !== null && remaining <= 0) break;
    }

    console.log(
      `[tcgdex][sets] processed page=${page} count=${data.length} total=${totalCount ?? 'unknown'}`,
    );
    page += 1;
    if (remaining !== null && remaining <= 0) break;
  }

  console.log(
    `[tcgdex][sets] complete created=${stats.created} updated=${stats.updated} skipped_missing_id=${stats.skippedMissingId} dryRun=${options.dryRun}`,
  );
  await logRun(supabase, stats);
}

async function main() {
  const options = parseArgs();
  const supabase = createBackendClient();
  const tcgdexClient = createTcgdexClient();
  await importSets(supabase, tcgdexClient, options);
}

main().catch((err) => {
  console.error('[tcgdex][sets] fatal error:', err);
  process.exit(1);
});
