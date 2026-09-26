// Expected-reference diagnostic only. Never an end-to-end recognition result.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { prepareGeometryImage, verifyGeometryV23 } from '../../apps/web/src/lib/stores/scanGeometryV23.mjs';
const appRequire = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const sharp = appRequire('sharp');
const require = createRequire(new URL('../../.local/integration/opencv-runtime-v16/package.json', import.meta.url));
const cv = require('@techstark/opencv-js');
if (!cv.Mat) await new Promise(resolve => { cv.onRuntimeInitialized = resolve; });
const read = file => JSON.parse(fs.readFileSync(file)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const proof = read('docs/audits/vendor_scan_visual_v19/PROOF_20260924.json');
const labels = read('.local/integration/vendor-scan-visual-v16/labels.private.json');
const catalog = JSON.parse(gunzipSync(fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz')));
const images = new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(row => [row.id, row]));
const dir = '.local/integration/vendor-scan-visual-v21'; fs.mkdirSync(dir, { recursive: true });
const report = { at: new Date().toISOString(), scope: 'Expected-reference rotation diagnostic on nine known development failures; no candidate retrieval or deployment.', rows: [] };
const output = dir + '/geometry-v23-focus.private.json'; fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
for (const loss of proof.guarded.legacyV2.losses) {
  const label = labels.find(row => row.corpus === loss.corpus && row.file === loss.file);
  const image = images.get(catalog.find(row => row.gv_id === loss.gv_id).id);
  const bytes = fs.readFileSync(label.path), refBytes = fs.readFileSync(image.source);
  assert.equal(hash(bytes), label.sha256); assert.equal(hash(refBytes), image.sha256);
  const rotated = bytes;
  const reference = await prepareGeometryImage(cv, refBytes), scan = await prepareGeometryImage(cv, rotated);
  try { report.rows.push({ file: loss.file, gv_id: loss.gv_id, result: verifyGeometryV23(cv, reference, scan) }); }
  finally { reference.dispose(); scan.dispose(); }
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
}
report.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.rows));
