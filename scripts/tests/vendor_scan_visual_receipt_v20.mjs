// Finalize existing offline results. No network, database, hosting or inventory actions.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { prepareReferenceRiskV20, selectUnambiguousGeometry } from '../../apps/web/src/lib/stores/scanReferenceRiskV20.mjs';
const read = file => JSON.parse(fs.readFileSync(file)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const dir = '.local/integration/vendor-scan-visual-v20'; fs.mkdirSync(dir, { recursive: true });
const v19Path = '.local/integration/vendor-scan-visual-v19/regression.private.json', previous = read(v19Path);
const parityPath = '.local/integration/vendor-scan-visual-v19/shortlist-parity.private.json', parity = read(parityPath);
assert.ok(previous.finishedAt); assert.equal(previous.rows.length, 308);
assert.ok(parity.finishedAt); assert.deepEqual(parity.summary, { files: 308, differences: 0 });
for (const [name, expected] of Object.entries(previous.sourceHashes)) assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/' + name)), expected);
assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/scanShortlistV19.mjs')), parity.sourceSha256);
const catalogBytes = fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');
assert.equal(hash(catalogBytes), previous.catalogSha256); assert.equal(previous.catalogSha256, parity.catalogSha256);
const catalog = JSON.parse(gunzipSync(catalogBytes)), risk = prepareReferenceRiskV20(catalog);
const rows = previous.rows.map(row => {
  const result = selectUnambiguousGeometry(row.geometryCandidates, risk);
  if (row.error) { result.status = 'error'; result.candidates = []; }
  const wrong = result.candidates.some(candidate => !row.expected.includes(candidate.gv_id)
    || row.expectedRotation !== undefined && candidate.rotation !== row.expectedRotation);
  const rawWrong = result.candidates.some(candidate => !row.originalExpected.includes(candidate.gv_id)
    || row.expectedRotation !== undefined && candidate.rotation !== row.expectedRotation);
  return { corpus: row.corpus, file: row.file, expected: row.expected, originalExpected: row.originalExpected,
    ...result, correct: result.candidates.length > 0 && !wrong, wrong, rawWrong, error: row.error,
    v19Correct: row.correct, v15Correct: row.v15Correct };
});
const old = read(path.join(process.env.USERPROFILE, '.codex/tmp/vendor-real-scans-20260923/holdout-v2/results.private.json'));
const oldCorrect = old.rows.filter(row => row.cards.length);
const oldLosses = oldCorrect.filter(oldRow => !rows.find(row => row.corpus === 'v2_100' && row.file === oldRow.file)?.candidates
  .some(candidate => candidate.gv_id === oldRow.cards[0].gv_id && candidate.rotation === oldRow.cards[0].rotation))
  .map(row => ({ corpus: 'v2_100', file: row.file, gv_id: row.cards[0].gv_id, rotation: row.cards[0].rotation }));
const summary = { files: rows.length, supported: rows.filter(row => row.expected.length).length,
  correct: rows.filter(row => row.correct).length, wrong: rows.filter(row => row.wrong).length,
  rawWrong: rows.filter(row => row.rawWrong).length, errors: rows.filter(row => row.error).length,
  manualReview: rows.filter(row => row.status === 'manual_review').length,
  negativesRejected: rows.filter(row => !row.expected.length && !row.candidates.length).length,
  v19Losses: rows.filter(row => row.v19Correct && !row.correct).length,
  v15Losses: rows.filter(row => row.v15Correct && !row.correct).length,
  legacyV2: { previouslyCorrect: oldCorrect.length, losses: oldLosses } };
const sources = ['scanGeometryV16.mjs', 'scanGeometryV17.mjs', 'scanReferenceRiskV18.mjs', 'scanGeometryV19.mjs', 'scanShortlistV19.mjs', 'scanReferenceRiskV20.mjs'];
const sourceHashes = Object.fromEntries(sources.map(name => [name, hash(fs.readFileSync('apps/web/src/lib/stores/' + name))]));
const report = { at: new Date().toISOString(), scope: 'Monotonic duplicate-image guard over the finished V19 geometric candidates. Reused development scans only.',
  sourceHashes, v19Sha256: hash(fs.readFileSync(v19Path)), paritySha256: hash(fs.readFileSync(parityPath)),
  catalogSha256: hash(catalogBytes), correction: previous.correction, summary, rows };
fs.writeFileSync(dir + '/regression.private.json', JSON.stringify(report, null, 2), { flag: 'wx' });

const tests = ['vendor_scan_geometry_v17', 'vendor_scan_reference_risk_v18', 'vendor_scan_geometry_v19', 'vendor_scan_shortlist_v19', 'vendor_scan_reference_risk_v20'];
const test = spawnSync(process.execPath, ['--test', ...tests.map(name => 'scripts/tests/' + name + '.test.mjs')], { encoding: 'utf8', timeout: 30_000 });
fs.writeFileSync(dir + '/unit-tests.txt', test.stdout + test.stderr, { flag: 'wx' });
assert.equal(test.status, 0); assert.match(test.stdout, /# tests 20\b/); assert.match(test.stdout, /# fail 0\b/);
const lint = spawnSync(process.execPath, ['node_modules/eslint/bin/eslint.js', ...sources.map(name => 'src/lib/stores/' + name), 'src/lib/stores/scanShortlistV16.mjs', '--max-warnings=0'], { cwd: 'apps/web', encoding: 'utf8', timeout: 30_000 });
fs.writeFileSync(dir + '/lint.txt', lint.stdout + lint.stderr, { flag: 'wx' }); assert.equal(lint.status, 0);
const quantiles = values => { const sorted = values.toSorted((a, b) => a - b); return { p50: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)], max: sorted.at(-1) }; };
const collisionReport = read('docs/audits/vendor_scan_visual_v19/REFERENCE_IMAGE_COLLISIONS_20260924.json');
const receipt = { at: new Date().toISOString(), releaseQualified: false,
  reason: 'Known legacy recognition losses and incomplete independent, hosted, reference-delivery and physical-device proof. No serving integration.',
  sourceHashes, catalogSha256: report.catalogSha256,
  rawReports: { v19: report.v19Sha256, shortlistParity: report.paritySha256, guarded: hash(fs.readFileSync(dir + '/regression.private.json')) },
  opencv: { version: '4.12.0-release.1', scope: 'Private isolated prefix only', lockSha256: hash(fs.readFileSync('.local/integration/opencv-runtime-v16/package-lock.json')) },
  correction: report.correction,
  v19: previous.summary, guarded: summary, shortlistParity: parity.summary,
  geometryMs: quantiles(previous.rows.map(row => row.ms)), retrievalMs: quantiles(parity.rows.map(row => row.ms)),
  timingScope: 'Separate local passes, partly concurrent. Excludes HTTP/reference download, cold child startup and hosted overhead. Do not add percentile values or call them an end-to-end SLA.',
  targets: rows.filter(row => ['gallery_v12', 'browser_heic', 'legacy'].includes(row.corpus)).map(row => ({ corpus: row.corpus, file: row.file, expected: row.expected, status: row.status, correct: row.correct, candidates: row.candidates.map(candidate => ({ gv_id: candidate.gv_id, rotation: candidate.rotation })) })),
  referenceIntegrity: { duplicateHashes: collisionReport.duplicateHashes, duplicateReferenceRows: collisionReport.duplicateReferenceRows,
    crossNameHashes: collisionReport.crossNameHashes, crossNameReferenceRows: collisionReport.crossNameReferenceRows },
  checks: { unitTests: 20, failed: 0, targetedEslint: 'passed', fullBuild: 'not run; no serving integration',
    unitLogSha256: hash(fs.readFileSync(dir + '/unit-tests.txt')), lintLogSha256: hash(fs.readFileSync(dir + '/lint.txt')) },
  unchanged: ['No production or pilot writes', 'No deployment or alias change', 'No application dependency change', 'No canonical repair', 'No inventory/entitlement/payment changes', 'No commit or merge'],
  limitations: ['Reused development corpus; no independent accuracy claim', 'Post-evaluation Dratini label correction is disclosed; raw reports retained', 'Exact image-binding and same-name artwork ambiguity are guarded; semantic cross-name duplicates with different bytes are not exhaustively verified', 'No real GG sample', 'Physical Samsung was locked; no physical-browser proof'] };
fs.writeFileSync('docs/audits/vendor_scan_visual_v19/PROOF_20260924.json', JSON.stringify(receipt, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ ...summary, tests: 20, lint: 'passed', releaseQualified: false, geometryMs: receipt.geometryMs, retrievalMs: receipt.retrievalMs }));
