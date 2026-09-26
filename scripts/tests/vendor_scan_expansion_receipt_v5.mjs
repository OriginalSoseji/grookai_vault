// Offline, sanitized receipt from preserved real-scan and browser evidence.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = process.cwd();
const work = path.join(root, '.local/integration/vendor-scan-expansion-v5');
const base = path.join(process.env.USERPROFILE, '.codex/tmp/vendor-real-scans-20260923');
const hash = b => createHash('sha256').update(b).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p));
const sourceHash = hash(fs.readFileSync(path.join(root, 'apps/web/src/lib/stores/scanMatchV5.mjs')));
assert.equal(sourceHash, 'ccbfc869179a3cd215aacb08475becc1f5ab484a0872f71a6dd55545219d7334');
const frozen = read(path.join(base, 'holdout-v5/frozen-labels.private.json'));
const selection = read(path.join(base, 'holdout-v5/selection.private.json'));
const fresh = read(path.join(base, 'holdout-v5/results.private.json'));
const regression = read(path.join(work, 'regression-v5-2026-09-23T23-44-24-229Z.private.json'));
const development = read(path.join(work, 'development-03.private.json'));
const index = fs.readFileSync(path.join(root, '.local/integration/vendor-scan-expansion-v3/local-build-2026-09-23T22-52-10-191Z.jsonl'));
assert.equal(hash(index), fresh.indexSha256);
assert.ok(Date.parse(selection.at) < Date.parse(frozen.at));
assert.ok(Date.parse(frozen.at) < Date.parse(fresh.at));
assert.equal(fresh.rows.length, 34);
assert.deepEqual(fresh.excluded, ['fresh-0002.jpg']);
assert.ok(fresh.finishedAt && regression.finishedAt && development.finishedAt);
for (const report of [fresh, regression, development]) {
  assert.equal(report.matcherSha256, sourceHash);
  assert.equal(report.indexSha256, hash(index));
  assert.ok(report.rows.every(r => r.candidates.every(c => r.expected.includes(c.gv_id))), 'Wrong suggestion; retain evidence and do not release');
}
for (const row of fresh.rows) {
  const label = frozen.labels.find(l => l.file === row.file);
  assert.ok(label && !label.previouslySeen);
  assert.ok(!selection.priorHashes.includes(label.originalSha256));
  assert.deepEqual(row.expected, label.expectedGvIds);
  assert.equal(hash(fs.readFileSync(path.join(base, 'holdout-v5/derived', row.file))), label.sha256);
}
const summarize = report => {
  const positive = report.rows.filter(r => r.expected.length), negative = report.rows.filter(r => !r.expected.length);
  const times = report.rows.map(r => r.ms).sort((a, b) => a - b);
  return { scans: report.rows.length, supported: positive.length,
    correctSuggestions: positive.filter(r => r.correct).length,
    ambiguous: report.rows.filter(r => r.status === 'ambiguous').length,
    wrongSuggestions: report.rows.filter(r => r.wrong).length,
    abstainedSupported: positive.filter(r => !r.candidates.length).length,
    rejectedNegatives: negative.filter(r => !r.candidates.length).length,
    p50Ms: times[Math.floor(times.length * .5)], p95Ms: times[Math.floor(times.length * .95)], maxMs: times.at(-1) };
};
const browser = read(path.join(work, 'limit-harness/reports.private.json'));
assert.equal(browser.length, 3);
assert.ok(browser.every(r => r.items === 50 && r.assets === 50 && r.originalBytes === 41800933 && r.previewBytes === 37726711 && r.metadataSha256 === browser[0].metadataSha256));
const liveHash = hash(fs.readFileSync(path.join(root, 'apps/web/src/lib/stores/scanMatchV2.mjs')));
assert.equal(liveHash, 'ac0b5ed5c19de6d5d1de77a9ac29e7080c6a874add34761110b73991be562409');
const receipt = { at: new Date().toISOString(), scope: 'Offline 20,079-reference English candidate; no deployment or catalog writes',
  matcherSha256: sourceHash, indexSha256: hash(index), liveV2Sha256: liveHash,
  development30: summarize(development), regression100: summarize(regression), fresh34: summarize(fresh),
  regressionLabelCorrections: regression.labelCorrections,
  selection: { selected: 35, excludedBeforeEvaluation: fresh.excluded, sourceHashOverlapEvaluated: 0, frozenAt: frozen.at },
  checks: { nodeCases: 22, nodePassed: 22, targetedEslint: 'passed', fullHookRun: false },
  browser: { origin: 'http://127.0.0.1:27646', api: 'read-only synthetic mock; database and matching calls disabled',
    observed51stScanError: 'Use at most 50 copies in this batch.', beforeAfterReload: browser,
    hosted: { url: 'https://grookai-vendor-preview.vercel.app/account/store', desktop: 'passed', viewportOverride: { width: 390, height: 844 },
      measuredClientWidth: 375, measuredScrollWidth: 375, viewportReset: true, existingDraftCopies: 2, existingVisibleInventoryCopies: 3,
      reviewSubmitted: false, physicalPhoneTested: false } },
  cases: fresh.rows.map((r, i) => ({ case: i + 1, scope: frozen.labels.find(l => l.file === r.file).scope,
    expected: r.expected, status: r.status, candidates: r.candidates.map(c => ({ gvId: c.gv_id, evidence: c.evidence, rotation: c.rotation })), error: r.error })),
  releaseReady: false,
  limits: ['Convenience scans, not independent physical cards or a representative catalog benchmark.',
    'Partial reference coverage: 935 missing image bytes and 11 prior build skips; same-art or unsupported references remain uncertain.',
    'Printed denominator and alphanumeric collector identity still need stronger evidence. No finish is inferred.',
    'Live isolated preview remains V2 with 321 references. Fresh catalog eligibility must be rechecked before expansion.',
    'No physical phone proof, migration, entitlement, payment, inventory or public publication changes.'] };
const output = path.join(root, 'docs/audits/vendor_scan_expansion_v5/proof-20260923.json');
fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, development: receipt.development30, regression: receipt.regression100, fresh: receipt.fresh34, releaseReady: false }));
