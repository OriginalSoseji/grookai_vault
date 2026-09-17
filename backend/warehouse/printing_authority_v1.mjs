import assert from 'node:assert/strict';
import {assertMasterPrintingAuthority} from '../catalog/master_index_printing_authority_v1.mjs';
import {printingManifestHash} from '../catalog/printing_completeness_gate_v1.mjs';

export const WAREHOUSE_PRINTING_AUTHORITY_VERSION = 'WAREHOUSE_PRINTING_AUTHORITY_V1';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

function artifactRefs(manifest) {
  return [...new Set([manifest.master_index_ref, manifest.authority.review.ref,
    ...manifest.authority.source_artifacts.map(source => source.ref)])].sort();
}

function targetPrinting(manifest, target) {
  assert.match(target?.candidate_id ?? '', uuid, 'warehouse_candidate_id_required');
  assert.match(target?.card_print_id ?? '', uuid, 'warehouse_parent_id_required');
  const printing = manifest.printings.find(row => row.card_print_id === target.card_print_id &&
    row.finish_key === target.finish_key);
  assert.ok(printing, 'warehouse_target_not_in_reviewed_master');
  assert.equal(target.printing_gv_id, printing.printing_gv_id, 'warehouse_target_gvid_mismatch');
  return printing;
}

// Carry actual evidence bytes through JSON staging. Hash strings alone cannot
// authorize a finish; the existing master validator verifies the reviewed projection.
export function freezeWarehousePrintingAuthority({manifest, artifacts, target}) {
  assertMasterPrintingAuthority(manifest, artifacts);
  targetPrinting(manifest, target);
  const body = {
    version: WAREHOUSE_PRINTING_AUTHORITY_VERSION,
    purpose: 'evidence_binding_not_execution_authorization',
    target: {
      candidate_id: target.candidate_id,
      card_print_id: target.card_print_id,
      finish_key: target.finish_key,
      printing_gv_id: target.printing_gv_id,
    },
    manifest: structuredClone(manifest),
    artifacts: artifactRefs(manifest).map(ref => ({ref,
      base64: Buffer.from(artifacts.get(ref)).toString('base64')})),
  };
  return {...body, fingerprint: printingManifestHash(body)};
}

export function assertWarehousePrintingAuthority(bundle, {target, parent}) {
  assert.equal(bundle?.version, WAREHOUSE_PRINTING_AUTHORITY_VERSION, 'warehouse_printing_authority_required');
  const {fingerprint, ...body} = bundle;
  assert.equal(fingerprint, printingManifestHash(body), 'warehouse_authority_fingerprint_mismatch');
  assert.equal(bundle.purpose, 'evidence_binding_not_execution_authorization');
  assert.ok(Array.isArray(bundle.artifacts), 'warehouse_artifact_bytes_required');
  const artifacts = new Map();
  for (const entry of bundle.artifacts) {
    assert.ok(typeof entry.ref === 'string' && entry.ref.length > 0, 'warehouse_artifact_ref_required');
    assert.ok(!artifacts.has(entry.ref), 'warehouse_duplicate_artifact');
    assert.equal(typeof entry.base64, 'string', 'warehouse_artifact_encoding_required');
    const bytes = Buffer.from(entry.base64, 'base64');
    assert.equal(bytes.toString('base64'), entry.base64, 'warehouse_noncanonical_base64');
    artifacts.set(entry.ref, bytes);
  }
  assertMasterPrintingAuthority(bundle.manifest, artifacts);
  assert.deepEqual([...artifacts.keys()].sort(), artifactRefs(bundle.manifest), 'warehouse_unbound_artifacts');
  const printing = targetPrinting(bundle.manifest, bundle.target);
  assert.ok(target, 'warehouse_live_target_required');
  for (const field of ['candidate_id', 'card_print_id', 'finish_key', 'printing_gv_id']) {
    assert.equal(target[field], bundle.target[field], `warehouse_live_target_mismatch:${field}`);
  }
  const expectedParent = bundle.manifest.parents.find(row => row.id === printing.card_print_id);
  assert.ok(parent, 'warehouse_live_parent_required');
  for (const [field, expected] of Object.entries(expectedParent)) {
    assert.ok(Object.hasOwn(parent, field), `warehouse_live_parent_missing:${field}`);
    assert.deepEqual(parent[field], expected, `warehouse_live_parent_mismatch:${field}`);
  }
  for (const field of ['game', 'language', 'set_code']) {
    assert.equal(parent[field], bundle.manifest[field], `warehouse_live_scope_mismatch:${field}`);
  }
  return {manifest: bundle.manifest, artifacts, printing, parent: expectedParent,
    authority_fingerprint: fingerprint, execution_authorized: false};
}
