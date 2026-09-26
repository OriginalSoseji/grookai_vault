// Offline fallback generation while Docker is unavailable. This does not
// replace the outstanding Linux equivalence or hosted qualification gates.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { runtime, assertFeaturesEqual, read } from './vendor_scan_features_support_v28.mjs';
import { encodeReferenceFeaturesV28 as encode, decodeReferenceFeaturesV28 as decode, featureHashV28 as hash, FEATURE_CONTRACT_SHA256 } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { prepareGeometryImage } from '../../apps/web/src/lib/stores/scanGeometryV23.mjs';
async function main() {
  assert.equal(process.platform, 'win32'); const shard = Number(process.argv[2]); assert.ok([0, 1].includes(shard));
  const base = '.local/integration/vendor-scan-runtime-v29', plan = read(base + '/generation-package/generation-plan.json');
  const packageReceipt = read(base + '/generation-package.private.json');
  assert.equal(hash(fs.readFileSync(base + '/generation-package/generation-plan.json')), packageReceipt.planSha256);
  for (const [file, sha] of Object.entries(plan.files)) assert.equal(hash(fs.readFileSync(file)), sha);
  assert.equal(new Set(plan.references.map(r => r.id)).size, 20079);
  const output = base + '/windows-generated/shard-' + shard + '.json'; assert.ok(!fs.existsSync(output));
  fs.mkdirSync(base + '/windows-generated/features', { recursive: true });
  process.env.OMP_THREAD_LIMIT = '1'; const rt = await runtime(), { cv } = rt; rt.sharp.concurrency(1);
  const report = { at: new Date().toISOString(), shard, contractSha256: FEATURE_CONTRACT_SHA256, platform: process.platform,
    planSha256: packageReceipt.planSha256, runtime: { node: rt.node, sharp: rt.versions }, rows: [] };
  fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
  try {
    for (const row of plan.references.filter((_, i) => i % 2 === shard)) {
      const match = /^\/images-([01])\/([^/]+)$/.exec(row.source); assert.ok(match);
      const source = packageReceipt.sourceRoots[Number(match[1])] + '/' + match[2];
      const bytes = fs.readFileSync(source); assert.equal(hash(bytes), row.sha256);
      let packed, localSource, binding;
      if (row.previous) {
        localSource = '.local/integration/vendor-scan-runtime-v28/regression2/features/' + row.id + '.gz';
        packed = fs.readFileSync(localSource); binding = row.previous;
        const restored = decode(cv, packed, binding); restored.dispose();
      } else {
        const value = await prepareGeometryImage(cv, bytes);
        try {
          packed = encode(value, row.sha256); binding = { imageSha256: row.sha256, artifactSha256: hash(packed) };
          const restored = decode(cv, packed, binding);
          try { assertFeaturesEqual(value, restored); } finally { restored.dispose(); }
        } finally { value.dispose(); }
        localSource = base + '/windows-generated/features/' + row.id + '.gz'; fs.writeFileSync(localSource, packed, { flag: 'wx' });
      }
      report.rows.push({ id: row.id, imageSha256: binding.imageSha256, artifactSha256: binding.artifactSha256, bytes: packed.length,
        localSource, reusedV28: !!row.previous });
      if (report.rows.length % 100 === 0) { fs.writeFileSync(output, JSON.stringify(report)); console.log(JSON.stringify({ shard, references: report.rows.length })); }
    }
    report.finishedAt = new Date().toISOString(); report.peakRss = process.resourceUsage().maxRSS * 1024;
  } catch (e) { report.error = String(e.message).slice(0, 500); throw e; }
  finally { fs.writeFileSync(output, JSON.stringify(report)); }
  console.log(JSON.stringify({ shard, complete: report.rows.length }));
}
main().catch(e => { console.error(String(e.message).slice(0, 1000)); process.exitCode = 1; });
