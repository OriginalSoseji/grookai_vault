import test from 'node:test';
import assert from 'node:assert/strict';

import {
  IDENTITY_AUDIT_STATUSES,
  auditWarehouseCandidateIdentitySlotV1,
  fetchSlotOccupantsByIdentityV1,
  normalizeWarehouseNumberPlainV1,
} from './identity_slot_audit_v1.mjs';
import { getSourceBackedIdentity } from '../warehouse/source_identity_contract_v1.mjs';

function buildCandidate(overrides = {}) {
  return {
    id: 'candidate-1',
    notes: null,
    claimed_identity_payload: {},
    reference_hints_payload: {},
    ...overrides,
  };
}

function buildBwpSlashStampedCandidate(overrides = {}) {
  const proofSummary = {
    underlying_base_state: 'PROVEN',
    live_base_set_code: 'bw4',
    live_base_card_print_id: 'base-arcanine',
  };

  return buildCandidate({
    claimed_identity_payload: {
      name: 'Arcanine',
      card_name: 'Arcanine',
      printed_number: '12/99',
      number_plain: '12',
      set_code: 'bwp',
      set_name: 'BW Black Star Promos',
      variant_key: 'prerelease_stamp',
      variant_identity_rule: 'STAMPED_IDENTITY_RULE_V1',
      variant_identity_status: 'RESOLVED_STAMPED_IDENTITY',
      variant_identity: {
        rule: 'STAMPED_IDENTITY_RULE_V1',
        status: 'RESOLVED_STAMPED_IDENTITY',
        variant_key: 'prerelease_stamp',
        source_evidence: {
          underlying_base_proof_summary: proofSummary,
        },
      },
    },
    reference_hints_payload: {
      bridge_source: 'external_discovery_bridge_v1',
      source_set_id: 'black-and-white-promos-pokemon',
      name: 'Arcanine',
      card_name: 'Arcanine',
      printed_number: '12/99',
      number_plain: '12',
      set_code: 'bwp',
      set_name: 'BW Black Star Promos',
      variant_key: 'prerelease_stamp',
      variant_identity_rule: 'STAMPED_IDENTITY_RULE_V1',
      variant_identity_status: 'RESOLVED_STAMPED_IDENTITY',
      stamped_identity_evidence: {
        underlying_base_proof_summary: proofSummary,
      },
    },
    ...overrides,
  });
}

function buildPromoFamilySlashStampedCandidate({
  sourceSetId,
  declaredSetCode,
  setName,
  name,
  printedNumber,
  numberPlain,
  variantKey = 'prerelease_stamp',
  underlyingBaseSetCode,
  underlyingBaseCardPrintId,
  ...overrides
}) {
  const proofSummary = {
    underlying_base_state: 'PROVEN',
    live_base_set_code: underlyingBaseSetCode,
    live_base_card_print_id: underlyingBaseCardPrintId,
  };

  return buildCandidate({
    claimed_identity_payload: {
      name,
      card_name: name,
      printed_number: printedNumber,
      number_plain: numberPlain,
      set_code: declaredSetCode,
      set_name: setName,
      variant_key: variantKey,
      variant_identity_rule: 'STAMPED_IDENTITY_RULE_V1',
      variant_identity_status: 'RESOLVED_STAMPED_IDENTITY',
      variant_identity: {
        rule: 'STAMPED_IDENTITY_RULE_V1',
        status: 'RESOLVED_STAMPED_IDENTITY',
        variant_key: variantKey,
        source_evidence: {
          underlying_base_proof_summary: proofSummary,
        },
      },
    },
    reference_hints_payload: {
      bridge_source: 'external_discovery_bridge_v1',
      source_set_id: sourceSetId,
      name,
      card_name: name,
      printed_number: printedNumber,
      number_plain: numberPlain,
      set_code: declaredSetCode,
      set_name: setName,
      variant_key: variantKey,
      variant_identity_rule: 'STAMPED_IDENTITY_RULE_V1',
      variant_identity_status: 'RESOLVED_STAMPED_IDENTITY',
      stamped_identity_evidence: {
        underlying_base_proof_summary: proofSummary,
      },
    },
    ...overrides,
  });
}

function buildPrizePackStampedCandidate({
  name,
  printedNumber,
  numberPlain,
  setCode,
  variantKey = 'play_pokemon_stamp',
  variantIdentityRule = 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
  stampLabel = 'Play! Pokemon Stamp',
  ...overrides
}) {
  const proofSummary = {
    underlying_base_state: 'PROVEN',
    live_base_set_code: setCode,
    live_base_card_print_id: `base-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  };

  return buildCandidate({
    claimed_identity_payload: {
      name,
      card_name: name,
      printed_number: printedNumber,
      number_plain: numberPlain,
      set_code: setCode,
      variant_key: variantKey,
      variant_identity_rule: variantIdentityRule,
      variant_identity_status: 'RESOLVED_STAMPED_IDENTITY',
      variant_identity: {
        rule: variantIdentityRule,
        status: 'RESOLVED_STAMPED_IDENTITY',
        variant_key: variantKey,
        stamp_label: stampLabel,
        source_evidence: {
          underlying_base_proof_summary: proofSummary,
        },
      },
    },
    reference_hints_payload: {
      source_set_id: 'prize-pack-series-cards-pokemon',
      name,
      card_name: name,
      printed_number: printedNumber,
      number_plain: numberPlain,
      set_code: setCode,
      variant_key: variantKey,
      variant_identity_rule: variantIdentityRule,
      variant_identity_status: 'RESOLVED_STAMPED_IDENTITY',
      stamp_label: stampLabel,
      stamped_identity_evidence: {
        underlying_base_proof_summary: proofSummary,
      },
      variant_identity: {
        rule: variantIdentityRule,
        status: 'RESOLVED_STAMPED_IDENTITY',
        variant_key: variantKey,
        stamp_label: stampLabel,
      },
    },
    ...overrides,
  });
}

test('slash-number normalization keeps the left-side collector number', () => {
  assert.equal(normalizeWarehouseNumberPlainV1('054/094'), '54');
  assert.equal(normalizeWarehouseNumberPlainV1('022'), '22');
});

test('empty slot becomes NEW_CANONICAL', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildCandidate(),
    visibleIdentityHints: {
      card_name: 'Charcadet',
      printed_number: '022',
      printed_number_plain: '22',
      set_hint: 'me02',
    },
    slotRows: [],
  });

  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.NEW_CANONICAL);
  assert.equal(result.routing.proposed_action_type, 'CREATE_CARD_PRINT');
});

test('safe spelling alias resolves Ghastly onto existing Gastly', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildCandidate(),
    visibleIdentityHints: {
      card_name: 'Ghastly',
      printed_number: '054/094',
      printed_number_plain: '54',
      set_hint: 'me02',
    },
    slotRows: [
      {
        id: 'canon-gastly',
        set_code: 'me02',
        name: 'Gastly',
        number: '054',
        number_plain: '054',
        variant_key: '',
      },
    ],
  });

  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.ALIAS);
  assert.equal(result.reason_code, 'SAFE_NAME_ALIAS_MATCH');
  assert.equal(result.routing.matched_card_print_id, 'canon-gastly');
});

test('occupied slot with a different name becomes SLOT_CONFLICT', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildCandidate(),
    visibleIdentityHints: {
      card_name: 'Charcadet',
      printed_number: '022',
      printed_number_plain: '22',
      set_hint: 'me02',
    },
    slotRows: [
      {
        id: 'canon-dewgong',
        set_code: 'me02',
        name: 'Dewgong',
        number: '022',
        number_plain: '022',
        variant_key: '',
      },
    ],
  });

  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.SLOT_CONFLICT);
});

test('finish-only masterball candidate becomes PRINTING_ONLY', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildCandidate({ notes: 'Master Ball pattern parallel' }),
    visibleIdentityHints: {
      card_name: 'Pikachu',
      printed_number: '025/165',
      printed_number_plain: '25',
      set_hint: 'sv03.5',
    },
    finishInterpretation: {
      decision: 'CHILD',
      resolvedFinishKey: 'masterball',
    },
    slotRows: [
      {
        id: 'canon-pikachu',
        set_code: 'sv03.5',
        name: 'Pikachu',
        number: '025/165',
        number_plain: '025',
        variant_key: '',
      },
    ],
  });

  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.PRINTING_ONLY);
  assert.equal(result.routing.proposed_action_type, 'CREATE_CARD_PRINTING');
  assert.equal(result.routing.finish_key, 'masterball');
});

test('identity-bearing modifier becomes VARIANT_IDENTITY', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildCandidate({ notes: 'Prerelease stamp promo' }),
    visibleIdentityHints: {
      card_name: 'Pikachu',
      printed_number: '105',
      printed_number_plain: '105',
      set_hint: 'svp',
    },
    slotRows: [
      {
        id: 'canon-base',
        set_code: 'svp',
        name: 'Pikachu',
        number: '105',
        number_plain: '105',
        variant_key: '',
      },
    ],
  });

  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.VARIANT_IDENTITY);
  assert.equal(result.routing.variant_key, 'prerelease_stamp');
  assert.equal(result.routing.proposed_action_type, 'CREATE_CARD_PRINT');
});

test('source-backed BW promo slash-number reroutes canonical set code to the proven underlying base set', () => {
  const identity = getSourceBackedIdentity(buildBwpSlashStampedCandidate());

  assert.equal(identity.set_code, 'bw4');
  assert.equal(identity.declared_set_code, 'bwp');
  assert.equal(identity.set_routing_reason, 'PROMO_SLASH_NUMBER_UNDERLYING_BASE_SET_ROUTE');
  assert.equal(identity.underlying_base_card_print_id, 'base-arcanine');
});

test('slot audit prefers routed underlying set code over BW promo family set hint for slash-number stamped rows', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildBwpSlashStampedCandidate(),
    visibleIdentityHints: {
      card_name: 'Arcanine',
      printed_number: '12/99',
      printed_number_plain: '12',
      set_hint: 'bwp',
    },
    slotRows: [
      {
        id: 'base-arcanine',
        set_code: 'bw4',
        name: 'Arcanine',
        number: '12',
        number_plain: '12',
        variant_key: '',
      },
    ],
  });

  assert.equal(result.candidate_identity.set_code, 'bw4');
  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.VARIANT_IDENTITY);
  assert.equal(result.reason_code, 'IDENTITY_DELTA_VARIANT_KEY');
});

test('slot audit prefers routed underlying set code over DPP promo family set hint for slash-number stamped rows', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildPromoFamilySlashStampedCandidate({
      sourceSetId: 'diamond-and-pearl-promos-pokemon',
      declaredSetCode: 'dpp',
      setName: 'DP Black Star Promos',
      name: 'Gabite',
      printedNumber: '48/123',
      numberPlain: '48',
      variantKey: 'staff_prerelease_stamp',
      underlyingBaseSetCode: 'dp2',
      underlyingBaseCardPrintId: 'base-gabite',
    }),
    visibleIdentityHints: {
      card_name: 'Gabite',
      printed_number: '48/123',
      printed_number_plain: '48',
      set_hint: 'dpp',
    },
    slotRows: [
      {
        id: 'base-gabite',
        set_code: 'dp2',
        name: 'Gabite',
        number: '48',
        number_plain: '48',
        variant_key: '',
      },
    ],
  });

  assert.equal(result.candidate_identity.set_code, 'dp2');
  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.VARIANT_IDENTITY);
  assert.equal(result.reason_code, 'IDENTITY_DELTA_VARIANT_KEY');
});

test('slot audit prefers routed underlying set code over Nintendo promo family set hint for slash-number stamped rows', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildPromoFamilySlashStampedCandidate({
      sourceSetId: 'nintendo-promos-pokemon',
      declaredSetCode: 'np',
      setName: 'Nintendo Black Star Promos',
      name: 'Leafeon',
      printedNumber: '17/90',
      numberPlain: '17',
      variantKey: 'staff_prerelease_stamp',
      underlyingBaseSetCode: 'hgss3',
      underlyingBaseCardPrintId: 'base-leafeon',
    }),
    visibleIdentityHints: {
      card_name: 'Leafeon',
      printed_number: '17/90',
      printed_number_plain: '17',
      set_hint: 'np',
    },
    slotRows: [
      {
        id: 'base-leafeon',
        set_code: 'hgss3',
        name: 'Leafeon',
        number: '17',
        number_plain: '17',
        variant_key: '',
      },
    ],
  });

  assert.equal(result.candidate_identity.set_code, 'hgss3');
  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.VARIANT_IDENTITY);
  assert.equal(result.reason_code, 'IDENTITY_DELTA_VARIANT_KEY');
});

test('coexistence allows base plus white flare stamp plus generic Play Pokemon stamp', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildPrizePackStampedCandidate({
      name: 'Reshiram ex',
      printedNumber: '020/086',
      numberPlain: '20',
      setCode: 'sv10.5w',
    }),
    visibleIdentityHints: {
      card_name: 'Reshiram ex',
      printed_number: '020/086',
      printed_number_plain: '20',
      set_hint: 'sv10.5w',
      variant_key: 'play_pokemon_stamp',
    },
    slotRows: [
      {
        id: 'base-reshiram',
        set_code: 'sv10.5w',
        name: 'Reshiram ex',
        number: '020',
        number_plain: '020',
        variant_key: '',
      },
      {
        id: 'white-flare-stamp',
        set_code: 'sv10.5w',
        name: 'Reshiram ex',
        number: '020',
        number_plain: '020',
        variant_key: 'white_flare_stamp',
      },
    ],
  });

  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.VARIANT_IDENTITY);
  assert.equal(result.reason_code, 'VARIANT_COEXISTENCE_ALLOWED');
  assert.equal(result.routing.proposed_action_type, 'CREATE_CARD_PRINT');
  assert.equal(result.routing.variant_key, 'play_pokemon_stamp');
  assert.equal(result.variant_coexistence?.allowed, true);
});

test('coexistence allows base plus black bolt stamp plus generic Play Pokemon stamp', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildPrizePackStampedCandidate({
      name: 'Zekrom ex',
      printedNumber: '034/086',
      numberPlain: '34',
      setCode: 'sv10.5b',
    }),
    visibleIdentityHints: {
      card_name: 'Zekrom ex',
      printed_number: '034/086',
      printed_number_plain: '34',
      set_hint: 'sv10.5b',
      variant_key: 'play_pokemon_stamp',
    },
    slotRows: [
      {
        id: 'base-zekrom',
        set_code: 'sv10.5b',
        name: 'Zekrom ex',
        number: '034',
        number_plain: '034',
        variant_key: '',
      },
      {
        id: 'black-bolt-stamp',
        set_code: 'sv10.5b',
        name: 'Zekrom ex',
        number: '034',
        number_plain: '034',
        variant_key: 'black_bolt_stamp',
      },
    ],
  });

  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.VARIANT_IDENTITY);
  assert.equal(result.reason_code, 'VARIANT_COEXISTENCE_ALLOWED');
  assert.equal(result.routing.proposed_action_type, 'CREATE_CARD_PRINT');
  assert.equal(result.routing.variant_key, 'play_pokemon_stamp');
  assert.equal(result.variant_coexistence?.allowed, true);
});

test('coexistence allows base plus scarlet and violet stamp plus generic Play Pokemon stamp', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildPrizePackStampedCandidate({
      name: 'Lucario',
      printedNumber: '114/198',
      numberPlain: '114',
      setCode: 'sv01',
    }),
    visibleIdentityHints: {
      card_name: 'Lucario',
      printed_number: '114/198',
      printed_number_plain: '114',
      set_hint: 'sv01',
      variant_key: 'play_pokemon_stamp',
    },
    slotRows: [
      {
        id: 'base-lucario',
        set_code: 'sv01',
        name: 'Lucario',
        number: '114',
        number_plain: '114',
        variant_key: '',
      },
      {
        id: 'scarlet-and-violet-stamp',
        set_code: 'sv01',
        name: 'Lucario',
        number: '114',
        number_plain: '114',
        variant_key: 'scarlet_and_violet_stamp',
      },
    ],
  });

  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.VARIANT_IDENTITY);
  assert.equal(result.reason_code, 'VARIANT_COEXISTENCE_ALLOWED');
  assert.equal(result.routing.proposed_action_type, 'CREATE_CARD_PRINT');
  assert.equal(result.routing.variant_key, 'play_pokemon_stamp');
  assert.equal(result.variant_coexistence?.allowed, true);
});

test('duplicate same variant_key still resolves as an existing exact variant, not a promotable coexistence row', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildPrizePackStampedCandidate({
      name: 'Reshiram ex',
      printedNumber: '020/086',
      numberPlain: '20',
      setCode: 'sv10.5w',
    }),
    visibleIdentityHints: {
      card_name: 'Reshiram ex',
      printed_number: '020/086',
      printed_number_plain: '20',
      set_hint: 'sv10.5w',
      variant_key: 'play_pokemon_stamp',
    },
    slotRows: [
      {
        id: 'base-reshiram',
        set_code: 'sv10.5w',
        name: 'Reshiram ex',
        number: '020',
        number_plain: '020',
        variant_key: '',
      },
      {
        id: 'existing-generic-play-stamp',
        set_code: 'sv10.5w',
        name: 'Reshiram ex',
        number: '020',
        number_plain: '020',
        variant_key: 'play_pokemon_stamp',
      },
    ],
  });

  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.ALIAS);
  assert.equal(result.reason_code, 'EXACT_VARIANT_ALREADY_CANONICAL');
  assert.equal(result.routing.proposed_action_type, 'REVIEW_REQUIRED');
});

test('same-name multi-row slot without evidence-backed variant signal stays ambiguous', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildCandidate(),
    visibleIdentityHints: {
      card_name: 'Reshiram ex',
      printed_number: '020/086',
      printed_number_plain: '20',
      set_hint: 'sv10.5w',
    },
    slotRows: [
      {
        id: 'base-reshiram',
        set_code: 'sv10.5w',
        name: 'Reshiram ex',
        number: '020',
        number_plain: '020',
        variant_key: '',
      },
      {
        id: 'white-flare-stamp',
        set_code: 'sv10.5w',
        name: 'Reshiram ex',
        number: '020',
        number_plain: '020',
        variant_key: 'white_flare_stamp',
      },
    ],
  });

  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.AMBIGUOUS);
  assert.equal(result.reason_code, 'MULTIPLE_ALIAS_MATCHES');
});

test('same slot with a different name remains a slot conflict even when the incoming row is stamped', async () => {
  const result = await auditWarehouseCandidateIdentitySlotV1(null, {
    candidate: buildPrizePackStampedCandidate({
      name: 'Reshiram ex',
      printedNumber: '020/086',
      numberPlain: '20',
      setCode: 'sv10.5w',
    }),
    visibleIdentityHints: {
      card_name: 'Reshiram ex',
      printed_number: '020/086',
      printed_number_plain: '20',
      set_hint: 'sv10.5w',
      variant_key: 'play_pokemon_stamp',
    },
    slotRows: [
      {
        id: 'different-name-row',
        set_code: 'sv10.5w',
        name: 'Emboar ex',
        number: '020',
        number_plain: '020',
        variant_key: '',
      },
    ],
  });

  assert.equal(result.identity_audit_status, IDENTITY_AUDIT_STATUSES.SLOT_CONFLICT);
  assert.equal(result.reason_code, 'SLOT_OCCUPIED_BY_DIFFERENT_NAME');
});

test('fetchSlotOccupantsByIdentityV1 queries both normalized and padded number candidates', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };

  await fetchSlotOccupantsByIdentityV1(client, {
    setCode: 'swsh12',
    printedNumber: '016/195',
    numberPlain: '016',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].params[0], 'swsh12');
  assert.deepEqual(calls[0].params[1], ['16', '016']);
});
