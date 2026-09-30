// Read-only 409 baseline proof for the Collectr fidelity extension. No apply/reset.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const fixture='C:/gv_store_seller_link_20260928/.local/integration/seller-adoption-v2/replay-409';
const project='grookai-seller-review-20260929';
const pending='20260930010000_collectr_import_fidelity_v2.sql';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file));
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:96*1024*1024});
assert.equal(process.argv.length,2,'No apply/reset arguments');
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_collectr_import_20260930');
assert.equal(fs.readFileSync(root+'supabase/.temp/project-ref','utf8').trim(),'ycdxbpibncqcchqiihfz');
const freeze=read(fixture+'/receipt.json');
assert.equal(freeze.project,project);assert.equal(freeze.status,'passed');assert.equal(freeze.fullReplay,true);
assert.equal(Object.keys(freeze.sourceHashes).length,409);
assert.equal(sha(fs.readFileSync(fixture+'/supabase/config.toml')),read(fixture+'/intent.json').configSha256);
assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
const sourceHashes=Object.fromEntries(fs.readdirSync(root+'supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(fs.readFileSync(root+'supabase/migrations/'+n))]));
for(const [name,digest] of Object.entries(freeze.sourceHashes)){
 assert.equal(sourceHashes[name],digest,name);
 assert.equal(sha(fs.readFileSync(fixture+'/supabase/migrations/'+name)),digest,name);
}
const extra=Object.keys(sourceHashes).filter(n=>!freeze.sourceHashes[n]);
assert.ok(extra.length===0||(extra.length===1&&extra[0]===pending),'Unexpected migration payload');
const state=JSON.parse(docker('inspect','supabase_db_'+project))[0];
assert.equal(state.State.Running,true);assert.match(state.Config.Image,/postgres:17\./);
assert.deepEqual(Object.keys(state.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const sql=text=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:96*1024*1024}).trim();
assert.equal(sql("begin read only; select current_setting('max_worker_processes'); rollback;"),'0');
assert.match(snapshotSql,/begin\b[^;]*\bread only;/i);
const local=JSON.parse(sql(snapshotSql));
const ledger=Object.keys(freeze.sourceHashes).sort().map(n=>({version:n.split('_')[0]}));
assert.deepEqual(local.LEDGER,ledger);
// Credentials are retrieved only after target and every replay source is checked.
const {query,ref}=await import('../release/storefront_production_live_common_v1.mjs');
assert.equal(ref,'ycdxbpibncqcchqiihfz');
const remote=(await query(snapshotSql))[0].receipt;
assert.deepEqual(remote.LEDGER,ledger);
assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
const out='C:/grookai_vault_operator_artifacts/collectr_iphone_import_20260929/baseline-'+Date.now();
fs.mkdirSync(out,{recursive:false});
fs.writeFileSync(out+'/local.private.json',JSON.stringify(local),{flag:'wx'});
fs.writeFileSync(out+'/remote.private.json',JSON.stringify(remote),{flag:'wx'});
const comparison=await compareSnapshots(local,remote,{reconcile:true,output:out+'/comparison'});
const toolHashes=Object.fromEntries(['scripts/schema/audit_collectr_import_baseline_v1.mjs','scripts/schema/vendor_billing_schema_v1.mjs','scripts/schema/column_order_reconciliation_v1.mjs','scripts/migration_preflight_strict.ps1'].map(n=>[n,sha(fs.readFileSync(root+n))]));
const result={at:new Date().toISOString(),status:'passed',target:ref,migrations:409,sourceHashes,toolHashes,
 fixtureReceiptSha256:sha(fs.readFileSync(fixture+'/receipt.json')),comparison,pending:extra,
 productionWrites:0,localWrites:0,applyAuthority:false,output:out};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(result,null,2),{flag:'wx'});
fs.writeFileSync('C:/grookai_vault_operator_artifacts/collectr_iphone_import_20260929/baseline-latest.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({status:'passed',migrations:409,securityObjects:comparison.securityObjects,normalizedBytes:comparison.normalizedBytes,applyAuthority:false,output:out}));
