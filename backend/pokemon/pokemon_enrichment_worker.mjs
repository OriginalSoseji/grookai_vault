// backend/pokemon/pokemon_enrichment_worker.mjs
//
// Enriches Pokemon card_prints with PokemonAPI-aligned traits (hp, national dex, types, rarity, supertype, card_category).
// Canonical trait surface: card_print_traits (shared with normalize workers). Legacy columns on card_prints (e.g. rarity)
// are treated as inputs only; PokemonAPI values overwrite the trait surface while preserving prior rarity in legacy_rarity.
// Enrichment is idempotent and non-destructive to identity (set_id/number/name).

// Load environment variables
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  ensurePokemonApiMapping,
  getPokemonApiId,
  resolveCardPrint,
  resolveSet,
} from './pokemonapi_mapping_helpers.mjs';
import { extractTypesRarityCategory } from './pokemonapi_trait_extractors.mjs';

const SOURCE = 'pokemonapi';
const PAGE_SIZE = 200;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'backfill',
    dryRun: false,
    limit: null,
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--mode' && args[i + 1]) {
      options.mode = args[i + 1];
      i += 1;
    } else if (token === '--dry-run') {
      options.dryRun = true;
    } else if (token === '--limit' && args[i + 1]) {
      const asNum = Number(args[i + 1]);
      if (!Number.isNaN(asNum)) options.limit = asNum;
      i += 1;
    }
  }

  return options;
}

function extractHpAndDexFromPayload(payload) {
  const data = payload?.data ?? payload;
  let hp = null;
  let nationalDex = null;

  if (data?.hp != null) {
    const hpInt = parseInt(data.hp, 10);
    if (Number.isFinite(hpInt)) hp = hpInt;
  }

  if (Array.isArray(data?.nationalPokedexNumbers) && data.nationalPokedexNumbers.length > 0) {
    const dexInt = parseInt(String(data.nationalPokedexNumbers[0]), 10);
    if (Number.isFinite(dexInt)) nationalDex = dexInt;
  }

  return { hp, nationalDex };
}

async function upsertTraitsForCardPrint(
  supabase,
  cardPrintId,
  { hp, nationalDex, types, rarity, supertype, cardCategory },
) {
  const { data: existing, error } = await supabase
    .from('card_print_traits')
    .select(
      'id, hp, national_dex, types, rarity, supertype, card_category, legacy_rarity, trait_type, trait_value, source',
    )
    .eq('card_print_id', cardPrintId)
    .maybeSingle();
  if (error) {
    console.warn(`[enrich] read traits failed for ${cardPrintId}:`, error.message ?? error);
    return { updated: false };
  }

  const next = { card_print_id: cardPrintId };
  const ensureTraitType = existing?.trait_type || 'pokemon:stats';
  const ensureTraitValue = existing?.trait_value || 'pokemonapi';

  if (hp != null && existing?.hp == null) next.hp = hp;
  if (nationalDex != null && existing?.national_dex == null) next.national_dex = nationalDex;
  if (types && types.length > 0) next.types = types;
  if (supertype) next.supertype = supertype;
  if (cardCategory) next.card_category = cardCategory;

  if (rarity) {
    if (existing?.rarity && existing.rarity !== rarity && !existing.legacy_rarity) {
      next.legacy_rarity = existing.rarity;
      console.warn(
        `[enrich] rarity mismatch, preserving legacy_rarity='${existing.rarity}' and setting rarity='${rarity}' for ${cardPrintId}`,
      );
    }
    next.rarity = rarity;
  }
  if (!existing?.trait_type) next.trait_type = ensureTraitType;
  if (!existing?.trait_value) next.trait_value = ensureTraitValue;
  if (!existing?.source) next.source = SOURCE;

  const keys = Object.keys(next).filter((k) => k !== 'card_print_id');
  if (existing) {
    const updateKeys = keys.filter((k) => next[k] !== undefined);
    if (updateKeys.length === 0) return { updated: false };
    const { error: updateError } = await supabase
      .from('card_print_traits')
      .update(next)
      .eq('id', existing.id);
    if (updateError) {
      console.warn(`[enrich] update traits failed for ${cardPrintId}:`, updateError.message ?? updateError);
      return { updated: false };
    }
    return { updated: true };
  }

  if (keys.length === 0) return { updated: false };
  const insertPayload = {
    ...next,
    trait_type: ensureTraitType,
    trait_value: ensureTraitValue,
    source: SOURCE,
  };
  const { error: insertError } = await supabase.from('card_print_traits').insert(insertPayload);
  if (insertError) {
    console.warn(`[enrich] insert traits failed for ${cardPrintId}:`, insertError.message ?? insertError);
    return { updated: false };
  }
  return { updated: true };
}

async function resolveCardPrintId(supabase, card) {
  const externalId = getPokemonApiId(card);
  if (externalId) {
    const { data: mapped, error: mapErr } = await supabase
      .from('external_mappings')
      .select('card_print_id')
      .eq('source', SOURCE)
      .eq('external_id', externalId)
      .maybeSingle();
    if (!mapErr && mapped?.card_print_id) {
      return mapped.card_print_id;
    }
  }

  const setInfo = await resolveSet(supabase, card.set || {});
  if (!setInfo?.id) return null;
  const { match: cp, multiple } = await resolveCardPrint(supabase, card, setInfo.id);
  if (multiple || !cp?.id) return null;
  if (externalId) {
    await ensurePokemonApiMapping(supabase, cp.id, externalId);
  }
  return cp.id;
}

async function enrichFromRawImports(supabase, { limit, dryRun }) {
  let fetched = 0;
  let processed = 0;
  let updated = 0;
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
      const { hp, nationalDex } = extractHpAndDexFromPayload(card);
      const { types, rarity, supertype, cardCategory } = extractTypesRarityCategory(card);
      if (hp == null && nationalDex == null && !types && !rarity && !supertype && !cardCategory) continue;

      const cardPrintId = await resolveCardPrintId(supabase, card);
      if (!cardPrintId) {
        unmatched += 1;
        continue;
      }

      processed += 1;
      if (dryRun) {
        console.log(
          `[DRY RUN] card_print ${cardPrintId} hp=${hp ?? 'null'} dex=${nationalDex ?? 'null'} rarity=${
            rarity ?? 'null'
          } types=${types ? types.join('|') : 'null'} supertype=${supertype ?? 'null'} category=${
            cardCategory ?? 'null'
          }`,
        );
        continue;
      }

      const didUpdate = await upsertTraitsForCardPrint(supabase, cardPrintId, {
        hp,
        nationalDex,
        types,
        rarity,
        supertype,
        cardCategory,
      });
      if (didUpdate) updated += 1;
    }

    if (raws.length < pageSize) break;
  }

  console.log(
    `[enrich] complete: fetched=${fetched}, matched=${processed}, updated=${updated}, unmatched=${unmatched}, dryRun=${dryRun}`,
  );
}

async function main() {
  const options = parseArgs();
  const supabase = createBackendClient();

  console.log('[enrich] starting pokemon enrichment worker with options:', options);

  if (options.mode === 'backfill') {
    await enrichFromRawImports(supabase, options);
  } else {
    console.error(`[enrich] unknown mode: ${options.mode}`);
    process.exitCode = 1;
  }

  console.log('[enrich] finished pokemon enrichment worker');
}

main().catch((err) => {
  console.error('[enrich] fatal error:', err);
  process.exitCode = 1;
});
