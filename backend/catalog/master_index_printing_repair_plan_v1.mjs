import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildPrintingAdmissionPlan,printingManifestHash} from './printing_completeness_gate_v1.mjs';
import {reconcileMasterPrintings} from './master_index_printing_authority_v1.mjs';

export const PRINTING_REPAIR_PLAN_VERSION='MASTER_INDEX_ADDITIVE_PRINTING_REPAIR_V1';
const blank=value=>value===null||value==='';

// Preparation only. No transport, SQL execution or production authorization.
export function buildMasterPrintingRepairPlan({manifest,artifacts,snapshot,fullPrintings,reviews,dependencyEvidence,asOf}) {
  const reconciliation=reconcileMasterPrintings(manifest,snapshot,{artifacts,asOf});
  const allowed=new Set(['expected_printing_missing','provenance_recovery_required','truth_review_required']);
  assert.ok(reconciliation.findings.every(f=>allowed.has(f.classification)),'non_additive_or_identity_conflict');
  assert.ok(Array.isArray(fullPrintings)&&Array.isArray(reviews),'full_row_and_review_inventory_required');
  assert.equal(fullPrintings.length,snapshot.printings.length,'full_row_inventory_mismatch');
  assert.equal(new Set(fullPrintings.map(p=>p.id)).size,fullPrintings.length,'duplicate_full_row');
  assert.ok(dependencyEvidence && /^[a-f0-9]{64}$/.test(dependencyEvidence.inventory_sha256),'dependency_inventory_required');
  assert.ok(artifacts.has(dependencyEvidence.inventory_ref),'dependency_inventory_bytes_required');
  assert.equal(createHash('sha256').update(artifacts.get(dependencyEvidence.inventory_ref)).digest('hex'),dependencyEvidence.inventory_sha256,'dependency_inventory_hash_mismatch');
  assert.ok(Array.isArray(dependencyEvidence.foreign_keys)&&Array.isArray(dependencyEvidence.protected_footprints),'dependency_details_required');
  assert.ok(Array.isArray(dependencyEvidence.proposed_uuid_collisions)&&dependencyEvidence.proposed_uuid_collisions.length===0,'proposed_uuid_collision');
  const admission=buildPrintingAdmissionPlan(manifest,snapshot.printings);
  assert.deepEqual([...(dependencyEvidence.checked_proposed_ids??[])].sort(),admission.inserts.map(p=>p.id).sort(),'proposed_uuid_check_incomplete');
  const sourceRef=`master-index:${manifest.fingerprint}`;
  const fullById=new Map(fullPrintings.map(p=>[p.id,p]));
  const provenanceUpdates=[];
  for(const actual of snapshot.printings) {
    const full=fullById.get(actual.id);
    assert.ok(full,'full_row_missing');
    for(const key of ['id','card_print_id','finish_key','printing_gv_id','is_provisional','provenance_source','provenance_ref']) {
      assert.equal(full[key],actual[key],`full_row_drift:${key}`);
    }
    assert.equal(actual.is_provisional,false,'provisional_requires_separate_adjudication');
    const active=reviews.filter(r=>r.card_printing_id===actual.id&&r.active);
    assert.ok(active.length<=1,'duplicate_active_review');
    if(active.length) {
      assert.equal(active[0].review_status,'verified','adverse_review_requires_separate_adjudication');
      assert.equal(active[0].public_visibility,'visible','hidden_review_requires_separate_adjudication');
      assert.equal(actual.review_status,active[0].review_status,'review_snapshot_drift');
      assert.equal(actual.public_visibility,active[0].public_visibility,'review_snapshot_drift');
      assert.equal(actual.active,true,'review_snapshot_drift');
    } else {
      assert.ok(actual.active==null&&actual.review_status==null&&actual.public_visibility==null,'review_snapshot_drift');
      assert.equal(reviews.filter(r=>r.card_printing_id===actual.id).length,0,'historical_review_requires_separate_adjudication');
    }
    if(blank(actual.provenance_source)||blank(actual.provenance_ref)) {
      assert.ok(blank(actual.provenance_source)&&blank(actual.provenance_ref),'partial_provenance_requires_separate_adjudication');
      provenanceUpdates.push({printing_id:actual.id,before:full,before_sha256:printingManifestHash(full),
        patch:{provenance_source:PRINTING_REPAIR_PLAN_VERSION,provenance_ref:sourceRef},
        preserve_all_other_fields:true});
    }
  }
  assert.ok(reviews.every(r=>fullById.has(r.card_printing_id)),'review_outside_scope');
  const inserts=admission.inserts.map(p=>({id:p.id,card_print_id:p.card_print_id,finish_key:p.finish_key,
    printing_gv_id:p.printing_gv_id,is_provisional:false,provenance_source:PRINTING_REPAIR_PLAN_VERSION,provenance_ref:sourceRef}));
  const targets=[...admission.retained,...inserts];
  const reviewInserts=targets.filter(p=>!reviews.some(r=>r.card_printing_id===p.id&&r.active)).map(p=>({
    card_printing_id:p.id,review_status:'verified',public_visibility:'visible',active:true,confidence:'high',
    reason:'Exact base-release parent and finish supported by the reviewed Master Index manifest.',
    evidence_sources_checked:manifest.authority.source_artifacts.map(s=>s.url_or_identifier),
    evidence_sources_for_finish:manifest.printings.find(w=>w.card_print_id===p.card_print_id&&w.finish_key===p.finish_key).evidence.map(e=>e.source_ref),
    expected_finish_keys:manifest.printings.filter(w=>w.card_print_id===p.card_print_id).map(w=>w.finish_key).sort(),
    evidence:{manifest_fingerprint:manifest.fingerprint,master_index_sha256:manifest.master_index_sha256,
      review_sha256:manifest.authority.review.sha256,card_print_id:p.card_print_id,finish_key:p.finish_key},
    source_report_path:sourceRef,
  }));
  const hasChanges=inserts.length+provenanceUpdates.length+reviewInserts.length>0;
  const plan={version:PRINTING_REPAIR_PLAN_VERSION,status:hasChanges?'prepared_not_authorized':'no_change',write_ready:false,
    manifest_fingerprint:manifest.fingerprint,snapshot_fingerprint:snapshot.fingerprint,
    reconciliation_fingerprint:reconciliation.fingerprint,dependency_evidence:dependencyEvidence,
    raw_evidence_candidate:hasChanges?{source:PRINTING_REPAIR_PLAN_VERSION,status:'processed',payload:{manifest,review:JSON.parse(artifacts.get(manifest.authority.review.ref).toString())}}:null,
    printing_inserts:inserts,provenance_updates:provenanceUpdates,review_inserts:reviewInserts,
    retained_printing_ids:admission.retained.map(p=>p.id),
    expected_mutation_counts:{raw_evidence_inserts:hasChanges?1:0,printing_inserts:inserts.length,provenance_updates:provenanceUpdates.length,review_inserts:reviewInserts.length},
    rollback:{precommit:'transaction_rollback',postcommit:'No automatic deletion: inspect new ownership/references and obtain a bounded recovery plan.',
      retained_before_rows:provenanceUpdates.map(p=>({id:p.printing_id,row:p.before,sha256:p.before_sha256}))},
    pending_gates:['frozen_execution_authority','transactional_preflight','local_rollback_proof','exact_postcommit_readback','zero_row_idempotency','vault_client_smoke'],
    boundaries:{parent_writes:0,identity_reassignments:0,ownership_writes:0,mapping_writes:0,pricing_writes:0,image_writes:0,storage_writes:0,deletes:0}};
  return {...plan,fingerprint:printingManifestHash(plan)};
}
