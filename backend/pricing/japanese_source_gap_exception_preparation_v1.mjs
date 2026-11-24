// Read-only coverage preview. It grants no production authority or integration receipt.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {evaluateCrossTcgMarketActivationV2} from './cross_tcg_market_activation_guard_v3.mjs';

export const JAPANESE_SOURCE_GAP_PREPARATION_V1='JAPANESE_SOURCE_GAP_PREPARATION_V1';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifestBytes=fs.readFileSync(new URL('./japanese_source_gap_seventeen_preparation_v1.json',import.meta.url));
const MANIFEST_SHA='d5773c271507a4735440b3f460c0dd05bcbf458b949a12aea51c882068920bc3';
export function readJapaneseSourceGapPreparationV1(){
 assert.equal(sha(manifestBytes),MANIFEST_SHA,'Frozen preparation manifest drift');
 return JSON.parse(manifestBytes);
}

// Inputs must be captured together in an actual read-only database transaction.
// Byte admission independently verifies the original provider product/price files.
// This preview never returns execution authority or alters a quote/decision.
export function previewJapaneseSourceGapExceptionV1({sourceRun,currentPublication,baselineJapaneseIds,selectedJapaneseIds,counts,reconciliation,artifacts,now=new Date()}={}){
 const m=readJapaneseSourceGapPreparationV1(),at=new Date(now).getTime();
 assert.ok(Number.isFinite(at),'Valid observation time required');
 assert.equal(sourceRun?.id,m.sourceSyncRun,'Source change requires a new decision');
 assert.equal(sourceRun?.status,'completed');assert.equal(sourceRun?.sync_mode,'current_full_sync');assert.equal(sourceRun?.failed_count,0);
 assert.equal(new Date(sourceRun.finished_at).toISOString(),m.sourceFinishedAt);
 assert.ok(at>=Date.parse(m.sourceFinishedAt)&&at<Date.parse(m.expiresAt),'Preparation expired or future source');
 assert.equal(currentPublication?.publication_set_id,m.baselinePublication);assert.equal(currentPublication?.run_id,m.baselineRun);
 for(const ids of [baselineJapaneseIds,selectedJapaneseIds]){assert.ok(Array.isArray(ids));assert.equal(new Set(ids).size,ids.length,'Distinct printing inventory required');for(const id of ids)assert.match(id,/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);}
 assert.equal(baselineJapaneseIds.length,m.baselineJapaneseCount);assert.equal(counts?.japanese_baseline_eligible,baselineJapaneseIds.length);assert.equal(counts?.japanese_eligible,selectedJapaneseIds.length);
 const baseline=new Set(baselineJapaneseIds),selected=new Set(selectedJapaneseIds);
 assert.equal(m.gaps.length,17);assert.equal(new Set(m.gaps.map(g=>g.printingId)).size,17);
 for(const gap of m.gaps){assert.ok(baseline.has(gap.printingId),'Named source gap no longer in frozen baseline');assert.ok(!selected.has(gap.printingId),'Exception may never conceal an available selected price');}
 assert.equal(artifacts?.length,m.sourceArtifactPins.length);const admitted=new Map();
 for(const pin of m.sourceArtifactPins){const matches=artifacts.filter(a=>a.id===pin.id);assert.equal(matches.length,1,'Exact source artifact required');const a=matches[0];for(const key of ['artifact_kind','category_id','group_id','sha256'])assert.equal(a[key],pin[key],'Source artifact metadata drift');assert.equal(a.sync_run_id,m.sourceSyncRun);assert.ok(Buffer.isBuffer(a.bytes));assert.equal(a.bytes.length,Number(pin.byte_size));assert.equal(sha(a.bytes),pin.sha256,'Actual source bytes drift');const body=JSON.parse(a.bytes);assert.equal(body.success,true);assert.ok(Array.isArray(body.results));admitted.set(pin.group_id+':'+pin.artifact_kind,body.results);}
 for(const gap of m.gaps){const products=admitted.get(gap.groupId+':products').filter(r=>r.productId===gap.productId),prices=admitted.get(gap.groupId+':prices').filter(r=>r.productId===gap.productId&&r.subTypeName===gap.subtype);assert.equal(products.length,1,'Exact source product required');assert.equal(prices.length,gap.classification==='price_row_absent_in_original_source'?0:1);if(prices.length)assert.equal(prices[0].marketPrice,null,'Only the reviewed null source value is admitted');}
 const adjusted={...counts,japanese_baseline_eligible:baselineJapaneseIds.length-m.gaps.length};
 const preview=evaluateCrossTcgMarketActivationV2({counts:adjusted,reconciliation});
 return {version:JAPANESE_SOURCE_GAP_PREPARATION_V1,preparation_coverage_passed:preview.ready_for_production,findings:preview.findings,original_guard:evaluateCrossTcgMarketActivationV2({counts,reconciliation}),baseline_japanese:baselineJapaneseIds.length,source_available_japanese:adjusted.japanese_baseline_eligible,selected_japanese:selectedJapaneseIds.length,excluded_printing_ids:m.gaps.map(g=>g.printingId).sort(),manifest_sha256:MANIFEST_SHA,expires_at:m.expiresAt,production_execution_authority:false,ready_for_production:false,worker_integrated:false,quote_writes:0};
}
