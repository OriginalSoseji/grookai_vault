// Exact source and retained local proofs; this loader never grants apply authority.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {discountRelease,discountReleaseSources} from './product_discount_release_scope_v1.mjs';
import {validateDealDependencyCache} from './product_deal_release_evidence_v1.mjs';
export const discountManifest='docs/release/PRODUCT_DISCOUNT_EVIDENCE_V1.json';
export const discountEvidenceKeys=['baseline','parent','fullReplay','upgrade','rpc','rpcIntent','rpcFlags','cancellation','oldWriters','sql','reapply','shadow','shadowIntent','shadowRetention','cacheProof','cacheIntent','cacheBefore','cacheAfter','webRuntime','webSource','webRetention','webReview','nativeSource','nativeBuild','nativeProcess','nativeRetention','nativeReview','nativePhase1','nativePhase2','nativeDbProof','finalState'].sort();
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function validateDiscountShadow(r,intent,retention,hashes){
 assert.equal(r.status,'passed');assert.equal(r.failure,undefined);assert.equal(r.exit,1);assert.equal(r.project,'discount-rel-shadow-435-v1-20261008');assert.equal(r.targetProject,'discount-rel-full-435-v1-20261008');
 for(const k of ['productionWrites','targetWrites','retainedFixtureResets'])assert.equal(r[k],0,k);
 assert.equal(r.shadowCaptured,true);assert.equal(r.comparison.rawBytes,0);assert.equal(r.comparison.normalizedBytes,0);assert.equal(r.comparison.scope,'public');assert.ok(r.comparison.securityObjects>1200);
 assert.equal(intent.project,r.project);assert.equal(intent.targetProject,r.targetProject);assert.equal(intent.targetReadOnly,true);assert.equal(intent.apply,false);assert.deepEqual(intent.sourceHashes,hashes);
 assert.equal(Object.keys(retention.before).length,31);assert.deepEqual(retention.after,retention.before);
}
export function validateDiscountDevice(build,process,first,second,db){
 assert.equal(build.status,'passed');assert.equal(build.build,434);assert.equal(build.nativeFiles,371);assert.equal(build.globalTrustChanged,false);
 assert.equal(process.status,'passed');assert.equal(process.primaryAppPathUnchanged,true);assert.equal(process.apkSha256,build.apkSha256);assert.equal(process.processIds.length,2);assert.notEqual(process.processIds[0],process.processIds[1]);
 assert.match(build.apkSha256,/^[A-F0-9]{64}$/);for(const pid of process.processIds)assert.match(String(pid),/^[1-9][0-9]*$/);
 assert.equal(first.phase,'discount_pending');assert.equal(second.phase,'discount_recovered');assert.equal(first.owner,second.owner);
 const pending=JSON.parse(first.pendingRaw),drafts=JSON.parse(first.draftRaw);assert.equal(pending.cart.version,6);assert.equal(pending.cart.discountMinor,2000);assert.equal(pending.cart.taxMinor,100);assert.equal(drafts.version,4);assert.equal(first.receipt.id,pending.id);assert.equal(first.receipt.totalMinor,18100);
 for(const key of ['exactPendingAndDraftRetained','noSecondCompletion','pendingClearedAfterReceipt','heldKindsRetained','accountClosed'])assert.equal(second[key],true,key);
 assert.equal(db.status,'passed');assert.equal(db.owner,first.owner);assert.equal(db.requestId,pending.id);assert.equal(db.receiptCount,2);assert.equal(db.exactRequest,true);assert.equal(db.allEntryDisabled,true);assert.equal(db.productionWrites,0);
}
export function validateDiscountCancellation(r){
 assert.equal(r.productionWrites,0);for(const k of ['immutable','entryOff','ownerIsolated','legacyRollback'])assert.equal(r[k],true,k);
 assert.notEqual(r.completed,r.cancelled);assert.equal(r.lockEvidence.length,4);
 assert.deepEqual(r.lockEvidence.map(x=>x.name),['vendor_sales_cart_complete_v6','vendor_sales_cart_cancel_v1','vendor_sales_cart_cancel_v1','vendor_sales_cart_complete_v6']);
 for(const x of r.lockEvidence){assert.ok(Number.isSafeInteger(x.pid)&&x.pid>0);assert.ok(x.blockers.length>0);assert.ok(x.blockers.every(p=>Number.isSafeInteger(p)&&p>0&&p!==x.pid));}
}
export function loadDiscountEvidence(){
 const root=discountRelease.root;assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
 const m=read(root+'/'+discountManifest);assert.equal(m.version,1);assert.equal(m.target,discountRelease.target);assert.equal(m.productionWrites,0);assert.equal(m.applyAuthority,false);assert.equal(m.qualifiedParent,'072705f76bc7c11cb49c6d1108c971aaf9042989');
 assert.deepEqual(Object.keys(m.artifacts).sort(),discountEvidenceKeys);
 const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
 const baseline=read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json');const packageHashes=discountReleaseSources(sources,baseline.sourceHashes);assert.deepEqual(m.sourceHashes,sources);assert.deepEqual(m.packageHashes,packageHashes);
 const a={};for(const [k,v]of Object.entries(m.artifacts)){assert.ok(v.path.startsWith(discountRelease.evidence+'/'));assert.ok(!v.path.includes('..'));assert.equal(sha(v.path),v.sha256,k+' evidence changed');a[k]=read(v.path);}
 for(const k of ['baseline','fullReplay','upgrade','rpc','sql','reapply','webRuntime','webRetention','nativeRetention']){assert.equal(a[k].status,'passed',k);assert.equal(a[k].productionWrites,0,k);}
 assert.equal(a.baseline.sourceMigrations,436);assert.equal(a.baseline.migrations,429);assert.equal(a.baseline.localWrites,0);assert.equal(a.baseline.comparison.normalizedBytes,0);
 for(const k of ['fullReplay','upgrade']){assert.equal(a[k].migrations,435);assert.equal(a[k].project,'discount-rel-'+(k==='fullReplay'?'full':'upgrade')+'-435-v1-20261008');}
 assert.equal(a.fullReplay.fullReplay,true);assert.equal(a.fullReplay.noOpPush,true);assert.equal(a.upgrade.allFixtureRowsUnchanged,true);assert.equal(a.upgrade.resetsAfterPopulation,0);assert.equal(a.upgrade.retainedCostSnapshots,3);assert.equal(a.upgrade.retainedTables,19);assert.equal(a.upgrade.comparison.normalizedBytes,0);
 const discountHash=discountRelease.migrations['20261008160000_vendor_discounts_v1.sql'];
 assert.equal(a.rpc.project,'discount-rel-full-435-v1-20261008');assert.equal(a.rpc.sourceSha256,discountHash);assert.equal(a.rpc.resets,0);assert.equal(a.rpc.retainedTables,20);
 for(const k of ['actualAuthRpc','cancellationFenced','cancellationEntryOff','cancellationRaces','cancelledIdLegacyRollback','oldWritersUnchanged','concurrentIdentical','concurrentChanged','allEntryDependenciesEnforced','changedRetryAndRecoveryRejected','ownerIsolation','foreignCopyRollback','unavailableCopyRollback','lateBookFailureRollsBackCopies','zeroNetDisposition','oldZeroWriterStillRefuses','privateHelperDenied','captureOffWhileBlockedStillCaptures','knownZeroAndMissingCosts','exactAllocationAndNetProfit','fiftyLineRounding','zeroAndFullDiscount','legacySaleBuyTradeCompatible','mixedBookRoundTrip','eventTotalsAndCsv','customerCostPrivacy','entryOffExactRecovery','originalSnapshotRetained'])assert.equal(a.rpc[k],true,k);
 assert.equal(a.rpcIntent.producerSha256,sha(root+'/scripts/audits/product_discount_release_rpc_v1.mjs'));assert.equal(Object.keys(a.rpcFlags.flags).length,8);assert.ok(Object.values(a.rpcFlags.flags).every(v=>v===false));assert.deepEqual(a.rpcFlags.cost,{edit_enabled:false,capture_enabled:false});validateDiscountCancellation(a.cancellation);
 assert.equal(a.sql.cases,84);assert.equal(a.sql.readOnly,true);assert.equal(a.sql.localWrites,0);assert.equal(a.sql.sourceSha256,discountHash);for(const[p,h]of Object.entries(a.sql.vectorHashes))assert.equal(sha(root+'/test/fixtures/'+p),h,p);
 assert.equal(a.reapply.rowsUnchanged,true);assert.equal(a.reapply.discountAndCancellationReapplied,true);assert.equal(a.reapply.retainedTables,22);assert.equal(a.reapply.comparison.rawBytes,0);assert.equal(a.reapply.comparison.normalizedBytes,0);assert.equal(a.reapply.resets,0);
 validateDiscountShadow(a.shadow,a.shadowIntent,a.shadowRetention,packageHashes);validateDealDependencyCache(a.cacheProof,a.cacheIntent,a.cacheBefore,a.cacheAfter,a.shadowIntent);
 assert.equal(sha(root+'/scripts/release/product_discount_release_shadow_v1.mjs'),a.shadowIntent.producerSha256);assert.equal(sha(a.shadow.out+'/pull.private.log'),a.shadow.logSha256);
 for(const [k,field]of [['cacheProof','proofSha256'],['cacheIntent','intentSha256']])assert.equal(m.artifacts[k].sha256,a.shadowIntent.dependencyCache[field]);
 assert.equal(a.webRuntime.failure,null);assert.equal(a.webRuntime.actualAuthRpc,true);assert.equal(a.webRuntime.checks.length,4);assert.deepEqual(a.webRuntime.pageErrors,[]);assert.deepEqual(a.webRuntime.blockedExternalOrigins,[]);assert.equal(a.webRuntime.browserPids.length,2);assert.notEqual(...a.webRuntime.browserPids);
 assert.equal(a.webSource.root,root);for(const[p,h]of Object.entries(a.webSource.hashes))assert.equal(sha(root+'/'+p),h,p);
 for(const k of ['webRetention','nativeRetention']){assert.equal(a[k].retainedTables,37);assert.equal(a[k].controlsRestored,true);assert.equal(a[k].allNewHistoryRetained,true);}
 for(const k of ['webReview','nativeReview']){const r=a[k],count=k==='webReview'?13:7;assert.equal(r.status,'reviewed');assert.equal(r.actualAuthRpc,true);assert.equal(r.physicalDevice,k==='nativeReview');assert.equal(r.images.length,count);assert.equal(new Set(r.images.map(i=>i.name)).size,count);for(const i of r.images){assert.match(i.name,/^(?:phase-[12]\/)?[a-z-]+\.png$/);assert.equal(sha(path.dirname(m.artifacts[k].path)+'/'+i.name),i.sha256);}}
 validateDiscountDevice(a.nativeBuild,a.nativeProcess,a.nativePhase1,a.nativePhase2,a.nativeDbProof);
 assert.equal(a.nativeSource.build,434);assert.equal(Object.keys(a.nativeSource.files).length,371);for(const[p,h]of Object.entries(a.nativeSource.files))assert.equal(sha(root+'/'+p),h,p);
 assert.equal(sha(path.dirname(m.artifacts.nativeBuild.path)+'/acceptance.private.apk').toUpperCase(),a.nativeBuild.apkSha256);
 assert.equal(a.parent.status,'passed');assert.equal(a.parent.productionWrites,0);assert.equal(a.parent.localWrites,0);assert.equal(a.parent.producerSha256,sha(root+'/scripts/schema/product_discount_parent_v1.mjs'));
 assert.deepEqual(Object.keys(a.finalState).sort(),['full','upgrade']);for(const s of Object.values(a.finalState)){assert.equal(s.migrations,435);assert.equal(s.readonly,'on');assert.equal(s.deliveryabsent,true);assert.equal(s.pointerabsent,true);assert.equal(s.jobs,0);assert.equal(s.workers,'0');assert.equal(Object.keys(s.controls).length,10);assert.ok(Object.values(s.controls).every(v=>v===false));assert.equal(Object.keys(s.retained).length,38);}
 for(const[p,h]of Object.entries(m.producers))assert.equal(sha(root+'/'+p),h,p+' producer changed');
 return {sourceHashes:sources,packageHashes,states:a.finalState,parent:a.parent,manifestSha256:sha(root+'/'+discountManifest),artifacts:m.artifacts};
}
