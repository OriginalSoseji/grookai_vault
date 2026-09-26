// Runs only in the dedicated, network-disabled Linux proof container.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { runtime, read, assertFeaturesEqual } from './vendor_scan_features_support_v28.mjs';
import { decodeReferenceFeaturesV28 as decode, featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { prepareGeometryImage, verifyGeometryV23 } from '../../apps/web/src/lib/stores/scanGeometryV23.mjs';
assert.equal(process.platform, 'linux'); assert.equal(process.arch, 'x64');
const output = '/proof-output/result.json'; assert.ok(!fs.existsSync(output));
const rt = await runtime(), { cv, sharp } = rt, manifest = read('fixtures/manifest.json');
for (const [path, sha] of Object.entries(manifest.files)) assert.equal(hash(fs.readFileSync(path)), sha);
const report = { at: new Date().toISOString(), scope: 'Bounded Linux x64 parity, 28 reference images and one reused scan; network disabled, no ports, no database.',
  runtime: { node: rt.node, platform: rt.platform, arch: rt.arch, sharp: rt.versions }, manifestSha256: hash(fs.readFileSync('fixtures/manifest.json')), rows: [] };
fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
const scan = await prepareGeometryImage(cv, fs.readFileSync('fixtures/scan'));
try {
  for (const item of manifest.references) {
    const image = fs.readFileSync('fixtures/' + item.id + '.image'); assert.equal(hash(image), item.imageSha256);
    const fresh = await prepareGeometryImage(cv, image); let cached;
    try {
      cached = decode(cv, fs.readFileSync('fixtures/' + item.id + '.gz'), item);
      assertFeaturesEqual(fresh, cached);
      const result = verifyGeometryV23(cv, fresh, scan);
      assert.deepEqual(result, verifyGeometryV23(cv, cached, scan));
      assert.deepEqual(JSON.parse(JSON.stringify(result)), item.windowsResult);
      report.rows.push({ id: item.id, format: (await sharp(image).metadata()).format, exactPixelsPointsDescriptors: true, exactGeometryParity: true });
      fs.writeFileSync(output, JSON.stringify(report, null, 2));
    } finally { cached?.dispose(); fresh.dispose(); }
  }
} finally { scan.dispose(); }
report.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ references: report.rows.length, exactParity: true }));
