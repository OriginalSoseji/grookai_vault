// Real packaged worker and loopback HTTP image delivery. Synthetic authorization;
// no database, external network, telemetry or hosted serving changes.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';import http from 'node:http';import assert from 'node:assert/strict';import {createHash}from'node:crypto';
import {visualReferenceMetadataV24}from'../../apps/web/src/lib/stores/scanVisualCatalogV24.mjs';
import {createReferenceDelivery,eligibleReferenceIds}from'../../apps/web/src/lib/stores/scanReferenceDeliveryV24.mjs';
import {runVisualProcessV24}from'../../apps/web/src/lib/stores/scanVisualProcessV24.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const budget=true;const dir='.local/integration/vendor-scan-runtime-v26',output=dir+'/runtime-final.private.json';
const byId=visualReferenceMetadataV24(new URL('../../apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz',import.meta.url)),plan=read('.local/integration/vendor-scan-release-20260924/image-plan.private.json');
const images=new Map(plan.images.map(r=>[r.id,r])),paths=new Map(plan.images.map(r=>['/storage/v1/object/sign/user-card-images/'+r.path,r]));
let requests=0;const server=http.createServer((req,res)=>{
 const row=paths.get(new URL(req.url,'http://127.0.0.1').pathname);
 if(!row){res.writeHead(404);res.end();return;}
 const bytes=fs.readFileSync(row.source);assert.equal(hash(bytes),row.sha256);requests++;
 res.writeHead(200,{'content-type':row.path.endsWith('.webp')?'image/webp':row.path.endsWith('.png')?'image/png':'image/jpeg','content-length':bytes.length});res.end(bytes);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const loader=createReferenceDelivery({byId,origin,authorize:async rows=>eligibleReferenceIds(rows,rows.map(r=>({...r,image_source:'identity',image_status:'exact'})),rows.map(r=>({id:r.id,card_print_id:r.id,printing_gv_id:r.gv_id+'-TEST',finish_is_active:true}))),sign:async rows=>rows.map(r=>origin+'/storage/v1/object/sign/user-card-images/'+r.image_path+'?token=local-synthetic')});
const labels=read('.local/integration/vendor-scan-visual-v16/labels.private.json'),previous=read('.local/integration/vendor-scan-visual-v23/regression.private.json');
const lost=new Set(['holdout-0041.heic','holdout-0081.jpeg','holdout-0083.jpeg','holdout-0085.jpeg','holdout-0087.jpeg','holdout-0089.jpeg','holdout-0091.jpeg','holdout-0095.jpeg','holdout-0097.jpeg']);
const cases=labels.filter(r=>['gallery_v12','browser_heic','legacy'].includes(r.corpus)||r.corpus==='v2_100'&&lost.has(r.file)).map(r=>({...r,expectedResult:previous.rows.find(p=>p.corpus===r.corpus&&p.file===r.file)}));
const fresh=process.env.USERPROFILE+'/.codex/tmp/vendor-real-scans-20260923/holdout-visual-v23';
for(const file of['fresh-01.jpeg','fresh-12.jpeg']){const label=read(fresh+'/frozen-labels.private.json').labels.find(r=>r.file===file);cases.push({...label,corpus:'fresh_v23',path:fresh+'/derived/'+file,expectedResult:read(fresh+'/results.private.json').rows.find(r=>r.file===file)});}
assert.equal(cases.length,17);
const sourceFiles=['scanReferenceDeliveryV24.mjs','scanVisualCatalogV24.mjs','scanVisualProcessV24.mjs','scanVisualWorkerV26.mjs','scanShortlistV25.mjs','scanResourceSamplerV26.mjs'];
const sourceHashes=Object.fromEntries(sourceFiles.map(n=>[n,hash(fs.readFileSync('apps/web/src/lib/stores/'+n))]));
const report={at:new Date().toISOString(),scope:'17 reused development cases through actual V24 worker, SDK-independent synthetic authorization and real bounded loopback HTTP delivery. No hosted/database proof.',sourceHashes,rows:[]};
fs.writeFileSync(output,JSON.stringify(report),{flag:'wx'});
try{
 for(const label of cases){
  const bytes=fs.readFileSync(label.path);assert.equal(hash(bytes),label.sha256);const start=performance.now(),before=requests;let result,error,resources;const progress=[];
  try{result=await runVisualProcessV24(new URL('../../apps/web/src/lib/stores/scanVisualWorkerV26.mjs',import.meta.url),bytes,{byId,loadReferences:loader,timeoutMs:budget?30000:20000,onResources:r=>resources=r,onProgress:p=>progress.push(p)});}catch(e){error=e.code||e.message;}
  const wanted=label.expectedResult.candidates.map(c=>({id:c.id,rotation:c.rotation}));
  const same=!!result&&JSON.stringify(result.candidates)===JSON.stringify(wanted)&&result.status===label.expectedResult.status;
  report.rows.push({corpus:label.corpus,file:label.file,expected:wanted,result,error,same,resources,progress,ms:Math.round(performance.now()-start),imageRequests:requests-before});
  fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({file:label.file,same,error,ms:report.rows.at(-1).ms,images:requests-before}));
 }
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
for(const[name,sha]of Object.entries(sourceHashes))assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/'+name)),sha);
report.finishedAt=new Date().toISOString();report.summary={cases:report.rows.length,same:report.rows.filter(r=>r.same).length,errors:report.rows.filter(r=>r.error).length,maxMs:Math.max(...report.rows.map(r=>r.ms)),requests};
fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));assert.equal(report.summary.same,17);
