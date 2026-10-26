import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {fixture,reviewFixture} from '../fixtures/master_mapping_authority_v1.mjs';
import {freezeMasterMappingAuthority} from '../../backend/pricing/master_index_mapping_authority_v1.mjs';
import {jungleSourcePayloadHashV1 as payloadHash} from '../../backend/pricing/jungle_edition_source_review_v1.mjs';
import {assertMappingOperatorSnapshotV1,buildMappingOperatorSnapshotPlanV1,assertMappingOperatorLiveStateV1,readMappingOperatorLiveStateV1} from '../../backend/pricing/exact_mapping_operator_snapshot_v1.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const RUN='11111111-1111-4111-8111-111111111111',SOURCE='22222222-2222-4222-8222-222222222222',PUBLICATION='33333333-3333-4333-8333-333333333333';
const T='2026-10-14T02:00:00.000Z',now=Date.parse(T)+60000;
function input(){
  const f=fixture(),candidate=f.selected[0],target={...candidate.target,name:candidate.target.canonical_name,number:candidate.target.canonical_number,variant_key:'',game_code:'pokemon',parent_snapshot:{...f.liveTargets[0].parent_snapshot}};
  delete target.canonical_name;delete target.canonical_number;
  target.parent_snapshot={...target.parent_snapshot,id:target.card_print_id,gv_id:target.gv_id,set_id:target.set_id,set_code:target.set_code,name:target.name,number:target.number,variant_key:'',external_ids:{new_set_release_ingestion_v1:{source:'tcgcsv',external_id:'tcgcsv:456:123'}}};
  const scope={setId:target.set_id,setCode:'test',game:'pokemon',sourceGroupId:456,sourceCategoryId:3,productIdMin:123,productIdMax:123,expectedProducts:1};
  const artifact={id:'44444444-4444-4444-8444-444444444444',sync_run_id:SOURCE,sha256:'e'.repeat(64)};
  const observation={id:candidate.supporting_gap_observation_ids[0],product_id:123,category_id:3,group_id:456,last_seen_run_id:SOURCE,observed_on:'2026-10-14',currency:'USD',payload_hash:'d'.repeat(64),subtype_name:'Holofoil',source_price_row_identity:'tcgplayer:123:holofoil',source_artifact_id:artifact.id};
  observation.raw_payload={productId:123,subTypeName:'Holofoil',marketPrice:1};observation.payload_hash=payloadHash(observation.raw_payload);
  const decision={decision_id:'55555555-5555-4555-8555-555555555555',run_id:RUN,source_product_id:123,source_observation_id:observation.id,source_subtype_name:'Holofoil',source_sync_run_id:SOURCE,source_price_row_identity:observation.source_price_row_identity,currency:'USD',source_row_hash:observation.payload_hash,source_artifact_hash:artifact.sha256,decision:'quarantine',primary_reason:'missing_active_source_mapping',product_scope_result:'in_scope'};
  const pointer={run_id:RUN,publication_set_id:PUBLICATION,source_sync_run_id:SOURCE,run_mode:'production',state:'verified',publication_state:'published',reconciliation_state:'reconciled',source_status:'completed',sync_mode:'current_full_sync',source_failed_count:0,source_finished_at:T,completed_at:T,pointer_snapshot:{singleton:true,run_id:RUN,publication_set_id:PUBLICATION}};
  const raw={product_id:123,name:candidate.source_product_name,group_id:456,category_id:3,source_active:true,catalog_metadata_status:'current',last_seen_run_id:SOURCE,extended_data:[{name:'Number',value:candidate.printed_number}]};
  raw.raw_payload={productId:123,name:raw.name,groupId:456,categoryId:3,extendedData:raw.extended_data};raw.payload_hash=payloadHash(raw.raw_payload);
  const ctx={set_rows:[{id:scope.setId,code:'test',game:'pokemon'}],groups:[{group_id:456,category_id:3,name:candidate.source_group_name}],products:[{product_id:123,source_product_name:raw.name,source_group_id:456,source_group_name:candidate.source_group_name,source_active:true,catalog_metadata_status:'current',active_source_mapping_count:0,extended_data:raw.extended_data,product_snapshot:raw}],targets:[target],identities:[{id:'66666666-6666-4666-8666-666666666666',card_print_id:target.card_print_id,is_active:true,identity_domain:'pokemon_eng_standard'}],mappings:[],observations:[observation],decisions:[decision],artifacts:[artifact],publication_snapshots:[],foreign_embedded_targets:[]};
  ctx.counts=Object.fromEntries(Object.entries(ctx).filter(([k])=>k!=='set_rows').map(([k,v])=>[k,v.length]));
  const capture={version:'FIXED_OPERATOR_ME05_MAPPING_PREFLIGHT_INPUTS_V2',status:'accepted',accepted:true,projectRef:'ycdxbpibncqcchqiihfz',collectorSha256:'a'.repeat(64),sqlSha256:'b'.repeat(64),caSha256:'c'.repeat(64),sourceRunId:RUN,publicationSetId:PUBLICATION,sourceSyncRunId:SOURCE,scope,capturedAt:T,readOnly:true,verifiedTls:true,rollbackAcknowledged:true,databaseWrites:0,executorInvoked:false,dryRunPassed:null,
    records:[{kind:'environment',read_only:'on',isolation:'repeatable read',database:'postgres',timezone:'UTC',captured_at:T,cards:50000,sets:200,traits:6000,migrations:444},{kind:'current_publication_before',rows:[pointer]},{kind:'source_run',rows:[{id:SOURCE,status:'completed',sync_mode:'current_full_sync',failed_count:0,finished_at:T,observed_on:'2026-10-14'}]},{kind:'schema_columns'},{kind:'live_input_context',data:ctx},{kind:'current_publication_after',rows:[structuredClone(pointer)]},{kind:'transaction_end',status:'ROLLBACK',read_only_after:'on',isolation_after:'read committed'}]};
  const reviewedProductBytes=Buffer.from(JSON.stringify(raw.raw_payload));f.artifacts.set('mapping-source',reviewedProductBytes);
  f.manifest.authority.source_artifacts.find(a=>a.ref==='mapping-source').sha256=sha(reviewedProductBytes);
  f.manifest.external_mapping_assertions[0].source_sha256=sha(reviewedProductBytes);reviewFixture(f);
  const selectedBytes=Buffer.from(JSON.stringify(candidate)+'\n'),authorityBytes=Buffer.from(JSON.stringify(freezeMasterMappingAuthority(f.selected,[f])));
  const captureBytes=Buffer.from(JSON.stringify(capture)),populationBytes=Buffer.from(selectedBytes);
  return {captureBytes,populationBytes,selectedBytes,authorityBytes,now,producer:{commitSha:'f'.repeat(40),branch:'test-only',trackedWorktreeClean:true,observedAt:new Date(now).toISOString()},trusted:{scope,captureSha256:sha(captureBytes),populationSha256:sha(populationBytes),selectedSha256:sha(selectedBytes),authoritySha256:sha(authorityBytes),collectorSha256:capture.collectorSha256,sqlSha256:capture.sqlSha256,caSha256:capture.caSha256,runId:RUN,publicationSetId:PUBLICATION,sourceSyncRunId:SOURCE}};
}
function changeCapture(i,fn){const c=JSON.parse(i.captureBytes);fn(c,c.records[4].data);i.captureBytes=Buffer.from(JSON.stringify(c));i.trusted.captureSha256=sha(i.captureBytes);return i;}
test('new mode preserves actual bytes and produces truthful snapshot-only provenance',()=>{
  const i=input(),r=buildMappingOperatorSnapshotPlanV1(i);assert.equal(r.runPlan.mode,'reviewed_operator_snapshot_v1');assert.equal(r.runPlan.live_preflight_completed,false);assert.equal(r.runPlan.execution_authorized,false);
  for(const [name,key]of [['candidates.jsonl','selectedBytes'],['master_authority.json','authorityBytes'],['operator_capture.json','captureBytes'],['reviewed_population.jsonl','populationBytes']])assert.deepEqual(r.files[name],i[key]);
  assert.equal(r.proof.population.length,1);assert.equal(r.runPlan.commit_sha,i.producer.commitSha);
});
test('every external byte pin is mandatory and tampering rejects',()=>{for(const key of ['captureBytes','populationBytes','selectedBytes','authorityBytes']){const i=input();i[key]=Buffer.concat([i[key],Buffer.from(' ')]);assert.throws(()=>assertMappingOperatorSnapshotV1(i),/hash_mismatch/);}for(const key of ['collectorSha256','sqlSha256','caSha256','captureSha256','populationSha256']){const i=input();delete i.trusted[key];assert.throws(()=>assertMappingOperatorSnapshotV1(i));}});
test('capture self-claims cannot override independent collector or SQL pins',()=>{for(const key of ['collectorSha256','sqlSha256','caSha256']){const i=changeCapture(input(),c=>c[key]='0'.repeat(64));assert.throws(()=>assertMappingOperatorSnapshotV1(i),/collector_pin_mismatch/);}});
test('legacy capture without complete sibling/foreign proof is unsupported',()=>{const i=changeCapture(input(),c=>c.version='FIXED_OPERATOR_ME05_MAPPING_PREFLIGHT_INPUTS_V1');assert.throws(()=>assertMappingOperatorSnapshotV1(i),/unsupported_capture_version/);for(const key of ['decisions','foreign_embedded_targets']){assert.throws(()=>assertMappingOperatorSnapshotV1(changeCapture(input(),(_,ctx)=>delete ctx[key])),/required_census_missing/);}});
test('stale/future evidence, wrong target and dirty producer reject',()=>{for(const n of [now+86400000,Date.parse(T)-1])assert.throws(()=>assertMappingOperatorSnapshotV1({...input(),now:n}),/stale_or_future/);for(const patch of [{trackedWorktreeClean:false},{commitSha:null}])assert.throws(()=>buildMappingOperatorSnapshotPlanV1({...input(),producer:{...input().producer,...patch}}),/clean_producer/);assert.throws(()=>assertMappingOperatorSnapshotV1(changeCapture(input(),c=>c.projectRef='other')));});
test('pointer changes and incomplete inventories fail closed',()=>{
  for(const change of [c=>c.records[5].rows[0].publication_set_id=SOURCE,c=>c.records[1].rows[0].source_failed_count=1,(_,x)=>x.counts.products=2,(_,x)=>x.products=[],(_,x)=>{x.targets.push(x.targets[0]);x.counts.targets=2;}])assert.throws(()=>assertMappingOperatorSnapshotV1(changeCapture(input(),change)));
});
test('inactive or active product mappings and outside-set embedded matches block',()=>{for(const active of [true,false]){const i=changeCapture(input(),(_,x)=>{x.mappings=[{id:1,source:'tcgplayer',external_id:'123',card_print_id:x.targets[0].card_print_id,active}];x.counts.mappings=1;});assert.throws(()=>assertMappingOperatorSnapshotV1(i),/existing_mapping/);}assert.throws(()=>assertMappingOperatorSnapshotV1(changeCapture(input(),(_,x)=>{x.foreign_embedded_targets=[{card_print_id:SOURCE}];x.counts.foreign_embedded_targets=1;})),/foreign_embedded_collision/);});
test('unsupported or unreviewed sibling decisions never authorize product mapping',()=>{
  for(const change of [(_,x)=>x.decisions[0].product_scope_result='unsupported',(_,x)=>x.decisions[0].decision='publish',(_,x)=>x.decisions[0].source_row_hash='0'.repeat(64),(_,x)=>{x.decisions=[];x.counts.decisions=0;},(_,x)=>{const o={...x.observations[0],id:SOURCE};x.observations.push(o);x.decisions.push({...x.decisions[0],decision_id:SOURCE,source_observation_id:SOURCE});x.counts.observations=2;x.counts.decisions=2;}])assert.throws(()=>assertMappingOperatorSnapshotV1(changeCapture(input(),change)));
});
test('population duplicates and authority drift are rejected',()=>{const i=input();i.populationBytes=Buffer.concat([i.populationBytes,i.populationBytes]);i.trusted.populationSha256=sha(i.populationBytes);assert.throws(()=>assertMappingOperatorSnapshotV1(i),/duplicate_or_missing_id/);assert.throws(()=>assertMappingOperatorSnapshotV1(changeCapture(input(),(_,x)=>x.targets[0].parent_snapshot.name='changed')));});
test('fresh self-consistent source metadata cannot replace the reviewed product artifact',()=>{
  const i=changeCapture(input(),(_,x)=>{const p=x.products[0];p.extended_data.push({name:'Rarity',value:'Changed after review'});
    p.product_snapshot.extended_data=p.extended_data;p.product_snapshot.raw_payload.extendedData=p.extended_data;
    p.product_snapshot.payload_hash=payloadHash(p.product_snapshot.raw_payload);});
  assert.throws(()=>assertMappingOperatorSnapshotV1(i),/reviewed_product_payload_changed/);
});
test('live pointer/freshness/sibling guards rerun independently and detect payload drift',()=>{
  const proof=assertMappingOperatorSnapshotV1(input()),live={pointerRows:[proof.pointer],observations:proof.context.observations,decisions:proof.context.decisions,foreignTargets:[],products:proof.context.products.map(p=>p.product_snapshot)};
  assert.equal(assertMappingOperatorLiveStateV1(proof,live,now),true);
  for(const fn of [x=>x.pointerRows[0].publication_set_id=SOURCE,x=>x.observations[0].payload_hash='0'.repeat(64),x=>x.foreignTargets.push({id:SOURCE}),x=>x.decisions=[]]){const changed=structuredClone(live);fn(changed);assert.throws(()=>assertMappingOperatorLiveStateV1(proof,changed,now));}
  assert.throws(()=>assertMappingOperatorLiveStateV1(proof,live,now+86400000),/stale_or_future/);
});
test('live queries use fixed SQL and bound source/product scope, including unfiltered sibling dates',async()=>{
  const proof=assertMappingOperatorSnapshotV1(input()),queries=[];
  const response=[proof.pointer],obs=proof.context.observations;
  const client={query:async(sql,params)=>{queries.push({sql,params});return {rows:queries.length===1?response:queries.length===2?obs.map(row=>({row})):queries.length===3?proof.context.decisions:queries.length===5?proof.context.products.map(p=>({row:p.product_snapshot})):[]};}};
  const live=await readMappingOperatorLiveStateV1(client,proof);assertMappingOperatorLiveStateV1(proof,live,now);
  assert.equal(queries.length,5);assert.deepEqual(queries[1].params,[[123],'2026-10-14']);assert.ok(!queries[1].sql.includes('last_seen_run_id='));assert.deepEqual(queries[2].params,[RUN,[123]]);
  assert.ok(!queries[0].sql.includes('for share'));
  const lockingQueries=[];await readMappingOperatorLiveStateV1({query:async(sql)=>{lockingQueries.push(sql);return {rows:[]};}},proof,{lockPointer:true});
  assert.match(lockingQueries[0],/for share of c$/);
});
test('executor retains offline apply rejection and all existing execution gates',()=>{
  const s=fs.readFileSync(new URL('../../backend/maintenance/tcgplayer_market_exact_mapping_apply_v1.mjs',import.meta.url),'utf8');
  assert.ok(s.indexOf('OFFLINE_REVIEWED_EXPORT_IS_DRY_RUN_ONLY')<s.indexOf('const client = new Client(databaseConfig)'));
  for(const marker of ['OPERATOR_SNAPSHOT_NOT_ENABLED','OPERATOR_SNAPSHOT_BRANCH_MISMATCH','SOURCE_PLAN_COMMIT_NOT_ANCESTOR','SOURCE_PLAN_TRACKED_WORKTREE_NOT_CLEAN','TRACKED_WORKTREE_NOT_CLEAN','assertCanonMaintenanceWriteAllowed()'])assert.ok(s.includes(marker));
  assert.equal((s.match(/assertMappingOperatorLiveStateV1\(frozen\.operatorSnapshotProof/g)??[]).length,2);
  assert.match(s,/lockPointer:mode==="apply"/);
});
