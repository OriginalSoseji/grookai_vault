// Finalize completed local proofs; no network, database or deployment actions.
import './vendor_storefront_network_guard.cjs';
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const dir='.local/integration/vendor-scan-runtime-v24',read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const regression=read(dir+'/runtime-final.private.json'),pack=read(dir+'/package-final.private.json'),build=read(dir+'/build-final-result.private.json'),trace=read(dir+'/trace-proof.json'),smoke=read(dir+'/compiled-smoke.json');
assert.ok(regression.finishedAt&&pack.finishedAt&&build.finishedAt);assert.equal(regression.summary.same,17);assert.equal(regression.summary.errors,0);assert.equal(pack.summary.correct,3);assert.equal(build.exitCode,0);assert.ok(trace.passed&&smoke.passed);assert.equal(trace.publicCatalogAsset,false);
for(const[name,sha]of Object.entries(regression.sourceHashes))assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/'+name)),sha);
for(const row of pack.sources)assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/'+row.name)),row.sha256);
const frozen=read('docs/audits/vendor_scan_visual_v23/PROOF_20260924.json');
for(const[file,sha]of Object.entries(frozen.sourceHashes))assert.equal(hash(fs.readFileSync(file)),sha);
const testLog=fs.readFileSync(dir+'/final-tests-2.txt','utf8');assert.match(testLog,/# tests 53\b/);assert.match(testLog,/# fail 0\b/);assert.equal(fs.readFileSync(dir+'/lint-final.txt','utf8').trim(),'');
const sourceFiles=['scanReferenceDeliveryV24.mjs','scanReferenceDeliveryV24.d.mts','scanVisualCatalogV24.mjs','scanVisualCatalogV24.d.mts','scanVisualProcessV24.mjs','scanVisualProcessV24.d.mts','scanVisualWorkerV24.mjs','scanVisualServerV24.ts','visualMatchServer.ts','scanRuntimeFiles.mjs'].map(n=>'apps/web/src/lib/stores/'+n).concat(['apps/web/next.config.mjs','apps/web/package.json','apps/web/package-lock.json']);
const sourceHashes=Object.fromEntries(sourceFiles.map(file=>[file,hash(fs.readFileSync(file))]));
for(const[file,sha]of Object.entries(sourceHashes))assert.equal(build.files.find(r=>r.name===file)?.sha256,sha,'Build/source binding: '+file);
const pkg=read('apps/web/package.json');assert.equal(pkg.dependencies['@techstark/opencv-js'],'4.12.0-release.1');
const checks=['runtime-final.private.json','package-final.private.json','build-final-result.private.json','trace-proof.json','compiled-smoke.json','final-tests-2.txt','lint-final.txt'];
const receipt={at:new Date().toISOString(),baseline:'7ef0ba02040d290bfa390b8bd3882d7b960f4ccd',sourceHashes,
 releaseQualified:false,reason:'Local implementation/build proof complete; Linux/Vercel reference delivery, actual anonymous eligibility, cold/warm concurrency and physical-phone checks remain.',
 frozenV23SourcesUnchanged:true,algorithm:'Frozen V19 shortlist, V23 geometry and V20 ambiguity guard; no OCR or recognition threshold changes.',
 referenceBounds:{ids:32,individualBytes:3*1024*1024,aggregatePacketBytes:24*1024*1024,concurrentDownloads:4,deliveryMs:7000,requestMs:20000,metadataResponseBytes:2*1024*1024},
 runtime:regression.summary,standalonePackage:pack.summary,build:{passed:true,typecheck:true,syntheticSitemapReads:true,outboundNetworkDisabled:true,sourceFiles:build.files.length},compiledParent:smoke.passed,trace:{files:trace.traceFiles,requiredAssets:3,publicCatalogAsset:false},
 tests:{passed:53,failed:0,targetedLint:'passed'},evidenceHashes:Object.fromEntries(checks.map(name=>[name,hash(fs.readFileSync(dir+'/'+name))])),
 retainedAttempts:['Initial unit test stub exited before its intended timeout; corrected fixture uses persistent listener.','Initial flag test mock lacked process.cwd; corrected mock.','Initial build was stopped by deliberately denied sitemap reads. Compile inspection found and fixed import.meta.url catalog asset emission; final build uses synthetic empty sitemap responses.','Initial runtime/package receipts before the catalog loader fix remain retained; final reports bind corrected sources.'],
 serving:{flag:'GROOKAI_STORE_SCAN_VISUAL_V24_ENABLED',default:'off',requiresExistingV2PilotGate:true,conflictingV14Flag:'reject',sharedAliasChanged:false,hostingActions:false},
 unchanged:['Frozen recognition algorithms and catalog bytes','Legacy V2 worker and process wrapper','Match-route owner/capability and final public printing checks','Mac originals and repair worktrees','No database, inventory, canonical, entitlement or payment writes','No commit, merge or deployment'],
 limitations:['Seventeen reused cases test protocol parity, not a new accuracy benchmark','Loopback delivery and mocked SDK authorization are not live database/RLS evidence','Windows package proof is not Linux hosting proof','Parent and child limits are per process; owner throttle is not a distributed quota','512MB V8 heap cap is not a total RSS cap','No real GG or physical-phone proof']};
fs.mkdirSync('docs/audits/vendor_scan_runtime_v24',{recursive:true});fs.writeFileSync('docs/audits/vendor_scan_runtime_v24/PROOF_20260924.json',JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({tests:53,runtime:regression.summary,package:pack.summary,build:true,trace:true,compiledParent:true,releaseQualified:false}));
