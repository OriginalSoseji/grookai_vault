import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTIFACTS } from '../../backend/catalog/pokemon_classic_master_staging_v1.mjs';
import { DECKS } from '../../backend/catalog/pokemon_world2010_relationship_review_v1.mjs';
import { prepareWorld2010Integration, reconcileWorld2010Integration, applyWorld2010Integration, safeMasterPath } from '../../backend/catalog/pokemon_world2010_master_integration_v1.mjs';
const state=process.env.CLASSIC_PROOF_INPUT_ROOT;
const read=f=>JSON.parse(fs.readFileSync(f));
const save=(f,v)=>fs.writeFileSync(f,JSON.stringify(v)+'\n');
function lab(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'world-master-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const active=path.join(dir,'active'),out=path.join(dir,'journal');fs.mkdirSync(active);
  const baseline={index:{language:'en',audit_only:true,preparation:{preserved:'classic'},summary:{sets:1,evidence_rows:2,source_overlap:[{source_key:'tcgcsv',evidence_rows:2}],cards_by_status:{},source_availability_by_status:{}}},
    cardsArtifact:{cards:[]},setsArtifact:{sets:[{key:'unrelated',set_name:'Unrelated'}]},printingsArtifact:{printings:[]},
    availabilityArtifact:{source_availability:[]},manualReviewArtifact:{manual_review:[]},conflictsArtifact:{conflicts:[]},finishBlockerClosure:{},suppressed:{unchanged:true}};
  for(const[k,f]of Object.entries(ARTIFACTS))save(path.join(active,f),baseline[k]);
  fs.writeFileSync(path.join(active,'unrelated.bin'),'untouched');
  const originals=new Map(DECKS.map((d,i)=>[d.code,fileURLToPath(new URL('../../docs/audits/image_truth_v1/cache_wh18a_world_championship_sources_v1/'+['a68083defbd62001e17b4f60.txt','de97c9c06a995c647c679837.txt','ffedc48138afc4348196f2a7.txt','3f076026c787eb5af1c8e0f7.txt'][i],import.meta.url))]));
  // The independent operator snapshot is optional in portable CI; no fake
  // production provenance or fixture review is substituted when it is absent.
  const options={active,out,originals,snapshotFile:path.join(state,'world2010-live-existing-identity-v7/snapshot.json'),
    receiptFile:path.join(state,'world2010-live-existing-identity-v7/complete.json'),reviewFile:path.join(state,'world2010-relationship-review-v1/review.json')};
  return{...options,dir,baseline};
}
test('whole92 integration preserves all prior facts, summaries, sources and17 holds',{skip:!state},t=>{
  const f=lab(t),p=prepareWorld2010Integration(f);assert.equal(p.writes.length,10);
  assert.equal(reconcileWorld2010Integration(f).status,'all_before');
  const result=applyWorld2010Integration(f);assert.equal(result.status,'all_after');assert.equal(result.cards,92);assert.equal(result.sets,5);
  const index=read(path.join(f.active,ARTIFACTS.index));assert.equal(index.summary.evidence_rows,186);
  assert.deepEqual(index.preparation,f.baseline.index.preparation);assert.equal(index.summary.source_overlap.find(r=>r.source_key==='tcgcsv').evidence_rows,94);
  assert.equal(read(path.join(f.active,ARTIFACTS.availabilityArtifact)).source_availability.length,8);
  assert.equal(fs.readFileSync(path.join(f.active,'unrelated.bin'),'utf8'),'untouched');
  assert.throws(()=>applyWorld2010Integration(f),/already_complete/);
  assert.throws(()=>prepareWorld2010Integration({...f,out:path.join(f.dir,'duplicate')}),/already_present/);
});
test('torn source integration requires exact independent recovery and then completes',{skip:!state},t=>{
  const f=lab(t),p=prepareWorld2010Integration(f);
  const first=p.writes[0];fs.copyFileSync(path.join(f.out,'after',first.file),path.join(f.active,first.file));
  assert.throws(()=>applyWorld2010Integration(f),/independent_recovery_readback_required/);
  const r=reconcileWorld2010Integration(f);assert.equal(r.status,'mixed_known');const file=path.join(f.dir,'readback.json');save(file,r);
  assert.equal(applyWorld2010Integration({...f,recoveryReceipt:file}).status,'all_after');
});
test('lost completion acknowledgement reconciles all-after without another source write',{skip:!state},t=>{
  const f=lab(t),p=prepareWorld2010Integration(f);
  for(const row of p.writes){const file=path.join(f.active,row.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join(f.out,'after',row.file),file);}
  const r=reconcileWorld2010Integration(f),file=path.join(f.dir,'readback.json');save(file,r);assert.equal(r.status,'all_after');
  const before=p.writes.map(row=>fs.statSync(path.join(f.active,row.file)).mtimeMs);
  applyWorld2010Integration({...f,recoveryReceipt:file});assert.deepEqual(p.writes.map(row=>fs.statSync(path.join(f.active,row.file)).mtimeMs),before);
});
for(const[name,change,pattern]of[
  ['unknown active bytes',f=>fs.appendFileSync(path.join(f.active,ARTIFACTS.cardsArtifact),'x'),/unknown_source_bytes/],
  ['protected file change',f=>fs.appendFileSync(path.join(f.active,'unrelated.bin'),'x'),/protected_master_bytes_changed/],
  ['frozen after bytes change',f=>fs.appendFileSync(path.join(f.out,'after',ARTIFACTS.index),'x'),/frozen_after_changed/],
  ['backup bytes change',f=>fs.appendFileSync(path.join(f.out,'baseline',ARTIFACTS.index),'x'),/baseline_backup_changed/],
  ['new unaccounted file',f=>fs.writeFileSync(path.join(f.active,'surprise'),'x'),/unexpected_master_file/],
  ['rewritten write targets',f=>{const p=read(path.join(f.out,'pending.json'));p.writes[0].file='../escaped';save(path.join(f.out,'pending.json'),p);},/journal_source_replay_mismatch/],
])test(name+' refuses recovery',{skip:!state},t=>{const f=lab(t);prepareWorld2010Integration(f);change(f);assert.throws(()=>reconcileWorld2010Integration(f),pattern);assert.equal(fs.existsSync(path.join(f.out,'complete.json')),false);});
test('concurrent integration lock refuses a second executor',{skip:!state},t=>{const f=lab(t);prepareWorld2010Integration(f);fs.writeFileSync(path.join(f.active,'.world2010-master-integration.lock'),'held');assert.throws(()=>applyWorld2010Integration(f),/EEXIST/);});
test('changed bound input refuses writes and retains the prepared journal',{skip:!state},t=>{
  const f=lab(t),file=path.join(f.dir,'receipt.json');fs.copyFileSync(f.receiptFile,file);f.receiptFile=file;
  prepareWorld2010Integration(f);fs.appendFileSync(file,' ');
  assert.throws(()=>applyWorld2010Integration(f),/bound_input_changed/);
  assert.deepEqual(read(path.join(f.active,ARTIFACTS.index)),f.baseline.index);
  assert.equal(fs.existsSync(path.join(f.out,'pending.json')),true);
});
test('stale independent recovery cannot authorize a different mixed state',{skip:!state},t=>{
  const f=lab(t),p=prepareWorld2010Integration(f);
  fs.copyFileSync(path.join(f.out,'after',p.writes[0].file),path.join(f.active,p.writes[0].file));
  const file=path.join(f.dir,'readback.json');save(file,reconcileWorld2010Integration(f));
  fs.copyFileSync(path.join(f.out,'after',p.writes[1].file),path.join(f.active,p.writes[1].file));
  assert.throws(()=>applyWorld2010Integration({...f,recoveryReceipt:file}),/fresh_exact_recovery_readback_required/);
});
test('path traversal and symlinks are rejected',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'world-path-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  assert.throws(()=>safeMasterPath(dir,'../escape'),/relative_path/);
  fs.mkdirSync(path.join(dir,'real'));fs.symlinkSync(path.join(dir,'real'),path.join(dir,'linked'),process.platform==='win32'?'junction':'dir');
  assert.throws(()=>safeMasterPath(dir,'linked/new.json'),/symlink/);
});
