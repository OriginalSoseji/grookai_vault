// Offline, immutable receipt. Do not re-run a consumed fresh evaluation.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {loadCatalogV8,sha256} from './vendor_scan_catalog_v8.mjs';
const base=path.join(process.env.USERPROFILE,'.codex/tmp/vendor-real-scans-20260923');
const work='.local/integration/vendor-scan-expansion-v9';
const read=file=>JSON.parse(fs.readFileSync(file));
const selection=read(path.join(base,'holdout-v9/selection.private.json'));
const frozen=read(path.join(base,'holdout-v9/frozen-labels.private.json'));
const fresh=read(path.join(base,'holdout-v9/results.private.json'));
const regression=read(work+'/regression-2026-09-24T04-33-29-749Z.private.json');
const enriched=loadCatalogV8();
const sourceSha=sha256(fs.readFileSync('apps/web/src/lib/stores/scanMatchV9.mjs'));
assert.equal(sourceSha,'581845414fcc6249b1b7c7161cb1a7db23d6b0ec1423f6145a3941793b76cc76');
assert.equal(selection.matcherSha256,sourceSha);assert.equal(frozen.matcherSha256,sourceSha);
assert.equal(selection.metadataSha256,enriched.metadataSha256);assert.equal(frozen.metadataSha256,enriched.metadataSha256);
assert.deepEqual(selection.matcherDependencies,frozen.matcherDependencies);
for(const [name,hash] of Object.entries(selection.matcherDependencies))assert.equal(sha256(fs.readFileSync('apps/web/src/lib/stores/'+name)),hash);
assert.ok(Date.parse(selection.at)<Date.parse(frozen.at));assert.ok(Date.parse(frozen.at)<Date.parse(fresh.at));
assert.equal(fresh.rows.length,33);assert.equal(regression.rows.length,232);
assert.deepEqual(fresh.excluded,['fresh-0018.jpg','fresh-0027.jpg']);
for(const report of [fresh,regression]){
 assert.ok(report.finishedAt);assert.equal(report.matcherSha256,sourceSha);assert.equal(report.indexSha256,enriched.indexSha256);assert.equal(report.metadataSha256,enriched.metadataSha256);
 assert.deepEqual(report.dependencies,selection.matcherDependencies);
 for(const row of report.rows){assert.equal(row.wrong,row.candidates.some(c=>!row.expected.includes(c.gv_id)));assert.equal(row.correct,row.candidates.length>0&&!row.wrong);}
}
for(const row of fresh.rows){
 const label=frozen.labels.find(r=>r.file===row.file);assert.ok(label&&!label.previouslySeen);assert.ok(!selection.priorHashes.includes(label.originalSha256));
 assert.deepEqual(row.expected,label.expectedGvIds);assert.equal(sha256(fs.readFileSync(path.join(base,'holdout-v9/derived',row.file))),label.sha256);
}
const summarize=rows=>{
 const positive=rows.filter(r=>r.expected.length),negative=rows.filter(r=>!r.expected.length),times=rows.map(r=>r.ms).sort((a,b)=>a-b);
 return {scans:rows.length,supported:positive.length,correctSuggestions:positive.filter(r=>r.correct).length,wrongSuggestions:rows.filter(r=>r.wrong).length,
  ambiguous:rows.filter(r=>r.status==='ambiguous').length,unmatchedSupported:positive.filter(r=>!r.candidates.length).length,rejectedNegatives:negative.filter(r=>!r.candidates.length).length,
  errors:rows.filter(r=>r.status==='error').map(r=>({case:rows.indexOf(r)+1,supported:Boolean(r.expected.length),error:r.error})),
  matchedStoredDenominator:positive.filter(r=>r.correct&&r.candidates.every(c=>c.printedIdentity?.totalMatch)).length,
  matchedStoredSetCode:positive.filter(r=>r.correct&&r.candidates.every(c=>c.printedIdentity?.setMatch)).length,
  p50Ms:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],maxMs:times.at(-1)};
};
const prior=read('.local/integration/vendor-scan-expansion-v7/regression-2026-09-24T03-17-05-173Z.private.json').rows;
const priorFresh=structuredClone(read(path.join(base,'holdout-v7/results.private.json')).rows);
const correction=priorFresh.find(r=>r.file==='fresh-0020.jpg');assert.deepEqual(correction.expected,['GV-PK-BST-4']);correction.expected=['GV-PK-SHF-4'];correction.correct=true;correction.wrong=false;
const priorRows=[...prior,...priorFresh.map(r=>({...r,corpus:'v7'}))];assert.equal(priorRows.length,232);
const added=[],lost=[];
for(const row of regression.rows){const old=priorRows.find(r=>r.file===row.file&&r.corpus===row.corpus);assert.ok(old);assert.deepEqual(old.expected,row.expected);
 if(row.correct&&!old.correct)added.push({corpus:row.corpus,file:row.file,expected:row.expected});
 if(!row.correct&&old.correct)lost.push({corpus:row.corpus,file:row.file,expected:row.expected});
}
const metadata=read('.local/integration/vendor-scan-expansion-v8/metadata.private.json');
const slg=metadata.sets.find(s=>s.id==='3c75028f-5798-4271-b390-ab040e76346c');assert.equal(slg.printed_total,78);
const bad=frozen.labels.find(r=>r.file==='fresh-0025.jpg');assert.deepEqual(bad.metadataConflict,{visibleTotal:73,catalogTotal:78});
const live=sha256(fs.readFileSync('apps/web/src/lib/stores/scanMatchV2.mjs'));assert.equal(live,'ac0b5ed5c19de6d5d1de77a9ac29e7080c6a874add34761110b73991be562409');
const tests=fs.readFileSync(work+'/node-tests.txt','utf8');assert.match(tests,/# pass 39/);assert.match(tests,/# fail 0/);
const partial=read('.local/integration/vendor-scan-expansion-v8/regression-2026-09-24T04-30-30-761Z.private.json');assert.ok(!partial.finishedAt);
const receipt={at:new Date().toISOString(),scope:'Offline candidate only; no activation',matcherSha256:sourceSha,dependencies:selection.matcherDependencies,indexSha256:enriched.indexSha256,metadataSha256:enriched.metadataSha256,liveV2Sha256:live,
 coverage:enriched.coverage,metadataRead:{at:metadata.at,project:metadata.target,transaction:'read only; rolled back',sanity:metadata.sanity,anonymousSets:metadata.sets.length,anonymousCards:metadata.cards.length},
 regression232:summarize(regression.rows),priorV7Same232:summarize(priorRows),comparison:{added,lost},fresh33:summarize(fresh.rows),
 selection:{selected:35,excluded:fresh.excluded,overlapWithPriorSourceBytes:0,labelsFrozenAt:frozen.at,postEvaluationLabelCorrections:0,partialFooterCases:[8]},
 labelCorrectionsInHistoricalRegression:regression.labelCorrections,
 metadataConflicts:[{setId:slg.id,setCode:slg.code,storedDenominator:78,visibleDenominator:73,example:'GV-PK-SLG-8',freshCase:25,result:fresh.rows.find(r=>r.file==='fresh-0025.jpg').status,canonicalDataChanged:false}],
 retainedDevelopment:{v8SourceSha256:sha256(fs.readFileSync('apps/web/src/lib/stores/scanMatchV8.mjs')),v8InterruptedRows:partial.rows.length,v8FreshSelected:35,v8FreshEvaluated:0,reason:'End-to-end promo conflict test found artwork-only fallback could ignore a different promo ID. V9 rejects the conflict; V8 evidence retained.'},
 checks:{nodeCases:39,nodePassed:39,targetedEslint:'passed',fullHook:false,hostedPerformance:false,physicalPhone:false},
 cases:fresh.rows.map((row,i)=>({case:i+1,file:row.file,scope:frozen.labels.find(r=>r.file===row.file).scope,expected:row.expected,status:row.status,candidates:row.candidates.map(c=>({gvId:c.gv_id,evidence:c.evidence,printedIdentity:c.printedIdentity})),error:row.error})),
 releaseReady:false,limits:['Stored metadata coverage is not proof of printed truth; one observed Shining Legends denominator conflict blocks activation.',
  'Convenience scans, distinct source bytes but not independently labeled or independent physical cards. Full-catalog accuracy unproved.',
  'Unknown totals/set codes do not become guessed values. Existing artwork-only review suggestions remain possible when printed evidence is unreadable.',
  'No set-symbol recognition. Fragmented promo text and unreadable or conflicting OCR remain unresolved. No finish inferred.',
  'Frozen reference index is not refreshed by this metadata read; current printing eligibility must be rechecked before packaging.',
  'Overlapping workstation evaluations are not hosted latency, concurrency, memory or end-to-end deadline proof.',
  'No deployment, inventory/catalog write, schema migration, entitlement activation, payment, merge or commit. Live V2 remains on321 references.']};
const directory='docs/audits/vendor_scan_expansion_v9';fs.mkdirSync(directory,{recursive:true});
fs.writeFileSync(directory+'/proof-20260923.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({regression:receipt.regression232,prior:receipt.priorV7Same232,added:added.length,lost:lost.length,fresh:receipt.fresh33,releaseReady:false}));
