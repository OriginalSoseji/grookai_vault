// One-use, offline Windows equivalence proof. Never opens a database or URL.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { runtime, read, assertFeaturesEqual } from './vendor_scan_features_support_v28.mjs';
import { encodeReferenceFeaturesV28 as encode, decodeReferenceFeaturesV28 as decode, featureHashV28 as hash, FEATURE_CONTRACT_SHA256 } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { prepareGeometryImage, verifyGeometryV23 } from '../../apps/web/src/lib/stores/scanGeometryV23.mjs';
import { prepareReferenceRiskV20, selectUnambiguousGeometry } from '../../apps/web/src/lib/stores/scanReferenceRiskV20.mjs';
const dir = '.local/integration/vendor-scan-runtime-v28/regression2', output = dir + '/regression.private.json';
fs.mkdirSync(dir, { recursive: true }); assert.ok(!fs.existsSync(output), 'Receipt already exists');
fs.mkdirSync(dir + '/features', { recursive: true });
const shortlistPath = '.local/integration/vendor-scan-visual-v16/shortlist.private.json';
const priorPath = '.local/integration/vendor-scan-visual-v23/regression.private.json';
const holdoutDir = process.env.USERPROFILE + '/.codex/tmp/vendor-real-scans-20260923/holdout-visual-v23';
const holdoutPath = holdoutDir + '/results.private.json', labelsPath = holdoutDir + '/frozen-labels.private.json';
const shortlist = read(shortlistPath), prior = read(priorPath), holdout = read(holdoutPath), labels = read(labelsPath);
assert.ok(shortlist.finishedAt && prior.finishedAt && holdout.finishedAt);
assert.equal(shortlist.rows.length, 308); assert.equal(holdout.rows.length, 12);
const inputs = Object.fromEntries([shortlistPath, priorPath, holdoutPath, labelsPath].map(p => [p, hash(fs.readFileSync(p))]));
const sourceHashes = { ...prior.sourceHashes, 'scanReferenceFeaturesV28.mjs': hash(fs.readFileSync('apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs')) };
function freezeCheck() {
  for (const [name, sha] of Object.entries(sourceHashes)) assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/' + name)), sha);
  for (const [path, sha] of Object.entries(inputs)) assert.equal(hash(fs.readFileSync(path)), sha);
}
freezeCheck();
const catalogBytes = fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');
assert.equal(hash(catalogBytes), prior.catalogSha256); assert.equal(prior.catalogSha256, holdout.catalogSha256);
const catalog = JSON.parse(gunzipSync(catalogBytes)), byId = new Map(catalog.map(r => [r.id, r]));
const risk = prepareReferenceRiskV20(catalog);
const images = new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(r => [r.id, r]));
const cases = shortlist.rows.map(label => ({ ...label, baseline: prior.rows.find(r => r.corpus === label.corpus && r.file === label.file) }));
for (const baseline of holdout.rows) {
  const label = labels.labels.find(r => r.file === baseline.file);
  assert.equal(hash(fs.readFileSync(holdoutDir + '/originals/' + label.file)), label.originalSha256);
  cases.push({ corpus: 'v23_reused12', file: label.file, path: holdoutDir + '/derived/' + label.file, sha256: label.sha256, ids: baseline.ids, baseline });
}
const rt = await runtime(), { cv } = rt;
const report = { at: new Date().toISOString(), scope: '320 reused development scans; frozen shortlists, exact intermediate geometry and final result parity. Local Windows only; no serving changes.',
  sourceHashes, inputs, catalogSha256: prior.catalogSha256, contractSha256: FEATURE_CONTRACT_SHA256,
  runtime: { node: rt.node, platform: rt.platform, arch: rt.arch, sharp: rt.versions },
  uniqueReferences: new Set(cases.flatMap(r => r.ids)).size, references: [], rows: [] };
fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
const manifest = new Map(), native = new Map();
let restoreMs = 0, restores = 0;
async function reference(id) {
  if (native.has(id)) { const value = native.get(id); native.delete(id); native.set(id, value); return value; }
  const image = images.get(id); assert.ok(image); assert.equal(byId.get(id).sha256, image.sha256);
  const path = dir + '/features/' + id + '.gz';
  if (!manifest.has(id)) {
    const bytes = fs.readFileSync(image.source); assert.equal(hash(bytes), image.sha256);
    const started = performance.now(), prepared = await prepareGeometryImage(cv, bytes), prepareMs = performance.now() - started;
    try {
      const packStarted = performance.now(), packed = encode(prepared, image.sha256), encodeMs = performance.now() - packStarted;
      const binding = { imageSha256: image.sha256, artifactSha256: hash(packed) };
      const restored = decode(cv, packed, binding);
      try { assertFeaturesEqual(prepared, restored); } finally { restored.dispose(); }
      fs.writeFileSync(path, packed, { flag: 'wx' });
      const item = { id, ...binding, bytes: packed.length, imageBytes: bytes.length, prepareMs, encodeMs,
        originalRows: prepared.original.points.size(), balancedRows: prepared.points.size() };
      manifest.set(id, item); report.references.push(item);
    } finally { prepared.dispose(); }
  }
  const started = performance.now(), value = decode(cv, fs.readFileSync(path), manifest.get(id));
  restoreMs += performance.now() - started; restores++; native.set(id, value);
  if (native.size > 32) { const first = native.keys().next().value; native.get(first).dispose(); native.delete(first); }
  return value;
}
try {
  for (const item of cases) {
    const started = performance.now(), bytes = fs.readFileSync(item.path); assert.equal(hash(bytes), item.sha256);
    let scan, error; const geometryCandidates = [];
    try { scan = await prepareGeometryImage(cv, bytes); } catch (e) { error = e.message; }
    try {
      if (scan) for (const id of item.ids) {
        const result = verifyGeometryV23(cv, await reference(id), scan);
        if (result) geometryCandidates.push({ id, gv_id: byId.get(id).gv_id, ...result });
      }
    } finally { scan?.dispose(); }
    const result = selectUnambiguousGeometry(geometryCandidates, risk);
    if (error) { result.status = 'error'; result.candidates = []; }
    const baseline = item.baseline; assert.ok(baseline);
    assert.equal(error, baseline.error, item.corpus + ':' + item.file + ' error');
    // Historical receipts are JSON: optional undefined properties were omitted.
    // Compare at that same serialization boundary, with no numeric tolerance.
    const json = value => JSON.parse(JSON.stringify(value));
    assert.deepEqual(json(geometryCandidates), baseline.geometryCandidates, item.corpus + ':' + item.file + ' intermediate');
    for (const [key, value] of Object.entries(result)) assert.deepEqual(value === undefined ? value : json(value), baseline[key], item.corpus + ':' + item.file + ':' + key);
    report.rows.push({ corpus: item.corpus, file: item.file, scanSha256: item.sha256, status: result.status,
      candidates: result.candidates.map(r => ({ id: r.id, gv_id: r.gv_id, rotation: r.rotation })),
      correct: baseline.correct, wrong: baseline.wrong, negative: !baseline.expected.length, error,
      exactIntermediateParity: true, ms: Math.round(performance.now() - started) });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    if (report.rows.length % 20 === 0) console.log(JSON.stringify({ processed: report.rows.length, references: manifest.size, exactParity: true }));
  }
} finally { for (const value of native.values()) value.dispose(); }
freezeCheck(); assert.equal(manifest.size, report.uniqueReferences);
report.finishedAt = new Date().toISOString();
report.summary = { scans: report.rows.length, correct: report.rows.filter(r => r.correct).length, wrong: report.rows.filter(r => r.wrong).length,
  negativesRejected: report.rows.filter(r => r.negative && !r.candidates.length).length, errors: report.rows.filter(r => r.error).length,
  references: manifest.size, featureBytes: report.references.reduce((n, r) => n + r.bytes, 0), imageBytes: report.references.reduce((n, r) => n + r.imageBytes, 0),
  prepareMs: Math.round(report.references.reduce((n, r) => n + r.prepareMs, 0)), encodeMs: Math.round(report.references.reduce((n, r) => n + r.encodeMs, 0)),
  restores, restoreMs: Math.round(restoreMs), maxFeatureBytes: Math.max(...report.references.map(r => r.bytes)), peakRss: process.resourceUsage().maxRSS * 1024 };
fs.writeFileSync(dir + '/manifest.private.json', JSON.stringify({ contractSha256: FEATURE_CONTRACT_SHA256, catalogSha256: report.catalogSha256, references: report.references }, null, 2), { flag: 'wx' });
fs.writeFileSync(output, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report.summary));
