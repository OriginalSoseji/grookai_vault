import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,fixture,project,hash,sqlArgs,guardRuntime} from './vendor_billing_runtime_v1.mjs';
assert.equal(process.argv.length,2);
const runtime=guardRuntime({draft:true});
const replay=JSON.parse(fs.readFileSync(path.join(fixture,'reset-status.json')));
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260919080000_vendor_stripe_billing_v1.sql'),'utf8');
assert.equal((migration.match(/^begin;\s*$/gm)??[]).length,1);assert.equal((migration.match(/^commit;\s*$/gm)??[]).length,1);
const foundation=fs.readFileSync(path.join(root,'tests/sql/vendor_billing_foundation_v1.sql'),'utf8');
const tests=fs.readFileSync(path.join(root,'tests/sql/vendor_billing_projection_v1.sql'),'utf8');
const input="begin;\nset local statement_timeout='30s';\nset local lock_timeout='3s';\n"+migration.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'')+'\n'+foundation+'\n'+tests+'\nrollback;\n';
const run=spawnSync('docker',sqlArgs,{input,encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:4*1024*1024});
const log=(run.stdout??'')+(run.stderr??''),stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
fs.writeFileSync(path.join(fixture,`billing-projection-${stamp}.log`),log,{flag:'wx'});
guardRuntime({draft:true});
const receipt={at:new Date().toISOString(),status:run.status===0?'passed':'failed',project,imageId:runtime.imageId,
 migrationSha256:hash(migration),testSha256:hash(tests),foundationTestSha256:hash(foundation),logSha256:hash(log),transactionRolledBack:true,
 fullChainReplay:replay.status==='passed'&&replay.sourceHashes['20260919080000_vendor_stripe_billing_v1.sql']===hash(migration)&&runtime.sourceHashes['20260919080000_vendor_stripe_billing_v1.sql']===hash(migration),
 providerRequests:0,productionWrites:0};
fs.writeFileSync(path.join(root,'docs/audits/vendor_stripe_billing_schema_v1',`projection-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify(receipt));
assert.equal(run.status,0,'Projection tests failed; inspect retained private log');
assert.ok(log.includes('BILLING_FOUNDATION_ROLLBACK_PASSED')&&log.includes('BILLING_PROJECTION_ROLLBACK_PASSED'));
