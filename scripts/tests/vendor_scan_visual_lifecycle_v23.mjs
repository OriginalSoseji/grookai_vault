// One-use real local CV-worker cancellation/deadline/retry proof.
import './vendor_storefront_network_guard.cjs';
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{runScanProcess}from'../../apps/web/src/lib/stores/scanProcessV1.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const labels=JSON.parse(fs.readFileSync('.local/integration/vendor-scan-visual-v16/labels.private.json'));
const label=labels.find(r=>r.corpus==='browser_heic');const bytes=fs.readFileSync(label.path);assert.equal(hash(bytes),label.sha256);
const worker=new URL('./vendor_scan_visual_worker_local_v23.mjs',import.meta.url);
const file='.local/integration/vendor-scan-visual-v23/lifecycle.private.json';
const report={at:new Date().toISOString(),workerSha256:hash(fs.readFileSync(worker)),scope:'Local real worker. Cancellation and deadline at4seconds during cold processing, then retry. No hosted owner quota or reference network proof.',rows:[]};
fs.writeFileSync(file,JSON.stringify(report),{flag:'wx'});
for(const kind of['abort','timeout','retry']){
 const start=performance.now(),controller=new AbortController();let timer,result,error;
 if(kind==='abort')timer=setTimeout(()=>controller.abort(),4000);
 try{result=await runScanProcess(worker,{bytes},{timeoutMs:kind==='timeout'?4000:20000,signal:controller.signal});}catch(e){error=e.code||e.message;}finally{clearTimeout(timer);}
 const row={kind,ms:Math.round(performance.now()-start),error,status:result?.status,candidates:result?.candidates.map(c=>({gv_id:c.gv_id,rotation:c.rotation}))};report.rows.push(row);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify(row));
 if(kind==='retry'){assert.equal(error,undefined);assert.ok(result.candidates.length);assert.ok(result.candidates.every(c=>label.expected.includes(c.gv_id)&&c.rotation===0));}
 else{assert.equal(error,kind==='abort'?'aborted':'timeout');assert.ok(row.ms<8000,'Local disposal exceeded generous8second boundary');}
}
assert.equal(hash(fs.readFileSync(worker)),report.workerSha256);report.finishedAt=new Date().toISOString();report.passed=true;fs.writeFileSync(file,JSON.stringify(report,null,2));
