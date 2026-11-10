import { isDeepStrictEqual } from 'node:util';
import { buildMtgCanonicalCandidateV1 } from '../pricing/mtg_canonical_catalog_candidate_v1.mjs';

export const MTG_PRINT_RELEASE_READ_V1 = 'mtg_print_release_read:v1';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const dated = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Current identity and globally unique provider ownership are required on every
// read. A set's launch date cannot replace an unknown individual print date.
export function readMtgPrintReleaseV1(parent, identities, sourceOwners) {
  const d = parent?.ai_metadata?.mtg_print_details_v1;
  if (!d || !uuid(parent.id) || parent.identity_domain !== 'mtg_eng_paper_print' ||
      d.normalization_version !== 'mtg_print_details:v1' ||
      d.verification_status !== 'source_supported' || d.source_provider !== 'scryfall' ||
      !validDate(d.source_released_at) || !uuid(d.source_print_id) ||
      !hash(d.source_card_sha256) || !hash(d.source_bulk_sha256) ||
      typeof d.source_raw_import_id !== 'string' || !/^[1-9]\d*$/.test(d.source_raw_import_id) ||
      !dated(d.source_bulk_updated_at) || !dated(d.source_retrieved_at) ||
      !/^https:\/\/data\.scryfall\.io\/default-cards\/default-cards-\d{14}\.jsonl\.gz$/.test(d.source_url) ||
      !Array.isArray(identities) || !Array.isArray(sourceOwners)) return null;
  const active = identities.filter(i => i.is_active === true);
  if (active.length !== 1 || sourceOwners.length !== 1) return null;
  const i = active[0], m = sourceOwners[0], p = i.identity_payload;
  if (i.card_print_id !== parent.id || i.identity_domain !== parent.identity_domain ||
      i.identity_key_version !== 'MTG_ENG_PAPER_PRINT_IDENTITY_V1' ||
      i.id !== d.identity_id || i.identity_key_hash !== d.identity_key_hash ||
      i.set_code_identity !== parent.set_code || i.printed_number !== parent.number ||
      m.active !== true || m.source !== 'scryfall' || m.card_print_id !== parent.id ||
      m.external_id !== d.source_print_id || parent.external_ids?.scryfall !== m.external_id ||
      parent.gv_id !== `GV-MTG-SF-${m.external_id.toUpperCase()}` ||
      parent.variant_key !== `scryfall:${m.external_id}` ||
      parent.print_identity_key !== `scryfall:${m.external_id}` ||
      parent.printed_identity_modifier || parent.set_identity_model !== 'standard' ||
      d.source_coordinates?.name !== parent.name ||
      d.source_coordinates?.set_code !== parent.set_code ||
      d.source_coordinates?.collector_number !== parent.number ||
      (m.meta?.source_card_released_at && m.meta.source_card_released_at !== d.source_released_at) ||
      !p || p.scryfall_print_id !== m.external_id || p.name !== parent.name ||
      p.set_code !== parent.set_code || p.collector_number !== parent.number || p.language !== 'en') return null;
  // Magic's ordered identity serializer is distinct from the Pokemon SQL hash.
  const candidate = buildMtgCanonicalCandidateV1({
    id: p.scryfall_print_id, oracle_id: p.scryfall_oracle_id, set_id: p.scryfall_set_id,
    set: p.set_code, collector_number: p.collector_number, lang: p.language,
    name: p.name, layout: p.layout, frame: p.frame, frame_effects: p.frame_effects,
    border_color: p.border_color, security_stamp: p.security_stamp, full_art: p.full_art,
    textless: p.textless, promo: p.promo, promo_types: p.promo_types,
    variation: p.variation, variation_of: p.variation_of, finishes: p.finishes,
    games: ['paper'], digital: false,
  });
  if (candidate.status !== 'candidate' || !isDeepStrictEqual(candidate.identity_payload, p) ||
      candidate.identity_key_hash !== i.identity_key_hash) return null;
  return {
    card_print_id: parent.id, release_date: d.source_released_at,
    release_year: Number(d.source_released_at.slice(0, 4)),
    release_date_scope: 'individual_print', release_date_source: 'scryfall',
  };
}
