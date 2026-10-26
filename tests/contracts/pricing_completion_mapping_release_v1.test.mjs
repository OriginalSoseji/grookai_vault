import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {fixture} from '../fixtures/master_mapping_authority_v1.mjs';
import {freezeMasterMappingAuthority} from '../../backend/pricing/master_index_mapping_authority_v1.mjs';
import {buildPricingCompletionMappingReleaseV1,assertPricingCompletionMappingReleaseV1} from '../../backend/pricing/pricing_completion_mapping_release_v1.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
function inputs(){const f=fixture(),sourceRunId='11111111-1111-4111-8111-111111111111',sourceSyncRunId='22222222-2222-4222-8222-222222222222';
  const selectedBytes=Buffer.from(f.selected.map(c=>JSON.stringify(c)).join('\n')+'\n');
  const authorityBytes=Buffer.from(JSON.stringify(freezeMasterMappingAuthority(f.selected,[f]),null,2)+'\n');
  const originalPlanBytes=Buffer.from(JSON.stringify({version:'PRICING_COMPLETION_EXACT_MAPPING_CONTEXT_PLAN_V1',preparationOnly:true,executionAuthorized:false,databaseWrites:0,sourceRunId,sourceSyncRunId,summary:{candidates:1},candidates:f.selected}));
  const originalReceiptBytes=Buffer.from(JSON.stringify({liveDatabaseAccess:false,sourceArtifactSha256:'a'.repeat(64),contextArtifactSha256:'b'.repeat(64),sourceReceipt:{databaseWrites:0,runId:sourceRunId,sourceSyncRunId}}));
  return {selectedBytes,authorityBytes,originalPlanBytes,originalReceiptBytes,expectedHashes:{selected:sha(selectedBytes),authority:sha(authorityBytes),originalPlan:sha(originalPlanBytes),originalReceipt:sha(originalReceiptBytes)},
    releaseRepository:{commitSha:'c'.repeat(40),branch:'synthetic-test-only',trackedWorktreeClean:false,observedAt:'2026-10-13T20:00:00.000Z'}};}
test('release preserves reviewed bytes and explicitly remains offline/dry-run only',()=>{
  const input=inputs(),r=buildPricingCompletionMappingReleaseV1(input);
  assert.deepEqual(r.files['candidates.jsonl'],input.selectedBytes);assert.deepEqual(r.files['master_authority.json'],input.authorityBytes);
  assert.equal(r.runPlan.mode,'offline_reviewed_export');assert.equal(r.runPlan.tracked_worktree_clean,false);assert.equal(r.runPlan.original_planner_commit_sha,null);
  assert.equal(r.summary.validation_scope,'offline_reviewed_evidence_only');assert.equal(r.summary.live_preflight_completed,false);
  for(const [name,hash]of Object.entries(r.artifactHashes))assert.equal(sha(r.files[name]),hash);
  assertPricingCompletionMappingReleaseV1({mode:'dry_run',selectedBytes:r.files['candidates.jsonl'],authorityBytes:r.files['master_authority.json'],summary:JSON.parse(r.files['summary.json']),runPlan:JSON.parse(r.files['run_plan.json'])});
  assert.throws(()=>assertPricingCompletionMappingReleaseV1({mode:'apply',selectedBytes:input.selectedBytes,authorityBytes:input.authorityBytes,summary:r.summary,runPlan:r.runPlan}),/dry_run_only/);
});
test('a clean release observation never becomes a clean original-planner claim',()=>{const input=inputs();input.releaseRepository.trackedWorktreeClean=true;const r=buildPricingCompletionMappingReleaseV1(input);assert.equal(r.runPlan.release_repository_observation.trackedWorktreeClean,true);assert.equal(r.runPlan.tracked_worktree_clean,false);});
test('input tampering and wrong original plan or source-run binding fail closed',()=>{
  for(const key of ['selectedBytes','authorityBytes','originalPlanBytes','originalReceiptBytes']){const input=inputs();input[key]=Buffer.concat([input[key],Buffer.from(' ')]);assert.throws(()=>buildPricingCompletionMappingReleaseV1(input),/input_hash_mismatch/);}
  for(const change of [plan=>plan.candidates=[],plan=>plan.candidates[0].source_product_name='Changed',plan=>plan.sourceSyncRunId='33333333-3333-4333-8333-333333333333']){
    const input=inputs(),plan=JSON.parse(input.originalPlanBytes);change(plan);input.originalPlanBytes=Buffer.from(JSON.stringify(plan));input.expectedHashes.originalPlan=sha(input.originalPlanBytes);assert.throws(()=>buildPricingCompletionMappingReleaseV1(input));
  }
});
test('incomplete provenance and dishonest live/commit claims reject',()=>{
  const input=inputs();delete input.releaseRepository.commitSha;assert.throws(()=>buildPricingCompletionMappingReleaseV1(input),/commit_observation_required/);
  const valid=inputs(),r=buildPricingCompletionMappingReleaseV1(valid);
  for(const patch of [{tracked_worktree_clean:true},{live_preflight_completed:true},{original_planner_commit_sha:'a'.repeat(40)}])assert.throws(()=>assertPricingCompletionMappingReleaseV1({mode:'dry_run',selectedBytes:valid.selectedBytes,authorityBytes:valid.authorityBytes,summary:r.summary,runPlan:{...r.runPlan,...patch}}));
});
test('executor rejects offline apply before connection and retains legacy clean-ancestor gates',()=>{
  // Static boundary check: importing the executor would evaluate env/pg and is
  // deliberately forbidden in this pure offline contract test.
  const source=fs.readFileSync(new URL('../../backend/maintenance/tcgplayer_market_exact_mapping_apply_v1.mjs',import.meta.url),'utf8');
  assert.ok(source.indexOf('OFFLINE_REVIEWED_EXPORT_IS_DRY_RUN_ONLY')<source.indexOf('const url = connectionString()'));
  assert.match(source,/runPlan\.mode !== "read_only_dry_run" && !offlineReviewed/);
  assert.match(source,/SOURCE_PLAN_TRACKED_WORKTREE_NOT_CLEAN/);assert.match(source,/SOURCE_PLAN_COMMIT_NOT_ANCESTOR/);
  assert.match(source,/OFFLINE_REVIEWED_EXPORT_METADATA_MISMATCH/);
});
