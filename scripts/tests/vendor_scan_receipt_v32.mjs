// Gate the device-test preparation, without claiming physical-phone acceptance.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const dir = '.local/integration/vendor-scan-device-v32';
const read = p => JSON.parse(fs.readFileSync(p));
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files = [];
const consume = p => { files.push(p); return read(p); };
const plan = consume(dir + '/package.json');
const prior = read('.local/integration/vendor-scan-hosted-v31-features/package.json');
assert.deepEqual(plan.files.map(f => f.path), prior.files.map(f => f.path));
const changed = plan.files.filter((f,i) => f.sha256 !== prior.files[i].sha256).map(f => f.path).sort();
assert.deepEqual(changed, ['apps/web/next.config.mjs', 'apps/web/src/lib/vendorPilot.d.mts', 'apps/web/src/lib/vendorPilot.mjs']);
for (const f of plan.files) {
  assert.equal(hash(f.path), f.sha256);
  assert.equal(hash(path.join(plan.dest, f.path)), f.sha256);
}
const ready = consume(dir + '/ready.json'), alias = consume(dir + '/device-alias.json');
assert.equal(ready.state, 'READY'); assert.equal(alias.deployment, ready.id);
assert.equal(alias.origin, 'https://grookai-vendor-device-qa.vercel.app');
assert.ok(alias.sharedAliasUnchanged);
const http = consume(dir + '/direct-origin-proof.private.json');
assert.equal(http.status, 'passed'); assert.equal(http.deployment, ready.id);
assert.equal(http.rows.length, 4); assert.ok(http.rows.every(r => r.same));
assert.equal(http.checks.length, 6); assert.ok(http.checks.every(r => r.passed));
assert.ok(http.retainedDataUnchanged);
const browserName = fs.readdirSync(dir).filter(f => /^browser-\d+\.json$/.test(f)).sort().at(-1);
assert.ok(browserName); const browser = consume(dir + '/' + browserName);
assert.equal(browser.status, 'passed'); assert.ok(browser.retainedDataUnchanged);
assert.equal(browser.target, alias.origin); assert.equal(browser.browserOrigin, alias.origin);
assert.equal(browser.transport, 'Direct device QA origin; no origin proxy or header rewrite');
assert.deepEqual(browser.blockedWrites, []); assert.equal(browser.inventoryWrites, 0);
assert.ok(browser.capabilitiesReadyAfterReload && browser.comparisonImageLoadedAfterReload);
assert.ok(browser.requests.some(r => r.candidates.includes('GV-PK-LOR-TG02')));
assert.ok(browser.requests.some(r => r.candidates.includes('GV-PK-ASR-TG02')));
const tests = dir + '/origin-tests-retry1.log';
assert.match(fs.readFileSync(tests, 'utf8'), /# pass 23\b/);
assert.match(fs.readFileSync(tests, 'utf8'), /# fail 0\b/);
files.push(tests, dir + '/origin-tests.log');
const device = consume(dir + '/device-probe-initial.private.json');
const statusName = fs.readdirSync(dir).filter(f => /^status-\d+\.json$/.test(f)).sort().at(-1);
const latest = consume(dir + '/' + statusName); assert.ok(latest.aliasUnchanged);
assert.equal(latest.id, ready.id); assert.equal(latest.state, 'READY');
const harnesses = ['scripts/tests/vendor_scan_receipt_v32.mjs', 'scripts/tests/vendor_device_origin_v32.test.mjs',
  'scripts/tests/vendor_pilot_runtime_v1.test.mjs', ...['hosting','origin-proof','browser-proof'].map(n => 'scripts/preview/vendor-pilot/visual-v32-' + n + '.mjs')];
const result = { at: new Date().toISOString(), precedingProofSha256: hash('docs/audits/vendor_scan_runtime_v31/PROOF_20260925.json'),
  changedSources: Object.fromEntries(changed.map(f => [f,hash(f)])), matchingSourcesUnchanged: true,
  harnessHashes: Object.fromEntries(harnesses.map(f => [f,hash(f)])), receiptHashes: Object.fromEntries(files.map(f => [f,hash(f)])),
  deployment: ready.id, deviceOrigin: alias.origin, tests: { passed: 23, failed: 0, initialHarnessFailureRetained: true },
  https: { cases: http.rows.length, same: 4, boundaries: http.checks, retainedDataUnchanged: true },
  browser: { steps: browser.steps, transport: browser.transport, requests: browser.requests, retainedDataUnchanged: true, inventoryWrites: 0 },
  device, physicalPhoneQualified: false, releaseQualified: false,
  sharedDeployment: 'dpl_F9id47NjSDscTwE2wx1F1gWpgGRR', sharedAliasUnchanged: true,
  schemaChanges: 0, entitlementChanges: 0, productionWrites: 0, paymentsEnabled: false,
  remaining: ['Enable Safari Web Inspector and Remote Automation on the connected iPhone, then test the actual phone workflow', 'Governed pilot activation after the phone gate'] };
const dest = 'docs/audits/vendor_scan_device_v32/PROOF_20260925.json';
fs.writeFileSync(dest, JSON.stringify(result,null,2)+'\n', { flag: 'wx' });
console.log(JSON.stringify({ proof: dest, tests: 23, httpsCases: 4, directBrowserPassed: true, physicalPhoneQualified: false }));
