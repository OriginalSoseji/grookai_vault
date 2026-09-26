// Offline receipt builder for the private, SHA-verified Mac corpus collected on
// 2026-09-23. Does not copy photos, source paths, credentials or vectors into git.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { scanDescriptor, prepareVisualIndex, rankVisualScan } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const qa = path.join(root, '.local/real-scans-qa-v1');
const corpus = path.join(process.env.USERPROFILE, '.codex/tmp/vendor-real-scans-20260923');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(corpus, 'manifest.private.json')));
const all = fs.readdirSync(qa).filter(f => /^report-.*\.private\.json$/.test(f)).sort().map(f => {
  const bytes = fs.readFileSync(path.join(qa, f));
  return { ...JSON.parse(bytes), reportSha256: hash(bytes) };
});
const latest = batch => all.filter(r => r.batch === batch).at(-1);
const batches = ['pairs', 'heic', 'legacy-heic', 'large-and-malformed'].map(latest);
assert.ok(batches.every(Boolean));
const scans = batches.flatMap(b => b.reports);
assert.equal(scans.length, 211);
for (const r of scans) {
  const original = manifest.find(m => m.file === r.name);
  assert.equal(r.originalHash, original.sha256);
  assert.equal(hash(fs.readFileSync(path.join(corpus, 'files', r.name))), original.sha256);
  assert.ok(r.previewBytes > 0, r.name);
}
assert.ok(batches.every(b => b.receipts === 0 && b.confirmed === 0));
const paired = all.filter(r => r.batch === 'pairs');
assert.ok(paired.length >= 2);
const first = paired[0], restored = paired.at(-1);
for (const field of ['items', 'assets', 'fronts', 'backs', 'confirmed', 'receipts', 'revision']) {
  assert.deepEqual(first[field], restored[field], field);
}
assert.deepEqual(first.reports.map(r => r.originalHash), restored.reports.map(r => r.originalHash));
assert.deepEqual(restored.fronts, Array.from({ length: 50 }, (_, i) => `scan-${String(i * 2 + 1).padStart(4, '0')}.jpeg`));
assert.deepEqual(restored.backs, Array.from({ length: 50 }, (_, i) => `scan-${String(i * 2 + 2).padStart(4, '0')}.jpeg`));
const large = latest('large-and-malformed');
const duplicate = large.reports.find(r => r.name === 'scan-0210.jpg');
assert.ok(large.reports.some(r => r.name !== duplicate.name && r.originalHash === duplicate.originalHash));
assert.equal(large.items, 11); // Explicitly accepted duplicate remains a separate copy.

const artifact = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/src/lib/stores/visualMatchIndex.json')));
const index = prepareVisualIndex(artifact);
// Ground truth reviewed from rendered card names, numbers and artwork, not filenames.
const numbers = [104,158,42,30,39,137,12,125,89,30,96,147,158,89,100,27,98,86,123,47,21,69,129,43,20,160,82,37,81,133,67,87,119,53,158,89,100,27,98,86,123,47,21,69,129,43,20,160,82,37];
const legacy = latest('legacy-heic');
const reviewed = [];
for (let i = 0; i < 50; i++) {
  const scan = 151 + i, file = `scan-${String(scan).padStart(4, '0')}.heic`;
  const expected = `GV-PK-MEW-${String(numbers[i]).padStart(3, '0')}`;
  assert.ok(artifact.references.some(r => r.gv_id === expected), expected);
  const report = legacy.reports.find(r => r.name === file);
  const upsideDown = scan >= 163 && scan <= 183;
  const diagnostic = upsideDown ? rankVisualScan(await scanDescriptor(fs.readFileSync(path.join(corpus, 'derived', file + '.jpg')), 180), index) : null;
  reviewed.push({ scan, expected, upsideDown, originalStatus: report.result.status,
    originalCandidates: report.result.cards.map(c => c.gv_id),
    rotationDiagnosticCandidates: diagnostic?.candidates.map(c => artifact.references.find(r => r.id === c.id).gv_id) ?? null });
}
const summary = {
  date: '2026-09-23', verdict: 'FAIL_RECOGNITION__PASS_SAMPLED_LOCAL_DRAFT_INTAKE',
  baseline: '7ef0ba02040d290bfa390b8bd3882d7b960f4ccd',
  scope: 'Actual browser decoder, draft UI and storage; local synthetic owner. Not RLS or batch-to-inventory proof.',
  scans: 211, jpeg: 110, heic: 101, draftCopies: 161, originalHashesVerified: 211,
  decodeFailures: 0, confirmedIdentities: 0, inventoryReceipts: 0,
  capacity: { frontOnly100Rejected: true, paired100AcceptedAs50Copies: true },
  restoration: { sameRevision: true, sameFrontBackPairing: true, sameOriginalHashes: true },
  duplicate: { warned: true, explicitlyAccepted: true, retainedAsSeparateCopy: true },
  batches: batches.map(b => ({ batch: b.batch, images: b.assets, copies: b.items, reportSha256: b.reportSha256,
    statuses: b.reports.reduce((a, r) => (a[r.result.status] = (a[r.result.status] ?? 0) + 1, a), {}) })),
  reviewed151: { total: 50, upright: 29, upsideDown: 21,
    correctOriginalTop1: reviewed.filter(r => r.originalCandidates[0] === r.expected).length,
    correctRotatedTop1: reviewed.filter(r => r.upsideDown && r.rotationDiagnosticCandidates?.[0] === r.expected).length,
    cases: reviewed },
  hostedFalseSuggestions: [
    { scan: 144, actual: 'Greedent, Chilling Reign 128/198', candidates: ['GV-PK-MEW-142','GV-PK-MEW-083','GV-PK-MEW-073'], httpStatus: 200 },
    { scan: 146, actual: 'Revavroom, Scarlet & Violet 142/198', candidates: ['GV-PK-MEW-073'], httpStatus: 200 }
  ],
  containment: { alias: 'https://grookai-vendor-preview.vercel.app', deployment: 'dpl_GgWS4fL97zjXZfTC8CjsA3RrGqAV', previewFlag: false,
    sourceHardDisabled: true, hostedRollbackChecksPassed: 6 },
  limitations: [
    'Corpus is a selected convenience sample, not an unbiased accuracy estimate.',
    'All-image matcher counts include backs; do not treat them as card-front accuracy.',
    'Two unreadable matcher responses are input-boundary rejections; all images decoded for draft display.',
    'The file from the malformed-review folder decoded; its folder name does not establish corruption.',
    'Manual rotation diagnostics do not prove automatic orientation or a deployed fix.',
    'No batch-to-inventory commit, camera/scanner capture, phone upload, quota exhaustion or security-fuzz proof.'
  ]
};
const target = path.join(root, 'docs/audits/vendor_batch_intake_v1/real-scans-20260923.json');
fs.writeFileSync(target, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ scans: summary.scans, copies: summary.draftCopies, correctOriginalTop1: summary.reviewed151.correctOriginalTop1, correctAfterManual180: summary.reviewed151.correctRotatedTop1, receipt: target }));
