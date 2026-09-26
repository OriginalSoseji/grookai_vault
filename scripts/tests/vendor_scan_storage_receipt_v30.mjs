// Assemble public-safe evidence only after private staging and worker checks pass.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { qualificationGateV30 } from './vendor_scan_qualification_gate_v30.mjs';
const read = p => JSON.parse(fs.readFileSync(p)), store = '.local/integration/vendor-scan-storage-v30', runtime = '.local/integration/vendor-scan-runtime-v30';
const oldPath = 'docs/audits/vendor_scan_runtime_v29/PROOF_20260924.json', old = read(oldPath);
for (const [file, sha] of Object.entries(old.sourceHashes)) assert.equal(hash(fs.readFileSync(file)), sha);
const uploaded = read(store + '/uploaded.private.json'), readback = read(store + '/readback.private.json'), hosted = read(store + '/hosting-readback.private.json');
assert.equal(uploaded.verified, 19621); assert.equal(uploaded.references, 20079); assert.equal(uploaded.bytes, 8478139239);
assert.equal(readback.exactInventory, true); assert.equal(readback.retainedDigest, uploaded.retainedDigest); assert.equal(hosted.aliasUnchanged, true);
assert.equal(hash(fs.readFileSync(store + '/uploaded.private.json')), readback.uploadReceiptSha256);
assert.equal(hash(fs.readFileSync(store + '/verified.private.jsonl')), uploaded.journalSha256);
const packageProof = read(runtime + '/package.private.json'), smoke = ['references', 'scans'].map(mode => read(runtime + '/windows-smoke/windows-smoke-' + mode + '-0.complete.json'));
const qualified = qualificationGateV30(runtime), recordedQualification = read(runtime + '/qualified.private.json'), recovered = read(runtime + '/docker-recovered.private.json');
assert.equal(qualified.planSha256, recordedQualification.planSha256); assert.equal(recordedQualification.qualified, true); assert.equal(recovered.engineAvailable, true);
for (const row of smoke) { assert.equal(row.qualifiesLinux, false); assert.equal(row.planSha256, packageProof.planSha256); }
assert.equal(smoke[0].verified, 28); assert.equal(smoke[1].verified, 3);
const deliveries = fs.readdirSync(store).filter(n => /^delivery-\d+\.private\.json$/.test(n)).sort().map(n => ({ file: n, ...read(store + '/' + n) }));
const workers = fs.readdirSync(store).filter(n => /^worker-\d+\.private\.json$/.test(n)).sort().map(n => ({ file: n, ...read(store + '/' + n) }));
const worker = workers.at(-1); assert.equal(worker?.status, 'passed'); assert.equal(worker.rows.length, 17); assert.ok(worker.rows.every(r => r.same));
assert.equal(worker.cancellation.duringDelivery, true); assert.equal(worker.cancellation.firstRetryPassed, true);
assert.equal(worker.retainedDataUnchanged, true); assert.equal(worker.afterDigest, uploaded.retainedDigest);
const receiptFiles = ['audit.private.json', 'plan.private.json', 'prepared.private.json', 'uploaded.private.json', 'readback.private.json', 'hosting-readback.private.json', 'verified.private.jsonl',
  ...deliveries.map(r => r.file), ...workers.map(r => r.file)].map(n => store + '/' + n).concat([
  'package.private.json', 'windows-smoke/windows-smoke-references-0.complete.json', 'windows-smoke/windows-smoke-scans-0.complete.json',
  'windows-smoke/windows-smoke-references-0.jsonl', 'windows-smoke/windows-smoke-scans-0.jsonl', 'gate-negative.txt', 'database-process-review.private.json',
  'docker-recovered.private.json', 'container-isolation.private.json', 'qualified.private.json',
  'linux-output/linux-references-0.complete.json', 'linux-output/linux-references-1.complete.json', 'linux-output/linux-scans-0.complete.json',
  'linux-output/linux-references-0.jsonl', 'linux-output/linux-references-1.jsonl', 'linux-output/linux-scans-0.jsonl',
].map(n => runtime + '/' + n));
const harnesses = ['feature-storage-v30.mjs', 'feature-storage-readback-v30.mjs', 'feature-delivery-proof-v30.mjs', 'feature-hosting-readback-v30.mjs', 'feature-worker-proof-v30.mjs']
  .map(n => 'scripts/preview/vendor-pilot/' + n).concat(['vendor_scan_qualify_v30.mjs', 'vendor_scan_qualify_package_v30.mjs', 'vendor_scan_qualify_docker_v30.mjs', 'vendor_scan_qualification_gate_v30.mjs', 'vendor_scan_storage_receipt_v30.mjs'].map(n => 'scripts/tests/' + n));
const times = worker.rows.map(r => r.ms).sort((a,b) => a-b);
const result = { at: new Date().toISOString(), baseline: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  precedingProofSha256: hash(fs.readFileSync(oldPath)), sourceHashes: old.sourceHashes, appSourcesUnchanged: true,
  harnessHashes: Object.fromEntries(harnesses.map(p => [p, hash(fs.readFileSync(p))])),
  receiptHashes: Object.fromEntries(receiptFiles.map(p => [p, hash(fs.readFileSync(p))])),
  storage: { project: uploaded.target, bucket: uploaded.bucket, private: true, objects: uploaded.verified, references: uploaded.references, bytes: uploaded.bytes,
    allHashesReadBack: true, exactInventory: true, retainedDataUnchanged: true, access: readback.access, publicUrlStatus: readback.publicUrlStatus },
  transport: deliveries.map(r => ({ receipt: r.file, status: r.status, rows: r.rows, error: r.error })),
  worker: { scope: worker.scope, attempts: workers.map(r => ({ file: r.file, status: r.status, cases: r.rows.length, error: r.error })),
    cases: 17, same: 17, medianMs: times[Math.floor(times.length/2)], minMs: times[0], maxMs: times.at(-1), cancellation: worker.cancellation, retainedDataUnchanged: true },
  linux: { qualified: true, runtime: qualified.runtime, packagePlanSha256: packageProof.planSha256, exactReferences: 20079, exactScans: 320,
    correct: 195, wrong: 0, negativesRejected: 56, windowsSmokeReferences: 28, windowsSmokeScans: 3, gateRejectsMissingLinuxProof: true },
  dockerRecovery: recovered,
  hosting: hosted, deployments: 0, aliasActions: 0, schemaChanges: false, canonicalMutations: false, ownershipMutations: false,
  entitlementChanges: false, paymentChanges: false, servingEnabled: false, releaseQualified: false,
  remaining: ['Unshared hosted baseline/cache comparison with authorization, memory, deadline and cancellation proof', 'Deployment-specific resource and physical-phone qualification', 'Governed pilot activation'] };
fs.writeFileSync('docs/audits/vendor_scan_runtime_v30/PROOF_20260925.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ storageObjects: result.storage.objects, workerCases: result.worker.cases, linuxQualified: true, releaseQualified: false }));
