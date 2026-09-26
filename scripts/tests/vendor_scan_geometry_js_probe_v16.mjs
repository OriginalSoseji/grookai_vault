import './vendor_storefront_network_guard.cjs';import fs from'node:fs';import{createRequire}from'node:module';
import{prepareGeometryImage,verifyGeometry}from'../../apps/web/src/lib/stores/scanGeometryV16.mjs';
const require=createRequire(new URL('../../.local/integration/opencv-runtime-v16/package.json',import.meta.url)),cv=require('@techstark/opencv-js');
if(!cv.Mat)await new Promise(resolve=>{cv.onRuntimeInitialized=resolve;});
const dir='.local/integration/vendor-scan-release-20260924',refs=JSON.parse(fs.readFileSync(dir+'/visual-probe-inputs.json')),rows=[];
const scans=[['Roserade',dir+'/browser-preview-3f24400435b46194e24a4eab0f52f309023a8ecb484880fd8e284748d01f762c.jpg'],['Flapple',dir+'/browser-preview-24b1e46bd69e0d5c6c5ed3422eae09eb362a9d02271b20f327e0f9e131ae340e.jpg'],['Venusaur',process.env.USERPROFILE+'/.codex/tmp/vendor-real-scans-20260923/derived/scan-0075.jpeg.jpg']];
for(const[name,file]of scans){const s=await prepareGeometryImage(cv,fs.readFileSync(file));try{for(const r of refs){const ref=await prepareGeometryImage(cv,fs.readFileSync(r.source));try{rows.push({scan:name,gv:r.gv,match:verifyGeometry(cv,ref,s)});}finally{ref.dispose();}}}finally{s.dispose();}}
fs.writeFileSync(dir+'/visual-js-probe.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
