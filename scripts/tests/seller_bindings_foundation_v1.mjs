// Guarded 188xx SQL behavior. Every fixture rolls back; no provider access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,fixture,project,container,output,addition,hash,guard} from '../schema/seller_bindings_runtime_v1.mjs';
assert.equal(process.argv.length,2);
const runtime=guard({full:true});
const replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json')));
assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,runtime.sourceHashes);
const tests=fs.readFileSync(path.join(root,'tests/sql/vendor_seller_bindings_v1.sql'),'utf8');
const input="begin;\nset local statement_timeout='30s';\nset local lock_timeout='3s';\n"+tests+'\nrollback;';
const run=spawnSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],
 {input,encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:4*1024*1024});
const log=(run.stdout??'')+(run.stderr??''),stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
fs.writeFileSync(path.join(fixture,`foundation-${stamp}.log`),log,{flag:'wx'});
assert.deepEqual(guard({full:true}),runtime);
const passed=run.status===0&&log.includes('SELLER_BINDINGS_ROLLBACK_PASSED');
const report={at:new Date().toISOString(),status:passed?'passed':'failed',project,migrationSha256:runtime.sourceHashes[addition],
 testSha256:hash(tests),logSha256:hash(log),transactionRolledBack:true,fullChainReplay:true,crossConnectionConcurrency:false,providerRequests:0,productionWrites:0};
fs.writeFileSync(path.join(output,`foundation-${stamp}.json`),JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify(report));assert.ok(passed,`Inspect retained foundation-${stamp}.log`);
