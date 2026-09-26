import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {root,fixture,project,hash,sqlArgs,guardRuntime} from './vendor_billing_runtime_v1.mjs';
assert.equal(process.argv.length,2);
const runtime=guardRuntime({draft:true}),replay=JSON.parse(fs.readFileSync(path.join(fixture,'reset-status.json')));
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260919080000_vendor_stripe_billing_v1.sql'),'utf8');
assert.equal((migration.match(/^begin;\s*$/gm)??[]).length,1);assert.equal((migration.match(/^commit;\s*$/gm)??[]).length,1);
const names=['vendor_billing_foundation_v1.sql','vendor_billing_projection_v1.sql','vendor_billing_orchestration_v1.sql'];
const tests=names.map(n=>fs.readFileSync(path.join(root,'tests/sql',n),'utf8'));
const input="begin;\nset local statement_timeout='30s';\nset local lock_timeout='3s';\n"+migration.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'')+'\n'+tests.join('\n')+'\nrollback;\n';
const run=spawnSync('docker',sqlArgs,{input,encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:4*1024*1024});
const log=(run.stdout??'')+(run.stderr??''),stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
fs.writeFileSync(path.join(fixture,`billing-orchestration-${stamp}.log`),log,{flag:'wx'});guardRuntime({draft:true});
const receipt={at:new Date().toISOString(),status:run.status===0?'passed':'failed',project,imageId:runtime.imageId,migrationSha256:hash(migration),
 testHashes:Object.fromEntries(names.map((n,i)=>[n,hash(tests[i])])),logSha256:hash(log),transactionRolledBack:true,
 fullChainReplay:replay.status==='passed'&&replay.sourceHashes['20260919080000_vendor_stripe_billing_v1.sql']===hash(migration)&&runtime.sourceHashes['20260919080000_vendor_stripe_billing_v1.sql']===hash(migration),
 providerRequests:0,productionWrites:0};
fs.writeFileSync(path.join(root,'docs/audits/vendor_stripe_billing_schema_v1',`orchestration-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify(receipt));assert.equal(run.status,0,'SQL failed; inspect retained log');assert.ok(log.includes('BILLING_ORCHESTRATION_ROLLBACK_PASSED'));
