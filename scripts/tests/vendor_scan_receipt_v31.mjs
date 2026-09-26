// Public-safe comparison receipt. Never promotes a deployment or enables a flag.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { qualificationGateV30 } from './vendor_scan_qualification_gate_v30.mjs';
const read = p => JSON.parse(fs.readFileSync(p));
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const priorPath = 'docs/audits/vendor_scan_runtime_v30/PROOF_20260925.json', prior = read(priorPath);
assert.ok(qualificationGateV30().qualified && prior.linux.qualified);
for (const [file, sha] of Object.entries(prior.sourceHashes)) assert.equal(hash(file), sha);
const dirs = ['baseline', 'features'].map(v => '.local/integration/vendor-scan-hosted-v31-' + v);
const receipts = [], variants = {};
function consume(file) { receipts.push(file); return read(file); }
const plans = dirs.map(dir => consume(dir + '/package.json'));
assert.deepEqual(plans[0].files, plans[1].files);
for (const plan of plans) for (const file of plan.files) {
  assert.equal(hash(path.join(plan.dest, file.path)), file.sha256);
  assert.equal(hash(file.path), file.sha256);
}
for (const [i, dir] of dirs.entries()) {
  const variant = ['baseline', 'features'][i], ready = consume(dir + '/ready.json');
  assert.equal(ready.state, 'READY'); assert.ok(ready.aliasUnchanged);
  const hosted = consume(dir + '/hosted-proof.private.json');
  assert.equal(hosted.deployment, ready.id); assert.equal(hosted.status, 'passed');
  assert.equal(hosted.rows.length, 7); assert.ok(hosted.rows.every(r => r.same));
  assert.equal(hosted.checks.length, 5); assert.ok(hosted.checks.every(r => r.passed));
  assert.ok(hosted.retainedDataUnchanged);
  const pixel = consume(dir + '/pixel-boundary-card-aspect.private.json');
  assert.equal(pixel.deployment, ready.id); assert.equal(pixel.status, 'passed');
  assert.ok(pixel.retainedDataUnchanged); assert.deepEqual(pixel.rows.map(r => r.http), [200, 503]);
  const configuration = consume(dir + '/resource-configuration.private.json');
  assert.equal(configuration.deployment, ready.id);
  assert.equal(configuration.configurationSnapshot.functionMemoryType, 'standard');
  const resourceFile = fs.readdirSync(dir).filter(f => /^resources-\d+\.json$/.test(f)).sort().at(-1);
  assert.ok(resourceFile); const resources = consume(dir + '/' + resourceFile);
  assert.equal(resources.deployment, ready.id); assert.ok(resources.summary.resources >= 9);
  receipts.push(dir + '/' + resources.source);
  const normal = resources.rows.filter(r => r.timestamp >= Date.parse(hosted.at) && r.timestamp <= Date.parse(hosted.finishedAt) && r.resources?.outcome === 'complete');
  assert.ok(normal.length >= 7);
  const normalMax = Object.fromEntries(['parentPeakRssBytes', 'childPeakRssBytes', 'combinedPeakRssBytes'].map(k => [k, Math.max(...normal.map(r => r.resources[k]))]));
  const times = hosted.rows.map(r => r.ms).sort((a,b) => a-b);
  variants[variant] = { deployment: ready.id, cases: 7, same: 7,
    times: { minMs: times[0], medianMs: times[3], maxMs: times.at(-1) },
    rows: hosted.rows, access: hosted.checks, pixelBoundary: pixel.rows,
    resourceConfiguration: configuration, resources: resources.summary, normalMax,
    retainedDataUnchanged: true };
  if (variant === 'features') {
    assert.ok(hosted.cancellation.passed && hosted.cancellation.firstRetryHttp === 200);
    assert.ok(hosted.concurrency.some(r => r.http === 200));
    assert.ok(hosted.concurrency.every(r => [200,429].includes(r.http)));
    assert.ok(resources.summary.aborted >= 1, 'Need server-observed cancellation');
    variants[variant].cancellation = { ...hosted.cancellation, serverAbortObserved: true };
    variants[variant].concurrency = hosted.concurrency;
  }
}
const browserFile = fs.readdirSync(dirs[1]).filter(f => /^browser-\d+\.json$/.test(f)).sort().at(-1);
assert.ok(browserFile); const browser = consume(dirs[1] + '/' + browserFile);
let browserReconciliation;
if (browser.status !== 'passed') {
  browserReconciliation = consume(dirs[1] + '/browser-readback.private.json');
  assert.equal(browserReconciliation.status, 'reconciled');
  assert.equal(browserReconciliation.browserReceiptSha256, hash(dirs[1] + '/' + browserFile));
  assert.equal(browserReconciliation.beforeDigest, browser.beforeDigest);
  assert.ok(browserReconciliation.retainedDataUnchanged && browserReconciliation.uiStepsCompleted);
  assert.equal(browser.boundaryReadbackFailed, true); assert.ok(!browser.error);
} else assert.ok(browser.retainedDataUnchanged);
assert.equal(browser.inventoryWrites, 0); assert.deepEqual(browser.blockedWrites, []);
assert.ok(browser.capabilitiesReadyAfterReload && browser.comparisonImageLoadedAfterReload);
assert.ok(browser.requests.some(r => r.candidates.includes('GV-PK-LOR-TG02')));
assert.ok(browser.requests.some(r => r.candidates.includes('GV-PK-ASR-TG02')));
assert.ok(browser.steps.some(s => s.includes('no document overflow')));
const device = consume(dirs[1] + '/device-readback.private.json');
const harnesses = ['hosting', 'hosted-proof', 'pixel-boundary', 'resources', 'resource-readback', 'browser-proof', 'browser-readback']
  .map(s => 'scripts/preview/vendor-pilot/visual-v31-' + s + '.mjs')
  .concat(['scripts/tests/vendor_scan_receipt_v31.mjs']);
const result = { at: new Date().toISOString(), baseline: prior.baseline,
  precedingProofSha256: hash(priorPath), sourceHashes: prior.sourceHashes, appSourcesUnchanged: true,
  harnessHashes: Object.fromEntries(harnesses.map(f => [f, hash(f)])),
  receiptHashes: Object.fromEntries(receipts.map(f => [f, hash(f)])),
  comparison: { identicalPackages: true, variants, controlledBenchmark: false,
    notes: 'Seven reused examples per sequential cloud build. These timings are observed samples, not percentile or production throughput guarantees. RSS samples can double-count shared pages and do not measure a cgroup limit.' },
  browser: { transport: browser.transport, steps: browser.steps, requests: browser.requests, originalStatus: browser.status, reconciliation: browserReconciliation,
    draftReloadPassed: true, responsiveLayoutPassed: true, physicalDevice: false, inventoryWrites: 0 },
  device, sharedDeployment: 'dpl_F9id47NjSDscTwE2wx1F1gWpgGRR', sharedAliasChanged: false,
  productionWrites: 0, schemaChanges: 0, entitlementChanges: 0, paymentsEnabled: false,
  releaseQualified: false, remaining: ['Physical-phone workflow qualification', 'Governed pilot activation after reviewing hosted comparison; production release separate'] };
const dest = 'docs/audits/vendor_scan_runtime_v31/PROOF_20260925.json';
fs.writeFileSync(dest, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ proof: dest, baselineMedianMs: variants.baseline.times.medianMs,
  featuresMedianMs: variants.features.times.medianMs, hostedCases: 14, releaseQualified: false }));
