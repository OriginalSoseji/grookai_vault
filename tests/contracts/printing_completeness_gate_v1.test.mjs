import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {assertPrintingManifest,printingManifestHash,evaluatePrintingReadback,assessLivePrintingCoverage,
  buildPrintingAdmissionPlan,PRINTING_COMPLETENESS_VERSION,PRINTING_COVERAGE_SQL} from '../../backend/catalog/printing_completeness_gate_v1.mjs';

function seal(m){delete m.fingerprint;return {...m,fingerprint:printingManifestHash(m)};}
function fixture(n=1){
 const parents=Array.from({length:n},(_,i)=>({id:`parent-${i}`,gv_id:`GV-PK-30C-${String(i+1).padStart(3,'0')}`,printed_coordinate:`${i+1}/128`,name:`Card ${i+1}`}));
 return seal({version:PRINTING_COMPLETENESS_VERSION,game:'pokemon',language:'en',set_code:'30c',scope:'base_release',
  identity_policy_version:'pokemon_printings_v1',master_index_ref:'reviewed-master-index',master_index_sha256:'a'.repeat(64),parents,
  printings:parents.map(p=>({card_print_id:p.id,finish_key:'holo',printing_gv_id:p.gv_id+'-HOLO',review_status:'verified',
    evidence:[{kind:'checked_checklist',source_ref:'source:card:'+p.id,sha256:'b'.repeat(64),card_print_id:p.id,finish_key:'holo'}]})),
  unresolved_variants:[],suppressed_printing_facts:[],expected:{parents:n,printings:n,finishes:{holo:n}}});
}
function readback(m){
 const printings=m.printings.map((p,i)=>({...p,id:`printing-${i}`,is_provisional:false,active:true,public_visibility:'visible',provenance_source:'checked',provenance_ref:'source:'+i}));
 return {parents:structuredClone(m.parents),printings,public_options:printings.map(p=>({...p,finish_is_active:true}))};
}

function donManifest() {
 const m=fixture();Object.assign(m,{game:'one_piece',language:'en',set_code:'DON',identity_policy_version:'ONE_PIECE_EN_V1'});
 Object.assign(m.parents[0],{printed_coordinate:null,coordinate_semantics:'unnumbered_don_identity_token',
  source_product_id:123,variant_key:'tcgplayer_product_123',identity_domain:'one_piece_eng_print'});
 Object.assign(m.printings[0].evidence[0],{kind:'exact_printing_mapping',source_product_id:123,source_identity_id:'identity',source_evidence_id:'proof'});
 return seal(m);
}
test('explicit product-bound DON identity allows null coordinate without fabricating a number',()=>{
 const m=donManifest();assertPrintingManifest(m);
 assert.equal(evaluatePrintingReadback(m,readback(m)).status,'printing_ready');
 assert.equal(m.parents[0].printed_coordinate,null);
});
for(const field of ['coordinate_semantics','source_product_id','variant_key','identity_domain'])test(`unnumbered DON requires ${field}`,()=>{
 const m=donManifest();delete m.parents[0][field];assert.throws(()=>assertPrintingManifest(seal(m)),/incomplete_parent_identity/);
});
test('DON allowance cannot admit an unnumbered Pokemon or unbound product',()=>{
 const m=donManifest();m.game='pokemon';assert.throws(()=>assertPrintingManifest(seal(m)),/incomplete_parent_identity/);
 const n=donManifest();n.printings[0].evidence[0].source_product_id=124;
 assert.throws(()=>assertPrintingManifest(seal(n)),/unnumbered_product_evidence_required/);
});

test('verified parent families admit only bound identities without claiming complete set coverage',()=>{
 const m=fixture(2);m.scope='verified_parent_families';const sealed=seal(m);
 assertPrintingManifest(sealed);assert.equal(buildPrintingAdmissionPlan(sealed).inserts.length,2);
 sealed.unresolved_variants=[{key:'uncertain',card_print_id:sealed.parents[0].id,source_ref:'source',reason:'finish unclear',status:'needs_review',scope:'outside_base_release'}];
 assert.throws(()=>assertPrintingManifest(seal(sealed)),/complete_set_has_unresolved_variants/);
});

for(const field of ['id','gv_id','name','printed_coordinate','set_id','identity_domain','variant_key','printed_identity_modifier']) {
 for(const defect of ['changed','missing'])test(`parent readback blocks ${defect} ${field}`,()=>{
  let m=fixture();Object.assign(m.parents[0],{set_id:'exact-set',identity_domain:'pokemon_eng_standard',variant_key:'',printed_identity_modifier:null});m=seal(m);
  const r=readback(m);
  if(defect==='missing')delete r.parents[0][field];else r.parents[0][field]='incorrect';
  const result=evaluatePrintingReadback(m,r);
  assert.equal(result.status,'blocked');assert.ok(result.issues.includes('parent_readback_mismatch'));
 });
}

test('parent readback compares every bound field but permits unrelated database metadata',()=>{
 let m=fixture();m.parents[0].language='en';m=seal(m);
 const r=readback(m);r.parents[0].updated_at='2026-09-17T00:00:00Z';
 assert.equal(evaluatePrintingReadback(m,r).status,'printing_ready');
 r.parents[0].language='ja';assert.equal(evaluatePrintingReadback(m,r).status,'blocked');
});

test('ingestion reads complete parent identity and aliases the exact printed number',()=>{
 const code=fs.readFileSync('scripts/ingest/new_set_release_ingest_v1.mjs','utf8');
 assert.match(code,/select p\.\*,p\.number::text as printed_coordinate from public\.card_prints p where p\.set_id=\$1/);
 assert.doesNotMatch(code,/select id,gv_id from public\.card_prints where set_id=\$1/);
});

test('publication issue updates and resolution run independently of failed discovery',()=>{
 const workflow=fs.readFileSync('.github/workflows/catalog-incremental-promotion.yml','utf8');
 for(const [name,outcome] of [['Open or update set publication gate issue','failure'],['Close resolved set publication gate issue','success']]) {
  const step=workflow.split(`- name: ${name}\n`)[1]?.split('\n      - name:')[0];
  assert.ok(step,`missing ${name}`);
  assert.match(step,new RegExp(`if: \\$\\{\\{ always\\(\\) && !cancelled\\(\\) && steps\\.set_publication_gate\\.outcome == '${outcome}' \\}\\}`));
 }
});
test('161 single-finish parents require 161 Holo children, never implicit defaults',()=>{
 const m=fixture(161);assertPrintingManifest(m);
 const r=evaluatePrintingReadback(m,readback(m));assert.equal(r.status,'printing_ready');assert.equal(r.collector_ready,false);
 const delta=buildPrintingAdmissionPlan(m);assert.equal(delta.inserts.length,161);assert.ok(delta.inserts.every(p=>p.finish_key==='holo'));
});
test('same manifest plans deterministic IDs; existing IDs are preserved',()=>{
 const m=fixture(),a=buildPrintingAdmissionPlan(m);assert.deepEqual(a,buildPrintingAdmissionPlan(m));
 const b=buildPrintingAdmissionPlan(m,a.inserts);assert.equal(b.inserts.length,0);assert.equal(b.retained[0].id,a.inserts[0].id);
 assert.equal(b.boundaries.database_writes,0);
});

test('offline CLI freezes a plan, preserves its inputs, and blocks failed readback', t => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'printing-gate-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const manifest=fixture(2), input=path.join(dir,'manifest.json'), snapshot=path.join(dir,'readback.json');
 fs.writeFileSync(input,JSON.stringify(manifest));
 fs.writeFileSync(snapshot,JSON.stringify(readback(manifest)));
 const original=fs.readFileSync(input,'utf8');
 const run=(out,extra=[])=>spawnSync(process.execPath,['scripts/ingest/printing_admission_plan_v1.mjs',
   `--manifest=${input}`,`--out-dir=${path.join(dir,out)}`,...extra],{encoding:'utf8'});
 const planned=run('plan');assert.equal(planned.status,0,planned.stderr);
 const saved=JSON.parse(fs.readFileSync(path.join(dir,'plan','printing_plan.json')));
 assert.equal(saved.inserts.length,2);assert.equal(saved.boundaries.database_writes,0);
 const repeated=run('plan');assert.equal(repeated.status,1);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'plan','printing_plan.json'))),saved);
 const good=run('good',[`--readback=${snapshot}`]);assert.equal(good.status,0,good.stderr);
 fs.writeFileSync(snapshot,JSON.stringify({parents:manifest.parents,printings:[],public_options:[]}));
 const bad=run('bad',[`--readback=${snapshot}`]);assert.equal(bad.status,2,bad.stderr);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'bad','readiness.json'))).status,'blocked');
 assert.equal(fs.readFileSync(input,'utf8'),original);
});

test('plan cannot replace an existing printing GV-ID or reuse a colliding identity',()=>{
 const m=fixture(), planned=buildPrintingAdmissionPlan(m).inserts[0];
 assert.throws(()=>buildPrintingAdmissionPlan(m,[{...planned,printing_gv_id:'other'}]),/gvid_conflict/);
 assert.throws(()=>buildPrintingAdmissionPlan(m,[planned,planned]),/duplicate_existing/);
 assert.throws(()=>buildPrintingAdmissionPlan(m,[{...planned,card_print_id:'different'}]),/gvid_collision/);
 assert.throws(()=>buildPrintingAdmissionPlan(m,[{...planned,card_print_id:'different',printing_gv_id:'other'}]),/id_collision/);
});
for(const kind of ['missing_child','price_only','missing_evidence','wrong_finish_evidence','wrong_parent_evidence','missing_gvid','wrong_gvid','duplicate_child','duplicate_gvid','wrong_counts','untracked_lead','in_scope_lead','suppressed','tamper'])test(`manifest rejects ${kind}`,()=>{
 let m=fixture(2);
 if(kind==='missing_child')m.printings.pop();
 if(kind==='price_only')m.printings[0].evidence[0].kind='price_bucket';
 if(kind==='missing_evidence')m.printings[0].evidence=[];
 if(kind==='wrong_finish_evidence')m.printings[0].evidence[0].finish_key='normal';
 if(kind==='wrong_parent_evidence')m.printings[0].evidence[0].card_print_id='other';
 if(kind==='missing_gvid')delete m.printings[0].printing_gv_id;
 if(kind==='wrong_gvid')m.printings[0].printing_gv_id='GV-PK-OTHER-HOLO';
 if(kind==='duplicate_child')m.printings.push(m.printings[0]);
 if(kind==='duplicate_gvid')m.printings[1].printing_gv_id=m.printings[0].printing_gv_id;
 if(kind==='wrong_counts')m.expected.finishes.holo=9;
 if(kind==='untracked_lead')m.unresolved_variants=[{key:'eevee'}];
 if(kind==='in_scope_lead')m.unresolved_variants=[{key:'base',card_print_id:'parent-0',source_ref:'source',reason:'unresolved',status:'needs_review',scope:'base_release'}];
 if(kind==='suppressed')m.suppressed_printing_facts=[m.printings[0]];
 if(kind==='tamper')m.language='ja';else m=seal(m);
 assert.throws(()=>assertPrintingManifest(m));
});
test('outside-base product variants stay tracked and do not block verified base Holo',()=>{
 let m=fixture();m.unresolved_variants=[{key:'eevee-cosmos',card_print_id:'parent-0',source_ref:'source:eevee',reason:'product treatment not reviewed',scope:'outside_base_release',status:'needs_review'}];
 m=seal(m);assert.equal(evaluatePrintingReadback(m,readback(m)).status,'printing_ready');
 assert.equal(buildPrintingAdmissionPlan(m).unresolved_variants.length,1);
 m.scope='complete_set';assert.throws(()=>assertPrintingManifest(seal(m)));
});
test('language and set binding cannot cross canonical scope',()=>{
 const m=fixture();assert.throws(()=>assertPrintingManifest(m,{game:'pokemon',language:'ja',set_code:'30c'}));
 assert.throws(()=>assertPrintingManifest(m,{game:'pokemon',language:'en',set_code:'30c-classic'}));
});
for(const kind of ['no_children','no_options','wrong_gvid','wrong_public_parent','hidden','provisional','unproven','duplicate_options','extra_printing'])test(`readback blocks ${kind}`,()=>{
 const m=fixture(),r=readback(m);
 if(kind==='no_children')r.printings=[];
 if(kind==='no_options')r.public_options=[];
 if(kind==='wrong_gvid')r.printings[0].printing_gv_id+='-BAD';
 if(kind==='wrong_public_parent')r.public_options[0].card_print_id='other';
 if(kind==='hidden')r.printings[0].public_visibility='hidden_pending_review';
 if(kind==='provisional')r.printings[0].is_provisional=true;
 if(kind==='unproven')r.printings[0].provenance_ref=null;
 if(kind==='duplicate_options')r.public_options.push(r.public_options[0]);
 if(kind==='extra_printing')r.printings.push({...r.printings[0],finish_key:'normal'});
 assert.equal(evaluatePrintingReadback(m,r).status,'blocked');
});
test('missing prices do not invalidate a verified printing',()=>{
 const m=fixture(),r=readback(m);r.printings[0].market_price=null;assert.equal(evaluatePrintingReadback(m,r).status,'printing_ready');
});
test('coverage requires explicit counts, not absent-as-zero or price inference',()=>{
 assert.deepEqual(assessLivePrintingCoverage(null,161),['printing_coverage_not_checked']);
 const c={parents_checked:161,parents_without_printing:161,missing_printing_gvid:0,wrong_parent_gvid:0,provisional_printings:0,unproven_printings:0};
 assert.match(assessLivePrintingCoverage(c,161)[0],/parents_without_printing:161/);
 assert.deepEqual(assessLivePrintingCoverage({...c,parents_without_printing:0},161),[]);
 assert.deepEqual(assessLivePrintingCoverage({...c,parents_checked:160},161),['printing_coverage_readback_mismatch']);
 assert.doesNotMatch(PRINTING_COVERAGE_SQL,/\b(insert|update|delete|truncate)\b/i);
});
test('ingestion validates scope before writes and never calls parent import complete',()=>{
 const s=fs.readFileSync('scripts/ingest/new_set_release_ingest_v1.mjs','utf8');
 assert.ok(s.indexOf('assertPrintingManifest(set.printing_manifest')<s.indexOf('const validationFindings'));
 assert.match(s,/evaluatePrintingReadback\(set.printing_manifest/);
 assert.ok(s.indexOf('bounded_printing_admission_required')<s.indexOf('const acquisitions = new Map()'));
 assert.match(s,/identity_only_printings_pending/);
 assert.match(s,/printing_ready_pending_collector_smoke/);
 assert.doesNotMatch(s,/report\.status\s*=.*'complete'/);
});
