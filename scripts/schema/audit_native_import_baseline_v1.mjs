// Fixed read-only production406 comparison. No migration, linking, reset or apply.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {guard,sql} from 'file:///C:/gv_store_production_20260926/scripts/schema/replay_store_team_workflow_review_v1.mjs';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const receiptMigration='20260928020000_vault_import_receipts_v1.sql';
const withReceipts=fs.existsSync(root+'supabase/migrations/'+receiptMigration);
const out='C:/grookai_vault_operator_artifacts/'+(withReceipts?'native_import_receipts_20260927':'native_import_qualification_20260927');
const hash=b=>createHash('sha256').update(b).digest('hex');
const pending='20260926230000_atomic_vault_import_v1.sql';
const prior='C:/grookai_vault_audit_release_20260927/supabase/migrations/'+pending;
assert.equal(process.argv.length,2);
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/grookai_vault_native_import_20260927');
const expected=JSON.parse(fs.readFileSync('C:/gv_store_production_20260926/.local/integration/store-team-workflow-review-replay-v1/intent.json')).sourceHashes;
assert.equal(Object.keys(expected).length,406);
const sources=Object.fromEntries(fs.readdirSync(root+'supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'supabase/migrations/'+n))]));
assert.ok([406,407,408].includes(Object.keys(sources).length));
for(const [name,digest] of Object.entries(expected))assert.equal(sources[name],digest);
for(const name of Object.keys(sources))if(!expected[name]){
  if(name===receiptMigration){assert.ok(sources[pending]);assert.equal(sources[name],JSON.parse(fs.readFileSync(out+'/migration-intent.json')).sha256);}
  else{assert.equal(name,pending);assert.equal(sources[name],hash(fs.readFileSync(prior)));}
}
const state=guard();assert.equal(state.migrations,406);
assert.match(snapshotSql,/begin\b[^;]*\bread only;/i);
const local=JSON.parse(sql(snapshotSql));
// Credential access happens only after local target/source validation.
const {query,ref}=await import('../release/storefront_production_live_common_v1.mjs');
assert.equal(ref,'ycdxbpibncqcchqiihfz');
const remote=(await query(snapshotSql))[0].receipt;
assert.equal(remote.read_only,'on');assert.equal(remote.LEDGER.length,406);assert.deepEqual(local.LEDGER,remote.LEDGER);
assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000,'Production environment maturity mismatch');
const directory=out+'/baseline-'+Date.now();fs.mkdirSync(directory,{recursive:true});
fs.writeFileSync(directory+'/remote.private.json',JSON.stringify(remote),{flag:'wx'});
fs.writeFileSync(directory+'/local.private.json',JSON.stringify(local),{flag:'wx'});
const comparison=await compareSnapshots(remote,local,{reconcile:true,output:directory});
const receipt={at:new Date().toISOString(),status:'passed',scope:'read-only baseline; no PrePush or apply authority',target:ref,
  migrations:406,sourceHashes:sources,state,productionSanity:remote.sanity,comparison,productionWrites:0,output:directory};
fs.writeFileSync(directory+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});
fs.writeFileSync(out+'/baseline-latest.json',JSON.stringify(receipt,null,2));
console.log(JSON.stringify({status:receipt.status,migrations:406,sanity:remote.sanity,securityObjects:comparison.securityObjects,productionWrites:0,output:directory}));
