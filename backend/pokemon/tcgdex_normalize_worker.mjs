// backend/pokemon/tcgdex_normalize_worker.mjs
//
// Normalizes TCGdex raw_imports into canonical sets + card_prints + traits.
// Mirrors pokemonapi_normalize_worker behavior while keeping writes namespaced under source='tcgdex'.

import { createBackendClient } from '../supabase_backend_client.mjs';

const SOURCE = 'tcgdex';
const IMAGE_SOURCE = 'tcgdex';
const BATCH_SIZE = 1000;
const TRAIT_TYPE = 'pokemon:stats';
const TRAIT_VALUE = 'tcgdex';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'backfill',
    limit: null,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--limit' && args[i + 1]) {
      const value = Number(args[i + 1]);
      if (!Number.isNaN(value)) options.limit = value;
      i += 1;
    } else if (token === '--dry-run') {
      options.dryRun = true;
    } else if (token.startsWith('--mode')) {
      if (token.includes('=')) {
        options.mode = token.split('=')[1] || options.mode;
      } else if (args[i + 1]) {
        options.mode = args[i + 1];
        i += 1;
      }
    }
  }

  return options;
}

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
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = mergeJson(out[key], value);
    } else {
      out[key] = value;
    }
  });
  return out;
}

async function markRawImport(supabase, id, status, options) {
  if (options.dryRun) {
    console.log(`[tcgdex][normalize][dry-run] would mark raw_import ${id} as ${status}`);
    return;
  }
  await supabase
    .from('raw_imports')
    .update({ status, processed_at: todayIso() })
    .eq('id', id);
}

async function insertConflict(supabase, rawImportId, reason, options) {
  if (options.dryRun) {
    console.log(`[tcgdex][normalize][dry-run] would insert conflict for raw_import ${rawImportId}: ${reason}`);
    return;
  }
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
    console.warn('[tcgdex][normalize] conflict insert failed:', err?.message ?? err);
  }
}

async function fetchPendingBatch(supabase, kind, batchSize) {
  const limit = Math.max(1, Math.min(batchSize, BATCH_SIZE));
  const { data, error } = await supabase
    .from('raw_imports')
    .select('id, payload, status')
    .eq('source', SOURCE)
    .eq('payload->>_kind', kind)
    .eq('status', 'pending')
    .order('ingested_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

function collectSetCodes(payload) {
  const setData = payload?.set ?? payload ?? {};
  const candidates = [
    payload?._external_id,
    setData?.id,
    setData?.slug,
    setData?.abbreviation,
    setData?.code,
    setData?.ptcgoCode,
  ];
  return Array.from(
    new Set(
      candidates
        .map((value) => (typeof value === 'string' ? value.trim() : value))
        .filter((value) => typeof value === 'string' && value.length > 0),
    ),
  );
}

async function resolveSetCandidates(supabase, payload) {
  const setData = payload?.set ?? payload ?? {};
  const externalId = payload?._external_id || setData?.id || null;
  const codes = collectSetCodes(payload);
  const candidates = [];

  if (codes.length > 0) {
    const { data, error } = await supabase
      .from('sets')
      .select('id, code, name, release_date, logo_url, symbol_url, source')
      .eq('game', 'pokemon')
      .in('code', codes);
    if (error) throw error;
    candidates.push(...(data ?? []));
  }

  if (externalId) {
    const { data, error } = await supabase
      .from('sets')
      .select('id, code, name, release_date, logo_url, symbol_url, source')
      .eq('game', 'pokemon')
      .eq('source->tcgdex->>id', externalId);
    if (error) throw error;
    candidates.push(...(data ?? []));
  }

  const deduped = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    deduped.push(candidate);
  }
  return deduped;
}

function buildTcgdexSetSource(setData, externalId) {
  return {
    id: externalId,
    slug: setData?.slug ?? null,
    name: setData?.name ?? null,
    series: setData?.serie ?? setData?.series ?? null,
    printedTotal: setData?.printedTotal ?? null,
    total: setData?.total ?? null,
    releaseDate: setData?.releaseDate ?? setData?.releasedAt ?? null,
    symbols: setData?.images ?? null,
    raw: setData,
  };
}

function extractSetLogos(setData) {
  const images = setData?.images || {};
  return {
    logo: images.logo ?? images.symbols?.logo ?? null,
    symbol: images.symbol ?? images.symbols?.symbol ?? null,
  };
}

async function upsertSet(supabase, raw, options) {
  const payload = raw.payload || {};
  const setData = payload.set || payload;
  const externalId = payload._external_id || setData?.id;
  if (!externalId) {
    console.warn(`[tcgdex][normalize] set raw_import ${raw.id} missing external id`);
    await markRawImport(supabase, raw.id, 'error', options);
    return { status: 'error' };
  }

  const matches = await resolveSetCandidates(supabase, payload);
  if (matches.length > 1) {
    const reason = `[set_resolution_tcgdex] multiple set candidates: ids=${matches
      .map((m) => m.id)
      .join(',')}`;
    await insertConflict(supabase, raw.id, reason, options);
    await markRawImport(supabase, raw.id, 'conflict', options);
    return { status: 'conflict' };
  }

  const releaseDate =
    toDateOnly(setData?.releaseDate) ||
    toDateOnly(setData?.releasedAt) ||
    toDateOnly(setData?.release_date);
  const logos = extractSetLogos(setData);
  const sourcePatch = { tcgdex: buildTcgdexSetSource(setData, externalId) };
  // NOTE: TCGdex set external ids currently live under sets.source.tcgdex.
  // If we later standardize set-level external_mappings, hook the upsert here.

  if (matches.length === 1) {
    const current = matches[0];
    const updates = {
      source: mergeJson(current.source, sourcePatch),
    };
    if (setData?.name && current.name !== setData.name) updates.name = setData.name;
    if (releaseDate && !current.release_date) updates.release_date = releaseDate;
    if (logos.logo && (!current.logo_url || current.logo_url.trim() === '')) {
      updates.logo_url = logos.logo;
    }
    if (logos.symbol && (!current.symbol_url || current.symbol_url.trim() === '')) {
      updates.symbol_url = logos.symbol;
    }

    if (options.dryRun) {
      console.log(
        `[tcgdex][normalize][dry-run] would update set ${current.id} (${current.code}) with tcgdex payload`,
      );
    } else if (Object.keys(updates).length > 0) {
      updates.updated_at = todayIso();
      const { error: updateError } = await supabase
        .from('sets')
        .update(updates)
        .eq('id', current.id);
      if (updateError) {
        console.error('[tcgdex][normalize] set update failed:', updateError?.message ?? updateError);
        await markRawImport(supabase, raw.id, 'error', options);
        return { status: 'error' };
      }
    }

    await markRawImport(supabase, raw.id, 'normalized', options);
    return { status: 'normalized', setId: current.id };
  }

  const codeCandidates = collectSetCodes(payload);
  const uniqueCodes = Array.from(
    new Set(codeCandidates.filter((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)),
  );
  if (uniqueCodes.length > 1) {
    const reason = `[tcgdex_set_code_collision] multiple candidate codes: ${uniqueCodes.join(',')}`;
    console.warn('[tcgdex][normalize]', reason);
    await insertConflict(supabase, raw.id, reason, options);
    await markRawImport(supabase, raw.id, 'conflict', options);
    return { status: 'conflict' };
  }

  const resolvedCode = uniqueCodes[0] || externalId;

  const insertPayload = {
    game: 'pokemon',
    code: resolvedCode,
    name: setData?.name ?? externalId,
    release_date: releaseDate,
    logo_url: logos.logo ?? null,
    symbol_url: logos.symbol ?? null,
    source: sourcePatch,
  };

  if (options.dryRun) {
    console.log(
      `[tcgdex][normalize][dry-run] would insert new set code=${insertPayload.code} name=${insertPayload.name}`,
    );
    await markRawImport(supabase, raw.id, 'normalized', options);
    return { status: 'normalized' };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('sets')
    .insert(insertPayload)
    .select('id')
    .single();
  if (insertError) {
    console.error('[tcgdex][normalize] set insert failed:', insertError?.message ?? insertError);
    await markRawImport(supabase, raw.id, 'error', options);
    return { status: 'error' };
  }

  await markRawImport(supabase, raw.id, 'normalized', options);
  return { status: 'normalized', setId: inserted?.id ?? null };
}

function mergeExternalIds(existing, externalId) {
  const base = existing && typeof existing === 'object' ? existing : {};
  if (!externalId) return base;
  if (base[SOURCE] === externalId) return base;
  return { ...base, [SOURCE]: externalId };
}

function buildAiMetadata(existing, cardData) {
  const addition = {
    tcgdex: {
      legalities: cardData?.legalities ?? {},
      flavor_text: cardData?.flavorText ?? cardData?.flavor ?? cardData?.description ?? null,
    },
  };
  return mergeJson(existing || {}, addition);
}

function shouldUpgradeImage(currentSource) {
  return !currentSource || currentSource.trim() === '' || currentSource === SOURCE;
}

async function resolveCardPrintMatch(supabase, setId, cardId, numberFull, numberPlainValue) {
  if (!setId) return { match: null, multiple: false };
  if (!cardId) cardId = null;

  if (cardId) {
    const { data, error } = await supabase
      .from('card_prints')
      .select(
        'id, set_id, number, variant_key, external_ids, image_url, image_alt_url, image_source, rarity, regulation_mark, artist, ai_metadata',
      )
      .eq('set_id', setId)
      .eq('external_ids->>tcgdex', cardId)
      .limit(2);
    if (error) throw error;
    if (data && data.length === 1) return { match: data[0], multiple: false };
    if (data && data.length > 1) return { match: null, multiple: true };
  }

  if (numberFull) {
    const { data, error } = await supabase
      .from('card_prints')
      .select(
        'id, set_id, number, variant_key, external_ids, image_url, image_alt_url, image_source, rarity, regulation_mark, artist, ai_metadata',
      )
      .eq('set_id', setId)
      .eq('number', numberFull)
      .limit(2);
    if (error) throw error;
    if (data && data.length === 1) return { match: data[0], multiple: false };
    if (data && data.length > 1) return { match: null, multiple: true };
  }

  if (numberPlainValue) {
    const { data, error } = await supabase
      .from('card_prints')
      .select(
        'id, set_id, number, variant_key, external_ids, image_url, image_alt_url, image_source, rarity, regulation_mark, artist, ai_metadata',
      )
      .eq('set_id', setId)
      .eq('number_plain', numberPlainValue)
      .limit(2);
    if (error) throw error;
    if (data && data.length === 1) return { match: data[0], multiple: false };
    if (data && data.length > 1) return { match: null, multiple: true };
  }

  return { match: null, multiple: false };
}

async function ensureTcgdexMapping(supabase, cardPrintId, externalId, metadata, options) {
  if (!cardPrintId || !externalId) return;
  if (options.dryRun) {
    console.log(
      `[tcgdex][normalize][dry-run] would upsert external_mapping source=${SOURCE} external_id=${externalId} -> card_print_id=${cardPrintId}`,
    );
    return;
  }
  const { error } = await supabase
    .from('external_mappings')
    .upsert(
      {
        source: SOURCE,
        external_id: externalId,
        card_print_id: cardPrintId,
        metadata: metadata || null,
      },
      { onConflict: 'source,external_id' },
    );
  if (error) {
    console.error('[tcgdex][normalize] external_mapping upsert failed:', error?.message ?? error);
  }
}

function extractTraits(cardPayload) {
  const card = cardPayload?.card ?? cardPayload?.data ?? cardPayload ?? {};
  const hpValue = card.hp ?? card.stats?.hp ?? null;
  const hp = hpValue != null ? Number.parseInt(String(hpValue), 10) : null;
  let nationalDex = null;
  const dexCandidate =
    (Array.isArray(card.nationalPokedexNumbers) && card.nationalPokedexNumbers[0]) ||
    card.dex ||
    card.dexId ||
    card.dexNumber;
  if (dexCandidate !== undefined && dexCandidate !== null) {
    const dexInt = Number.parseInt(String(dexCandidate), 10);
    if (Number.isFinite(dexInt)) nationalDex = dexInt;
  }
  const types =
    Array.isArray(card.types) && card.types.length > 0
      ? card.types.map((type) => String(type)).filter(Boolean)
      : null;
  const rarity =
    card.rarity ||
    (Array.isArray(card.rarities) && card.rarities.length > 0 ? card.rarities[0] : null) ||
    null;
  const supertype = card.supertype || card.category || null;
  const cardCategory =
    card.cardCategory ||
    card.stage ||
    (Array.isArray(card.subtypes) && card.subtypes.length > 0 ? card.subtypes[0] : null) ||
    null;
  return { hp: Number.isFinite(hp) ? hp : null, nationalDex, types, rarity, supertype, cardCategory };
}

async function upsertTraits(supabase, cardPrintId, traits, options) {
  const { hp, nationalDex, types, rarity, supertype, cardCategory } = traits;
  if (
    hp == null &&
    nationalDex == null &&
    !types &&
    !rarity &&
    !supertype &&
    !cardCategory
  ) {
    return;
  }

  if (options.dryRun) {
    console.log(
      `[tcgdex][normalize][dry-run] would upsert traits for card_print ${cardPrintId} hp=${hp ?? 'null'} dex=${
        nationalDex ?? 'null'
      } rarity=${rarity ?? 'null'} types=${types ? types.join('|') : 'null'}`,
    );
    return;
  }

  const { data: existing, error } = await supabase
    .from('card_print_traits')
    .select(
      'id, hp, national_dex, types, rarity, supertype, card_category, legacy_rarity, source, trait_type, trait_value',
    )
    .eq('card_print_id', cardPrintId)
    .maybeSingle();
  if (error) {
    console.warn('[tcgdex][normalize] trait fetch failed:', error?.message ?? error);
    return;
  }

  const next = {};
  const warnTraitConflict = (field, existingValue, newValue) => {
    if (
      existingValue !== undefined &&
      existingValue !== null &&
      newValue !== undefined &&
      newValue !== null
    ) {
      const format = (value) =>
        Array.isArray(value) ? value.join('|') : typeof value === 'object' ? JSON.stringify(value) : value;
      const currentFormatted = format(existingValue);
      const nextFormatted = format(newValue);
      if (currentFormatted !== nextFormatted) {
        console.warn(
          `[tcgdex][traits] conflict on ${field} for card_print ${cardPrintId}: existing=${currentFormatted} tcgdex=${nextFormatted} (keeping existing per precedence)`,
        );
      }
    }
  };

  if (hp != null && (existing?.hp == null || existing?.hp === 0)) next.hp = hp;
  else if (hp != null) warnTraitConflict('hp', existing?.hp, hp);
  if (nationalDex != null && existing?.national_dex == null) next.national_dex = nationalDex;
  else if (nationalDex != null) warnTraitConflict('national_dex', existing?.national_dex, nationalDex);
  if (types && types.length > 0 && (!existing?.types || existing.types.length === 0)) {
    next.types = types;
  } else if (types && types.length > 0) {
    warnTraitConflict('types', existing?.types, types);
  }
  if (supertype && !existing?.supertype) next.supertype = supertype;
  else if (supertype) warnTraitConflict('supertype', existing?.supertype, supertype);
  if (cardCategory && !existing?.card_category) next.card_category = cardCategory;
  else if (cardCategory) warnTraitConflict('card_category', existing?.card_category, cardCategory);
  if (rarity) {
    if (existing?.rarity && existing.rarity !== rarity && !existing.legacy_rarity) {
      next.legacy_rarity = existing.rarity;
      warnTraitConflict('rarity', existing.rarity, rarity);
    }
    if (!existing?.rarity) next.rarity = rarity;
  }

  if (existing) {
    if (Object.keys(next).length === 0) return;
    const patch = {
      ...next,
    };
    if (!existing.trait_type) patch.trait_type = TRAIT_TYPE;
    if (!existing.trait_value) patch.trait_value = TRAIT_VALUE;
    if (!existing.source) patch.source = SOURCE;
    const { error: updateError } = await supabase
      .from('card_print_traits')
      .update(patch)
      .eq('id', existing.id);
    if (updateError) {
      console.warn('[tcgdex][normalize] trait update failed:', updateError?.message ?? updateError);
    }
    return;
  }

  const insertPayload = {
    card_print_id: cardPrintId,
    hp: hp ?? null,
    national_dex: nationalDex ?? null,
    types: types ?? null,
    rarity: rarity ?? null,
    supertype: supertype ?? null,
    card_category: cardCategory ?? null,
    trait_type: TRAIT_TYPE,
    trait_value: TRAIT_VALUE,
    source: SOURCE,
  };
  const { error: insertError } = await supabase.from('card_print_traits').insert(insertPayload);
  if (insertError) {
    console.warn('[tcgdex][normalize] trait insert failed:', insertError?.message ?? insertError);
  }
}

async function resolveSetForCard(supabase, cardPayload) {
  const card = cardPayload?.card ?? cardPayload ?? {};
  const setInfoArray = Array.isArray(card.sets) ? card.sets : null;
  const setInfo = card.set ?? (setInfoArray && setInfoArray.length > 0 ? setInfoArray[0] : null);
  const explicitId =
    cardPayload.set_external_id || cardPayload._set_external_id || card.setId || card.setCode;
  const candidatePayload =
    setInfo && typeof setInfo === 'object'
      ? { set: setInfo, _external_id: explicitId || setInfo.id }
      : { _external_id: explicitId };
  const matches = await resolveSetCandidates(supabase, candidatePayload);
  return { matches, requestedId: explicitId };
}

async function upsertCardPrint(supabase, raw, cardPayload, setId, options) {
  const cardData = cardPayload?.card ?? cardPayload ?? {};
  const cardId = cardData?.id || cardPayload?._external_id || raw?.payload?._external_id || null;
  const numberFull = cardData?.number ?? null;
  const numPlain = numberPlain(numberFull);
  const variantKey = deriveVariantKey(numberFull);

  const { match, multiple } = await resolveCardPrintMatch(
    supabase,
    setId,
    cardId,
    numberFull,
    numPlain,
  );
  if (multiple) {
    return { status: 'conflict', reason: 'multiple candidate card_prints' };
  }

  const primaryImage =
    cardData?.images?.large ??
    cardData?.image ??
    cardData?.hiresImage ??
    cardData?.imageUrl ??
    null;
  const secondaryImage =
    cardData?.images?.small ??
    cardData?.thumbnail ??
    cardData?.imageSmall ??
    primaryImage ??
    null;
  const imageUrl = primaryImage || secondaryImage || null;
  const imageAlt = secondaryImage || primaryImage || null;
  const sharedFields = {
    rarity: cardData?.rarity ?? null,
    regulation_mark: cardData?.regulationMark ?? cardData?.regulation_mark ?? null,
    artist: cardData?.artist ?? null,
  };

  if (!match) {
    const insertPayload = {
      set_id: setId,
      name: cardData?.name ?? cardId,
      number: numberFull,
      variant_key: variantKey,
      image_url: imageUrl,
      image_alt_url: imageAlt,
      image_source: imageUrl ? IMAGE_SOURCE : null,
      external_ids: mergeExternalIds(null, cardId),
      ai_metadata: buildAiMetadata(null, cardData),
      ...sharedFields,
    };

    if (options.dryRun) {
      console.log(
        `[tcgdex][normalize][dry-run] would insert card_print for card=${cardId} set_id=${setId}`,
      );
      return { status: 'inserted', id: null };
    }

    const { data: inserted, error: insertError } = await supabase
      .from('card_prints')
      .insert(insertPayload)
      .select('id')
      .single();
    if (insertError) {
      return { status: 'error', reason: insertError?.message ?? insertError };
    }
    return { status: 'inserted', id: inserted?.id ?? null };
  }

  const updates = {
    external_ids: mergeExternalIds(match.external_ids, cardId),
    ai_metadata: buildAiMetadata(match.ai_metadata, cardData),
  };
  if (sharedFields.regulation_mark && !match.regulation_mark) {
    updates.regulation_mark = sharedFields.regulation_mark;
  }
  if (sharedFields.artist && !match.artist) {
    updates.artist = sharedFields.artist;
  }
  if (sharedFields.rarity && (!match.rarity || match.rarity.trim() === '')) {
    updates.rarity = sharedFields.rarity;
  }
  if (imageUrl && (shouldUpgradeImage(match.image_source) || !match.image_url)) {
    updates.image_url = imageUrl;
    updates.image_alt_url = imageAlt;
    updates.image_source = IMAGE_SOURCE;
  }

  if (options.dryRun) {
    console.log(
      `[tcgdex][normalize][dry-run] would update card_print ${match.id} with tcgdex data`,
    );
    return { status: 'updated', id: match.id };
  }

  const { error: updateError } = await supabase
    .from('card_prints')
    .update(updates)
    .eq('id', match.id);
  if (updateError) {
    return { status: 'error', reason: updateError?.message ?? updateError };
  }
  return { status: 'updated', id: match.id };
}

async function normalizeSets(supabase, options) {
  const stats = { normalized: 0, conflicts: 0, errors: 0, processed: 0 };
  let remaining = options.limit ?? null;

  while (true) {
    const batchSize =
      remaining !== null ? Math.min(BATCH_SIZE, Math.max(remaining, 0)) : BATCH_SIZE;
    if (batchSize === 0) break;
    const raws = await fetchPendingBatch(supabase, 'set', batchSize);
    if (!raws || raws.length === 0) break;
    for (const raw of raws) {
      const result = await upsertSet(supabase, raw, options);
      stats.processed += 1;
      if (result?.status === 'normalized') stats.normalized += 1;
      else if (result?.status === 'conflict') stats.conflicts += 1;
      else if (result?.status === 'error') stats.errors += 1;
      if (remaining !== null) {
        remaining -= 1;
        if (remaining <= 0) break;
      }
    }
    if (raws.length < batchSize) break;
    if (remaining !== null && remaining <= 0) break;
  }

  return stats;
}

async function normalizeCards(supabase, options) {
  const stats = { normalized: 0, conflicts: 0, errors: 0, processed: 0 };
  let remaining = options.limit ?? null;

  while (true) {
    const batchSize =
      remaining !== null ? Math.min(BATCH_SIZE, Math.max(remaining, 0)) : BATCH_SIZE;
    if (batchSize === 0) break;
    const raws = await fetchPendingBatch(supabase, 'card', batchSize);
    if (!raws || raws.length === 0) break;

    for (const raw of raws) {
      const cardPayload = raw.payload || {};
      try {
        const { matches } = await resolveSetForCard(supabase, cardPayload);
        if (!matches || matches.length !== 1) {
          stats.conflicts += 1;
          const reason =
            !matches || matches.length === 0
              ? '[set_resolution_tcgdex] no set match'
              : `[set_resolution_tcgdex] multiple set matches ids=${matches
                  .map((m) => m.id)
                  .join(',')}`;
          await insertConflict(supabase, raw.id, reason, options);
          await markRawImport(supabase, raw.id, 'conflict', options);
          continue;
        }

        const setId = matches[0].id;
        const upsertResult = await upsertCardPrint(
          supabase,
          raw,
          cardPayload,
          setId,
          options,
        );
        if (upsertResult?.status === 'conflict') {
          stats.conflicts += 1;
          await insertConflict(
            supabase,
            raw.id,
            `[card_resolution_tcgdex] ${upsertResult.reason ?? 'ambiguous card match'}`,
            options,
          );
          await markRawImport(supabase, raw.id, 'conflict', options);
          continue;
        }
        if (upsertResult?.status === 'error' || !setId) {
          stats.errors += 1;
          await markRawImport(supabase, raw.id, 'error', options);
          continue;
        }

        const cardExternalId =
          cardPayload._external_id || cardPayload.card?.id || cardPayload.card?._id || null;
        await ensureTcgdexMapping(supabase, upsertResult.id, cardExternalId, null, options);
        await upsertTraits(supabase, upsertResult.id, extractTraits(cardPayload), options);
        await markRawImport(supabase, raw.id, 'normalized', options);
        stats.normalized += 1;
      } catch (err) {
        stats.errors += 1;
        console.error('[tcgdex][normalize] card error:', err?.message ?? err);
        await markRawImport(supabase, raw.id, 'error', options);
      }

      stats.processed += 1;
      if (remaining !== null) {
        remaining -= 1;
        if (remaining <= 0) break;
      }
    }

    if (remaining !== null && remaining <= 0) break;
    if (raws.length < batchSize) break;
  }

  return stats;
}

async function logRun(supabase, stats, options) {
  if (options.dryRun) return;
  try {
    await supabase.from('admin.import_runs').insert([
      {
        kind: 'tcgdex_normalize',
        source: SOURCE,
        scope: { batch_size: BATCH_SIZE, mode: options.mode },
        status: 'success',
        finished_at: todayIso(),
        counts: stats,
      },
    ]);
  } catch (err) {
    console.warn('[tcgdex][normalize] Failed to log admin.import_runs:', err?.message ?? err);
  }
}

async function main() {
  const options = parseArgs();
  const supabase = createBackendClient();
  console.log('[tcgdex][normalize] start', options);

  const { data: pendingRows, error: pendingError } = await supabase
    .from('raw_imports')
    .select('id')
    .eq('source', SOURCE)
    .eq('status', 'pending')
    .limit(1);
  if (pendingError) throw pendingError;
  if (!pendingRows || pendingRows.length === 0) {
    console.log('[tcgdex][normalize] no pending rows; exiting');
    return;
  }

  const setStats = await normalizeSets(supabase, options);
  const cardStats = await normalizeCards(supabase, options);

  await logRun(
    supabase,
    {
      sets: setStats,
      cards: cardStats,
    },
    options,
  );
  console.log('[tcgdex][normalize] complete', { sets: setStats, cards: cardStats });
}

main().catch((err) => {
  console.error('[tcgdex][normalize] Unhandled error:', err);
  process.exit(1);
});
