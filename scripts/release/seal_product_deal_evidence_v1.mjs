// Seal reviewed, successful local runs; no production connection or apply.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dealRelease,dealReleaseSources} from '../schema/product_deal_release_scope_v1.mjs';
import {readDealReleaseState} from '../schema/product_deal_release_state_v1.mjs';
import {loadDealReleaseEvidence,validateDealRuntime} from '../schema/product_deal_release_evidence_v1.mjs';
assert.equal(process.argv.length,2);const {root,evidence,target}=dealRelease;
assert.equal(fs.realpathSync('.').replaceAll(String.fromCharCode(92),'/').toLowerCase(),root.toLowerCase());
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const parent=read('C:/grookai_vault_operator_artifacts/product_search_names_20261008/CHECKPOINT.json');assert.equal(parent.status,'qualified');assert.equal(parent.sourceFrozen,false);assert.equal(parent.labFrozen,false);
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',windowsHide:true}).trim();assert.equal(git('merge-base','HEAD',parent.commit),parent.commit);assert.equal(git('diff','--name-only',parent.commit,'--','apps','backend','lib','test','supabase','pubspec.yaml','pubspec.lock'),'');
const all=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
const packageHashes=dealReleaseSources(all,read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json').sourceHashes);
const selected=read(evidence+'/RUNTIME_SELECTION.json');assert.equal(selected.reviewed,true);assert.equal(selected.project,'deal-full-432-v1-20261008');
assert.deepEqual(Object.keys(selected.runs).sort(),['cost','idempotency','purchase','purchaseSql','shadow','trade','tradeSql']);
const candidates={cost:'receipt.json',purchase:'result.json',trade:'result.json',purchaseSql:'result.json',tradeSql:'result.json',idempotency:'receipt.json',shadow:'receipt.json'};
const artifacts={};
function add(key,path){assert.ok(path.startsWith('C:/grookai_vault_operator_artifacts/'));assert.ok(!path.includes('..'));assert.ok(fs.existsSync(path));artifacts[key]={path,sha256:sha(path)};return read(path);}
for(const [key,folder]of Object.entries(selected.runs)){
 assert.ok(/^[a-z][a-z0-9-]*$/.test(folder));const p=add(key,evidence+'/'+folder+'/'+candidates[key]);assert.equal(p.status,'passed');
 if(['cost','purchase','trade'].includes(key))validateDealRuntime(key,p,packageHashes);
}
for(const key of ['purchase','trade'])add(key+'Flags',evidence+'/'+selected.runs[key]+'/flags-restored.json');
add('shadowIntent',evidence+'/'+selected.runs.shadow+'/intent.json');add('shadowRetention',evidence+'/'+selected.runs.shadow+'/target-retention.json');add('shadowSchema',evidence+'/'+selected.runs.shadow+'/shadow-schema.private.json');
for(const [key,file]of [['cacheProof','proof.json'],['cacheIntent','intent.json'],['cacheBefore','before.json'],['cacheAfter','after.json']])add(key,evidence+'/shadow-cache-v2/'+file);
const product='C:/grookai_vault_operator_artifacts/product_offer_ui_20261008/',native=product+'market-1791451682546/',web=product+'market-1791451615590/',search='C:/grookai_vault_operator_artifacts/product_search_names_20261008/search-1791453545036/';
for(const [key,path]of Object.entries({productHook:'C:/grookai_vault_operator_artifacts/product_search_names_20261008/'+parent.normalChecks.receipt,nativeSource:native+'native-source.json',nativeProcess:native+'process-proof.json',nativeReadback:native+'database-readback.json',nativeReview:native+'review.json',nativeRetention:native+'retention.json',webRuntime:web+'web/receipt.json',webReview:web+'web/review.json',webRetention:web+'retention.json',searchRuntime:search+'receipt.json',searchSource:search+'source-binding.json',searchReview:search+'review.json'}))add(key,path);
const finalState={full:await readDealReleaseState('full',packageHashes),upgrade:await readDealReleaseState('upgrade',packageHashes)};
const statePath=evidence+'/sealed-state-'+Date.now()+'.json';fs.writeFileSync(statePath,JSON.stringify(finalState,null,2),{flag:'wx'});add('finalState',statePath);
const manifest={version:1,at:new Date().toISOString(),target,productCommit:parent.commit,packageHashes,artifacts,productionWrites:0,applyAuthority:false};
const destination=root+'/docs/release/PRODUCT_DEAL_RELEASE_EVIDENCE_V1.json';assert.ok(!fs.existsSync(destination),'Preserve a consumed manifest; explicitly reconcile before resealing');fs.writeFileSync(destination,JSON.stringify(manifest,null,2),{flag:'wx'});
const result=loadDealReleaseEvidence(root,packageHashes);console.log(JSON.stringify({status:'sealed_and_verified',productCommit:result.productCommit,manifestSha256:result.manifestSha256,artifactCount:Object.keys(artifacts).length}));
