// Fixed, read-only production410 comparison against the qualified full410 replay.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/cosmos_pricing_support_20260930';
const prior='C:/grookai_vault_operator_artifacts/collectr_import_review_20260930/full-410';
const pending='20260930233000_tcgplayer_cosmos_finish_v1.sql';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
assert.equal(process.argv.length,2,'Read-only baseline accepts no overrides');
assert.ok(process.execArgv.includes('--use-system-ca'));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_cosmos_pricing_20260930');
assert.match(fs.readFileSync(root+'supabase/config.toml','utf8'),/project_id = "ycdxbpibncqcchqiihfz"/);
const freeze=read(prior+'/freeze.json'),receipt=read(prior+'/replay-result.json');
assert.equal(receipt.status,'passed');assert.equal(receipt.fullReplay,true);assert.equal(receipt.noOpPush,true);assert.equal(receipt.migrations,410);
const sources=Object.fromEntries(fs.readdirSync(root+'supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'supabase/migrations/'+n))]));
assert.equal(Object.keys(sources).length,411);assert.equal(Object.keys(freeze.sourceHashes).length,410);
for(const [n,h]of Object.entries(freeze.sourceHashes)){assert.equal(sources[n],h,n);assert.equal(hash(fs.readFileSync(prior+'/supabase/migrations/'+n)),h,n);}
assert.deepEqual(Object.keys(sources).filter(n=>!freeze.sourceHashes[n]),[pending]);
const local=read(prior+'/replayed.private.json');
const ledger=Object.keys(freeze.sourceHashes).sort().map(n=>({version:n.split('_')[0]}));assert.deepEqual(local.LEDGER,ledger);
const {query,ref}=await import('../release/storefront_production_live_common_v1.mjs');assert.equal(ref,'ycdxbpibncqcchqiihfz');
const remote=(await query(snapshotSql))[0].receipt;assert.deepEqual(remote.LEDGER,ledger);
assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
const directory=out+'/baseline-'+Date.now();fs.mkdirSync(directory,{recursive:false});
fs.writeFileSync(directory+'/remote.private.json',JSON.stringify(remote),{flag:'wx'});
const comparison=await compareSnapshots(local,remote,{reconcile:true,output:directory+'/comparison'});
const result={at:new Date().toISOString(),status:'passed',target:ref,migrations:410,sourceHashes:sources,comparison,
 qualificationReceiptSha256:hash(fs.readFileSync(prior+'/replay-result.json')),qualifiedSnapshotSha256:hash(fs.readFileSync(prior+'/replayed.private.json')),
 productionWrites:0,localWrites:0,applyAuthority:false,output:directory};
fs.writeFileSync(directory+'/receipt.json',JSON.stringify(result,null,2),{flag:'wx'});fs.writeFileSync(out+'/baseline-latest.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({status:'passed',migrations:410,comparison,productionWrites:0,output:directory}));
