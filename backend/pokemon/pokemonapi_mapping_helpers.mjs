// backend/pokemon/pokemonapi_mapping_helpers.mjs
//
// Shared PokemonAPI mapping helpers.
// Canonical identity for a Pokemon card_print (game='pokemon'):
// - Resolve set by PokemonAPI set code/id (or ptcgo code).
// - Match card_prints by priority: external_ids->pokemonapi, (set_id, number), then (set_id, number_plain).
// This mirrors pokemonapi_normalize_worker to avoid drift.

import { createBackendClient } from '../supabase_backend_client.mjs';

const SOURCE = 'pokemonapi';

export function numberPlain(number) {
  if (!number) return null;
  const digits = String(number).replace(/[^0-9]/g, '');
  return digits || null;
}

export function getPokemonApiId(card) {
  const data = card?.data ?? card;
  return data?.id || data?._external_id || null;
}

export async function resolveSet(supabase, payload) {
  const externalId = payload?.id || payload?._external_id;
  const ptcgo = payload?.ptcgoCode;
  const candidates = [];

  const codes = [externalId, ptcgo].filter(Boolean);
  if (codes.length > 0) {
    const { data, error } = await supabase
      .from('sets')
      .select('id, code, source')
      .eq('game', 'pokemon')
      .in('code', codes);
    if (error) throw error;
    candidates.push(...(data ?? []));
  }

  if (candidates.length === 0 && externalId) {
    const { data, error } = await supabase
      .from('sets')
      .select('id, code, source')
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
  if (deduped.length !== 1) return null;
  return deduped[0];
}

export async function resolveCardPrint(supabase, card, setId) {
  const data = card?.data ?? card;
  const cardId = data?.id || data?._external_id;
  const numberFull = data?.number ?? null;
  const numPlain = numberPlain(numberFull);

  if (!setId) return { match: null, multiple: false };

  const { data: byExt, error: byExtError } = await supabase
    .from('card_prints')
    .select('id')
    .eq('external_ids->>pokemonapi', cardId)
    .eq('set_id', setId)
    .limit(2);
  if (byExtError) throw byExtError;
  if (byExt && byExt.length === 1) return { match: byExt[0], multiple: false };
  if (byExt && byExt.length > 1) return { match: null, multiple: true };

  const { data: byNumber, error: numberError } = await supabase
    .from('card_prints')
    .select('id')
    .eq('set_id', setId)
    .eq('number', numberFull)
    .limit(2);
  if (numberError) throw numberError;
  if (byNumber && byNumber.length === 1) return { match: byNumber[0], multiple: false };
  if (byNumber && byNumber.length > 1) return { match: null, multiple: true };

  if (numPlain) {
    const { data: byPlain, error: plainError } = await supabase
      .from('card_prints')
      .select('id')
      .eq('set_id', setId)
      .eq('number_plain', numPlain)
      .limit(2);
    if (plainError) throw plainError;
    if (byPlain && byPlain.length === 1) return { match: byPlain[0], multiple: false };
    if (byPlain && byPlain.length > 1) return { match: null, multiple: true };
  }

  return { match: null, multiple: false };
}

export async function ensurePokemonApiMapping(supabase, cardPrintId, externalId) {
  if (!cardPrintId || !externalId) return;
  const { error } = await supabase
    .from('external_mappings')
    .upsert(
      {
        source: SOURCE,
        external_id: externalId,
        card_print_id: cardPrintId,
      },
      { onConflict: 'source,external_id' },
    );
  if (error) {
    console.error('[pokemonapi][mapping] upsert failed:', error.message ?? error);
  }
}

// Helper to create a client when used standalone (optional)
export function createClient() {
  return createBackendClient();
}
