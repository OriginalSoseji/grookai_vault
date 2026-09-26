// Local-only benchmark. Real scans remain outside git and are never transmitted.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
import {scanDescriptor,prepareVisualIndex,rankVisualScan} from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));const sharp=require('sharp');
const root=new URL('../../',import.meta.url);const cache=new URL('.local/integration/vendor-pilot-20260922/visual-reference-cache/',root);
const artifactBytes=fs.readFileSync(new URL('apps/web/src/lib/stores/visualMatchIndex.json',root));const artifact=JSON.parse(artifactBytes);const index=prepareVisualIndex(artifact);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');const transformed=[];
for(const row of artifact.references.filter((_,i)=>i%4===0)){
 const bytes=fs.readFileSync(new URL(row.id+'.webp',cache));assert.equal(hash(bytes),row.sha256);
 const scan=await sharp(bytes).resize(600,840,{fit:'fill'}).modulate({brightness:.78,saturation:.85}).blur(.4).jpeg({quality:68}).toBuffer();
 const start=performance.now();const result=rankVisualScan(await scanDescriptor(scan),index);
 transformed.push({id:row.id,top1:result.candidates[0]?.id===row.id,top3:result.candidates.slice(0,3).some(c=>c.id===row.id),ambiguous:result.status==='ambiguous',ms:performance.now()-start});
}
assert.ok(transformed.every(r=>r.top3));
const privateDir=path.join(process.env.USERPROFILE,'.codex/tmp/tcgautomate-review-20260922');const negatives=[];
for(const name of ['sample-0.jpg','sample-1.jpg','sample-2.jpg']){
 const bytes=fs.readFileSync(path.join(privateDir,name));let result;
 try{result=rankVisualScan(await scanDescriptor(bytes),index);assert.equal(result.status,'no_match');}catch(e){if(e.code==='ERR_ASSERTION')throw e;result={status:'unreadable',message:e.message};}
 negatives.push({sha256:hash(bytes),role:name==='sample-0.jpg'?'out-of-catalog Dragonair OBF 158':name==='sample-1.jpg'?'Pokemon back':'multi-card contact sheet',result});
}
// Separate historical reference validates one manually read real front, never added to pilot canon/index.
const metadata=fs.readFileSync('C:/grookai_vault/.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1/metadata.jsonl','utf8').trim().split('\n').map(JSON.parse);
const dragonair=metadata.find(r=>r.gv_id==='GV-PK-OBF-158');assert.equal(dragonair.image_status,'exact');
const referenceBytes=fs.readFileSync(dragonair.source_path);const reference={id:dragonair.card_id,gv_id:dragonair.gv_id,image_path:'offline-historical-reference',sha256:hash(referenceBytes),descriptor:await scanDescriptor(referenceBytes)};
const real=rankVisualScan(await scanDescriptor(fs.readFileSync(path.join(privateDir,'sample-0.jpg'))),prepareVisualIndex({...artifact,references:[...artifact.references,reference]}));
assert.equal(real.candidates[0]?.id,reference.id);
const sorted=transformed.map(r=>r.ms).sort((a,b)=>a-b);
const receipt={at:new Date().toISOString(),version:artifact.version,artifactSha256:hash(artifactBytes),referenceCount:artifact.references.length,source:'isolated current pilot exact canonical images; SHA256 checked against retained storage readback',transformed:{count:transformed.length,top1:transformed.filter(r=>r.top1).length,top3:transformed.filter(r=>r.top3).length,ambiguous:transformed.filter(r=>r.ambiguous).length,p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)]},realFront:{expectedGvId:reference.gv_id,referenceSha256:reference.sha256,result:real,scope:'local historical reference plus current pilot distractors; excluded from hosted pilot index'},negatives,limitations:['Transformed references are not an independent physical-card benchmark','One real positive scan only','Not broad camera, glare, perspective, language or game coverage','Parent suggestions only; no finish/price/condition inference','321 exact references out of 326 pilot cards; non-exact artwork excluded']};
fs.writeFileSync(new URL('docs/audits/vendor_batch_intake_v1/visual-matching-benchmark-20260923.json',root),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt.transformed));
