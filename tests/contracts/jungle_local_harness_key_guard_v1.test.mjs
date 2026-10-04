import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
test('legacy-key guard admits only exact qualified loopback harness bytes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jungle-key-guard-'));
 const guard='scripts/guard_no_legacy_keys.ps1';
 const text=fs.readFileSync(path.join(root,guard),'utf8');
 const files=[...text.matchAll(/'(scripts\/(?:schema|tests)\/[^']+\.mjs)' = '[a-f0-9]{64}'/g)].map(m=>m[1]);
 assert.equal(files.length,18);
 const write=(p,value)=>{fs.mkdirSync(path.dirname(path.join(dir,p)),{recursive:true});fs.writeFileSync(path.join(dir,p),value)};
 const run=()=>spawnSync('pwsh',['-NoProfile','-File',path.join(dir,guard)],{cwd:dir,encoding:'utf8',windowsHide:true,timeout:30000});
 const rejected=(result,pattern)=>{assert.equal(result.status,1,result.stdout+result.stderr);assert.match(result.stdout,pattern)};
 try{
  write(guard,text);for(const f of files)write(f,fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n'));
  execFileSync('git',['init','--quiet'],{cwd:dir,windowsHide:true});execFileSync('git',['-c','core.autocrlf=false','add','.'],{cwd:dir,windowsHide:true});
  let result=run();assert.equal(result.status,0,result.stdout+result.stderr);
  // Windows checkouts and Linux CI retain identical semantic source bytes.
  for(const f of files)write(f,fs.readFileSync(path.join(dir,f),'utf8').replace(/\n/g,'\r\n'));
  result=run();assert.equal(result.status,0,result.stdout+result.stderr);
  const fixture=files[0],original=fs.readFileSync(path.join(dir,fixture),'utf8');
  write(fixture,original+'\n// Changed fixture must require review.\n');rejected(run(),/qualified local harness changed/);write(fixture,original);
  const service=['SUPABASE','SERVICE','ROLE','KEY'].join('_');
  const thirdParty=['SERVICE','ROLE','KEY'].join('_');
  const anon=['SUPABASE','ANON','KEY'].join('_');
  const unreviewed='scripts/new-runtime.mjs';
  write(unreviewed,'process.env.'+service+';');execFileSync('git',['add',unreviewed],{cwd:dir,windowsHide:true});rejected(run(),/new-runtime/);
  write(unreviewed,'config.'+thirdParty+';');rejected(run(),/new-runtime/);
  write(unreviewed,anon+':anon,');rejected(run(),/new-runtime/);
  // Even an allowed token expression cannot be moved into a changed fixture.
  write(unreviewed,'');write(fixture,original+'\nprocess.env.'+service+';');rejected(run(),/qualified local harness changed/);
 }finally{
  assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
