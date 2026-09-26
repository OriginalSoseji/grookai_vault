import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { prepareReferenceRisk, selectUnambiguousGeometry } from '../../apps/web/src/lib/stores/scanReferenceRiskV18.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(fs.readFileSync(path));
const base = '.local/integration/vendor-scan-visual-v16';
const directory = '.local/integration/vendor-scan-visual-v18';
fs.mkdirSync(directory, { recursive: true });
const priorPath = base + '/geometry-js-regression.private.json', prior = read(priorPath);
assert.ok(prior.finishedAt); assert.equal(prior.rows.length, 308);
assert.equal(prior.sourceSha256, hash(fs.readFileSync('apps/web/src/lib/stores/scanGeometryV16.mjs')));
const artifact = fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');
const catalog = JSON.parse(gunzipSync(artifact)), risk = prepareReferenceRisk(catalog);
const labels = read(base + '/labels.private.json');
const correction = {
  corpus: 'v2_100', file: 'holdout-0067.heic',
  scanSha256: '8aae2abe8e01443a8d1061d88057345aa56057fdda00f5caf3508ca82da22c08',
  original: ['GV-PK-UNM-147'], corrected: ['GV-PK-TEU-116'],
  evidence: 'Human visual inspection of the pinned scan: footer clearly reads 116/181, Team Up symbol, Dragon Rage 60, Midori Harada illustration. Its No.147 species number is not the collector number. Pinned TEU116 reference agrees; UNM147 has different artwork and Agility 10.',
  scope: 'Post-evaluation development-label correction only. Original labels and all raw reports retained. No catalog or scan changes.',
};
const correctedLabel = labels.find(row => row.corpus === correction.corpus && row.file === correction.file);
assert.equal(hash(fs.readFileSync(correctedLabel.path)), correction.scanSha256);
assert.deepEqual(correctedLabel.expected, correction.original);
const imagePlan = read('.local/integration/vendor-scan-release-20260924/image-plan.private.json');
correction.references = [...correction.original, ...correction.corrected].map(gv => {
  const row = catalog.find(item => item.gv_id === gv), image = imagePlan.images.find(item => item.id === row.id);
  assert.equal(hash(fs.readFileSync(image.source)), image.sha256);
  return { gv_id: gv, sha256: image.sha256 };
});
fs.writeFileSync(directory + '/label-correction.json', JSON.stringify(correction, null, 2), { flag: 'wx' });
const report = { at: new Date().toISOString(), scope: 'Development-only V16 geometry plus reference-family ambiguity guard. No V17 footer-tile gate. No deployment.',
  sourceSha256: hash(fs.readFileSync('apps/web/src/lib/stores/scanReferenceRiskV18.mjs')),
  geometrySha256: prior.sourceSha256, priorSha256: hash(fs.readFileSync(priorPath)),
  catalogSha256: hash(artifact), correction, rows: [] };
for (const previous of prior.rows) {
  const expected = previous.corpus === correction.corpus && previous.file === correction.file ? correction.corrected : previous.expected;
  const result = selectUnambiguousGeometry(previous.candidates, risk);
  const expectedRotation = previous.corpus === 'legacy' ? 180 : previous.corpus === 'browser_heic' ? 0
    : previous.corpus === 'gallery_v12' ? (previous.file === 'gallery-3.jpg' ? 180 : 0) : undefined;
  const wrong = result.candidates.some(row => !expected.includes(row.gv_id)
    || expectedRotation !== undefined && row.rotation !== expectedRotation);
  const rawWrong = result.candidates.some(row => !previous.expected.includes(row.gv_id)
    || expectedRotation !== undefined && row.rotation !== expectedRotation);
  report.rows.push({ corpus: previous.corpus, file: previous.file, expected, originalExpected: previous.expected,
    ...result, correct: result.candidates.length > 0 && !wrong, wrong, rawWrong,
    v15Correct: previous.previousCorrect,
    risks: previous.candidates.map(candidate => ({ id: candidate.id, ...risk(candidate.id) })) });
}
report.summary = { files: report.rows.length, supported: report.rows.filter(row => row.expected.length).length,
  correct: report.rows.filter(row => row.correct).length, wrong: report.rows.filter(row => row.wrong).length,
  rawWrong: report.rows.filter(row => row.rawWrong).length,
  manualReview: report.rows.filter(row => row.status === 'manual_review').length,
  negativesRejected: report.rows.filter(row => !row.expected.length && !row.candidates.length).length,
  v15Losses: report.rows.filter(row => row.v15Correct && !row.correct).length };
report.finishedAt = new Date().toISOString();
fs.writeFileSync(directory + '/regression.private.json', JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ ...report.summary, targets: report.rows.filter(row => ['browser_heic', 'legacy', 'gallery_v12'].includes(row.corpus)).map(row => ({ corpus: row.corpus, file: row.file, correct: row.correct, status: row.status })) }));
