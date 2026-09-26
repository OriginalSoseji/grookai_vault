// New isolated package from already hash-verified V28 Linux dependencies.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
const read = p => JSON.parse(fs.readFileSync(p)), base = '.local/integration/vendor-scan-runtime-v29';
const target = base + '/generation-package'; assert.ok(!fs.existsSync(target));
fs.mkdirSync(target, { recursive: true }); fs.mkdirSync(base + '/generated', { recursive: true });
const proof = read('docs/audits/vendor_scan_runtime_v28/PROOF_20260924.json');
for (const [file, sha] of Object.entries(proof.sourceHashes)) assert.equal(hash(fs.readFileSync(file)), sha);
const manifestPath = '.local/integration/vendor-scan-runtime-v28/regression2/manifest.private.json';
assert.equal(hash(fs.readFileSync(manifestPath)), proof.receiptHashes['regression2/manifest.private.json']);
const previous = new Map(read(manifestPath).references.map(r => [r.id, r]));
fs.cpSync('.local/integration/vendor-scan-runtime-v28/linux-package/apps/web/node_modules', target + '/apps/web/node_modules', { recursive: true, errorOnExist: true, force: false });
fs.writeFileSync(target + '/apps/web/package.json', JSON.stringify({ private: true, type: 'module' }));
const files = {};
for (const file of ['vendor_scan_features_support_v28.mjs', 'vendor_scan_cache_generate_v29.mjs', 'vendor_storefront_network_guard.cjs'].map(n => 'scripts/tests/' + n)
  .concat(['scanGeometryV16', 'scanGeometryV19', 'scanGeometryV23', 'scanLocalAlignmentV21', 'scanFooterEdgesV22', 'scanRegionAlignmentV23', 'scanReferenceFeaturesV28'].map(n => 'apps/web/src/lib/stores/' + n + '.mjs'))) {
  fs.mkdirSync(path.dirname(target + '/' + file), { recursive: true }); fs.copyFileSync(file, target + '/' + file); files[file] = hash(fs.readFileSync(file));
}
const { loadReferenceMetadataV27 } = await import('../../apps/web/src/lib/stores/scanReferenceMetadataV27.mjs');
const metadata = loadReferenceMetadataV27(new URL('../../apps/web/src/lib/stores/scanExpandedMetadataV27.json.gz', import.meta.url));
const sourceRoots = ['C:/grookai_vault/.tmp/scanner_v3_full_db_identity_index_v1/reference_cache', 'C:/gv_store_billing_20260919/.local/integration/vendor-pilot-20260922/visual-reference-cache'];
const images = read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images;
assert.equal(images.length, 20079); assert.equal(metadata.size, images.length);
const references = images.map(row => {
  assert.match(row.id, /^[0-9a-f-]{36}$/); assert.equal(row.sha256, metadata.get(row.id)?.sha256);
  const normalized = row.source.replaceAll('\\', '/'), rootIndex = sourceRoots.findIndex(root => normalized.startsWith(root + '/'));
  assert.ok(rootIndex >= 0); const filename = normalized.slice(sourceRoots[rootIndex].length + 1); assert.ok(filename && !filename.includes('/') && !filename.includes('..'));
  return { id: row.id, sha256: row.sha256, source: '/images-' + rootIndex + '/' + filename, previous: previous.get(row.id) };
}).sort((a, b) => Number(!!b.previous) - Number(!!a.previous) || a.id.localeCompare(b.id));
assert.equal(new Set(references.map(r => r.id)).size, metadata.size);
fs.writeFileSync(target + '/generation-plan.json', JSON.stringify({ files, references }));
fs.writeFileSync(base + '/generation-package.private.json', JSON.stringify({ at: new Date().toISOString(), sourceRoots, references: references.length,
  windowsReferences: previous.size, files, planSha256: hash(fs.readFileSync(target + '/generation-plan.json')) }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ references: references.length, windowsReferences: previous.size }));
