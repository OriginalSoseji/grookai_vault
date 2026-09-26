import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { prepareGeometryImage, verifyGeometryV19 } from '../../apps/web/src/lib/stores/scanGeometryV19.mjs';
import { prepareReferenceRisk, selectUnambiguousGeometry } from '../../apps/web/src/lib/stores/scanReferenceRiskV18.mjs';
const read = path => JSON.parse(fs.readFileSync(path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const dir = '.local/integration/vendor-scan-visual-v19'; fs.mkdirSync(dir, { recursive: true });
const output = dir + '/regression.private.json';
const shortlistPath = '.local/integration/vendor-scan-visual-v16/shortlist.private.json', shortlist = read(shortlistPath);
assert.ok(shortlist.finishedAt); assert.equal(shortlist.rows.length, 308);
const catalogBytes = fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');
const catalog = JSON.parse(gunzipSync(catalogBytes)), byId = new Map(catalog.map(row => [row.id, row]));
const risk = prepareReferenceRisk(catalog);
const images = new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(row => [row.id, row]));
const previous = read('.local/integration/vendor-scan-visual-v18/regression.private.json');
const correction = previous.correction;
const sources = ['scanGeometryV16.mjs', 'scanGeometryV19.mjs', 'scanReferenceRiskV18.mjs', 'scanShortlistV16.mjs'];
const sourceHashes = Object.fromEntries(sources.map(name => [name, hash(fs.readFileSync('apps/web/src/lib/stores/' + name))]));
const report = { at: new Date().toISOString(), scope: 'All 308 reused development scans, frozen V16 retrieval and V19 geometry plus V18 ambiguity guard; not deployed.',
  sourceHashes, shortlistSha256: hash(fs.readFileSync(shortlistPath)), catalogSha256: hash(catalogBytes), correction, rows: [] };
fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
const require = createRequire(new URL('../../.local/integration/opencv-runtime-v16/package.json', import.meta.url));
const cv = require('@techstark/opencv-js');
if (!cv.Mat) await new Promise(resolve => { cv.onRuntimeInitialized = resolve; });
const cache = new Map();
async function reference(id) {
  if (cache.has(id)) { const value = cache.get(id); cache.delete(id); cache.set(id, value); return value; }
  const row = images.get(id), bytes = fs.readFileSync(row.source); assert.equal(hash(bytes), row.sha256);
  const value = await prepareGeometryImage(cv, bytes); cache.set(id, value);
  if (cache.size > 32) { const first = cache.keys().next().value; cache.get(first).dispose(); cache.delete(first); }
  return value;
}
try {
  for (const label of shortlist.rows) {
    const start = performance.now(), geometryCandidates = []; let scan, error;
    try {
      const bytes = fs.readFileSync(label.path); assert.equal(hash(bytes), label.sha256);
      scan = await prepareGeometryImage(cv, bytes);
      for (const id of label.ids) {
        const result = verifyGeometryV19(cv, await reference(id), scan);
        if (result) geometryCandidates.push({ id, gv_id: byId.get(id).gv_id, ...result });
      }
    } catch (caught) { error = caught.message; } finally { scan?.dispose(); }
    const result = selectUnambiguousGeometry(geometryCandidates, risk);
    if (error) { result.status = 'error'; result.candidates = []; }
    const corrected = label.corpus === correction.corpus && label.file === correction.file;
    if (corrected) assert.equal(label.sha256, correction.scanSha256);
    const expected = corrected ? correction.corrected : label.expected;
    const expectedRotation = label.corpus === 'legacy' ? 180 : label.corpus === 'browser_heic' ? 0
      : label.corpus === 'gallery_v12' ? (label.file === 'gallery-3.jpg' ? 180 : 0) : undefined;
    const wrong = result.candidates.some(candidate => !expected.includes(candidate.gv_id)
      || expectedRotation !== undefined && candidate.rotation !== expectedRotation);
    const rawWrong = result.candidates.some(candidate => !label.expected.includes(candidate.gv_id)
      || expectedRotation !== undefined && candidate.rotation !== expectedRotation);
    const prior = previous.rows.find(row => row.corpus === label.corpus && row.file === label.file);
    report.rows.push({ corpus: label.corpus, file: label.file, expected, originalExpected: label.expected, expectedRotation,
      geometryCandidates, ...result, error, correct: result.candidates.length > 0 && !wrong, wrong, rawWrong,
      v18Correct: prior.correct, v15Correct: prior.v15Correct, ms: Math.round(performance.now() - start) });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    if (report.rows.length % 20 === 0) console.log(JSON.stringify({ processed: report.rows.length,
      correct: report.rows.filter(row => row.correct).length, wrong: report.rows.filter(row => row.wrong).length }));
  }
} finally { for (const value of cache.values()) value.dispose(); }
for (const name of sources) assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/' + name)), sourceHashes[name]);
report.finishedAt = new Date().toISOString();
report.summary = { files: report.rows.length, supported: report.rows.filter(row => row.expected.length).length,
  correct: report.rows.filter(row => row.correct).length, wrong: report.rows.filter(row => row.wrong).length,
  rawWrong: report.rows.filter(row => row.rawWrong).length, errors: report.rows.filter(row => row.error).length,
  manualReview: report.rows.filter(row => row.status === 'manual_review').length,
  negativesRejected: report.rows.filter(row => !row.expected.length && !row.candidates.length).length,
  v18Losses: report.rows.filter(row => row.v18Correct && !row.correct).length,
  v15Losses: report.rows.filter(row => row.v15Correct && !row.correct).length,
  peakRss: process.resourceUsage().maxRSS * 1024 };
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary));
