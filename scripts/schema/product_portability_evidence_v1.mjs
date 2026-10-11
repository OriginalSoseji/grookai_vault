import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {portabilityRoot as root,portabilityEvidence as base,portabilityParent} from './product_portability_parent_v1.mjs';
import {portfolioHistoryReleaseSources} from './product_portfolio_history_release_scope_v1.mjs';
export const portabilityManifest='docs/release/PRODUCT_PORTABILITY_EVIDENCE_V1.json';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
export function loadPortabilityEvidence(){
 assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
 const m=read(root+'/'+portabilityManifest);
 assert.equal(m.version,1);assert.equal(m.qualifiedParent,portabilityParent);
 assert.equal(m.productionWrites,0);assert.equal(m.providerCalls,0);assert.equal(m.applyAuthority,false);
 const expected=['baseline','parent','recovery','webRuntime','webSource','webReview','nativeSource','nativeBuild','nativeProcess','nativeResponse','nativeReview','gatewaySource','retention'];
 assert.deepEqual(Object.keys(m.artifacts).sort(),expected.sort());
 const a={};for(const[k,v]of Object.entries(m.artifacts)){
  assert.ok(v.path.startsWith(base+'/'));assert.ok(!v.path.includes('..'));assert.equal(sha(v.path),v.sha256,k);a[k]=read(v.path);
 }
 for(const k of ['baseline','parent','webRuntime','webReview','nativeBuild','nativeProcess','nativeReview','retention'])assert.equal(a[k].status,'passed',k);
 assert.equal(a.baseline.migrations,429);assert.equal(a.baseline.sourceMigrations,438);assert.equal(a.baseline.comparison.normalizedBytes,0);
 const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
 assert.deepEqual(sources,a.baseline.sourceHashes);assert.deepEqual(sources,m.sourceHashes);
 assert.equal(a.parent.manifestSha256,a.baseline.parentProof.manifestSha256);
 assert.equal(a.recovery.status,'passed_data_unchanged_addresses_attested');assert.equal(a.recovery.proof.length,5);assert.equal(a.recovery.resetOrDelete,false);assert.equal(a.parent.recoverySha256,m.artifacts.recovery.sha256);
 for(const mode of ['full','upgrade']){const {address:before,...old}=a.baseline.parentProof.states[mode],{address:after,...now}=a.parent.states[mode];assert.deepEqual(now,old);assert.ok(before&&after);}
 assert.equal(a.webRuntime.checks.length,13);assert.deepEqual(a.webRuntime.errors,[]);assert.deepEqual(a.webRuntime.blocked,[]);assert.equal(a.webRuntime.productionWrites,0);assert.equal(a.webRuntime.providerCalls,0);
 for(const[p,h]of Object.entries(a.webSource.hashes))assert.equal(sha(root+'/'+p),h,p);
 for(const[review,source,count]of [['webReview','webSource',15],['nativeReview','nativeSource',9]]){
  assert.equal(a[review].sourceBindingSha256,m.artifacts[source].sha256);assert.equal(Object.keys(a[review].images).length,count);
  for(const[p,h]of Object.entries(a[review].images)){assert.match(p,/^[a-z-]+\.png$/);assert.equal(sha(path.dirname(m.artifacts[review].path)+'/'+p),h,p);}
 }
 assert.equal(a.nativeBuild.build,442);assert.equal(a.nativeBuild.globalTrustChanged,false);
 assert.equal(a.nativeProcess.package,'com.grookai.vault.portabilityproof');assert.equal(a.nativeProcess.protectedAppsUnchanged,true);
 const native=a.nativeResponse.proof;assert.equal(native.status,'passed');assert.equal(native.checks.length,5);assert.equal(native.providerCalls,0);assert.equal(native.productionWrites,0);assert.deepEqual(native.blocked,[]);assert.equal(native.actualMyAppEntry,true);assert.equal(native.syntheticFilePicker,true);assert.equal(native.syntheticShareAdapter,true);assert.equal(a.nativeReview.physicalDevice,true);
 for(const[p,h]of Object.entries(a.nativeSource.files))assert.equal(sha(root+'/'+p),h,p);
 assert.equal(Object.keys(a.nativeSource.files).length,a.nativeBuild.nativeFiles);assert.equal(sha(path.dirname(m.artifacts.nativeBuild.path)+'/acceptance.private.apk').toUpperCase(),a.nativeBuild.apkSha256);
 for(const[p,h]of Object.entries(a.gatewaySource.hashes))assert.equal(sha(root+'/'+p),h,p);
 assert.equal(a.gatewaySource.port,35841);assert.equal(a.gatewaySource.upstream,'http://127.0.0.1:35521');assert.equal(a.gatewaySource.dependencyFetches,0);
 assert.equal(a.retention.priorTables,361);assert.equal(a.retention.globalControlsChanged,false);assert.equal(a.retention.profileRowsCreated,0);assert.equal(a.retention.productionWrites,0);
 assert.equal(sha(a.retention.restorationReceipt),a.retention.restorationSha256);assert.equal(sha(root+'/'+a.retention.fixtureProducer),a.retention.fixtureProducerSha256);
 for(const[p,h]of Object.entries(m.producers))assert.equal(sha(root+'/'+p),h,p);
 for(const[p,h]of Object.entries(m.externalProducers)){assert.ok(p.startsWith(base+'/'));assert.equal(sha(p),h,p);}
 const baseline429=read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json');
 return {packageHashes:portfolioHistoryReleaseSources(sources,baseline429.sourceHashes),states:a.parent.states,sourceHashes:sources,manifestSha256:sha(root+'/'+portabilityManifest),artifacts:m.artifacts};
}
