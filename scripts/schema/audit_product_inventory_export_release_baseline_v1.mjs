// Post-implementation read-only release baseline for exact438; never replaces pre-change evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readInventoryExportParent} from './product_inventory_export_parent_v1.mjs';
import {inventoryExportReleaseSources} from './product_inventory_export_release_scope_v1.mjs';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
import {query,ref,dbUrl} from '../release/storefront_production_live_common_v1.mjs';

assert.equal(process.argv.length,2);
const root='C:/gv_product_inventory_export_20261008';
const base='C:/grookai_vault_operator_artifacts/product_inventory_export_20261008';
const parentRoot='C:/gv_product_portability_20261008';
const parentBase='C:/grookai_vault_operator_artifacts/product_portability_20261008';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const scope=read(base+'/SCOPE.json'),commit=scope.qualifiedParent;
assert.match(commit,/^[a-f0-9]{40}$/);
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
assert.equal(fs.realpathSync(fileURLToPath(new URL('../../',import.meta.url))).replaceAll('\\','/'),root);
const gitAt=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true}).trim();
assert.equal(gitAt(root,'rev-parse','HEAD'),commit);
assert.equal(gitAt(parentRoot,'rev-parse','HEAD'),commit);
assert.equal(gitAt(parentRoot,'status','--porcelain'),'');

const checks=read(parentBase+'/latest-checks.json'),gate=read(parentBase+'/Release-PrePush.json'),dry=read(parentBase+'/dry-run-v1-latest.json');
assert.equal(checks.status,'passed');assert.equal(checks.mode,'commit');assert.equal(checks.finalHead,commit);assert.equal(checks.productionWrites,0);assert.equal(checks.localReadOnly,true);assert.deepEqual(checks.before,checks.after);assert.equal(sha(checks.out+'/checks.private.log'),checks.logSha256);
for(const item of [gate,dry]){assert.equal(item.status,'passed');assert.equal(item.commit,commit);assert.equal(item.productionWrites,0);assert.equal(item.applyAuthority,false);assert.equal(item.target,ref);assert.equal(item.sourceTree,gitAt(parentRoot,'rev-parse','HEAD^{tree}'));}
assert.equal(gate.sourceMigrations,438);assert.equal(gate.candidateMigrations,437);assert.equal(gate.migrations,429);assert.equal(gate.comparison.normalizedBytes,0);assert.equal(dry.productionMigrationsUnchanged,true);assert.equal(dry.pending.length,8);
const parentProof=readInventoryExportParent();
const sourceLab=base+'/full-439-v2',freeze=read(sourceLab+'/freeze.json'),proof=read(sourceLab+'/replay-result.json');
assert.equal(proof.status,'passed');assert.equal(proof.migrations,439);assert.equal(proof.fullReplay,true);assert.equal(proof.noOpPush,true);assert.equal(proof.project,'inventory-full-439-v2-20261008');assert.equal(freeze.project,proof.project);assert.equal(sha(sourceLab+'/supabase/config.toml'),freeze.configSha256);
const names=fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort();assert.equal(names.length,439);assert.deepEqual(names,Object.keys(freeze.sourceHashes).sort());
for(const [name,h]of Object.entries(freeze.sourceHashes)){assert.equal(sha(root+'/supabase/migrations/'+name),h,name);if(name!=='20261009010000_inventory_export_v1.sql')assert.equal(sha(parentRoot+'/supabase/migrations/'+name),h,name);assert.equal(sha(sourceLab+'/supabase/migrations/'+name),h,name);}
const packageHashes=inventoryExportReleaseSources(freeze.sourceHashes,read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json').sourceHashes);assert.equal(Object.keys(packageHashes).length,438);
const manifest='docs/release/PRODUCT_PORTABILITY_EVIDENCE_V1.json';assert.equal(sha(root+'/'+manifest),parentProof.manifestSha256);
assert.equal(ref,'ycdxbpibncqcchqiihfz');assert.equal(new URL(dbUrl).hostname,ref+'.supabase.co');assert.match(snapshotSql,/begin\b[^;]*\bread only;/i);
const prior='C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/replayed.private.json';
const out=base+'/release-baseline-'+Date.now();fs.mkdirSync(out);
const remote=(await query(snapshotSql))[0].receipt;assert.equal(remote.read_only,'on');assert.equal(remote.LEDGER.length,429);assert.deepEqual(remote.LEDGER,read(prior).LEDGER);assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
fs.writeFileSync(out+'/remote.private.json',JSON.stringify(remote),{flag:'wx'});
const comparison=await compareSnapshots(read(prior),remote,{reconcile:true,output:out+'/comparison'});
const result={status:'passed',at:new Date().toISOString(),qualifiedParent:commit,root,sourceMigrations:439,migrations:429,sourceHashes:freeze.sourceHashes,packageHashes,parentProof,comparison,sanity:remote.sanity,producerSha256:sha(fileURLToPath(import.meta.url)),productionWrites:0,localWrites:0,applyAuthority:false,out};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(result,null,2),{flag:'wx'});fs.writeFileSync(base+'/RELEASE_BASELINE_429.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,root,sourceMigrations:439,migrations:429,normalizedBytes:comparison.normalizedBytes,out}));
