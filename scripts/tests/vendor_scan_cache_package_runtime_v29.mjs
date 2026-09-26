// Windows dependency/trace-pattern packaging proof outside the app tree.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { scanRuntimePackageDirectories } from '../../apps/web/src/lib/stores/scanRuntimeFiles.mjs';
import { loadReferenceMetadataV27 } from '../../apps/web/src/lib/stores/scanReferenceMetadataV27.mjs';
import { loadFeatureManifestV29 } from '../../apps/web/src/lib/stores/scanFeatureManifestV29.mjs';
import { featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { runVisualProcessV24 } from '../../apps/web/src/lib/stores/scanVisualProcessV24.mjs';
const read = p => JSON.parse(fs.readFileSync(p)), base = '.local/integration/vendor-scan-runtime-v29';
const output = base + '/package-runtime.private.json', dest = path.resolve(base, 'worker-package');
assert.ok(!fs.existsSync(dest) && !fs.existsSync(output)); fs.mkdirSync(dest, { recursive: true });
const web = path.resolve('apps/web'), packages = scanRuntimePackageDirectories(web);
for (const source of packages.filter(p => !packages.some(parent => p.startsWith(parent + path.sep)))) {
  const relative = path.relative(web, source); assert.ok(!relative.startsWith('..'));
  fs.cpSync(source, path.join(dest, relative), { recursive: true, errorOnExist: true, force: false });
}
const target = path.join(dest, 'src/lib/stores'); fs.mkdirSync(target, { recursive: true }); const sources = {};
for (const name of fs.readdirSync('apps/web/src/lib/stores').filter(n => /^scan.*\.mjs$/.test(n) || /^scanExpanded.*\.json(?:\.gz)?$/.test(n) || ['visualMatchCore.mjs','visualMatchIndex.json','visualMatchCatalog.json'].includes(n))) {
  const source = 'apps/web/src/lib/stores/' + name; fs.copyFileSync(source, path.join(target, name)); sources[name] = hash(fs.readFileSync(source));
}
const byId = loadReferenceMetadataV27(path.join(target, 'scanExpandedMetadataV27.json.gz'));
const featureManifest = loadFeatureManifestV29(path.join(target, 'scanExpandedFeaturesV29.json.gz'), byId);
const locations = new Map(read(base + '/manifest.private.json').references.map(r => [r.id, r]));
const labels = read('.local/integration/vendor-scan-visual-v16/labels.private.json').filter(r => ['browser_heic','legacy'].includes(r.corpus)); assert.equal(labels.length, 3);
const report = { at: new Date().toISOString(), scope: 'Three reused scans through standalone Windows worker package; not Linux or Vercel build proof.', sources, packages: packages.map(p => path.relative(web, p)), rows: [] };
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
for (const label of labels) {
  const bytes = fs.readFileSync(label.path); assert.equal(hash(bytes), label.sha256);
  const result = await runVisualProcessV24(path.join(target, 'scanVisualWorkerV29.mjs'), bytes, { byId, featureManifest, timeoutMs: 30000,
    loadReferences: async (ids, { signal }) => { signal.throwIfAborted(); return ids.map(id => ({ id, bytes: fs.readFileSync(locations.get(id).localSource) })); } });
  assert.equal(result.candidates.length, 1); assert.ok(label.expected.includes(result.references[0].gv_id));
  assert.equal(result.candidates[0].rotation, label.corpus === 'legacy' ? 180 : 0); report.rows.push({ file: label.file, correct: true, result });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
}
for (const [name, sha] of Object.entries(sources)) assert.equal(hash(fs.readFileSync(path.join(target, name))), sha);
report.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ packagedCases: 3, correct: 3 }));
