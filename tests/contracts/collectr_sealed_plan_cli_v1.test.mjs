import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../../scripts/audits/collectr_sealed_identity_plan_v1.mjs',import.meta.url));
const root=fileURLToPath(new URL('../..',import.meta.url));
const row={'Product Name':'Example card','Set':'Example','Card Number':'1'};
const source='Product Name,Set,Card Number\nExample card,Example,1\n';
const preview=()=>({sourceRows:1,reviewRows:1,rows:[{sourceIndices:[0],sourceRecords:[{...row}],selection:null}]});
function fixture(t,modify=()=>{}) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'collectr-sealed-plan-test-'));
  t.after(()=>{
    const resolved=path.resolve(dir),parent=path.resolve(os.tmpdir());
    assert.equal(path.dirname(resolved),parent);
    assert.ok(path.basename(resolved).startsWith('collectr-sealed-plan-test-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  });
  const p=preview();modify(p);
  fs.writeFileSync(path.join(dir,'source.csv'),source);
  fs.writeFileSync(path.join(dir,'catalog.json'),JSON.stringify({releases:[],variants:[]}));
  fs.writeFileSync(path.join(dir,'preview.json'),JSON.stringify(p));
  const args=['--source-csv',path.join(dir,'source.csv'),'--catalog-json',path.join(dir,'catalog.json'),'--review-preview',path.join(dir,'preview.json'),'--out-dir',path.join(dir,'output')];
  return {dir,args,run:()=>spawnSync(process.execPath,['--experimental-strip-types',script,...args],{encoding:'utf8',windowsHide:true})};
}
test('offline CLI retains complete unresolved source and emits an explicitly unsaveable plan',t=>{
  const f=fixture(t), r=f.run();assert.equal(r.status,0,r.stderr);
  const summary=JSON.parse(r.stdout),plan=JSON.parse(fs.readFileSync(path.join(f.dir,'output','plan.private.json')));
  assert.equal(summary.productionWrites,0);assert.equal(summary.saveEligibleCopies,0);
  assert.match(summary.sourceSha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(plan.rows[0].source,row);assert.equal(plan.rows[0].status,'card_path');
  const bytes=fs.readFileSync(path.join(f.dir,'output','summary.json'));
  assert.notEqual(f.run().status,0);assert.deepEqual(fs.readFileSync(path.join(f.dir,'output','summary.json')),bytes);
});
for(const [name,modify] of [
  ['changed original',p=>{p.rows[0].sourceRecords[0].Set='Another';}],
  ['omitted source fields',p=>{delete p.rows[0].sourceRecords[0].Set;}],
  ['missing source row',p=>{p.rows=[];p.reviewRows=0;}],
  ['duplicate source index',p=>{p.rows.push(structuredClone(p.rows[0]));p.reviewRows=2;}],
  ['wrong review count',p=>{p.reviewRows=0;}],
  ['out of range index',p=>{p.rows[0].sourceIndices=[1];}],
  ['mismatched source count',p=>{p.sourceRows=2;}],
])test(`CLI refuses ${name} without writing a plan`,t=>{
  const f=fixture(t,modify);assert.notEqual(f.run().status,0);
  assert.equal(fs.existsSync(path.join(f.dir,'output','plan.private.json')),false);
});
test('private evidence cannot be written into the public worktree',t=>{
  const f=fixture(t);f.args[f.args.length-1]=root;
  assert.notEqual(f.run().status,0);assert.equal(fs.existsSync(path.join(root,'plan.private.json')),false);
});
