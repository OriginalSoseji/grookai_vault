import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExternalDiscoveryBridgeRowsV1 as evaluate } from '../../backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs';
import { genericPlayStampEvidenceRegistryV2 } from '../../backend/identity/generic_play_stamp_identity_evidence_v2.mjs';

const registry = genericPlayStampEvidenceRegistryV2();
const context = { canonicalSetCode: null, canonicalSetName: null, rowLevelRoutingRequired: true };
function fixture(target, rawNumber = target.printed_number) {
  const plain = String(Number(rawNumber.split('/')[0]));
  const row = {
    id: `source-${target.product_id}`, source: 'justtcg',
    set_id: 'prize-pack-series-cards-pokemon', tcgplayer_id: String(target.product_id),
    upstream_id: `source-${target.product_id}`, raw_import_id: '42085',
    name_raw: target.base.name, number_raw: rawNumber,
    normalized_name: target.base.name.toLowerCase(), normalized_number_plain: plain,
    normalized_number_left: rawNumber.split('/')[0],
    normalized_printed_total: rawNumber.split('/')[1],
    match_status: 'AMBIGUOUS', candidate_bucket: 'PRINTED_IDENTITY_REVIEW',
    payload: { name: target.base.name, number: rawNumber },
    raw_payload: { name: target.base.name, number: rawNumber },
  };
  const entry = {
    name: target.base.name, printed_number: target.printed_number,
    number_plain: String(Number(target.printed_number.split('/')[0])),
    proposed_variant_key: 'play_pokemon_stamp',
    governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V2',
    effective_routed_set_code: target.base.set_code, stamp_label: 'Play! Pokémon',
  };
  return { row, entry };
}
const run = ({ row, entry }) => evaluate([row], context, { bySourceCandidateId: new Map([[row.id, entry]]) });

test('real Carmine conflict uses reviewed 145/167 consistently and preserves raw 103/131 provenance', () => {
  const input = fixture(registry.targets.find(t => t.product_id === 623656), '103/131');
  const before = structuredClone(input), result = run(input);
  assert.equal(result.blockedRows.length, 0);
  assert.equal(result.eligibleRows.length, 1);
  const candidate = result.eligibleRows[0];
  for (const payload of [candidate.claimed_identity_payload, candidate.reference_hints_payload]) {
    assert.equal(payload.printed_number, '145/167');
    assert.equal(payload.number, '145/167');
    assert.equal(payload.number_plain, '145');
    assert.equal(payload.set_code, 'sv06');
  }
  assert.equal(candidate.reference_hints_payload.source_card_snapshot.number, '103/131');
  assert.equal(candidate.reference_hints_payload.normalized_number_left, '145');
  assert.equal(candidate.reference_hints_payload.normalized_printed_total, '167');
  assert.deepEqual(candidate.reference_hints_payload.source_card_snapshot.original_discovery_number_fields,
    { number_raw: '103/131', normalized_number_left: '103', normalized_number_plain: '103', normalized_printed_total: '131' });
  assert.match(candidate.notes, /Carmine 145\/167/);
  assert.deepEqual(input, before);
  assert.equal(candidate.founder_approved_by_user_id, undefined);
  assert.equal(candidate.promoted_card_print_id, undefined);
});

test('all nine reviewed numbers survive actual bridge evaluation, including Night Stretcher zero padding', () => {
  for (const target of registry.targets) {
    const result = run(fixture(target));
    assert.equal(result.eligibleRows.length, 1, target.base.name);
    assert.equal(result.blockedRows.length, 0);
    assert.equal(result.eligibleRows[0].claimed_identity_payload.printed_number, target.printed_number);
    assert.equal(result.eligibleRows[0].reference_hints_payload.printed_number, target.printed_number);
  }
  const night = run(fixture(registry.targets.find(t => t.product_id === 619147))).eligibleRows[0];
  assert.equal(night.claimed_identity_payload.printed_number, '061/064');
  assert.equal(night.claimed_identity_payload.number_plain, '61');
});

test('changed or missing reviewed coordinates fail closed before a candidate can be inserted', () => {
  const target = registry.targets.find(t => t.product_id === 623656);
  for (const change of [
    input => { input.row.tcgplayer_id = '999999999'; },
    input => { input.entry.name = 'Miraidon'; },
    input => { input.entry.effective_routed_set_code = 'sv08pt5'; },
    input => { input.entry.proposed_variant_key = 'gamestop_stamp'; },
    input => { input.entry.printed_number = '103/131'; },
    input => { input.entry.number_plain = '103'; },
    input => { delete input.entry.printed_number; },
    input => { delete input.entry.number_plain; },
  ]) {
    const input = fixture(target, '103/131'); change(input);
    const result = run(input);
    assert.equal(result.eligibleRows.length, 0);
    assert.equal(result.blockedRows.length, 1);
    assert.equal(result.blockedRows[0].reason, 'reviewed_generic_play_number_evidence_changed');
  }
});

test('standard non-stamped intake keeps its original source number and source routing', () => {
  const { row } = fixture(registry.targets.find(t => t.product_id === 623656), '103/131');
  row.match_status = 'UNMATCHED'; row.candidate_bucket = 'CLEAN_CANON_CANDIDATE';
  const result = evaluate([row], { canonicalSetCode: 'sv08pt5', canonicalSetName: 'Prismatic Evolutions' });
  assert.equal(result.eligibleRows.length, 1);
  assert.equal(result.eligibleRows[0].claimed_identity_payload.printed_number, '103/131');
  assert.equal(result.eligibleRows[0].claimed_identity_payload.number_plain, '103');
  assert.equal(result.eligibleRows[0].claimed_identity_payload.variant_key, null);
});
