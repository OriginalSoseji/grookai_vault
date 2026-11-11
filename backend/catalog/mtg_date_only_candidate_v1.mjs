import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { buildMtgCanonicalCandidateV1 } from '../pricing/mtg_canonical_catalog_candidate_v1.mjs';

// Evidence classification only: this does not authenticate bulk membership,
// write canonical data, or authorize publication. The caller must independently
// verify both original bulk bodies and membership before using its result. The
// sourceOwners argument must contain every active Scryfall mapping for either
// the parent or the source ID, not only mappings matching both dimensions.
export const MTG_DATE_ONLY_CANDIDATE_V1 = 'mtg_date_only_candidate:v1';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const digest = value => createHash('sha256').update(value, 'utf8').digest('hex');
const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export function classifyMtgDateOnlyCandidateV1({ parent, identities, sourceOwners, currentBody, historicalBody } = {}) {
  const reject = reason => ({ status: 'review_required', reason });
  if (!parent || !Array.isArray(identities) || !Array.isArray(sourceOwners) ||
      typeof currentBody !== 'string' || typeof historicalBody !== 'string') return reject('missing_evidence');
  let current, historical;
  try { current = JSON.parse(currentBody); historical = JSON.parse(historicalBody); }
  catch { return reject('invalid_source_json'); }
  if (!current || typeof current !== 'object' || !historical || typeof historical !== 'object') return reject('invalid_source_json');
  const active = identities.filter(i => i?.is_active === true);
  if (active.length !== 1 || sourceOwners.length !== 1) return reject('identity_or_owner_not_unique');
  const i = active[0], m = sourceOwners[0];
  if (!uuid(parent.id) || !uuid(i.id) || !uuid(current.id) ||
      parent.identity_domain !== 'mtg_eng_paper_print' || i.card_print_id !== parent.id ||
      i.identity_domain !== parent.identity_domain || i.identity_key_version !== 'MTG_ENG_PAPER_PRINT_IDENTITY_V1' ||
      i.set_code_identity !== parent.set_code || i.printed_number !== parent.number ||
      parent.gv_id !== `GV-MTG-SF-${current.id.toUpperCase()}` ||
      parent.external_ids?.scryfall !== current.id || parent.variant_key !== `scryfall:${current.id}` ||
      parent.print_identity_key !== `scryfall:${current.id}` || parent.printed_identity_modifier ||
      parent.set_identity_model !== 'standard' || m?.active !== true || m.source !== 'scryfall' ||
      m.card_print_id !== parent.id || m.external_id !== current.id) return reject('parent_identity_or_owner_mismatch');
  if (!validDate(current.released_at) || current.released_at !== historical.released_at ||
      m.meta?.source_card_released_at !== current.released_at) return reject('release_date_mismatch');
  if (['id', 'set_id', 'oracle_id', 'lang', 'set', 'collector_number', 'name']
      .some(key => current[key] !== historical[key]) || current.name !== parent.name ||
      current.set !== parent.set_code || current.collector_number !== parent.number) return reject('source_coordinates_mismatch');
  let oldCandidate, newCandidate;
  try { oldCandidate = buildMtgCanonicalCandidateV1(historical); newCandidate = buildMtgCanonicalCandidateV1(current); }
  catch { return reject('invalid_source_shape'); }
  if (oldCandidate.status !== 'candidate' || newCandidate.status !== 'candidate' ||
      oldCandidate.identity_key_version !== i.identity_key_version || oldCandidate.identity_key_hash !== i.identity_key_hash ||
      !isDeepStrictEqual(oldCandidate.identity_payload, i.identity_payload)) return reject('source_identity_mismatch');
  return { status: 'candidate_only', card_print_id: parent.id, source_print_id: current.id,
    release_date: current.released_at, current_member_sha256: digest(currentBody),
    historical_member_sha256: digest(historicalBody), identity_id: i.id, identity_key_hash: i.identity_key_hash,
    current_identity_matches: newCandidate.identity_key_hash === i.identity_key_hash &&
      isDeepStrictEqual(newCandidate.identity_payload, i.identity_payload),
    original_bulk_membership_verified: false, canonical_admission: false };
}
