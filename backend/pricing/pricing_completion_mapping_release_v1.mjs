/** Pure bridge from reviewed offline-export evidence to a read-only executor
 * preflight. This is deliberately never an apply-compatible source plan. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertMasterMappingBatchAuthority} from './master_index_mapping_authority_v1.mjs';

export const PRICING_COMPLETION_MAPPING_RELEASE_MODE_V1='offline_reviewed_export';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v!==null&&typeof v==='object'
  ?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const json=v=>JSON.stringify(canonical(v),null,2)+'\n';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function bytes(value){assert.ok(Buffer.isBuffer(value),'original_bytes_required');return value;}
function pin(value,expected){assert.match(expected??'',/^[a-f0-9]{64}$/,'input_sha_required');assert.equal(sha(bytes(value)),expected,'input_hash_mismatch');}
function candidates(value){return value.toString('utf8').split(/\r?\n/).filter(line=>line.trim()).map(line=>JSON.parse(line));}

export function assertPricingCompletionMappingReleaseV1({mode,selectedBytes,authorityBytes,summary,runPlan}) {
  assert.equal(mode,'dry_run','offline_reviewed_export_is_dry_run_only');
  assert.equal(runPlan.mode,PRICING_COMPLETION_MAPPING_RELEASE_MODE_V1);
  assert.equal(runPlan.version,'PRICING_COMPLETION_MAPPING_RELEASE_V1');
  assert.equal(runPlan.execution_authorized,false);assert.equal(runPlan.live_preflight_completed,false);
  assert.equal(runPlan.database_writes,0);assert.equal(runPlan.original_planner_commit_sha,null);
  // Legacy apply must never mistake the packaging checkout for the original
  // planner's clean producer. The observation is retained under a distinct key.
  assert.equal(runPlan.tracked_worktree_clean,false);
  assert.equal(runPlan.commit_sha,runPlan.release_repository_observation.commitSha);
  assert.match(runPlan.commit_sha,/^[a-f0-9]{40}$/);
  assert.match(runPlan.source_sync_run_id,uuid);assert.match(runPlan.source_run_id,uuid);
  const rows=candidates(bytes(selectedBytes));assert.ok(rows.length>=1&&rows.length<=25,'bounded_selection_required');
  assert.equal(summary.version,'PRICING_COMPLETION_MAPPING_RELEASE_SUMMARY_V1');
  assert.equal(summary.status,'passed');assert.equal(summary.validation_scope,'offline_reviewed_evidence_only');
  assert.equal(summary.live_preflight_completed,false);assert.equal(summary.execution_authorized,false);
  assert.equal(summary.counts.candidates,rows.length);
  assert.equal(sha(selectedBytes),runPlan.candidate_artifact_sha256);
  assert.equal(sha(bytes(authorityBytes)),runPlan.master_authority_sha256);
  const authority=JSON.parse(authorityBytes);
  assert.equal(assertMasterMappingBatchAuthority(rows,authority).execution_authorized,false);
  assert.equal(summary.master_authority_fingerprint,authority.fingerprint);
  return {candidates:rows,authority,executionAuthorized:false,livePreflightCompleted:false};
}

export function buildPricingCompletionMappingReleaseV1({selectedBytes,authorityBytes,originalPlanBytes,originalReceiptBytes,expectedHashes,releaseRepository}={}) {
  for(const [key,value] of Object.entries({selected:selectedBytes,authority:authorityBytes,originalPlan:originalPlanBytes,originalReceipt:originalReceiptBytes}))pin(value,expectedHashes?.[key]);
  assert.match(releaseRepository?.commitSha??'',/^[a-f0-9]{40}$/,'actual_release_commit_observation_required');
  assert.ok(typeof releaseRepository.branch==='string'&&releaseRepository.branch.length>0);
  assert.equal(typeof releaseRepository.trackedWorktreeClean,'boolean');
  assert.ok(Number.isFinite(Date.parse(releaseRepository.observedAt)),'release_observation_time_required');
  const plan=JSON.parse(originalPlanBytes),receipt=JSON.parse(originalReceiptBytes),selected=candidates(selectedBytes),authority=JSON.parse(authorityBytes);
  assert.equal(plan.version,'PRICING_COMPLETION_EXACT_MAPPING_CONTEXT_PLAN_V1');
  assert.equal(plan.preparationOnly,true);assert.equal(plan.executionAuthorized,false);assert.equal(plan.databaseWrites,0);
  assert.equal(plan.summary.candidates,plan.candidates.length);
  assert.equal(receipt.liveDatabaseAccess,false);assert.equal(receipt.sourceReceipt.databaseWrites,0);
  assert.equal(receipt.sourceReceipt.runId,plan.sourceRunId);assert.equal(receipt.sourceReceipt.sourceSyncRunId,plan.sourceSyncRunId);
  assert.match(receipt.sourceArtifactSha256,/^[a-f0-9]{64}$/);assert.match(receipt.contextArtifactSha256,/^[a-f0-9]{64}$/);
  assert.equal(new Set(plan.candidates.map(c=>c.candidate_fingerprint)).size,plan.candidates.length);
  for(const row of selected){const originals=plan.candidates.filter(c=>c.candidate_fingerprint===row.candidate_fingerprint);
    assert.equal(originals.length,1,'selected_candidate_not_in_original_plan');assert.deepEqual(row,originals[0],'original_candidate_changed');}
  assertMasterMappingBatchAuthority(selected,authority);
  const runPlan={version:'PRICING_COMPLETION_MAPPING_RELEASE_V1',mode:PRICING_COMPLETION_MAPPING_RELEASE_MODE_V1,
    commit_sha:releaseRepository.commitSha,tracked_worktree_clean:false,original_planner_commit_sha:null,
    release_repository_observation:structuredClone(releaseRepository),
    commit_semantics:'Release packaging checkout observation only; the original offline planner has no asserted clean producer commit.',
    source_run_id:plan.sourceRunId,source_sync_run_id:plan.sourceSyncRunId,
    candidate_artifact_sha256:expectedHashes.selected,master_authority_sha256:expectedHashes.authority,
    original_plan_sha256:expectedHashes.originalPlan,original_receipt_sha256:expectedHashes.originalReceipt,
    source_capture_sha256:receipt.sourceArtifactSha256,context_capture_sha256:receipt.contextArtifactSha256,
    execution_authorized:false,database_writes:0,live_preflight_completed:false,
    next_gate:'Read-only executor preflight only. Apply still requires a separately qualified source plan and all existing execution gates.'};
  const summary={version:'PRICING_COMPLETION_MAPPING_RELEASE_SUMMARY_V1',status:'passed',validation_scope:'offline_reviewed_evidence_only',
    counts:{candidates:selected.length,original_candidates:plan.candidates.length},master_authority_fingerprint:authority.fingerprint,
    execution_authorized:false,database_writes:0,live_preflight_completed:false};
  assertPricingCompletionMappingReleaseV1({mode:'dry_run',selectedBytes,authorityBytes,summary,runPlan});
  const files={'candidates.jsonl':Buffer.from(selectedBytes),'master_authority.json':Buffer.from(authorityBytes),
    'source_plan.json':Buffer.from(originalPlanBytes),'source_receipt.json':Buffer.from(originalReceiptBytes),
    'summary.json':Buffer.from(json(summary)),'run_plan.json':Buffer.from(json(runPlan))};
  const artifactHashes=Object.fromEntries(Object.entries(files).map(([name,value])=>[name,sha(value)]));
  files['artifact_hashes.json']=Buffer.from(json(artifactHashes));
  return {files,artifactHashes,summary,runPlan,executionAuthorized:false,databaseWrites:0};
}
