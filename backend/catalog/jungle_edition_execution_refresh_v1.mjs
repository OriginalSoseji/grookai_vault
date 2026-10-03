// Revalidate immutable reviewed identities against a fresh read-only capture.
// This never grants catalog mutation, binding or pricing publication authority.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertJungleEditionMasterV1} from './jungle_edition_master_authority_v1.mjs';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';
export const JUNGLE_EXECUTION_REFRESH_V1='JUNGLE_EXECUTION_REFRESH_V1';
const fresh=(at,now)=>{const age=now-Date.parse(at);assert.ok(Number.isFinite(age)&&age>=0&&age<3600000,'fresh_execution_capture_required');};
export function assertJungleExecutionRefreshV1(manifest,artifacts,refresh,{asOf=new Date().toISOString()}={}){
 const now=Date.parse(asOf);assert.ok(Number.isFinite(now));assert.equal(refresh?.version,JUNGLE_EXECUTION_REFRESH_V1);
 const old=JSON.parse(String(artifacts.get('jungle:production-snapshot'))),snapshot=refresh.snapshot,delta=refresh.delta;
 // Recheck the complete original source review at its original capture time.
 // Freshness is established independently below, never by rewriting old bytes.
 assertJungleEditionMasterV1(manifest,artifacts,{asOf:old.at});
 assert.equal(refresh.manifestFingerprint,manifest.fingerprint);assert.equal(refresh.originalSnapshotHash,hash(old));
 fresh(snapshot.at,now);fresh(delta.at,now);assert.equal(snapshot.project_ref,old.project_ref);assert.equal(snapshot.setId,old.setId);
 assert.ok(Date.parse(snapshot.at)>Date.parse(old.at));assert.ok(Date.parse(delta.at)>=Date.parse(snapshot.at));
 assert.equal(snapshot.read_only,true);assert.equal(snapshot.tls_verified,true);assert.equal(snapshot.sanity.migrations,414);
 assert.ok(snapshot.sanity.cards>=40000&&snapshot.sanity.sets>=150&&snapshot.sanity.traits>=5000);
 assert.equal(snapshot.allocationSha256,old.allocationSha256);assert.deepEqual(snapshot.collisions,{parents:[],children:[]});
 for(const section of ['cards','printings','species','schema'])assert.equal(hash(snapshot[section]),hash(old[section]),'reviewed_'+section+'_drift');
 const key=d=>[d.schema_name,d.table_name,d.column_name,d.conname].join(':');
 const oldKeys=old.dependencies.map(key).sort(),newKeys=snapshot.dependencies.map(key).sort();assert.equal(new Set(newKeys).size,newKeys.length);assert.deepEqual(newKeys,oldKeys,'dependency_inventory_drift');
 assert.equal(delta.status,'passed');assert.equal(delta.readOnly,true);assert.equal(delta.productionWrites,0);assert.equal(delta.originalSnapshotAt,old.at);assert.equal(delta.currentSnapshotAt,snapshot.at);assert.equal(delta.removedRows,0);assert.equal(delta.changedHistoricalRows,0);
 const allowed=new Set(['market_evidence_variant_assignments','market_price_pipeline_candidates','market_price_qualification_decisions']),changed=[];
 for(const current of snapshot.dependencies){
  const previous=old.dependencies.find(d=>key(d)===key(current));assert.equal(current.definition,previous.definition);assert.equal(current.target_table,previous.target_table);
  if(current.rows){assert.equal(current.rows.length,current.count);assert.equal(createHash('sha256').update(JSON.stringify(current.rows)).digest('hex'),current.rowsSha256,'embedded_dependency_rows_drift');}
  if(current.count===previous.count&&current.rowsSha256===previous.rowsSha256)continue;
  assert.equal(current.schema_name,'public');assert.equal(current.column_name,'card_print_id');assert.ok(allowed.has(current.table_name),'unreviewed_dependency_drift');changed.push(current.table_name);
  const proof=delta.results.filter(r=>r.table===current.table_name);assert.equal(proof.length,1);const p=proof[0];assert.equal(p.historicalRowsUnchanged,true);assert.equal(p.historicalSha256,previous.rowsSha256);assert.equal(p.currentSha256,current.rowsSha256);assert.equal(p.before,previous.count);assert.equal(p.after,current.count);assert.equal(p.added,126);assert.equal(p.after-p.before,p.added);
 }
 assert.deepEqual(changed.sort(),[...allowed].sort());assert.equal(delta.results.length,3);assert.equal(delta.runs.length,1);
 const run=delta.runs[0];assert.equal(run.state,'verified');assert.equal(run.run_mode,'production');assert.equal(run.source_sync_run_id,snapshot.sourceRun.id);
 for(const p of delta.results){
  if(p.table==='market_evidence_variant_assignments'){
   assert.deepEqual(p.pipelineRunIds,[]);assert.deepEqual(p.sourceFamilies,['tcgcsv_market_close']);assert.deepEqual(p.sourceTables,['tcgcsv_source_price_daily_observations']);
  }else assert.deepEqual(p.pipelineRunIds,[run.id]);
  assert.ok(Date.parse(p.minCreatedAt)>Date.parse(old.at)&&Date.parse(p.maxCreatedAt)<=Date.parse(snapshot.at));
 }
 const source=snapshot.sourceRun;assert.equal(source.sync_mode,'current_full_sync');assert.equal(source.status,'completed');assert.equal(source.failed_count,0);const age=now-Date.parse(source.finished_at);assert.ok(Number.isFinite(age)&&age>=0&&age<36*3600000,'source_run_stale');
 return {version:JUNGLE_EXECUTION_REFRESH_V1,manifestFingerprint:manifest.fingerprint,fingerprint:hash(refresh),historicalAuthorityAsOf:old.at,capturedAt:snapshot.at,retainedParents:snapshot.cards.length,retainedChildren:snapshot.printings.length,dependencies:snapshot.dependencies.length,appendOnlyTables:changed.length,sourceRun:source.id,productionWrites:0,executionAuthorized:false};
}
