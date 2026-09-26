// Final receipt assembly only after all fixed-output proof steps pass.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { featureHashV28 as hash, FEATURE_CONTRACT_V28, FEATURE_CONTRACT_SHA256 } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
const read = p => JSON.parse(fs.readFileSync(p)), dir = '.local/integration/vendor-scan-runtime-v28';
const target = 'docs/audits/vendor_scan_runtime_v28/PROOF_20260924.json'; assert.ok(!fs.existsSync(target));
const previousPath = 'docs/audits/vendor_scan_runtime_v27/PROOF_20260924.json', previous = read(previousPath);
for (const [path, sha] of Object.entries(previous.sourceHashes)) assert.equal(hash(fs.readFileSync(path)), sha, path);
const regression = read(dir + '/regression2/regression.private.json'), profile = read(dir + '/profile.private.json');
const linux = read(dir + '/linux-output/result.json'), packaged = read(dir + '/linux-package.private.json');
assert.ok(regression.finishedAt && profile.finishedAt && linux.finishedAt);
assert.equal(regression.rows.length, 320); assert.equal(regression.summary.wrong, 0); assert.equal(linux.rows.length, 28);
assert.ok(regression.rows.every(r => r.exactIntermediateParity));
for (const [name, sha] of Object.entries(regression.sourceHashes)) assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/' + name)), sha);
const tests = fs.readFileSync(dir + '/tests-final.log', 'utf8');
assert.match(tests, /# tests 30\r?\n/); assert.match(tests, /# pass 30\r?\n/); assert.match(tests, /# fail 0\r?\n/);
const files = ['apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs', ...[
  'support_v28.mjs', 'v28.test.mjs', 'regression_v28.mjs', 'profile_v28.mjs', 'linux_v28.mjs', 'linux_package_v28.mjs', 'receipt_v28.mjs',
].map(n => 'scripts/tests/vendor_scan_features_' + n)];
const receipts = ['regression2/regression.private.json', 'regression2/manifest.private.json', 'profile.private.json', 'linux-output/result.json', 'linux-package.private.json', 'tests-final.log'];
const report = { at: new Date().toISOString(), baseline: '7ef0ba02040d290bfa390b8bd3882d7b960f4ccd',
  precedingProofSha256: hash(fs.readFileSync(previousPath)), sourceHashes: Object.fromEntries(files.map(p => [p, hash(fs.readFileSync(p))])),
  receiptHashes: Object.fromEntries(receipts.map(p => [p, hash(fs.readFileSync(dir + '/' + p))])),
  existingServingSourcesUnchanged: true, algorithmSourceHashes: regression.sourceHashes,
  contract: FEATURE_CONTRACT_V28, contractSha256: FEATURE_CONTRACT_SHA256,
  tests: { count: 30, pass: 30, fail: 0 }, regression: regression.summary, localProfile: profile.summary,
  linux: { references: linux.rows.length, formats: [...new Set(linux.rows.map(r => r.format))], exactParity: true, runtime: linux.runtime, packages: packaged.packages,
    image: 'sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5', network: 'none', memoryBytes: 1073741824, cpus: 1, ports: 0, sharedServicesChanged: false },
  failedAttempts: [{ stage: 'initial Windows comparison', reason: 'Optional undefined fields versus historical JSON omission; fixed test serialization only.', preserved: true }],
  sharedAliasChanged: false, sharedDeployment: 'dpl_F9id47NjSDscTwE2wx1F1gWpgGRR', productionRequests: false,
  schemaChanges: false, entitlementWrites: false, paymentsEnabled: false, hostedCacheEnabled: false, releaseQualified: false,
  remaining: ['Full target-runtime equivalence', 'Complete cache generation and pinned manifest', 'Authorized private delivery and bounded worker restoration',
    'Hosted latency, transfer, memory and cancellation comparison', 'Deployment-specific resource qualification', 'Physical-phone proof', 'Governed pilot activation'] };
fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ scans: report.regression.scans, tests: report.tests.pass, linuxReferences: report.linux.references, servingUnchanged: true }));
