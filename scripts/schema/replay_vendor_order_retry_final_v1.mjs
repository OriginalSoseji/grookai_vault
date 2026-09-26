// One full reset of the new empty 220xx project, never an earlier proof database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {root,fixture,project,output,pending,addition,hash,hashes,sql,guard} from './vendor_order_retry_final_runtime_v1.mjs';
assert.ok(process.argv.length===2 || (process.argv.length===3 && process.argv[2]==='--verify'));
const verifyOnly=process.argv[2]==='--verify';
const before=guard({full:verifyOnly});
assert.equal(Object.keys(before.sourceHashes).length,406);
const files=fs.readdirSync(output).filter(n=>/^baseline-.*\.json$/.test(n)).sort();assert.ok(files.length);
const baselineFile=files.at(-1),baseline=JSON.parse(fs.readFileSync(path.join(output,baselineFile)));
assert.equal(baseline.status,'passed');assert.equal(baseline.applied,397);assert.equal(baseline.comparison.normalizedBytes,0);assert.equal(baseline.comparison.securityObjects,894);
assert.deepEqual(before.sourceHashes,baseline.sourceHashes);
assert.ok(Date.now()-Date.parse(baseline.finishedAt)<86400000);
for(const [name,digest] of Object.entries(baseline.toolHashes))assert.equal(hash(fs.readFileSync(path.join(root,name))),digest);
assert.match(fs.readFileSync(path.join(fixture,'strict-baseline.log'),'utf8'),/STRICT VENDOR ORDER RETRY BASELINE PASS - DEVELOPMENT ONLY/);
assert.ok(!fs.existsSync(path.join(output,'replay.json')));
assert.equal(fs.existsSync(path.join(fixture,'full-reset-private.log')),verifyOnly);
const footprintSql=fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8');
// Read the prior verified 402-file schema without resetting or modifying it.
const priorContainer='supabase_db_grookai-order-stop-20260919';
const old=JSON.parse(execFileSync('docker',['exec','-i',priorContainer,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:footprintSql,encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:32*1024*1024}));
if(verifyOnly)assert.deepEqual(JSON.parse(fs.readFileSync(path.join(fixture,'prior-212-footprint.json'))).objects,old.objects);
else fs.writeFileSync(path.join(fixture,'prior-212-footprint.json'),JSON.stringify(old),{flag:'wx'});
let log;
if(!verifyOnly) {
for(const name of [...pending,addition])fs.copyFileSync(path.join(root,'supabase/migrations',name),path.join(fixture,'supabase/migrations',name),fs.constants.COPYFILE_EXCL);
assert.deepEqual(hashes(path.join(fixture,'supabase/migrations')),before.sourceHashes);
const env={...process.env};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
const run=spawnSync('supabase',['db','reset','--local','--no-seed','--yes','--workdir',fixture,'--network-id',project],{cwd:fixture,env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
log=(run.stdout??'')+(run.stderr??'');fs.writeFileSync(path.join(fixture,'full-reset-private.log'),log,{flag:'wx'});
assert.equal(run.status,0,'Inspect retained replay logs before taking another action');
} else {
 log=fs.readFileSync(path.join(fixture,'full-reset-private.log'),'utf8');
 assert.match(log,/Finished supabase db reset/);
}
const after=guard({full:true}),current=JSON.parse(sql(footprintSql));
if(verifyOnly)assert.deepEqual(JSON.parse(fs.readFileSync(path.join(fixture,'full-footprint.json'))).objects,current.objects);
else fs.writeFileSync(path.join(fixture,'full-footprint.json'),JSON.stringify(current),{flag:'wx'});
const keys=new Set(old.objects.map(o=>`${o.kind}|${o.key}`));const added=current.objects.filter(o=>!keys.has(`${o.kind}|${o.key}`));
assert.deepEqual(current.objects.filter(o=>keys.has(o.kind+'|'+o.key)),old.objects,'Previously proven schema changed');
const changed=[];
assert.ok(added.length>0);assert.ok(added.every(o=>/vendor_order_reconcile_/.test(o.key)),'Unrelated schema addition');
// Re-execution is idempotent in a rollback transaction (strip its own envelope).
const migration=fs.readFileSync(path.join(root,'supabase/migrations',addition),'utf8');
const body=migration.replace(/^begin;$/m,'').replace(/^commit;$/m,'');sql('begin;\n'+body+'\nrollback;');
assert.deepEqual(JSON.parse(sql(footprintSql)).objects,current.objects);
const report={at:new Date().toISOString(),status:'passed',...after,baselineFile,fullChainResetReplay:true,unchangedObjects:old.objects.length,changedObjects:changed,addedObjects:added,resetLogSha256:hash(log),idempotentRollback:true,productionWrites:0,sharedResets:0,providerRequests:0,rolloutEnabled:false};
fs.writeFileSync(path.join(output,'replay.json'),JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({status:'passed',applied:after.applied,unchangedObjects:old.objects.length,addedObjects:added.length,productionWrites:0}));
