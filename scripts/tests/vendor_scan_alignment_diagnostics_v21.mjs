// Expected-reference local visual diagnostics; no OCR or recognition predictions.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { prepareGeometryImage } from '../../apps/web/src/lib/stores/scanGeometryV19.mjs';
import { geometryFrame } from '../../apps/web/src/lib/stores/scanGeometryV16.mjs';
const appRequire = createRequire(new URL('../../apps/web/package.json', import.meta.url)), sharp = appRequire('sharp');
const require = createRequire(new URL('../../.local/integration/opencv-runtime-v16/package.json', import.meta.url));
const cv = require('@techstark/opencv-js'); if (!cv.Mat) await new Promise(resolve => { cv.onRuntimeInitialized = resolve; });
const read = file => JSON.parse(fs.readFileSync(file)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const losses = read('docs/audits/vendor_scan_visual_v19/PROOF_20260924.json').guarded.legacyV2.losses;
const labels = read('.local/integration/vendor-scan-visual-v16/labels.private.json');
const catalog = JSON.parse(gunzipSync(fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz')));
const images = new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(row => [row.id, row]));
const dir = '.local/integration/vendor-scan-visual-v21', output = dir + '/alignment-diagnostics.private.json';
const report = { at: new Date().toISOString(), scope: 'Nine expected-reference diagnostics; no identity predictions.', rows: [] };
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });

function align(reference, scan) {
  const objects = [], own = x => (objects.push(x), x);
  try {
    const matcher = own(new cv.BFMatcher(cv.NORM_HAMMING, false)), pairs = own(new cv.DMatchVectorVector());
    matcher.knnMatch(reference.descriptor, scan.descriptor, pairs, 2);
    const src = [], dst = [];
    for (let i = 0; i < pairs.size(); i++) { const pair = pairs.get(i); try {
      if (pair.size() !== 2) continue; const a = pair.get(0), b = pair.get(1);
      if (a.distance >= .75 * b.distance || a.distance >= 64) continue;
      const p = reference.points.get(a.queryIdx).pt, q = scan.points.get(a.trainIdx).pt;
      src.push(p.x, p.y); dst.push(q.x, q.y);
    } finally { pair.delete(); } }
    const count = src.length / 2; if (count < 40) return { stage: 'matches', count };
    const source = own(cv.matFromArray(count, 1, cv.CV_32FC2, src)), dest = own(cv.matFromArray(count, 1, cv.CV_32FC2, dst)), mask = own(new cv.Mat());
    cv.setRNGSeed(1600); const h = own(cv.findHomography(source, dest, cv.RANSAC, 3, mask, 2000, .995));
    if (h.empty()) return { stage: 'homography' };
    let inliers = 0, art = 0; const cells = new Set();
    for (let i = 0; i < count; i++) if (mask.data[i]) { const x = src[2 * i], y = src[2 * i + 1]; inliers++; if (y > 132 && y < 528) art++; cells.add(Math.floor(x / 160) + ':' + Math.floor(y / 147)); }
    const frame = geometryFrame(h.data64F);
    const metrics = { count, inliers, ratio: inliers / count, art, cells: cells.size, frame,
      spatialPass: inliers >= 40 && inliers / count >= .55 && art >= 8 && cells.size >= 8 && !!frame };
    if (!frame) return { stage: 'frame', ...metrics };
    const warped = own(new cv.Mat()); cv.warpPerspective(scan.image, warped, h, new cv.Size(640, 880), cv.INTER_LINEAR | cv.WARP_INVERSE_MAP);
    return { ...metrics, bytes: Buffer.from(warped.data) };
  } finally { for (const o of objects.reverse()) o.delete(); }
}
function correlation(a, b, [x1,y1,x2,y2], dx, dy) {
  let sx=0,sy=0,sxx=0,syy=0,sxy=0,n=0;
  for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++){const v=a[y*640+x],w=b[(y+dy)*640+x+dx];sx+=v;sy+=w;sxx+=v*v;syy+=w*w;sxy+=v*w;n++;}
  const vx=sxx/n-(sx/n)**2,vy=syy/n-(sy/n)**2;
  return vx<64||vy<64?null:(sxy/n-sx*sy/n/n)/Math.sqrt(vx*vy);
}
function best(a,b,box){let result={correlation:-1};for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const score=correlation(a,b,box,dx,dy);if(score!==null&&score>result.correlation)result={correlation:score,dx,dy};}return result;}
async function detail(bytes){const blur=await sharp(bytes,{raw:{width:640,height:880,channels:1}}).blur(2).greyscale().raw().toBuffer();assert.equal(blur.length,bytes.length);return Float32Array.from(bytes,(v,i)=>v-blur[i]);}
for (let index = 0; index < losses.length; index++) {
  const loss = losses[index], label = labels.find(row => row.corpus === loss.corpus && row.file === loss.file), image = images.get(catalog.find(row => row.gv_id === loss.gv_id).id);
  const bytes = fs.readFileSync(label.path), refBytes = fs.readFileSync(image.source);
  assert.equal(hash(bytes), label.sha256); assert.equal(hash(refBytes), image.sha256);
  const ref = await prepareGeometryImage(cv, refBytes), scan = await prepareGeometryImage(cv, bytes);
  try { for (const view of ['original', 'balanced']) {
    const result = align(view === 'original' ? ref.original : ref, view === 'original' ? scan.original : scan);
    const aligned = result.bytes; delete result.bytes;
    if (aligned) {
      const reference = Buffer.from(ref.image.data), a = await detail(reference), b = await detail(aligned);
      result.regions = {};
      for (const [name,box] of [['title',[32,22,608,141]],['art',[40,150,600,515]],['footer',[20,783,620,862]]]) result.regions[name] = { raw:correlation(reference,aligned,box,0,0), shifted:best(reference,aligned,box), detail:best(a,b,box) };
      if (index === 6 && view === 'balanced') {
        await sharp(reference,{raw:{width:640,height:880,channels:1}}).png().toFile(dir+'/butterfree-reference.png');
        await sharp(aligned,{raw:{width:640,height:880,channels:1}}).png().toFile(dir+'/butterfree-aligned.png');
      }
    }
    report.rows.push({ file:loss.file, gv_id:loss.gv_id, view, ...result });
  } } finally { ref.dispose(); scan.dispose(); }
  fs.writeFileSync(output, JSON.stringify(report,null,2));
}
report.finishedAt=new Date().toISOString();fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.rows.map(r=>({file:r.file,view:r.view,spatial:r.spatialPass,art:r.art,footer:r.regions?.footer}))));
