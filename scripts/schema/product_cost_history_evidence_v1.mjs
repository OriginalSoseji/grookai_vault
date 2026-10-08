// Bind local qualification to the reviewed source. This grants no apply authority.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {costHistoryRelease,costHistoryReleaseSources} from './product_cost_history_release_scope_v1.mjs';
import {validateDealDependencyCache} from './product_deal_release_evidence_v1.mjs';
export const costHistoryManifest='docs/release/PRODUCT_COST_HISTORY_EVIDENCE_V1.json';
export const costHistoryEvidenceKeys=['baseline','parent','fullReplay','upgrade','rpc','rpcIntent','rpcFlags','locks','oldAuthority','sql','reapply','shadow','shadowIntent','shadowRetention','cacheProof','cacheIntent','cacheBefore','cacheAfter','webRuntime','webSource','webRetention','webReview','paymentRuntime','paymentSource','paymentRetention','paymentReview','nativeSource','nativeBuild','nativeProcess','nativeRetention','nativeReview','nativePhase1','nativePhase2','nativeDbProof','finalState'].sort();
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function loadCostHistoryEvidence(){
 const {root,evidence}=costHistoryRelease;
 assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
 const m=read(root+'/'+costHistoryManifest);assert.equal(m.version,1);assert.equal(m.target,costHistoryRelease.target);assert.equal(m.productionWrites,0);assert.equal(m.applyAuthority,false);assert.equal(m.qualifiedParent,'070e87baafccc7ad81a3a90c7ee07c0cb4ae549a');
 assert.deepEqual(Object.keys(m.artifacts).sort(),costHistoryEvidenceKeys);
 const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
 const baseline=read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json');
 const packageHashes=costHistoryReleaseSources(sources,baseline.sourceHashes);assert.deepEqual(m.sourceHashes,sources);assert.deepEqual(m.packageHashes,packageHashes);
 const a={};for(const[k,v]of Object.entries(m.artifacts)){assert.ok(v.path.startsWith(evidence+'/'));assert.ok(!v.path.includes('..'));assert.equal(sha(v.path),v.sha256,k);a[k]=read(v.path);}
 for(const k of ['baseline','fullReplay','upgrade','rpc','sql','reapply','webRuntime','webRetention','paymentRuntime','paymentRetention','nativeRetention']){assert.equal(a[k].status,'passed',k);assert.equal(a[k].productionWrites,0,k);}
 assert.equal(a.baseline.sourceMigrations,437);assert.equal(a.baseline.migrations,429);assert.equal(a.baseline.localWrites,0);assert.equal(a.baseline.comparison.normalizedBytes,0);
 for(const [k,mode]of [['fullReplay','full'],['upgrade','upgrade']]){assert.equal(a[k].migrations,436);assert.equal(a[k].project,'costhist-rel-'+mode+'-436-v1-20261008');}
 assert.equal(a.fullReplay.fullReplay,true);assert.equal(a.fullReplay.noOpPush,true);
 assert.equal(a.upgrade.allFixtureRowsUnchanged,true);assert.equal(a.upgrade.resetsAfterPopulation,0);assert.equal(a.upgrade.retainedCostSnapshots,3);assert.equal(a.upgrade.retainedTables,20);assert.equal(a.upgrade.comparison.rawBytes,0);assert.equal(a.upgrade.comparison.normalizedBytes,0);
 const migration='20261008190000_vendor_sale_cost_corrections_v1.sql',digest=costHistoryRelease.migrations[migration];
 assert.equal(a.rpc.project,'costhist-rel-full-436-v1-20261008');assert.equal(a.rpc.sourceSha256,digest);assert.equal(a.rpc.resets,0);assert.equal(a.rpc.retainedTables,21);
 for(const k of ['actualAuthRpc','oldAuthorityUnchanged','originalEvidenceUnchanged','knownZero','fullLineQuantity','foreignCurrency','restoreRevision','concurrentIdentical','concurrentChanged','staleRevision','legacyImmutable','legacyAliasRejected','foreignCanonicalRejected','purchaseRejected','tradeCompatible','missingDiscountAllocationUncovered','historyPagination','ownerIsolation','entryOffRecovery','terminalCancellation','bothForcedLockOrders','customerPrivacy'])assert.equal(a.rpc[k],true,k);
 assert.equal(a.rpcIntent.producerSha256,sha(root+'/scripts/audits/product_cost_history_release_rpc_v1.mjs'));
 assert.equal(Object.keys(a.rpcFlags.flags).length,9);assert.ok(Object.values(a.rpcFlags.flags).every(v=>v===false));assert.deepEqual(a.rpcFlags.cost,{edit_enabled:false,capture_enabled:false});
 assert.equal(a.locks.bothOrders,true);assert.equal(a.locks.productionWrites,0);assert.deepEqual(a.locks.lockEvidence.map(x=>x.name),['vendor_sale_cost_correction_apply_v1','vendor_sale_cost_correction_cancel_v1','vendor_sale_cost_correction_cancel_v1','vendor_sale_cost_correction_apply_v1']);for(const x of a.locks.lockEvidence){assert.ok(Number.isSafeInteger(x.pid)&&x.pid>0);assert.ok(x.blockers.length>0);assert.ok(x.blockers.every(p=>Number.isSafeInteger(p)&&p>0&&p!==x.pid));}
 assert.equal(a.oldAuthority.names.length,14);assert.equal(a.oldAuthority.localWrites,0);
 assert.equal(a.sql.cases,35);assert.equal(a.sql.readOnly,true);assert.equal(a.sql.localWrites,0);assert.equal(a.sql.sourceSha256,digest);assert.equal(a.sql.vectorSha256,sha(root+'/test/fixtures/sale_cost_corrections_v1.json'));
 assert.equal(a.reapply.rowsUnchanged,true);assert.equal(a.reapply.resets,0);assert.equal(a.reapply.migrationSha256,digest);assert.equal(a.reapply.retainedTables,31);assert.ok(a.reapply.retainedCorrections>=63);assert.equal(a.reapply.comparison.rawBytes,0);assert.equal(a.reapply.comparison.normalizedBytes,0);
 const s=a.shadow,i=a.shadowIntent;assert.equal(s.status,'passed');assert.equal(s.failure,undefined);assert.equal(s.exit,1);assert.equal(s.project,'costhist-rel-shadow-436-v1-20261008');assert.equal(s.targetProject,'costhist-rel-full-436-v1-20261008');assert.equal(s.shadowCaptured,true);assert.equal(s.comparison.rawBytes,0);assert.equal(s.comparison.normalizedBytes,0);assert.equal(s.comparison.securityObjects,1237);for(const k of ['productionWrites','targetWrites','retainedFixtureResets'])assert.equal(s[k],0);
 assert.equal(i.project,s.project);assert.equal(i.targetProject,s.targetProject);assert.equal(i.targetReadOnly,true);assert.equal(i.apply,false);assert.deepEqual(i.sourceHashes,packageHashes);assert.equal(Object.keys(a.shadowRetention.before).length,33);assert.deepEqual(a.shadowRetention.before,a.shadowRetention.after);
 assert.equal(i.producerSha256,sha(root+'/scripts/release/product_cost_history_release_shadow_v1.mjs'));assert.equal(sha(s.out+'/pull.private.log'),s.logSha256);
 validateDealDependencyCache(a.cacheProof,a.cacheIntent,a.cacheBefore,a.cacheAfter,i);for(const[k,f]of [['cacheProof','proofSha256'],['cacheIntent','intentSha256']])assert.equal(m.artifacts[k].sha256,i.dependencyCache[f]);
 for(const[prefix,count]of [['web',9],['payment',4]]){
  const r=a[prefix+'Runtime'];assert.equal(r.failure,null);assert.equal(r.checks.length,count);assert.deepEqual(r.pageErrors,[]);assert.deepEqual(r[prefix==='web'?'blocked':'blockedExternalOrigins'],[]);const pids=r[prefix==='web'?'processes':'browserPids'];assert.equal(pids.length,2);assert.notEqual(pids[0],pids[1]);
  for(const[p,h]of Object.entries(a[prefix+'Source'].hashes))assert.equal(sha(root+'/'+p),h,p);
 }
 assert.equal(a.paymentRuntime.actualAuthRpc,true);
 for(const k of ['webRetention','paymentRetention','nativeRetention']){assert.equal(a[k].retainedTables,38);assert.equal(a[k].controlsRestored,true);assert.equal(a[k].allNewHistoryRetained,true);}
 for(const [prefix,count]of [['web',8],['payment',13],['native',8]]){const r=a[prefix+'Review'];assert.equal(r.status,'reviewed');assert.equal(r.actualAuthRpc,true);assert.equal(r.physicalDevice,prefix==='native');assert.equal(r.sourceSha256,m.artifacts[prefix+'Source'].sha256);assert.equal(r.images.length,count);assert.equal(new Set(r.images.map(x=>x.name)).size,count);for(const x of r.images){assert.match(x.name,/^(?:phase-[12]\/)?[a-z-]+\.png$/);assert.equal(sha(path.dirname(m.artifacts[prefix+'Review'].path)+'/'+x.name),x.sha256);}}
 const build=a.nativeBuild,process=a.nativeProcess,first=a.nativePhase1,second=a.nativePhase2;
 assert.equal(build.status,'passed');assert.equal(build.build,436);assert.equal(build.nativeFiles,379);assert.equal(build.globalTrustChanged,false);assert.equal(process.status,'passed');assert.equal(process.primaryAppPathUnchanged,true);assert.equal(process.apkSha256,build.apkSha256);assert.equal(process.processIds.length,2);assert.notEqual(...process.processIds);
 assert.equal(first.phase,'cost_history_pending');assert.equal(second.phase,'cost_history_recovered');assert.equal(first.owner,second.owner);assert.equal(first.journal.ownerId,first.owner);assert.equal(first.sent.length,4);assert.deepEqual(first.journal.pending,first.sent[3]);assert.deepEqual(first.result.request,first.journal.pending);assert.equal(first.result.revision,'4');for(const k of ['exactJournalRetained','pendingCleared','noSecondApply','accountClosed'])assert.equal(second[k],true,k);
 assert.equal(a.nativeDbProof.status,'passed');assert.equal(a.nativeDbProof.corrections,4);assert.equal(a.nativeDbProof.exactRequests,true);assert.equal(a.nativeDbProof.entryOff,true);assert.equal(a.nativeDbProof.productionWrites,0);
 assert.equal(a.nativeSource.build,436);assert.equal(Object.keys(a.nativeSource.files).length,379);for(const[p,h]of Object.entries(a.nativeSource.files))assert.equal(sha(root+'/'+p),h,p);assert.equal(sha(path.dirname(m.artifacts.nativeBuild.path)+'/acceptance.private.apk').toUpperCase(),build.apkSha256);
 assert.equal(a.parent.status,'passed');assert.equal(a.parent.productionWrites,0);assert.equal(a.parent.localWrites,0);assert.equal(a.parent.preservedCommit,m.qualifiedParent);assert.equal(a.parent.producerSha256,sha(root+'/scripts/schema/product_cost_history_parent_v1.mjs'));
 assert.deepEqual(Object.keys(a.finalState).sort(),['full','upgrade']);for(const state of Object.values(a.finalState)){assert.equal(state.migrations,436);assert.equal(state.readonly,'on');assert.equal(state.deliveryabsent,true);assert.equal(state.pointerabsent,true);assert.equal(state.jobs,0);assert.equal(state.workers,'0');assert.equal(Object.keys(state.controls).length,11);assert.ok(Object.values(state.controls).every(v=>v===false));assert.equal(Object.keys(state.retained).length,39);}
 for(const[p,h]of Object.entries(m.producers))assert.equal(sha(root+'/'+p),h,p+' producer changed');
 return {sourceHashes:sources,packageHashes,states:a.finalState,parent:a.parent,manifestSha256:sha(root+'/'+costHistoryManifest),artifacts:m.artifacts};
}
