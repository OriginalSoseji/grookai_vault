// Disposable child: local image/CPU work only, no credentials or network.
import fs from 'node:fs';import {gunzipSync}from'node:zlib';import {createHash}from'node:crypto';import net from'node:net';import tls from'node:tls';
const deny=()=>{throw new Error('Matching does not use network access.');};
globalThis.fetch=deny;for(const transport of[net,tls])for(const key of['connect','createConnection'])transport[key]=deny;
const hash=b=>createHash('sha256').update(b).digest('hex');
process.once('message',async message=>{
 let stage='load_reference';
 try{
  if(!['v2','v13','v14'].includes(message?.version)||!(message.bytes instanceof Uint8Array)||message.bytes.length>4*1024*1024)throw Error('Invalid input.');
  const {prepareVisualIndex,VISUAL_VERSION}=await import('./visualMatchCore.mjs');
  let references,catalog,match;
  if(message.version==='v13'||message.version==='v14'){
   const manifest=JSON.parse(fs.readFileSync(new URL('./scanExpandedManifestV13.json',import.meta.url))),bytes=fs.readFileSync(new URL('./scanExpandedCatalogV13.json.gz',import.meta.url));
   if(manifest.database!=='hrtbjchobencariqclab'||manifest.version!=='vendor_scan_artifact_v13'||hash(bytes)!==manifest.artifactSha256)throw Error('Invalid reference package.');
   catalog=JSON.parse(gunzipSync(bytes,{maxOutputLength:100*1024*1024}));if(catalog.length!==manifest.references)throw Error('Invalid reference count.');
   stage='prepare_index';references=prepareVisualIndex({version:VISUAL_VERSION,references:catalog});stage='import_engine';match=message.version==='v14'?(await import('./scanMatchV14.mjs')).matchScanV14:(await import('./scanMatchV13.mjs')).matchScanV13;
  }else{
   const index=JSON.parse(fs.readFileSync(new URL('./visualMatchIndex.json',import.meta.url)));
   if(index.database!=='hrtbjchobencariqclab')throw Error('Invalid reference target.');
   catalog=JSON.parse(fs.readFileSync(new URL('./visualMatchCatalog.json',import.meta.url)));references=prepareVisualIndex(index);match=(await import('./scanMatchV2.mjs')).matchScanV2;
  }
  stage='matching';const start=performance.now(),result=await match(message.bytes,references,catalog);stage='result';
  const byId=new Map(catalog.map(r=>[r.id,r]));
  // V2 catalog has no descriptor metadata; use its original index for revalidation.
  const metadata=message.version==='v2'?JSON.parse(fs.readFileSync(new URL('./visualMatchIndex.json',import.meta.url))).references:catalog;
  const metaById=new Map(metadata.map(r=>[r.id,r]));
  if(result.candidates.some(c=>!byId.has(c.id)))throw Error('Unknown result.');
  process.send({ok:true,result:{...result,references:result.candidates.map(c=>{const r=metaById.get(c.id);return{id:r.id,gv_id:r.gv_id,image_path:r.image_path};}),resources:{matchMs:Math.round(performance.now()-start),peakRssBytes:process.resourceUsage().maxRSS*1024}}});
 }catch{process.send?.({ok:false,stage});}
});
