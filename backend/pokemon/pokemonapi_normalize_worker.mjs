// backend/pokemon/pokemonapi_normalize_worker.mjs
//
// Normalizes PokemonAPI raw_imports into sets, card_prints, traits, and external_ids.
// No pricing fields are touched.

// Load environment variables
import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { ensurePokemonApiMapping, getPokemonApiId } from './pokemonapi_mapping_helpers.mjs';

const SOURCE = 'pokemonapi';
const BATCH_SIZE = 10000;

function todayIso() {
  return new Date().toISOString();
}

function toDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function numberPlain(number) {
  if (!number) return null;
  const digits = String(number).replace(/[^0-9]/g, '');
  return digits || null;
}

function deriveVariantKey(number) {
  if (!number) return '';
  const letters = String(number).replace(/[0-9]/g, '');
  return letters || '';
}

function mergeJson(base, patch) {
  const out = { ...(base || {}) };
  Object.entries(patch || {}).forEach(([k, v]) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = mergeJson(out[k], v);
    } else {
      out[k] = v;
    }
  });
  return out;
}

async function markRawImport(supabase, id, status) {
  await supabase
    .from('raw_imports')
    .update({ status, processed_at: todayIso() })
    .eq('id', id);
}

async function insertConflict(supabase, rawImportId, reason) {
  try {
    await supabase.from('mapping_conflicts').insert([
      {
        raw_import_id: rawImportId,
        reason,
        requires_human: true,
        created_at: todayIso(),
      },
    ]);
  } catch (err) {
    console.warn('[pokemonapi][normalize] conflict insert failed:', err.message ?? err);
  }
}

async function fetchPending(supabase, kind) {
  const { data, error } = await supabase
    .from('raw_imports')
    .select('id, payload, source, status')
    .eq('source', SOURCE)
    .eq('payload->>_kind', kind)
    .eq('status', 'pending')
    .order('ingested_at', { ascending: true })
    .limit(BATCH_SIZE);
  if (error) throw error;
  return data ?? [];
}

async function resolveSet(supabase, payload) {
  const externalId = payload?.id || payload?._external_id;
  const ptcgo = payload?.ptcgoCode;
  const candidates = [];

  const codes = [externalId, ptcgo].filter(Boolean);
  if (codes.length > 0) {
    const { data, error } = await supabase
      .from('sets')
      .select('id, code, name, release_date, logo_url, symbol_url, source')
      .eq('game', 'pokemon')
      .in('code', codes);
    if (error) throw error;
    candidates.push(...(data ?? []));
  }

  if (candidates.length === 0 && externalId) {
    const { data, error } = await supabase
      .from('sets')
      .select('id, code, name, release_date, logo_url, symbol_url, source')
      .eq('game', 'pokemon')
      .eq('source->pokemonapi->>id', externalId);
    if (error) throw error;
    candidates.push(...(data ?? []));
  }

  const deduped = [];
  const seen = new Set();
  for (const c of candidates) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    deduped.push(c);
  }
  return deduped;
}

async function upsertSet(supabase, raw) {
  const payload = raw.payload || {};
  const externalId = payload.id || payload._external_id;
  if (!externalId) {
    await markRawImport(supabase, raw.id, 'error');
    return;
  }

  const matches = await resolveSet(supabase, payload);
  if (matches.length > 1) {
    await insertConflict(
      supabase,
      raw.id,
      `multiple set candidates for ${externalId} (${matches.length})`,
    );
    await markRawImport(supabase, raw.id, 'conflict');
    return;
  }

  const releaseDate = toDateOnly(payload.releaseDate);
  const pokemonSource = {
    id: externalId,
    name: payload.name,
    series: payload.series,
    printedTotal: payload.printedTotal,
    total: payload.total,
    releaseDate: payload.releaseDate,
    ptcgoCode: payload.ptcgoCode,
    images: payload.images ?? {},
  };

  if (matches.length === 1) {
    const current = matches[0];
    const updates = {};
    if (payload.name && current.name !== payload.name) updates.name = payload.name;
    if (releaseDate && !current.release_date) updates.release_date = releaseDate;
    if (payload.images?.logo && (!current.logo_url || current.logo_url.trim() === '')) {
      updates.logo_url = payload.images.logo;
    }
    if (payload.images?.symbol && (!current.symbol_url || current.symbol_url.trim() === '')) {
      updates.symbol_url = payload.images.symbol;
    }
    updates.source = mergeJson(current.source, { pokemonapi: pokemonSource });
    if (Object.keys(updates).length > 0) {
      updates.updated_at = todayIso();
      const { error: updateError } = await supabase
        .from('sets')
        .update(updates)
        .eq('id', current.id);
      if (updateError) {
        console.warn('[pokemonapi][normalize] set update failed:', updateError.message ?? updateError);
      }
    }
    await markRawImport(supabase, raw.id, 'normalized');
    return current.id;
  }

  const insertPayload = {
    game: 'pokemon',
    code: externalId,
    name: payload.name ?? externalId,
    release_date: releaseDate,
    logo_url: payload.images?.logo ?? null,
    symbol_url: payload.images?.symbol ?? null,
    source: { pokemonapi: pokemonSource },
  };

  const { data: inserted, error: insertError } = await supabase
    .from('sets')
    .insert(insertPayload)
    .select('id')
    .single();
  if (insertError) {
    console.error('[pokemonapi][normalize] set insert failed:', insertError.message ?? insertError);
    await markRawImport(supabase, raw.id, 'error');
    return;
  }

  await markRawImport(supabase, raw.id, 'normalized');
  return inserted?.id;
}

async function ensureTrait(supabase, cardPrintId, traitType, traitValue, source = SOURCE) {
  const { data: existing, error } = await supabase
    .from('card_print_traits')
    .select('id')
    .eq('card_print_id', cardPrintId)
    .eq('trait_type', traitType)
    .eq('trait_value', traitValue)
    .eq('source', source)
    .limit(1);
  if (error) throw error;
  if (existing && existing.length > 0) return;
  const { error: insertError } = await supabase.from('card_print_traits').insert([
    {
      card_print_id: cardPrintId,
      trait_type: traitType,
      trait_value: traitValue,
      source,
      created_at: todayIso(),
    },
  ]);
  if (insertError) throw insertError;
}

function buildAiMetadata(existing, payload) {
  const addition = {
    pokemonapi: {
      legalities: payload.legalities ?? {},
      flavor_text: payload.flavorText ?? null,
    },
  };
  return mergeJson(existing || {}, addition);
}

function mergeExternalIds(existing, pokemonId) {
  const base = existing && typeof existing === 'object' ? existing : {};
  if (base.pokemonapi === pokemonId) return base;
  return { ...base, pokemonapi: pokemonId };
}

function shouldUpgradeImage(currentSource) {
  // Conservative: allow upgrade when currentSource is missing or blank.
  return !currentSource || currentSource.trim() === '';
}

async function resolveCardPrint(supabase, setId, cardId, numberFull, numberPlainValue) {
  // First, by external_ids->pokemonapi
  const { data: byExt, error: byExtError } = await supabase
    .from('card_prints')
    .select(
      'id, set_id, number, variant_key, external_ids, image_url, image_alt_url, image_source, rarity, regulation_mark, artist, ai_metadata, variants',
    )
    .eq('external_ids->>pokemonapi', cardId)
    .eq('set_id', setId)
    .limit(2);
  if (byExtError) throw byExtError;
  if (byExt && byExt.length === 1) return { match: byExt[0], multiple: false };
  if (byExt && byExt.length > 1) return { match: null, multiple: true };

  // Next by set + number
  const { data: byNumber, error: numberError } = await supabase
    .from('card_prints')
    .select(
      'id, set_id, number, variant_key, external_ids, image_url, image_alt_url, image_source, rarity, regulation_mark, artist, ai_metadata, variants',
    )
    .eq('set_id', setId)
    .eq('number', numberFull)
    .limit(2);
  if (numberError) throw numberError;
  if (byNumber && byNumber.length === 1) return { match: byNumber[0], multiple: false };
  if (byNumber && byNumber.length > 1) return { match: null, multiple: true };

  if (numberPlainValue) {
    const { data: byPlain, error: plainError } = await supabase
      .from('card_prints')
      .select(
        'id, set_id, number, variant_key, external_ids, image_url, image_alt_url, image_source, rarity, regulation_mark, artist, ai_metadata, variants',
      )
      .eq('set_id', setId)
      .eq('number_plain', numberPlainValue)
      .limit(2);
    if (plainError) throw plainError;
    if (byPlain && byPlain.length === 1) return { match: byPlain[0], multiple: false };
    if (byPlain && byPlain.length > 1) return { match: null, multiple: true };
  }

  return { match: null, multiple: false };
}

async function upsertCardPrint(supabase, card, setId) {
  const cardId = card.id || card._external_id;
  const numberFull = card.number ?? null;
  const numPlain = numberPlain(numberFull);
  const variantKey = deriveVariantKey(numberFull);

  const { match, multiple } = await resolveCardPrint(
    supabase,
    setId,
    cardId,
    numberFull,
    numPlain,
  );

  if (multiple) return { status: 'conflict', id: null, reason: 'multiple candidate card_prints' };

  const imageLarge = card.images?.large ?? null;
  const imageSmall = card.images?.small ?? null;
  const imageUrl = imageLarge || imageSmall || null;
  const imageAlt = imageSmall || imageLarge || null;

  const sharedFields = {
    rarity: card.rarity ?? null,
    regulation_mark: card.regulationMark ?? null,
    artist: card.artist ?? null,
  };

  if (!match) {
    const insertPayload = {
      set_id: setId,
      name: card.name ?? cardId,
      number: numberFull,
      variant_key: variantKey,
      image_url: imageUrl,
      image_alt_url: imageAlt,
      image_source: imageUrl ? SOURCE : null,
      external_ids: mergeExternalIds(null, cardId),
      ai_metadata: buildAiMetadata(null, card),
      ...sharedFields,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('card_prints')
      .insert(insertPayload)
      .select('id')
      .single();
    if (insertError) {
      return { status: 'error', id: null, reason: insertError.message ?? insertError };
    }
    return { status: 'inserted', id: inserted?.id };
  }

  const updates = {};
  updates.external_ids = mergeExternalIds(match.external_ids, cardId);
  if (sharedFields.regulation_mark && !match.regulation_mark) {
    updates.regulation_mark = sharedFields.regulation_mark;
  }
  if (sharedFields.artist && !match.artist) {
    updates.artist = sharedFields.artist;
  }
  if (sharedFields.rarity && (!match.rarity || match.rarity.trim() === '')) {
    updates.rarity = sharedFields.rarity;
  }
  updates.ai_metadata = buildAiMetadata(match.ai_metadata, card);

  if (imageUrl && (shouldUpgradeImage(match.image_source) || !match.image_url)) {
    updates.image_url = imageUrl;
    updates.image_alt_url = imageAlt;
    updates.image_source = SOURCE;
  }

  // Avoid updating if nothing changed beyond external_ids/metadata merges
  const { error: updateError } = await supabase
    .from('card_prints')
    .update(updates)
    .eq('id', match.id);
  if (updateError) {
    return { status: 'error', id: null, reason: updateError.message ?? updateError };
  }

  return { status: 'updated', id: match.id };
}

async function normalizeCardTraits(supabase, cardPrintId, card) {
  const tasks = [];
  const add = (fn) => tasks.push(fn);

  if (Array.isArray(card.types)) {
    for (const t of card.types.filter(Boolean)) {
      add(() => ensureTrait(supabase, cardPrintId, 'pokemon:type', t, SOURCE));
    }
  }
  if (card.supertype) {
    add(() =>
      ensureTrait(supabase, cardPrintId, 'pokemon:supertype', card.supertype, SOURCE),
    );
  }
  if (Array.isArray(card.subtypes)) {
    for (const st of card.subtypes.filter(Boolean)) {
      add(() => ensureTrait(supabase, cardPrintId, 'pokemon:subtype', st, SOURCE));
    }
  }
  const legalities = card.legalities || {};
  if (legalities.standard === 'Legal') {
    add(() => ensureTrait(supabase, cardPrintId, 'pokemon:legal', 'standard', SOURCE));
  }
  if (legalities.expanded === 'Legal') {
    add(() => ensureTrait(supabase, cardPrintId, 'pokemon:legal', 'expanded', SOURCE));
  }

  for (const fn of tasks) {
    await fn();
  }
}

async function normalizeSets(supabase) {
  const raws = await fetchPending(supabase, 'set');
  let normalized = 0;
  let conflicts = 0;
  let errors = 0;

  for (const raw of raws) {
    try {
      await upsertSet(supabase, raw);
      const { data: statusRow, error: statusErr } = await supabase
        .from('raw_imports')
        .select('status')
        .eq('id', raw.id)
        .single();
      if (statusErr) throw statusErr;
      if (statusRow?.status === 'conflict') conflicts += 1;
      else if (statusRow?.status === 'normalized') normalized += 1;
    } catch (err) {
      errors += 1;
      console.error('[pokemonapi][normalize] set error:', err.message ?? err);
      await markRawImport(supabase, raw.id, 'error');
    }
  }

  return { normalized, conflicts, errors, processed: raws.length };
}

async function normalizeCards(supabase) {
  const raws = await fetchPending(supabase, 'card');
  let normalized = 0;
  let conflicts = 0;
  let errors = 0;

  for (const raw of raws) {
    const card = raw.payload || {};
    try {
      const setCandidates = await resolveSet(supabase, card.set || {});
      if (setCandidates.length !== 1) {
        conflicts += 1;
        await insertConflict(
          supabase,
          raw.id,
          setCandidates.length === 0
            ? `no set match for card ${card.id}`
            : `multiple set matches for card ${card.id}`,
        );
        await markRawImport(supabase, raw.id, 'conflict');
        continue;
      }

      const setId = setCandidates[0].id;
      const { status, id: cardPrintId, reason } = await upsertCardPrint(
        supabase,
        card,
        setId,
      );

      if (status === 'conflict') {
        conflicts += 1;
        await insertConflict(
          supabase,
          raw.id,
          reason || `card ${card.id} has ambiguous match`,
        );
        await markRawImport(supabase, raw.id, 'conflict');
        continue;
      }

      if (status === 'error' || !cardPrintId) {
        errors += 1;
        await markRawImport(supabase, raw.id, 'error');
        continue;
      }

      await normalizeCardTraits(supabase, cardPrintId, card);
      await ensurePokemonApiMapping(supabase, cardPrintId, getPokemonApiId(card));
      await markRawImport(supabase, raw.id, 'normalized');
      normalized += 1;
    } catch (err) {
      errors += 1;
      console.error('[pokemonapi][normalize] card error:', err.message ?? err);
      await markRawImport(supabase, raw.id, 'error');
    }
  }

  return { normalized, conflicts, errors, processed: raws.length };
}

async function logRun(supabase, stats) {
  try {
    await supabase.from('admin.import_runs').insert([
      {
        kind: 'pokemonapi_normalize',
        scope: { batch_size: BATCH_SIZE },
        status: 'success',
        finished_at: todayIso(),
        source: SOURCE,
        counts: stats,
      },
    ]);
  } catch (err) {
    console.warn('[pokemonapi][normalize] Failed to log admin.import_runs:', err.message ?? err);
  }
}

async function main() {
  const supabase = createBackendClient();

  const { data: pendingRows, error: pendingError } = await supabase
    .from('raw_imports')
    .select('*')
    .eq('source', SOURCE)
    .eq('status', 'pending')
    .limit(BATCH_SIZE);
  if (pendingError) throw pendingError;
  if (!pendingRows || pendingRows.length === 0) {
    console.log('[pokemonapi][normalize] no pending rows; exiting');
    return;
  }

  const setStats = await normalizeSets(supabase);
  const cardStats = await normalizeCards(supabase);

  await logRun(supabase, { sets: setStats, cards: cardStats });

  console.log('[pokemonapi][normalize] complete', { sets: setStats, cards: cardStats });
}

main().catch((err) => {
  console.error('[pokemonapi][normalize] Unhandled error:', err);
  process.exit(1);
});
