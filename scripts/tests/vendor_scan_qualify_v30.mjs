// Offline, resumable target-runtime qualification. Smoke evidence cannot qualify Linux.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { runtime, assertFeaturesEqual } from './vendor_scan_features_support_v28.mjs';
import { decodeReferenceFeaturesV28 as decode, featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { prepareGeometryImage, verifyGeometryV23 } from '../../apps/web/src/lib/stores/scanGeometryV23.mjs';
import { prepareReferenceRiskV20, selectUnambiguousGeometry } from '../../apps/web/src/lib/stores/scanReferenceRiskV20.mjs';
import { prepareVisualIndex, VISUAL_VERSION } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
import { shortlistVisualReferencesV25 } from '../../apps/web/src/lib/stores/scanShortlistV25.mjs';
const [mode, planPath, expectedHash, outputDir, shardArg = '0', countArg = '1', flag] = process.argv.slice(2);
assert.ok(['references', 'scans'].includes(mode));
const smoke = flag === '--windows-smoke';
assert.ok(smoke ? process.platform === 'win32' : process.platform === 'linux');
assert.equal(process.arch, 'x64');
const shard = Number(shardArg), shards = Number(countArg);
assert.ok(Number.isInteger(shard) && Number.isInteger(shards) && shards >= 1 && shards <= 4 && shard >= 0 && shard < shards);
assert.ok(mode === 'references' || shards === 1);
const bytes = fs.readFileSync(planPath); assert.equal(hash(bytes), expectedHash);
const plan = JSON.parse(bytes), packageRoot = path.dirname(path.resolve(planPath));
assert.equal(plan.references.length, 20079); assert.equal(plan.scans.length, 320);
assert.equal(new Set(plan.references.map(r => r.id)).size, 20079);
function freeze() { for (const [file, sha] of Object.entries(plan.files)) assert.equal(hash(fs.readFileSync(file)), sha, file); }
freeze();
const rt = await runtime(), { cv } = rt;
const label = `${smoke ? 'windows-smoke' : 'linux'}-${mode}-${shard}`;
fs.mkdirSync(outputDir, { recursive: true });
const metaPath = path.join(outputDir, label + '.meta.json'), journal = path.join(outputDir, label + '.jsonl'), finalPath = path.join(outputDir, label + '.complete.json');
assert.ok(!fs.existsSync(finalPath), 'Completed proof is immutable; choose a new output directory');
const metadata = { planSha256: expectedHash, mode, shard, shards, smoke, runtime: { node: rt.node, platform: rt.platform, arch: rt.arch, versions: rt.versions } };
if (fs.existsSync(metaPath)) assert.deepEqual(JSON.parse(fs.readFileSync(metaPath)), metadata);
else { assert.ok(!fs.existsSync(journal)); fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), { flag: 'wx' }); }
const rows = fs.existsSync(journal) ? fs.readFileSync(journal, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const append = row => { fs.appendFileSync(journal, JSON.stringify(row) + '\n'); rows.push(row); };
const featurePath = row => smoke ? row.windowsFeature : row.feature;
const imagePath = row => smoke ? row.windowsImage : row.image;
if (mode === 'references') {
  let selected = plan.references.filter((_, i) => i % shards === shard);
  if (smoke) selected = selected.slice(0, 28);
  assert.ok(rows.length <= selected.length);
  for (let i = 0; i < rows.length; i++) {
    const row = selected[i]; assert.equal(rows[i].id, row.id); assert.equal(rows[i].artifactSha256, row.artifactSha256);
    assert.equal(rows[i].imageSha256, row.imageSha256); assert.equal(rows[i].exactFeatures, true);
  }
  for (const row of selected.slice(rows.length)) {
    const started = performance.now(), image = fs.readFileSync(imagePath(row)), cached = fs.readFileSync(featurePath(row));
    assert.equal(hash(image), row.imageSha256); assert.equal(cached.length, row.bytes);
    let fresh, restored;
    try { fresh = await prepareGeometryImage(cv, image); restored = decode(cv, cached, row); assertFeaturesEqual(fresh, restored); }
    finally { fresh?.dispose(); restored?.dispose(); }
    append({ id: row.id, imageSha256: row.imageSha256, artifactSha256: row.artifactSha256, exactFeatures: true, ms: Math.round(performance.now() - started) });
    if (rows.length % 100 === 0) console.log(JSON.stringify({ mode, shard, verified: rows.length, total: selected.length }));
  }
  assert.equal(rows.length, selected.length);
} else {
  const catalogBytes = fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');
  assert.equal(hash(catalogBytes), plan.catalogSha256);
  const catalog = JSON.parse(gunzipSync(catalogBytes)), byId = new Map(catalog.map(r => [r.id, r]));
  const visual = prepareVisualIndex({ version: VISUAL_VERSION, references: catalog }), risk = prepareReferenceRiskV20(catalog);
  const bindings = new Map(plan.references.map(r => [r.id, r])), native = new Map();
  const selected = smoke ? plan.scans.slice(0, 3) : plan.scans;
  assert.ok(rows.length <= selected.length);
  for (let i = 0; i < rows.length; i++) { assert.equal(rows[i].key, selected[i].key); assert.equal(rows[i].scanSha256, selected[i].sha256); assert.equal(rows[i].exactParity, true); }
  function reference(id) {
    if (native.has(id)) { const r = native.get(id); native.delete(id); native.set(id, r); return r; }
    const row = bindings.get(id); assert.ok(row); assert.equal(row.imageSha256, byId.get(id).sha256);
    const bytes = fs.readFileSync(featurePath(row)); assert.equal(bytes.length, row.bytes);
    const value = decode(cv, bytes, row); native.set(id, value);
    if (native.size > 32) { const first = native.keys().next().value; native.get(first).dispose(); native.delete(first); }
    return value;
  }
  const json = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  try { for (const item of selected.slice(rows.length)) {
    const started = performance.now(), bytes = fs.readFileSync(path.join(packageRoot, item.file)); assert.equal(hash(bytes), item.sha256);
    let ids = [], shortlistError, scan, error; const geometry = [];
    try { ids = await shortlistVisualReferencesV25(bytes, visual); } catch (e) { shortlistError = e.message; }
    assert.deepEqual(ids, item.shortlist.ids, item.key + ':shortlist'); assert.equal(shortlistError, item.shortlist.error, item.key + ':shortlist error');
    try { scan = await prepareGeometryImage(cv, bytes); } catch (e) { error = e.message; }
    try { if (scan) for (const id of ids) { const result = verifyGeometryV23(cv, reference(id), scan); if (result) geometry.push({ id, gv_id: byId.get(id).gv_id, ...result }); } }
    finally { scan?.dispose(); }
    const result = selectUnambiguousGeometry(geometry, risk); if (error) { result.status = 'error'; result.candidates = []; }
    assert.equal(error, item.baseline.error, item.key + ':error');
    assert.deepEqual(json(geometry), item.baseline.geometryCandidates, item.key + ':intermediate');
    for (const [key, value] of Object.entries(result)) assert.deepEqual(json(value), item.baseline[key], item.key + ':' + key);
    append({ key: item.key, scanSha256: item.sha256, exactParity: true, status: result.status, correct: item.baseline.correct, wrong: item.baseline.wrong,
      negative: !item.baseline.expected.length, candidates: result.candidates.map(r => r.id), error, ms: Math.round(performance.now() - started) });
    if (rows.length % 20 === 0) console.log(JSON.stringify({ mode, verified: rows.length, total: selected.length }));
  } } finally { for (const value of native.values()) value.dispose(); }
  assert.equal(rows.length, selected.length);
}
freeze(); assert.equal(hash(fs.readFileSync(planPath)), expectedHash);
const summary = { ...metadata, finishedAt: new Date().toISOString(), verified: rows.length, journalSha256: hash(fs.readFileSync(journal)),
  correct: rows.filter(r => r.correct).length, wrong: rows.filter(r => r.wrong).length, negativesRejected: rows.filter(r => r.negative && !r.candidates.length).length,
  peakRss: process.resourceUsage().maxRSS * 1024, qualifiesLinux: !smoke };
fs.writeFileSync(finalPath, JSON.stringify(summary, null, 2), { flag: 'wx' }); console.log(JSON.stringify(summary));
