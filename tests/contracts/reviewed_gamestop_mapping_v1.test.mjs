import test from 'node:test';import assert from 'node:assert/strict';
import {mappingFixture} from '../fixtures/reviewed_gamestop_mapping_v1.mjs';
import {seal} from '../fixtures/warehouse_printing_authority_v1.mjs';
import {assertReviewedGameStopMapping,assertGameStopMappingReadback,executeReviewedGameStopMapping} from '../../backend/warehouse/reviewed_gamestop_mapping_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
test('reviewed mapping preserves raw lineage and distinguishes invalid prior owner',()=>{
 for(const rejectOld of [true,false]){const b=mappingFixture({rejectOld});assert.equal(assertReviewedGameStopMapping(JSON.parse(JSON.stringify(b))).rejected.length,rejectOld?1:0);}
});
for(const defect of ['bytes','source','parent','printing','raw','discovery','mapping','approval_projection','target'])test('envelope rehash cannot authorize drift: '+defect,()=>{
 let b=mappingFixture();
 if(defect==='bytes')b.artifacts[0].base64=Buffer.from('changed').toString('base64');
 if(defect==='source')b.before.source.name='another source';
 if(defect==='parent')b.before.parent.variant_key='eb_games_stamp';
 if(defect==='printing')b.before.children[0].finish_key='cosmos';
 if(defect==='raw')b.before.raw.payload={different:true};
 if(defect==='discovery')b.before.discovery.raw_import_id=18;
 if(defect==='mapping')b.before.mappings[0].external_id='123499';
 if(defect==='approval_projection'){b.manifest.rejected_external_mapping_assertions=[];b.manifest=seal(b.manifest);}
 if(defect==='target')b.target.external_id='123457';
 b=seal(b);assert.throws(()=>assertReviewedGameStopMapping(b));
});
test('missing execution authorization fails before any SQL',async()=>{
 let calls=0;await assert.rejects(executeReviewedGameStopMapping({query(){calls++;}},mappingFixture()),/explicit_execution_authorization/);assert.equal(calls,0);
});
test('readback requires exact mapping, retains invalid record, and preserves parent/child/source',()=>{
 const b=mappingFixture(),s=structuredClone(b.before),old=s.mappings[0];
 old.active=false;old.meta={...old.meta,reviewed_invalidation:{version:b.version,authority_fingerprint:b.fingerprint,reason_code:'PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT',prior_row_sha256:hash(b.before.mappings[0])}};
 s.mappings.push({id:10,...b.target,active:true,meta:{reviewed_mapping_fingerprint:b.fingerprint,master_manifest_fingerprint:b.manifest.fingerprint,warehouse_candidate_id:b.target.candidate_id}});
 assert.equal(assertGameStopMappingReadback(b,s).id,10);
 for(const change of [x=>x.parent.name='renamed',x=>x.children[0].id='replaced',x=>x.mappings[0].active=true,x=>x.mappings[1].card_print_id='wrong',x=>x.mappings.splice(0,1)]){
  const bad=structuredClone(s);change(bad);assert.throws(()=>assertGameStopMappingReadback(b,bad));
 }
});
