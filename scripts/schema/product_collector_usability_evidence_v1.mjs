import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {collectorRoot as root,collectorEvidence as base,collectorParent} from './product_collector_usability_parent_v1.mjs';
import {portfolioHistoryReleaseSources} from './product_portfolio_history_release_scope_v1.mjs';
export const collectorManifest='docs/release/PRODUCT_COLLECTOR_USABILITY_EVIDENCE_V1.json';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
export function loadCollectorUsabilityEvidence(){
 assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
 const m=read(root+'/'+collectorManifest);
 assert.equal(m.version,1);assert.equal(m.qualifiedParent,collectorParent);assert.equal(m.productionWrites,0);assert.equal(m.applyAuthority,false);
 const expected=['baseline','webBeforeRuntime','webBeforeSource','webRuntime','webSource','webReview','publicWebRuntime','publicWebSource','publicWebReview','collaboration','nativeSource','nativeBuild','nativeProcess','nativeResponse','nativeReview','retention'];
 assert.deepEqual(Object.keys(m.artifacts).sort(),expected.sort());
 const a={};for(const[k,v]of Object.entries(m.artifacts)){assert.ok(v.path.startsWith(base+'/'));assert.ok(!v.path.includes('..'));assert.equal(sha(v.path),v.sha256,k);a[k]=read(v.path);}
 for(const k of expected.filter(k=>!['webBeforeSource','webSource','publicWebSource','nativeSource'].includes(k)))assert.equal(a[k].status,'passed',k);
 assert.equal(a.baseline.migrations,429);assert.equal(a.baseline.sourceMigrations,438);assert.equal(a.baseline.comparison.normalizedBytes,0);
 const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
 assert.deepEqual(sources,a.baseline.sourceHashes);assert.deepEqual(sources,m.sourceHashes);
 assert.equal(a.webBeforeRuntime.checks.length,2);assert.ok(a.webBeforeRuntime.checks.every(v=>v.privateContentRemainsAfterSignOut===true));
 // This is pre-fix evidence. The fresh checkout used Git LF bytes; some clean
 // parent working files use CRLF. Accept only that explicit text conversion.
 for(const[p,h]of Object.entries(a.webBeforeSource.hashes)){
  const original=fs.readFileSync('C:/gv_product_collector_home_20261008/'+p);
  const raw=createHash('sha256').update(original).digest('hex');
  if(raw!==h){const text=original.toString('utf8');assert.deepEqual(Buffer.from(text),original,p);assert.equal(createHash('sha256').update(text.replaceAll('\r\n','\n')).digest('hex'),h,p);}
 }
 for(const[k,count]of [['webRuntime',15],['publicWebRuntime',3]]){assert.equal(a[k].checks.length,count);assert.deepEqual(a[k].errors,[]);assert.deepEqual(a[k].blocked,[]);assert.equal(a[k].productionWrites,0);}
 for(const k of ['webSource','publicWebSource'])for(const[p,h]of Object.entries(a[k].hashes))assert.equal(sha(root+'/'+p),h,p);
 for(const [review,source,count]of [['webReview','webSource',15],['publicWebReview','publicWebSource',4],['nativeReview','nativeSource',7]]){
  assert.equal(a[review].sourceBindingSha256,m.artifacts[source].sha256);assert.equal(Object.keys(a[review].images).length,count);
  for(const[p,h]of Object.entries(a[review].images)){assert.match(p,/^[a-z-]+\.png$/);assert.equal(sha(path.dirname(m.artifacts[review].path)+'/'+p),h,p);}
 }
 for(const key of ['actualAuth','copyOwnershipUnchanged','foreignCopyDenied','publicProgressRequiresContentConsent','privateIdentityAbsent','withdrawalRetainsCopy'])assert.equal(a.collaboration[key],true,key);
 assert.equal(a.collaboration.steps.length,10);assert.equal(a.collaboration.productionWrites,0);assert.equal(a.collaboration.externalDeliveries,0);
 assert.equal(a.collaboration.producerSha256,m.producers['scripts/audits/product_collector_usability_collaboration_v1.mjs']);
 assert.equal(a.nativeBuild.build,440);assert.equal(a.nativeBuild.globalTrustChanged,false);
 assert.equal(a.nativeProcess.package,'com.grookai.vault.collectorusabilityproof');assert.equal(a.nativeProcess.protectedAppsUnchanged,true);
 for(const k of ['actualMyApp','actualAuth','ownerReplaced','goalsExpandedAndCollapsed','emptyRecentlyAddedRemoved'])assert.equal(a.nativeResponse[k],true,k);
 assert.equal(a.nativeResponse.profileCreated,false);assert.equal(a.nativeResponse.screens,7);assert.equal(a.nativeReview.physicalDevice,true);
 for(const[p,h]of Object.entries(a.nativeSource.files))assert.equal(sha(root+'/'+p),h,p);
 assert.equal(Object.keys(a.nativeSource.files).length,a.nativeBuild.nativeFiles);
 assert.equal(sha(path.dirname(m.artifacts.nativeBuild.path)+'/acceptance.private.apk').toUpperCase(),a.nativeBuild.apkSha256);
 assert.equal(a.retention.controlsRestored,true);assert.equal(a.retention.priorTables,360);assert.equal(a.retention.profileRowsCreated,0);assert.equal(a.retention.productionWrites,0);
 assert.ok(a.retention.restorationReceipt.startsWith(base+'/'));assert.equal(sha(a.retention.restorationReceipt),a.retention.restorationSha256);
 assert.equal(sha(root+'/'+a.retention.fixtureProducer),a.retention.fixtureProducerSha256);
 for(const[p,h]of Object.entries(m.producers))assert.equal(sha(root+'/'+p),h,p);
 for(const[p,h]of Object.entries(m.externalProducers)){assert.ok(p.startsWith(base+'/'));assert.equal(sha(p),h,p);}
 const baseline429=read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json');
 return {packageHashes:portfolioHistoryReleaseSources(sources,baseline429.sourceHashes),states:a.baseline.parentProof.states,sourceHashes:sources,manifestSha256:sha(root+'/'+collectorManifest),artifacts:m.artifacts};
}
