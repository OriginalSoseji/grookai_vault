// Fixed read-only production406 gate. No reset, linking, migration or deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/native_import_predeploy_20260928';
const proof='C:/grookai_vault_operator_artifacts/native_import_receipts_20260927';
const prior='C:/grookai_vault_operator_artifacts/native_import_qualification_20260927';
const target='ycdxbpibncqcchqiihfz',project='native-import-full-408-20260927';
const pending=['20260926230000','20260928020000'];
const read=p=>JSON.parse(fs.readFileSync(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024});
const sql=q=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024}).trim();
assert.equal(process.argv.length,3);
const phase=process.argv[2];assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/grookai_vault_native_import_20260927');
assert.equal(git('branch','--show-current'),'fix/native-import-recovery-20260927');
const sources=Object.fromEntries(fs.readdirSync(root+'supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'supabase/migrations/'+n))]));
const freeze=read(proof+'/full-408/freeze.json');
assert.equal(Object.keys(sources).length,408);assert.deepEqual(sources,freeze.sourceHashes);
for(const [name,digest]of Object.entries(sources))assert.equal(hash(fs.readFileSync(proof+'/full-408/supabase/migrations/'+name)),digest);
assert.equal(hash(fs.readFileSync(proof+'/full-408/supabase/config.toml')),freeze.configSha256);
assert.equal(read(proof+'/full-408/replay-result.json').fullReplay,true);
for(const p of [prior+'/upgrade-407/upgrade-result.json',proof+'/upgrade-408/upgrade-result.json']){
  const r=read(p);assert.equal(r.status,'passed');assert.equal(r.allFixtureRowsUnchanged,true);assert.equal(r.resetsAfterPopulation,0);assert.equal(r.comparison.rawBytes,0);
}
assert.equal(read(proof+'/footprint-result.json').changed,0);
const tested=read(proof+'/final-source-freeze.json');
// Product bytes and the exact emulator test remain bound to the qualified run.
for(const [p,h]of Object.entries(tested.files))if(p.startsWith('lib/')||p.startsWith('supabase/')||p.startsWith('integration_test/'))assert.equal(hash(fs.readFileSync(root+p)),h,p);
const acceptance=proof+'/acceptance-1790563633258';
assert.equal(read(acceptance+'/result.json').status,'passed');assert.equal(read(acceptance+'/result.json').checks.length,13);
for(const [p,h]of Object.entries(read(acceptance+'/intent.json').sourceHashes))assert.equal(hash(fs.readFileSync(root+p)),h,p);
const emulator=read(proof+'/emulator-result.json');assert.equal(emulator.status,'passed');assert.equal(emulator.copies,5);assert.equal(emulator.retryAdded,0);assert.equal(emulator.receipts.length,2);
assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(db.State.Running,true);assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);
for(const ports of Object.values(JSON.parse(docker('inspect',project+'-relay'))[0].NetworkSettings.Ports))for(const p of ports)assert.equal(p.HostIp,'127.0.0.1');
assert.equal(sql('show max_worker_processes'),'0');assert.equal(sql('select count(*) from cron.job_run_details'),'0');
assert.equal(sql('select app_enabled::text||web_enabled::text||custom_enabled::text from vendor_store_rollout'),'falsefalsefalse');
assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
const ledger=sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/);
assert.deepEqual(ledger,Object.keys(sources).map(n=>n.split('_')[0]).sort());
if(phase==='PrePush'){
  assert.equal(git('status','--porcelain'),'','PrePush requires a committed clean candidate');
  const hook=read(out+'/commit-latest.json');assert.equal(hook.status,'passed');assert.equal(hook.commit,git('rev-parse','HEAD'));
  assert.equal(hook.tree,git('rev-parse','HEAD^{tree}'));assert.equal(hook.normalHooks,true);assert.ok(Date.now()-Date.parse(hook.at)<2*3600000);
  assert.equal(hash(fs.readFileSync(hook.logFile)),hook.logSha256);
}
const directory=out+'/gate-'+phase+'-'+Date.now();fs.mkdirSync(directory,{recursive:true});
const current=JSON.parse(sql(snapshotSql));const expected=read(proof+'/full-408/replayed.private.json');
assert.deepEqual(current.LEDGER,expected.LEDGER);await compareSnapshots(current,expected,{output:directory+'/local'});
// This fixed baseline helper also validates source406, exact additions, maturity,
// read-only transactions and the unchanged pinned schema/security engine.
const fd=fs.openSync(directory+'/baseline.private.log','wx');
try{execFileSync('node',['--use-system-ca',root+'scripts/schema/audit_native_import_baseline_v1.mjs'],{cwd:root,stdio:['ignore',fd,fd],windowsHide:true});}finally{fs.closeSync(fd);}
const baseline=read(proof+'/baseline-latest.json');assert.equal(baseline.status,'passed');assert.equal(baseline.target,target);assert.equal(baseline.migrations,406);assert.equal(baseline.productionWrites,0);assert.deepEqual(baseline.sourceHashes,sources);assert.ok(Date.now()-Date.parse(baseline.at)<120000);
const remote=read(baseline.output+'/remote.private.json');assert.equal(remote.read_only,'on');
assert.deepEqual(remote.LEDGER.map(r=>r.version),ledger.filter(v=>!pending.includes(v)));
const checkpoint='C:/grookai_vault_operator_artifacts/master_index_executor_review_20260917/CHECKPOINT.md';assert.match(fs.readFileSync(checkpoint,'utf8'),/PAUSED At User Request/);
const bound=['scripts/migration_preflight_strict.ps1','scripts/schema/verify_native_import_release_v1.mjs','scripts/schema/audit_native_import_baseline_v1.mjs','scripts/release/prepare_native_import_v1.mjs'];
const report={at:new Date().toISOString(),status:'passed',phase,target,pending,sourceTree:git('write-tree'),sourceHashes:sources,toolHashes:Object.fromEntries(bound.map(p=>[p,hash(fs.readFileSync(root+p))])),baseline:baseline.output,baselineReceiptSha256:hash(fs.readFileSync(baseline.output+'/receipt.json')),checkpointSha256:hash(fs.readFileSync(checkpoint)),fullReplay:proof+'/full-408/replay-result.json',acceptance,emulator:proof+'/emulator-result.json',privateOutput:directory,productionWrites:0,resets:0,applyAuthority:false};
fs.writeFileSync(directory+'/receipt.json',JSON.stringify(report,null,2),{flag:'wx'});fs.writeFileSync(out+'/Release-'+phase+'.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({status:'passed',phase,target,pending,productionWrites:0,resets:0,applyAuthority:false}));
