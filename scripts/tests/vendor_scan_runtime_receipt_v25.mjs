// One-use receipt for the hosted V25 candidate. Does not contact any service.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const read = p => JSON.parse(fs.readFileSync(p)), hash = b => createHash('sha256').update(b).digest('hex');
const local = '.local/integration/vendor-scan-runtime-v25', hosted = '.local/integration/vendor-scan-hosted-v24-v25-budget';
const frozen = read('docs/audits/vendor_scan_visual_v23/PROOF_20260924.json');
for (const [file, sha] of Object.entries(frozen.sourceHashes)) assert.equal(hash(fs.readFileSync(file)), sha);
const parity = read(local + '/shortlist-parity.private.json'), runtime = read(local + '/runtime-budget.private.json');
assert.equal(parity.summary.same, 320); assert.equal(runtime.summary.same, 17);
const tests = fs.readFileSync(local + '/tests-budget.txt', 'utf8'); assert.match(tests, /# tests 26\b/); assert.match(tests, /# fail 0\b/);
const ready = read(hosted + '/ready.json'), https = read(hosted + '/hosted-proof.private.json'), plan = read(hosted + '/package.json');
assert.equal(https.deployment, ready.id); assert.equal(ready.state, 'READY');
const browserFiles = fs.readdirSync(hosted).filter(n => /^browser-\d+\.json$/.test(n)).sort();
const browserFile = browserFiles.at(-1), browser = browserFile ? read(hosted + '/' + browserFile) : undefined;
const sources = [...Object.keys(read('docs/audits/vendor_scan_runtime_v24/PROOF_20260924.json').sourceHashes),
  'apps/web/src/lib/stores/scanShortlistV25.mjs', 'apps/web/src/lib/stores/scanVisualWorkerV25.mjs',
  'apps/web/src/components/stores/useScanSuggestions.ts', 'apps/web/src/app/api/stores/owner/intake/match/route.ts'];
const sourceHashes = Object.fromEntries(sources.map(file => {
  const sha = hash(fs.readFileSync(file)); assert.equal(sha, plan.files.find(f => f.path === file)?.sha256); return [file, sha];
}));
assert.equal(sourceHashes['apps/web/src/lib/stores/scanShortlistV25.mjs'], parity.sourceSha256);
for (const [name, sha] of Object.entries(runtime.sourceHashes)) assert.equal(sourceHashes['apps/web/src/lib/stores/' + name], sha);
const prior = ['', '-diagnostic', '-v25'].map(suffix => {
  const p = '.local/integration/vendor-scan-hosted-v24' + suffix, r = read(p + '/hosted-proof.private.json');
  return { deployment: r.deployment, status: r.status, firstScanHttp: r.rows[0]?.http, firstScanMs: r.rows[0]?.ms, retainedDataUnchanged: r.retainedDataUnchanged, receiptSha256: hash(fs.readFileSync(p + '/hosted-proof.private.json')) };
});
const receipt = {
  at: new Date().toISOString(), baseline: '7ef0ba02040d290bfa390b8bd3882d7b960f4ccd', sourceHashes,
  frozenV23SourcesUnchanged: true, releaseQualified: false, sharedAliasChanged: false,
  reason: 'Unshared candidate only; immediate hosted worker cancellation, physical-device qualification and resource/release gates remain. Client abort and eventual retry do not prove prompt server cancellation.',
  algorithm: 'V25 exact top-k evaluation of V19 distances; unchanged V23 geometry and V20 ambiguity guard.',
  tests: { passed: 26, failed: 0, receiptSha256: hash(Buffer.from(tests)) },
  shortlist: { ...parity.summary, receiptSha256: hash(fs.readFileSync(local + '/shortlist-parity.private.json')) },
  runtime: { ...runtime.summary, receiptSha256: hash(fs.readFileSync(local + '/runtime-budget.private.json')) },
  localLifecycle: { passed: read(local + '/lifecycle.private.json').passed, scope: 'Actual V25 worker abort/4-second deadline/retry before raising the allowed budget ceiling; wrapper deadline tests repeated afterward.' },
  physicalDevice: read(local + '/physical-device.json'),
  bounds: { v25MatchingMs: 30000, legacyMatchingMs: 20000, browserMs: 40000, functionSeconds: 45, uploadMs: 5000, referenceDeliveryMs: 7000 },
  hosting: { deployment: ready.id, url: ready.url, build: ready.state, files: plan.files.length, bytes: plan.files.reduce((n, f) => n + f.bytes, 0), packageSha256: hash(fs.readFileSync(hosted + '/package.json')) },
  https: { status: https.status, cases: https.rows.length, same: https.rows.filter(r => r.same).length, maxMs: Math.max(...https.rows.map(r => r.ms)), checks: https.checks, concurrency: https.concurrency, cancellation: https.cancellation, retainedDataUnchanged: https.retainedDataUnchanged, receiptSha256: hash(fs.readFileSync(hosted + '/hosted-proof.private.json')) },
  browser: browser ? { status: browser.status, steps: browser.steps, requests: browser.requests, inventoryWrites: browser.inventoryWrites, receiptSha256: hash(fs.readFileSync(hosted + '/' + browserFile)) } : { status: 'not_run' },
  earlierUnsharedAttempts: prior,
};
const dir = 'docs/audits/vendor_scan_runtime_v25'; fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(dir + '/PROOF_20260924.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ recorded: true, https: receipt.https.status, browser: receipt.browser.status, releaseQualified: false }));
