// Read-only convergence proof after the fresh422 CLI replay has actually passed.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {compareSnapshots} from './vendor_billing_schema_v1.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
assert.equal(process.argv.length,2);const read=p=>JSON.parse(fs.readFileSync(base+'/'+p)),sha=b=>createHash('sha256').update(b).digest('hex');
const full=read('full-422-v24/replay-result.json'),upgrade=read('retained-slab-upgrade-v1/receipt.json');
assert.equal(full.status,'passed');assert.equal(full.fullReplay,true);assert.equal(full.noOpPush,true);assert.equal(full.migrations,422);
assert.equal(upgrade.status,'passed');assert.equal(upgrade.migrations,422);assert.equal(upgrade.retainedCopies,2);
assert.equal(read('retained-slab-upgrade-v1/schema-boundary.json').status,'passed');
const freeze=read('full-422-v24/freeze.json');
for(const [name,h]of Object.entries(freeze.sourceHashes))assert.equal(sha(fs.readFileSync('supabase/migrations/'+name)),h,name);
const fresh=read('full-422-v24/replayed.private.json'),retained=read('retained-slab-upgrade-v1/after-schema.private.json');
assert.deepEqual(fresh.LEDGER,retained.LEDGER);
const dir=base+'/slab-replay-parity-v1';assert.ok(!fs.existsSync(dir),'Preserve prior parity evidence');fs.mkdirSync(dir);
try{
 const comparison=await compareSnapshots(fresh,retained,{output:dir+'/comparison'});
 const receipt={at:new Date().toISOString(),status:'passed',migrations:422,fullReplay:true,retained421To422:true,retainedCopies:2,comparison,productionWrites:0,localDatabaseWrites:0};
 fs.writeFileSync(dir+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}catch(e){fs.writeFileSync(dir+'/failure.json',JSON.stringify({at:new Date().toISOString(),message:e.message},null,2),{flag:'wx'});throw e;}
