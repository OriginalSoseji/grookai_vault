// Frozen candidate, unseen-byte Mac scan sample. Offline only; no inventory calls.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {prepareVisualIndex,VISUAL_VERSION} from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
import {matchScanV4} from '../../apps/web/src/lib/stores/scanMatchV4.mjs';
const root=process.cwd(),base=path.join(process.env.USERPROFILE,'.codex/tmp/vendor-real-scans-20260923/holdout-v4');
const hash=b=>createHash('sha256').update(b).digest('hex');
const frozen=JSON.parse(fs.readFileSync(path.join(base,'frozen-labels.private.json')));
assert.equal(hash(fs.readFileSync(path.join(root,'apps/web/src/lib/stores/scanMatchV4.mjs'))),frozen.matcherSha256);
assert.ok(frozen.labels.every(r=>!r.previouslySeen));
const indexFile=path.join(root,'.local/integration/vendor-scan-expansion-v3/local-build-2026-09-23T22-52-10-191Z.jsonl');
const raw=fs.readFileSync(indexFile),catalog=raw.toString().trim().split('\n').map(JSON.parse).sort((a,b)=>a.id.localeCompare(b.id));
const references=prepareVisualIndex({version:VISUAL_VERSION,references:catalog});
const file=path.join(base,'results.private.json');assert.ok(!fs.existsSync(file),'One-use holdout');
const report={at:new Date().toISOString(),matcherSha256:frozen.matcherSha256,indexSha256:hash(raw),scope:'30 previously untested files; physical-copy independence not established',rows:[]};
for(const label of frozen.labels){
 const bytes=fs.readFileSync(path.join(base,'derived',label.file));assert.equal(hash(bytes),label.sha256);
 const start=performance.now();let result;try{result=await matchScanV4(bytes,references,catalog);}catch(error){result={status:'error',error:error.message,candidates:[]};}
 const candidates=result.candidates.map(c=>({...c,gv_id:catalog.find(r=>r.id===c.id)?.gv_id}));
 report.rows.push({file:label.file,expected:label.expectedGvIds,status:result.status,error:result.error,candidates,wrong:candidates.some(c=>!label.expectedGvIds.includes(c.gv_id)),correct:candidates.length>0&&candidates.every(c=>label.expectedGvIds.includes(c.gv_id)),ms:Math.round(performance.now()-start)});
 fs.writeFileSync(file,JSON.stringify(report,null,2));
 if(report.rows.length%5===0)console.log(JSON.stringify({processed:report.rows.length,correct:report.rows.filter(r=>r.correct).length,wrong:report.rows.filter(r=>r.wrong).length}));
}
report.summary={scans:report.rows.length,supported:report.rows.filter(r=>r.expected.length).length,correct:report.rows.filter(r=>r.correct).length,wrong:report.rows.filter(r=>r.wrong).length,abstained:report.rows.filter(r=>!r.candidates.length).length};report.finishedAt=new Date().toISOString();report.releaseReady=false;
fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));
