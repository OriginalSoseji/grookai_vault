import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');
const catalog = JSON.parse(gunzipSync(source)), bindings = new Map();
for (const row of catalog) {
  if (!bindings.has(row.sha256)) bindings.set(row.sha256, []);
  bindings.get(row.sha256).push({ id: row.id, gv_id: row.gv_id, name: row.name });
}
const duplicates = [...bindings.entries()].filter(([, rows]) => rows.length > 1);
const crossName = duplicates.filter(([, rows]) => new Set(rows.map(row => row.name.normalize('NFKC').split(' · ')[0].trim().toLowerCase())).size > 1);
const report = { at: new Date().toISOString(), catalogSha256: hash(source), references: catalog.length,
  scope: 'Read-only frozen-artifact image-binding review packet. Not a fresh database truth audit; no canonical rows or quarantine changed. Exact image SHA collisions only, not exhaustive semantic image qualification.',
  duplicateHashes: duplicates.length, duplicateReferenceRows: duplicates.reduce((sum, [, rows]) => sum + rows.length, 0),
  crossNameHashes: crossName.length, crossNameReferenceRows: crossName.reduce((sum, [, rows]) => sum + rows.length, 0),
  decision: 'The proposed matcher must abstain on every duplicate image binding. A governed catalog review must determine which mappings are valid; do not choose one by score or file order.',
  groups: crossName.map(([sha256, rows]) => ({ sha256, rows })) };
const dir = 'docs/audits/vendor_scan_visual_v19'; fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(dir + '/REFERENCE_IMAGE_COLLISIONS_20260924.json', JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ duplicateHashes: report.duplicateHashes, duplicateReferenceRows: report.duplicateReferenceRows,
  crossNameHashes: report.crossNameHashes, crossNameReferenceRows: report.crossNameReferenceRows }));
