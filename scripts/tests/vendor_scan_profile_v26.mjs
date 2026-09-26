// Local, one-use profiling of the unchanged V25/V23 algorithm. No network.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadVisualCatalogV24 } from '../../apps/web/src/lib/stores/scanVisualCatalogV24.mjs';
import { prepareVisualIndex, VISUAL_VERSION } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
import { shortlistVisualReferencesV25 } from '../../apps/web/src/lib/stores/scanShortlistV25.mjs';
import { prepareGeometryImage, verifyGeometryV23 } from '../../apps/web/src/lib/stores/scanGeometryV23.mjs';
import { prepareReferenceRiskV20, selectUnambiguousGeometry } from '../../apps/web/src/lib/stores/scanReferenceRiskV20.mjs';
const read = p => JSON.parse(fs.readFileSync(p));
const dir = '.local/integration/vendor-scan-runtime-v26'; fs.mkdirSync(dir, { recursive: true });
const output = dir + '/local-profile.private.json'; assert.ok(!fs.existsSync(output));
const report = { at: new Date().toISOString(), scope: 'Local Windows, single-process diagnostic; not hosted or parent/child memory proof.', stages: [], references: [] };
const started = performance.now();
const stage = name => report.stages.push({ name, ms: Math.round(performance.now() - started), rssBytes: process.memoryUsage().rss });
const label = read('.local/integration/vendor-scan-visual-v16/labels.private.json').find(r => r.corpus === 'v2_100' && r.file === 'holdout-0041.heic');
const bytes = fs.readFileSync(label.path), catalog = loadVisualCatalogV24(new URL('../../apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz', import.meta.url)); stage('catalog');
const risk = prepareReferenceRiskV20(catalog), references = prepareVisualIndex({ version: VISUAL_VERSION, references: catalog }); stage('index');
const ids = await shortlistVisualReferencesV25(bytes, references); stage('shortlist');
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url)), cv = require('@techstark/opencv-js');
if (!cv.Mat) await new Promise(resolve => { cv.onRuntimeInitialized = resolve; }); stage('opencv');
const scan = await prepareGeometryImage(cv, bytes); stage('scan');
const images = new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(r => [r.id, r])), candidates = [];
for (const id of ids) {
  const data = fs.readFileSync(images.get(id).source), start = performance.now();
  const reference = await prepareGeometryImage(cv, data), prepared = performance.now();
  try { const result = verifyGeometryV23(cv, reference, scan); if (result) candidates.push({ id, ...result }); }
  finally { reference.dispose(); }
  report.references.push({ prepareMs: performance.now() - start - (performance.now() - prepared), verifyMs: performance.now() - prepared });
}
const result = selectUnambiguousGeometry(candidates, risk); scan.dispose(); stage('complete');
assert.equal(catalog.find(r => r.id === result.candidates[0]?.id)?.gv_id, 'GV-PK-MEW-005');
report.correct = true; report.referenceCount = ids.length;
report.referencePrepareMs = Math.round(report.references.reduce((n, r) => n + r.prepareMs, 0));
report.referenceVerifyMs = Math.round(report.references.reduce((n, r) => n + r.verifyMs, 0));
fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ stages: report.stages, references: ids.length, prepareMs: report.referencePrepareMs, verifyMs: report.referenceVerifyMs }));
