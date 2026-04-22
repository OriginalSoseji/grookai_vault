import test from 'node:test';
import assert from 'node:assert/strict';

import {
  IDENTITY_RESOLUTION_STATES,
  resolveIdentityResolutionV1,
  validateIdentityResolutionForApprovedActionV1,
} from './identity_resolution_v1.mjs';

function buildClassificationPackage(identityAuditStatus, extras = {}) {
  return {
    candidate_id: 'candidate-1',
    classification_status: 'CLASSIFIED_READY',
    interpreter_decision: 'ROW',
    interpreter_reason_code: identityAuditStatus,
    interpreter_explanation: `explanation:${identityAuditStatus}`,
    proposed_action_type: 'CREATE_CARD_PRINT',
    metadata_documentation: {
      extracted_fields: {
        identity_audit_package: {
          identity_audit_status: identityAuditStatus,
          reason_code: `${identityAuditStatus}_REASON`,
          routing: {
            matched_card_print_id: 'cp-1',
            matched_card_printing_id: null,
            variant_key: 'prerelease_stamp',
            finish_key: 'masterball',
          },
        },
      },
    },
    ...extras,
  };
}

function buildAliasCandidate() {
  return {
    claimed_identity_payload: {
      external_source: 'justtcg',
      upstream_id: 'pokemon-me02-phantasmal-flames-ghastly-common',
      source_set_id: 'me02-phantasmal-flames-pokemon',
      source_candidate_id: 'src-1',
      bridge_source: 'external_discovery_bridge_v1',
    },
    reference_hints_payload: {
      external_source: 'justtcg',
      source_set_id: 'me02-phantasmal-flames-pokemon',
      source_candidate_id: 'src-1',
      bridge_source: 'external_discovery_bridge_v1',
      source_card_snapshot: {
        external_id: 'pokemon-me02-phantasmal-flames-ghastly-common',
      },
    },
  };
}

test('NEW_CANONICAL resolves to PROMOTE_NEW', () => {
  const result = resolveIdentityResolutionV1({
    classificationPackage: buildClassificationPackage('NEW_CANONICAL'),
  });

  assert.equal(result.identity_resolution, IDENTITY_RESOLUTION_STATES.PROMOTE_NEW);
  assert.equal(result.action_payload?.approved_action_type, 'CREATE_CARD_PRINT');
  assert.equal(result.action_payload?.target_table, 'card_prints');
});

test('VARIANT_IDENTITY resolves to PROMOTE_VARIANT', () => {
  const result = resolveIdentityResolutionV1({
    classificationPackage: buildClassificationPackage('VARIANT_IDENTITY'),
  });

  assert.equal(result.identity_resolution, IDENTITY_RESOLUTION_STATES.PROMOTE_VARIANT);
  assert.equal(result.action_payload?.approved_action_type, 'CREATE_CARD_PRINT');
  assert.equal(result.action_payload?.variant_key, 'prerelease_stamp');
});

test('PRINTING_ONLY resolves to ATTACH_PRINTING', () => {
  const result = resolveIdentityResolutionV1({
    classificationPackage: buildClassificationPackage('PRINTING_ONLY', {
      proposed_action_type: 'CREATE_CARD_PRINTING',
    }),
  });

  assert.equal(result.identity_resolution, IDENTITY_RESOLUTION_STATES.ATTACH_PRINTING);
  assert.equal(result.action_payload?.action_type, 'ATTACH_PRINTING');
  assert.equal(result.action_payload?.approved_action_type, 'CREATE_CARD_PRINTING');
  assert.equal(result.action_payload?.finish_key, 'masterball');
});

test('ALIAS resolves to MAP_ALIAS with external mapping payload', () => {
  const result = resolveIdentityResolutionV1({
    candidate: buildAliasCandidate(),
    classificationPackage: buildClassificationPackage('ALIAS', {
      classification_status: 'CLASSIFIED_PARTIAL',
      interpreter_decision: 'BLOCKED',
      proposed_action_type: 'REVIEW_REQUIRED',
    }),
  });

  assert.equal(result.identity_resolution, IDENTITY_RESOLUTION_STATES.MAP_ALIAS);
  assert.equal(result.action_payload?.action_type, 'UPSERT_EXTERNAL_MAPPING');
  assert.equal(result.action_payload?.source, 'justtcg');
  assert.equal(result.action_payload?.external_id, 'pokemon-me02-phantasmal-flames-ghastly-common');
  assert.equal(result.action_payload?.matched_card_print_id, 'cp-1');
  assert.deepEqual(result.action_payload?.missing_requirements, []);
});

test('SLOT_CONFLICT resolves to BLOCK_REVIEW_REQUIRED', () => {
  const result = resolveIdentityResolutionV1({
    classificationPackage: buildClassificationPackage('SLOT_CONFLICT', {
      classification_status: 'CLASSIFIED_PARTIAL',
      interpreter_decision: 'BLOCKED',
      proposed_action_type: 'REVIEW_REQUIRED',
    }),
  });

  assert.equal(result.identity_resolution, IDENTITY_RESOLUTION_STATES.BLOCK_REVIEW_REQUIRED);
  assert.equal(result.action_payload?.action_type, 'FOUNDER_REVIEW');
});

test('AMBIGUOUS resolves to BLOCK_AMBIGUOUS', () => {
  const result = resolveIdentityResolutionV1({
    classificationPackage: buildClassificationPackage('AMBIGUOUS', {
      classification_status: 'CLASSIFIED_PARTIAL',
      interpreter_decision: 'BLOCKED',
      proposed_action_type: 'REVIEW_REQUIRED',
    }),
  });

  assert.equal(result.identity_resolution, IDENTITY_RESOLUTION_STATES.BLOCK_AMBIGUOUS);
  assert.equal(result.action_payload?.action_type, 'MANUAL_IDENTITY_REVIEW');
});

test('validation allows executable parent and printing resolutions', () => {
  assert.equal(
    validateIdentityResolutionForApprovedActionV1('PROMOTE_NEW', 'CREATE_CARD_PRINT').ok,
    true,
  );
  assert.equal(
    validateIdentityResolutionForApprovedActionV1('PROMOTE_VARIANT', 'CREATE_CARD_PRINT').ok,
    true,
  );
  assert.equal(
    validateIdentityResolutionForApprovedActionV1('ATTACH_PRINTING', 'CREATE_CARD_PRINTING').ok,
    true,
  );
  assert.equal(
    validateIdentityResolutionForApprovedActionV1('ATTACH_PRINTING', 'ENRICH_CANON_IMAGE').ok,
    true,
  );
});

test('validation blocks mapping and review resolutions from promotion actions', () => {
  assert.equal(
    validateIdentityResolutionForApprovedActionV1('MAP_ALIAS', 'CREATE_CARD_PRINT').ok,
    false,
  );
  assert.equal(
    validateIdentityResolutionForApprovedActionV1('BLOCK_REVIEW_REQUIRED', 'CREATE_CARD_PRINT').ok,
    false,
  );
  assert.equal(
    validateIdentityResolutionForApprovedActionV1('BLOCK_AMBIGUOUS', 'CREATE_CARD_PRINTING').ok,
    false,
  );
});
