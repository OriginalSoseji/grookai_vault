export const TCGPLAYER_EDITION_IDENTITY_V1 = 'TCGPLAYER_EDITION_IDENTITY_V1';
export const TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1 = 'TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1';

const SUBTYPES = new Map([
  ['unlimited', { edition: 'unlimited', finish_key: 'normal' }],
  ['unlimited holofoil', { edition: 'unlimited', finish_key: 'holo' }],
  ['1st edition', { edition: 'first_edition', finish_key: 'normal' }],
  ['1st edition holofoil', { edition: 'first_edition', finish_key: 'holo' }],
]);
const MODIFIERS = new Map([
  ['edition:first_edition', 'first_edition'],
  ['edition:unlimited', 'unlimited'],
]);

// Provider edition and surface finish are different dimensions. This parser
// describes source evidence; it never authorizes canonical identity or pricing.
export function parseTcgplayerEditionSubtypeV1(value) {
  const sourceSubtype = typeof value === 'string' ? value : '';
  const match = SUBTYPES.get(sourceSubtype.trim().toLowerCase());
  return match ? { source_subtype_name: sourceSubtype, ...match } : null;
}

// Preserve PostgreSQL's full timestamp precision for the immutable assignment
// comparison. The driver's default Date conversion drops microseconds.
export function hydrateTcgplayerEditionCandidateV1(row) {
  return row.edition_assignment_id && typeof row.edition_source_sync_finished_at === 'string'
    ? { ...row, source_sync_finished_at: row.edition_source_sync_finished_at } : row;
}

// Validate the complete database projection, not a boolean authority flag.
// SQL independently revalidates the actual ledger at qualification, snapshot,
// activation and current read time. This pure check is not write authority.
export function isTcgplayerJungleEditionAssignmentProjectionV1(row = {}) {
  const payload = row.edition_assignment_payload;
  const parsed = parseTcgplayerEditionSubtypeV1(row.source_subtype_name);
  const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
  const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  if (row.edition_assignment_required !== true || row.edition_assignment_current !== true ||
      !uuid(row.edition_assignment_id) || !uuid(row.edition_binding_id) ||
      !sha(row.edition_assignment_sha256) ||
      row.edition_assignment_version !== TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1 ||
      payload?.version !== TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1 || !parsed ||
      Number(row.category_id) !== 3 || Number(row.group_id) !== 635 ||
      row.source_mapping_id != null || row.variant_assignment_id != null ||
      row.mapping_method !== 'jungle_edition_binding_v1') return false;
  const source = payload.source ?? {}, canonical = payload.canonical ?? {}, binding = payload.binding ?? {};
  if (Number(source.category_id) !== 3 || Number(source.group_id) !== 635 ||
      !sha(source.product_hash) || !sha(binding.manifest_sha256) ||
      !uuid(binding.identity_link_id) || binding.id !== row.edition_binding_id ||
      canonical.edition !== parsed.edition || canonical.finish_key !== parsed.finish_key ||
      row.finish_key !== parsed.finish_key || row.normalized_finish_key !== parsed.finish_key ||
      canonical.printed_identity_modifier !== `edition:${parsed.edition}` ||
      row.printed_identity_modifier !== canonical.printed_identity_modifier ||
      !uuid(canonical.card_print_id) || !uuid(canonical.card_printing_id) ||
      canonical.card_print_id === canonical.legacy_card_print_id) return false;
  for (const [key, expected] of Object.entries({
    source_observation_id: source.observation_id, source_sync_run_id: source.sync_run_id,
    source_artifact_id: source.artifact_id, source_artifact_hash: source.artifact_hash,
    source_product_id: source.product_id, source_subtype_name: source.subtype,
    source_row_hash: source.row_hash, source_price_row_identity: source.price_row_identity,
    currency: source.currency, card_print_id: canonical.card_print_id,
    card_printing_id: canonical.card_printing_id, gv_id: canonical.gv_id,
    printing_gv_id: canonical.printing_gv_id,
  })) if (expected == null || String(row[key]) !== String(expected)) return false;
  const amount = Number(row.market_price), frozenAmount = Number(source.market_price);
  const observed = new Date(row.source_sync_finished_at).getTime();
  return Number.isFinite(amount) && amount > 0 && amount === frozenAmount &&
    Number.isFinite(observed) && Math.abs(observed - Number(source.sync_finished_at_epoch) * 1000) < 1;
}

// An upstream normalized finish, image or generic assignment cannot bypass this
// gate. Only the complete exact-edition projection reaches SQL admission checks.
export function tcgplayerEditionQualificationReasonsV1(row = {}) {
  if (Number(row.category_id) !== 3 && !row.edition_assignment_id) return [];
  const subtype = String(row.source_subtype_name ?? '');
  const modifier = String(row.printed_identity_modifier ?? '');
  if (row.edition_assignment_required === true || row.edition_assignment_id || parseTcgplayerEditionSubtypeV1(subtype) ||
      /\b(?:edition|unlimited)\b/i.test(subtype) ||
      /^edition:/i.test(modifier)) {
    return isTcgplayerJungleEditionAssignmentProjectionV1(row) ? [] : ['edition_bound_pricing_authority_required'];
  }
  return [];
}

// Offline compatibility preview only. Even an explicit matching modifier is
// not a reviewed authority manifest, source mapping, or publication grant.
export function previewTcgplayerEditionIdentityV1({ parent = {}, printing = {}, source = {} } = {}) {
  const parsed = parseTcgplayerEditionSubtypeV1(source.source_subtype_name);
  const edition = MODIFIERS.get(parent.printed_identity_modifier) ?? null;
  const reasons = [];
  if (Number(source.category_id) !== 3) reasons.push('unsupported_source_category');
  if (!parsed) reasons.push('unsupported_edition_subtype');
  if (parent.set_code !== 'base2' || parent.identity_domain !== 'pokemon_eng_standard' ||
      parent.set_identity_model !== 'standard') reasons.push('outside_jungle_identity_scope');
  if (!parent.id || !parent.gv_id || !parent.set_id) reasons.push('missing_parent_identity');
  if (parent.variant_key !== '' && parent.variant_key !== null) reasons.push('special_variant_outside_scope');
  if (!edition) reasons.push('canonical_edition_unresolved');
  if (edition && parsed && edition !== parsed.edition) reasons.push('edition_mismatch');
  if (!printing.id || !printing.printing_gv_id || printing.card_print_id !== parent.id) {
    reasons.push('missing_exact_child_identity');
  }
  if (printing.is_provisional !== false || printing.public_visibility === false) {
    reasons.push('child_not_verified_visible');
  }
  if (parsed && printing.finish_key !== parsed.finish_key) reasons.push('finish_mismatch');
  return {
    policy_version: TCGPLAYER_EDITION_IDENTITY_V1,
    card_print_id: parent.id ?? null,
    card_printing_id: printing.id ?? null,
    source_product_id: source.source_product_id ?? null,
    source_subtype_name: source.source_subtype_name ?? null,
    source_edition: parsed?.edition ?? null,
    source_finish_key: parsed?.finish_key ?? null,
    canonical_edition: edition,
    identity_compatible: reasons.length === 0,
    reasons,
    // This module cannot perform or authorize any of these actions.
    publishable: false,
    write_ready: false,
    ownership_reassignment_allowed: false,
  };
}
