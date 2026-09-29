// Fixed read-only production408 comparison against its qualified full replay.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv.length,2);
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_store_seller_link_20260928');
const prior='C:/grookai_vault_operator_artifacts/native_import_receipts_20260927/full-408';
const freeze=JSON.parse(fs.readFileSync(prior+'/freeze.json'));
const proof=JSON.parse(fs.readFileSync(prior+'/replay-result.json'));
assert.equal(proof.status,'passed');assert.equal(proof.migrations,408);
assert.equal(proof.fullReplay,true);assert.equal(proof.noOpPush,true);
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources=Object.fromEntries(fs.readdirSync(root+'supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'supabase/migrations/'+n))]));
// Re-audit the immutable production baseline while this exact additive candidate
// is present. No other pending migration or baseline drift is admitted.
const candidate='20260928213000_vendor_seller_adoption_v1.sql';
const pending=Object.keys(sources).filter(n=>!Object.hasOwn(freeze.sourceHashes,n));
assert.ok(pending.length===0 || (pending.length===1 && pending[0]===candidate));
const baselineSources=Object.fromEntries(Object.entries(sources).filter(([n])=>n!==candidate));
assert.deepEqual(baselineSources,freeze.sourceHashes);
const local=JSON.parse(fs.readFileSync(prior+'/replayed.private.json'));
assert.equal(local.LEDGER.length,408);
assert.match(snapshotSql,/begin\b[^;]*\bread only;/i);
const {query,ref}=await import('file:///C:/gv_store_production_20260926/scripts/release/storefront_production_live_common_v1.mjs');
assert.equal(ref,'ycdxbpibncqcchqiihfz');
const remote=(await query(snapshotSql))[0].receipt;
assert.equal(remote.read_only,'on');assert.deepEqual(remote.LEDGER,local.LEDGER);
assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
const out=path.join(root,'.local/integration/seller-adoption-v2','baseline-'+Date.now());
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/remote.private.json',JSON.stringify(remote),{flag:'wx'});
const comparison=await compareSnapshots(remote,local,{reconcile:true,output:out});
const receipt={status:'passed',at:new Date().toISOString(),scope:'read-only; no apply authority',migrations:408,
  target:ref,sourceHashes:baselineSources,comparison,productionWrites:0,output:out};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});
fs.writeFileSync(path.join(root,'.local/integration/seller-adoption-v2/baseline.json'),JSON.stringify(receipt,null,2));
console.log(JSON.stringify({status:'passed',migrations:408,productionWrites:0,comparison}));
