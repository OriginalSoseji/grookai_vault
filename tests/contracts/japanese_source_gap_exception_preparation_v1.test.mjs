import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {readJapaneseSourceGapPreparationV1,previewJapaneseSourceGapExceptionV1} from '../../backend/pricing/japanese_source_gap_exception_preparation_v1.mjs';
const m=readJapaneseSourceGapPreparationV1(),uuid=i=>'00000000-0000-4000-a000-'+i.toString(16).padStart(12,'0');
// Synthetic printing inventories exercise guard arithmetic. Retained provider
// files are actual immutable bytes; this is not a claim of database membership.
function fixture(){const baseline=[...m.gaps.map(g=>g.printingId),...Array.from({length:2528},(_,i)=>uuid(i+1))];return{sourceRun:{id:m.sourceSyncRun,status:'completed',sync_mode:'current_full_sync',failed_count:0,finished_at:m.sourceFinishedAt},currentPublication:{publication_set_id:m.baselinePublication,run_id:m.baselineRun},baselineJapaneseIds:baseline,selectedJapaneseIds:baseline.slice(17),counts:{japanese_baseline_eligible:2545,japanese_eligible:2528,one_piece_baseline_eligible:10000,one_piece_eligible:10000},reconciliation:{source_scope_version:'CROSS_TCG_MARKET_SCOPE_V2',complete_source_selection:true},artifacts:m.sourceArtifactPins.map(pin=>({...pin,sync_run_id:m.sourceSyncRun,bytes:fs.readFileSync(new URL('../../docs/pricing/japanese_source_gap_seventeen_v1/source/'+pin.group_id+'-'+pin.artifact_kind+'.json',import.meta.url))})),now:'2026-11-24T12:00:00Z'};}
test('actual source bytes admit only seventeen gaps; successful preview has no production authority',()=>{const result=previewJapaneseSourceGapExceptionV1(fixture());assert.equal(result.preparation_coverage_passed,true);assert.equal(result.original_guard.ready_for_production,false);assert.deepEqual(result.original_guard.findings,['japanese_pokemon_material_coverage_loss']);assert.equal(result.source_available_japanese,2528);assert.equal(result.excluded_printing_ids.length,17);assert.equal(result.ready_for_production,false);assert.equal(result.production_execution_authority,false);assert.equal(result.worker_integrated,false);assert.equal(result.quote_writes,0);});
for(const [name,mutate] of [
 ['another source',f=>f.sourceRun.id=uuid(9999)],
 ['unfinished source',f=>f.sourceRun.status='running'],
 ['partial source',f=>f.sourceRun.sync_mode='partial'],
 ['failed source',f=>f.sourceRun.failed_count=1],
 ['redated source',f=>f.sourceRun.finished_at='2026-11-24T01:00:00Z'],
 ['expiry boundary',f=>f.now=m.expiresAt],
 ['invalid clock',f=>f.now='not a time'],
 ['future source',f=>f.now='2026-11-23T00:00:00Z'],
 ['different publication',f=>f.currentPublication.publication_set_id=uuid(9999)],
 ['different baseline run',f=>f.currentPublication.run_id=uuid(9999)],
 ['missing named gap',f=>f.baselineJapaneseIds[0]=uuid(9999)],
 ['duplicate baseline',f=>f.baselineJapaneseIds[0]=f.baselineJapaneseIds[1]],
 ['gap already priced',f=>{f.selectedJapaneseIds[0]=m.gaps[0].printingId;}],
 ['count detached from inventory',f=>f.counts.japanese_eligible++],
 ['missing artifact',f=>f.artifacts.pop()],
 ['wrong artifact metadata',f=>f.artifacts[0].category_id=3],
 ['artifact from different run',f=>f.artifacts[0].sync_run_id=uuid(9999)],
 ['changed source bytes',f=>{f.artifacts[0].bytes=Buffer.from(f.artifacts[0].bytes);f.artifacts[0].bytes[10]^=1;}],
 ['changed claimed hash',f=>f.artifacts[0].sha256='0'.repeat(64)],
])test('rejects '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>previewJapaneseSourceGapExceptionV1(f));});
test('additional Japanese coverage loss still blocks',()=>{const f=fixture();f.selectedJapaneseIds=f.selectedJapaneseIds.slice(10);f.counts.japanese_eligible=f.selectedJapaneseIds.length;const result=previewJapaneseSourceGapExceptionV1(f);assert.equal(result.preparation_coverage_passed,false);assert.ok(result.findings.includes('japanese_pokemon_material_coverage_loss'));});
test('One Piece coverage floor remains unchanged',()=>{const f=fixture();f.counts.one_piece_eligible=9989;const result=previewJapaneseSourceGapExceptionV1(f);assert.equal(result.preparation_coverage_passed,false);assert.ok(result.findings.includes('one_piece_material_coverage_loss'));});
test('partial selection still blocks even after source-gap adjustment',()=>{const f=fixture();f.reconciliation.complete_source_selection=false;assert.ok(previewJapaneseSourceGapExceptionV1(f).findings.includes('incomplete_cross_tcg_source_selection'));});
