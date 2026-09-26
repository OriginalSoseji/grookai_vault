// Read-only preparation. This command never assigns aliases or grants access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const project = 'prj_6eeKXtBiLWciS3F2K7Usz8JhwDgy';
const team = 'team_EFKFYSau9Gf8wEaix8zXgQZG';
const candidate = 'dpl_9oyb6uwYpsjmcji52NSmoE5UhK3h';
const rollback = 'dpl_F9id47NjSDscTwE2wx1F1gWpgGRR';
const qa = 'dpl_C6aSNWbDD4mesmMTNkpgJhgxaM4w';
const sharedAlias = 'grookai-vendor-preview.vercel.app';
const qaAlias = 'grookai-vendor-device-qa.vercel.app';
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const hash = absolute => createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
const receipt = {
  at: new Date().toISOString(), project, candidate, rollback, qa,
  sharedAlias, qaAlias, status: 'checking', remoteMutations: 0,
  physicalAcceptance: 'unverified', mutationsAllowed: false,
};
const out = path.join(root, '.local/integration/vendor-scan-promotion');
fs.mkdirSync(out, { recursive: true });
const output = path.join(out, `preflight-${Date.now()}-${randomUUID()}.json`);

try {
  assert.equal(process.argv.length, 2, 'Read-only command takes no action arguments');
  const proofPaths = [
    'docs/audits/vendor_scan_runtime_v31/PROOF_20260925.json',
    'docs/audits/vendor_scan_device_v32/PROOF_20260925.json',
  ];
  receipt.proofs = {};
  let checkedReceipts = 0;
  for (const relative of proofPaths) {
    const proof = read(relative);
    receipt.proofs[relative] = hash(path.join(root, relative));
    for (const [file, expected] of Object.entries(proof.receiptHashes)) {
      assert.equal(hash(path.join(root, file)), expected, `Receipt changed: ${file}`);
      checkedReceipts++;
    }
  }
  const normal = read('.local/integration/vendor-scan-hosted-v31-features/package.json');
  const device = read('.local/integration/vendor-scan-device-v32/package.json');
  assert.equal(normal.project, project);
  assert.equal(device.project, project);
  assert.equal(normal.database, 'hrtbjchobencariqclab');
  assert.equal(device.database, normal.database);
  const normalFiles = new Map(normal.files.map(file => [file.path, file.sha256]));
  const deviceFiles = new Map(device.files.map(file => [file.path, file.sha256]));
  assert.deepEqual([...normalFiles.keys()].sort(), [...deviceFiles.keys()].sort());
  const differences = [...normalFiles].filter(([file, sha]) => deviceFiles.get(file) !== sha)
    .map(([file]) => file).sort();
  assert.deepEqual(differences, [
    'apps/web/next.config.mjs',
    'apps/web/src/lib/vendorPilot.d.mts',
    'apps/web/src/lib/vendorPilot.mjs',
  ]);
  for (const plan of [normal, device]) {
    for (const file of plan.files) {
      assert.equal(hash(path.join(plan.dest, file.path)), file.sha256, `Frozen package changed: ${file.path}`);
    }
  }
  receipt.local = { checkedReceipts, filesPerPackage: normal.files.length, differences, frozenPackagesVerified: true };

  const token = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA, 'com.vercel.cli/Data/auth.json'), 'utf8')).token;
  assert.ok(token);
  async function get(route) {
    const response = await fetch(`https://api.vercel.com${route}?teamId=${team}`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
    });
    assert.ok(response.ok, `Hosting GET failed: HTTP ${response.status}`);
    return response.json();
  }
  const results = await Promise.allSettled([
    ...[candidate, rollback, qa].map(id => get(`/v13/deployments/${id}`)),
    get(`/v4/aliases/${sharedAlias}`), get(`/v4/aliases/${qaAlias}`),
  ]);
  const failures = results.filter(result => result.status === 'rejected');
  assert.equal(failures.length, 0, `${failures.length} hosting read(s) failed`);
  const [next, previous, deviceBuild, shared, deviceAlias] = results.map(result => result.value);
  for (const [build, id] of [[next, candidate], [previous, rollback], [deviceBuild, qa]]) {
    assert.equal(build.id, id);
    assert.equal(build.projectId, project);
    assert.equal(build.readyState, 'READY');
  }
  assert.ok([rollback, candidate].includes(shared.deploymentId), 'Unexpected shared deployment; reconcile before proceeding');
  if (shared.deploymentId === candidate) {
    const release = read('.local/integration/vendor-scan-release-20260926/release.json');
    assert.equal(release.status, 'released_verified');
    assert.equal(release.deployment, candidate);
    assert.ok(release.retainedDataUnchanged && release.browser.draftDetailsVerified);
    receipt.releaseReceiptSha256 = hash(path.join(root, '.local/integration/vendor-scan-release-20260926/release.json'));
  }
  assert.equal(deviceAlias.deploymentId, qa, 'TestFlight QA alias changed');
  receipt.hosting = {
    candidateReady: true, rollbackReady: true, qaReady: true,
    sharedDeployment: shared.deploymentId, qaDeployment: deviceAlias.deploymentId,
  };
  receipt.status = shared.deploymentId === candidate ? 'released_alias_readback_passed' : 'preflight_passed_not_released';
} catch (error) {
  receipt.status = 'failed';
  // Do not persist provider payloads or credentials.
  receipt.error = error instanceof assert.AssertionError ? error.message : 'Read or transport failed; inspect locally';
  process.exitCode = 1;
} finally {
  receipt.finishedAt = new Date().toISOString();
  fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ ...receipt, receipt: path.relative(root, output).replaceAll('\\', '/') }, null, 2));
}
