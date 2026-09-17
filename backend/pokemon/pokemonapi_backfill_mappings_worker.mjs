// backend/pokemon/pokemonapi_backfill_mappings_worker.mjs
//
// Reviews PokemonAPI mapping candidates. Existing matches are not identity authority.

// Load environment variables
import { assertLegacyPokemonReviewOnly } from '../maintenance/legacy_pokemon_ingestion_admission_v1.mjs';
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  getPokemonApiId,
  resolveCardPrint,
  resolveSet,
} from './pokemonapi_mapping_helpers.mjs';

const SOURCE = 'pokemonapi';
const PAGE_SIZE = 200;

function parseArgs() {
  return assertLegacyPokemonReviewOnly();
}

async function backfillMappings(supabase, { dryRun, limit }) {
  let fetched = 0;
  let candidates = 0;
  let unmatched = 0;
  const seen = new Set();

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
    if (raws.length > pageSize) throw new Error('oversized_review_page');
    for (const row of raws) {
      if (row.id == null || seen.has(String(row.id))) throw new Error('duplicate_or_missing_review_raw_id');
      seen.add(String(row.id));
    }

    for (const row of raws) {
      fetched += 1;
      const card = row.payload || {};
      const externalId = getPokemonApiId(card);
      if (!externalId) {
        unmatched += 1;
        console.log(JSON.stringify({ status: 'requires_master_index_review', outcome: 'missing_source_id',
          raw_import_id: row.id, source_payload: card, database_writes: 0, write_ready: false }));
        continue;
      }

      const setInfo = await resolveSet(supabase, card.set || {});
      if (!setInfo?.id) {
        unmatched += 1;
        console.log(JSON.stringify({ status: 'requires_master_index_review', outcome: 'unresolved_set',
          raw_import_id: row.id, source_payload: card, database_writes: 0, write_ready: false }));
        continue;
      }

      const { match: cardPrint, multiple } = await resolveCardPrint(supabase, card, setInfo.id);
      if (multiple || !cardPrint?.id) {
        unmatched += 1;
        console.log(JSON.stringify({ status: 'requires_master_index_review', outcome: 'unresolved_parent',
          raw_import_id: row.id, source_payload: card, database_writes: 0, write_ready: false }));
        continue;
      }

      console.log(JSON.stringify({ status: 'requires_master_index_review', raw_import_id: row.id,
          candidate_card_print_id: cardPrint.id, source_payload: card, database_writes: 0, write_ready: false }));
      candidates += 1;
      if (limit != null && fetched >= limit) break;
    }

    if (raws.length < pageSize) break;
  }

  console.log(
    `[pokemonapi][backfill-mappings] complete: fetched=${fetched}, candidates=${candidates}, unmatched=${unmatched}, dryRun=${dryRun}, database_writes=0`,
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
