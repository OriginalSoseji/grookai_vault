import test from 'node:test';import assert from 'node:assert/strict';
import {assertCrossTcgMarketActivationV4,readCrossTcgMarketBootstrapV4,SOURCE_GAP_WORKER_V1,CROSS_TCG_MARKET_ACTIVATION_GUARD_V4} from '../../backend/pricing/cross_tcg_market_activation_guard_v4.mjs';
import {readJapaneseSourceGapPreparationV1} from '../../backend/pricing/japanese_source_gap_exception_preparation_v1.mjs';
const m=readJapaneseSourceGapPreparationV1(),uuid=n=>'00000000-0000-4000-a000-'+n.toString(16).padStart(12,'0'),runId=uuid(9001),publicationSetId=uuid(9002),workerVersion=SOURCE_GAP_WORKER_V1;

// SQL is executed separately against retained real data. This stateful reader
// model exercises branch selection and binding, with actual provider file bytes.
function fixture({ordinary=false,mode='shadow'}={}){
 const f={calls:[],facts:{id:runId,publication_set_id:publicationSetId,worker_version:workerVersion,policy_version:'TCGPLAYER_MARKET_PUBLICATION_POLICY_V3',run_mode:mode,source_sync_run_id:ordinary?uuid(8000):m.sourceSyncRun,observed_at:'2026-11-24T15:00:00Z',reconciliation:{source_scope_version:'CROSS_TCG_MARKET_SCOPE_V2',complete_source_selection:true}},proof:{current_verified:false,shadow_verified:true},source:{id:m.sourceSyncRun,status:'completed',sync_mode:'current_full_sync',failed_count:0,finished_at:m.sourceFinishedAt},pointer:{publication_set_id:m.baselinePublication,run_id:m.baselineRun},pins:m.sourceArtifactPins.map(p=>({...p,sync_run_id:m.sourceSyncRun})),baseline:[...m.gaps.map(g=>g.printingId),...Array.from({length:2528},(_,i)=>uuid(i+1))],selected:[...Array.from({length:2528},(_,i)=>uuid(i+1)),...Array.from({length:10},(_,i)=>uuid(3000+i))],counts:{japanese_baseline_eligible:2545,japanese_eligible:2538,one_piece_baseline_eligible:5871,one_piece_eligible:6225}};
 if(ordinary){f.baseline=[...f.selected];f.counts.japanese_baseline_eligible=f.baseline.length;}
 f.client={query:async(sql,params=[])=>{f.calls.push({sql,params});
  if(sql.includes('select run.id,run.worker_version')){assert.deepEqual(params,[runId,publicationSetId]);return{rows:[f.facts]};}
  if(sql.includes(') current_verified,')){assert.deepEqual(params,['TCGPLAYER_MARKET_PUBLICATION_POLICY_V3',workerVersion,'CROSS_TCG_MARKET_SCOPE_V2',CROSS_TCG_MARKET_ACTIVATION_GUARD_V4]);assert.match(sql,/required_phase_count>0/);assert.match(sql,/succeeded_phase_count=run.required_phase_count/);assert.match(sql,/activation_coverage_qualification/);assert.match(sql,/publication_set_id'=publication.id::text/);assert.match(sql,/source_sync_run_id'=run.source_sync_run_id::text/);return{rows:[f.proof]};}
  if(sql.includes('from public.tcgcsv_source_sync_runs'))return{rows:[f.source]};
  if(sql.includes('select pointer.publication_set_id'))return{rows:[f.pointer]};
  if(sql.includes('select distinct snapshot.card_printing_id')){const baseline=sql.includes("snapshot.publication_state='published'");assert.deepEqual(params,baseline?[f.pointer.publication_set_id,f.pointer.run_id]:[publicationSetId,runId]);return{rows:(baseline?f.baseline:f.selected).map(card_printing_id=>({card_printing_id}))};}
  if(sql.includes('from public.tcgcsv_source_artifacts')){assert.deepEqual(params,[m.sourceArtifactPins.map(p=>p.id)]);return{rows:f.pins};}
  throw Error('Unexpected query in guard model');
 }};
 f.run=()=>assertCrossTcgMarketActivationV4(f.client,{runId,publicationSetId,workerVersion,counts:f.counts});return f;
}

test('full shadow checks the exact exception without pretending to authorize production',async()=>{const f=fixture(),r=await f.run();assert.equal(r.ready_for_production,true);assert.equal(r.run_mode,'shadow');assert.equal(r.bootstrap.required,false);assert.equal(r.source_gap_exception.excluded_printing_ids.length,17);assert.equal(r.source_gap_exception.source_available_japanese,2528);assert.equal(r.source_gap_exception.ready_for_production,false);assert.equal(Object.hasOwn(r.source_gap_exception,'worker_integrated'),false);assert.equal(r.production_execution_authority,false);assert.equal(f.calls.some(c=>c.sql.includes(') current_verified,')),false);});
test('production requires a new worker31 full-shadow proof before applying the exception',async()=>{const f=fixture({mode:'production'});f.proof={current_verified:false,shadow_verified:false};await assert.rejects(f.run(),/v4_initial_full_shadow_required/);assert.equal(f.calls.length,2);});
test('a qualified worker31 shadow permits the candidate guard diagnostic, preserving its false execution authority',async()=>{const f=fixture({mode:'production'}),r=await f.run();assert.equal(r.ready_for_production,true);assert.equal(r.bootstrap.shadow_verified,true);assert.equal(r.production_execution_authority,false);assert.equal(r.source_gap_exception.manifest_sha256,'d5773c271507a4735440b3f460c0dd05bcbf458b949a12aea51c882068920bc3');});
test('ordinary coverage on another source uses the original rule with no exception',async()=>{const f=fixture({ordinary:true}),r=await f.run();assert.equal(r.source_gap_exception,null);assert.equal(r.original_guard.ready_for_production,true);assert.equal(f.calls.length,1);});
test('an ordinary production refresh still requires the qualified runtime',async()=>{const f=fixture({ordinary:true,mode:'production'});f.proof={current_verified:false,shadow_verified:false};await assert.rejects(f.run(),/v4_initial_full_shadow_required/);});
test('other cohort losses remain blocked before exception admission',async()=>{const f=fixture();f.counts.one_piece_eligible=5800;await assert.rejects(f.run(),/one_piece_material_coverage_loss/);assert.equal(f.calls.length,1);});
test('incomplete source selection cannot become a qualified shadow',async()=>{const f=fixture();f.facts.reconciliation.complete_source_selection=false;await assert.rejects(f.run(),/incomplete_cross_tcg_source_selection/);assert.equal(f.calls.length,1);});
for(const [name,mutate,reason] of [
 ['a different run worker',f=>f.facts.worker_version='TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_30',undefined],
 ['a mismatched publication',f=>f.facts.publication_set_id=uuid(9999),undefined],
 ['a canary masquerading as full qualification',f=>f.facts.run_mode='canary',/Only production or full-shadow/],
 ['a changed source on the target run',f=>f.facts.source_sync_run_id=uuid(8888),/No exception carry-forward/],
 ['a newly completed source',f=>f.source.id=uuid(8888),/No exception carry-forward/],
 ['a changed baseline publication',f=>f.pointer.publication_set_id=uuid(7777),/Frozen baseline publication changed/],
 ['expiry at actual server time',f=>f.facts.observed_at=m.expiresAt,/expired/],
 ['a missing named baseline printing',f=>f.baseline[0]=uuid(9999),/no longer in frozen baseline/],
 ['a newly available named quote',f=>f.selected[0]=m.gaps[0].printingId,/conceal an available selected price/],
 ['a detached selected count',f=>f.selected.pop(),undefined],
 ['an unpinned artifact path',f=>f.pins[0].artifact_kind='../../../unreviewed',/metadata drift/],
 ['a changed artifact hash',f=>f.pins[0].sha256='0'.repeat(64),/metadata drift/],
 ['an artifact from another source',f=>f.pins[0].sync_run_id=uuid(9999),undefined],
 ['a missing source artifact',f=>f.pins.pop(),undefined],
])test('rejects '+name,async()=>{const f=fixture();mutate(f);await assert.rejects(f.run(),reason);});
test('caller time cannot override the database clock',async()=>{const f=fixture();f.facts.observed_at=m.expiresAt;await assert.rejects(assertCrossTcgMarketActivationV4(f.client,{runId,publicationSetId,workerVersion,counts:f.counts,now:'2026-11-24T15:00:00Z'}),/expired/);});
test('bootstrap rejects missing or string proofs and cannot reuse worker30',async()=>{for(const proof of [undefined,{current_verified:'true',shadow_verified:'true'},{current_verified:false,shadow_verified:false}])await assert.rejects(readCrossTcgMarketBootstrapV4({query:async()=>({rows:proof?[proof]:[]})},workerVersion),/v4_initial_full_shadow_required/);await assert.rejects(readCrossTcgMarketBootstrapV4({query:async()=>assert.fail('Must fail before a database read')},'TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_30'));});
