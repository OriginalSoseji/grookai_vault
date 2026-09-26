// Offline package with only pinned code, dependencies and reused scan fixtures.
// Reference images/features remain in read-only mounts; no credentials copied.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
const read = file => JSON.parse(fs.readFileSync(file)), base = '.local/integration/vendor-scan-runtime-v30', dest = base + '/linux-package';
assert.ok(!fs.existsSync(dest), 'Package is immutable; preserve previous evidence');
const proofPath = 'docs/audits/vendor_scan_runtime_v29/PROOF_20260924.json', proof = read(proofPath);
for (const [file, sha] of Object.entries(proof.sourceHashes)) assert.equal(hash(fs.readFileSync(file)), sha, file);
const manifestPath = '.local/integration/vendor-scan-runtime-v29/manifest.private.json';
assert.equal(hash(fs.readFileSync(manifestPath)), proof.receiptHashes['manifest.private.json']);
const manifest = read(manifestPath), imagesPath = '.local/integration/vendor-scan-release-20260924/image-plan.private.json';
const images = new Map(read(imagesPath).images.map(row => [row.id, row]));
const shortlistPath = '.local/integration/vendor-scan-visual-v16/shortlist.private.json', baselinePath = '.local/integration/vendor-scan-visual-v23/regression.private.json';
const parityPath = '.local/integration/vendor-scan-runtime-v25/shortlist-parity.private.json';
const holdout = process.env.USERPROFILE + '/.codex/tmp/vendor-real-scans-20260923/holdout-visual-v23';
const labelsPath = holdout + '/frozen-labels.private.json', holdoutPath = holdout + '/results.private.json';
const labels = read(shortlistPath), baseline = read(baselinePath), parity = read(parityPath), fresh = read(holdoutPath);
assert.ok(baseline.finishedAt && fresh.finishedAt && parity.finishedAt); assert.equal(parity.summary.same, 320);
for (const [name, sha] of Object.entries(baseline.sourceHashes)) assert.equal(hash(fs.readFileSync('apps/web/src/lib/stores/' + name)), sha);
const roots = [
  ['images-0', 'C:/grookai_vault/.tmp/scanner_v3_full_db_identity_index_v1/reference_cache'],
  ['images-1', '.local/integration/vendor-pilot-20260922/visual-reference-cache'],
  ['features-0', '.local/integration/vendor-scan-runtime-v28/regression2/features'],
  ['features-1', '.local/integration/vendor-scan-runtime-v29/windows-generated/features'],
].map(([name, source]) => ({ name, source: fs.realpathSync(source) }));
function mounted(file, prefix) {
  const actual = fs.realpathSync(file), root = roots.find(r => r.name.startsWith(prefix) && actual.toLowerCase().startsWith(r.source.toLowerCase() + path.sep));
  assert.ok(root, 'Reference path must remain under a dedicated input root');
  const relative = path.relative(root.source, actual).replaceAll('\\', '/'); assert.ok(!relative.includes('/') && !relative.includes('..'));
  return { linux: '/' + root.name + '/' + relative, windows: actual };
}
const references = manifest.references.map(row => {
  const source = images.get(row.id); assert.ok(source); assert.equal(source.sha256, row.imageSha256);
  const image = mounted(source.source, 'images-'), feature = mounted(row.localSource, 'features-');
  assert.equal(hash(fs.readFileSync(image.windows)), row.imageSha256);
  const bytes = fs.readFileSync(feature.windows); assert.equal(bytes.length, row.bytes); assert.equal(hash(bytes), row.artifactSha256);
  return { id: row.id, imageSha256: row.imageSha256, artifactSha256: row.artifactSha256, bytes: row.bytes,
    image: image.linux, feature: feature.linux, windowsImage: image.windows, windowsFeature: feature.windows };
});
assert.equal(references.length, 20079); assert.equal(new Set(references.map(r => r.id)).size, references.length);
fs.mkdirSync(dest, { recursive: true }); fs.mkdirSync(base + '/linux-output', { recursive: true });
const files = {};
function copy(source, relative, pin = true) {
  const target = path.join(dest, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target);
  const sha = hash(fs.readFileSync(target)); if (pin) files[relative] = sha; return sha;
}
function module(file) {
  file = file.replaceAll('\\', '/'); if (files[file]) return;
  assert.ok(file.startsWith('scripts/tests/') || file.startsWith('apps/web/src/lib/stores/'));
  copy(file, file);
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) module(path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1])));
}
module('scripts/tests/vendor_scan_qualify_v30.mjs');
const catalogPath = 'apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz';
assert.equal(copy(catalogPath, catalogPath), baseline.catalogSha256); assert.equal(baseline.catalogSha256, fresh.catalogSha256);
assert.equal(baseline.catalogSha256, parity.catalogSha256);
const scans = [];
function addScan(label, result, shortlist, source) {
  assert.ok(result && shortlist); assert.equal(shortlist.sha256, label.sha256);
  const key = label.corpus + ':' + label.file, file = 'fixtures/' + String(scans.length).padStart(3, '0') + path.extname(source);
  assert.equal(copy(source, file, false), label.sha256);
  scans.push({ key, file, sha256: label.sha256, baseline: result, shortlist });
}
for (const label of labels.rows) addScan(label, baseline.rows.find(r => r.corpus === label.corpus && r.file === label.file), parity.rows.find(r => r.corpus === label.corpus && r.file === label.file), label.path);
for (const label of read(labelsPath).labels) {
  assert.equal(hash(fs.readFileSync(holdout + '/originals/' + label.file)), label.originalSha256);
  addScan({ ...label, corpus: 'v23_reused12' }, fresh.rows.find(r => r.file === label.file), parity.rows.find(r => r.corpus === 'fresh_v23' && r.file === label.file), holdout + '/derived/' + label.file);
}
assert.equal(scans.length, 320); assert.equal(new Set(scans.map(r => r.key)).size, 320);
const lock = read('apps/web/package-lock.json'); fs.mkdirSync(dest + '/apps/web/node_modules', { recursive: true });
fs.writeFileSync(dest + '/apps/web/package.json', JSON.stringify({ private: true, type: 'module' }));
for (const name of ['sharp', '@techstark/opencv-js', '@img/colour', 'detect-libc', 'semver']) {
  const source = 'apps/web/node_modules/' + name; assert.equal(read(source + '/package.json').version, lock.packages['node_modules/' + name].version);
  fs.cpSync(source, dest + '/' + source, { recursive: true, errorOnExist: true, force: false });
}
const packages = [];
for (const name of ['@img/sharp-linux-x64', '@img/sharp-libvips-linux-x64']) {
  const entry = lock.packages['node_modules/' + name], tar = path.resolve('.local/integration/vendor-scan-runtime-v28', name.split('/')[1] + '.tgz');
  const bytes = fs.readFileSync(tar); assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), entry.integrity);
  const target = path.resolve(dest, 'apps/web/node_modules', name); fs.mkdirSync(target, { recursive: true });
  execFileSync('tar', ['-xf', tar, '--strip-components', '1', '-C', target], { stdio: 'pipe' }); assert.equal(read(target + '/package.json').version, entry.version);
  packages.push({ name, version: entry.version, integrity: entry.integrity, sha256: hash(bytes) });
}
const inputs = Object.fromEntries([proofPath, manifestPath, imagesPath, shortlistPath, baselinePath, parityPath, labelsPath, holdoutPath].map(file => [file, hash(fs.readFileSync(file))]));
const planPath = dest + '/qualification-plan.private.json';
fs.writeFileSync(planPath, JSON.stringify({ files, references, scans, catalogSha256: baseline.catalogSha256, inputs }), { flag: 'wx' });
const receipt = { at: new Date().toISOString(), planSha256: hash(fs.readFileSync(planPath)), files, inputs, packages, mounts: roots, references: references.length, scans: scans.length,
  network: 'none', secretsIncluded: false, linuxQualified: false, cachedDockerImage: 'sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5' };
fs.writeFileSync(base + '/package.private.json', JSON.stringify(receipt, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ references: references.length, scans: scans.length, planSha256: receipt.planSha256, linuxQualified: false }));
