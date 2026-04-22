import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSourceBackedIdentity,
  PROMO_SLASH_NUMBER_UNDERLYING_BASE_SET_ROUTE,
  resolveUnderlyingBaseFromPrintedNumberV1,
} from './source_identity_contract_v1.mjs';

function buildProofSummary(overrides = {}) {
  return {
    underlying_base_state: 'PROVEN',
    live_base_set_code: 'bw4',
    live_base_card_print_id: 'base-card-print-id',
    ...overrides,
  };
}

function buildSlashStampedCandidate({
  sourceSetId,
  declaredSetCode,
  setName,
  name,
  printedNumber,
  numberPlain,
  variantKey = 'prerelease_stamp',
  proofSummary = buildProofSummary(),
}) {
  return {
    claimed_identity_payload: {
      name,
      card_name: name,
      printed_number: printedNumber,
      number: printedNumber,
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
      number: printedNumber,
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
  };
}

test('resolveUnderlyingBaseFromPrintedNumberV1 reroutes BW promo slash-number rows to the proven base set', () => {
  const routing = resolveUnderlyingBaseFromPrintedNumberV1({
    sourceSetId: 'black-and-white-promos-pokemon',
    declaredSetCode: 'bwp',
    printedNumber: '12/99',
    variantIdentityStatus: 'RESOLVED_STAMPED_IDENTITY',
    proofSummary: buildProofSummary({ live_base_set_code: 'bw4' }),
  });

  assert.equal(routing.effective_set_code, 'bw4');
  assert.equal(routing.routing_reason, PROMO_SLASH_NUMBER_UNDERLYING_BASE_SET_ROUTE);
  assert.equal(routing.resolution_confidence, 'PROVEN_UNDERLYING_BASE');
});

test('resolveUnderlyingBaseFromPrintedNumberV1 reroutes DPP promo slash-number rows to the proven base set', () => {
  const routing = resolveUnderlyingBaseFromPrintedNumberV1({
    sourceSetId: 'diamond-and-pearl-promos-pokemon',
    declaredSetCode: 'dpp',
    printedNumber: '48/123',
    variantIdentityStatus: 'RESOLVED_STAMPED_IDENTITY',
    proofSummary: buildProofSummary({ live_base_set_code: 'dp2' }),
  });

  assert.equal(routing.effective_set_code, 'dp2');
  assert.equal(routing.routing_reason, PROMO_SLASH_NUMBER_UNDERLYING_BASE_SET_ROUTE);
});

test('resolveUnderlyingBaseFromPrintedNumberV1 reroutes Nintendo promo slash-number rows to the proven base set', () => {
  const routing = resolveUnderlyingBaseFromPrintedNumberV1({
    sourceSetId: 'nintendo-promos-pokemon',
    declaredSetCode: 'np',
    printedNumber: '17/90',
    variantIdentityStatus: 'RESOLVED_STAMPED_IDENTITY',
    proofSummary: buildProofSummary({ live_base_set_code: 'hgss3' }),
  });

  assert.equal(routing.effective_set_code, 'hgss3');
  assert.equal(routing.routing_reason, PROMO_SLASH_NUMBER_UNDERLYING_BASE_SET_ROUTE);
});

test('resolveUnderlyingBaseFromPrintedNumberV1 keeps promo-slot identities in the declared set when no slash number exists', () => {
  const routing = resolveUnderlyingBaseFromPrintedNumberV1({
    sourceSetId: 'diamond-and-pearl-promos-pokemon',
    declaredSetCode: 'dpp',
    printedNumber: 'DP05',
    variantIdentityStatus: 'RESOLVED_STAMPED_IDENTITY',
    proofSummary: buildProofSummary({ live_base_set_code: 'dpp' }),
  });

  assert.equal(routing.effective_set_code, 'dpp');
  assert.equal(routing.routing_reason, null);
});

test('resolveUnderlyingBaseFromPrintedNumberV1 keeps the declared set when no proven underlying base exists', () => {
  const routing = resolveUnderlyingBaseFromPrintedNumberV1({
    sourceSetId: 'nintendo-promos-pokemon',
    declaredSetCode: 'np',
    printedNumber: '37/109',
    variantIdentityStatus: 'RESOLVED_STAMPED_IDENTITY',
    proofSummary: buildProofSummary({
      underlying_base_state: 'UNPROVEN',
      live_base_set_code: 'ex7',
      live_base_card_print_id: null,
    }),
  });

  assert.equal(routing.effective_set_code, 'np');
  assert.equal(routing.routing_reason, null);
});

test('getSourceBackedIdentity uses generalized slash-number rerouting for mixed promo families', () => {
  const dppIdentity = getSourceBackedIdentity(
    buildSlashStampedCandidate({
      sourceSetId: 'diamond-and-pearl-promos-pokemon',
      declaredSetCode: 'dpp',
      setName: 'DP Black Star Promos',
      name: 'Gabite',
      printedNumber: '48/123',
      numberPlain: '48',
      proofSummary: buildProofSummary({
        live_base_set_code: 'dp2',
        live_base_card_print_id: 'base-gabite',
      }),
    }),
  );

  const npIdentity = getSourceBackedIdentity(
    buildSlashStampedCandidate({
      sourceSetId: 'nintendo-promos-pokemon',
      declaredSetCode: 'np',
      setName: 'Nintendo Black Star Promos',
      name: 'Leafeon',
      printedNumber: '17/90',
      numberPlain: '17',
      variantKey: 'staff_prerelease_stamp',
      proofSummary: buildProofSummary({
        live_base_set_code: 'hgss3',
        live_base_card_print_id: 'base-leafeon',
      }),
    }),
  );

  assert.equal(dppIdentity.set_code, 'dp2');
  assert.equal(dppIdentity.declared_set_code, 'dpp');
  assert.equal(dppIdentity.underlying_base_card_print_id, 'base-gabite');
  assert.equal(dppIdentity.set_routing_reason, PROMO_SLASH_NUMBER_UNDERLYING_BASE_SET_ROUTE);

  assert.equal(npIdentity.set_code, 'hgss3');
  assert.equal(npIdentity.declared_set_code, 'np');
  assert.equal(npIdentity.underlying_base_card_print_id, 'base-leafeon');
  assert.equal(npIdentity.set_routing_reason, PROMO_SLASH_NUMBER_UNDERLYING_BASE_SET_ROUTE);
});
