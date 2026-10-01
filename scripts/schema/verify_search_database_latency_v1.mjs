// Read-only fixed-target schema qualification; never resets a lab or applies SQL.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
import {query,ref} from '../release/storefront_production_live_common_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/search_database_20261001',prior='C:/grookai_vault_operator_artifacts/cosmos_pricing_support_20260930/full-411';
const pending='20261001150000_search_database_latency_v1.sql';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
assert.equal(process.argv.length,3);const phase=process.argv[2];assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_search_database_20261001');assert.equal(ref,'ycdxbpibncqcchqiihfz');
const sources=Object.fromEntries(fs.readdirSync(root+'supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'supabase/migrations/'+n))]));
const freeze=read(prior+'/freeze.json'),replay=read(prior+'/replay-result.json');assert.equal(replay.status,'passed');assert.equal(replay.migrations,411);assert.ok(replay.fullReplay&&replay.noOpPush);
for(const [n,h]of Object.entries(freeze.sourceHashes)){assert.equal(sources[n],h,n);assert.equal(hash(fs.readFileSync(prior+'/supabase/migrations/'+n)),h,n);}
assert.deepEqual(Object.keys(sources).filter(n=>!freeze.sourceHashes[n]),sources[pending]?[pending]:[]);
const local=read(prior+'/replayed.private.json'),remote=(await query(snapshotSql))[0].receipt;
assert.deepEqual(remote.LEDGER,local.LEDGER);assert.equal(remote.LEDGER.length,411);assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
const directory=out+'/gate-'+phase+'-'+Date.now();fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(directory+'/remote.private.json',JSON.stringify(remote),{flag:'wx'});
const comparison=await compareSnapshots(local,remote,{reconcile:true,output:directory+'/comparison'});
if(phase==='PrePush'){
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 assert.equal(git('status','--porcelain'),'','Clean committed source required');git('merge-base','--is-ancestor','origin/main','HEAD');
 const hook=read(out+'/normal-hook-proof.json');assert.equal(hook.status,'passed');assert.equal(hook.normalHooks,true);
 assert.equal(hook.commit,git('rev-parse','HEAD'));assert.equal(hook.tree,git('rev-parse','HEAD^{tree}'));
 assert.ok(Date.now()-Date.parse(hook.at)<2*3600000);assert.equal(hash(fs.readFileSync(hook.logFile)),hook.logSha256);assert.equal(read(hook.resultFile).exit_code,0);
 const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024});
for(const mode of ['full','upgrade']){
 const fixture=out+'/'+mode+'-412-v2',project=`search-database-${mode}-412-v2-20261001`,freeze=read(fixture+'/freeze.json');
 assert.equal(freeze.project,project);assert.deepEqual(freeze.sourceHashes,sources);
 assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),freeze.configSha256);assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
 for(const [n,h]of Object.entries(sources))assert.equal(hash(fs.readFileSync(fixture+'/supabase/migrations/'+n)),h,n);
 const proof=read(fixture+'/'+(mode==='full'?'replay-result.json':'upgrade-result.json'));assert.equal(proof.status,'passed');assert.equal(proof.migrations,412);assert.equal(proof.productionWrites,0);
 if(mode==='full'){assert.equal(proof.fullReplay,true);assert.equal(proof.noOpPush,true);assert.equal(proof.retainedFixtureResets,0);}
 else{assert.equal(proof.allFixtureRowsUnchanged,true);assert.equal(proof.resetsAfterPopulation,0);assert.equal(proof.retainedCopies,2);assert.equal(proof.comparison.rawBytes,0);}
 const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
 assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
 for(const bindings of Object.values(JSON.parse(docker('inspect',project+'-relay'))[0].NetworkSettings.Ports))for(const b of bindings)assert.equal(b.HostIp,'127.0.0.1');
 const sql=q=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
 assert.equal(sql("begin read only;select current_setting('max_worker_processes');rollback;"),'0');assert.equal(sql('begin read only;select count(*) from cron.job_run_details;rollback;'),'0');
 const current=JSON.parse(sql(snapshotSql));assert.deepEqual(current.LEDGER,Object.keys(sources).map(n=>({version:n.split('_')[0]})));
 await compareSnapshots(current,read(out+'/full-412-v2/replayed.private.json'),{output:directory+'/'+mode});
}

 const runtime=read(out+'/runtime-result.json');assert.equal(runtime.status,'passed');assert.equal(runtime.productionWrites,0);assert.equal(runtime.migrationSha256,sources[pending]);
}
const receipt={at:new Date().toISOString(),status:'passed',phase,target:ref,migrations:411,sourceHashes:sources,comparison,output:directory,
 pending:[pending.split('_')[0]],sourceTree:execFileSync('git',['write-tree'],{cwd:root,encoding:'utf8'}).trim(),
 toolHashes:Object.fromEntries(['scripts/migration_preflight_strict.ps1','scripts/schema/verify_search_database_latency_v1.mjs','scripts/schema/search_database_lab_v1.mjs','scripts/schema/search_database_runtime_v1.mjs','scripts/release/prepare_search_database_v1.mjs'].map(p=>[p,hash(fs.readFileSync(root+p))])),
 baseline:directory,baselineReceiptSha256:null,productionWrites:0,applyAuthority:false};
fs.writeFileSync(directory+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});fs.writeFileSync(out+'/baseline-latest.json',JSON.stringify(receipt,null,2));fs.writeFileSync(out+'/Release-'+phase+'.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({status:'passed',phase,migrations:411,productionWrites:0,output:directory}));
