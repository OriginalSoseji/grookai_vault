// One-use local reference-preparation comparison. No network; no hosted claim.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { runtime, read } from './vendor_scan_features_support_v28.mjs';
import { decodeReferenceFeaturesV28 as decode, featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { prepareGeometryImage, verifyGeometryV23 } from '../../apps/web/src/lib/stores/scanGeometryV23.mjs';
import { prepareReferenceRiskV20, selectUnambiguousGeometry } from '../../apps/web/src/lib/stores/scanReferenceRiskV20.mjs';
const dir = '.local/integration/vendor-scan-runtime-v28', output = dir + '/profile.private.json';
assert.ok(!fs.existsSync(output));
const regression = read(dir + '/regression2/regression.private.json'); assert.ok(regression.finishedAt);
const manifestPath = dir + '/regression2/manifest.private.json', manifest = read(manifestPath);
const features = new Map(manifest.references.map(r => [r.id, r]));
const label = read('.local/integration/vendor-scan-visual-v16/shortlist.private.json').rows.find(r => r.corpus === 'v2_100' && r.file === 'holdout-0041.heic');
assert.equal(label.ids.length, 28);
const images = new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(r => [r.id, r]));
const catalogBytes = fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');
assert.equal(hash(catalogBytes), manifest.catalogSha256);
const catalog = JSON.parse(gunzipSync(catalogBytes)), byId = new Map(catalog.map(r => [r.id, r]));
const risk = prepareReferenceRiskV20(catalog), { cv } = await runtime();
const bytes = fs.readFileSync(label.path); assert.equal(hash(bytes), label.sha256);
const scan = await prepareGeometryImage(cv, bytes);
const report = { at: new Date().toISOString(), scope: 'Local Windows, initialized process and scan; alternating image extraction versus file read plus hash/validation/decompression/native restoration. Excludes scan preparation, shortlist, network, startup and offline cache generation.',
  manifestSha256: hash(fs.readFileSync(manifestPath)), scanSha256: label.sha256, cases: [] };
fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
let baseline;
try {
  for (const mode of ['image', 'cache', 'cache', 'image', 'image', 'cache']) {
    const started = performance.now(), candidates = []; let prepareMs = 0, verifyMs = 0, totalBytes = 0;
    for (const id of label.ids) {
      const start = performance.now(), meta = images.get(id), feature = features.get(id);
      const data = fs.readFileSync(mode === 'image' ? meta.source : dir + '/regression2/features/' + id + '.gz'); totalBytes += data.length;
      if (mode === 'image') assert.equal(hash(data), meta.sha256);
      const reference = mode === 'image' ? await prepareGeometryImage(cv, data) : decode(cv, data, feature);
      prepareMs += performance.now() - start; const verifyStart = performance.now();
      try { const result = verifyGeometryV23(cv, reference, scan); if (result) candidates.push({ id, gv_id: byId.get(id).gv_id, ...result }); }
      finally { reference.dispose(); }
      verifyMs += performance.now() - verifyStart;
    }
    const result = selectUnambiguousGeometry(candidates, risk), comparable = JSON.stringify({ candidates, result });
    if (!baseline) baseline = comparable; else assert.equal(comparable, baseline);
    assert.equal(result.candidates[0]?.gv_id, 'GV-PK-MEW-005');
    report.cases.push({ mode, references: label.ids.length, totalBytes, prepareMs, verifyMs, totalMs: performance.now() - started, exactParity: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
  }
} finally { scan.dispose(); }
const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
report.summary = Object.fromEntries(['image', 'cache'].map(mode => {
  const cases = report.cases.filter(r => r.mode === mode);
  return [mode, { prepareMedianMs: median(cases.map(r => r.prepareMs)), totalMedianMs: median(cases.map(r => r.totalMs)), bytes: cases[0].totalBytes }];
}));
report.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report.summary));
