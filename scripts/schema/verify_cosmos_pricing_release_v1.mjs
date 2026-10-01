// Fixed read-only release gate. Does not reset fixtures or apply a migration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
assert.equal(process.argv.length,3,'Use AuditLinkedSchema or PrePush only');
const phase=process.argv[2];assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));
const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/cosmos_pricing_support_20260930';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_cosmos_pricing_20260930');
assert.equal(git('branch','--show-current'),'fix/cosmos-finish-pricing-20260930');
const sources=Object.fromEntries(fs.readdirSync(root+'supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'supabase/migrations/'+n))]));
assert.equal(Object.keys(sources).length,411);
const pending=['20260930233000'];
if(phase==='PrePush'){
 assert.equal(git('status','--porcelain'),'','Clean committed source required');git('merge-base','--is-ancestor','origin/main','HEAD');
 const hook=read(out+'/normal-hook-proof.json');assert.equal(hook.status,'passed');assert.equal(hook.normalHooks,true);
 assert.equal(hook.commit,git('rev-parse','HEAD'));assert.equal(hook.tree,git('rev-parse','HEAD^{tree}'));
 assert.ok(Date.now()-Date.parse(hook.at)<2*3600000);assert.equal(hash(fs.readFileSync(hook.logFile)),hook.logSha256);
 assert.equal(read(hook.resultFile).exit_code,0);
}
const {snapshotSql,compareSnapshots}=await import('./vendor_billing_schema_v1.mjs');
assert.match(snapshotSql,/begin\b[^;]*\bread only;/i);
const directory=out+'/gate-'+phase+'-'+Date.now();fs.mkdirSync(directory,{recursive:false});
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024});
for(const mode of ['full','upgrade']){
 const fixture=out+'/'+mode+'-411',project=`cosmos-pricing-${mode}-411-20260930`,freeze=read(fixture+'/freeze.json');
 assert.equal(freeze.project,project);assert.deepEqual(freeze.sourceHashes,sources);
 assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),freeze.configSha256);assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
 for(const [n,h]of Object.entries(sources))assert.equal(hash(fs.readFileSync(fixture+'/supabase/migrations/'+n)),h,n);
 const proof=read(fixture+'/'+(mode==='full'?'replay-result.json':'upgrade-result.json'));assert.equal(proof.status,'passed');assert.equal(proof.migrations,411);assert.equal(proof.productionWrites,0);
 if(mode==='full'){assert.equal(proof.fullReplay,true);assert.equal(proof.noOpPush,true);assert.equal(proof.retainedFixtureResets,0);}
 else{assert.equal(proof.allFixtureRowsUnchanged,true);assert.equal(proof.resetsAfterPopulation,0);assert.equal(proof.retainedCopies,2);assert.equal(proof.comparison.rawBytes,0);}
 const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
 assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
 for(const bindings of Object.values(JSON.parse(docker('inspect',project+'-relay'))[0].NetworkSettings.Ports))for(const b of bindings)assert.equal(b.HostIp,'127.0.0.1');
 const sql=q=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
 assert.equal(sql("begin read only;select current_setting('max_worker_processes');rollback;"),'0');assert.equal(sql('begin read only;select count(*) from cron.job_run_details;rollback;'),'0');
 const current=JSON.parse(sql(snapshotSql));assert.deepEqual(current.LEDGER,Object.keys(sources).map(n=>({version:n.split('_')[0]})));
 await compareSnapshots(current,read(out+'/full-411/replayed.private.json'),{output:directory+'/'+mode});
}
const fd=fs.openSync(directory+'/baseline.private.log','wx');
try{execFileSync('node',['--use-system-ca',root+'scripts/schema/audit_cosmos_pricing_baseline_v1.mjs'],{cwd:root,stdio:['ignore',fd,fd],windowsHide:true,timeout:240000});}finally{fs.closeSync(fd);}
const baseline=read(out+'/baseline-latest.json');assert.equal(baseline.status,'passed');assert.equal(baseline.target,'ycdxbpibncqcchqiihfz');assert.equal(baseline.migrations,410);assert.deepEqual(baseline.sourceHashes,sources);assert.ok(Date.now()-Date.parse(baseline.at)<120000);
assert.deepEqual(read(baseline.output+'/remote.private.json').LEDGER.map(r=>r.version),Object.keys(sources).map(n=>n.split('_')[0]).filter(v=>!pending.includes(v)));
const tools=['scripts/migration_preflight_strict.ps1','scripts/schema/verify_cosmos_pricing_release_v1.mjs','scripts/schema/audit_cosmos_pricing_baseline_v1.mjs','scripts/schema/cosmos_pricing_lab_v1.mjs','scripts/release/prepare_cosmos_pricing_v1.mjs'];
const result={at:new Date().toISOString(),status:'passed',phase,target:baseline.target,pending,sourceTree:git('write-tree'),sourceHashes:sources,
 toolHashes:Object.fromEntries(tools.map(p=>[p,hash(fs.readFileSync(root+p))])),baseline:baseline.output,baselineReceiptSha256:hash(fs.readFileSync(baseline.output+'/receipt.json')),
 privateOutput:directory,productionWrites:0,resets:0,applyAuthority:false};
fs.writeFileSync(directory+'/receipt.json',JSON.stringify(result,null,2),{flag:'wx'});fs.writeFileSync(out+'/Release-'+phase+'.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({status:'passed',phase,target:result.target,pending,productionWrites:0,resets:0,applyAuthority:false}));
