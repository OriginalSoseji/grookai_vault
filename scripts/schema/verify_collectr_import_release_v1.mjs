// Fixed read-only release qualification. No reset, migration or deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

assert.equal(process.argv.length,3,'Use AuditLinkedSchema or PrePush only');
const phase=process.argv[2];assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_collectr_import_20260930');
const proof='C:/grookai_vault_operator_artifacts/collectr_iphone_import_20260929';
const out='C:/grookai_vault_operator_artifacts/collectr_import_predeploy_20260930';
const target='ycdxbpibncqcchqiihfz',pending=['20260930010000'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const sources=Object.fromEntries(fs.readdirSync(root+'supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'supabase/migrations/'+n))]));
assert.equal(Object.keys(sources).length,410);
assert.equal(git('branch','--show-current'),'fix/collectr-import-fidelity-20260930');
assert.equal(fs.readFileSync(root+'supabase/.temp/project-ref','utf8').trim(),target);
const full=read(proof+'/full-410/replay-result.json');
assert.equal(full.status,'passed');assert.equal(full.fullReplay,true);assert.equal(full.noOpPush,true);assert.equal(full.retainedFixtureResets,0);
const upgrade=read(proof+'/upgrade-410/upgrade-result.json');
assert.equal(upgrade.status,'passed');assert.equal(upgrade.allFixtureRowsUnchanged,true);assert.equal(upgrade.resetsAfterPopulation,0);assert.equal(upgrade.comparison.rawBytes,0);
const http=proof+'/http-v2-1790742513019';
assert.equal(read(http+'/result.json').status,'passed');assert.equal(read(http+'/result.json').priorRowsUnchanged,true);
for(const [p,h]of Object.entries(read(http+'/intent.json').sourceHashes)){
  const bytes=fs.readFileSync(root+p);
  // Git normalized this test from CRLF to LF after acceptance. Reconstruct only
  // those exact tested bytes; product sources retain byte-exact checks.
  const actual=p==='tests/integration/collectr_import_http_v2.test.mjs'
    ? hash(bytes.toString('utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n')) : hash(bytes);
  assert.equal(actual,h,p);
}
for(const {file,sha256}of read(proof+'/native-source-v4-manifest.json').files)assert.equal(hash(fs.readFileSync(root+file)),sha256,file);
for(const run of ['v14','v15']){
  const receipt=read(proof+'/collectr-ui-'+run+'-result.json');
  assert.equal(receipt.status,'PASS');assert.equal(receipt.sourceRestored,true);assert.equal(receipt.source,'26a5313+collectr-source-v4-ascending-pagination');
  assert.equal(read(proof+'/collectr-ui-'+run+'-ui-proof.json').status,'PASS');
}
const physical=read(proof+'/collectr-ui-v15-ui-proof.json');assert.equal(physical.realFilesPickerVerified,true);
const saved=read(proof+'/'+physical.databaseReadback);
assert.equal(saved.status,'SAVED_METADATA_VERIFIED');assert.equal(saved.priorRowsUnchanged,true);assert.equal(saved.sameExactCopyIdsAcrossAllAttempts,true);
assert.equal(saved.copies,3);assert.equal(saved.documents,1);assert.deepEqual(saved.receiptImportedCounts,[3,0,0]);
if(phase==='PrePush'){
  assert.equal(git('status','--porcelain'),'','Committed clean source required');
  git('merge-base','--is-ancestor','origin/main','HEAD');
  const hook=read(out+'/commit-latest.json');
  assert.equal(hook.status,'passed');assert.equal(hook.normalHooks,true);assert.equal(hook.commit,git('rev-parse','HEAD'));assert.equal(hook.tree,git('rev-parse','HEAD^{tree}'));
  const age=Date.now()-Date.parse(hook.at);assert.ok(age>=0&&age<2*3600000,'Fresh normal hook required');
  assert.equal(hash(fs.readFileSync(hook.logFile)),hook.logSha256);
}
const {snapshotSql,compareSnapshots}=await import('./vendor_billing_schema_v1.mjs');
assert.match(snapshotSql,/begin\b[^;]*\bread only;/i);
const directory=out+'/gate-'+phase+'-'+Date.now();fs.mkdirSync(directory,{recursive:true});
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024});
for(const mode of ['full','upgrade']){
  const fixture=proof+'/'+mode+'-410',project=`collectr-import-${mode}-410-20260930`;
  const freeze=read(fixture+'/freeze.json');assert.equal(freeze.project,project);assert.deepEqual(freeze.sourceHashes,sources);
  assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),freeze.configSha256);
  assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
  for(const [n,h]of Object.entries(sources))assert.equal(hash(fs.readFileSync(fixture+'/supabase/migrations/'+n)),h,n);
  const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(JSON.parse(docker('inspect',project+'-relay'))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  const sql=q=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
  assert.equal(sql("begin read only;select current_setting('max_worker_processes');rollback;"),'0');
  assert.equal(sql('begin read only;select count(*) from cron.job_run_details;rollback;'),'0');
  assert.equal(sql('begin read only;select app_enabled::text||web_enabled::text||custom_enabled::text from vendor_store_rollout;rollback;'),'falsefalsefalse');
  assert.equal(sql('begin read only;select enabled::text from vendor_store_team_control;rollback;'),'false');
  const current=JSON.parse(sql(snapshotSql));assert.deepEqual(current.LEDGER,Object.keys(sources).map(n=>({version:n.split('_')[0]})));
  await compareSnapshots(current,read(proof+'/full-410/replayed.private.json'),{output:directory+'/'+mode});
}
// Refresh production409 comparison only after local source and runtime guards.
const fd=fs.openSync(directory+'/baseline.private.log','wx');
try{execFileSync('node',['--use-system-ca',root+'scripts/schema/audit_collectr_import_baseline_v1.mjs'],{cwd:root,stdio:['ignore',fd,fd],windowsHide:true,timeout:240000});}finally{fs.closeSync(fd);}
const baseline=read(proof+'/baseline-latest.json');
assert.equal(baseline.status,'passed');assert.equal(baseline.target,target);assert.equal(baseline.migrations,409);assert.equal(baseline.productionWrites,0);assert.deepEqual(baseline.sourceHashes,sources);
assert.ok(Date.now()-Date.parse(baseline.at)<120000);
assert.deepEqual(read(baseline.output+'/remote.private.json').LEDGER.map(r=>r.version),Object.keys(sources).map(n=>n.split('_')[0]).filter(v=>!pending.includes(v)));
const checkpoint='C:/grookai_vault_operator_artifacts/master_index_executor_review_20260917/CHECKPOINT.md';assert.match(fs.readFileSync(checkpoint,'utf8'),/PAUSED At User Request/);
const bound=['scripts/migration_preflight_strict.ps1','scripts/schema/verify_collectr_import_release_v1.mjs','scripts/schema/audit_collectr_import_baseline_v1.mjs','scripts/release/prepare_collectr_import_v1.mjs'];
const report={at:new Date().toISOString(),status:'passed',phase,target,pending,sourceTree:git('write-tree'),sourceHashes:sources,toolHashes:Object.fromEntries(bound.map(p=>[p,hash(fs.readFileSync(root+p))])),baseline:baseline.output,baselineReceiptSha256:hash(fs.readFileSync(baseline.output+'/receipt.json')),checkpointSha256:hash(fs.readFileSync(checkpoint)),privateOutput:directory,productionWrites:0,resets:0,applyAuthority:false};
fs.writeFileSync(directory+'/receipt.json',JSON.stringify(report,null,2),{flag:'wx'});fs.writeFileSync(out+'/Release-'+phase+'.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({status:'passed',phase,target,pending,productionWrites:0,resets:0,applyAuthority:false}));
