// Fixed, read-only baseline. Never executes a repair, reset, grant or apply.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {guard,root,sql,hash} from './replay_store_team_hardening_v1.mjs';
import {hashes} from './storefront_production_lab_v1.mjs';
import {query,ref} from '../release/storefront_production_live_common_v1.mjs';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
assert.equal(process.argv.length,2);
assert.equal(ref,'ycdxbpibncqcchqiihfz');
const state=guard();assert.equal(state.migrations,404);
const local=JSON.parse(sql(snapshotSql));
assert.match(snapshotSql,/begin\b[^;]*\bread only;/i);
const remote=(await query(snapshotSql))[0].receipt;assert.equal(remote.read_only,'on');
assert.equal(remote.LEDGER.length,404);assert.deepEqual(local.LEDGER,remote.LEDGER);
const output=path.join(root,'.local/integration/store-team-workflows-v1',`baseline-${Date.now()}`);
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'local.private.json'),JSON.stringify(local));
fs.writeFileSync(path.join(output,'remote.private.json'),JSON.stringify(remote));
const comparison=await compareSnapshots(remote,local,{reconcile:true,output});
const footprintSql=fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8');
assert.match(footprintSql,/begin\b[^;]*\bread only;/i);
const footprint=(await query(footprintSql))[0].receipt;
assert.equal(footprint.transaction_read_only,'on');
fs.writeFileSync(path.join(output,'footprint.private.json'),JSON.stringify(footprint));
const report={at:new Date().toISOString(),status:'passed',target:ref,state,comparison,
  sourceHashes:hashes(path.join(root,'supabase/migrations')),schemaFingerprint:hash(JSON.stringify(footprint.objects)),
  productionSanity:remote.sanity,output,productionWrites:0};
fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(root,'.local/integration/store-team-workflows-v1/baseline.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({status:'passed',target:ref,migrations:404,comparison,productionWrites:0}));
