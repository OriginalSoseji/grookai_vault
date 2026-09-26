// One-time recovery of already-applied SQL, not a new catalog change or remote apply.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {root,fixture,project,addition,output,hash,guard,hashes} from './vendor_order_cancellation_runtime_v1.mjs';
assert.equal(process.argv.length,2);const before=guard();assert.equal(before.applied,396);
const clean='C:/gv_store_cancel_reconcile_20260919';
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:clean,encoding:'utf8'}).trim(),'');
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:clean,encoding:'utf8'}).trim(),'8680fd643cab9bbfad312e844d72c814f7246947');
assert.deepEqual(hashes(path.join(clean,'supabase/migrations')),before.sourceHashes);
const raw=fs.readFileSync(path.join(fixture,'remote-1930-private.json'),'utf8'),row=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)).rows[0];
assert.equal(row.version,'20260919193000');assert.equal(row.name,'japanese_unnumbered_event_identity_v1');assert.equal(row.statements.length,1);
const migration=row.statements[0],digest='80d659799f06bddd0f86e4339a214d470d378d2c2918da20ca25c0e6d6cf552e';assert.equal(hash(migration),digest);
// Recovery authority is the applied ledger, not uncommitted catalog source.
for(const where of [clean,root,fixture])fs.writeFileSync(path.join(where,'supabase/migrations',addition),migration,{flag:'wx'});
const expected={...before.sourceHashes,[addition]:digest};
const local=hashes(path.join(fixture,'supabase/migrations'));assert.equal(Object.keys(local).length,397);assert.equal(local[addition],digest);
const env={...process.env};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
const run=spawnSync('supabase',['db','reset','--local','--no-seed','--yes','--workdir',fixture,'--network-id',project],{cwd:fixture,env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
fs.writeFileSync(path.join(fixture,'recovered-baseline-private.log'),(run.stdout??'')+(run.stderr??''),{flag:'wx'});
assert.equal(run.status,0,'Inspect retained recovery log; never reset another project');
const after=guard();assert.equal(after.applied,397);assert.deepEqual(after.sourceHashes,expected);
fs.mkdirSync(output,{recursive:true});const receipt={at:new Date().toISOString(),status:'passed',project,applied:397,recovered:row.version,migrationSha256:digest,cleanWorktree:clean,ledgerReceiptSha256:hash(raw),priorSourcePreserved:403,productionWrites:0,sharedResets:0};
fs.writeFileSync(path.join(output,'ledger-recovery.json'),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
