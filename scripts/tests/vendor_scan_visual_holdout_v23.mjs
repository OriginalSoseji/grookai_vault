// One-use unused-byte convenience sample. Labels and sources frozen before matching.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';import {createRequire} from 'node:module';
import {prepareVisualIndex,VISUAL_VERSION} from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
import {shortlistVisualReferences} from '../../apps/web/src/lib/stores/scanShortlistV19.mjs';
import {prepareGeometryImage,verifyGeometryV23} from '../../apps/web/src/lib/stores/scanGeometryV23.mjs';
import {prepareReferenceRiskV20,selectUnambiguousGeometry} from '../../apps/web/src/lib/stores/scanReferenceRiskV20.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const base=path.join(process.env.USERPROFILE,'.codex/tmp/vendor-real-scans-20260923/holdout-visual-v23');
const selection=read(base+'/selection.private.json'),labels=read(base+'/frozen-labels.private.json');
function checkSources(){for(const[file,sha]of Object.entries(selection.sources))assert.equal(hash(fs.readFileSync(file)),sha);}
checkSources();assert.deepEqual(labels.sources,selection.sources);assert.ok(Date.parse(selection.at)<Date.parse(labels.at));
assert.equal(hash(fs.readFileSync(base+'/selection.private.json')),labels.selectionSha256);
const bytes=fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');assert.equal(hash(bytes),selection.catalogSha256);
const catalog=JSON.parse(gunzipSync(bytes)),byId=new Map(catalog.map(r=>[r.id,r]));
const refs=prepareVisualIndex({version:VISUAL_VERSION,references:catalog}),risk=prepareReferenceRiskV20(catalog);
const images=new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(r=>[r.id,r]));
const report={at:new Date().toISOString(),scope:'Unused-byte convenience sample; physical-copy independence unproven. Full visual retrieval and V23 geometry, V20 ambiguity guard, local pinned references.',sourceHashes:selection.sources,catalogSha256:selection.catalogSha256,labelsSha256:hash(fs.readFileSync(base+'/frozen-labels.private.json')),rows:[]};
assert.ok(Date.parse(labels.at)<Date.parse(report.at));const output=base+'/results.private.json';fs.writeFileSync(output,JSON.stringify(report),{flag:'wx'});
const require=createRequire(new URL('../../.local/integration/opencv-runtime-v16/package.json',import.meta.url)),cv=require('@techstark/opencv-js');
if(!cv.Mat)await new Promise(resolve=>{cv.onRuntimeInitialized=resolve;});
const cache=new Map();
async function reference(id){if(cache.has(id)){const v=cache.get(id);cache.delete(id);cache.set(id,v);return v;}const row=images.get(id),b=fs.readFileSync(row.source);assert.equal(hash(b),row.sha256);const v=await prepareGeometryImage(cv,b);cache.set(id,v);if(cache.size>32){const key=cache.keys().next().value;cache.get(key).dispose();cache.delete(key);}return v;}
try{for(const label of labels.labels){
 if(label.previouslySeen)continue;assert.ok(!selection.priorHashes.includes(label.originalSha256));
 const original=fs.readFileSync(base+'/originals/'+label.file);assert.equal(hash(original),label.originalSha256);
 const b=fs.readFileSync(base+'/derived/'+label.file);assert.equal(hash(b),label.sha256);
 const start=performance.now();let scan,error,ids=[];const geometryCandidates=[];
 try{ids=await shortlistVisualReferences(b,refs,catalog);scan=await prepareGeometryImage(cv,b);for(const id of ids){const result=verifyGeometryV23(cv,await reference(id),scan);if(result)geometryCandidates.push({id,gv_id:byId.get(id).gv_id,...result});}}
 catch(e){error=e.message;}finally{scan?.dispose();}
 const result=selectUnambiguousGeometry(geometryCandidates,risk);if(error){result.status='error';result.candidates=[];}
 const wrong=result.candidates.some(c=>!label.expectedGvIds.includes(c.gv_id)||label.expectedRotation!==undefined&&label.expectedRotation!==c.rotation);
 const row={file:label.file,expected:label.expectedGvIds,expectedRotation:label.expectedRotation,ids,geometryCandidates,...result,error,wrong,correct:result.candidates.length>0&&!wrong,ms:Math.round(performance.now()-start)};
 report.rows.push(row);fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({file:row.file,status:row.status,correct:row.correct,wrong:row.wrong,ms:row.ms}));
}}finally{for(const v of cache.values())v.dispose();}
checkSources();report.finishedAt=new Date().toISOString();report.summary={files:report.rows.length,supported:report.rows.filter(r=>r.expected.length).length,correct:report.rows.filter(r=>r.correct).length,wrong:report.rows.filter(r=>r.wrong).length,errors:report.rows.filter(r=>r.error).length,negativesRejected:report.rows.filter(r=>!r.expected.length&&!r.candidates.length).length,peakRss:process.resourceUsage().maxRSS*1024};
fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));
