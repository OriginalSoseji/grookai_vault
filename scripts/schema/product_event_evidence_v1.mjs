// Source-bound event acceptance and exact package evidence. No database writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {eventRelease,eventReleaseSources} from './product_event_release_scope_v1.mjs';
import {validateDealDependencyCache} from './product_deal_release_evidence_v1.mjs';
export const eventManifest='docs/release/PRODUCT_EVENT_EVIDENCE_V1.json';
export const eventEvidenceKeys=['baseline','parent','fullReplay','upgrade','rpc','rpcIntent','rpcFlags','sql','reapply','shadow','shadowIntent','shadowRetention','cacheProof','cacheIntent','cacheBefore','cacheAfter','webRuntime','webSource','webRetention','webReview','nativeSource','nativeBuild','nativeProcess','nativeRetention','nativeReview','nativePhase1','nativePhase2','nativeDbProof','journal','finalState'].sort();
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function validateEventShadow(r,intent,retention,hashes){
 assert.equal(r.status,'passed');assert.equal(r.failure,undefined);assert.equal(r.exit,1);assert.equal(r.project,'event-shadow-433-v1-20261008');assert.equal(r.targetProject,'event-release-full-433-v1-20261008');
 for(const k of ['productionWrites','targetWrites','retainedFixtureResets'])assert.equal(r[k],0,k);
 assert.equal(r.shadowCaptured,true);assert.equal(r.comparison.rawBytes,0);assert.equal(r.comparison.normalizedBytes,0);assert.equal(r.comparison.scope,'public');assert.ok(r.comparison.securityObjects>1000);
 assert.equal(intent.project,r.project);assert.equal(intent.targetProject,r.targetProject);assert.equal(intent.targetReadOnly,true);assert.equal(intent.apply,false);assert.deepEqual(intent.sourceHashes,hashes);
 assert.equal(Object.keys(retention.before).length,29);assert.deepEqual(retention.after,retention.before);
}
export function validateEventDevice(build,process,first,second,db){
 assert.equal(build.status,'passed');assert.equal(build.build,432);assert.equal(build.nativeFiles,366);assert.equal(build.globalTrustChanged,false);
 assert.equal(process.status,'passed');assert.equal(process.primaryAppPathUnchanged,true);assert.equal(process.apkSha256,build.apkSha256);assert.equal(process.processIds.length,2);assert.notEqual(process.processIds[0],process.processIds[1]);
 assert.match(build.apkSha256,/^[A-F0-9]{64}$/);for(const pid of process.processIds)assert.match(String(pid),/^[1-9][0-9]*$/);
 assert.equal(first.phase,'event_pending');assert.equal(second.phase,'event_recovered');assert.equal(first.owner,second.owner);assert.equal(first.eventId,second.eventId);assert.equal(first.mutations.length,10);assert.deepEqual(first.journal.pending,first.mutations.at(-1));
 assert.equal(second.exactJournalRetained,true);assert.equal(second.noSecondMutation,true);assert.equal(second.accountClosed,true);
 assert.equal(db.status,'passed');assert.equal(db.owner,first.owner);assert.equal(db.eventId,first.eventId);assert.equal(db.requests,10);assert.equal(db.exactRequests,true);assert.equal(db.entryDisabled,true);assert.equal(db.productionWrites,0);
}
export function loadEventEvidence(){
 const root=eventRelease.root;assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
 const m=read(root+'/'+eventManifest);assert.equal(m.version,1);assert.equal(m.target,eventRelease.target);assert.equal(m.productionWrites,0);assert.equal(m.applyAuthority,false);assert.equal(m.qualifiedParent,'e41e5e367eb2b04c868e75e3320d5e482733f96c');
 assert.deepEqual(Object.keys(m.artifacts).sort(),eventEvidenceKeys);
 const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
 const baseline=read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json');const packageHashes=eventReleaseSources(sources,baseline.sourceHashes);assert.deepEqual(m.sourceHashes,sources);assert.deepEqual(m.packageHashes,packageHashes);
 const a={};for(const [k,v]of Object.entries(m.artifacts)){assert.ok(v.path.startsWith(eventRelease.evidence+'/'));assert.ok(!v.path.includes('..'));assert.equal(sha(v.path),v.sha256,k+' evidence changed');a[k]=read(v.path);}
 for(const k of ['baseline','fullReplay','upgrade','rpc','sql','reapply','webRuntime','webRetention','nativeRetention']){assert.equal(a[k].status,'passed',k);assert.equal(a[k].productionWrites,0,k);}
 assert.equal(a.baseline.sourceMigrations,434);assert.equal(a.baseline.migrations,429);assert.equal(a.baseline.localWrites,0);assert.equal(a.baseline.comparison.normalizedBytes,0);
 for(const k of ['fullReplay','upgrade']){assert.equal(a[k].migrations,433);assert.equal(a[k].project,'event-release-'+(k==='fullReplay'?'full':'upgrade')+'-433-v1-20261008');}
 assert.equal(a.fullReplay.fullReplay,true);assert.equal(a.fullReplay.noOpPush,true);assert.equal(a.upgrade.allFixtureRowsUnchanged,true);assert.equal(a.upgrade.resetsAfterPopulation,0);assert.equal(a.upgrade.retainedCopies,6);assert.equal(a.upgrade.retainedCostSnapshots,2);assert.equal(a.upgrade.retainedTables,14);assert.equal(a.upgrade.comparison.normalizedBytes,0);
 assert.equal(a.rpc.project,'event-release-full-433-v1-20261008');assert.equal(a.rpc.sourceSha256,eventRelease.sha256);assert.equal(a.rpc.resets,0);
 for(const k of ['concurrentIdentical','staleConcurrent','changedRetryRejected','ownerIsolation','readCreatesNoRows','bothEntryControlsRequired','expenseAmendmentAndVoidAudited','closedEventProtection','lastReceiptRollback','explicitReassignmentAndUnassignment','legacyUppercaseIdentity','modernSaleBuyTrade','havanaRepeatedMidnight','apiaSkippedDate','historyPagination','entryOffRecovery','cloudOffBookBoundary','receiptInventoryAndCostsUnchanged','ambiguousLegacyAliasesRefused','foreignReceiptRefused','concurrentChangedRequest','actualReadModelValidated','anonymousAndBaseTablesRefused','invalidHistoryPaginationRefused'])assert.equal(a.rpc[k],true,k);
 assert.equal(a.rpcIntent.scriptSha256,sha(root+'/scripts/audits/product_event_release_rpc_v1.mjs'));assert.equal(a.rpcIntent.modelSha256,sha(root+'/apps/web/src/lib/sales/vendorEvents.mjs'));assert.equal(Object.keys(a.rpcFlags.flags).length,7);assert.ok(Object.values(a.rpcFlags.flags).every(v=>v===false));
 assert.equal(a.sql.cases,73);assert.equal(a.sql.readOnly,true);assert.equal(a.sql.localWrites,0);assert.equal(a.sql.sourceSha256,eventRelease.sha256);assert.equal(a.sql.vectorsSha256,sha(root+'/test/fixtures/vendor_events_v1.json'));
 assert.equal(a.reapply.rowsUnchanged,true);assert.equal(a.reapply.retainedTables,20);assert.equal(a.reapply.comparison.rawBytes,0);assert.equal(a.reapply.resets,0);assert.equal(a.reapply.migrationSha256,eventRelease.sha256);
 validateEventShadow(a.shadow,a.shadowIntent,a.shadowRetention,packageHashes);validateDealDependencyCache(a.cacheProof,a.cacheIntent,a.cacheBefore,a.cacheAfter,a.shadowIntent);
 assert.equal(sha(root+'/scripts/release/product_event_shadow_v1.mjs'),a.shadowIntent.producerSha256);assert.equal(sha(a.shadow.out+'/pull.private.log'),a.shadow.logSha256);
 for(const [k,field]of [['cacheProof','proofSha256'],['cacheIntent','intentSha256']])assert.equal(m.artifacts[k].sha256,a.shadowIntent.dependencyCache[field]);
 assert.equal(a.webRuntime.failure,null);assert.equal(a.webRuntime.actualAuthRpc,true);assert.equal(a.webRuntime.checks.length,6);assert.deepEqual(a.webRuntime.pageErrors,[]);assert.deepEqual(a.webRuntime.blockedExternalOrigins,[]);assert.equal(a.webRuntime.mutations,11);
 assert.equal(a.webSource.head,m.qualifiedParent);assert.equal(a.webSource.migrations,434);for(const [p,h]of Object.entries(a.webSource.hashes))assert.equal(sha(root+'/'+p),h,p);
 for(const k of ['webRetention','nativeRetention']){assert.equal(a[k].retainedTables,36);assert.equal(a[k].controlsRestored,true);assert.equal(a[k].pointerAbsent,true);assert.equal(a[k].allNewHistoryRetained,true);}
 for(const k of ['webReview','nativeReview']){const r=a[k];assert.equal(r.status,'reviewed');assert.equal(r.actualAuthRpc,true);assert.equal(r.physicalDevice,k==='nativeReview');assert.equal(r.images.length,7);assert.equal(new Set(r.images.map(i=>i.name)).size,7);for(const i of r.images){assert.match(i.name,/^(?:phase-[12]\/)?[a-z-]+\.png$/);assert.equal(sha(path.dirname(m.artifacts[k].path)+'/'+i.name),i.sha256);}}
 validateEventDevice(a.nativeBuild,a.nativeProcess,a.nativePhase1,a.nativePhase2,a.nativeDbProof);
 assert.equal(a.nativeSource.build,432);assert.equal(Object.keys(a.nativeSource.files).length,366);for(const[p,h]of Object.entries(a.nativeSource.files))assert.equal(sha(root+'/'+p),h,p);
 assert.equal(sha(path.dirname(m.artifacts.nativeBuild.path)+'/acceptance.private.apk').toUpperCase(),a.nativeBuild.apkSha256);
 assert.equal(a.journal.status,'passed');for(const[p,h]of Object.entries(a.journal.sourceHashes))assert.equal(sha(root+'/'+p),h,p);
 assert.equal(a.parent.status,'passed');assert.equal(a.parent.productionWrites,0);assert.equal(a.parent.localWrites,0);assert.equal(a.parent.producerSha256,sha(root+'/scripts/schema/product_event_parent_v1.mjs'));
 assert.deepEqual(Object.keys(a.finalState).sort(),['full','upgrade']);for(const s of Object.values(a.finalState)){assert.equal(s.migrations,433);assert.equal(s.readonly,'on');assert.equal(s.deliveryabsent,true);assert.equal(s.pointerabsent,true);assert.equal(s.jobs,0);assert.equal(s.workers,'0');assert.equal(Object.keys(s.controls).length,9);assert.ok(Object.values(s.controls).every(v=>v===false));assert.equal(Object.keys(s.retained).length,37);}
 for(const[p,h]of Object.entries(m.producers))assert.equal(sha(root+'/'+p),h,p+' producer changed');
 return {sourceHashes:sources,packageHashes,states:a.finalState,parent:a.parent,manifestSha256:sha(root+'/'+eventManifest),artifacts:m.artifacts};
}
