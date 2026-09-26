import './vendor_storefront_network_guard.cjs';
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import os from'node:os';import path from'node:path';
import {runVisualProcessV24}from'../../apps/web/src/lib/stores/scanVisualProcessV24.mjs';
import {hashReference}from'../../apps/web/src/lib/stores/scanReferenceDeliveryV24.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grookai-visual-v24-'));
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',bytes=Buffer.from('image');
const byId=new Map([[id,{id,gv_id:'GV-PK-TST-1',image_path:'warehouse-derived/self-hosted-images-v1/1.webp',sha256:hashReference(bytes)}]]);
let serial=0;
function worker(body,data=null){const file=path.join(dir,`worker-${++serial}.mjs`);fs.writeFileSync(file+'.json',JSON.stringify(data));fs.writeFileSync(file,`import fs from 'node:fs';fs.writeFileSync(new URL('./pid-${serial}.txt',import.meta.url),String(process.pid));const data=JSON.parse(fs.readFileSync(new URL(import.meta.url+'.json'),'utf8'));const id='00000000-0000-4000-8000-000000000001';${body}`);return{file,pid:path.join(dir,`pid-${serial}.txt`)};}
function exited(w){if(fs.existsSync(w.pid))assert.throws(()=>process.kill(Number(fs.readFileSync(w.pid)),0));}
const request=`process.send({version:'v24',kind:'references',ids:[id]});`;
const success=`process.send({version:'v24',kind:'result',result:{status:'suggestions',candidates:[{id,rotation:180,secret:'must-not-forward'}],references:[{gv_id:'forged'}]}});`;
const loadReferences=async()=>[{id,bytes}];

test('feature IPC checks the separate artifact binding and preserves cancellation',async()=>{
 const featureBytes=Buffer.from('cache fixture'),featureManifest=new Map([[id,{id,imageSha256:hashReference(bytes),artifactSha256:hashReference(featureBytes),bytes:featureBytes.length}]]);
 const options={byId,featureManifest,loadReferences:async()=>[{id,bytes:featureBytes}],timeoutMs:3000};
 const good=worker(`let n=0;process.on('message',()=>{if(!n++){${request}}else{${success}}});`);
 assert.equal((await runVisualProcessV24(good.file,bytes,options)).candidates[0].id,id);exited(good);
 const bad=worker(`let n=0;process.on('message',()=>{if(!n++){${request}}else{${success}}});`);
 await assert.rejects(runVisualProcessV24(bad.file,bytes,{...options,loadReferences}));exited(bad);
 const stopped=worker(`process.once('message',()=>{${request}});`),controller=new AbortController();let aborted=false;
 await assert.rejects(runVisualProcessV24(stopped.file,bytes,{...options,signal:controller.signal,loadReferences:async(ids,{signal})=>{signal.addEventListener('abort',()=>aborted=true);controller.abort();return new Promise(()=>{});}}),e=>e.code==='aborted');
 assert.equal(aborted,true);exited(stopped);
});
test('progress can overlap reference delivery; resource callback is bounded and cannot change the result',async()=>{
 const w=worker(`let n=0;process.on('message',()=>{if(!n++){${request}process.send({version:'v24',kind:'progress',stage:'opencv'});}else{process.send({version:'v24',kind:'progress',stage:'prepared'});${success}}});`);
 const stages=[],resources=[];
 const result=await runVisualProcessV24(w.file,bytes,{byId,loadReferences:async()=>{await new Promise(r=>setTimeout(r,50));return[{id,bytes}];},onProgress:p=>stages.push(p.stage),onResources:r=>{resources.push(r);throw Error('diagnostic sink failed');},timeoutMs:3000});
 assert.equal(result.candidates.length,1);assert.ok(stages.indexOf('opencv')>stages.indexOf('delivery_start'));assert.ok(stages.indexOf('opencv')<stages.indexOf('delivery_complete'));assert.equal(resources.length,1);assert.equal(resources[0].outcome,'complete');assert.ok(resources[0].samples>=2);exited(w);
});
test('expanded budget is bounded at 30 seconds; invalid budgets never start a worker',async()=>{
 const w=worker(`let n=0;process.on('message',()=>{if(!n++){${request}}else{${success}}});`);
 for(const timeoutMs of[0,-1,30001,Infinity,NaN,1.5])assert.throws(()=>runVisualProcessV24(w.file,bytes,{byId,loadReferences,timeoutMs}),/Invalid visual request/);
 assert.equal(fs.existsSync(w.pid),false);
 await runVisualProcessV24(w.file,bytes,{byId,loadReferences,timeoutMs:30000});exited(w);
});
test('only validated parent metadata is returned; completed worker exits',async()=>{
 const w=worker(`let n=0;process.on('message',()=>{if(!n++){${request}}else{${success}}});`);
 const result=await runVisualProcessV24(w.file,bytes,{byId,loadReferences,timeoutMs:3000});
 assert.deepEqual(result.candidates,[{id,rotation:180}]);assert.equal(result.references[0].gv_id,'GV-PK-TST-1');assert.equal('secret'in result,false);exited(w);
});
test('unknown, duplicate and repeated requests stop before unauthorized delivery',async()=>{
 for(const message of [`{version:'v24',kind:'references',ids:['${other}']}`,`{version:'v24',kind:'references',ids:[id,id]}`,`{version:'bad',kind:'references',ids:[id]}`]){
  const w=worker(`process.once('message',()=>process.send(${message}));`);let calls=0;
  await assert.rejects(runVisualProcessV24(w.file,bytes,{byId,loadReferences:async()=>{calls++;return[];},timeoutMs:3000}));assert.equal(calls,0);exited(w);
 }
 const w=worker(`process.once('message',()=>{${request}${request}});`);let aborted=false;
 await assert.rejects(runVisualProcessV24(w.file,bytes,{byId,loadReferences:async(ids,{signal})=>{signal.addEventListener('abort',()=>aborted=true);return new Promise(()=>{});},timeoutMs:3000}));assert.equal(aborted,true);exited(w);
});
test('a single deadline cancels a stalled parent fetch and kills the child; retry works',async()=>{
 const w=worker(`process.on('message',()=>{${request}});`);let aborted=false;const start=performance.now();
 await assert.rejects(runVisualProcessV24(w.file,bytes,{byId,loadReferences:async(ids,{signal})=>{signal.addEventListener('abort',()=>aborted=true);return new Promise(()=>{});},timeoutMs:250}),e=>e.code==='timeout');
 assert.equal(aborted,true);assert.ok(performance.now()-start<2500);exited(w);
 const next=worker(`let n=0;process.on('message',()=>{if(!n++){${request}}else{${success}}});`);await runVisualProcessV24(next.file,bytes,{byId,loadReferences,timeoutMs:3000});exited(next);
});
test('caller abort cancels parent I/O and CPU-stalled children',async()=>{
 const w=worker(`process.once('message',()=>{${request}});`),controller=new AbortController();let aborted=false;
 const pending=runVisualProcessV24(w.file,bytes,{byId,loadReferences:async(ids,{signal})=>{signal.addEventListener('abort',()=>aborted=true);controller.abort();return new Promise(()=>{});},signal:controller.signal,timeoutMs:3000});
 await assert.rejects(pending,e=>e.code==='aborted');assert.equal(aborted,true);exited(w);
 const cpu=worker(`process.once('message',()=>{while(true){}});`),c=new AbortController();const work=runVisualProcessV24(cpu.file,bytes,{byId,loadReferences,signal:c.signal,timeoutMs:3000});setTimeout(()=>c.abort(),150);await assert.rejects(work,e=>e.code==='aborted');exited(cpu);
});
test('changed reference packets and forged result IDs/rotations are rejected',async()=>{
 const w=worker(`let n=0;process.on('message',()=>{if(!n++){${request}}else{${success}}});`);
 await assert.rejects(runVisualProcessV24(w.file,bytes,{byId,loadReferences:async()=>[{id,bytes:Buffer.from('tampered')}],timeoutMs:3000}));exited(w);
 for(const candidate of [{id:other,rotation:0},{id,rotation:45}]){
  const bad=worker(`let n=0;process.on('message',()=>{if(!n++){${request}}else process.send({version:'v24',kind:'result',result:{status:'suggestions',candidates:[data]}});});`,candidate);
  await assert.rejects(runVisualProcessV24(bad.file,bytes,{byId,loadReferences,timeoutMs:3000}));exited(bad);
 }
});
test('environment credentials are not inherited by the new child',async()=>{
 const old=process.env.SUPABASE_SECRET_KEY;process.env.SUPABASE_SECRET_KEY='synthetic-v24-marker';
 try{const w=worker(`let n=0;process.on('message',()=>{if(process.env.SUPABASE_SECRET_KEY)process.exit(3);if(!n++){${request}}else{${success}}});`);await runVisualProcessV24(w.file,bytes,{byId,loadReferences,timeoutMs:3000});exited(w);}
 finally{if(old===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=old;}
});
