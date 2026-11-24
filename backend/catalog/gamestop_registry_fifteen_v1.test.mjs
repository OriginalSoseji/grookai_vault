import test from 'node:test';import assert from 'node:assert/strict';
import manifest from '../../docs/catalog/gamestop_registry_fifteen_v1/index.json' with {type:'json'};
import hold from '../../docs/catalog/stamp_identity_admission_hold_v1/index.json' with {type:'json'};
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';
import {TARGETS,assertGameStopRegistryManifest,qualifyGameStopRegistryTransaction} from './gamestop_registry_fifteen_v1.mjs';

test('fifteen existing GameStop identities stay disjoint from the Play/Prize hold',()=>{
 const held=new Set(hold.candidate_pairs.flatMap(p=>[p.play.id,p.prize.id]));assert.equal(held.size,298);
 assert.equal(TARGETS.length,15);assert.ok(TARGETS.every(t=>!held.has(t.parentId)));
 const counts={};for(const t of TARGETS){const p=JSON.parse(t.parentRow),c=JSON.parse(t.childRow);assert.equal(t.identity.card_print_id,p.id);assert.equal(c.card_print_id,p.id);counts[c.finish_key]=(counts[c.finish_key]??0)+1;}
 assert.deepEqual(counts,{cosmos:8,reverse:4,holo:3});
});

test('a self-consistent replacement manifest cannot widen the reviewed registry repair',()=>{
 const {fingerprint,...body}=structuredClone(manifest);body.targets[0].identity.source_name_raw='Unreviewed identity discriminator';
 const candidate={...body,fingerprint:hash(body)};assert.throws(()=>assertGameStopRegistryManifest(candidate),/Unreviewed registry manifest/);
});

test('callers cannot turn the approved active identities into inactive entries',()=>{
 assert.throws(()=>{TARGETS[0].identity.is_active=false;},TypeError);
 assert.equal(TARGETS[0].identity.is_active,true);
 assertGameStopRegistryManifest();
});

test('nested identity dimensions and reviewed schema effects remain immutable',()=>{
 assert.throws(()=>{TARGETS[0].identity.identity_payload.variant_key_current='unreviewed_stamp';},TypeError);
 assert.throws(()=>{manifest.insertEffects.triggers.push({fires_insert:true});},TypeError);
 assert.equal(TARGETS[0].identity.identity_payload.variant_key_current,'gamestop_stamp');
 assertGameStopRegistryManifest();
});

test('qualification refuses canonical production routes before issuing any query',async()=>{
 let queries=0;const client={connectionParameters:{host:'aws-1-us-east-2.pooler.supabase.com',port:5432,user:'postgres.ycdxbpibncqcchqiihfz',database:'postgres'},query:async()=>{queries++;throw Error('Unexpected query');}};
 await assert.rejects(qualifyGameStopRegistryTransaction({client,plan:{},mode:'apply'}));assert.equal(queries,0);
});

test('a loopback route cannot name a retained or ordinary database',async()=>{
 let queries=0;const client={connectionParameters:{host:'127.0.0.1',port:5432,user:'postgres',database:'retail_stamp_cosmos_four_qualification_v1'},query:async()=>{queries++;throw Error('Unexpected query');}};
 await assert.rejects(qualifyGameStopRegistryTransaction({client,plan:{},mode:'apply'}));assert.equal(queries,0);
});
