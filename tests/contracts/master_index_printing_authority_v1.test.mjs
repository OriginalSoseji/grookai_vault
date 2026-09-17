import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PRINTING_COMPLETENESS_VERSION,printingManifestHash,buildPrintingAdmissionPlan} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {buildMasterPrintingRepairPlan} from '../../backend/catalog/master_index_printing_repair_plan_v1.mjs';
import {MASTER_PRINTING_AUTHORITY_VERSION,assertMasterPrintingAuthority,reconcileMasterPrintings,buildCatalogPrintingWorklist} from '../../backend/catalog/master_index_printing_authority_v1.mjs';
import {SET_RELEASE_STATUS_SQL} from '../../backend/catalog/cross_tcg_set_publication_gate_v1.mjs';

const digest=v=>createHash('sha256').update(v).digest('hex');
const now='2026-09-17T05:00:00Z',parentId='11111111-1111-4111-8111-111111111111',setId='22222222-2222-4222-8222-222222222222';
const childId='33333333-3333-4333-8333-333333333333';
function seal(value) {const copy=structuredClone(value);delete copy.fingerprint;return {...copy,fingerprint:printingManifestHash(copy)};}
function fixture() {
 const master=Buffer.from('reviewed expected identities'),source=Buffer.from('preserved checklist bytes');
 const parent={id:parentId,set_id:setId,gv_id:'GV-PK-MCD-2021-1',name:'Bulbasaur',printed_coordinate:'1',identity_domain:'pokemon_eng_standard',variant_key:'',printed_identity_modifier:null};
 const manifest={version:PRINTING_COMPLETENESS_VERSION,game:'pokemon',language:'en',set_code:'mcd21',scope:'base_release',
  identity_policy_version:'POKEMON_EN_PHYSICAL_V1',master_index_ref:'master',master_index_sha256:digest(master),parents:[parent],
  printings:['normal','holo'].map(finish=>({card_print_id:parentId,finish_key:finish,printing_gv_id:parent.gv_id+(finish==='holo'?'-HOLO':'-STD'),review_status:'verified',
   evidence:[{kind:'checked_checklist',source_ref:'checklist',sha256:digest(source),card_print_id:parentId,finish_key:finish}]})),
  unresolved_variants:[],suppressed_printing_facts:[],expected:{parents:1,printings:2,finishes:{normal:1,holo:1}},
  authority:{version:MASTER_PRINTING_AUTHORITY_VERSION,status:'verified_scope',set_id:setId,
   source_artifacts:[{ref:'checklist',sha256:digest(source),kind:'checked_checklist',url_or_identifier:'frozen-checklist',retrieved_at:now}],
   protected_facts:[{card_print_id:parentId,finish_key:'holo'}],forbidden_facts:[],conflicts:[]}};
 const artifacts=new Map([['master',master],['checklist',source]]);
 const binding={status:'verified_scope',master_index_sha256:digest(master),game:'pokemon',language:'en',set_code:'mcd21',scope:'base_release',reviewer:'test-reviewer',reviewed_at:now,projection_sha256:printingManifestHash(manifest)};
 const review=Buffer.from(JSON.stringify(binding));artifacts.set('review',review);
 manifest.authority.review={ref:'review',sha256:digest(review)};
 const children=manifest.printings.map((p,i)=>({...p,id:i?childId.replace(/^3/,'4'):childId,is_provisional:false,provenance_source:'checklist',provenance_ref:'checklist',active:true,review_status:'verified',public_visibility:'visible'}));
 const snapshot=seal({version:'MASTER_PRINTING_DB_SNAPSHOT_V1',project_ref:'ycdxbpibncqcchqiihfz',observed_at:now,
  set_id:setId,game:'pokemon',language:'en',set_code:'mcd21',parents:[parent],printings:children,
  public_options:children.map(p=>({...p,finish_is_active:true})),global_printing_identities:children.map(p=>({id:p.id,card_print_id:p.card_print_id,finish_key:p.finish_key,printing_gv_id:p.printing_gv_id})),
  coverage:{parents:true,printings:true,public_options:true,global_printing_identities:true}});
 return {manifest:seal(manifest),artifacts,snapshot};
}
const run=f=>reconcileMasterPrintings(f.manifest,f.snapshot,{artifacts:f.artifacts,asOf:now});

test('verified authority requires bytes and exact review projection, not database presence',()=>{
 const f=fixture();assertMasterPrintingAuthority(f.manifest,f.artifacts);assert.equal(run(f).status,'printing_ready');
 assert.equal(run(f).collector_ready,false);assert.equal(run(f).write_ready,false);
});
for(const defect of ['no_authority','wrong_source_bytes','wrong_master_bytes','missing_review','wrong_policy','source_not_bound','protected_missing','forbidden_present','conflicts','wrong_language','wrong_variant'])test(`authority rejects ${defect}`,()=>{
 const f=fixture();
 if(defect==='no_authority')delete f.manifest.authority;
 if(defect==='wrong_source_bytes')f.artifacts.set('checklist',Buffer.from('different'));
 if(defect==='wrong_master_bytes')f.artifacts.set('master',Buffer.from('different'));
 if(defect==='missing_review')f.artifacts.delete('review');
 if(defect==='wrong_policy')f.manifest.identity_policy_version='price_inferred';
 if(defect==='source_not_bound')f.manifest.printings[0].evidence[0].source_ref='other';
 if(defect==='protected_missing')f.manifest.authority.protected_facts.push({card_print_id:parentId,finish_key:'reverse'});
 if(defect==='forbidden_present')f.manifest.authority.forbidden_facts.push({card_print_id:parentId,finish_key:'holo'});
 if(defect==='conflicts')f.manifest.authority.conflicts=['unresolved'];
 if(defect==='wrong_language')f.manifest.language='ja';
 if(defect==='wrong_variant')f.manifest.parents[0].variant_key='stamp';
 f.manifest=seal(f.manifest);assert.throws(()=>run(f));
});
test('McDonalds regression detects missing Holo even when every parent has Normal',()=>{
 const f=fixture();f.snapshot.printings.pop();f.snapshot.public_options.pop();f.snapshot.global_printing_identities.pop();f.snapshot=seal(f.snapshot);
 const r=run(f);assert.equal(r.status,'needs_reconciliation');assert.equal(r.proposals.length,1);
 assert.equal(r.proposals[0].expected.finish_key,'holo');assert.equal(r.retained[0].printing_id,childId);
 assert.equal(r.boundaries.database_writes,0);
});
test('missing GVID proposal preserves child ID; a different GVID is never renamed',()=>{
 const f=fixture();for(const list of ['printings','public_options','global_printing_identities'])f.snapshot[list][0].printing_gv_id=null;
 f.snapshot=seal(f.snapshot);const r=run(f);assert.equal(r.proposals[0].printing_id,childId);assert.ok(r.proposals[0].preserve_printing_id);
 for(const list of ['printings','public_options','global_printing_identities'])f.snapshot[list][0].printing_gv_id='GV-PK-OTHER-STD';
 f.snapshot=seal(f.snapshot);assert.equal(run(f).proposals.length,0);assert.ok(run(f).findings.some(x=>x.classification==='printing_identity_conflict'));
});
test('extra database child is review-only, never canonicalized or deleted',()=>{
 const f=fixture(),extra={...f.snapshot.printings[0],id:childId.replace(/^3/,'5'),finish_key:'reverse',printing_gv_id:'GV-PK-MCD-2021-1-RH'};
 f.snapshot.printings.push(extra);f.snapshot.global_printing_identities.push(extra);f.snapshot=seal(f.snapshot);
 const r=run(f);assert.ok(r.findings.some(x=>x.classification==='unexpected_printing_review_only'));assert.equal(r.proposals.length,0);assert.equal(r.boundaries.deletes,0);
});
for(const defect of ['stale','future','partial','parent_mismatch','global_collision','global_incomplete','public_missing','unreviewed'])test(`snapshot protects ${defect}`,()=>{
 const f=fixture();
 if(defect==='stale')f.snapshot.observed_at='2026-09-01T00:00:00Z';
 if(defect==='future')f.snapshot.observed_at='2027-01-01T00:00:00Z';
 if(defect==='partial')f.snapshot.coverage.public_options=false;
 if(defect==='parent_mismatch')f.snapshot.parents[0].variant_key='other';
 if(defect==='global_incomplete')f.snapshot.global_printing_identities=[];
 if(defect==='public_missing')f.snapshot.public_options=[];
 if(defect==='unreviewed')f.snapshot.printings[0].review_status='unsupported';
 if(defect==='global_collision'){
  f.snapshot.printings.pop();f.snapshot.public_options.pop();
  f.snapshot.global_printing_identities[1].card_print_id='other-parent';
 }
 f.snapshot=seal(f.snapshot);
 if(['stale','future','partial','global_incomplete'].includes(defect))assert.throws(()=>run(f));
 else {const r=run(f);assert.equal(r.status,'needs_reconciliation');assert.equal(r.write_ready,false);if(defect==='global_collision')assert.equal(r.proposals.length,0);}
});
test('same frozen inputs produce identical reconciliation fingerprints',()=>{
 const f=fixture();assert.deepEqual(run(f),run(f));
});

test('a newly reviewed manifest cannot bypass the locked ME04 truth profile',()=>{
 const f=fixture();f.manifest.set_code='me04';
 const projection=structuredClone(f.manifest);delete projection.fingerprint;delete projection.authority.review;
 const review=JSON.parse(f.artifacts.get('review'));
 review.set_code='me04';review.projection_sha256=printingManifestHash(projection);
 const bytes=Buffer.from(JSON.stringify(review));f.artifacts.set('review',bytes);
 f.manifest.authority.review.sha256=digest(bytes);f.manifest=seal(f.manifest);
 assert.throws(()=>assertMasterPrintingAuthority(f.manifest,f.artifacts),/exactly 202/);
});

function repairFixture() {
 const f=fixture();f.snapshot.printings.pop();f.snapshot.public_options.pop();f.snapshot.global_printing_identities.pop();
 const existing=f.snapshot.printings[0];
 Object.assign(existing,{provenance_source:null,provenance_ref:null,review_status:null,public_visibility:null,active:null});
 f.snapshot=seal(f.snapshot);
 const fullPrintings=f.snapshot.printings.map(p=>({...p,image_status:'base_shared',image_path:'unchanged/path',created_at:'2020-01-01T00:00:00Z'}));
 const inventory=Buffer.from('preserved production schema inventory');f.artifacts.set('dependencies',inventory);
 const proposed=buildPrintingAdmissionPlan(f.manifest,f.snapshot.printings).inserts;
 return {...f,fullPrintings,reviews:[],asOf:now,dependencyEvidence:{inventory_ref:'dependencies',inventory_sha256:digest(inventory),
  foreign_keys:[],protected_footprints:[],proposed_uuid_collisions:[],checked_proposed_ids:proposed.map(p=>p.id)}};
}

test('additive repair preserves IDs/images and updates only absent provenance',()=>{
 const f=repairFixture(),plan=buildMasterPrintingRepairPlan(f);
 assert.deepEqual(plan.expected_mutation_counts,{raw_evidence_inserts:1,printing_inserts:1,provenance_updates:1,review_inserts:2});
 assert.equal(plan.printing_inserts[0].finish_key,'holo');assert.deepEqual(plan.retained_printing_ids,[childId]);
 assert.deepEqual(Object.keys(plan.provenance_updates[0].patch).sort(),['provenance_ref','provenance_source']);
 assert.equal(plan.provenance_updates[0].before.image_path,'unchanged/path');assert.equal(plan.write_ready,false);
 assert.equal(plan.boundaries.deletes,0);assert.equal(plan.boundaries.pricing_writes,0);
 assert.deepEqual(buildMasterPrintingRepairPlan(f),plan);
});

for(const defect of ['changed_image_inventory','changed_identity','partial_provenance','provisional','adverse_review','historical_review','uuid_collision','missing_uuid_check','changed_dependency_bytes'])test(`additive repair blocks ${defect}`,()=>{
 const f=repairFixture();
 if(defect==='changed_image_inventory')f.fullPrintings=[];
 if(defect==='changed_identity')f.fullPrintings[0].printing_gv_id='different';
 if(defect==='partial_provenance')for(const row of [f.fullPrintings[0],f.snapshot.printings[0]])row.provenance_ref='old-proof';
 if(defect==='provisional')for(const row of [f.fullPrintings[0],f.snapshot.printings[0]])row.is_provisional=true;
 if(defect==='adverse_review')f.reviews=[{card_printing_id:childId,active:true,review_status:'conflicting',public_visibility:'visible'}];
 if(defect==='historical_review')f.reviews=[{card_printing_id:childId,active:false,review_status:'unsupported'}];
 if(defect==='uuid_collision')f.dependencyEvidence.proposed_uuid_collisions=[childId];
 if(defect==='missing_uuid_check')f.dependencyEvidence.checked_proposed_ids=[];
 if(defect==='changed_dependency_bytes')f.artifacts.set('dependencies',Buffer.from('changed'));
 f.snapshot=seal(f.snapshot);assert.throws(()=>buildMasterPrintingRepairPlan(f));
});

test('repaired-state replay proposes zero writes including raw evidence',()=>{
 const f=fixture();const inventory=Buffer.from('dependency inventory');f.artifacts.set('dependencies',inventory);
 const plan=buildMasterPrintingRepairPlan({...f,asOf:now,fullPrintings:f.snapshot.printings,
  reviews:f.snapshot.printings.map(p=>({card_printing_id:p.id,active:true,review_status:'verified',public_visibility:'visible'})),
  dependencyEvidence:{inventory_ref:'dependencies',inventory_sha256:digest(inventory),foreign_keys:[],protected_footprints:[],proposed_uuid_collisions:[],checked_proposed_ids:[]}});
 assert.equal(plan.status,'no_change');assert.equal(plan.raw_evidence_candidate,null);
 assert.ok(Object.values(plan.expected_mutation_counts).every(count=>count===0));
});
test('catalog worklist never confuses structural coverage or a legacy index with verified authority',()=>{
 const f=fixture(),row={id:setId,game:'pokemon',code:'mcd21',name:'McDonalds 2021',parents:1,no_children:0,public_missing_gvid:0,public_wrong_parent_gvid:0};
 const pending=buildCatalogPrintingWorklist([row]);assert.equal(pending.counts.authority_required,1);assert.equal(pending.rows[0].write_ready,false);
 const verified=buildCatalogPrintingWorklist([row],[f]);assert.equal(verified.rows[0].master_status,'verified_base_scope');assert.equal(verified.rows[0].database_reconciled,false);
 assert.throws(()=>buildCatalogPrintingWorklist([row,row]));
 assert.throws(()=>buildCatalogPrintingWorklist([{...row,game:'mtg'}],[f]));
});
test('default-public Pokemon uses left join; explicit hidden sets are not overridden',()=>{
 assert.match(SET_RELEASE_STATUS_SQL,/coalesce\(set_control.release_status/);
 assert.match(SET_RELEASE_STATUS_SQL,/lower\(target_set.game\) = 'pokemon' then 'public'/);
 const worker=fs.readFileSync('scripts/workers/cross_tcg_set_publication_gate_v1.mjs','utf8');
 assert.match(worker,/left join public.catalog_game_release_controls/);
 assert.doesNotMatch(worker,/and game_control.release_status in/);
});
test('ingestion requires master authority before preparing any collector plan',()=>{
 const code=fs.readFileSync('scripts/ingest/new_set_release_ingest_v1.mjs','utf8');
 assert.ok(code.indexOf('assertMasterPrintingAuthority(set.printing_manifest')<code.indexOf("'printing_admission_plans_v1.json'"));
});
test('offline reconciler writes evidence only and refuses to overwrite it',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'master-printing-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const f=fixture(),map=[];
 for(const [ref,bytes]of f.artifacts){fs.writeFileSync(path.join(root,ref),bytes);map.push({ref,path:ref});}
 for(const [name,value]of Object.entries({manifest:f.manifest,snapshot:f.snapshot,map}))fs.writeFileSync(path.join(root,name+'.json'),JSON.stringify(value));
 const args=['scripts/ingest/master_index_printing_reconcile_v1.mjs',`--manifest=${root}/manifest.json`,`--snapshot=${root}/snapshot.json`,`--artifact-map=${root}/map.json`,`--as-of=${now}`,`--out-dir=${root}/output`];
 const r=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 const result=JSON.parse(fs.readFileSync(path.join(root,'output/reconciliation.json')));assert.equal(result.write_ready,false);
 assert.equal(spawnSync(process.execPath,args,{encoding:'utf8'}).status,1);
});
