// Previously evaluated scans only. No independent holdout or online writes.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prepareVisualIndex, VISUAL_VERSION } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
import { matchScanV15 } from '../../apps/web/src/lib/stores/scanMatchV15.mjs';
import {loadCatalogV8} from './vendor_scan_catalog_v8.mjs';
const enriched=loadCatalogV8();
const root = process.cwd(), base = path.join(process.env.USERPROFILE, '.codex/tmp/vendor-real-scans-20260923');
const read = file => JSON.parse(fs.readFileSync(file));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = path.join(root, 'apps/web/src/lib/stores/scanMatchV15.mjs');
const raw = fs.readFileSync(path.join(root, '.local/integration/vendor-scan-expansion-v3/local-build-2026-09-23T22-52-10-191Z.jsonl'));
assert.equal(hash(raw), '709045ad12c75924b08bf4a40a846e578cec4f3fb0262c4c841640e899c926aa');
const catalog = enriched.catalog;
const byId = new Map(catalog.map(c => [c.id, c]));
const references = prepareVisualIndex({ version: VISUAL_VERSION, references: catalog });
const prior100 = read(path.join(root, '.local/integration/vendor-scan-expansion-v3/frozen-evaluation-v3.private.json')).labels;
const correction = { file: 'holdout-0062.heic', before: ['GV-PK-RCL-61'], after: ['GV-PK-SHF-32'], reason: 'Full-size Luxio 032/072 readback documented in V5; prior frozen labels retained.' };
assert.deepEqual(prior100.find(r => r.file === correction.file).expectedGvIds, correction.before);
prior100.find(r => r.file === correction.file).expectedGvIds = correction.after;
const rows = prior100.map(r => ({ ...r, corpus: 'v2_100', bytesPath: path.join(base, 'holdout-v2/derived', r.file + '.jpg'), derivativeHash: null }));
for (const version of ['v4', 'v5', 'v6', 'v7', 'v9', 'v10', 'v11']) {
  const labels = read(path.join(base, 'holdout-' + version, 'frozen-labels.private.json')).labels.filter(r => !r.previouslySeen);
  if(version==='v6'){const row=labels.find(r=>r.file==='fresh-0029.jpg');assert.deepEqual(row.expectedGvIds,['GV-PK-LOR-059']);row.expectedGvIds=['GV-PK-LOR-054'];}
  if(version==='v7'){const row=labels.find(r=>r.file==='fresh-0020.jpg');assert.deepEqual(row.expectedGvIds,['GV-PK-BST-4']);row.expectedGvIds=['GV-PK-SHF-4'];}
  rows.push(...labels.map(r => ({ ...r, corpus: version, bytesPath: path.join(base, 'holdout-' + version, 'derived', r.file), derivativeHash: r.sha256 })));
}
rows.push(...read(path.join(base,'gallery-v12/frozen-labels.private.json')).labels.map(r=>({...r,corpus:'gallery_v12',bytesPath:path.join(base,'gallery-v12/derived',r.file),derivativeHash:r.sha256})));
assert.equal(rows.length,305);
const dependencies=Object.fromEntries(['scanMatchV13.mjs','scanOutlineV13.mjs','scanMatchV12.mjs','scanStructureV12.mjs','scanMatchV11.mjs','scanNumberRegionsV11.mjs','scanOcrEvidenceV10.mjs','scanPrintedIdentityV8.mjs','scanPrintedIdentityV9.mjs','scanMatchV7.mjs','scanMatchV6.mjs','scanMatchV5.mjs','visualMatchCore.mjs'].map(file=>[file,hash(fs.readFileSync('apps/web/src/lib/stores/'+file))]));
const report = { dependencies, at: new Date().toISOString(), matcherSha256: hash(fs.readFileSync(source)), indexSha256: hash(raw), metadataSha256: enriched.metadataSha256, coverage: enriched.coverage, scope: '305 previously evaluated development files', labelCorrections: [{corpus:'v7',file:'fresh-0020.jpg',before:['GV-PK-BST-4'],after:['GV-PK-SHF-4'],reason:'Previously documented Cacnea004/072 readback; old frozen labels retained.'},correction,{corpus:'v6',file:'fresh-0029.jpg',before:['GV-PK-LOR-059'],after:['GV-PK-LOR-054'],reason:'Full-size visible Electrike054/196; old59 label is Tynamo; source labels/results retained.'}], rows: [] };
const output = path.join(root, '.local/integration/vendor-scan-expansion-v15/regression-' + report.at.replaceAll(/[:.]/g, '-') + '.private.json');
for (const label of rows) {
  const bytes = fs.readFileSync(label.bytesPath);
  if (label.derivativeHash) assert.equal(hash(bytes), label.derivativeHash);
  else assert.equal(hash(fs.readFileSync(path.join(base, 'holdout-v2/files', label.file))), label.sha256);
  const start = performance.now(); let result;
  try { result = await matchScanV15(bytes, references, catalog); }
  catch (error) { result = { status: 'error', error: error.message, candidates: [] }; }
  const candidates = result.candidates.map(c => ({ ...c, gv_id: byId.get(c.id)?.gv_id }));
  report.rows.push({ corpus: label.corpus, file: label.file, expected: label.expectedGvIds, status: result.status, reader: result.reader, error: result.error, candidates,
    correct: candidates.length > 0 && candidates.every(c => label.expectedGvIds.includes(c.gv_id) && (label.expectedRotation===undefined || c.rotation===label.expectedRotation)),
    wrong: candidates.some(c => !label.expectedGvIds.includes(c.gv_id)), ms: Math.round(performance.now() - start) });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  if (report.rows.length % 10 === 0) console.log(JSON.stringify({ processed: report.rows.length, correct: report.rows.filter(r => r.correct).length, wrong: report.rows.filter(r => r.wrong).length }));
}
assert.equal(hash(fs.readFileSync(source)), report.matcherSha256, 'Candidate changed during evaluation');
report.finishedAt = new Date().toISOString();
report.summary = { scans: report.rows.length, supported: report.rows.filter(r => r.expected.length).length,
  correct: report.rows.filter(r => r.correct).length, wrong: report.rows.filter(r => r.wrong).length,
  abstained: report.rows.filter(r => !r.candidates.length).length };
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, ...report.summary }));




