import assert from 'node:assert/strict';
import { assertMasterPrintingAuthority } from '../catalog/master_index_printing_authority_v1.mjs';
import { printingManifestHash } from '../catalog/printing_completeness_gate_v1.mjs';
import { validateTcgplayerExactMappingCandidateForApplyV1 } from './tcgplayer_market_exact_mapping_apply_policy_v1.mjs';
import { normalizeTcgplayerMappingNumberV1 } from './tcgplayer_market_exact_mapping_plan_policy_v1.mjs';

export const MASTER_MAPPING_AUTHORITY_VERSION = 'MASTER_INDEX_MAPPING_AUTHORITY_V1';

function requiredRefs(manifest) {
  return [...new Set([manifest.master_index_ref, manifest.authority.review.ref,
    ...manifest.authority.source_artifacts.map(source => source.ref)])].sort();
}

function readScope(scope) {
  assert.ok(Array.isArray(scope?.artifacts), 'mapping_source_bytes_required');
  const artifacts = new Map();
  for (const artifact of scope.artifacts) {
    assert.ok(typeof artifact.ref === 'string' && artifact.ref.length > 0, 'mapping_source_ref_required');
    assert.ok(!artifacts.has(artifact.ref), 'mapping_duplicate_source_ref');
    assert.equal(typeof artifact.base64, 'string', 'mapping_source_encoding_required');
    const bytes = Buffer.from(artifact.base64, 'base64');
    assert.equal(bytes.toString('base64'), artifact.base64, 'mapping_source_encoding_not_canonical');
    artifacts.set(artifact.ref, bytes);
  }
  assertMasterPrintingAuthority(scope.manifest, artifacts);
  assert.deepEqual([...artifacts.keys()].sort(), requiredRefs(scope.manifest), 'mapping_unbound_artifacts');
  // This does not expand the existing English Pokemon base-mapping executor.
  assert.equal(scope.manifest.game, 'pokemon', 'mapping_game_outside_executor');
  assert.equal(scope.manifest.language, 'en', 'mapping_language_outside_executor');
  assert.equal(scope.manifest.identity_policy_version, 'POKEMON_EN_PHYSICAL_V1');
  assert.ok(Array.isArray(scope.manifest.external_mapping_assertions), 'reviewed_mapping_assertions_required');
  return scope.manifest;
}

export function assertMasterMappingBatchAuthority(selected, bundle, { liveTargets } = {}) {
  assert.ok(Array.isArray(selected) && selected.length > 0, 'mapping_selection_required');
  assert.equal(bundle?.version, MASTER_MAPPING_AUTHORITY_VERSION, 'master_mapping_authority_required');
  assert.equal(bundle.purpose, 'evidence_binding_not_execution_authorization');
  const { fingerprint, ...body } = bundle;
  assert.equal(fingerprint, printingManifestHash(body), 'master_mapping_package_hash_mismatch');
  const selectedHashes = selected.map(candidate => candidate.candidate_fingerprint).sort();
  assert.equal(new Set(selectedHashes).size, selectedHashes.length, 'duplicate_mapping_candidate');
  assert.equal(new Set(selected.map(row => row.target?.card_print_id)).size, selected.length, 'duplicate_mapping_parent');
  assert.equal(new Set(selected.map(row => Number(row.source_product_id))).size, selected.length, 'duplicate_mapping_product');
  assert.deepEqual(bundle.candidate_fingerprints, selectedHashes, 'mapping_authority_selection_mismatch');
  assert.ok(Array.isArray(bundle.scopes) && bundle.scopes.length > 0, 'mapping_scopes_required');
  const manifests = bundle.scopes.map(readScope);
  assert.equal(new Set(manifests.map(manifest => manifest.authority.set_id)).size, manifests.length, 'duplicate_mapping_scope');
  const used = new Set();
  const bindings = [];
  if (liveTargets !== undefined) {
    assert.ok(Array.isArray(liveTargets), 'mapping_live_targets_required');
    assert.deepEqual(liveTargets.map(row => row.card_print_id).sort(), selected.map(row => row.target.card_print_id).sort(), 'mapping_live_selection_mismatch');
  }
  for (const candidate of selected) {
    const structural = validateTcgplayerExactMappingCandidateForApplyV1(candidate);
    assert.ok(structural.accepted, `invalid_mapping_candidate:${structural.failures.join(',')}`);
    const manifest = manifests.find(scope => scope.authority.set_id === candidate.target.set_id);
    assert.ok(manifest, 'mapping_target_scope_not_reviewed');
    used.add(manifest.authority.set_id);
    const parent = manifest.parents.find(row => row.id === candidate.target.card_print_id);
    assert.ok(parent, 'mapping_target_parent_not_reviewed');
    assert.equal(parent.identity_domain, 'pokemon_eng_standard', 'mapping_parent_domain_outside_executor');
    assert.equal(parent.gv_id, candidate.target.gv_id, 'mapping_master_gvid_mismatch');
    assert.equal(parent.name, candidate.target.canonical_name, 'mapping_master_name_mismatch');
    assert.equal(normalizeTcgplayerMappingNumberV1(parent.printed_coordinate), normalizeTcgplayerMappingNumberV1(candidate.target.canonical_number), 'mapping_master_coordinate_mismatch');
    assert.equal(parent.variant_key ?? '', candidate.target.variant_key, 'mapping_master_variant_mismatch');
    assert.equal(manifest.set_code, candidate.target.set_code, 'mapping_master_set_code_mismatch');
    assert.ok(manifest.printings.some(row => row.card_print_id === parent.id), 'mapping_parent_has_no_reviewed_printings');
    const assertions = manifest.external_mapping_assertions.filter(row => row.candidate_fingerprint === candidate.candidate_fingerprint);
    assert.equal(assertions.length, 1, 'exact_reviewed_mapping_assertion_required');
    const assertion = assertions[0];
    assert.equal(assertion.source, 'tcgplayer');
    assert.equal(assertion.external_id, String(candidate.source_product_id));
    assert.equal(assertion.card_print_id, parent.id);
    const source = manifest.authority.source_artifacts.find(row => row.ref === assertion.source_ref);
    assert.equal(source?.kind, 'exact_printing_mapping', 'mapping_assertion_source_not_authoritative');
    assert.equal(assertion.source_sha256, source.sha256, 'mapping_assertion_source_hash_mismatch');
    if (liveTargets !== undefined) {
      const live = liveTargets.find(row => row.card_print_id === parent.id)?.parent_snapshot;
      assert.ok(live, 'mapping_live_parent_snapshot_required');
      assert.equal(live.number, candidate.target.canonical_number, 'mapping_live_raw_number_drift');
      for (const [field, expected] of Object.entries(parent)) {
        const liveField = field === 'printed_coordinate' ? 'number' : field;
        assert.ok(Object.hasOwn(live, liveField), `mapping_live_parent_field_missing:${liveField}`);
        if (field === 'printed_coordinate') {
          assert.equal(normalizeTcgplayerMappingNumberV1(live.number), normalizeTcgplayerMappingNumberV1(expected), 'mapping_live_coordinate_mismatch');
        } else {
          assert.deepEqual(live[liveField], expected, `mapping_live_parent_drift:${field}`);
        }
      }
    }
    bindings.push({ candidate_fingerprint: candidate.candidate_fingerprint,
      master_manifest_fingerprint: manifest.fingerprint, master_index_sha256: manifest.master_index_sha256,
      review_sha256: manifest.authority.review.sha256, mapping_source_sha256: source.sha256 });
  }
  assert.equal(used.size, manifests.length, 'unused_mapping_scope');
  return { fingerprint, bindings, execution_authorized: false };
}

// This only packages already-reviewed bytes; it does not create or approve reviews.
export function freezeMasterMappingAuthority(selected, scopes) {
  for (const { manifest, artifacts } of scopes) {
    assert.deepEqual([...artifacts.keys()].sort(), requiredRefs(manifest), 'mapping_unbound_artifacts');
  }
  const body = {
    version: MASTER_MAPPING_AUTHORITY_VERSION,
    purpose: 'evidence_binding_not_execution_authorization',
    candidate_fingerprints: selected.map(row => row.candidate_fingerprint).sort(),
    scopes: scopes.map(({ manifest, artifacts }) => ({ manifest: structuredClone(manifest),
      artifacts: requiredRefs(manifest).map(ref => {
        assert.ok(artifacts.has(ref), `mapping_missing_source_bytes:${ref}`);
        return { ref, base64: Buffer.from(artifacts.get(ref)).toString('base64') };
      }) })),
  };
  const bundle = { ...body, fingerprint: printingManifestHash(body) };
  assertMasterMappingBatchAuthority(selected, bundle);
  return bundle;
}
