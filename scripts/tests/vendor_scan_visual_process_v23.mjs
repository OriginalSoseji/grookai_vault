import './vendor_storefront_network_guard.cjs';
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{runScanProcess}from'../../apps/web/src/lib/stores/scanProcessV1.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const labels=read('.local/integration/vendor-scan-visual-v16/labels.private.json').rows;
const worker=new URL('./vendor_scan_visual_worker_local_v23.mjs',import.meta.url);
const output='.local/integration/vendor-scan-visual-v23/cold-worker.private.json';
const report={at:new Date().toISOString(),scope:'Fresh disposable local process per scan,512MB V8 heap,20second parent deadline,pinned local reference files,no network/credential access. Not hosted proof.',workerSha256:hash(fs.readFileSync(worker)),rows:[]};
fs.writeFileSync(output,JSON.stringify(report),{flag:'wx'});
const all=Array.isArray(labels)?labels:read('.local/integration/vendor-scan-visual-v16/labels.private.json');
const cases=all.filter(r=>r.corpus==='browser_heic'||r.corpus==='legacy');
assert.equal(cases.length,3);
for(const label of cases){const b=fs.readFileSync(label.path);assert.equal(hash(b),label.sha256);const start=performance.now();let result,error;
 try{result=await runScanProcess(worker,{bytes:b},{timeoutMs:20000});}catch(e){error=e.code||e.message;}
 const expectedRotation=label.corpus==='legacy'?180:0;
 const correct=!!result?.candidates.length&&result.candidates.every(c=>label.expected.includes(c.gv_id)&&c.rotation===expectedRotation);
 let workerExited=false;if(result?.pid){try{process.kill(result.pid,0);}catch(e){workerExited=e.code==='ESRCH';}}
 const row={corpus:label.corpus,file:label.file,ms:Math.round(performance.now()-start),correct,error,workerExited,result};report.rows.push(row);fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({file:row.file,ms:row.ms,correct,error,workerExited,resources:result?.resources}));
}
assert.equal(hash(fs.readFileSync(worker)),report.workerSha256);report.finishedAt=new Date().toISOString();
report.summary={cases:report.rows.length,correct:report.rows.filter(r=>r.correct).length,errors:report.rows.filter(r=>r.error).length,allExited:report.rows.every(r=>r.workerExited)};fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));
