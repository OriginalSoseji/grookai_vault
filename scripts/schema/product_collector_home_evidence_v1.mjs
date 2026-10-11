import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {collectorRoot as root,collectorEvidence as base,collectorParent} from './product_collector_home_parent_v1.mjs';
import {portfolioHistoryReleaseSources} from './product_portfolio_history_release_scope_v1.mjs';
export const collectorManifest='docs/release/PRODUCT_COLLECTOR_HOME_EVIDENCE_V1.json';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function loadCollectorHomeEvidence(){
 assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
 const m=JSON.parse(fs.readFileSync(root+'/'+collectorManifest));
 assert.equal(m.version,1);assert.equal(m.qualifiedParent,collectorParent);assert.equal(m.productionWrites,0);assert.equal(m.applyAuthority,false);
 const expected=['baseline','privateAdd','webRuntime','webSource','webReview','nativeSource','nativeBuild','nativeProcess','nativeResponse','nativeReview','retention'];
 assert.deepEqual(Object.keys(m.artifacts).sort(),expected.sort());
 const a={};for(const[k,v]of Object.entries(m.artifacts)){assert.ok(v.path.startsWith(base+'/'));assert.ok(!v.path.includes('..'));assert.equal(sha(v.path),v.sha256,k);a[k]=JSON.parse(fs.readFileSync(v.path));}
 for(const k of ['baseline','privateAdd','webRuntime','webReview','nativeBuild','nativeProcess','nativeResponse','nativeReview','retention'])assert.equal(a[k].status,'passed',k);
 assert.equal(a.baseline.migrations,429);assert.equal(a.baseline.sourceMigrations,438);assert.equal(a.baseline.comparison.normalizedBytes,0);
 const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
 assert.deepEqual(sources,a.baseline.sourceHashes);assert.deepEqual(sources,m.sourceHashes);
 for(const k of ['actualAuth','actualEdgeHandler','businessSourceUnchanged'])assert.equal(a.privateAdd[k],true,k);
 assert.equal(a.privateAdd.profileRowsCreated,0);assert.equal(a.privateAdd.cases.length,5);
 assert.equal(a.webRuntime.checks.length,6);assert.deepEqual(a.webRuntime.errors,[]);assert.deepEqual(a.webRuntime.blocked,[]);
 for(const[p,h]of Object.entries(a.webSource.hashes))assert.equal(sha(root+'/'+p),h,p);
 assert.equal(a.webReview.sourceBindingSha256,m.artifacts.webSource.sha256);
 assert.equal(Object.keys(a.webReview.images).length,9);
 for(const[p,h]of Object.entries(a.webReview.images)){assert.match(p,/^[a-z-]+\.png$/);assert.equal(sha(path.dirname(m.artifacts.webReview.path)+'/'+p),h,p);}
 assert.equal(a.nativeBuild.build,439);assert.equal(a.nativeBuild.globalTrustChanged,false);
 assert.equal(a.nativeProcess.package,'com.grookai.vault.collectorhomeproof');assert.equal(a.nativeProcess.protectedAppsUnchanged,true);
 assert.equal(a.nativeResponse.actualMyApp,true);assert.equal(a.nativeResponse.actualAuth,true);assert.equal(a.nativeResponse.ownerReplaced,true);assert.equal(a.nativeResponse.profileCreated,false);assert.equal(a.nativeResponse.screens,6);
 for(const[p,h]of Object.entries(a.nativeSource.files))assert.equal(sha(root+'/'+p),h,p);
 assert.equal(Object.keys(a.nativeSource.files).length,a.nativeBuild.nativeFiles);
 assert.equal(sha(path.dirname(m.artifacts.nativeBuild.path)+'/acceptance.private.apk').toUpperCase(),a.nativeBuild.apkSha256);
 assert.equal(a.nativeReview.sourceBindingSha256,m.artifacts.nativeSource.sha256);assert.equal(a.nativeReview.physicalDevice,true);assert.equal(Object.keys(a.nativeReview.images).length,6);
 for(const[p,h]of Object.entries(a.nativeReview.images)){assert.match(p,/^collector-home-[a-z-]+\.png$/);assert.equal(sha(path.dirname(m.artifacts.nativeReview.path)+'/'+p),h,p);}
 assert.equal(a.retention.controlsRestored,true);assert.equal(a.retention.priorTables,360);assert.equal(a.retention.profileRowsCreated,0);assert.equal(a.retention.productionWrites,0);
 for(const[p,h]of Object.entries(m.producers))assert.equal(sha(root+'/'+p),h,p);
 const baseline429=JSON.parse(fs.readFileSync('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json'));
 return {packageHashes:portfolioHistoryReleaseSources(sources,baseline429.sourceHashes),states:a.baseline.parentProof.states,sourceHashes:sources,manifestSha256:sha(root+'/'+collectorManifest),artifacts:m.artifacts};
}
