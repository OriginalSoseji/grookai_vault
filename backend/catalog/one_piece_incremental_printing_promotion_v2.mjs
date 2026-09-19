import assert from 'node:assert/strict';
import { buildOnePieceIncrementalPromotionPlanV1, validateOnePieceIncrementalPromotionPlanV1 } from './one_piece_incremental_promotion_v1.mjs';
import { buildOnePiecePrintingAdmission } from './one_piece_printing_admission_v1.mjs';
import { deterministicUuidV5, sha256, stableJson } from '../pricing/one_piece_canonical_import_staging_v1.mjs';

export const ONE_PIECE_INCREMENTAL_PRINTING_PROMOTION_VERSION = 'ONE_PIECE_INCREMENTAL_PRINTING_PROMOTION_V2';
const hash = value => sha256(stableJson(value));

// The legacy planner resolves parent identity; this planner requires printing
// evidence before admitting those parents into the atomic production payload.
export function buildOnePieceIncrementalPrintingPromotionV2(input) {
  assert.ok(Array.isArray(input.finishObservations), 'finish_observation_inventory_required');
  assert.ok(Array.isArray(input.finishKeys), 'finish_registry_required');
  const legacy = buildOnePieceIncrementalPromotionPlanV1(input);
  assert.equal(validateOnePieceIncrementalPromotionPlanV1(legacy).valid, true);
  const rows = legacy.payload.rows;
  const products = new Set(rows.map(r => r.source_product_id));
  const inventory = {
    observed_at: `${input.asOf}T23:59:59.999Z`,
    parents: rows.map(r => r.card_print),
    sets: [...new Map(rows.map(r => [r.card_print.set_id, { id: r.card_print.set_id, code: r.card_print.set_code, game: 'one_piece' }])).values()],
    identities: rows.map(r => r.identity), evidence: rows.map(r => r.source_evidence),
    mappings: rows.map(r => r.external_mapping), children: [],
    products: input.warehouseProducts.filter(p => products.has(p.product_id)),
    latest_lanes: input.finishObservations.filter(o => products.has(o.product_id)),
  };
  const admission = buildOnePiecePrintingAdmission(inventory, input.finishKeys);
  const byId = new Map(admission.results.map(r => [r.parent_id, r]));
  const accepted = rows.filter(r => byId.get(r.card_print.id)?.status === 'source_verified');
  const held = rows.filter(r => !accepted.includes(r)).map(r => ({
    source_product_id: r.source_product_id, source_product_name: r.identity.source_name_raw,
    card_number: r.card_print.number, status: 'printing_evidence_unresolved',
    reasons: byId.get(r.card_print.id)?.reasons.length ? byId.get(r.card_print.id).reasons : ['finish_taxonomy_not_enabled'],
  }));
  const master = {
    version: 'ONE_PIECE_INCREMENTAL_MASTER_PRINTINGS_V2', game: 'one_piece', language: 'en',
    scope: 'verified_parent_families', source_inventory_hash: hash(inventory), finish_registry_hash: hash(input.finishKeys),
    families: accepted.map(r => ({ parent_id: r.card_print.id, parent_gv_id: r.card_print.gv_id,
      identity_key_hash: r.identity.identity_key_hash,
      printings: byId.get(r.card_print.id).proposed_printings.map(p => ({ id: p.id, finish_key: p.finish_key,
        printing_gv_id: p.printing_gv_id, evidence: Object.fromEntries(Object.entries(p.evidence)
          .filter(([key]) => key !== 'source_evidence_hash')) })) })),
    claims_complete_set: false,
  };
  const masterHash = hash(master), version = ONE_PIECE_INCREMENTAL_PRINTING_PROMOTION_VERSION;
  const completedRows = accepted.map(row => {
    const r = structuredClone(row), family = master.families.find(f => f.parent_id === row.card_print.id);
    const proof = r.source_evidence;
    proof.evidence_payload.printing_master = { version: master.version, manifest_sha256: masterHash, family };
    proof.evidence_key_hash = hash({ acquisition_key: proof.acquisition_key, source_key: proof.source_key,
      evidence_subject: proof.evidence_subject, evidence_payload: proof.evidence_payload });
    r.card_print.data_quality_flags.exact_printing_children_deferred = false;
    r.card_print.data_quality_flags.printing_admission_version = version;
    r.printings = family.printings.map(p => ({ id: p.id, card_print_id: r.card_print.id,
      finish_key: p.finish_key, printing_gv_id: p.printing_gv_id, is_provisional: false,
      provenance_source: version, provenance_ref: `card_print_identity_source_evidence:${proof.id}|master:${masterHash}`,
      created_by: version }));
    r.printing_reviews = family.printings.map(p => ({
      id: deterministicUuidV5(`${version}:review:${p.id}:${masterHash}`), card_printing_id: p.id,
      review_status: 'verified', public_visibility: 'visible', active: true, confidence: 'high',
      reason: 'Exact product-bound Normal/Foil designation; parent release remains independently hidden.',
      evidence_sources_checked: ['bandai_official', 'tcgcsv_source_products', 'tcgcsv_source_price_daily_observations'],
      evidence_sources_for_finish: [p.evidence.source_observation_id],
      expected_finish_keys: family.printings.map(p => p.finish_key).sort(),
      evidence: { master_manifest_sha256: masterHash, card_print_id: r.card_print.id, finish_key: p.finish_key,
        source_evidence_id: proof.id, source_evidence_hash: proof.evidence_key_hash, source_finish: p.evidence },
      source_report_path: `master:${masterHash}`, reviewed_by: version, reviewed_at: `${input.asOf}T00:00:00.000Z`,
    }));
    return r;
  });
  const payload = { set: completedRows.length ? legacy.payload.set : null,
    set_release_control: completedRows.length ? legacy.payload.set_release_control : null,
    rows: completedRows, printing_master: master };
  const count = completedRows.reduce((n, r) => n + r.printings.length, 0);
  return { ...legacy, version,
    status: !legacy.release_eligible ? legacy.status : held.length && !completedRows.length ? 'held_printing_evidence' : legacy.status,
    source_counts: { ...legacy.source_counts, printing_evidence_holds: held.length }, holds: [...legacy.holds, ...held],
    counts: { sets: payload.set ? 1 : 0, set_release_controls: payload.set_release_control ? 1 : 0,
      card_prints: completedRows.length, identities: completedRows.length, evidence: completedRows.length,
      external_mappings: completedRows.length, child_printings: count, printing_reviews: count },
    boundaries: { ...legacy.boundaries, child_printings: count, printing_reviews: count,
      staged_rows_suppressed: completedRows.filter(r => r.card_print.data_quality_flags.app_visibility_v1?.status === 'suppressed').length },
    payload, payload_fingerprint_sha256: hash(payload),
    replay_input: structuredClone(input), replay_input_sha256: hash(input),
  };
}

export function validateOnePieceIncrementalPrintingPromotionV2(plan) {
  try {
    assert.equal(plan.version, ONE_PIECE_INCREMENTAL_PRINTING_PROMOTION_VERSION);
    assert.equal(hash(plan.replay_input), plan.replay_input_sha256);
    const replay = buildOnePieceIncrementalPrintingPromotionV2(plan.replay_input);
    assert.deepEqual(plan, replay, 'promotion_plan_replay_mismatch');
    return { valid: true, findings: [] };
  } catch (error) {
    return { valid: false, findings: [error.message] };
  }
}
