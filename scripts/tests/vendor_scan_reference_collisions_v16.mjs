// Read-only diagnosis of reference ambiguity. Not a serving index or release gate.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { prepareVisualIndex, VISUAL_VERSION } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
import { evidenceVisualScores } from '../../apps/web/src/lib/stores/scanMatchV11.mjs';
const catalogBytes = fs.readFileSync('apps/web/src/lib/stores/scanExpandedCatalogV13.json.gz');
const catalog = JSON.parse(gunzipSync(catalogBytes));
const references = prepareVisualIndex({ version: VISUAL_VERSION, references: catalog });
const result = JSON.parse(fs.readFileSync('.local/integration/vendor-scan-visual-v16/geometry-js-regression.private.json'));
const ids = [...new Set(result.rows.flatMap(row => row.candidates.map(candidate => candidate.id)))];
const rows = [];
for (const id of ids) {
  const reference = references.find(row => row.id === id);
  const peers = references.filter(row => row.name.normalize('NFKC').toLowerCase() === reference.name.normalize('NFKC').toLowerCase());
  const neighbors = evidenceVisualScores(reference.descriptor, peers).filter(row => row.id !== id)
    .sort((a, b) => a.artDistance - b.artDistance).slice(0, 5)
    .map(row => ({ gv_id: catalog.find(c => c.id === row.id).gv_id, ...row }));
  rows.push({ id, gv_id: reference.gv_id, name: reference.name, neighbors });
}
const report = { at: new Date().toISOString(), scope: 'Same-name reference diagnostics for V16 accepted candidates only. Not exhaustive across catalog names.',
  catalogSha256: createHash('sha256').update(catalogBytes).digest('hex'), rows };
fs.writeFileSync('.local/integration/vendor-scan-visual-v16/reference-collisions.private.json', JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ diagnosed: rows.length, failures: result.rows.filter(row => row.wrong).map(row => ({ file: row.corpus + '/' + row.file,
  references: row.candidates.map(candidate => rows.find(r => r.id === candidate.id)) })) }));
