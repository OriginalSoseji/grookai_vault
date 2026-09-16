import assert from 'node:assert/strict';
import { classifyPokemonSealedProductV1, pokemonSealedHashV1 } from './pokemon_sealed_world_v1.mjs';

export const POKEMON_SEALED_INCREMENTAL_READINESS_V1 = 'POKEMON_SEALED_INCREMENTAL_READINESS_V1';

// This is an admission/reconciliation queue, deliberately not a release payload.
// The initial hidden-lane writer and fixed-baseline refresh cannot apply it.
export function buildPokemonSealedIncrementalReadinessV1(snapshot) {
  assert.equal(snapshot.project_ref, 'ycdxbpibncqcchqiihfz');
  const ids = snapshot.selected_ids;
  assert.ok(Array.isArray(ids) && ids.length > 0 && ids.length <= 100);
  assert.ok(ids.every(id => Number.isSafeInteger(id) && id > 0));
  assert.equal(new Set(ids).size, ids.length, 'Duplicate selected product');
  const selected = new Set(ids);
  const index = (rows, key) => {
    const map = new Map();
    for (const row of rows) {
      const id = Number(row[key]);
      assert.ok(selected.has(id), 'Unselected product');
      assert.ok(!map.has(id), 'Duplicate source or mapping');
      map.set(id, row);
    }
    return map;
  };
  const source = index(snapshot.source, 'product_id');
  assert.equal(source.size, ids.length, 'Missing source product');
  const mappings = index(snapshot.mappings, 'source_product_id');
  const coverage = index(snapshot.coverage, 'source_product_id');
  const day = String(snapshot.at).slice(0, 10);
  assert.match(day, /^\d{4}-\d{2}-\d{2}$/);
  const rows = ids.map(id => {
    const s = source.get(id), m = mappings.get(id), c = coverage.get(id);
    assert.ok([3, 85].includes(Number(s.category_id)), 'Non-Pokemon source');
    if (m) {
      assert.equal(m.game_key, 'pokemon', 'Cross-game mapping');
      assert.equal(Number(m.source_category_id), Number(s.category_id), 'Category ownership changed');
      assert.equal(Number(m.source_group_id), Number(s.group_id), 'Group ownership changed');
      assert.equal(m.mapping_status, 'exact_reviewed', 'Unreviewed existing mapping');
    }
    if (c) {
      assert.ok(m, 'Coverage without mapping');
      assert.equal(c.variant_id, m.variant_id, 'Coverage identity mismatch');
    }
    const classification = classifyPokemonSealedProductV1(s);
    const observations = snapshot.prices.filter(p => Number(p.product_id) === id && p.subtype_name_normalized === 'normal');
    assert.ok(observations.length <= 1, 'Ambiguous Normal price');
    const p = observations[0];
    const observed = String(p?.observed_on ?? '').slice(0, 10);
    const age = (Date.parse(day) - Date.parse(observed)) / 86400000;
    const priceReady = p?.currency === 'USD' && Number(p.market_price) > 0 && age >= 0 && age <= 7;
    const reasons = [];
    if (!s.source_active) reasons.push('source_inactive');
    if (classification.classification !== 'sealed_candidate') reasons.push('package_evidence_unresolved');
    if (!m) reasons.push('new_identity_requires_additive_apply');
    else if (m.source_payload_hash !== s.payload_hash) reasons.push('mapped_source_changed_requires_reconciliation');
    if (!priceReady) reasons.push('fresh_positive_normal_price_missing');
    if (!c?.image_member_id) reasons.push('not_in_active_image_release');
    if (Boolean(c?.image_member_id) !== Boolean(c?.price_member_id)) reasons.push('active_price_image_membership_mismatch');
    const active = Boolean(c?.price_member_id && c?.image_member_id);
    return { product_id: id, name: s.name, source_url: s.source_url,
      source_payload_hash: s.payload_hash, mapped_payload_hash: m?.source_payload_hash ?? null,
      variant_id: m?.variant_id ?? null, package_form: classification.candidate_identity.package_form,
      classification: classification.classification, classification_evidence: classification.evidence,
      source_presale_info: s.presale_info ?? null, source_image_url: s.image_url,
      source_price: p ? { observed_on: observed, market_price: p.market_price, currency: p.currency,
        source_price_row_identity: p.source_price_row_identity, payload_hash: p.payload_hash } : null,
      fresh_positive_normal_price: priceReady, in_active_paired_release: active,
      disposition: reasons.length ? 'work_required' : 'active_verified_mapping', reasons };
  });
  const report = { version: POKEMON_SEALED_INCREMENTAL_READINESS_V1, observed_at: snapshot.at,
    selected_count: rows.length, existing_mappings: mappings.size,
    new_identities: rows.filter(r => !r.variant_id).length,
    changed_mappings: rows.filter(r => r.reasons.includes('mapped_source_changed_requires_reconciliation')).length,
    active_paired_members: rows.filter(r => r.in_active_paired_release).length,
    fresh_positive_prices: rows.filter(r => r.fresh_positive_normal_price).length,
    protected_pointers: snapshot.pointers, rows,
    database_writes: 0, storage_writes: 0, apply_authority: false };
  return { ...report, fingerprint: pokemonSealedHashV1(report) };
}
