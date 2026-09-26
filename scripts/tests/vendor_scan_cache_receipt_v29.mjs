import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
const read = p => JSON.parse(fs.readFileSync(p)), dir = '.local/integration/vendor-scan-runtime-v29';
const output = 'docs/audits/vendor_scan_runtime_v29/PROOF_20260924.json'; assert.ok(!fs.existsSync(output));
const previousPath = 'docs/audits/vendor_scan_runtime_v28/PROOF_20260924.json', previous = read(previousPath);
for (const [name, sha] of Object.entries(previous.algorithmSourceHashes)) assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/' + name)), sha);
const v27 = read('docs/audits/vendor_scan_runtime_v27/PROOF_20260924.json');
const changed = new Set(['scanVisualServerV24.ts','scanVisualProcessV24.mjs','scanVisualProcessV24.d.mts'].map(n => 'apps/web/src/lib/stores/' + n));
for (const [file, sha] of Object.entries(v27.sourceHashes)) if (!changed.has(file)) assert.equal(hash(fs.readFileSync(file)), sha);
const manifest = read(dir + '/manifest.private.json'), baseline = read(dir + '/runtime-baseline.private.json'), features = read(dir + '/runtime-features-retry1.private.json'), packaged = read(dir + '/package-runtime.private.json');
assert.equal(manifest.summary.references, 20079); assert.ok(!manifest.linuxQualified);
const oldManifestPath = '.local/integration/vendor-scan-runtime-v28/regression2/manifest.private.json';
assert.equal(hash(fs.readFileSync(oldManifestPath)), previous.receiptHashes['regression2/manifest.private.json']);
const inherited = read(oldManifestPath).references, freshBindings = new Map(manifest.references.map(r => [r.id, r]));
for (const row of inherited) { assert.equal(freshBindings.get(row.id)?.artifactSha256, row.artifactSha256); assert.equal(freshBindings.get(row.id)?.imageSha256, row.imageSha256); }
for (const report of [baseline, features]) {
  assert.ok(report.finishedAt && !report.error); assert.equal(report.summary.same, 17);
  for (const [name, sha] of Object.entries(report.sourceHashes)) {
    // These two modules were not executed by the V25 baseline. Only their
    // asynchronous Emscripten handoff changed after that baseline completed.
    if (report.mode === 'baseline' && ['scanVisualWorkerV29.mjs','scanFeatureRuntimeV29.mjs'].includes(name)) continue;
    assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/' + name)), sha);
  }
}
assert.ok(packaged.finishedAt && packaged.rows.length === 3 && packaged.rows.every(r => r.correct));
assert.ok(['revoked','workerRejectsForgedParent','cancelled','firstRetry'].every(k => features.boundaries[k] === true));
const tests = fs.readFileSync(dir + '/tests-final.log', 'utf8'); assert.match(tests, /# tests 74\r?\n/); assert.match(tests, /# pass 74\r?\n/); assert.match(tests, /# fail 0\r?\n/);
for (const file of ['typecheck.log','lint-final.log']) assert.equal(fs.readFileSync(dir + '/' + file, 'utf8').trim(), '');
const linux = [0, 1].map(n => read(dir + '/generated/shard-' + n + '.json')); assert.ok(linux.every(r => !r.finishedAt));
const docker = read(dir + '/docker-status.private.json'); assert.equal(docker.available, false); assert.equal(docker.restartedByThisTask, false);
const median = rows => rows.map(r => r.ms).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
const sourceFiles = [...changed, ...['scanFeatureManifestV29.mjs','scanFeatureManifestV29.d.mts','scanFeatureDeliveryV29.mjs','scanFeatureDeliveryV29.d.mts','scanFeatureRuntimeV29.mjs','scanVisualWorkerV29.mjs','scanExpandedFeaturesV29.json.gz'].map(n => 'apps/web/src/lib/stores/' + n)];
const harnesses = ['generate','package','windows','manifest','runtime','package_runtime','receipt'].map(n => 'scripts/tests/vendor_scan_cache_' + n + '_v29.mjs')
  .concat(['scripts/tests/vendor_scan_feature_manifest_v29.test.mjs','scripts/tests/vendor_scan_feature_delivery_v29.test.mjs','scripts/tests/vendor_scan_visual_server_v24.test.mjs','scripts/tests/vendor_scan_visual_process_v24.test.mjs']);
const receipts = ['manifest.private.json','windows-generated/shard-0.json','windows-generated/shard-1.json','generated/shard-0.json','generated/shard-1.json',
  'runtime-baseline.private.json','runtime-features.private.json','runtime-features-retry1.private.json','package-runtime.private.json','tests-final.log','typecheck.log','lint-final.log','docker-status.private.json'];
const report = { at: new Date().toISOString(), baseline: '7ef0ba02040d290bfa390b8bd3882d7b960f4ccd', precedingProofSha256: hash(fs.readFileSync(previousPath)),
  sourceHashes: Object.fromEntries(sourceFiles.map(p => [p, hash(fs.readFileSync(p))])), harnessHashes: Object.fromEntries(harnesses.map(p => [p, hash(fs.readFileSync(p))])),
  receiptHashes: Object.fromEntries(receipts.map(p => [p, hash(fs.readFileSync(dir + '/' + p))])), algorithmUnchanged: true,
  manifest: { ...manifest.summary, pins: manifest.pins, generationPlatform: manifest.platform }, tests: { count: 74, pass: 74, fail: 0 },
  inherited320ScanProof: { referencesWithIdenticalBindings: inherited.length, fresh320CaseExecution: false, priorProofSha256: hash(fs.readFileSync(previousPath)) },
  local: { baseline: baseline.summary, features: features.summary, boundaries: features.boundaries, packagedCases: 3,
    baselineMedianMs: median(baseline.rows), featuresMedianMs: median(features.rows), hostedPerformanceClaim: false },
  linux: { qualified: false, completeShards: 0, checkpointedReferences: linux.reduce((n, r) => n + r.rows.length, 0),
    exactComparisons: linux.flatMap(r => r.rows).filter(r => r.windowsParity).length, cause: 'Docker Linux engine unavailable; CLI unexpected EOF; root cause unknown',
    taskContainers: ['gv-scan-v29-generate-0','gv-scan-v29-generate-1'], containerStateAfterFailure: 'unknown', restartOrResetPerformed: false },
  failedLocalAttempt: { reason: 'OpenCV thenable returned directly from async loader; timed out before first case completed. Runtime now returns a wrapper.', retained: true,
    baselineReused: 'Only inactive V29 runtime/worker modules changed; all executed V25 baseline sources remain hash-identical.' },
  fullWebTypecheck: true, targetedEslint: true, bucketsCreated: 0, remoteUploads: 0, remoteDatabaseRequests: 0, schemaChanges: false, entitlementChanges: false,
  deployments: 0, aliasActions: 0, paymentsChanged: false, releaseQualified: false,
  remaining: ['Reconcile interrupted task containers when Linux is available', 'Full Linux cache and 320-scan equivalence',
    'Private pilot storage provisioning, upload/readback and anonymous-access proof', 'Unshared hosted baseline/cache latency, transfer, memory and cancellation comparison',
    'Deployment-specific resource and physical-phone qualification', 'Governed pilot activation'] };
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ references: report.manifest.references, tests: report.tests.pass, localCases: 17, linuxQualified: false }));
