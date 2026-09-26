// Hash-checked offline evidence. One-use report; never imports the live route.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root=process.cwd(),base=path.join(process.env.USERPROFILE,'.codex/tmp/vendor-real-scans-20260923');
const read=file=>JSON.parse(fs.readFileSync(file));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceFile=name=>path.join(root,'apps/web/src/lib/stores',name);
const work=path.join(root,'.local/integration/vendor-scan-expansion-v7');
const selection=read(path.join(base,'holdout-v7/selection.private.json'));
const frozen=read(path.join(base,'holdout-v7/frozen-labels.private.json'));
const fresh=read(path.join(base,'holdout-v7/results.private.json'));
const freshCorrection={corpus:'v7',file:'fresh-0020.jpg',before:['GV-PK-BST-4'],after:['GV-PK-SHF-4'],reason:'Post-evaluation full-size scan and footer readback visibly show Cacnea 004/072 (Shining Fates), not Battle Styles. Original frozen labels and raw flagged result retained. Same-name/number crosscheck alone did not catch the incorrect set label.'};
const correctedFresh=structuredClone(fresh);
const freshRow=correctedFresh.rows.find(r=>r.file===freshCorrection.file);
assert.deepEqual(freshRow.expected,freshCorrection.before);assert.equal(freshRow.wrong,true);
freshRow.expected=freshCorrection.after;freshRow.wrong=freshRow.candidates.some(c=>!freshRow.expected.includes(c.gv_id));freshRow.correct=freshRow.candidates.length>0&&!freshRow.wrong;
assert.equal(freshRow.correct,true);
const regression=read(path.join(work,'regression-2026-09-24T03-17-05-173Z.private.json'));
const v6=read(path.join(root,'.local/integration/vendor-scan-expansion-v6/regression-2026-09-24T03-10-05-937Z.private.json'));
const v6fresh=read(path.join(base,'holdout-v6/results.private.json'));
const sha=hash(fs.readFileSync(sourceFile('scanMatchV7.mjs')));
assert.equal(sha,'1d7beed7ac1b04be93688082ada610930a51645eea293f9d235b84250633151d');
assert.equal(sha,selection.matcherSha256);assert.equal(sha,frozen.matcherSha256);
assert.deepEqual(selection.matcherDependencies,frozen.matcherDependencies);
for(const [file,expected] of Object.entries(selection.matcherDependencies))assert.equal(hash(fs.readFileSync(sourceFile(file))),expected,file);
const index=fs.readFileSync(path.join(root,'.local/integration/vendor-scan-expansion-v3/local-build-2026-09-23T22-52-10-191Z.jsonl'));
const indexSha=hash(index);assert.equal(indexSha,'709045ad12c75924b08bf4a40a846e578cec4f3fb0262c4c841640e899c926aa');
assert.equal(index.toString().trim().split('\n').length,20079);
assert.ok(Date.parse(selection.at)<Date.parse(frozen.at));assert.ok(Date.parse(frozen.at)<Date.parse(fresh.at));
assert.equal(fresh.rows.length,34);assert.equal(regression.rows.length,198);
assert.deepEqual(fresh.excluded,['fresh-0003.jpg']);
for(const report of [correctedFresh,regression]){
 assert.ok(report.finishedAt);assert.equal(report.matcherSha256,sha);assert.equal(report.indexSha256,indexSha);
 for(const row of report.rows){
  assert.equal(row.wrong,row.candidates.some(c=>!row.expected.includes(c.gv_id)));
  assert.equal(row.correct,row.candidates.length>0&&row.candidates.every(c=>row.expected.includes(c.gv_id)));
  assert.equal(row.wrong,false,'Wrong suggestion; retain evidence, do not release');
 }
}
for(const row of fresh.rows){
 const label=frozen.labels.find(l=>l.file===row.file);assert.ok(label&&!label.previouslySeen);
 assert.ok(!selection.priorHashes.includes(label.originalSha256));assert.deepEqual(label.expectedGvIds,row.expected);
 assert.equal(hash(fs.readFileSync(path.join(base,'holdout-v7/derived',row.file))),label.sha256);
}
const priorV5=[
 ['v2_100',read(path.join(root,'.local/integration/vendor-scan-expansion-v5/regression-v5-2026-09-23T23-44-24-229Z.private.json'))],
 ['v4',read(path.join(root,'.local/integration/vendor-scan-expansion-v5/development-03.private.json'))],
 ['v5',read(path.join(base,'holdout-v5/results.private.json'))],
];
let preserved=0;
for(const [corpus,report] of priorV5)for(const old of report.rows.filter(r=>r.candidates.length)){
 const row=regression.rows.find(r=>r.corpus===corpus&&r.file===old.file);assert.ok(row,corpus+':'+old.file);
 assert.deepEqual(row.candidates.map(c=>c.id),old.candidates.map(c=>c.id),'Preserve prior suggestions');
 assert.equal(row.status,old.status);assert.equal(row.reader,'primary');preserved++;
}
assert.equal(preserved,112);
const correction={corpus:'v6',file:'fresh-0029.jpg',before:['GV-PK-LOR-059'],after:['GV-PK-LOR-054'],reason:'Full-size card reads Electrike 054/196. The old 059 label was Tynamo; original frozen labels and raw flagged result remain unchanged.'};
const correctedV6=structuredClone(v6fresh);
const corrected=correctedV6.rows.find(r=>r.file===correction.file);assert.deepEqual(corrected.expected,correction.before);assert.equal(corrected.wrong,true);
corrected.expected=correction.after;corrected.wrong=corrected.candidates.some(c=>!corrected.expected.includes(c.gv_id));corrected.correct=corrected.candidates.length>0&&!corrected.wrong;
assert.equal(corrected.correct,true);assert.ok(correctedV6.rows.every(r=>!r.wrong));
const summarize=report=>{
 const rows=report.rows,positive=rows.filter(r=>r.expected.length),negative=rows.filter(r=>!r.expected.length),times=rows.map(r=>r.ms).sort((a,b)=>a-b);
 return {scans:rows.length,supported:positive.length,correctSuggestions:positive.filter(r=>r.correct).length,
  ambiguous:rows.filter(r=>r.status==='ambiguous').length,wrongSuggestions:rows.filter(r=>r.wrong).length,
  abstainedSupported:positive.filter(r=>!r.candidates.length).length,rejectedNegatives:negative.filter(r=>!r.candidates.length).length,
  errors:rows.filter(r=>r.status==='error').map(r=>({case:rows.indexOf(r)+1,supported:Boolean(r.expected.length),error:r.error})),
  recoveredCorrect:rows.filter(r=>r.reader==='recovery'&&r.correct).length,
  p50Ms:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],maxMs:times.at(-1)};
};
const liveSha=hash(fs.readFileSync(sourceFile('scanMatchV2.mjs')));
assert.equal(liveSha,'ac0b5ed5c19de6d5d1de77a9ac29e7080c6a874add34761110b73991be562409');
const tests=fs.readFileSync(path.join(work,'node-tests.txt'),'utf8');assert.match(tests,/# pass 31/);assert.match(tests,/# fail 0/);
const receipt={at:new Date().toISOString(),scope:'Offline candidate only. No hosted import, deployment, catalog or inventory write.',
 matcherSha256:sha,matcherDependencies:selection.matcherDependencies,indexSha256:indexSha,indexReferences:20079,liveV2Sha256:liveSha,
 v6:{development164:summarize(v6),fresh34Raw:summarize(v6fresh),fresh34Corrected:summarize(correctedV6),labelCorrection:correction,promoted:false,reason:'Standalone replacement loses prior V5 recall.'},
 v7:{regression198:summarize(regression),regressionFirst164:summarize({rows:regression.rows.filter(r=>r.corpus!=='v6')}),priorV5SuggestionsPreserved:preserved,
  byCorpus:Object.fromEntries(['v2_100','v4','v5','v6'].map(corpus=>[corpus,summarize({rows:regression.rows.filter(r=>r.corpus===corpus)})])),fresh34Raw:summarize(fresh),fresh34Corrected:summarize(correctedFresh),freshLabelCorrection:freshCorrection},
 selection:{selected:35,excludedBeforeEvaluation:fresh.excluded,sourceHashOverlapEvaluated:0,frozenAt:frozen.at},
 checks:{nodeCases:31,nodePassed:31,targetedEslint:'passed',fullHookRun:false,hostedPerformanceTested:false,physicalPhoneTested:false},
 labelCorrections:[...regression.labelCorrections,freshCorrection],
 cases:correctedFresh.rows.map((r,i)=>({case:i+1,scope:frozen.labels.find(l=>l.file===r.file).scope,expected:r.expected,originalFrozenExpected:fresh.rows[i].expected,status:r.status,reader:r.reader,candidates:r.candidates.map(c=>({gvId:c.gv_id,evidence:c.evidence,rotation:c.rotation})),error:r.error})),
 releaseReady:false,
 limits:['Convenience scans with distinct source bytes, not independent physical cards or representative catalog accuracy.',
  'Expanded references remain frozen; 935 missing image bytes and 11 prior skips. Fresh Spinarak POR001/088 is absent from the index.',
  'Printed totals, alphanumeric collector numbers, reprint identity and missing references remain unresolved. Ambiguity never selects one canonical identity.',
  'Recovery starts only when the first pass returns an empty no_match within six seconds. OCR timeouts are per reader; no absolute total hosted deadline is claimed.',
  'Overlapping local evaluation processes affect measured latency; hosted concurrency, cold-start and memory behavior remain unproved.',
  'Live isolated preview remains V2 with 321 references. Recheck current printing eligibility before packaging expansion.',
  'No merge, deployment, production migration, entitlement activation, payment, inventory, public publication or original scan changes.']};
const output=path.join(root,'docs/audits/vendor_scan_expansion_v7/proof-20260923.json');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(work,'v6-label-correction.private.json'),JSON.stringify(correction,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(work,'v7-label-correction.private.json'),JSON.stringify(freshCorrection,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,v7:receipt.v7,v6:receipt.v6.fresh34Corrected,releaseReady:false}));
