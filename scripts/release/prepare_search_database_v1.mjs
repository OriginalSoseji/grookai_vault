// Fixed production inspection package. Intentionally has no apply operation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

assert.equal(process.argv.length,3,'Use prepare or dry-run only');
const mode=process.argv[2];assert.ok(['prepare','dry-run'].includes(mode),'No apply operation');
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_search_database_20261001');
const out='C:/grookai_vault_operator_artifacts/search_database_20261001';
const dir=out+'/cli-package',target='ycdxbpibncqcchqiihfz';
const names=['20261001150000_search_database_latency_v1.sql'];

const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const hashes=d=>Object.fromEntries(fs.readdirSync(d).filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(path.join(d,n)))]));
const gate=read(out+'/Release-'+(mode==='prepare'?'AuditLinkedSchema':'PrePush')+'.json');

assert.equal(gate.status,'passed');assert.equal(gate.target,target);assert.equal(gate.applyAuthority,false);
const age=Date.now()-Date.parse(gate.at);assert.ok(age>=0&&age<3600000,'Fresh gate required');
assert.deepEqual(gate.pending,names.map(n=>n.split('_')[0]));
assert.equal(git('branch','--show-current'),'fix/search-database-latency-20261001');
assert.equal(git('write-tree'),gate.sourceTree);assert.equal(git('diff','--name-only'),'');
assert.deepEqual(hashes(root+'supabase/migrations'),gate.sourceHashes);
assert.equal(Object.keys(gate.sourceHashes).length,412);
for(const [p,h]of Object.entries(gate.toolHashes))assert.equal(hash(fs.readFileSync(root+p)),h,p);

assert.deepEqual(read(gate.baseline+'/receipt.json'),gate);
if(mode==='prepare')assert.ok(!fs.existsSync(dir),'Preparation intent consumed; preserve package');
else{
  assert.equal(git('status','--porcelain'),'','Committed clean source required');
  assert.equal(git('rev-parse','HEAD^{tree}'),gate.sourceTree);
  assert.equal(fs.readFileSync(dir+'/supabase/.temp/project-ref','utf8').trim(),target);
  const prepared=read(dir+'/prepare-intent.json');assert.equal(prepared.target,target);assert.deepEqual(prepared.sourceHashes,gate.sourceHashes);
  assert.deepEqual(hashes(dir+'/supabase/migrations'),gate.sourceHashes);
  assert.equal(hash(fs.readFileSync(dir+'/supabase/config.toml')),prepared.configSha256);
}
// Only after local validation: retrieve the existing credential, never print it.
const token=execFileSync('pwsh',['-NoProfile','-File','C:/gv_store_billing_20260919/scripts/preview/collector_management_credential.ps1'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();assert.match(token,/^sbp_/);
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const r=await fetch(`https://api.supabase.com/v1/projects/${target}`,{headers,signal:AbortSignal.timeout(30000)});assert.ok(r.ok);assert.equal((await r.json()).id,target);
const {snapshotSql,compareSnapshots}=await import('../schema/vendor_billing_schema_v1.mjs');
assert.match(snapshotSql,/begin\b[^;]*\bread only;/i);
const snapshot=async()=>{
  const response=await fetch(`https://api.supabase.com/v1/projects/${target}/database/query`,{method:'POST',headers,body:JSON.stringify({query:snapshotSql}),signal:AbortSignal.timeout(180000)});
  assert.ok(response.ok,`Read-only snapshot HTTP ${response.status}`);
  const value=(await response.json())[0].receipt;assert.equal(value.read_only,'on');
  assert.deepEqual(value.LEDGER.map(v=>v.version),Object.keys(gate.sourceHashes).filter(n=>!names.includes(n)).map(n=>n.split('_')[0]).sort());
  return value;
};
const save=(base,name,value)=>fs.writeFileSync(base+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const cli=(args,name,base)=>{
  const env={};for(const k of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'])if(process.env[k])env[k]=process.env[k];
  Object.assign(env,{SUPABASE_ACCESS_TOKEN:token,DO_NOT_TRACK:'1',PGOPTIONS:'-c default_transaction_read_only=on -c lock_timeout=5s -c statement_timeout=120s'});
  const result=spawnSync('supabase',[...args,'--workdir',dir],{cwd:dir,env,windowsHide:true,encoding:'utf8',timeout:240000,maxBuffer:16*1024*1024});
  const log=(result.stdout??'')+(result.stderr??'');fs.writeFileSync(base+'/'+name+'.private.log',log,{flag:'wx'});
  assert.equal(result.status,0,`Inspect private ${name} log; no production apply available`);return log;
};
if(mode==='prepare'){
  fs.mkdirSync(dir+'/supabase/migrations',{recursive:true});
  const config='project_id = "grookai-search-inspection-20261001"\n[db]\nmajor_version = 17\n';
  save(dir,'prepare-intent.json',{at:new Date().toISOString(),target,sourceHashes:gate.sourceHashes,configSha256:hash(config),gateSha256:hash(JSON.stringify(gate)),applyAuthority:false});
  for(const name of Object.keys(gate.sourceHashes))fs.copyFileSync(root+'supabase/migrations/'+name,dir+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(dir+'/supabase/config.toml',config,{flag:'wx'});
  cli(['link','--project-ref',target,'--yes'],'link',dir);
  assert.equal(fs.readFileSync(dir+'/supabase/.temp/project-ref','utf8').trim(),target);
  save(dir,'prepared.json',{at:new Date().toISOString(),status:'passed',target,applyAuthority:false});
  console.log(JSON.stringify({status:'prepared',target,applyAuthority:false}));
}else{
  const evidence=out+'/dry-run-'+Date.now();fs.mkdirSync(evidence);
  const before=await snapshot();save(evidence,'before.private.json',before);
  await compareSnapshots(before,read(gate.baseline+'/remote.private.json'),{output:evidence+'/before'});
  const log=cli(['db','push','--linked','--dry-run','--yes'],'dry-run',evidence);
  const pending=[...new Set(log.match(/\d{14}_[a-z0-9_]+\.sql/g)??[])];assert.deepEqual(pending,names,'Unexpected CLI pending migrations');
  const after=await snapshot();save(evidence,'after.private.json',after);
  assert.deepEqual(after.LEDGER,before.LEDGER);await compareSnapshots(after,before,{output:evidence+'/after'});
  const result={at:new Date().toISOString(),status:'passed',target,pending,commit:git('rev-parse','HEAD'),sourceTree:gate.sourceTree,gateSha256:hash(JSON.stringify(gate)),logSha256:hash(log),evidence,productionMigrationsUnchanged:true,productionWrites:0,applyAuthority:false};
  save(evidence,'receipt.json',result);fs.writeFileSync(out+'/dry-run-latest.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
