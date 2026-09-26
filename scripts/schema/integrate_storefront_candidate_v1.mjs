// Three-way import into the isolated production branch; source checkout is read-only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {root,hash} from './storefront_production_lab_v1.mjs';
const source='C:/gv_store_billing_20260919';
const base='a98dd26f79967a741632c7efa3086d85cccacb87';
const git=(cwd,args)=>execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});
assert.equal(git(root,['rev-parse','HEAD']).trim(),'4c1fb7858146f2100e4b5d0de9c94716d0335409');
const out=path.join(root,'.local/integration/source-import-v1');assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const frozen=JSON.parse(fs.readFileSync(path.join(source,'.local/integration/vendor-scan-hosted-v31-features/package.json')));
for(const f of frozen.files)assert.equal(hash(fs.readFileSync(path.join(frozen.dest,f.path))),f.sha256,`Frozen payload changed: ${f.path}`);
const scope=['apps/web','tests/contracts'];
const basePaths=new Set(git(source,['ls-tree','-r','--name-only',base]).trim().split('\n'));
const paths=[...new Set([...git(source,['diff','--name-only',base,'--',...scope]).trim().split('\n'),...git(source,['ls-files','--others','--exclude-standard','--',...scope]).trim().split('\n')].filter(Boolean))].sort();
const receipt={at:new Date().toISOString(),base,main:git(root,['rev-parse','HEAD']).trim(),sourceHead:git(source,['rev-parse','HEAD']).trim(),frozenFilesVerified:frozen.files.length,files:[],conflicts:[]};
for(const name of paths){
  assert.ok(!name.includes('..'));assert.ok(!/\.env|node_modules|\.next\//.test(name));
  // The release config and pilot routing need a separate production review.
  const candidatePath=path.join(source,name),target=path.join(root,name);
  const ancestor=basePaths.has(name)?git(source,['show',`${base}:${name}`]):null;
  const candidate=fs.existsSync(candidatePath)?fs.readFileSync(candidatePath):null;
  const current=fs.existsSync(target)?fs.readFileSync(target):null;
  const normalize=b=>b?.toString().replaceAll('\r\n','\n');
  if(normalize(candidate)===normalize(ancestor))continue;
  const entry={path:name,sourceSha256:candidate&&hash(candidate),mainSha256:current&&hash(current)};
  if(normalize(candidate)===normalize(current)){entry.action='already-present';}
  else if(normalize(current)===normalize(ancestor)){
    if(candidate){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,candidate);entry.action='imported';}
    else {fs.unlinkSync(target);entry.action='deleted-by-candidate';}
  }else if(candidate&&current&&ancestor!==null){
    const scratch=path.join(out,String(receipt.files.length));fs.mkdirSync(scratch);
    for(const [key,value] of Object.entries({current,base:ancestor,candidate}))fs.writeFileSync(path.join(scratch,key),value);
    const merged=spawnSync('git',['merge-file','-p','--diff3','-L','current-main','-L','common-base','-L','storefront-candidate',path.join(scratch,'current'),path.join(scratch,'base'),path.join(scratch,'candidate')],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
    assert.ok(merged.status===0||merged.status===1,`merge-file failed: ${name}`);
    fs.writeFileSync(target,merged.stdout);entry.action=merged.status===0?'three-way-merged':'conflict';
    if(merged.status!==0)receipt.conflicts.push(name);
  }else {entry.action='structural-conflict';receipt.conflicts.push(name);}
  receipt.files.push(entry);
}
fs.writeFileSync(path.join(root,'docs/audits/storefront_production_20260926/source-import.json'),JSON.stringify(receipt,null,2));
console.log(JSON.stringify({files:receipt.files.length,actions:receipt.files.reduce((acc,f)=>(acc[f.action]=(acc[f.action]??0)+1,acc),{}),conflicts:receipt.conflicts}));
