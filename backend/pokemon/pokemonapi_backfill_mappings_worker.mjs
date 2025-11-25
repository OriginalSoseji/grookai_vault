// backend/pokemon/pokemonapi_backfill_mappings_worker.mjs
//
// Backfills external_mappings for PokemonAPI cards by resolving raw_imports -> card_prints.
// Idempotent and safe to re-run (upsert on source, external_id).

// Load environment variables
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  ensurePokemonApiMapping,
  getPokemonApiId,
  resolveCardPrint,
  resolveSet,
} from './pokemonapi_mapping_helpers.mjs';

const SOURCE = 'pokemonapi';
const PAGE_SIZE = 200;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    limit: null,
  };
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--dry-run') {
      options.dryRun = true;
    } else if (token === '--limit' && args[i + 1]) {
      const n = Number(args[i + 1]);
      if (!Number.isNaN(n)) options.limit = n;
      i += 1;
    }
  }
  return options;
}

async function backfillMappings(supabase, { dryRun, limit }) {
  let fetched = 0;
  let mapped = 0;
  let unmatched = 0;

  for (;;) {
    if (limit != null && fetched >= limit) break;
    const remaining = limit != null ? Math.max(0, limit - fetched) : PAGE_SIZE;
    const pageSize = limit != null ? Math.min(PAGE_SIZE, remaining) : PAGE_SIZE;
    if (pageSize === 0) break;

    const { data: raws, error } = await supabase
      .from('raw_imports')
      .select('id, payload')
      .eq('source', SOURCE)
      .eq('payload->>_kind', 'card')
      .eq('status', 'normalized')
      .order('id', { ascending: true })
      .range(fetched, fetched + pageSize - 1);
    if (error) throw error;
    if (!raws || raws.length === 0) break;

    for (const row of raws) {
      fetched += 1;
      const card = row.payload || {};
      const externalId = getPokemonApiId(card);
      if (!externalId) {
        unmatched += 1;
        continue;
      }

      const setInfo = await resolveSet(supabase, card.set || {});
      if (!setInfo?.id) {
        unmatched += 1;
        continue;
      }

      const { match: cardPrint, multiple } = await resolveCardPrint(supabase, card, setInfo.id);
      if (multiple || !cardPrint?.id) {
        unmatched += 1;
        continue;
      }

      if (dryRun) {
        console.log(`[DRY RUN] pokemonapi:${externalId} -> card_print ${cardPrint.id}`);
      } else {
        await ensurePokemonApiMapping(supabase, cardPrint.id, externalId);
      }
      mapped += 1;
      if (limit != null && fetched >= limit) break;
    }

    if (raws.length < pageSize) break;
  }

  console.log(
    `[pokemonapi][backfill-mappings] complete: fetched=${fetched}, mapped=${mapped}, unmatched=${unmatched}, dryRun=${dryRun}`,
  );
}

async function main() {
  const options = parseArgs();
  const supabase = createBackendClient();
  console.log('[pokemonapi][backfill-mappings] start', options);
  await backfillMappings(supabase, options);
  console.log('[pokemonapi][backfill-mappings] done');
}

main().catch((err) => {
  console.error('[pokemonapi][backfill-mappings] fatal:', err);
  process.exitCode = 1;
});
