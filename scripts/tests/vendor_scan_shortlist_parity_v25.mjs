import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { prepareVisualIndex, VISUAL_VERSION } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
import { shortlistVisualReferencesV25 } from '../../apps/web/src/lib/stores/scanShortlistV25.mjs';
import { shortlistVisualReferences } from '../../apps/web/src/lib/stores/scanShortlistV19.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(fs.readFileSync(path));
const previousPath = '.local/integration/vendor-scan-visual-v16/shortlist.private.json', previous = read(previousPath);
assert.ok(previous.finishedAt); assert.equal(previous.rows.length, 308);
const artifact = fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');
const catalog = JSON.parse(gunzipSync(artifact)), references = prepareVisualIndex({ version: VISUAL_VERSION, references: catalog });
const source = 'apps/web/src/lib/stores/scanShortlistV25.mjs', dir = '.local/integration/vendor-scan-runtime-v25';
fs.mkdirSync(dir, { recursive: true });
const report = { at: new Date().toISOString(), sourceSha256: hash(fs.readFileSync(source)), previousSha256: hash(fs.readFileSync(previousPath)), catalogSha256: hash(artifact), rows: [] };
const output = dir + '/shortlist-parity.private.json';
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
const cases = [...previous.rows];
const fresh = process.env.USERPROFILE + '/.codex/tmp/vendor-real-scans-20260923/holdout-visual-v23';
for (const row of read(fresh + '/frozen-labels.private.json').labels) {
  const file = fresh + '/derived/' + row.file, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256);
  let ids = [], error;
  try { ids = await shortlistVisualReferences(bytes, references, catalog); } catch (e) { error = e.message; }
  cases.push({ ...row, path: file, ids, error, corpus: 'fresh_v23' });
}
for (const row of cases) {
  const bytes = fs.readFileSync(row.path); assert.equal(hash(bytes), row.sha256);
  let ids = [], error; const start = performance.now();
  try { ids = await shortlistVisualReferencesV25(bytes, references); } catch (e) { error = e.message; }
  report.rows.push({ corpus: row.corpus, file: row.file, sha256: row.sha256, ids, error, same: JSON.stringify(ids) === JSON.stringify(row.ids) && error === row.error, ms: Math.round(performance.now() - start) });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  if (report.rows.length % 40 === 0) console.log(JSON.stringify({ processed: report.rows.length, differences: report.rows.filter(r => !r.same).length }));
}
assert.equal(hash(fs.readFileSync(source)), report.sourceSha256);
report.finishedAt = new Date().toISOString();
report.summary = { cases: report.rows.length, same: report.rows.filter(r => r.same).length, maxMs: Math.max(...report.rows.map(r => r.ms)), meanMs: Math.round(report.rows.reduce((s, r) => s + r.ms, 0) / report.rows.length) };
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary));
assert.equal(report.summary.same, 320);
