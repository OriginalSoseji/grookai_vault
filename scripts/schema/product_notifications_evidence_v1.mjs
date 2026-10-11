import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {notificationsRoot as root,notificationsEvidence as base,notificationsParent} from './product_notifications_parent_v1.mjs';
import {portfolioHistoryReleaseSources} from './product_portfolio_history_release_scope_v1.mjs';
export const notificationsManifest='docs/release/PRODUCT_NOTIFICATIONS_EVIDENCE_V1.json';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
export function loadNotificationsEvidence(){
 assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
 const m=read(root+'/'+notificationsManifest);assert.equal(m.version,1);assert.equal(m.qualifiedParent,notificationsParent);assert.equal(m.productionWrites,0);assert.equal(m.providerCalls,0);assert.equal(m.applyAuthority,false);
 const expected=['baseline','recovery','parent','auth','webRuntime','webSource','webReview','nativeSource','nativeBuild','nativeProcess','nativeResponse','nativeReview','retention','quietRuntime','quietBinding'];
 assert.deepEqual(Object.keys(m.artifacts).sort(),expected.sort());
 const a={};for(const[k,v]of Object.entries(m.artifacts)){assert.ok(v.path.startsWith(base+'/'));assert.ok(!v.path.includes('..'));assert.equal(sha(v.path),v.sha256,k);a[k]=read(v.path);}
 for(const k of ['baseline','parent','auth','webRuntime','webReview','nativeBuild','nativeProcess','nativeReview','retention','quietRuntime','quietBinding'])assert.equal(a[k].status,'passed',k);
 assert.equal(a.baseline.migrations,429);assert.equal(a.baseline.sourceMigrations,438);assert.equal(a.baseline.comparison.normalizedBytes,0);
 const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
 assert.deepEqual(sources,a.baseline.sourceHashes);assert.deepEqual(sources,m.sourceHashes);
 assert.equal(a.recovery.status,'passed_data_unchanged_addresses_attested');assert.equal(a.recovery.proof.length,5);assert.equal(a.recovery.resetOrDelete,false);assert.equal(a.recovery.productionWrites,0);assert.equal(a.parent.recoverySha256,m.artifacts.recovery.sha256);
 assert.equal(a.auth.cases.length,14);assert.equal(a.auth.providerCalls,0);assert.equal(a.auth.productionWrites,0);
 assert.equal(a.webRuntime.checks.length,12);assert.deepEqual(a.webRuntime.errors,[]);assert.deepEqual(a.webRuntime.blocked,[]);assert.equal(a.webRuntime.productionWrites,0);assert.equal(a.webRuntime.providerCalls,0);
 for(const[p,h]of Object.entries(a.webSource.hashes))assert.equal(sha(root+'/'+p),h,p);
 for(const[review,source,count]of [['webReview','webSource',10],['nativeReview','nativeSource',7]]){
  assert.equal(a[review].sourceBindingSha256,m.artifacts[source].sha256);assert.equal(Object.keys(a[review].images).length,count);
  for(const[p,h]of Object.entries(a[review].images)){assert.match(p,/^[a-z-]+\.png$/);assert.equal(sha(path.dirname(m.artifacts[review].path)+'/'+p),h,p);}
 }
 assert.equal(a.nativeBuild.build,441);assert.equal(a.nativeBuild.globalTrustChanged,false);
 assert.equal(a.nativeProcess.package,'com.grookai.vault.notificationsproof');assert.equal(a.nativeProcess.protectedAppsUnchanged,true);
 const native=a.nativeResponse.proof;assert.equal(native.status,'passed');assert.equal(native.checks.length,6);assert.equal(native.providerCalls,0);assert.equal(native.productionWrites,0);assert.equal(native.permissionRequests,1);assert.deepEqual(native.blocked,[]);assert.equal(native.actualMyAppEntry,true);assert.equal(native.profileCreated,false);assert.equal(a.nativeReview.physicalDevice,true);
 for(const[p,h]of Object.entries(a.nativeSource.files))assert.equal(sha(root+'/'+p),h,p);
 assert.equal(Object.keys(a.nativeSource.files).length,a.nativeBuild.nativeFiles);assert.equal(sha(path.dirname(m.artifacts.nativeBuild.path)+'/acceptance.private.apk').toUpperCase(),a.nativeBuild.apkSha256);
 assert.equal(a.retention.priorTables,361);assert.equal(a.retention.globalControlsChanged,false);assert.equal(a.retention.profileRowsCreated,0);assert.equal(a.retention.productionWrites,0);assert.equal(a.retention.providerCalls,0);assert.equal(a.retention.activeFixtureTokens,0);
 assert.equal(sha(a.retention.restorationReceipt),a.retention.restorationSha256);assert.equal(sha(root+'/'+a.retention.fixtureProducer),a.retention.fixtureProducerSha256);
 assert.equal(a.quietRuntime.sourceSha256,sha(root+'/supabase/functions/_shared/notification_quiet_hours_v1.ts'));assert.equal(a.quietRuntime.cases.length,6);assert.equal(a.quietRuntime.timezones,418);assert.deepEqual(a.quietRuntime.unsupported,[]);
 assert.equal(a.quietBinding.originalRuntimeSha256,m.artifacts.quietRuntime.sha256);for(const[p,h]of Object.entries(a.quietBinding.sources))assert.equal(sha(root+'/'+p),h,p);
 for(const[p,h]of Object.entries(m.producers))assert.equal(sha(root+'/'+p),h,p);
 for(const[p,h]of Object.entries(m.externalProducers)){assert.ok(p.startsWith(base+'/'));assert.equal(sha(p),h,p);}
 const baseline429=read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json');
 return {packageHashes:portfolioHistoryReleaseSources(sources,baseline429.sourceHashes),states:a.parent.states,sourceHashes:sources,manifestSha256:sha(root+'/'+notificationsManifest),artifacts:m.artifacts};
}
