import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { prepareVisualIndex, VISUAL_VERSION } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
import { shortlistVisualReferences } from '../../apps/web/src/lib/stores/scanShortlistV19.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(fs.readFileSync(path));
const originalPath = '.local/integration/vendor-scan-visual-v16/shortlist.private.json', original = read(originalPath);
assert.ok(original.finishedAt); assert.equal(original.rows.length, 308);
const artifact = fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');
const catalog = JSON.parse(gunzipSync(artifact)), references = prepareVisualIndex({ version: VISUAL_VERSION, references: catalog });
const sourcePath = 'apps/web/src/lib/stores/scanShortlistV19.mjs';
const output = '.local/integration/vendor-scan-visual-v19/shortlist-parity.private.json';
const report = { at: new Date().toISOString(), sourceSha256: hash(fs.readFileSync(sourcePath)),
  originalSha256: hash(fs.readFileSync(originalPath)), catalogSha256: hash(artifact), rows: [] };
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
for (const previous of original.rows) {
  const bytes = fs.readFileSync(previous.path); assert.equal(hash(bytes), previous.sha256);
  let ids = [], error; const started = performance.now();
  try { ids = await shortlistVisualReferences(bytes, references, catalog); } catch (caught) { error = caught.message; }
  report.rows.push({ corpus: previous.corpus, file: previous.file, ids, error,
    same: JSON.stringify(ids) === JSON.stringify(previous.ids) && error === previous.error,
    ms: Math.round(performance.now() - started) });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  if (report.rows.length % 40 === 0) console.log(JSON.stringify({ processed: report.rows.length, differences: report.rows.filter(row => !row.same).length }));
}
assert.equal(hash(fs.readFileSync(sourcePath)), report.sourceSha256);
report.finishedAt = new Date().toISOString();
report.summary = { files: report.rows.length, differences: report.rows.filter(row => !row.same).length };
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary));
assert.equal(report.summary.differences, 0);
