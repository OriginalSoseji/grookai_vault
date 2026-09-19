import assert from 'node:assert/strict';
import { sha256, stableJson } from '../pricing/one_piece_canonical_import_staging_v1.mjs';
import { ONE_PIECE_GAME_ID } from '../pricing/one_piece_st01_canonical_promotion_v1.mjs';
import { printingCandidateId } from './printing_completeness_gate_v1.mjs';
import { normalizeOnePieceOfficialNameV1 } from '../pricing/one_piece_complete_official_catalog_authority_v1.mjs';
import { ONE_PIECE_COMPLETE_DON_IDENTITY_KEY_VERSION, ONE_PIECE_COMPLETE_DON_SET_ID } from '../pricing/one_piece_complete_don_canonical_v1.mjs';

export const ONE_PIECE_PRINTING_ADMISSION_VERSION = 'ONE_PIECE_PRINTING_ADMISSION_V2';
const domain = 'one_piece_eng_print';
const hash = value => sha256(stableJson(value));
const group = (rows, key) => Map.groupBy(rows ?? [], row => String(row[key]));
const suffix = { normal: 'STD', foil: 'FOIL' };
const nonempty = value => typeof value === 'string' && value.length > 0;
const whitespace = value => String(value ?? '').trim().replace(/\s+/g, ' ');

export function assessOnePiecePrintingFamily({ parent, set, identities = [], evidence = [], mappings = [], products = [], lanes = [], children = [], finishKeys = [], asOf }) {
  const reasons = [];
  const add = (condition, reason) => { if (condition) reasons.push(reason); };
  const result = extra => ({ parent_id: parent.id, gv_id: parent.gv_id, set_code: set?.code,
    status: reasons.length ? 'needs_evidence' : 'source_verified', reasons: [...new Set(reasons)],
    proposed_printings: [], retained_printing_ids: [], database_writes: 0, ...extra });
  add(!set || set.game !== 'one_piece' || set.id !== parent.set_id || parent.game_id !== ONE_PIECE_GAME_ID || parent.set_code !== set.code, 'wrong_game_or_set');
  add(parent.identity_domain !== domain, 'wrong_identity_domain');
  add(!nonempty(parent.gv_id) || !/^\d+$/.test(String(parent.tcgplayer_id)), 'missing_parent_identity');
  const don = set?.code === 'DON' && set.id === ONE_PIECE_COMPLETE_DON_SET_ID && parent.number === null;
  add(!don && !/^((OP|ST|EB|PRB)\d{2}|P)-\d{3}$/.test(parent.number), 'numbered_identity_required');
  if (reasons.length) return result();
  const productId = Number(parent.tcgplayer_id);
  const activeIdentities = identities.filter(i => i.is_active === true);
  const activeEvidence = evidence.filter(e => e.active === true);
  const activeMappings = mappings.filter(m => m.active === true && m.source === 'tcgplayer');
  add(activeIdentities.length !== 1, 'identity_cardinality');
  add(activeEvidence.length !== 1, 'evidence_cardinality');
  add(activeMappings.length !== 1 || activeMappings[0]?.external_id !== String(productId), 'mapping_cardinality_or_product');
  add(products.length !== 1 || products[0]?.product_id !== productId, 'product_cardinality');
  if (reasons.length) return result();
  const identity = activeIdentities[0], proof = activeEvidence[0], product = products[0];
  const payload = identity.identity_payload, subject = proof.evidence_subject, authority = proof.evidence_payload?.official_authority;
  add(!payload || !subject || !proof.evidence_payload || !product.raw_payload, 'missing_evidence_payload');
  if (reasons.length) return result();
  const st01 = identity.identity_key_version === 'ONE_PIECE_ENG_PRINT_IDENTITY_V1' && set.code === 'ST01';
  // ST-01 predates the punctuation-normalizing catalog identity version.
  const normalizeName = st01 || don ? value => whitespace(value).toLowerCase() : normalizeOnePieceOfficialNameV1;
  add(don ? identity.identity_key_version !== ONE_PIECE_COMPLETE_DON_IDENTITY_KEY_VERSION :
    !st01 && identity.identity_key_version !== 'ONE_PIECE_ENG_PRODUCT_PARENT_IDENTITY_V1', 'unsupported_identity_version');
  add(identity.card_print_id !== parent.id || proof.card_print_id !== parent.id || proof.card_print_identity_id !== identity.id || activeMappings[0].card_print_id !== parent.id, 'cross_parent_evidence');
  add(hash(payload) !== identity.identity_key_hash || parent.print_identity_key !== `${domain}:${identity.identity_key_hash}`, 'identity_hash_mismatch');
  add(hash({ acquisition_key: proof.acquisition_key, source_key: proof.source_key, evidence_subject: subject, evidence_payload: proof.evidence_payload }) !== proof.evidence_key_hash, 'evidence_hash_mismatch');
  add(identity.identity_domain !== domain || payload?.game_code !== 'one_piece' || payload?.language_code !== 'en', 'identity_language_or_domain');
  const identityNumber = don ? 'DON!!' : parent.number;
  add(identity.printed_number !== identityNumber || payload?.printed_number !== identityNumber || subject?.printed_number !== identityNumber, 'printed_number_mismatch');
  add(identity.set_code_identity !== set.code || payload?.set_code !== set.code || subject?.set_code !== set.code, 'identity_set_mismatch');
  add(identity.normalized_printed_name !== normalizeName(parent.name) || payload.normalized_printed_name !== identity.normalized_printed_name || subject?.printed_name !== parent.name, 'canonical_name_mismatch');
  const validSource = proof.source_key === 'tcgplayer' ||
    (proof.source_key === 'tcgplayer_bandai_official' && proof.evidence_payload.promotion_version === 'ONE_PIECE_INCREMENTAL_CANONICAL_PROMOTION_V1');
  add(!validSource || subject.identity_domain !== domain, 'evidence_source_or_domain');
  add(parent.external_ids?.tcgplayer !== String(productId) || proof.acquisition_key !== `one_piece:tcgplayer:product:${productId}`, 'source_product_mismatch');
  if (st01) {
    add(parent.variant_key !== '' || payload?.variant_key !== 'base', 'st01_variant_mismatch');
    add(authority?.authority_status !== 'exact_official_english_st01_card_match' || authority?.language_code !== 'en', 'official_authority_missing');
    add(proof.evidence_payload?.durable_staging?.source_product_id !== productId, 'st01_source_product_mismatch');
  } else {
    add(parent.variant_key !== `tcgplayer_product_${productId}` || payload?.variant_key !== parent.variant_key || subject?.variant_key !== parent.variant_key, 'variant_product_mismatch');
    add(payload?.source_product_id !== productId || subject?.source_product_id !== productId || proof.evidence_payload?.source_product?.source_product_id !== productId, 'identity_product_mismatch');
    if (don) {
      // DON!! is an identity token, not an invented printed collector number.
      const a = proof.evidence_payload.authority, source = proof.evidence_payload.source_product;
      add(payload.printed_number_semantics !== 'unnumbered_don_identity_token' ||
        a?.exact_product_authority !== 'tcgplayer_product_id_and_structured_don_classification' ||
        a?.source_product_preserved_without_name_collapsing !== true ||
        a?.official_equivalence_authority !== false || a?.official_visual_variant_authority !== false ||
        source?.card_type !== 'don' || source?.source_product_name !== identity.source_name_raw ||
        source?.language?.normalized !== 'en' || proof.source_key !== 'tcgplayer', 'don_product_authority_missing');
      add(payload.source_group_id !== product.group_id || subject.source_group_id !== product.group_id ||
        source?.source_group_id !== product.group_id ||
        proof.evidence_payload.durable_staging?.source_product_id !== productId ||
        proof.evidence_payload.durable_staging?.source_group_id !== product.group_id, 'don_product_group_mismatch');
    } else {
      add(authority?.authority_status !== 'exact_official_english_printed_number_and_name' || authority?.card_number !== parent.number || normalizeOnePieceOfficialNameV1(authority?.official_name) !== identity.normalized_printed_name, 'official_authority_missing');
    }
  }
  add(product.category_id !== 68 || !product.source_active || product.catalog_metadata_status !== 'current', 'source_product_not_current');
  add(whitespace(product.name) !== whitespace(identity.source_name_raw), 'source_name_changed');
  add(product.raw_payload?.productId !== productId || product.raw_payload?.categoryId !== 68 || product.raw_payload?.groupId !== product.group_id || product.raw_payload?.name !== product.name, 'raw_product_mismatch');
  add(hash(product.raw_payload) !== product.payload_hash, 'raw_product_hash_mismatch');
  add(stableJson(product.presale_info) !== stableJson(product.raw_payload.presaleInfo), 'presale_metadata_mismatch');
  add(product.presale_info?.isPresale === true || Date.parse(product.presale_info?.releasedOn) > Date.parse(asOf), 'future_or_presale_product');
  const numbers = (product.extended_data ?? []).filter(d => d.name === 'Number');
  add(don ? numbers.length !== 0 : numbers.length !== 1 || numbers[0]?.value !== parent.number, 'source_number_mismatch');
  if (don) {
    const types = (product.extended_data ?? []).filter(d => d.name === 'CardType');
    add(types.length !== 1 || types[0].value !== 'DON!!', 'don_structured_type_required');
  }
  add(stableJson(product.extended_data) !== stableJson(product.raw_payload?.extendedData), 'structured_product_mismatch');
  add(lanes.length < 1 || lanes.length > 2 || new Set(lanes.map(l => l.subtype_name_normalized)).size !== lanes.length, 'finish_lane_cardinality');
  add(lanes.length > 0 && new Set(lanes.map(l => l.observed_on)).size !== 1, 'mixed_observation_days');
  for (const lane of lanes) {
    const finish = lane.subtype_name_normalized;
    add(!Object.hasOwn(suffix, finish) || lane.subtype_name !== (finish === 'normal' ? 'Normal' : 'Foil'), 'unrecognized_finish');
    add(lane.product_id !== productId || lane.category_id !== 68 || lane.group_id !== product.group_id || lane.source_price_row_identity !== `tcgplayer:${productId}:${finish}`, 'finish_product_mismatch');
    add(!lane.raw_payload || lane.raw_payload.productId !== productId || lane.raw_payload.subTypeName !== lane.subtype_name || hash(lane.raw_payload) !== lane.payload_hash, 'raw_finish_mismatch');
    add(!lane.source_artifact_id || !lane.source_archive_path, 'missing_finish_archive');
    const age = Date.parse(asOf) - Date.parse(`${lane.observed_on}T00:00:00Z`);
    // An archived printing designation does not expire with its price. The
    // publication policy independently checks current market-price freshness.
    add(!Number.isFinite(age) || age < 0, 'invalid_finish_observation_date');
  }
  if (reasons.length) return result();
  const retained = [], proposed = [], taxonomy = [];
  for (const lane of lanes) {
    const finish = lane.subtype_name_normalized, registry = finishKeys.find(f => f.key === finish);
    if (!registry?.is_active || (registry.meta?.game_scope && !registry.meta.game_scope.includes('one_piece'))) taxonomy.push(finish);
    const existing = children.filter(c => c.finish_key === finish);
    const gv = `${parent.gv_id}-${suffix[finish]}`;
    if (existing.length) {
      add(existing.length !== 1 || existing[0].is_provisional || existing[0].printing_gv_id !== gv || !nonempty(existing[0].provenance_source) || !nonempty(existing[0].provenance_ref), 'existing_child_conflict');
      retained.push(...existing.map(c => c.id));
    } else {
      proposed.push({ id: printingCandidateId({card_print_id: parent.id, finish_key: finish}),
        card_print_id: parent.id, finish_key: finish, printing_gv_id: gv, is_provisional: false,
        evidence: { version: ONE_PIECE_PRINTING_ADMISSION_VERSION, identity_id: identity.id,
          identity_key_hash: identity.identity_key_hash, source_evidence_id: proof.id, source_evidence_hash: proof.evidence_key_hash,
          source_product_id: productId, source_product_hash: product.payload_hash, source_product_name: product.name,
          source_price_row_identity: lane.source_price_row_identity, source_observation_id: lane.id,
          source_observation_hash: lane.payload_hash, source_artifact_id: lane.source_artifact_id,
          source_subtype: lane.subtype_name, observed_on: lane.observed_on,
          scope: 'Exact source-product finish designation; not a foil-pattern, image, price-publication or variant-equivalence claim.' } });
    }
  }
  add(children.some(c => !lanes.some(l => l.subtype_name_normalized === c.finish_key)), 'existing_finish_not_in_source');
  if (reasons.length) return result();
  return result({ status: taxonomy.length ? 'source_verified_taxonomy_blocked' : 'source_verified',
    proposed_printings: proposed, retained_printing_ids: retained, taxonomy_required: [...new Set(taxonomy)] });
}

export function buildOnePiecePrintingAdmission(inventory, finishKeys) {
  assert.ok(Number.isFinite(Date.parse(inventory.observed_at)), 'inventory_timestamp_required');
  const { parents, sets } = inventory;
  assert.equal(new Set(parents.map(p => p.id)).size, parents.length, 'duplicate_parent');
  assert.equal(new Set(parents.map(p => p.gv_id)).size, parents.length, 'duplicate_parent_gvid');
  assert.equal(new Set(parents.map(p => String(p.tcgplayer_id))).size, parents.length, 'duplicate_source_product_parent');
  assert.equal(new Set(sets.map(s => s.id)).size, sets.length, 'duplicate_set');
  assert.equal(new Set(finishKeys.map(f => f.key)).size, finishKeys.length, 'duplicate_finish_registry_key');
  const parentIds = new Set(parents.map(p => p.id));
  for (const key of ['identities', 'evidence', 'mappings', 'children']) {
    assert.ok(Array.isArray(inventory[key]), `missing_${key}_inventory`);
    assert.ok(inventory[key].every(r => parentIds.has(r.card_print_id)), `orphan_${key}_inventory`);
  }
  const indexes = Object.fromEntries(['identities', 'evidence', 'mappings', 'children'].map(k => [k, group(inventory[k], 'card_print_id')]));
  const products = group(inventory.products, 'product_id'), lanes = group(inventory.latest_lanes, 'product_id');
  const results = parents.map(parent => assessOnePiecePrintingFamily({ parent, set: sets.find(s => s.id === parent.set_id),
    ...Object.fromEntries(Object.entries(indexes).map(([k, m]) => [k, m.get(parent.id) ?? []])),
    products: products.get(String(parent.tcgplayer_id)) ?? [], lanes: lanes.get(String(parent.tcgplayer_id)) ?? [], finishKeys, asOf: inventory.observed_at }));
  const proposed = results.flatMap(r => r.proposed_printings);
  assert.equal(new Set(proposed.map(p => p.id)).size, proposed.length, 'duplicate_candidate_id');
  assert.equal(new Set(proposed.map(p => p.printing_gv_id)).size, proposed.length, 'duplicate_candidate_gvid');
  const existing = inventory.children ?? [];
  assert.ok(proposed.every(p => !existing.some(c => c.id === p.id || c.printing_gv_id === p.printing_gv_id)), 'existing_candidate_collision');
  return { version: ONE_PIECE_PRINTING_ADMISSION_VERSION, observed_at: inventory.observed_at, inventory_sha256: hash(inventory),
    finish_registry_sha256: hash(finishKeys), parents: parents.length,
    counts: Object.fromEntries(Object.entries(Object.groupBy(results, r => r.status)).map(([k, v]) => [k, v.length])),
    proposed_printings: proposed.length, results, write_ready: false,
    boundaries: ['No writes performed.', 'Fresh global collisions and protected dependency checks required.',
      'Registry changes do not authorize pricing publication.', 'Unresolved identities remain intact; no default finish or parent merge.'] };
}
