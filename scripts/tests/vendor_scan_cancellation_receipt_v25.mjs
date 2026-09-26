import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const read = p => JSON.parse(fs.readFileSync(p)), hash = b => createHash('sha256').update(b).digest('hex');
const before = '.local/integration/vendor-scan-hosted-v24-v25-budget', dir = '.local/integration/vendor-scan-hosted-v24-v25-cancel';
const old = read(before + '/package.json'), plan = read(dir + '/package.json'), ready = read(dir + '/ready.json'), https = read(dir + '/hosted-proof.private.json');
const differences = plan.files.filter(f => old.files.find(o => o.path === f.path)?.sha256 !== f.sha256).map(f => f.path).sort();
assert.deepEqual(differences, ['apps/web/src/app/api/stores/owner/intake/match/route.ts', 'apps/web/vercel.json']);
assert.equal(plan.files.length, old.files.length);
assert.equal(ready.id, https.deployment); assert.equal(https.status, 'passed'); assert.equal(https.rows.length, 5);
assert.ok(https.rows.every(r => r.same)); assert.equal(https.cancellation.firstRetryHttp, 200); assert.ok(https.retainedDataUnchanged);
const tests = fs.readFileSync('.local/integration/vendor-scan-runtime-v25/tests-cancellation.txt', 'utf8');
assert.match(tests, /# tests 3\b/); assert.match(tests, /# fail 0\b/);
const browserFile = fs.readdirSync(dir).filter(n => /^browser-\d+\.json$/.test(n)).sort().at(-1), browser = read(dir + '/' + browserFile);
assert.equal(browser.target, ready.url); assert.equal(browser.status, 'passed'); assert.equal(browser.inventoryWrites, 0);
assert.equal(browser.catalogImages.length, 2); assert.ok(browser.catalogImages.every(i => i.width > 0 && i.height > 0));
const logFile = dir + '/runtime-logs-final.private.jsonl', logs = fs.readFileSync(logFile, 'utf8').trim().split(/\r?\n/).map(s => JSON.parse(s));
const aborted = logs.some(row => row.deploymentId === ready.id && [row.message, ...(row.logs ?? []).map(l => l.message)].includes('store_scan_process aborted'));
assert.ok(aborted, 'Require hosted worker-aborted evidence, not just a disconnected client');
const sources = [...Object.keys(read('docs/audits/vendor_scan_runtime_v25/PROOF_20260924.json').sourceHashes), 'apps/web/vercel.json'];
const sourceHashes = Object.fromEntries(sources.map(file => { const sha = hash(fs.readFileSync(file)); assert.equal(sha, plan.files.find(f => f.path === file)?.sha256); return [file, sha]; }));
const receipt = {
  at: new Date().toISOString(), baseline: '7ef0ba02040d290bfa390b8bd3882d7b960f4ccd', sourceHashes,
  precedingProofSha256: hash(fs.readFileSync('docs/audits/vendor_scan_runtime_v25/PROOF_20260924.json')),
  packageOnlyChanges: differences, algorithmUnchanged: true, additionalTests: { passed: 3, failed: 0, receiptSha256: hash(Buffer.from(tests)) },
  hosting: { deployment: ready.id, url: ready.url, state: ready.state, packageSha256: hash(fs.readFileSync(dir + '/package.json')) },
  https: { cases: 5, same: 5, checks: https.checks, maxMs: Math.max(...https.rows.map(r => r.ms)), concurrency: https.concurrency, cancellation: https.cancellation, retainedDataUnchanged: https.retainedDataUnchanged, receiptSha256: hash(fs.readFileSync(dir + '/hosted-proof.private.json')) },
  workerAbortObserved: aborted, logsSha256: hash(fs.readFileSync(logFile)),
  browser: { status: browser.status, steps: browser.steps, catalogImages: browser.catalogImages, inventoryWrites: browser.inventoryWrites, receiptSha256: hash(fs.readFileSync(dir + '/' + browserFile)) },
  sharedAliasChanged: false, releaseQualified: false,
  remaining: ['Physical Samsung flow (locked at last readback)', 'Hosted memory/resource-envelope qualification', 'User-visible matching latency: previous full hosted sample took about21–27seconds per scan', 'Governed pilot activation after remaining gates; production remains separate'],
};
fs.writeFileSync('docs/audits/vendor_scan_runtime_v25/CANCELLATION_PROOF_20260924.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ recorded: true, hostedCases: 5, firstRetryHttp: https.cancellation.firstRetryHttp, workerAbortObserved: aborted, browser: browser.status, releaseQualified: false }));
