// One-use preparation of a minimal Linux proof directory. Only two exact,
// lockfile-bound npm tarballs are fetched; no app credentials are read/copied.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const base = '.local/integration/vendor-scan-runtime-v28', dest = base + '/linux-package';
assert.ok(!fs.existsSync(dest), 'Linux package already exists');
fs.mkdirSync(dest, { recursive: true }); fs.mkdirSync(base + '/linux-output', { recursive: true });
const files = {}, hash = b => createHash('sha256').update(b).digest('hex');
function copy(source, relative) {
  const target = path.join(dest, relative); fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target); files[relative] = hash(fs.readFileSync(target));
}
for (const name of ['scanReferenceFeaturesV28', 'scanGeometryV16', 'scanGeometryV19', 'scanGeometryV23', 'scanLocalAlignmentV21', 'scanFooterEdgesV22', 'scanRegionAlignmentV23']) {
  const relative = 'apps/web/src/lib/stores/' + name + '.mjs'; copy(relative, relative);
}
for (const name of ['vendor_scan_features_support_v28.mjs', 'vendor_scan_features_linux_v28.mjs', 'vendor_storefront_network_guard.cjs']) {
  const relative = 'scripts/tests/' + name; copy(relative, relative);
}
const read = p => JSON.parse(fs.readFileSync(p)), lock = read('apps/web/package-lock.json');
fs.mkdirSync(dest + '/apps/web/node_modules', { recursive: true });
fs.writeFileSync(dest + '/apps/web/package.json', JSON.stringify({ private: true, type: 'module' }));
for (const name of ['sharp', '@techstark/opencv-js', '@img/colour', 'detect-libc', 'semver']) {
  const source = 'apps/web/node_modules/' + name, target = dest + '/' + source;
  assert.equal(read(source + '/package.json').version, lock.packages['node_modules/' + name].version);
  fs.cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
}
const packages = [];
for (const name of ['@img/sharp-linux-x64', '@img/sharp-libvips-linux-x64']) {
  const entry = lock.packages['node_modules/' + name];
  assert.equal(new URL(entry.resolved).hostname, 'registry.npmjs.org');
  const response = await fetch(entry.resolved, { redirect: 'error', signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200); const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length < 30000000); assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), entry.integrity);
  const tar = path.resolve(base, name.split('/')[1] + '.tgz'); fs.writeFileSync(tar, bytes, { flag: 'wx' });
  const target = path.resolve(dest, 'apps/web/node_modules', name); fs.mkdirSync(target, { recursive: true });
  execFileSync('tar', ['-xf', tar, '--strip-components', '1', '-C', target], { stdio: 'pipe' });
  assert.equal(read(target + '/package.json').version, entry.version);
  packages.push({ name, version: entry.version, integrity: entry.integrity, sha256: hash(bytes) });
}
// Fixtures must be produced only after the full Windows proof succeeds.
const regression = read(base + '/regression2/regression.private.json'); assert.ok(regression.finishedAt);
const manifest = read(base + '/regression2/manifest.private.json');
const label = read('.local/integration/vendor-scan-visual-v16/shortlist.private.json').rows.find(r => r.corpus === 'v2_100' && r.file === 'holdout-0041.heic');
const baseline = read('.local/integration/vendor-scan-visual-v23/regression.private.json').rows.find(r => r.corpus === label.corpus && r.file === label.file);
const images = new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(r => [r.id, r]));
copy(label.path, 'fixtures/scan'); assert.equal(files['fixtures/scan'], label.sha256);
const references = label.ids.map(id => {
  const meta = manifest.references.find(r => r.id === id); assert.ok(meta);
  copy(images.get(id).source, 'fixtures/' + id + '.image'); assert.equal(files['fixtures/' + id + '.image'], meta.imageSha256);
  copy(base + '/regression2/features/' + id + '.gz', 'fixtures/' + id + '.gz'); assert.equal(files['fixtures/' + id + '.gz'], meta.artifactSha256);
  const windowsResult = baseline.geometryCandidates.find(r => r.id === id);
  if (windowsResult) { const { id: _id, gv_id: _gv, ...result } = windowsResult; return { ...meta, windowsResult: result }; }
  return { ...meta, windowsResult: null };
});
fs.writeFileSync(dest + '/fixtures/manifest.json', JSON.stringify({ files, references }, null, 2));
fs.writeFileSync(base + '/linux-package.private.json', JSON.stringify({ at: new Date().toISOString(), packages, files, references: references.length }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ package: dest, references: references.length, lockedPackages: packages.length }));
