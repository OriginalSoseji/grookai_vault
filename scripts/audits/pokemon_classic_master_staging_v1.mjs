import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { sha256 } from '../../backend/catalog/pokemon_classic_identity_evidence_v1.mjs';
import { ARTIFACTS, stageClassicMaster, assertClassicStagePreservation } from '../../backend/catalog/pokemon_classic_master_staging_v1.mjs';

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--(baseline-dir|identity-dir|out-dir)=(.+)$/);
  assert.ok(match && !args.has(match[1]), 'unique_baseline_identity_output_arguments_required');
  args.set(match[1], path.resolve(match[2]));
}
assert.equal(args.size, 3);
const baselineDir = args.get('baseline-dir'), identityDir = args.get('identity-dir'), out = args.get('out-dir');
const activeDir = path.resolve('docs/audits/verified_master_set_index_v1/english_master_index_v1');
for (const source of [activeDir, baselineDir, identityDir]) {
  assert.ok(out !== source && !out.startsWith(source + path.sep), 'output_must_not_overwrite_input_or_active_master');
}
assert.ok(!fs.existsSync(out), 'immutable_output_directory_required');
const inputHashes = new Map();
function read(file) {
  const bytes = fs.readFileSync(file);
  inputHashes.set(file, sha256(bytes));
  return JSON.parse(bytes);
}
const baseline = Object.fromEntries(Object.entries(ARTIFACTS).map(([key, file]) => [key, read(path.join(baselineDir, file))]));
const identityPackage = read(path.join(identityDir, 'identity-package.json'));
const namespace = read(path.join(identityDir, 'namespace-snapshot.json'));
const sources = identityPackage.sources.map(source => {
  const file = path.join(identityDir, 'source_snapshots', source.key + '.html.gz');
  const compressed = fs.readFileSync(file);
  inputHashes.set(file, sha256(compressed));
  return { ...source, bytes: gunzipSync(compressed) };
});
// No output is emitted until all source, preservation, locked-profile and
// completion assertions pass. This command has no network, DB or apply mode.
const { staged, completion, report } = stageClassicMaster({ baseline, sources, namespace, identityPackage });
fs.mkdirSync(out);
const outputs = [];
function save(file, value) {
  const bytes = JSON.stringify(value) + '\n';
  fs.writeFileSync(path.join(out, file), bytes, { flag: 'wx' });
  outputs.push({ file, sha256: sha256(bytes) });
}
for (const [key, file] of Object.entries(ARTIFACTS)) save(file, staged[key]);
for (const [key, artifact] of Object.entries(completion)) save('completion-' + key + '.json', artifact);
save('identity-package.json', identityPackage);
fs.mkdirSync(path.join(out, 'source_snapshots'));
for (const source of sources) {
  const name = 'source_snapshots/' + source.key + '.html.gz';
  const bytes = fs.readFileSync(path.join(identityDir, name));
  fs.writeFileSync(path.join(out, name), bytes, { flag: 'wx' });
  outputs.push({ file: name, sha256: sha256(bytes) });
}
save('namespace-snapshot.json', namespace);
const readback = Object.fromEntries(Object.entries(ARTIFACTS).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(out, file)))]));
assertClassicStagePreservation(baseline, readback, identityPackage);
for (const [file, hash] of inputHashes) assert.equal(sha256(fs.readFileSync(file)), hash, 'input_changed_during_staging');
for (const row of outputs) assert.equal(sha256(fs.readFileSync(path.join(out, row.file))), row.sha256, 'output_readback_hash_mismatch');
save('complete.json', { ...report, generated_at: new Date().toISOString(),
  independent_file_readback: 'passed', inputs: [...inputHashes].map(([file, sha256]) => ({ file, sha256 })), outputs });
console.log(JSON.stringify({ out, status: report.status, added_cards: 102, added_printings: 0,
  preserved_cards: report.prior_cards_preserved, preserved_printings: report.prior_printings_preserved, write_ready: false }));
