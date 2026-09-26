// Real disposable workers, synthetic authorization and bounded loopback HTTP.
// No database, external network, telemetry or inventory writes.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import { loadReferenceMetadataV27 } from '../../apps/web/src/lib/stores/scanReferenceMetadataV27.mjs';
import { loadFeatureManifestV29 } from '../../apps/web/src/lib/stores/scanFeatureManifestV29.mjs';
import { createFeatureDeliveryV29, featurePathV29, FEATURE_BUCKET_V29 } from '../../apps/web/src/lib/stores/scanFeatureDeliveryV29.mjs';
import { createReferenceDelivery, hashReference as hash } from '../../apps/web/src/lib/stores/scanReferenceDeliveryV24.mjs';
import { runVisualProcessV24 } from '../../apps/web/src/lib/stores/scanVisualProcessV24.mjs';
const read = p => JSON.parse(fs.readFileSync(p)), mode = process.argv[2]; assert.ok(['baseline', 'features'].includes(mode));
const dir = '.local/integration/vendor-scan-runtime-v29', output = dir + '/runtime-' + mode + (mode === 'features' ? '-retry1' : '') + '.private.json'; assert.ok(!fs.existsSync(output));
const byId = loadReferenceMetadataV27(new URL('../../apps/web/src/lib/stores/scanExpandedMetadataV27.json.gz', import.meta.url));
const manifest = loadFeatureManifestV29(new URL('../../apps/web/src/lib/stores/scanExpandedFeaturesV29.json.gz', import.meta.url), byId);
const sources = new Map(read(dir + '/manifest.private.json').references.map(r => [r.id, r]));
const images = new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(r => [r.id, r]));
const locations = new Map([...byId.values()].map(r => mode === 'features'
  ? ['/storage/v1/object/sign/' + FEATURE_BUCKET_V29 + '/' + featurePathV29(manifest.get(r.id)), { source: sources.get(r.id).localSource, sha256: manifest.get(r.id).artifactSha256, type: 'application/octet-stream' }]
  : ['/storage/v1/object/sign/user-card-images/' + r.image_path, { ...images.get(r.id), type: r.image_path.endsWith('.webp') ? 'image/webp' : r.image_path.endsWith('.png') ? 'image/png' : 'image/jpeg' }]));
let requests = 0;
const server = http.createServer((req, res) => {
  const row = locations.get(new URL(req.url, 'http://127.0.0.1').pathname);
  if (!row) { res.writeHead(404); res.end(); return; }
  const bytes = fs.readFileSync(row.source); assert.equal(hash(bytes), row.sha256); requests++;
  res.writeHead(200, { 'content-type': row.type, 'content-length': bytes.length }); res.end(bytes);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
let revoked = false;
const authorize = async rows => revoked ? [] : rows.map(r => r.id);
const loadReferences = mode === 'features' ? createFeatureDeliveryV29({ byId, manifest, origin, authorize,
  sign: async rows => rows.map(r => origin + '/storage/v1/object/sign/' + FEATURE_BUCKET_V29 + '/' + featurePathV29(r) + '?token=synthetic') })
  : createReferenceDelivery({ byId, origin, authorize, sign: async rows => rows.map(r => origin + '/storage/v1/object/sign/user-card-images/' + r.image_path + '?token=synthetic') });
const labels = read('.local/integration/vendor-scan-visual-v16/labels.private.json'), previous = read('.local/integration/vendor-scan-visual-v23/regression.private.json');
const lost = new Set(['holdout-0041.heic','holdout-0081.jpeg','holdout-0083.jpeg','holdout-0085.jpeg','holdout-0087.jpeg','holdout-0089.jpeg','holdout-0091.jpeg','holdout-0095.jpeg','holdout-0097.jpeg']);
const cases = labels.filter(r => ['gallery_v12','browser_heic','legacy'].includes(r.corpus) || r.corpus === 'v2_100' && lost.has(r.file)).map(r => ({ ...r, expectedResult: previous.rows.find(p => p.corpus === r.corpus && p.file === r.file) }));
const fresh = process.env.USERPROFILE + '/.codex/tmp/vendor-real-scans-20260923/holdout-visual-v23';
for (const file of ['fresh-01.jpeg','fresh-12.jpeg']) { const label = read(fresh + '/frozen-labels.private.json').labels.find(r => r.file === file);
  cases.push({ ...label, corpus: 'v23_reused12', path: fresh + '/derived/' + file, expectedResult: read(fresh + '/results.private.json').rows.find(r => r.file === file) }); }
assert.equal(cases.length, 17);
const worker = new URL('../../apps/web/src/lib/stores/scanVisualWorkerV' + (mode === 'features' ? 29 : 25) + '.mjs', import.meta.url);
const sourceNames = ['scanVisualServerV24.ts','scanVisualProcessV24.mjs','scanVisualWorkerV25.mjs','scanVisualWorkerV29.mjs','scanFeatureManifestV29.mjs','scanFeatureDeliveryV29.mjs','scanFeatureRuntimeV29.mjs','scanReferenceFeaturesV28.mjs','scanExpandedFeaturesV29.json.gz','scanShortlistV25.mjs','scanGeometryV23.mjs'];
const sourceHashes = Object.fromEntries(sourceNames.map(n => [n, hash(fs.readFileSync('apps/web/src/lib/stores/' + n))]));
const report = { at: new Date().toISOString(), mode, scope: '17 reused scans; Windows loopback HTTP and real worker. Not Linux/hosted proof.', sourceHashes, rows: [], boundaries: {} };
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
const options = { byId, featureManifest: mode === 'features' ? manifest : undefined, loadReferences, timeoutMs: 30000 };
try {
  for (const label of cases) {
    const bytes = fs.readFileSync(label.path); assert.equal(hash(bytes), label.sha256);
    const start = performance.now(), before = requests, progress = []; let resources;
    let result;
    try { result = await runVisualProcessV24(worker, bytes, { ...options, onProgress: p => progress.push(p), onResources: r => resources = r }); }
    catch (e) { report.failedCase = { corpus: label.corpus, file: label.file, progress, resources }; throw e; }
    assert.deepEqual(result.candidates, label.expectedResult.candidates.map(({ id, rotation }) => ({ id, rotation })));
    assert.equal(result.status, label.expectedResult.status);
    report.rows.push({ corpus: label.corpus, file: label.file, same: true, result, resources, progress, ms: Math.round(performance.now() - start), requests: requests - before });
    fs.writeFileSync(output, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ mode, cases: report.rows.length, same: true }));
  }
  if (mode === 'features') {
    const scan = fs.readFileSync(cases[0].path), before = requests; revoked = true;
    const hidden = await runVisualProcessV24(worker, scan, options);
    assert.deepEqual(hidden.candidates, []); assert.equal(requests, before); report.boundaries.revoked = true; revoked = false;
    // Even an incorrectly trusted parent binding cannot replace the worker's
    // independently loaded pinned manifest.
    const forged = new Map(manifest);
    await assert.rejects(runVisualProcessV24(worker, scan, { ...options, featureManifest: forged, loadReferences: async (ids, opts) => {
      const packets = await loadReferences(ids, opts); const first = packets[0], bytes = Buffer.from(first.bytes); bytes[100] ^= 1;
      forged.set(first.id, { ...forged.get(first.id), artifactSha256: hash(bytes) }); return [{ id: first.id, bytes }, ...packets.slice(1)];
    } }), e => e.code === 'worker_matching'); report.boundaries.workerRejectsForgedParent = true;
    const controller = new AbortController(); let transportAborted = false;
    await assert.rejects(runVisualProcessV24(worker, scan, { ...options, signal: controller.signal, loadReferences: async (_, { signal }) => {
      signal.addEventListener('abort', () => transportAborted = true); controller.abort(); return new Promise(() => {});
    } }), e => e.code === 'aborted'); assert.ok(transportAborted); report.boundaries.cancelled = true;
    const retry = await runVisualProcessV24(worker, scan, options);
    assert.deepEqual(retry.candidates, cases[0].expectedResult.candidates.map(({ id, rotation }) => ({ id, rotation })));
    report.boundaries.firstRetry = true;
  }
  report.finishedAt = new Date().toISOString();
} catch (e) { report.error = String(e.code || e.message).slice(0, 500); throw e; }
finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); fs.writeFileSync(output, JSON.stringify(report, null, 2)); }
for (const [name, sha] of Object.entries(sourceHashes)) assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/' + name)), sha);
report.summary = { cases: report.rows.length, same: report.rows.length, requests, maxMs: Math.max(...report.rows.map(r => r.ms)) };
fs.writeFileSync(output, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report.summary));
