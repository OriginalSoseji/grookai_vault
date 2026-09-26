// Dedicated network-disabled Linux container only. Two disjoint shards.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { runtime, assertFeaturesEqual, read } from './vendor_scan_features_support_v28.mjs';
import { encodeReferenceFeaturesV28 as encode, decodeReferenceFeaturesV28 as decode, featureHashV28 as hash, FEATURE_CONTRACT_SHA256 } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { prepareGeometryImage } from '../../apps/web/src/lib/stores/scanGeometryV23.mjs';
async function main() {
  assert.equal(process.platform, 'linux'); const shard = Number(process.argv[2]); assert.ok([0, 1].includes(shard));
  const plan = read('generation-plan.json');
  for (const [p, sha] of Object.entries(plan.files)) assert.equal(hash(fs.readFileSync(p)), sha);
  const rt = await runtime(), { cv } = rt;
  const rows = plan.references.filter((_, i) => i % 2 === shard), output = '/output/shard-' + shard + '.json';
  assert.ok(!fs.existsSync(output)); fs.mkdirSync('/output/features', { recursive: true });
  const report = { at: new Date().toISOString(), shard, contractSha256: FEATURE_CONTRACT_SHA256,
    planSha256: hash(fs.readFileSync('generation-plan.json')), runtime: { node: rt.node, sharp: rt.versions }, rows: [] };
  fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
  try {
    for (const row of rows) {
      const bytes = fs.readFileSync(row.source); assert.equal(hash(bytes), row.sha256);
      const value = await prepareGeometryImage(cv, bytes); let windows;
      try {
        if (row.previous) {
          windows = decode(cv, fs.readFileSync('/windows-features/' + row.id + '.gz'), row.previous);
          assertFeaturesEqual(value, windows);
        }
        const packed = encode(value, row.sha256), binding = { imageSha256: row.sha256, artifactSha256: hash(packed) };
        const roundTrip = decode(cv, packed, binding);
        try { assertFeaturesEqual(value, roundTrip); } finally { roundTrip.dispose(); }
        fs.writeFileSync('/output/features/' + row.id + '.gz', packed, { flag: 'wx' });
        report.rows.push({ id: row.id, ...binding, bytes: packed.length, windowsParity: !!windows });
      } finally { windows?.dispose(); value.dispose(); }
      if (report.rows.length % 100 === 0) {
        fs.writeFileSync(output, JSON.stringify(report)); console.log(JSON.stringify({ shard, references: report.rows.length }));
      }
    }
    report.finishedAt = new Date().toISOString(); report.peakRss = process.resourceUsage().maxRSS * 1024;
  } catch (e) { report.error = String(e.message).slice(0, 500); throw e; }
  finally { fs.writeFileSync(output, JSON.stringify(report)); }
  console.log(JSON.stringify({ shard, complete: report.rows.length }));
}
main().catch(e => { console.error(String(e.message).slice(0, 1000)); process.exitCode = 1; });
