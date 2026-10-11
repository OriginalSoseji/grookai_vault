// Source-bound local qualification. This grants no production apply authority.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {portfolioHistoryRelease,portfolioHistoryReleaseSources} from './product_portfolio_history_release_scope_v1.mjs';
import {validateDealDependencyCache} from './product_deal_release_evidence_v1.mjs';
export const portfolioHistoryManifest='docs/release/PRODUCT_PORTFOLIO_HISTORY_EVIDENCE_V1.json';
export const portfolioHistoryEvidenceKeys=['baseline','parent','fullReplay','upgrade','sql','rpc','rpcIntent','rpcCapacity','rpcRetention','extendedRpc','extendedRetention','reapply','shadow','shadowIntent','shadowRetention','cacheProof','cacheIntent','cacheBefore','cacheAfter','webRuntime','webSource','webRetention','webReview','nativeSource','nativeBuild','nativeProcess','nativeRetention','nativeReview','nativePhase1','nativePhase2','nativeDbProof','finalState'].sort();
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function loadPortfolioHistoryEvidence(){
 const {root,evidence}=portfolioHistoryRelease;
 assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
 const m=read(root+'/'+portfolioHistoryManifest);
 assert.equal(m.version,1);assert.equal(m.target,portfolioHistoryRelease.target);assert.equal(m.productionWrites,0);assert.equal(m.applyAuthority,false);
 assert.equal(m.qualifiedParent,'f19d39f20f35e030fffc9379d0d2eb1d854d6966');assert.deepEqual(Object.keys(m.artifacts).sort(),portfolioHistoryEvidenceKeys);
 const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
 const baseline=read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json');
 const packageHashes=portfolioHistoryReleaseSources(sources,baseline.sourceHashes);assert.deepEqual(m.sourceHashes,sources);assert.deepEqual(m.packageHashes,packageHashes);
 const a={};for(const[k,v]of Object.entries(m.artifacts)){assert.ok(v.path.startsWith(evidence+'/'));assert.ok(!v.path.includes('..'));assert.equal(sha(v.path),v.sha256,k);a[k]=read(v.path);}
 for(const k of ['baseline','fullReplay','upgrade','sql','rpc','reapply','webRuntime','webRetention','nativeRetention']){assert.equal(a[k].status,'passed',k);assert.equal(a[k].productionWrites,0,k);}
 assert.equal(a.baseline.sourceMigrations,438);assert.equal(a.baseline.migrations,429);assert.equal(a.baseline.localWrites,0);assert.equal(a.baseline.comparison.normalizedBytes,0);
 for(const[k,mode]of [['fullReplay','full'],['upgrade','upgrade']]){assert.equal(a[k].migrations,437);assert.equal(a[k].project,'portfolio-rel-'+mode+'-437-v1-20261008');}
 assert.equal(a.fullReplay.fullReplay,true);assert.equal(a.fullReplay.noOpPush,true);
 assert.equal(a.upgrade.allFixtureRowsUnchanged,true);assert.equal(a.upgrade.resetsAfterPopulation,0);assert.equal(a.upgrade.retainedTables,21);assert.equal(a.upgrade.retainedCostSnapshots,3);assert.equal(a.upgrade.modernReceiptSeed.retainedCostCorrections,1);assert.equal(a.upgrade.comparison.rawBytes,0);assert.equal(a.upgrade.comparison.normalizedBytes,0);
 const digest=portfolioHistoryRelease.migrations['20261008220000_portfolio_history_v1.sql'];
 assert.equal(a.sql.sourceSha256,digest);assert.equal(a.sql.readOnly,true);assert.equal(a.sql.localWrites,0);assert.equal(a.sql.cases,215);assert.equal(a.sql.comparisons,215);assert.equal(a.sql.summaries,215);assert.equal(a.sql.aclFunctions,15);assert.equal(a.sql.modelSha256,sha(root+'/backend/vault/portfolio_history_v1.mjs'));assert.equal(a.sql.producerSha256,sha(root+'/scripts/schema/test_product_portfolio_history_release_sql_v1.mjs'));
 assert.equal(a.rpc.actualAuthRpc,true);assert.equal(a.rpc.sourceSha256,digest);assert.equal(a.rpc.checks.length,19);assert.equal(a.rpc.resets,0);assert.equal(a.rpcIntent.project,'portfolio-rel-full-437-v1-20261008');assert.equal(a.rpcIntent.producerSha256,sha(root+'/scripts/audits/product_portfolio_history_release_rpc_v1.mjs'));
 assert.equal(a.rpcCapacity.copies,20000);assert.equal(a.rpcCapacity.actualAuthRpc,true);assert.ok(a.rpcCapacity.evidenceBytes<32*1024*1024);
 for(const k of ['rpcRetention','extendedRpc','extendedRetention'])assert.equal(a[k].status,'passed',k);
 assert.equal(a.extendedRpc.checks.length,6);assert.equal(a.extendedRetention.controlsRestored,true);assert.equal(a.extendedRetention.sealedPointersRestoredToAbsent,true);
 assert.equal(a.reapply.rowsUnchanged,true);assert.equal(a.reapply.resets,0);assert.equal(a.reapply.migrationSha256,digest);assert.ok(a.reapply.retainedPoints>=75);assert.equal(a.reapply.comparison.rawBytes,0);assert.equal(a.reapply.comparison.normalizedBytes,0);
 const s=a.shadow,i=a.shadowIntent;assert.equal(s.status,'passed');assert.equal(s.failure,undefined);assert.equal(s.exit,1);assert.equal(s.project,'portfolio-rel-shadow-437-v1-20261008');assert.equal(s.targetProject,'portfolio-rel-full-437-v1-20261008');assert.equal(s.shadowCaptured,true);assert.equal(s.comparison.rawBytes,0);assert.equal(s.comparison.normalizedBytes,0);assert.equal(s.comparison.securityObjects,1256);
 for(const k of ['productionWrites','targetWrites','retainedFixtureResets'])assert.equal(s[k],0);
 assert.equal(i.project,s.project);assert.equal(i.targetProject,s.targetProject);assert.equal(i.targetReadOnly,true);assert.equal(i.apply,false);assert.deepEqual(i.sourceHashes,packageHashes);assert.deepEqual(a.shadowRetention.before,a.shadowRetention.after);assert.equal(i.producerSha256,sha(root+'/scripts/release/product_portfolio_history_release_shadow_v1.mjs'));assert.equal(sha(s.out+'/pull.private.log'),s.logSha256);
 validateDealDependencyCache(a.cacheProof,a.cacheIntent,a.cacheBefore,a.cacheAfter,i);for(const[k,f]of [['cacheProof','proofSha256'],['cacheIntent','intentSha256']])assert.equal(m.artifacts[k].sha256,i.dependencyCache[f]);
 assert.equal(a.webRuntime.failure,null);assert.equal(a.webRuntime.checks.length,9);assert.deepEqual(a.webRuntime.pageErrors,[]);assert.deepEqual(a.webRuntime.blocked,[]);assert.equal(a.webRuntime.processes.length,2);assert.notEqual(...a.webRuntime.processes);
 for(const[p,h]of Object.entries(a.webSource.hashes))assert.equal(sha(root+'/'+p),h,p);
 assert.equal(a.webReview.status,'passed');assert.equal(a.webReview.sourceBindingSha256,m.artifacts.webSource.sha256);assert.equal(Object.keys(a.webReview.images).length,9);for(const[p,h]of Object.entries(a.webReview.images)){assert.match(p,/^[a-z-]+\.png$/);assert.equal(sha(path.dirname(m.artifacts.webReview.path)+'/'+p),h,p);}
 for(const k of ['webRetention','nativeRetention']){assert.equal(a[k].priorTables,41);assert.equal(a[k].controlsRestored,true);assert.equal(a[k].publicationPointerRestored,true);assert.deepEqual(a[k].fixtureRowsRetained,{points:40,copies:2});}
 const build=a.nativeBuild,process=a.nativeProcess,first=a.nativePhase1,second=a.nativePhase2;
 assert.equal(build.status,'passed');assert.equal(build.build,438);assert.equal(build.globalTrustChanged,false);assert.equal(process.status,'passed');assert.equal(process.protectedAppsUnchanged,true);assert.equal(process.separateApplicationId,'com.grookai.vault.portfoliohistoryproof');assert.equal(process.apkSha256,build.apkSha256);assert.equal(process.processIds.length,2);assert.notEqual(...process.processIds);
 assert.equal(first.phase,'portfolio_history_pending');assert.equal(second.phase,'portfolio_history_recovered');assert.equal(first.owner,second.owner);assert.equal(first.journal.ownerId,first.owner);assert.equal(first.sent.length,1);assert.deepEqual(first.journal.pending,first.sent[0]);assert.deepEqual(first.result.request,first.journal.pending);assert.equal(first.result.summary.sequence,'41');assert.equal(first.result.summary.totals.USD.exact,'12.34');assert.equal(first.completeExportCopies,2);assert.equal(first.loadedObservations,41);assert.notEqual(first.processId,second.processId);
 for(const k of ['exactJournalRetained','pendingCleared','noSecondCapture','accountClosed'])assert.equal(second[k],true,k);
 assert.equal(a.nativeDbProof.status,'passed');assert.equal(a.nativeDbProof.captures,1);assert.equal(a.nativeDbProof.exactRequest,true);assert.equal(a.nativeDbProof.entryOff,true);assert.equal(a.nativeDbProof.productionWrites,0);
 assert.equal(a.nativeSource.build,438);assert.equal(Object.keys(a.nativeSource.files).length,build.nativeFiles);for(const[p,h]of Object.entries(a.nativeSource.files))assert.equal(sha(root+'/'+p),h,p);assert.equal(sha(path.dirname(m.artifacts.nativeBuild.path)+'/acceptance.private.apk').toUpperCase(),build.apkSha256);
 assert.equal(a.nativeReview.status,'reviewed');assert.equal(a.nativeReview.physicalDevice,true);assert.equal(a.nativeReview.actualAuthRpc,true);assert.equal(a.nativeReview.sourceSha256,m.artifacts.nativeSource.sha256);assert.equal(a.nativeReview.images.length,6);for(const x of a.nativeReview.images){assert.match(x.name,/^phase-[12]\/[a-z-]+\.png$/);assert.equal(sha(path.dirname(m.artifacts.nativeReview.path)+'/'+x.name),x.sha256);}
 assert.equal(a.parent.status,'passed');assert.equal(a.parent.productionWrites,0);assert.equal(a.parent.localWrites,0);assert.equal(a.parent.preservedCommit,m.qualifiedParent);assert.equal(a.parent.producerSha256,sha(root+'/scripts/schema/product_portfolio_history_parent_v1.mjs'));
 assert.deepEqual(Object.keys(a.finalState).sort(),['full','upgrade']);for(const state of Object.values(a.finalState)){assert.equal(state.migrations,437);assert.equal(state.readonly,'on');assert.equal(state.deliveryabsent,true);assert.equal(state.pointerabsent,true);assert.equal(state.jobs,0);assert.equal(state.workers,'0');assert.equal(Object.keys(state.controls).length,12);assert.ok(Object.values(state.controls).every(v=>v===false));assert.ok(Object.keys(state.retained).length>=43);for(const t of ['auth.users','public.portfolio_history_points','public.portfolio_history_requests','supabase_migrations.schema_migrations'])assert.match(state.retained[t],/^[a-f0-9]{32}$/);}
 for(const[p,h]of Object.entries(m.producers))assert.equal(sha(root+'/'+p),h,p+' producer changed');
 return {sourceHashes:sources,packageHashes,states:a.finalState,parent:a.parent,manifestSha256:sha(root+'/'+portfolioHistoryManifest),artifacts:m.artifacts};
}
