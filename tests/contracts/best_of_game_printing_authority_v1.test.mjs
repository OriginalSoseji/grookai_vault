import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadBestOfGameAuthority,prepareBestOfGamePrintingRepair} from '../../scripts/audits/best_of_game_printing_repair_prepare_v1.mjs';
import {printingManifestHash,printingCandidateId} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {assertMasterPrintingAuthority,reconcileMasterPrintings} from '../../backend/catalog/master_index_printing_authority_v1.mjs';
import {freezePrintingExecution} from '../../backend/catalog/master_index_printing_execution_v1.mjs';

const {manifest,artifacts}=loadBestOfGameAuthority(),now='2026-11-19T05:01:00Z';
const seal=value=>{const copy=structuredClone(value);delete copy.fingerprint;return {...copy,fingerprint:printingManifestHash(copy)};};
function fixture() {
  const snapshot=seal({version:'MASTER_PRINTING_DB_SNAPSHOT_V1',project_ref:'ycdxbpibncqcchqiihfz',observed_at:now,
    set_id:manifest.authority.set_id,game:'pokemon',language:'en',set_code:'bp',parents:manifest.parents,printings:[],public_options:[],global_printing_identities:[],
    coverage:{parents:true,printings:true,public_options:true,global_printing_identities:true}});
  // Synthetic inventories exercise preparation; they are never executor proof.
  const inventory={version:'BEST_OF_GAME_DEPENDENCY_INVENTORY_V1',project_ref:'ycdxbpibncqcchqiihfz',observed_at:now,
    protected_footprints:Object.entries({sets:2,parents:22,children:16,mappings:30,identities:22,owned:1}).map(([name,rows])=>({name,rows,sha256:'a'.repeat(64)})),
    foreign_keys:Array.from({length:95},(_,i)=>({name:`synthetic_fk_${i}`})),proposed_uuid_collisions:[],checked_proposed_ids:manifest.printings.map(printingCandidateId)};
  return {snapshot,fullPrintings:[],reviews:[],inventory,asOf:now};
}
const run=f=>prepareBestOfGamePrintingRepair({...f,inventoryBytes:Buffer.from(JSON.stringify(f.inventory))});

test('reviewed Best of Game scope binds two existing base parents and two independent exact-finish sources',()=>{
  assertMasterPrintingAuthority(manifest,artifacts);
  assert.equal(manifest.scope,'verified_parent_families');
  assert.deepEqual(manifest.expected,{parents:2,printings:2,finishes:{reverse:2}});
  assert.deepEqual(manifest.parents.map(p=>p.id),['371e2c1c-4a18-4961-b2a3-8d01edc07e90','acf3e7a7-5f8d-43d2-ad5c-972db7568be7']);
  const sourceRecords=JSON.parse(artifacts.get('pricedex-checklist')).sources;
  for(const printing of manifest.printings) {
    const parent=manifest.parents.find(p=>p.id===printing.card_print_id);
    assert.equal(parent.variant_key,'');assert.equal(parent.printed_identity_modifier,null);
    const refs=printing.evidence.map(e=>e.source_ref);
    const sources=sourceRecords.filter(s=>refs.includes(s.ref));
    assert.deepEqual(new Set(sources.map(s=>new URL(s.url).hostname)),new Set(['bulbapedia.bulbagarden.net','www.thepricedex.com']));
    const history=sources.find(s=>s.source_name==='bulbapedia_card_page_release_info');
    assert.equal(history.raw_fields.number,parent.printed_coordinate);assert.equal(history.raw_fields.name,parent.name);
    assert.equal(history.raw_fields.finish,'Reverse Holofoil');assert.equal(history.interpretation.intrinsic_winner_stamp,true);
    const checklist=sources.find(s=>s.source_name==='thepricedex_price_list');
    assert.ok(checklist.raw_fields.rows.some(r=>r.number===parent.printed_coordinate&&r.name===parent.name&&r.variant==='Reverse Holo'));
    assert.deepEqual(manifest.authority.forbidden_facts.filter(f=>f.card_print_id===parent.id).map(f=>f.finish_key),['normal','holo','stamped','cosmos']);
  }
});

test('missing children produce exactly two additive candidates with no existing record patches',()=>{
  const f=fixture(),candidate=run(f);
  assert.deepEqual(candidate.expected_mutation_counts,{raw_evidence_inserts:1,printing_inserts:2,provenance_updates:0,review_inserts:2});
  assert.deepEqual(candidate.printing_inserts.map(p=>p.printing_gv_id),['GV-PK-BP-8-RH','GV-PK-BP-9-RH']);
  assert.ok(candidate.printing_inserts.every(p=>p.finish_key==='reverse'&&p.is_provisional===false));
  assert.equal(candidate.write_ready,false);assert.equal(candidate.status,'prepared_not_authorized');
  assert.deepEqual(candidate.retained_printing_ids,[]);assert.deepEqual(candidate.provenance_updates,[]);
  assert.ok(Object.values(candidate.boundaries).every(value=>value===0));
  assert.deepEqual(run(f),candidate);
});

for(const defect of ['wrong_variant','renamed_parent','stale','partial_public_options','foreign_set_gvid_collision','uuid_collision','missing_uuid_check','owned_count_changed','missing_protected_hash','dependency_schema_changed','mismatched_inventory_time','already_repaired']) {
  test(`Best of Game preparation blocks ${defect}`,()=>{
    const f=fixture();
    if(defect==='wrong_variant') f.snapshot.parents[0].printed_identity_modifier='winner_stamp';
    if(defect==='renamed_parent') f.snapshot.parents[0].name='Rocket’s Mewtwo';
    if(defect==='stale') f.asOf='2026-11-21T05:01:00Z';
    if(defect==='partial_public_options') f.snapshot.coverage.public_options=false;
    if(defect==='foreign_set_gvid_collision') f.snapshot.global_printing_identities.push({id:'11111111-1111-4111-8111-111111111111',card_print_id:'22222222-2222-4222-8222-222222222222',finish_key:'reverse',printing_gv_id:'GV-PK-BP-8-RH'});
    if(defect==='uuid_collision') f.inventory.proposed_uuid_collisions=[f.inventory.checked_proposed_ids[0]];
    if(defect==='missing_uuid_check') f.inventory.checked_proposed_ids.pop();
    if(defect==='owned_count_changed') f.inventory.protected_footprints.find(p=>p.name==='owned').rows=2;
    if(defect==='missing_protected_hash') delete f.inventory.protected_footprints.find(p=>p.name==='mappings').sha256;
    if(defect==='dependency_schema_changed') f.inventory.foreign_keys.pop();
    if(defect==='mismatched_inventory_time') f.inventory.observed_at='2026-11-19T05:00:00Z';
    if(defect==='already_repaired') f.snapshot.printings.push({id:f.inventory.checked_proposed_ids[0],...manifest.printings[0]});
    f.snapshot=seal(f.snapshot);assert.throws(()=>run(f));
  });
}

test('frozen source bytes are required and a winner/finish reinterpretation invalidates authority',()=>{
  const changed=new Map(artifacts);changed.set('bulbapedia-mewtwo',Buffer.from('provider flag only'));
  assert.throws(()=>assertMasterPrintingAuthority(manifest,changed),/artifact_hash_mismatch/);
  const altered=structuredClone(manifest);altered.printings[0].finish_key='stamped';
  assert.throws(()=>assertMasterPrintingAuthority(seal(altered),artifacts));
});

test('reconciler reports the two missing facts without claiming whole-set readiness',()=>{
  const f=fixture(),result=reconcileMasterPrintings(manifest,f.snapshot,{artifacts,asOf:now});
  assert.deepEqual(result.findings.map(f=>f.classification),['expected_printing_missing','expected_printing_missing']);
  assert.equal(result.proposals.length,2);assert.equal(result.collector_ready,false);assert.equal(result.write_ready,false);
});

test('the existing McDonalds executor cannot admit the Best of Game candidate',()=>{
  const candidate=run(fixture());
  assert.throws(()=>freezePrintingExecution({candidate,manifest,artifacts,parents:manifest.parents,schema:{},protectedFootprints:[]}),/mcd21/);
});

test('offline CLI rejects apply and refuses to overwrite an existing output directory',()=>{
  const f=fixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'bog-prepare-'));
  const script=fileURLToPath(new URL('../../scripts/audits/best_of_game_printing_repair_prepare_v1.mjs',import.meta.url));
  try {
    const apply=spawnSync(process.execPath,[script,'--apply'],{encoding:'utf8'});
    assert.equal(apply.status,1);assert.match(apply.stderr,/unknown_or_repeated_argument/);
    const values={snapshot:f.snapshot,'before-rows':[],reviews:[],inventory:f.inventory},args=[];
    for(const [name,value] of Object.entries(values)) {const file=path.join(dir,name+'.json');fs.writeFileSync(file,JSON.stringify(value));args.push(`--${name}=${file}`);}
    const out=path.join(dir,'candidate');args.push(`--as-of=${now}`,`--out-dir=${out}`);
    const first=spawnSync(process.execPath,[script,...args],{encoding:'utf8'});assert.equal(first.status,0,first.stderr);
    const before=fs.readFileSync(path.join(out,'candidate.json'));
    const second=spawnSync(process.execPath,[script,...args],{encoding:'utf8'});assert.equal(second.status,1);assert.match(second.stderr,/EEXIST/);
    assert.deepEqual(fs.readFileSync(path.join(out,'candidate.json')),before);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
