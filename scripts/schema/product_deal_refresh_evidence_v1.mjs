// Current product/runtime extension; the historical exact-package manifest stays immutable.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readRefreshParent,refreshRoot,refreshEvidence} from './product_deal_refresh_parent_v1.mjs';
export const refreshProduct='d0ebefeb26d1fdf46a93cfe39038638831d38b19';
export const refreshMain='50404ddceec33a5e0aa2dcd170a9593da9b3f749';
export const refreshBackend='2e465a1fba6a3167c462787a6bc20f8c05b91c84';
export const refreshManifest='docs/release/PRODUCT_DEAL_REFRESH_EVIDENCE_V1.json';
export const refreshKeys=['baseline','parent','productHook','layoutReview','fieldReview','widgetReview','webRuntime','webReview','webRetention','webSource','nativeSource','nativeBuild','nativeProcess','nativeReadback','nativeHost','nativeHostSource','nativeReview','nativeRetention','nativeFixtureSource'].sort();
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
export function validateRefreshHook(hook){
 for(const [key,value]of Object.entries({status:'passed',mode:'commit',exitCode:0,finalHead:refreshProduct,localReadOnly:true,productionWrites:0}))assert.equal(hook[key],value,key);
 assert.deepEqual(hook.before,hook.after);assert.deepEqual(Object.keys(hook.after).sort(),['full','upgrade']);
 for(const mode of ['full','upgrade']){
  const s=hook.after[mode];assert.equal(s.migrations,432);assert.equal(Object.keys(s.retained).length,32);assert.equal(s.readonly,'on');assert.equal(s.pointerabsent,true);assert.equal(s.deliveryabsent,true);
  assert.equal(Object.keys(s.controls).length,8);assert.ok(Object.values(s.controls).every(v=>v===false));
  assert.equal(s.copies,mode==='full'?178:2);assert.equal(s.users,mode==='full'?6:1);
 }
 return hook.after;
}
export function validateRefreshImages(kind,review){
 const counts={layoutReview:9,fieldReview:5,widgetReview:8,webReview:8,nativeReview:7};assert.ok(Object.hasOwn(counts,kind));assert.equal(review.status,'reviewed');
 const images=review.inspected??review.images;assert.ok(Array.isArray(images));assert.equal(images.length,counts[kind]);assert.equal(new Set(images.map(r=>r.name)).size,images.length);
 for(const r of images){assert.match(r.name,/^(?:phase-[12]\/)?[a-z0-9.-]+\.png$/);assert.ok(!r.name.includes('..'));assert.match(r.sha256,/^[a-f0-9]{64}$/);}
 if(kind==='webReview')assert.equal(review.actualAuthRpc,true);
 if(kind==='widgetReview'){assert.equal(review.widgetRender,true);assert.equal(review.physicalDevice,false);}
 if(['layoutReview','fieldReview'].includes(kind))assert.equal(review.mockedApi,true);
 return images;
}
export function validateRefreshNative(p,b,r,h){
 assert.equal(p.status,'passed');assert.equal(p.primaryAppPathUnchanged,true);assert.equal(p.processIds.length,2);assert.notEqual(p.processIds[0],p.processIds[1]);for(const pid of p.processIds)assert.match(String(pid),/^[1-9][0-9]*$/);
 assert.equal(b.status,'passed');assert.equal(b.build,431);assert.equal(b.nativeFiles,356);assert.equal(b.globalTrustChanged,false);assert.equal(b.apkSha256,p.apkSha256);
 assert.equal(h.status,'passed');assert.equal(h.serverStopped,true);assert.equal(h.error,undefined);
 for(const [k,v]of Object.entries({status:'passed',createdCopies:0,completedReceipts:0,retainedTables:31,exactHeldBytesBeforeOpen:true,exactHeldTermsAfterOpen:true,journalRevisionIncrement:1,referenceMinor:1234,agreedMinor:700,productionWrites:0}))assert.equal(r[k],v,k);
}
export function assertRefreshProduct(){
 const git=(...a)=>execFileSync('git',a,{cwd:refreshRoot,encoding:'utf8',windowsHide:true}).trim();
 assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),refreshRoot.toLowerCase());
 git('merge-base','--is-ancestor',refreshProduct,'HEAD');git('merge-base','--is-ancestor',refreshMain,refreshProduct);
 assert.equal(git('diff','--name-only',refreshProduct,'--','apps','backend','lib','test','supabase','pubspec.yaml','pubspec.lock','android','ios'),'','Qualified application inputs changed');
 const importer=['handler.ts','pokemon_name.ts','set_scope.ts'].map(n=>'supabase/functions/vault-import-collection-v2/'+n);
 const changed=git('diff','--name-only',refreshBackend,'--','backend','supabase').split('\n').filter(Boolean).sort();assert.deepEqual(changed,[...importer].sort(),'Only the qualified main importer changes are allowed');
 for(const p of importer)assert.equal(git('diff','--name-only',refreshMain,'--',p),'',p+' changed from qualified main');
 // The desktop driver alone admits the new fixed output directory. No test-body changes.
 const integration=git('diff','--name-only',refreshProduct,'--','integration_test').split('\n').filter(Boolean);assert.deepEqual(integration,['integration_test/product_offer_ui_driver.dart']);
 const driver='integration_test/product_offer_ui_driver.dart';
 const original=execFileSync('git',['show',refreshProduct+':'+driver],{cwd:refreshRoot,encoding:'utf8'}).replaceAll('\r\n','\n');
 const expected=original.replace('product_offer_ui_20261008/market-','(?:product_offer_ui_20261008|product_deal_refresh_20261008)/market-');assert.notEqual(expected,original);
 assert.equal(fs.readFileSync(refreshRoot+'/'+driver,'utf8').replaceAll('\r\n','\n'),expected,'Unexpected integration driver change');
 return {productCommit:refreshProduct,mainCommit:refreshMain,backendCommit:refreshBackend,desktopDriverOnly:true};
}
export function loadRefreshEvidence(){
 assertRefreshProduct();const m=read(refreshRoot+'/'+refreshManifest);assert.equal(m.version,1);assert.equal(m.productCommit,refreshProduct);assert.equal(m.mainCommit,refreshMain);assert.equal(m.productionWrites,0);assert.equal(m.applyAuthority,false);
 assert.deepEqual(Object.keys(m.artifacts).sort(),refreshKeys);const loaded={};
 for(const[k,a]of Object.entries(m.artifacts)){assert.ok(a.path.startsWith('C:/grookai_vault_operator_artifacts/'));assert.ok(!a.path.includes('..'));assert.match(a.sha256,/^[a-f0-9]{64}$/);assert.equal(sha(a.path),a.sha256,k+' artifact changed');loaded[k]=read(a.path);}
 const parent=readRefreshParent();const {at:parentAt,status:parentStatus,producerSha256:parentProducer,...parentProof}=loaded.parent;assert.ok(Number.isFinite(Date.parse(parentAt)));assert.equal(parentStatus,'passed');assert.equal(parentProducer,sha(refreshRoot+'/scripts/schema/product_deal_refresh_parent_v1.mjs'));assert.deepEqual(parentProof,parent);assert.deepEqual(m.packageHashes,parent.packageHashes);assert.equal(m.parentManifestSha256,parent.manifestSha256);
 assert.deepEqual(validateRefreshHook(loaded.productHook),parent.states);assert.equal(sha(loaded.productHook.out+'/checks.private.log'),loaded.productHook.logSha256);
 const baseline=loaded.baseline;assert.equal(baseline.status,'passed');assert.equal(baseline.migrations,429);assert.equal(baseline.sourceMigrations,433);assert.equal(baseline.productionWrites,0);assert.equal(baseline.localWrites,0);assert.equal(baseline.comparison.normalizedBytes,0);assert.ok(baseline.comparison.securityObjects>1000);
 for(const k of ['layoutReview','fieldReview','widgetReview','webReview','nativeReview']){
  const r=loaded[k],dir=path.dirname(m.artifacts[k].path);for(const row of validateRefreshImages(k,r))assert.equal(sha(dir+'/'+row.name),row.sha256,k+'/'+row.name);
  for(const[p,h]of Object.entries(r.sourceFiles??{}))assert.equal(sha(refreshRoot+'/'+p),h,p);
 }
 assert.equal(Object.keys(loaded.webReview.sourceFiles).length,6);assert.equal(Object.keys(loaded.layoutReview.sourceFiles).length,4);assert.equal(Object.keys(loaded.fieldReview.sourceFiles).length,4);assert.equal(Object.keys(loaded.widgetReview.sourceFiles).length,2);
 const w=loaded.webRuntime;assert.equal(w.status,'passed');assert.equal(w.failure,null);assert.equal(w.actualAuthRpc,true);assert.equal(w.productionWrites,0);assert.equal(w.checks.length,4);
 for(const k of ['webSource','nativeFixtureSource']){const s=loaded[k];assert.equal(s.head,refreshProduct);assert.equal(s.migrations,433);assert.equal(s.localPipelineFunctionProof,true);assert.equal(s.cliReleaseQualification,false);assert.equal(s.fixtureSha256,sha(refreshRoot+'/scripts/audits/product_deal_refresh_fixture_v1.mjs'));assert.equal(s.workerSha256,sha(refreshRoot+'/scripts/workers/tcgplayer_market_publication_worker_v1.mjs'));}
 for(const k of ['webRetention','nativeRetention']){const r=loaded[k];assert.equal(r.status,'passed');assert.equal(r.retainedTables,31);assert.equal(r.controlsRestored,true);assert.equal(r.pointerRestoredToAbsent,true);assert.equal(r.allNewHistoryRetained,true);assert.equal(r.productionWrites,0);}
 const ns=loaded.nativeSource;assert.equal(ns.root.replaceAll('\\','/'),refreshRoot);assert.equal(ns.head,refreshProduct);assert.equal(ns.build,431);assert.equal(Object.keys(ns.files).length,356);for(const[p,h]of Object.entries(ns.files))assert.equal(sha(refreshRoot+'/'+p),h,p);
 const nativePaths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','lib','integration_test','pubspec.yaml','pubspec.lock','android'],{cwd:refreshRoot,encoding:'utf8'}).trim().split(/\r?\n/);assert.deepEqual(Object.keys(ns.files).sort(),[...new Set(nativePaths)].sort());
 validateRefreshNative(loaded.nativeProcess,loaded.nativeBuild,loaded.nativeReadback,loaded.nativeHost);
 const nativeDir=path.dirname(m.artifacts.nativeProcess.path);assert.equal(sha(nativeDir+'/acceptance.private.apk').toUpperCase(),loaded.nativeProcess.apkSha256);
 const hs=loaded.nativeHostSource;assert.equal(hs.expectedInstalledBuild,430);assert.equal(hs.intendedBuild,431);assert.equal(sha(nativeDir+'/installed-before.apk').toUpperCase(),hs.expectedInstalledSha256);
 assert.deepEqual(Object.keys(hs.files).sort(),[refreshEvidence+'/build-samsung.ps1',refreshEvidence+'/run-samsung.ps1'].sort());for(const[p,h]of Object.entries(hs.files))assert.equal(sha(p),h,p);
 assert.deepEqual(Object.keys(m.producerHashes).sort(),['scripts/schema/product_deal_refresh_parent_v1.mjs','scripts/audits/product_deal_refresh_fixture_v1.mjs','scripts/audits/product_deal_refresh_web_runtime_v1.mjs','scripts/audits/product_deal_refresh_device_host_v1.mjs','scripts/schema/audit_product_deal_refresh_baseline_v1.mjs'].sort());for(const[p,h]of Object.entries(m.producerHashes))assert.equal(sha(refreshRoot+'/'+p),h,p);
 return {productCommit:refreshProduct,mainCommit:refreshMain,manifestSha256:sha(refreshRoot+'/'+refreshManifest),parentManifestSha256:parent.manifestSha256,artifacts:m.artifacts,states:parent.states,sourceHashes:parent.sourceHashes,packageHashes:parent.packageHashes,productionWrites:0,applyAuthority:false};
}
