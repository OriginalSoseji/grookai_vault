import './vendor_storefront_network_guard.cjs';import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{runScanProcess}from'../../apps/web/src/lib/stores/scanProcessV1.mjs';
const base=process.env.USERPROFILE+'/.codex/tmp/vendor-real-scans-20260923/gallery-v12',labels=JSON.parse(fs.readFileSync(base+'/frozen-labels.private.json')).labels;
const worker=new URL('../../apps/web/src/lib/stores/scanMatchWorker.mjs',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex'),rows=[];
const output='.local/integration/vendor-scan-release-20260924/worker-real-'+Date.now()+'.private.json';
for(const label of labels){
 const start=performance.now(),result=await runScanProcess(worker,{version:'v14',bytes:fs.readFileSync(base+'/derived/'+label.file)},{timeoutMs:20000});
 assert.ok(result.candidates.length);assert.ok(result.references.every(r=>label.expectedGvIds.includes(r.gv_id)));assert.ok(result.candidates.every(c=>c.rotation===label.expectedRotation));
 rows.push({file:label.file,ms:Math.round(performance.now()-start),status:result.status,gvIds:result.references.map(r=>r.gv_id),resources:result.resources});
 fs.writeFileSync(output,JSON.stringify({at:new Date().toISOString(),workerSha256:hash(fs.readFileSync(worker)),rows},null,2));console.log(JSON.stringify(rows.at(-1)));
}

