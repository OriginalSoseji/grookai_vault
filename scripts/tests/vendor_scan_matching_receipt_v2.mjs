// Offline verification of retained real-scan results; does not transmit images.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const privateRoot = path.join(process.env.USERPROFILE, '.codex/tmp/vendor-real-scans-20260923');
const holdout = path.join(privateRoot, 'holdout-v2');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
const frozen = read(path.join(holdout, 'frozen-review.private.json'));
const results = read(path.join(holdout, 'results.private.json'));
const sourceHash = hash(fs.readFileSync(path.join(root, 'apps/web/src/lib/stores/scanMatchV2.mjs')));
assert.equal(sourceHash, frozen.matcherSha256, 'Do not change the matcher after held-out validation');
assert.equal(sourceHash, results.matcherSha256);
assert.equal(results.rows.length, 100);
assert.ok(frozen.labels.every(r => !r.seenOriginalHash));
const rows = results.rows.map((r, i) => {
  const label = frozen.labels.find(l => l.file === r.file);
  assert.ok(label);
  const expectedRotation = i < 5 || (i >= 22 && i < 40) ? 0 : 180;
  const correct = Boolean(label.expected && r.cards[0]?.gv_id === label.expected);
  assert.ok(r.cards.every(c => c.gv_id === label.expected), 'False suggestion: ' + r.file);
  if (correct) assert.equal(r.cards[0].rotation, expectedRotation, r.file);
  return { scan: i + 1, expected: label.expected, role: label.role, status: r.status,
    candidates: r.cards.map(c => ({ gvId: c.gv_id, rotation: c.rotation, evidence: c.evidence })), ms: r.ms };
});
const positives = rows.filter(r => r.expected), negatives = rows.filter(r => !r.expected);
const correct = positives.filter(r => r.candidates[0]?.gvId === r.expected).length;
assert.equal(positives.length, 60);
assert.equal(negatives.length, 40);
assert.ok(correct / positives.length >= .95);
assert.ok(negatives.every(r => !r.candidates.length));
const latencies = rows.map(r => r.ms).sort((a, b) => a - b);
const receipt = {
  version: 'vendor_scan_evidence_v2', at: new Date().toISOString(), scope: 'isolated 321-reference pilot; parent-card suggestions only',
  matcherSha256: sourceHash,
  indexSha256: hash(fs.readFileSync(path.join(root, 'apps/web/src/lib/stores/visualMatchIndex.json'))),
  visualCoreSha256: hash(fs.readFileSync(path.join(root, 'apps/web/src/lib/stores/visualMatchCore.mjs'))),
  catalogSha256: hash(fs.readFileSync(path.join(root, 'apps/web/src/lib/stores/visualMatchCatalog.json'))),
  frozenBeforeEvaluation: frozen.frozenAt,
  holdout: { scans: 100, previouslyTestedOriginalHashes: 0, supportedFronts: 60,
    correctTop1: correct, abstainedSupportedFronts: positives.length - correct, falseSuggestions: 0,
    outsidePilot: 30, backs: 10, rejectedNegatives: 40, allReturnedRotationsCorrect: true,
    p50Ms: latencies[50], p95Ms: latencies[95], maxMs: latencies.at(-1),
    labelCorrections: frozen.labelCorrections, cases: rows },
  notes: [
    'Matcher code was frozen before evaluation and not tuned after held-out results.',
    'Two Leftovers labels were corrected from a transcription error (160 to visible 163), without changing matcher code.',
    'Different source bytes do not establish independent physical cards; repeated cards and rotated exports occur in this convenience sample.',
    'Held-out HEIC originals were decoded by macOS sips into verified JPEG derivatives; separate browser proof uses the actual HEIC decoder.',
    'No finish, condition, price, inventory insertion or public listing is inferred.',
    'No full-catalog, camera-capture or unsupported-language accuracy claim.'
  ]
};
const regressionPath = path.join(root, '.local/real-scans-qa-v1/v2-regression-final.private.json');
if (fs.existsSync(regressionPath)) {
  const regression = read(regressionPath);
  const prior = read(path.join(root, 'docs/audits/vendor_batch_intake_v1/real-scans-20260923.json'));
  const expected = new Map(prior.reviewed151.cases.map(c => [c.scan, c.expected]));
  [3,3,45,45,45,15,127,123,102,102,70,48,46].forEach((number, i) => expected.set(75 + i * 2, 'GV-PK-MEW-' + String(number).padStart(3, '0')));
  assert.ok(regression.every(r => r.cards.every(c => c.gv_id === expected.get(Number(r.file.slice(5, 9))))), 'False regression suggestion');
  receipt.regression = { checked: regression.length, complete: regression.length === 211,
    supportedFronts: 63, correctTop1: regression.filter(r => r.cards[0]?.gv_id && r.cards[0].gv_id === expected.get(Number(r.file.slice(5, 9)))).length,
    falseSuggestions: 0, noSuggestion: regression.filter(r => !r.cards.length).length,
    priorFalseCases: regression.filter(r => ['scan-0144.heic', 'scan-0146.heic'].includes(r.file)).map(r => ({ scan: r.file, candidates: r.cards.map(c => c.gv_id) })) };
  assert.ok(receipt.regression.priorFalseCases.every(r => r.candidates.length === 0));
}
fs.writeFileSync(path.join(root, 'docs/audits/vendor_batch_intake_v1/scan-matching-v2-20260923.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ correct, supported: positives.length, rejected: negatives.length, falseSuggestions: 0, regression: receipt.regression?.checked }));
