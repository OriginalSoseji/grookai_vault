import './vendor_storefront_network_guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {runScanProcess,readScanBody} from '../../apps/web/src/lib/stores/scanProcessV1.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grookai-scan-process-'));
const worker=path.join(dir,'worker.mjs');
fs.writeFileSync(worker,`process.once('message',m=>{if(m.mode==='hang')while(true){};if(m.mode==='crash')process.exit(2);if(m.mode==='credentials')process.send({ok:true,result:{candidates:[],secretPresent:!!process.env.SUPABASE_SECRET_KEY}});else process.send({ok:true,result:{candidates:[],pid:process.pid}});});`);

test('hard deadline kills a CPU-stalled reader and leaves the next request usable',async()=>{
 const start=performance.now();await assert.rejects(runScanProcess(worker,{mode:'hang'},{timeoutMs:300}),e=>e.code==='timeout');
 assert.ok(performance.now()-start<3000);
 const next=await runScanProcess(worker,{mode:'ok'},{timeoutMs:3000});assert.deepEqual(next.candidates,[]);
 assert.throws(()=>process.kill(next.pid,0));
});
test('abort, crash and secret isolation are enforced',async()=>{
 const control=new AbortController();const running=runScanProcess(worker,{mode:'hang'},{timeoutMs:3000,signal:control.signal});setTimeout(()=>control.abort(),200);await assert.rejects(running,e=>e.code==='aborted');
 await assert.rejects(runScanProcess(worker,{mode:'crash'},{timeoutMs:3000}));
 const before=process.env.SUPABASE_SECRET_KEY;process.env.SUPABASE_SECRET_KEY='test-only-marker';
 try{assert.equal((await runScanProcess(worker,{mode:'credentials'},{timeoutMs:3000})).secretPresent,false);}finally{if(before===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=before;}
});
test('streaming bodies cap bytes, expire stalled reads and accept a subsequent request',async()=>{
 let cancelled=false;const stalled=new ReadableStream({cancel(){cancelled=true;}});
 await assert.rejects(readScanBody(stalled,{maxBytes:4,timeoutMs:30}),e=>e.code==='timeout');assert.equal(cancelled,true);
 const oversized=new ReadableStream({start(c){c.enqueue(new Uint8Array(5));c.close();}});
 await assert.rejects(readScanBody(oversized,{maxBytes:4}),e=>e.code==='too_large');
 const valid=new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2]));c.close();}});
 assert.deepEqual([...await readScanBody(valid,{maxBytes:4})],[1,2]);
});
