// OFFLINE TEST WORKER ONLY. Pinned local files; never a serving entry point.
import fs from 'node:fs';import net from 'node:net';import tls from 'node:tls';
import {createHash}from'node:crypto';import {gunzipSync}from'node:zlib';import{createRequire}from'node:module';
const deny=()=>{throw Error('No network in visual test worker');};globalThis.fetch=deny;
for(const t of[net,tls])for(const k of['connect','createConnection'])t[k]=deny;
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
process.once('message',async message=>{
 let scan;const cache=new Map();
 try{
  if(!(message.bytes instanceof Uint8Array)||!message.bytes.length||message.bytes.length>4*1024*1024)throw Error('Invalid input');
  const selection=read(process.env.USERPROFILE+'/.codex/tmp/vendor-real-scans-20260923/holdout-visual-v23/selection.private.json');
  for(const[file,sha]of Object.entries(selection.sources))if(hash(fs.readFileSync(file))!==sha)throw Error('Changed source');
  const data=fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');if(hash(data)!==selection.catalogSha256)throw Error('Changed catalog');
  const catalog=JSON.parse(gunzipSync(data,{maxOutputLength:100*1024*1024}));
  const byId=new Map(catalog.map(r=>[r.id,r]));
  const {prepareVisualIndex,VISUAL_VERSION}=await import('../../apps/web/src/lib/stores/visualMatchCore.mjs');
  const {shortlistVisualReferences}=await import('../../apps/web/src/lib/stores/scanShortlistV19.mjs');
  const {prepareGeometryImage,verifyGeometryV23}=await import('../../apps/web/src/lib/stores/scanGeometryV23.mjs');
  const {prepareReferenceRiskV20,selectUnambiguousGeometry}=await import('../../apps/web/src/lib/stores/scanReferenceRiskV20.mjs');
  const refs=prepareVisualIndex({version:VISUAL_VERSION,references:catalog}),risk=prepareReferenceRiskV20(catalog);
  const images=new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(r=>[r.id,r]));
  const require=createRequire(new URL('../../.local/integration/opencv-runtime-v16/package.json',import.meta.url)),cv=require('@techstark/opencv-js');
  if(!cv.Mat)await new Promise(resolve=>{cv.onRuntimeInitialized=resolve;});
  const ids=await shortlistVisualReferences(message.bytes,refs,catalog),candidates=[];
  scan=await prepareGeometryImage(cv,message.bytes);
  for(const id of ids){const row=images.get(id),b=fs.readFileSync(row.source);if(hash(b)!==row.sha256)throw Error('Changed reference');
   const ref=await prepareGeometryImage(cv,b);cache.set(id,ref);
   const result=verifyGeometryV23(cv,ref,scan);if(result)candidates.push({id,gv_id:byId.get(id).gv_id,...result});
  }
  process.send({ok:true,result:{...selectUnambiguousGeometry(candidates,risk),resources:{peakRss:process.resourceUsage().maxRSS*1024,heapUsed:process.memoryUsage().heapUsed},pid:process.pid}});
 }catch(e){process.send?.({ok:false,stage:'matching',error:e.message});}
 finally{scan?.dispose();for(const v of cache.values())v.dispose();}
});
