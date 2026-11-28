import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { operationsSha256V1 } from '../../backend/operations/operations_control_plane_v1.mjs';
import { prepareReviewedExistingChildImageV1 } from '../../backend/warehouse/reviewed_existing_child_image_v1.mjs';
import { buildExistingChildImageInterpreterV1 } from '../../backend/warehouse/existing_child_image_interpreter_v1.mjs';
import scope from '../../docs/catalog/reviewed_stamped_image_preparation_v1/index.json' with {type:'json'};

const id = n => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const frozen=scope.targets.find(t=>t.name==='Rillaboom');
function fixture() {
  const candidate={id:frozen.candidate_id,submission_intent:'MISSING_IMAGE',state:'REVIEW_READY',current_staging_id:null,
    founder_approved_at:null,founder_approved_by_user_id:null,proposed_action_type:'ENRICH_CARD_PRINTING_IMAGE',
    claimed_identity_payload:{set_code:'swsh1'}};
  const parent={id:frozen.parent_id,name:'Rillaboom',set_code:'swsh1',number_plain:'14',variant_key:'league_stamp'};
  const child={id:frozen.printing_id,card_print_id:parent.id,printing_gv_id:frozen.printing_gv_id,finish_key:'reverse'};
  const original={...frozen.original};
  const routing={matched_card_print_id:parent.id,matched_card_printing_id:child.id,
    proposed_action_type:candidate.proposed_action_type,finish_key:'reverse',variant_key:null};
  const classificationPackage={candidate_id:candidate.id,classification_status:'CLASSIFIED_READY',
    proposed_action_type:candidate.proposed_action_type,identity_resolution:'ATTACH_PRINTING',
    resolver_summary:{...routing},identity_resolution_package:{identity_resolution:'ATTACH_PRINTING',
      action_payload:{...routing,approved_action_type:candidate.proposed_action_type}},
    metadata_documentation:{extracted_fields:{identity_audit_package:{identity_audit_status:'PRINTING_ONLY',
      routing:{...routing},ambiguity_flags:[],candidate_identity:{name:parent.name,set_code:parent.set_code,
        number_plain:'14',variant_key:'league_stamp'}}}}};
  const plan={created_at:'2026-11-27T18:00:00Z',proposal_kind:'stamped_image_visual_review',
    warehouse_candidate_id:candidate.id,printing_gv_id:child.printing_gv_id,original_image:{...original},
    proposed_identity:{name:parent.name,printed_number:'014/202',set_code:parent.set_code,stamp:'Pokémon League',finish:'Reverse Holo'}};
  const workItem={id:id(4),state:'approved',version:1,plan_payload:plan,plan_fingerprint:operationsSha256V1(plan),
    executor_version:null,command_policy:{execution_enabled:false},expires_at:'2026-12-04T18:00:00Z'};
  const decision={id:id(5),work_item_id:workItem.id,actor_user_id:id(6),expected_version:1,
    expected_fingerprint:workItem.plan_fingerprint,decision:'approve',note:null,created_at:'2026-11-27T19:00:00Z'};
  return {candidate,parent,child,original,classificationPackage,
    truthReviews:[{id:id(7),card_printing_id:child.id,active:true,review_status:'verified',public_visibility:'visible'}],
    frontEvidence:{candidate_id:candidate.id,evidence_slot:'front',metadata_payload:{original_image:original}},
    review:{kind:'authenticated_founder_operations_decision',workItem,decision}};
}
test('carries real reviewed facts into common metadata without machine confidence or execution authority',()=>{
  const f=fixture(); f.classificationPackage.metadata_documentation.unresolved_fields=['back_image','language_hint'];
  const before=JSON.stringify(f),result=prepareReviewedExistingChildImageV1(f);
  assert.equal(JSON.stringify(f),before);
  assert.equal(result.normalized_metadata_package.identity.printed_number,'014/202');
  assert.equal(result.normalized_metadata_package.identity.number,'14');
  assert.equal(result.normalized_metadata_package.confidence,null);
  assert.equal(result.normalized_metadata_package.provenance.field_sources.set_code,'existing_canonical_reference');
  assert.equal(result.normalized_metadata_package.provenance.review.decision_id,f.review.decision.id);
  assert.equal(result.interpreter_package.proposed_action,'ENRICH_CARD_PRINTING_IMAGE');
  assert.equal(result.requires_separate_execution_approval,true);
  assert.equal(result.production_writes_authorized,false);
  assert.deepEqual(result.normalized_metadata_package.evidence_gaps,['back_image','language_hint']);
  assert.deepEqual(result.interpreter_package.evidence_gaps,['back_image','language_hint']);
});
const changes=[
  ['rejection',f=>{f.review.decision.decision='reject';}],
  ['pending task',f=>{f.review.workItem.state='open';}],
  ['stale version',f=>{f.review.decision.expected_version=2;}],
  ['stale fingerprint',f=>{f.review.decision.expected_fingerprint='b'.repeat(64);}],
  ['changed payload',f=>{f.review.workItem.plan_payload.proposed_identity.name='Wrong';}],
  ['different decision task',f=>{f.review.decision.work_item_id=id(8);}],
  ['assistant actor',f=>{f.review.decision.actor_user_id=null;}],
  ['note requiring reconciliation',f=>{f.review.decision.note='Number is different';}],
  ['out of window decision',f=>{f.review.decision.created_at='2027-01-01T00:00:00Z';}],
  ['existing executable task',f=>{f.review.workItem.command_policy.execution_enabled=true;}],
  ['prior staging',f=>{f.candidate.current_staging_id=id(8);}],
  ['prior warehouse approval',f=>{f.candidate.founder_approved_at='2026-11-27T19:00:00Z';}],
  ['existing canonical image',f=>{f.child.image_path='protected.jpg';}],
  ['changed current parent',f=>{f.child.card_print_id=id(8);}],
  ['changed name',f=>{f.parent.name='Wrong';}],
  ['changed printed number',f=>{f.parent.number_plain='15';}],
  ['changed set',f=>{f.parent.set_code='swsh2';}],
  ['unreviewed truth',f=>{f.truthReviews[0].review_status='unreviewed';}],
  ['hidden truth',f=>{f.truthReviews[0].public_visibility='hidden';}],
  ['ambiguous truth review',f=>{f.truthReviews.push({...f.truthReviews[0],id:id(8)});}],
  ['changed classifier target',f=>{f.classificationPackage.resolver_summary.matched_card_printing_id=id(8);}],
  ['changed audit target',f=>{f.classificationPackage.metadata_documentation.extracted_fields.identity_audit_package.routing.matched_card_print_id=id(8);}],
  ['ambiguous audit',f=>{f.classificationPackage.metadata_documentation.extracted_fields.identity_audit_package.ambiguity_flags=['collision'];}],
  ['new identity action',f=>{f.classificationPackage.proposed_action_type='CREATE_CARD_PRINT';}],
  ['contradictory routed variant',f=>{f.classificationPackage.metadata_documentation.extracted_fields.identity_audit_package.routing.variant_key='prize_stamp';}],
  ['unresolved audit field',f=>{f.classificationPackage.metadata_documentation.extracted_fields.identity_audit_package.missing_fields=['parent'];}],
  ['classification ambiguity',f=>{f.classificationPackage.metadata_documentation.ambiguity_notes=['conflicting finish'];}],
  ['contradictory resolution finish',f=>{f.classificationPackage.identity_resolution_package.action_payload.finish_key='normal';}],
  ['additional candidate',f=>{f.candidate.id=id(1);}],
  ['changed frozen original',f=>{f.original.sha256='a'.repeat(64);}],
];
for(const [name,change] of changes)test(`manual image preparation rejects ${name}`,()=>{
  const f=fixture();change(f);assert.throws(()=>prepareReviewedExistingChildImageV1(f));
});
test('retains a sealed owner conversation fact without inventing a founder decision',()=>{
  const f=fixture(),record={version:'STAMPED_IMAGE_MANUAL_VISUAL_CONFIRMATION_V1',printingGvId:f.child.printing_gv_id,
    originalImage:{sha256:f.original.sha256,bytes:f.original.bytes},confirmedClaims:{name:f.parent.name,printedNumber:'014/202',stamp:'Pokémon League',finish:'Reverse Holo'},
    answerVerbatim:'Yes confirmed',recordedAt:'2026-11-27T19:00:00Z',manualReviewSelected:true,founderApprovalRows:0,imagePublications:0};
  const bytes=Buffer.from(JSON.stringify(record)),digest=createHash('sha256').update(bytes).digest('hex');
  f.review={kind:'retained_owner_chat_confirmation',recordBytes:bytes,expectedSha256:digest};
  const r=prepareReviewedExistingChildImageV1(f);
  assert.equal(r.visual_review_reference.record_sha256,digest);
  assert.equal(r.visual_review_reference.decision_id,undefined);
  assert.equal(r.normalized_metadata_package.provenance.publication_authorized,false);
  f.review.recordBytes=Buffer.from(JSON.stringify({...record,confirmedClaims:{...record.confirmedClaims,name:'Wrong'}}));
  assert.throws(()=>prepareReviewedExistingChildImageV1(f),/retained_chat_changed/);
});

// Exercise the real UI interpreter, including the existing stamp and NO_OP
// paths, so the shared exact-image rule cannot silently create duplicate cards.
const require=createRequire(import.meta.url),ts=require('typescript'),modules=new Map();
function load(name){
  if(name==='server-only')return {};
  if(name.endsWith('/existing_child_image_interpreter_v1.mjs'))return {buildExistingChildImageInterpreterV1};
  assert.ok(name.startsWith('@/lib/warehouse/'));
  if(modules.has(name))return modules.get(name).exports;
  const module={exports:{}};modules.set(name,module);
  const file=new URL('../../apps/web/src/'+name.slice(2)+'.ts',import.meta.url);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:load,console,Set,Map});return module.exports;
}
const {buildWarehouseInterpreterV1}=load('@/lib/warehouse/buildWarehouseInterpreterV1');
function uiFixture(){
  const f=fixture(),metadata=prepareReviewedExistingChildImageV1(f).normalized_metadata_package;
  return {candidate:{...f.candidate,notes:'League stamped reverse',interpreter_resolved_finish_key:'reverse'},
    evidenceRows:[{evidence_slot:'front',previews:[]}],latestMetadataExtractionPackage:metadata,
    latestNormalizedPackage:null,latestClassificationPackage:f.classificationPackage,currentStagingRow:null,promotionReview:null};
}
test('UI interpreter retains existing stamped child image action before new-stamp handling',()=>{
  const input=uiFixture(),r=buildWarehouseInterpreterV1(input);
  assert.equal(r.decision,'IMAGE_REPAIR_ONLY');assert.equal(r.proposed_action,'ENRICH_CARD_PRINTING_IMAGE');
  assert.equal(r.canon_context.matched_card_printing_id,frozen.printing_id);
});
test('genuine unresolved stamped identity retains the existing new-canonical interpretation',()=>{
  const input=uiFixture();input.latestClassificationPackage=null;
  const r=buildWarehouseInterpreterV1(input);
  assert.equal(r.decision,'NEW_CANONICAL_REQUIRED');assert.equal(r.proposed_action,'CREATE_CARD_PRINT');
});
test('NO_OP keeps precedence when canon already covers the submission',()=>{
  const input=uiFixture();input.candidate.promotion_result_type='NO_OP';
  const r=buildWarehouseInterpreterV1(input);assert.equal(r.proposed_action,'NO_OP');
});
