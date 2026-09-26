// Real local SQL behavior after the separately recorded full-chain reset.
// All fixture changes roll back; no route or provider is activated.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,fixture,project,hash,sqlArgs,guardRuntime} from './vendor_billing_runtime_v1.mjs';
assert.equal(process.argv.length,2);
const runtime=guardRuntime();
const replay=JSON.parse(fs.readFileSync(path.join(fixture,'reset-status.json')));
assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,runtime.sourceHashes);
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260919080000_vendor_stripe_billing_v1.sql'),'utf8');
assert.equal((migration.match(/^begin;\s*$/gm)??[]).length,1);assert.equal((migration.match(/^commit;\s*$/gm)??[]).length,1);
const tests=fs.readFileSync(path.join(root,'tests/sql/vendor_billing_foundation_v1.sql'),'utf8');
// Reapply the same draft inside the rollback to verify idempotence as well.
const input="begin;\nset local statement_timeout='30s';\nset local lock_timeout='3s';\n"+migration.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'')+'\n'+tests+'\nrollback;\n';
const run=spawnSync('docker',sqlArgs,{input,encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:4*1024*1024});
const log=(run.stdout??'')+(run.stderr??'');
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
fs.writeFileSync(path.join(fixture,`billing-foundation-${stamp}.log`),log,{flag:'wx'});
guardRuntime();
assert.equal(run.status,0,'SQL tests failed; inspect retained local log');
assert.ok(log.includes('BILLING_FOUNDATION_ROLLBACK_PASSED'));
const output=path.join(root,'docs/audits/vendor_stripe_billing_schema_v1');fs.mkdirSync(output,{recursive:true});
const receipt={at:new Date().toISOString(),status:'passed',project,image:runtime.image,imageId:runtime.imageId,migrationSha256:hash(migration),testSha256:hash(tests),logSha256:hash(log),transactionRolledBack:true,idempotentReapply:true,fullChainReplay:true,crossConnectionConcurrency:false,providerRequests:0,productionWrites:0,capabilityProjectionTested:false};
fs.writeFileSync(path.join(output,`foundation-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify(receipt));
