// Immutable, checked-in artifact selection is sealed only after actual runs pass.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {dealRelease,validateDealShadow} from './product_deal_release_scope_v1.mjs';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
export function validateDealRuntime(kind,p,packageHashes){
 assert.equal(p.status,'passed');assert.equal(p.project,'deal-full-432-v1-20261008');assert.equal(p.productionWrites,0);
 assert.deepEqual(p.packageHashes,packageHashes);assert.match(p.producerSha256,/^[a-f0-9]{64}$/);
 if(kind==='cost'){
  assert.equal(p.failure,undefined);assert.equal(p.releasePackage,true);assert.equal(p.flagsRestoredOff,true);assert.equal(p.priorFixturesUnchanged,true);assert.equal(p.resetsAfterPopulation,0);
  assert.equal(p.checks.length,9);assert.ok(p.checks.some(v=>v.startsWith('50 oversized legacy costs')));assert.equal(p.fixtureOwnerIds.length,2);
 }else if(kind==='purchase'){
  for(const k of ['concurrentIdentical','changedRetryRejected','ownerIsolation','lastLineRollback','zeroCost','mixedQuickAndCanonical','featureOffRecovery','legacySaleAfterPurchase'])assert.equal(p[k],true,k);
  assert.equal(p.distinctIncomingCopies,53);assert.equal(p.saleSnapshots,1);assert.equal(p.resets,0);assert.equal(p.retainedTables,13);
  assert.equal(p.sourceSha256,dealRelease.added['20261008021000_vendor_purchase_v1.sql']);
 }else if(kind==='trade'){
  for(const k of ['concurrentIdentical','concurrentChanged','allEntryDependenciesEnforced','changedRetryAndRecoveryRejected','ownerIsolation','lastLineRollback','foreignOutgoingRollback','explicitAgreedCost','outgoingCostSnapshot','privateOutgoingIdOmitted','zeroCost','mixedUnknownReferences','wholeLineQuickCredit','evenAndPayoutBalances','fiftyDistinctIncoming','featureOffRecovery','legacySaleAndPurchaseAfterNewTrade','mixedBookRoundTrip'])assert.equal(p[k],true,k);
  assert.equal(p.resets,0);assert.equal(p.retainedTables,13);assert.equal(p.sourceSha256,dealRelease.added['20261008060000_vendor_negotiated_trade_v1.sql']);
 }else throw Error('Unknown proof kind');
 return {kind,actualAuthRpc:true,exactPackage:true};
}
export function validateDealDependencyCache(proof,intent,before,after,shadowIntent){
 assert.equal(proof.status,'passed');assert.equal(proof.sourceUnchanged,true);assert.equal(proof.exactCopy,true);assert.equal(proof.network,'none');assert.equal(proof.certificateChanges,0);
 assert.equal(intent.sourceReadOnly,true);assert.equal(intent.productionWrites,0);assert.equal(intent.certificateChanges,0);assert.equal(intent.source,'supabase_edge_runtime_cost-shadow-430-v7-20261007');assert.equal(intent.project,shadowIntent.project);assert.equal(intent.target,'supabase_edge_runtime_'+shadowIntent.project);
 assert.equal(intent.sourceQualifiedReceiptSha256,'810766a4b1ddc9301c88b5642a37ea59eabec46a61d5a5a21f3e2583ec4fb1bc');
 assert.equal(proof.entries,before.length);assert.ok(proof.entries>0);assert.deepEqual(after,before);assert.equal(createHash('sha256').update(JSON.stringify(before)).digest('hex'),proof.manifestSha256);assert.equal(shadowIntent.dependencyCache.manifestSha256,proof.manifestSha256);
 return {entries:proof.entries,sourceUnchanged:true,certificateChanges:0};
}
export function reviewedDealImages(kind,review){
 const expected={webReview:8,nativeReview:7,searchReview:2};assert.ok(Object.hasOwn(expected,kind));assert.equal(review.status,'reviewed');
 const images=kind==='webReview'?review.inspected:review.images;assert.ok(Array.isArray(images));assert.equal(images.length,expected[kind]);assert.equal(new Set(images.map(r=>r.name)).size,images.length);
 for(const row of images){assert.equal(typeof row.name,'string');assert.ok(!row.name.includes('..')&&!row.name.startsWith('/'));assert.match(row.sha256,/^[a-f0-9]{64}$/);}
 return images;
}
export function loadDealReleaseEvidence(root,packageHashes){
 assert.equal(root.replaceAll(String.fromCharCode(92),'/').toLowerCase(),dealRelease.root.toLowerCase());
 const manifest=read(root+'/docs/release/PRODUCT_DEAL_RELEASE_EVIDENCE_V1.json');
 assert.equal(manifest.version,1);assert.equal(manifest.target,dealRelease.target);assert.equal(manifest.productionWrites,0);assert.equal(manifest.applyAuthority,false);
 assert.deepEqual(manifest.packageHashes,packageHashes);assert.match(manifest.productCommit,/^[a-f0-9]{40}$/);
 const loaded={};
 for(const [key,item] of Object.entries(manifest.artifacts)){
  assert.ok(item.path.startsWith('C:/grookai_vault_operator_artifacts/'));assert.ok(!item.path.includes('..'));
  assert.equal(sha(item.path),item.sha256,key+' artifact changed');loaded[key]=read(item.path);
 }
 const hook=loaded.productHook;assert.equal(hook.status,'passed');assert.equal(hook.mode,'commit');assert.equal(hook.finalHead,manifest.productCommit);assert.equal(hook.exitCode,0);assert.equal(hook.localReadOnly,true);assert.equal(hook.productionWrites,0);assert.deepEqual(hook.after,hook.before);assert.equal(hook.after.migrations,433);assert.equal(Object.keys(hook.after.retained).length,32);assert.equal(sha(hook.out+'/checks.private.log'),hook.logSha256);
 for(const kind of ['cost','purchase','trade']){validateDealRuntime(kind,loaded[kind],packageHashes);assert.equal(sha(root+'/scripts/audits/product_deal_'+kind+'_rpc_v1.mjs'),loaded[kind].producerSha256);}
 for(const kind of ['purchase','trade']){assert.equal(Object.keys(loaded[kind+'Flags'].flags).length,kind==='purchase'?5:8);assert.ok(Object.values(loaded[kind+'Flags'].flags).every(v=>v===false));}
 for(const kind of ['purchaseSql','tradeSql']){const p=loaded[kind];assert.equal(p.status,'passed');assert.equal(p.readOnly,true);assert.equal(p.localWrites,0);assert.equal(p.productionWrites,0);assert.deepEqual(p.packageHashes,packageHashes);assert.equal(sha(root+'/scripts/audits/product_deal_'+(kind==='purchaseSql'?'purchase':'trade')+'_sql_v1.mjs'),p.producerSha256);assert.ok(p.cases>0);}
 assert.equal(loaded.tradeSql.cases,79);
 const idem=loaded.idempotency;assert.equal(idem.status,'passed');assert.equal(idem.allRowsUnchanged,true);assert.equal(idem.ledgerUnchanged,true);assert.equal(idem.productionWrites,0);assert.equal(idem.resets,0);assert.deepEqual(idem.packageHashes,packageHashes);assert.deepEqual(idem.migrationHashes,dealRelease.added);assert.equal(sha(root+'/scripts/schema/verify_product_deal_idempotency_v1.mjs'),idem.producerSha256);
 assert.equal(loaded.shadowSchema.read_only,'on');assert.deepEqual(loaded.shadowSchema.LEDGER,Object.keys(packageHashes).map(n=>({version:n.split('_')[0]})));
 const cache=validateDealDependencyCache(loaded.cacheProof,loaded.cacheIntent,loaded.cacheBefore,loaded.cacheAfter,loaded.shadowIntent);
 assert.equal(sha(manifest.artifacts.cacheProof.path),loaded.shadowIntent.dependencyCache.proofSha256);assert.equal(sha(manifest.artifacts.cacheIntent.path),loaded.shadowIntent.dependencyCache.intentSha256);
 const shadow=validateDealShadow(loaded.shadow,loaded.shadowIntent,loaded.shadowRetention,packageHashes);assert.equal(sha(loaded.shadow.out+'/pull.private.log'),loaded.shadow.logSha256);assert.equal(sha(root+'/scripts/release/product_deal_shadow_v1.mjs'),loaded.shadowIntent.producerSha256);
 for(const file of ['raw.sql','normalized.sql'])assert.equal(fs.readFileSync(loaded.shadow.out+'/shadow-comparison/'+file,'utf8'),'');
 for(const [p,h]of Object.entries(loaded.nativeSource.files))assert.equal(sha(root+'/'+p),h,p);assert.equal(Object.keys(loaded.nativeSource.files).length,356);
 for(const [p,h]of Object.entries(loaded.webReview.sourceFiles))assert.equal(sha(root+'/'+p),h,p);
 for(const [p,h]of Object.entries(loaded.searchSource.bindings))assert.equal(sha(root+'/'+p),h,p);
 assert.equal(loaded.nativeSource.build,429);assert.equal(sha('C:/grookai_vault_operator_artifacts/product_offer_ui_20261008/market-1791451682546/acceptance.private.apk').toUpperCase(),loaded.nativeProcess.apkSha256);
 assert.equal(loaded.nativeProcess.status,'passed');assert.equal(loaded.nativeProcess.primaryAppPathUnchanged,true);assert.equal(loaded.nativeProcess.processIds.length,2);assert.notEqual(...loaded.nativeProcess.processIds);
 assert.equal(loaded.nativeReadback.status,'passed');assert.equal(loaded.nativeReadback.exactHeldBytesBeforeOpen,true);assert.equal(loaded.nativeReadback.exactHeldTermsAfterOpen,true);assert.equal(loaded.nativeReadback.agreedMinor,700);assert.equal(loaded.nativeReadback.referenceMinor,1234);assert.equal(loaded.nativeReadback.createdCopies,0);assert.equal(loaded.nativeReadback.completedReceipts,0);
 for(const key of ['webRuntime','searchRuntime']){assert.equal(loaded[key].status,'passed');assert.equal(loaded[key].productionWrites,0);}
 assert.equal(loaded.webRuntime.actualAuthRpc,true);assert.equal(loaded.webRuntime.failure,null);assert.equal(loaded.searchRuntime.actualLocalRpc,true);assert.equal(loaded.searchRuntime.checks.length,16);
 for(const key of ['webRetention','nativeRetention']){assert.equal(loaded[key].status,'passed');assert.equal(loaded[key].retainedTables,31);assert.equal(loaded[key].controlsRestored,true);assert.equal(loaded[key].pointerRestoredToAbsent,true);}
 for(const key of ['webReview','nativeReview','searchReview']){assert.equal(loaded[key].status,'reviewed');const dir=manifest.artifacts[key].path.slice(0,manifest.artifacts[key].path.lastIndexOf('/'));for(const row of reviewedDealImages(key,loaded[key]))assert.equal(sha(dir+'/'+row.name),row.sha256);}
 return {productCommit:manifest.productCommit,manifestSha256:sha(root+'/docs/release/PRODUCT_DEAL_RELEASE_EVIDENCE_V1.json'),shadow,cache,artifacts:manifest.artifacts,finalState:loaded.finalState};
}
