import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { runVisualProcessV24 } from '../../apps/web/src/lib/stores/scanVisualProcessV24.mjs';
import { visualReferenceMetadataV24 } from '../../apps/web/src/lib/stores/scanVisualCatalogV24.mjs';
const read = p => JSON.parse(fs.readFileSync(p)), hash = b => createHash('sha256').update(b).digest('hex');
const label = read('.local/integration/vendor-scan-visual-v16/labels.private.json').find(r => r.corpus === 'browser_heic');
const bytes = fs.readFileSync(label.path); assert.equal(hash(bytes), label.sha256);
const byId = visualReferenceMetadataV24(new URL('../../apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz', import.meta.url));
const images = new Map(read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images.map(r => [r.id, r]));
const worker = new URL('../../apps/web/src/lib/stores/scanVisualWorkerV25.mjs', import.meta.url);
const output = '.local/integration/vendor-scan-runtime-v25/lifecycle.private.json';
const report = { at: new Date().toISOString(), workerSha256: hash(fs.readFileSync(worker)), scope: 'Real local V25 worker with local image bytes; no external requests.', rows: [] };
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
for (const kind of ['abort', 'timeout', 'retry']) {
  const controller = new AbortController(), start = performance.now(), progress = [];
  let result, error, timer;
  if (kind === 'abort') timer = setTimeout(() => controller.abort(), 4000);
  try {
    result = await runVisualProcessV24(worker, bytes, { byId, signal: controller.signal, timeoutMs: kind === 'timeout' ? 4000 : 20000, onProgress: p => progress.push(p),
      loadReferences: async (ids, { signal }) => { signal.throwIfAborted(); return ids.map(id => ({ id, bytes: fs.readFileSync(images.get(id).source) })); } });
  } catch (e) { error = e.code || e.message; } finally { clearTimeout(timer); }
  const row = { kind, ms: Math.round(performance.now() - start), error, result, progress };
  report.rows.push(row); fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ kind, ms: row.ms, error, progress }));
  if (kind === 'retry') { assert.equal(error, undefined); assert.ok(result.candidates.length); assert.ok(result.references.every(r => label.expected.includes(r.gv_id))); }
  else { assert.equal(error, kind === 'abort' ? 'aborted' : 'timeout'); assert.ok(row.ms < 8000); }
}
assert.equal(hash(fs.readFileSync(worker)), report.workerSha256);
report.finishedAt = new Date().toISOString(); report.passed = true;
fs.writeFileSync(output, JSON.stringify(report, null, 2));
