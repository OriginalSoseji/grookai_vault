import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { operationsSha256V1 } from '../operations/operations_control_plane_v1.mjs';
import { buildExistingChildImageInterpreterV1 } from './existing_child_image_interpreter_v1.mjs';
import { printingManifestHash } from '../catalog/printing_completeness_gate_v1.mjs';
import scope from '../../docs/catalog/reviewed_stamped_image_preparation_v1/index.json' with {type:'json'};
import hold from '../../docs/catalog/stamp_identity_admission_hold_v1/index.json' with {type:'json'};

export const REVIEWED_EXISTING_CHILD_IMAGE_V1 = 'REVIEWED_EXISTING_CHILD_IMAGE_V1';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const text = value => typeof value === 'string' ? value.trim() : '';
const number = value => text(value).split('/')[0].replace(/^0+(?=\d)/, '');
const clone = value => JSON.parse(JSON.stringify(value));
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const {fingerprint:scopeFingerprint,...scopeBody}=scope;
assert.equal(scopeFingerprint,'0861f7caf6453cf2f913ea8a6b95e287744a691e7c236a2a35b83434667b8828');
assert.equal(printingManifestHash(scopeBody),scopeFingerprint);
assert.equal(scope.targets.length,33);
assert.equal(new Set(scope.targets.map(t=>t.candidate_id)).size,33);
assert.equal(new Set(scope.targets.map(t=>t.printing_id)).size,33);
const {fingerprint:holdFingerprint,...holdBody}=hold;
assert.equal(holdFingerprint,'1c088dd83c399900a1526037f270dd47547bf3ce7c2da17b57b22ea491b80c92');
assert.equal(printingManifestHash(holdBody),holdFingerprint);
const held=new Set(hold.candidate_pairs.flatMap(pair=>[pair.play.id,pair.prize.id]));
assert.equal(held.size,298);
assert.ok(scope.targets.every(t=>!held.has(t.parent_id)),'held_parent_excluded_from_image_preparation');

function readReview(review, {candidate, child, original}) {
  if (review?.kind === 'authenticated_founder_operations_decision') {
    const {workItem:item, decision} = review;
    const plan = item?.plan_payload;
    assert.equal(item?.state, 'approved', 'visual_review_not_approved');
    assert.equal(item?.plan_fingerprint, operationsSha256V1(plan), 'visual_review_payload_changed');
    assert.equal(item?.command_policy?.execution_enabled, false, 'visual_review_only_required');
    assert.equal(item?.executor_version, null, 'visual_review_must_not_execute');
    assert.equal(plan?.proposal_kind, 'stamped_image_visual_review', 'supported_visual_review_required');
    assert.equal(plan?.warehouse_candidate_id, candidate.id, 'review_candidate_changed');
    assert.equal(plan?.printing_gv_id, child.printing_gv_id, 'review_printing_changed');
    assert.equal(plan?.original_image?.sha256, original.sha256, 'review_image_changed');
    for (const field of ['bytes','width','height']) assert.equal(plan.original_image[field], original[field], 'review_original_changed');
    assert.equal(decision?.work_item_id, item.id, 'decision_work_item_changed');
    assert.equal(decision?.expected_version, item.version, 'stale_visual_review_version');
    assert.equal(decision?.expected_fingerprint, item.plan_fingerprint, 'stale_visual_review_fingerprint');
    assert.equal(decision?.decision, 'approve', 'visual_approval_required');
    assert.ok(!decision.note, 'review_note_requires_reconciliation');
    assert.match(decision?.actor_user_id ?? '', uuid, 'actual_founder_actor_required');
    assert.match(decision?.id ?? '', uuid, 'actual_decision_id_required');
    const at = Date.parse(decision.created_at), expires = Date.parse(item.expires_at), created = Date.parse(plan.created_at);
    assert.ok(Number.isFinite(at) && at >= created && at <= expires, 'visual_decision_outside_original_window');
    return { claims:plan.proposed_identity,
      reference:{kind:review.kind,task_id:item.id,version:item.version,fingerprint:item.plan_fingerprint,
        decision_id:decision.id,actor_user_id:decision.actor_user_id,decided_at:decision.created_at} };
  }
  assert.equal(review?.kind, 'retained_owner_chat_confirmation', 'retained_visual_review_required');
  assert.ok(Buffer.isBuffer(review.recordBytes), 'retained_chat_bytes_required');
  assert.match(review.expectedSha256 ?? '', /^[a-f0-9]{64}$/, 'retained_chat_hash_required');
  assert.equal(hash(review.recordBytes), review.expectedSha256, 'retained_chat_changed');
  const record = JSON.parse(review.recordBytes.toString('utf8'));
  assert.equal(record.version, 'STAMPED_IMAGE_MANUAL_VISUAL_CONFIRMATION_V1', 'supported_chat_record_required');
  assert.equal(record.printingGvId, child.printing_gv_id, 'chat_printing_changed');
  assert.equal(record.originalImage?.sha256, original.sha256, 'chat_image_changed');
  assert.equal(record.originalImage?.bytes, original.bytes, 'chat_original_changed');
  assert.equal(record.manualReviewSelected, true, 'manual_chat_review_required');
  assert.equal(record.founderApprovalRows, 0, 'chat_is_not_warehouse_approval');
  assert.equal(record.imagePublications, 0, 'chat_is_not_image_publication');
  assert.ok(text(record.answerVerbatim) && Number.isFinite(Date.parse(record.recordedAt)), 'retained_owner_answer_required');
  // The sealed record is prior conversation evidence, never a forged DB decision.
  return {claims:{...record.confirmedClaims,printed_number:record.confirmedClaims?.printedNumber},
    reference:{kind:review.kind,record_sha256:review.expectedSha256,recorded_at:record.recordedAt}};
}

/** Read-only assembly of human evidence into the common metadata/interpreter shape. */
export function prepareReviewedExistingChildImageV1({
  candidate, parent, child, truthReviews, frontEvidence, classificationPackage, original, review,
}) {
  const frozen=scope.targets.find(t=>t.candidate_id===candidate?.id);
  assert.ok(frozen,'outside_frozen_33_image_preparation_scope');
  assert.equal(parent?.id,frozen.parent_id,'frozen_parent_changed');
  assert.equal(child?.id,frozen.printing_id,'frozen_printing_changed');
  assert.equal(child?.printing_gv_id,frozen.printing_gv_id,'frozen_printing_gv_id_changed');
  assert.equal(parent?.name,frozen.name,'frozen_name_changed');
  assert.equal(parent?.set_code,frozen.set_code,'frozen_set_changed');
  assert.equal(number(parent?.number_plain),number(frozen.number_plain),'frozen_number_changed');
  for(const field of ['sha256','bytes','width','height']) assert.equal(original?.[field],frozen.original[field],`frozen_original_changed:${field}`);
  assert.equal(candidate?.submission_intent, 'MISSING_IMAGE', 'image_only_candidate_required');
  assert.equal(candidate?.state, 'REVIEW_READY', 'original_review_ready_candidate_required');
  assert.equal(candidate?.current_staging_id, null, 'unconsumed_candidate_required');
  assert.equal(candidate?.founder_approved_at, null, 'no_prior_warehouse_approval_required');
  assert.equal(candidate?.founder_approved_by_user_id, null, 'no_prior_warehouse_approval_required');
  assert.equal(candidate?.proposed_action_type, 'ENRICH_CARD_PRINTING_IMAGE', 'existing_child_image_action_required');
  assert.equal(child?.card_print_id, parent?.id, 'current_parent_child_link_required');
  for (const field of ['image_source','image_path','image_url','image_alt_url']) assert.ok(!child?.[field], 'existing_child_image_must_be_preserved');
  assert.equal(frontEvidence?.candidate_id, candidate.id, 'evidence_candidate_changed');
  assert.equal(frontEvidence?.evidence_slot, 'front', 'front_required');
  assert.equal(frontEvidence?.metadata_payload?.original_image?.sha256, original?.sha256, 'evidence_image_changed');
  const activeReviews = truthReviews.filter(row=>row.card_printing_id===child.id && row.active===true);
  assert.equal(activeReviews.length,1,'one_current_truth_review_required');
  assert.equal(activeReviews[0].review_status,'verified','verified_existing_printing_required');
  assert.equal(activeReviews[0].public_visibility,'visible','visible_existing_printing_required');
  const {claims, reference} = readReview(review,{candidate,child,original});
  assert.equal(claims?.name,parent.name,'reviewed_name_mismatch');
  assert.equal(number(claims?.printed_number),number(parent.number_plain),'reviewed_number_mismatch');
  assert.equal(claims?.set_code ?? candidate.claimed_identity_payload?.set_code,parent.set_code,'reviewed_set_mismatch');
  // This first reviewed-metadata adapter is deliberately bounded to the existing
  // League Reverse image programme, not a general stamp identity creator.
  assert.equal(parent.variant_key,'league_stamp','reviewed_existing_league_identity_required');
  assert.equal(child.finish_key,'reverse','reviewed_existing_reverse_required');
  assert.equal(claims?.stamp,'Pokémon League','reviewed_stamp_mismatch');
  assert.equal(claims?.finish,'Reverse Holo','reviewed_finish_mismatch');
  const retainedGaps = clone(classificationPackage?.metadata_documentation?.unresolved_fields ?? []);
  assert.ok(Array.isArray(retainedGaps) && retainedGaps.every(value=>typeof value==='string'), 'existing_evidence_gaps_invalid');
  const metadata = {
    version:'V1',status:'READY',confidence:null,
    identity:{name:claims.name,number:parent.number_plain,printed_number:claims.printed_number,
      set_code:parent.set_code,set_name:null},
    printed_modifier:{status:'READY',modifier_key:'league_stamp',modifier_label:'Pokémon League',confidence:null,
      reason:'Previously reviewed original image and existing canonical League identity; image attachment only.',ambiguity_flags:[]},
    field_confidence:{name:null,number:null,printed_number:null,set_code:null,printed_modifier:null},
    missing_fields:[],evidence_gaps:retainedGaps,ambiguity_notes:[],next_actions:[],
    provenance:{method:'human_visual_review',review:reference,original_sha256:original.sha256,
      canonical_reference:{card_print_id:parent.id,card_printing_id:child.id,truth_review_id:activeReviews[0].id,
        set_code:parent.set_code,number_plain:parent.number_plain,variant_key:parent.variant_key,finish_key:child.finish_key},
      field_sources:{name:'human_visual_review',printed_number:'human_visual_review',printed_modifier:'human_visual_review',
        finish:'human_visual_review',set_code:'existing_canonical_reference',number:'existing_canonical_reference'},
      raw_ocr_performed:false,model_requests:0,publication_authorized:false},
  };
  const interpreter = buildExistingChildImageInterpreterV1({candidate,classificationPackage,metadataPackage:metadata,
    canonContext:{matched_card_print_id:parent.id,matched_card_printing_id:child.id,canonical_set_code:parent.set_code,
      number:parent.number_plain,variant_key:parent.variant_key,finish_key:child.finish_key},hasFrontEvidence:true,
    evidenceGaps:retainedGaps});
  assert.ok(interpreter,'current_classification_does_not_resolve_exact_image_target');
  return {version:REVIEWED_EXISTING_CHILD_IMAGE_V1,candidate_id:candidate.id,
    normalized_metadata_package:metadata,interpreter_package:interpreter,
    canonical_target:{parent_id:parent.id,printing_id:child.id},visual_review_reference:clone(reference),
    requires_separate_execution_approval:true,production_writes_authorized:false};
}
