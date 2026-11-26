import assert from 'node:assert/strict';
import {assertGenericPlayNineIntakePlanV1} from './generic_play_nine_intake_v1.mjs';
import {loadReviewedPlayNormalAuthorityV1,proposedReviewedPlayNormalIntakeIdV1} from './reviewed_play_normal_authority_v1.mjs';

// A distinct RAW finish intake preserves its completed parent intake. The
// original bridge and classifier still own ingestion and interpretation.
export function buildReviewedPlayNormalFinishIntakesV1(parentIntakePlan) {
  assertGenericPlayNineIntakePlanV1(parentIntakePlan);const {index}=loadReviewedPlayNormalAuthorityV1();
  return parentIntakePlan.candidates.map(original=>{
    const candidate=structuredClone(original),target=index.targets.find(t=>String(t.product_id)===candidate.tcgplayer_id);assert.ok(target);
    delete candidate.reference_hints_payload.generic_play_nine_intake;
    candidate.planned_candidate_id=proposedReviewedPlayNormalIntakeIdV1(target.product_id);
    candidate.reference_hints_payload.reviewed_play_normal_finish={version:'REVIEWED_PLAY_NORMAL_FINISH_INTAKE_V1',
      evidence_fingerprint:index.fingerprint,product_id:candidate.tcgplayer_id,parent_id:target.parent.id,printing_id:target.printing.id,
      parent_warehouse_candidate_id:original.planned_candidate_id};
    candidate.notes='Reviewed original checklist Standard finish; separate RAW printing intake preserving its parent intake; no price-based finish inference.';
    return candidate;
  });
}
