import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildWorld2010SubsetIngress,assertWorld2010SubsetIngress,applyWorld2010SubsetLocal,assertWorld2010SubsetPending} from '../../backend/catalog/pokemon_world2010_subset_ingress_v1.mjs';
import {loadSubsetOriginals,stageSubsetIngress} from '../../scripts/audits/pokemon_world2010_subset_ingress_v1.mjs';
const root=process.env.CLASSIC_PROOF_INPUT_ROOT;
const input=()=>({observed_at:'2026-10-03T03:40:00.000Z',
  relationship_snapshot:JSON.parse(fs.readFileSync(root+'/world2010-live-existing-identity-v9/snapshot.json')),
  ingress_snapshot:JSON.parse(fs.readFileSync(root+'/world2010-whole109-ingress-compatibility-v4/snapshot.json'))});
const build=i=>buildWorld2010SubsetIngress(i,loadSubsetOriginals());
test('subset CLI rejects apply and duplicate argument before creating outputs',()=>{
  assert.throws(()=>stageSubsetIngress(['--apply=yes']),/unique_offline/);
  assert.throws(()=>stageSubsetIngress(['--out-dir=a','--out-dir=b']),/unique_offline/);
});
test('full2001 fence and whole109 accounting produce83new9retained17held', {skip:!root},()=>{
  const i=input(),before=JSON.stringify(i),p=build(i);assert.equal(JSON.stringify(i),before);
  assert.deepEqual(p.counts,{source_group:2001,selected:109,outside:1892,new_raw:83,retained:9,held:17});
  assert.equal(p.human_signature,null);assert.equal(p.production_execution_authorized,false);
  assert.ok(p.entries.every(e=>e.gate.canonical_parent_id===null&&e.gate.finish_key===null));
  assert.equal(p.input.ingress_snapshot.group_raw.length,77);assert.equal(p.input.ingress_snapshot.group_discovery.length,77);
  assertWorld2010SubsetIngress(p,loadSubsetOriginals());
});
for(const [name,mutate,reason] of [
  ['partial group',i=>i.ingress_snapshot.group_products.pop(),/complete2001/],
  ['duplicate group product',i=>i.ingress_snapshot.group_products[1]=i.ingress_snapshot.group_products[0],/duplicate_inventory/],
  ['changed selected source',i=>i.ingress_snapshot.products[0].name='wrong',/selected_source_drift/],
  ['partial coverage',i=>i.ingress_snapshot.rows.pop(),/whole109_coverage/],
  ['cross-group source',i=>i.ingress_snapshot.group_products[0].group_id=99,/source_group_mismatch/],
  ['source fence substituted product',i=>{const s=i.ingress_snapshot;s.group_products.find(p=>p.product_id===s.products[0].product_id).payload_hash='0'.repeat(64);},/selected_source_not/],
  ['new exact relationship',i=>i.ingress_snapshot.rows[0].canonical_parent_ids.push('new'),/new_exact_relationship/],
  ['new promotion',i=>i.ingress_snapshot.rows[0].promotion_candidates.push({id:'new'}),/new_promotion/],
  ['unbound raw',i=>{const s=i.ingress_snapshot,r={id:'99999999999999',source:'tcgcsv',payload:{tcgplayerId:s.rows[0].product_id}};s.raw.push(r);s.group_raw.push(r);},/complete77_group_raw/],
  ['relabeled raw',i=>i.ingress_snapshot.raw[0].source='tcgdex',/selected_raw_inventory/],
  ['dropped outside discovery',i=>i.ingress_snapshot.group_discovery.pop(),/complete77_group_discovery/],
  ['contradictory retained ID',i=>i.ingress_snapshot.discovery[0].raw_import_id='9007199254740993',/selected_discovery_inventory/],
  ['environment mismatch',i=>i.ingress_snapshot.sanity.cards=2,/assertion|falsy/i],
  ['child loss',i=>i.relationship_snapshot.printings.pop(),/preserve100/],
  ['new existing identity',i=>i.relationship_snapshot.identities.push({id:'new'}),/existing_identity_requires/],
]) test(name+' rejects whole subset',{skip:!root},()=>{const i=input();mutate(i);assert.throws(()=>build(i),reason);});
test('modified plan or human approval cannot be self-rehashed into authority',{skip:!root},()=>{
  const p=build(input());for(const change of [p=>p.held.pop(),p=>p.entries.pop(),p=>{p.actor_type='human';},p=>{p.production_execution_authorized=true;},p=>p.outside_product_ids.pop()]){
    const c=structuredClone(p);change(c);assert.throws(()=>assertWorld2010SubsetIngress(c,loadSubsetOriginals()),/subset_plan_replay_drift/);
  }
});
test('local writer rejects a production database before locks or writes',{skip:!root},async()=>{
  const calls=[],db={query:async(sql)=>{calls.push(sql);return{rows:[{name:'postgres',address:'127.0.0.1'}]};}};
  await assert.rejects(()=>applyWorld2010SubsetLocal(db,build(input()),loadSubsetOriginals()),/isolated_subset_lab/);
  assert.equal(calls.length,1);
});
test('loopback proof guard rejects a remote server even with a matching lab name',{skip:!root},async()=>{
  const calls=[],db={query:async(sql)=>{calls.push(sql);return{rows:[{name:'grookai_world2010_subset_fake',address:'192.0.2.1'}]};}};
  await assert.rejects(()=>applyWorld2010SubsetLocal(db,build(input()),loadSubsetOriginals()),/loopback_subset_lab/);assert.equal(calls.length,1);
});
test('pending identity readback rejects replacement ledger and raw identities without numeric coercion',()=>{
  const p={status:'verified',ledger_id:'9007199254740993',rows:Array.from({length:83},(_,i)=>({raw_import_id:String(1000+i)}))};
  assertWorld2010SubsetPending(p,structuredClone(p));
  const a=structuredClone(p);a.ledger_id='9007199254740992';assert.throws(()=>assertWorld2010SubsetPending(p,a),/pending_ledger/);
  const b=structuredClone(p);b.rows[0].raw_import_id='9007199254740993';assert.throws(()=>assertWorld2010SubsetPending(p,b),/pending_generated/);
});
