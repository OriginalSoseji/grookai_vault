import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {loadCatalogV8,sha256} from './vendor_scan_catalog_v8.mjs';
import {prepareVisualIndex,VISUAL_VERSION} from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
import {matchScanV11} from '../../apps/web/src/lib/stores/scanMatchV11.mjs';
const base=path.join(process.env.USERPROFILE,'.codex/tmp/vendor-real-scans-20260923/holdout-v11');
const read=name=>JSON.parse(fs.readFileSync(path.join(base,name)));
const selection=read('selection.private.json'),frozen=read('frozen-labels.private.json');
const {catalog,indexSha256,metadataSha256,coverage}=loadCatalogV8();
const checkSources=()=>{
 assert.equal(sha256(fs.readFileSync('apps/web/src/lib/stores/scanMatchV11.mjs')),selection.matcherSha256);
 for(const [file,sha] of Object.entries(selection.matcherDependencies))assert.equal(sha256(fs.readFileSync('apps/web/src/lib/stores/'+file)),sha);
 assert.equal(metadataSha256,selection.metadataSha256);assert.equal(frozen.matcherSha256,selection.matcherSha256);
};
checkSources();assert.ok(Date.parse(selection.at)<Date.parse(frozen.at));
const references=prepareVisualIndex({version:VISUAL_VERSION,references:catalog}),byId=new Map(catalog.map(c=>[c.id,c]));
const file=path.join(base,'results.private.json');assert.ok(!fs.existsSync(file),'One-use holdout');
const report={at:new Date().toISOString(),matcherSha256:selection.matcherSha256,dependencies:selection.matcherDependencies,indexSha256,metadataSha256,coverage,excluded:frozen.labels.filter(r=>r.previouslySeen).map(r=>r.file),rows:[]};
assert.ok(Date.parse(frozen.at)<Date.parse(report.at));
for(const label of frozen.labels.filter(r=>!r.previouslySeen)){
 assert.ok(!selection.priorHashes.includes(label.originalSha256));
 const bytes=fs.readFileSync(path.join(base,'derived',label.file));assert.equal(sha256(bytes),label.sha256);
 const start=performance.now();let result;try{result=await matchScanV11(bytes,references,catalog);}catch(error){result={status:'error',error:error.message,candidates:[]};}
 const candidates=result.candidates.map(c=>({...c,gv_id:byId.get(c.id)?.gv_id}));
 report.rows.push({file:label.file,expected:label.expectedGvIds,status:result.status,reader:result.reader,error:result.error,candidates,wrong:candidates.some(c=>!label.expectedGvIds.includes(c.gv_id)),correct:candidates.length>0&&candidates.every(c=>label.expectedGvIds.includes(c.gv_id)),ms:Math.round(performance.now()-start)});
 fs.writeFileSync(file,JSON.stringify(report,null,2));
 if(report.rows.length%5===0)console.log(JSON.stringify({processed:report.rows.length,correct:report.rows.filter(r=>r.correct).length,wrong:report.rows.filter(r=>r.wrong).length}));
}
checkSources();report.finishedAt=new Date().toISOString();report.releaseReady=false;
report.summary={scans:report.rows.length,supported:report.rows.filter(r=>r.expected.length).length,correct:report.rows.filter(r=>r.correct).length,wrong:report.rows.filter(r=>r.wrong).length,abstained:report.rows.filter(r=>!r.candidates.length).length};
fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));


