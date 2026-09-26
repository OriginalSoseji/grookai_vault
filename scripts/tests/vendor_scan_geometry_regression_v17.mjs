import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { prepareGeometryImage, verifyGeometryV17 } from '../../apps/web/src/lib/stores/scanGeometryV17.mjs';

const read = path => JSON.parse(fs.readFileSync(path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePaths = ['apps/web/src/lib/stores/scanGeometryV16.mjs', 'apps/web/src/lib/stores/scanGeometryV17.mjs'];
const sourceHashes = Object.fromEntries(sourcePaths.map(path => [path, hash(fs.readFileSync(path))]));
const base = '.local/integration/vendor-scan-visual-v16';
const output = '.local/integration/vendor-scan-visual-v17';
fs.mkdirSync(output, { recursive: true });
const destination = output + '/geometry-regression.private.json';
const prior = read(base + '/geometry-js-regression.private.json');
assert.ok(prior.finishedAt); assert.equal(prior.rows.length, 308);
assert.equal(prior.sourceSha256, sourceHashes[sourcePaths[0]]);
const labels = read(base + '/labels.private.json');
const images = new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(row => [row.id, row]));
const report = {
  at: new Date().toISOString(), sourceHashes,
  priorSha256: hash(fs.readFileSync(base + '/geometry-js-regression.private.json')),
  labelsSha256: hash(fs.readFileSync(base + '/labels.private.json')),
  scope: 'Monotonic additional guard over all 308 frozen V16 development results. V16 abstentions remain abstentions. No independent accuracy claim.',
  rows: [],
};
fs.writeFileSync(destination, JSON.stringify(report, null, 2), { flag: 'wx' });
const require = createRequire(new URL('../../.local/integration/opencv-runtime-v16/package.json', import.meta.url));
const cv = require('@techstark/opencv-js');
if (!cv.Mat) await new Promise(resolve => { cv.onRuntimeInitialized = resolve; });
const cache = new Map();
async function reference(id) {
  if (cache.has(id)) return cache.get(id);
  const row = images.get(id), bytes = fs.readFileSync(row.source);
  assert.equal(hash(bytes), row.sha256);
  const prepared = await prepareGeometryImage(cv, bytes); cache.set(id, prepared);
  if (cache.size > 32) { const first = cache.keys().next().value; cache.get(first).dispose(); cache.delete(first); }
  return prepared;
}
try {
  for (const previous of prior.rows) {
    const start = performance.now(), candidates = [];
    const label = labels.find(row => row.corpus === previous.corpus && row.file === previous.file);
    let scan, error;
    try {
      if (previous.candidates.length) {
        const bytes = fs.readFileSync(label.path); assert.equal(hash(bytes), label.sha256);
        scan = await prepareGeometryImage(cv, bytes);
        for (const candidate of previous.candidates) {
          const match = verifyGeometryV17(cv, await reference(candidate.id), scan);
          if (match) candidates.push({ id: candidate.id, gv_id: candidate.gv_id, ...match });
        }
      }
    } catch (caught) { error = caught.message; } finally { scan?.dispose(); }
    const expectedRotation = label.corpus === 'legacy' ? 180 : label.corpus === 'browser_heic' ? 0
      : label.corpus === 'gallery_v12' ? (label.file === 'gallery-3.jpg' ? 180 : 0) : undefined;
    const wrong = candidates.some(candidate => !label.expected.includes(candidate.gv_id)
      || expectedRotation !== undefined && candidate.rotation !== expectedRotation);
    const correct = candidates.length > 0 && !wrong;
    report.rows.push({ corpus: label.corpus, file: label.file, expected: label.expected,
      candidates, error, correct, wrong, v16Correct: previous.correct,
      v15Correct: previous.previousCorrect, ms: Math.round(performance.now() - start) });
    fs.writeFileSync(destination, JSON.stringify(report, null, 2));
    if (report.rows.length % 40 === 0) console.log(JSON.stringify({ processed: report.rows.length,
      correct: report.rows.filter(row => row.correct).length, wrong: report.rows.filter(row => row.wrong).length }));
  }
} finally { for (const value of cache.values()) value.dispose(); }
for (const path of sourcePaths) assert.equal(hash(fs.readFileSync(path)), sourceHashes[path]);
report.finishedAt = new Date().toISOString();
report.summary = { scans: report.rows.length, correct: report.rows.filter(row => row.correct).length,
  wrong: report.rows.filter(row => row.wrong).length, errors: report.rows.filter(row => row.error).length,
  v16Losses: report.rows.filter(row => row.v16Correct && !row.correct).length,
  v15Losses: report.rows.filter(row => row.v15Correct && !row.correct).length,
  peakRss: process.resourceUsage().maxRSS * 1024 };
fs.writeFileSync(destination, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary));
