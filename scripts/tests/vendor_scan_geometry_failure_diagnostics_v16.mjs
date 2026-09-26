// Offline failure localization of the frozen verifier, never a recognition result.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { prepareGeometryImage, geometryFrame, regionCorrelation } from '../../apps/web/src/lib/stores/scanGeometryV16.mjs';
const require = createRequire(new URL('../../.local/integration/opencv-runtime-v16/package.json', import.meta.url));
const cv = require('@techstark/opencv-js');
if (!cv.Mat) await new Promise(resolve => { cv.onRuntimeInitialized = resolve; });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(fs.readFileSync(path));
const base = '.local/integration/vendor-scan-visual-v16';
const labels = read(base + '/labels.private.json');
const prior = read(base + '/geometry-js-regression.private.json');
assert.ok(prior.finishedAt);
assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/scanGeometryV16.mjs')), prior.sourceSha256);
const catalog = JSON.parse(gunzipSync(fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz')));
const images = new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(row => [row.id, row]));
const output = base + '/failure-diagnostics.private.json';
const report = { at: new Date().toISOString(), scope: 'Expected-reference diagnostics, not predictions. Development labels only.', geometrySha256: prior.sourceSha256, rows: [] };
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });

function diagnose(reference, scan) {
  const objects = [], own = object => (objects.push(object), object), metrics = {};
  const fail = stage => ({ stage, ...metrics });
  try {
    if (reference.descriptor.rows < 8 || scan.descriptor.rows < 8) return fail('descriptors');
    const matcher = own(new cv.BFMatcher(cv.NORM_HAMMING, false)), pairs = own(new cv.DMatchVectorVector());
    matcher.knnMatch(reference.descriptor, scan.descriptor, pairs, 2);
    const src = [], dst = [];
    for (let i = 0; i < pairs.size(); i++) {
      const pair = pairs.get(i);
      try {
        if (pair.size() !== 2) continue;
        const a = pair.get(0), b = pair.get(1);
        if (a.distance >= .75 * b.distance || a.distance >= 64) continue;
        const p = reference.points.get(a.queryIdx).pt, q = scan.points.get(a.trainIdx).pt;
        src.push(p.x, p.y); dst.push(q.x, q.y);
      } finally { pair.delete(); }
    }
    const count = src.length / 2; metrics.matches = count;
    if (count < 40) return fail('matches');
    const source = own(cv.matFromArray(count, 1, cv.CV_32FC2, src)), dest = own(cv.matFromArray(count, 1, cv.CV_32FC2, dst)), mask = own(new cv.Mat());
    cv.setRNGSeed(1600);
    const h = own(cv.findHomography(source, dest, cv.RANSAC, 3, mask, 2000, .995));
    if (h.empty()) return fail('homography');
    let inliers = 0, art = 0; const cells = new Set();
    for (let i = 0; i < count; i++) if (mask.data[i]) {
      const x = src[2 * i], y = src[2 * i + 1];
      inliers++; if (y > 132 && y < 528) art++;
      cells.add(Math.floor(x / 160) + ':' + Math.floor(y / 147));
    }
    Object.assign(metrics, { inliers, ratio: inliers / count, art, cells: cells.size });
    if (inliers < 40 || inliers / count < .55 || art < 8 || cells.size < 8) return fail('spatial_evidence');
    const frame = geometryFrame(h.data64F); if (!frame) return fail('frame');
    const aligned = own(new cv.Mat());
    cv.warpPerspective(scan.image, aligned, h, new cv.Size(640, 880), cv.INTER_LINEAR | cv.WARP_INVERSE_MAP);
    metrics.correlations = {};
    const failed = [];
    for (const [name, box, min] of [['title', [32, 22, 608, 141], .70], ['art', [40, 150, 600, 515], .80], ['footer', [20, 783, 620, 862], .65]]) {
      const correlation = regionCorrelation(reference.image.data, aligned.data, 640, box);
      metrics.correlations[name] = correlation;
      if (correlation === null || !Number.isFinite(correlation) || correlation < min) failed.push(name);
    }
    return fail(failed.length ? failed.join('+') : 'passed');
  } finally { for (const object of objects.reverse()) object.delete(); }
}

for (const label of labels) {
  const previous = prior.rows.find(row => row.corpus === label.corpus && row.file === label.file);
  if (!label.expected.length || previous.correct) continue;
  // Dratini's visually proven correction remains a separate sidecar.
  const expected = label.corpus === 'v2_100' && label.file === 'holdout-0067.heic' ? ['GV-PK-TEU-116'] : label.expected;
  const bytes = fs.readFileSync(label.path); assert.equal(hash(bytes), label.sha256);
  const scan = await prepareGeometryImage(cv, bytes);
  try {
    for (const gv of expected) {
      const card = catalog.find(row => row.gv_id === gv), image = images.get(card.id), refBytes = fs.readFileSync(image.source);
      assert.equal(hash(refBytes), image.sha256);
      const reference = await prepareGeometryImage(cv, refBytes);
      try { report.rows.push({ corpus: label.corpus, file: label.file, gv_id: gv, ...diagnose(reference, scan) }); }
      finally { reference.dispose(); }
    }
  } finally { scan.dispose(); }
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
}
report.finishedAt = new Date().toISOString();
report.summary = report.rows.reduce((counts, row) => ({ ...counts, [row.stage]: (counts[row.stage] ?? 0) + 1 }), {});
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary));
