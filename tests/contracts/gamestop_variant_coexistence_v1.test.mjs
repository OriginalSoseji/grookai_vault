import test from 'node:test';
import assert from 'node:assert/strict';
import { auditWarehouseCandidateIdentitySlotV1 } from '../../backend/identity/identity_slot_audit_v1.mjs';

function fixture({ name = 'Flapple', set = 'swsh2', number = '022/192', keys = ['prerelease_stamp', 'staff_stamp'] } = {}) {
  const plain = number.split('/')[0].replace(/^0+/, '');
  const candidate = { claimed_identity_payload: {
    name, card_name: name, set_code: set, printed_number: number, number_plain: plain,
    bridge_source: 'external_discovery_bridge_v1', source_candidate_id: 'discovery-1', source_raw_import_id: '123',
    variant_key: 'gamestop_stamp', variant_identity_rule: 'STAMPED_IDENTITY_RULE_V1',
    variant_identity: { rule: 'STAMPED_IDENTITY_RULE_V1', status: 'RESOLVED_STAMPED_IDENTITY', applies: true,
      variant_key: 'gamestop_stamp', source_evidence: {
        pre_intake_audit: { live_source_candidate_id: 'discovery-1', image_url: 'https://example.test/exact.jpg', image_sha256: 'a'.repeat(64) },
        underlying_base_proof_summary: { underlying_base_state: 'PROVEN', live_base_set_code: set, live_base_card_print_id: 'base' },
      } },
  } };
  return { candidate, slotRows: [null, ...keys].map((key, i) => ({
    id: i === 0 ? 'base' : `variant-${i}`, set_code: set, name, number: plain, number_plain: plain, variant_key: key,
  })) };
}

for (const scope of [
  {},
  { name: 'Umbreon', set: 'sv03', number: '130/197', keys: ['obsidian_flames_stamp'] },
  { name: 'Charmander', set: 'sv03.5', number: '004/165', keys: ['eb_games_stamp'] },
  { name: 'Teal Mask Ogerpon', set: 'sv06', number: '024/167', keys: ['twilight_masquerade_stamp'] },
  { name: 'Yveltal', set: 'me01', number: '088/132', keys: ['mega_evolution_stamp'] },
]) {
  test(`reviewed GameStop variant coexists in ${scope.set ?? 'swsh2'} without modifying its base`, async () => {
    const input = fixture(scope), before = structuredClone(input);
    const result = await auditWarehouseCandidateIdentitySlotV1(null, input);
    assert.equal(result.identity_audit_status, 'VARIANT_IDENTITY');
    assert.equal(result.reason_code, 'VARIANT_COEXISTENCE_ALLOWED');
    assert.equal(result.routing.proposed_action_type, 'CREATE_CARD_PRINT');
    assert.equal(result.routing.variant_key, 'gamestop_stamp');
    assert.deepEqual(input, before);
  });
}

const corruptions = [
  ['missing physical image hash', x => delete x.candidate.claimed_identity_payload.variant_identity.source_evidence.pre_intake_audit.image_sha256],
  ['discovery lineage mismatch', x => x.candidate.claimed_identity_payload.variant_identity.source_evidence.pre_intake_audit.live_source_candidate_id = 'other'],
  ['missing raw lineage', x => delete x.candidate.claimed_identity_payload.source_raw_import_id],
  ['unresolved stamped identity', x => x.candidate.claimed_identity_payload.variant_identity.status = 'AMBIGUOUS'],
  ['unproven base', x => x.candidate.claimed_identity_payload.variant_identity.source_evidence.underlying_base_proof_summary.underlying_base_state = 'MISSING'],
  ['wrong base ID', x => x.candidate.claimed_identity_payload.variant_identity.source_evidence.underlying_base_proof_summary.live_base_card_print_id = 'other'],
  ['wrong base set', x => x.candidate.claimed_identity_payload.variant_identity.source_evidence.underlying_base_proof_summary.live_base_set_code = 'other'],
  ['cross-set occupant', x => x.slotRows[1].set_code = 'other'],
  ['cross-number occupant', x => x.slotRows[1].number_plain = '23'],
  ['different-name occupant', x => x.slotRows[1].name = 'Applin'],
  ['duplicate base', x => x.slotRows.push({ ...x.slotRows[0], id: 'other-base' })],
  ['duplicate stamped key', x => x.slotRows.push({ ...x.slotRows[1], id: 'other-stamp' })],
  ['finish masquerading as identity', x => x.slotRows[1].variant_key = 'cosmos_holo'],
  ['unknown stamp spelling', x => x.slotRows[1].variant_key = 'eb_games_stamped'],
  ['wrong expansion stamp', x => x.slotRows[1].variant_key = 'obsidian_flames_stamp'],
];
for (const [label, corrupt] of corruptions) {
  test(`GameStop coexistence retains hold for ${label}`, async () => {
    const input = fixture(); corrupt(input);
    const result = await auditWarehouseCandidateIdentitySlotV1(null, input);
    assert.notEqual(result.routing.proposed_action_type, 'CREATE_CARD_PRINT');
    assert.equal(result.variant_coexistence.allowed, false);
  });
}

test('an already canonical GameStop variant remains an alias and cannot be created again', async () => {
  const input = fixture(); input.slotRows.push({ ...input.slotRows[0], id: 'existing-gamestop', variant_key: 'gamestop_stamp' });
  const result = await auditWarehouseCandidateIdentitySlotV1(null, input);
  assert.equal(result.identity_audit_status, 'ALIAS');
  assert.notEqual(result.routing.proposed_action_type, 'CREATE_CARD_PRINT');
});
