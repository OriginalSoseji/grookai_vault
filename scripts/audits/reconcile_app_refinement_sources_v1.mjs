// Reconcile preserved client work against current main without merging the stale branch.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
const root='C:/gv_app_integration_20261028';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const original='C:/grookai_vault';
const privateRoot='C:/gv_intake_recovery_private_20261027/app-source-preservation-20261028';
const output=privateRoot+'/client-reconciliation-v2';
assert.equal(fs.existsSync(output),false,'Never overwrite a reconciliation review');
assert.equal(execFileSync('git',['status','--porcelain','--','lib','apps/web/src'],{encoding:'utf8'}).trim(),'M apps/web/src/app/globals.css');
const ledger=JSON.parse(fs.readFileSync(privateRoot+'/source-reconciliation-ledger-v2.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=id=>execFileSync('git',['cat-file','blob',id],{maxBuffer:32_000_000});
const text=b=>b.toString('utf8').replaceAll('\r\n','\n');
fs.mkdirSync(output);
const rows=[];
for(const row of ledger.rows.filter(r=>r.path.startsWith('lib/')||r.path.startsWith('apps/web/src/'))){
  const sourcePath=path.join(original,row.path),targetPath=path.join(root,row.path);
  const source=fs.existsSync(sourcePath)?fs.readFileSync(sourcePath):null;
  if(source)assert.equal(sha(source),row.workingRawSha256,row.path+' original changed since preservation');
  if(row.action==='already_current_main'){rows.push({path:row.path,result:'already_present'});continue;}
  // rev-parse may echo a missing revision:path before failing; only OIDs are blobs.
  const mainBlob=/^[a-f0-9]{40}$/.test(row.mainBlob??'')?row.mainBlob:null;
  const ancestorBlob=/^[a-f0-9]{40}$/.test(row.ancestorBlob??'')?row.ancestorBlob:null;
  const actual=fs.existsSync(targetPath)?fs.readFileSync(targetPath):null;
  const current=mainBlob?blob(mainBlob):null;
  let merged=source,result='unique_client_change';
  if(row.action==='semantic_reconciliation_required'&&(current||ancestorBlob)){
    if(!source||!current||!ancestorBlob){rows.push({path:row.path,result:'manual_presence_review'});continue;}
    const folder=path.join(output,String(rows.length));fs.mkdirSync(folder);
    for(const [name,bytes] of [['current',current],['ancestor',blob(ancestorBlob)],['preserved',source]])fs.writeFileSync(path.join(folder,name),text(bytes));
    const merge=spawnSync('git',['merge-file','-p','--diff3',path.join(folder,'current'),path.join(folder,'ancestor'),path.join(folder,'preserved')],{encoding:'utf8',maxBuffer:32_000_000});
    assert.ifError(merge.error);assert.ok(merge.status>=0&&merge.status<128,merge.stderr);
    fs.writeFileSync(path.join(folder,'review'),merge.stdout);
    if(merge.status!==0){rows.push({path:row.path,result:'manual_conflict_review',conflicts:merge.status,review:folder});continue;}
    merged=Buffer.from(merge.stdout);result='three_way_merged_requires_review';
  }
  if(!merged){rows.push({path:row.path,result:'manual_delete_review'});continue;}
  assert.ok((actual===null&&current===null)||(actual&&current&&text(actual)===text(current))||(actual&&text(actual)===text(merged)),row.path+' unreviewed target changes');
  fs.mkdirSync(path.dirname(targetPath),{recursive:true});fs.writeFileSync(targetPath,merged);
  rows.push({path:row.path,result,sha256:sha(merged)});
}
const report={at:new Date().toISOString(),sourceHead:ledger.sourceHead,base:ledger.mergeBase,target:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),originalUnchanged:true,rows};
fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.reduce((a,r)=>(a[r.result]=(a[r.result]??0)+1,a),{})));
