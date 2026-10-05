// Offline only: never opens a network connection or writes ownership/catalog.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parseCsv} from '../../supabase/functions/vault-import-collection-v2/source.ts';
import {planCollectrSealedIdentities} from '../../supabase/functions/vault-import-collection-v2/sealed_identity.ts';

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('node --experimental-strip-types scripts/audits/collectr_sealed_identity_plan_v1.mjs --source-csv <original.csv> --catalog-json <snapshot.json> --review-preview <preview.json> --out-dir <private external folder>');
  process.exit(0);
}
const options = {};
for (let i = 0; i < args.length; i += 2) {
  const name = args[i];
  assert.ok(['--source-csv', '--catalog-json', '--review-preview', '--out-dir'].includes(name) && args[i + 1] && !options[name], 'Invalid or duplicate option');
  options[name] = args[i + 1];
}
assert.equal(Object.keys(options).length, 4, 'All four named options are required');
const root = fs.realpathSync(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.resolve(options['--out-dir']);
fs.mkdirSync(out, {recursive:true});
const relative = path.relative(root, fs.realpathSync(out));
assert.ok(relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative), 'Private evidence must stay outside the repository');
const bytes = Object.fromEntries(['--source-csv', '--catalog-json', '--review-preview'].map(k => [k, fs.readFileSync(options[k])]));
const source = parseCsv(bytes['--source-csv'].toString('utf8'));
const preview = JSON.parse(bytes['--review-preview']);
assert.equal(preview.sourceRows, source.length);
assert.ok(Array.isArray(preview.rows));
const seen = new Set(), review = [];
for (const row of preview.rows) {
  assert.ok(Array.isArray(row.sourceIndices) && row.sourceIndices.length > 0);
  assert.equal(row.sourceRecords.length, row.sourceIndices.length);
  row.sourceIndices.forEach((index, position) => {
    assert.ok(Number.isInteger(index) && index >= 0 && index < source.length && !seen.has(index));
    assert.deepEqual(row.sourceRecords[position], source[index]);
    seen.add(index);
    if (!row.selection) review.push(index);
  });
}
assert.equal(seen.size, source.length);
assert.equal(review.length, preview.reviewRows);
const catalog = JSON.parse(bytes['--catalog-json']);
const plan = planCollectrSealedIdentities(bytes['--source-csv'].toString('utf8'), catalog, review);
const hash = value => createHash('sha256').update(value).digest('hex');
const summary = {...plan, rows:undefined, at:new Date().toISOString(), productionWrites:0,
  sourceSha256:hash(bytes['--source-csv']), catalogSha256:hash(bytes['--catalog-json']), previewSha256:hash(bytes['--review-preview']),
  plannerSha256:hash(fs.readFileSync(new URL('../../supabase/functions/vault-import-collection-v2/sealed_identity.ts', import.meta.url))),
  releaseIds:catalog.releases.map(r => ({game:r.game, releaseId:r.releaseId})),
  limitation:'Exact identity evidence only. Quantity is from the source, not new or reconciled holdings. Saving requires atomic source retention, metadata validation, ownership permissions, and retry/readback integration.'};
for (const name of ['plan.private.json', 'summary.json']) assert.ok(!fs.existsSync(path.join(out, name)), 'Use a fresh output directory');
fs.writeFileSync(path.join(out, 'plan.private.json'), JSON.stringify(plan, null, 2), {flag:'wx'});
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2), {flag:'wx'});
console.log(JSON.stringify(summary));
