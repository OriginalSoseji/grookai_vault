import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { sha256 } from '../../backend/catalog/pokemon_classic_identity_evidence_v1.mjs';
import { ARTIFACTS } from '../../backend/catalog/pokemon_classic_master_staging_v1.mjs';
import { stageClassicFinishes, assertClassicFinishPreservation } from '../../backend/catalog/pokemon_classic_finish_staging_v1.mjs';

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^--(baseline-dir|identity-dir|finish-dir|out-dir)=(.+)$/);
  assert.ok(m && !args.has(m[1]), 'unique_baseline_identity_finish_output_arguments_required');
  args.set(m[1], path.resolve(m[2]));
}
assert.equal(args.size, 4);
const out = args.get('out-dir'), baselineDir = args.get('baseline-dir'), identityDir = args.get('identity-dir'), finishDir = args.get('finish-dir');
for (const source of [baselineDir, identityDir, finishDir, path.resolve('docs/audits/verified_master_set_index_v1/english_master_index_v1')]) {
  assert.ok(out !== source && !out.startsWith(source + path.sep), 'output_cannot_overwrite_inputs_or_active_master');
}
assert.ok(!fs.existsSync(out), 'immutable_output_directory_required');
const inputs = new Map(), outputs = [];
function read(root, name) {
  assert.ok(!path.isAbsolute(name) && !name.split(/[\\/]/).includes('..'), 'relative_bundle_path_required');
  const file = path.join(root, name), bytes = fs.readFileSync(file); inputs.set(file, sha256(bytes)); return bytes;
}
const json = (root, name) => JSON.parse(read(root, name));
const baseline = Object.fromEntries(Object.entries(ARTIFACTS).map(([key, name]) => [key, json(baselineDir, name)]));
const identityPackage = json(identityDir, 'identity-package.json'), namespace = json(identityDir, 'namespace-snapshot.json');
const sources = identityPackage.sources.map(s => ({ ...s, bytes: gunzipSync(read(identityDir, 'source_snapshots/' + s.key + '.html.gz')) }));
const manifest = json(finishDir, 'manifest.json'), reviewBytes = read(finishDir, 'review.json');
const finishEvidence = { reviewBytes, review: JSON.parse(reviewBytes),
  checklists: manifest.checklists.map(s => ({ ...s, bytes: gunzipSync(read(finishDir, s.file)) })),
  photographs: manifest.photographs.map(s => ({ ...s, bytes: read(finishDir, s.file) })) };
const finishPackage = json(finishDir, 'finish-package.json');
const input = { baseline, sources, namespace, identityPackage, finishEvidence, finishPackage };
const { staged, completion, report } = stageClassicFinishes(input);
// Offline staging only. All evidence/profile assertions precede output creation.
fs.mkdirSync(out);
function saveBytes(name, bytes) {
  fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
  fs.writeFileSync(path.join(out, name), bytes, { flag: 'wx' }); outputs.push({ file: name, sha256: sha256(bytes) });
}
const save = (name, value) => saveBytes(name, JSON.stringify(value) + '\n');
for (const [key, name] of Object.entries(ARTIFACTS)) save(name, staged[key]);
for (const [key, value] of Object.entries(completion)) save('completion-' + key + '.json', value);
save('identity-package.json', identityPackage); save('namespace-snapshot.json', namespace);
for (const s of sources) saveBytes('source_snapshots/' + s.key + '.html.gz', read(identityDir, 'source_snapshots/' + s.key + '.html.gz'));
save('manifest.json', manifest); save('finish-package.json', finishPackage); saveBytes('review.json', reviewBytes);
for (const s of [...manifest.checklists, ...manifest.photographs]) saveBytes(s.file, read(finishDir, s.file));
save('locked-standard-deck-profiles.json', finishPackage.profiles); save('outside-scope-reviews.json', finishPackage.outside_scope_reviews);
const readback = Object.fromEntries(Object.entries(ARTIFACTS).map(([key, name]) => [key, json(out, name)]));
assertClassicFinishPreservation(baseline, readback, identityPackage, finishPackage);
const copiedIdentity = json(out, 'identity-package.json');
const copiedManifest = json(out, 'manifest.json'), copiedReview = read(out, 'review.json');
const replay = stageClassicFinishes({ baseline, identityPackage: copiedIdentity,
  namespace: json(out, 'namespace-snapshot.json'),
  sources: copiedIdentity.sources.map(s => ({ ...s, bytes: gunzipSync(read(out, 'source_snapshots/' + s.key + '.html.gz')) })),
  finishPackage: json(out, 'finish-package.json'), finishEvidence: {
    reviewBytes: copiedReview, review: JSON.parse(copiedReview),
    checklists: copiedManifest.checklists.map(s => ({ ...s, bytes: gunzipSync(read(out, s.file)) })),
    photographs: copiedManifest.photographs.map(s => ({ ...s, bytes: read(out, s.file) })) } });
assert.deepEqual(replay.staged, readback, 'independent_copied_source_replay_mismatch');
// Master evidence references must resolve at the emitted artifact root, not
// merely inside a separately replayable nested bundle.
for (const row of [...identityPackage.records, ...finishPackage.records]) {
  const match = row.raw_snapshot_ref.match(/^([^#]+)#sha256=([a-f0-9]{64})$/);
  assert.ok(match, 'hash_bound_raw_snapshot_reference_required');
  const bytes = read(out, match[1]);
  assert.equal(sha256(match[1].endsWith('.gz') ? gunzipSync(bytes) : bytes), match[2], 'master_evidence_reference_readback_mismatch');
}
for (const [file, hash] of inputs) assert.equal(sha256(fs.readFileSync(file)), hash, 'input_drift');
for (const row of outputs) assert.equal(sha256(fs.readFileSync(path.join(out, row.file))), row.sha256, 'output_drift');
save('complete.json', { ...report, at: new Date().toISOString(), independent_file_readback: 'passed', copied_source_replay: 'passed', master_evidence_reference_readback: 'passed',
  inputs: [...inputs].filter(([f]) => !f.startsWith(out + path.sep)).map(([file, sha256]) => ({ file, sha256 })), outputs });
console.log(JSON.stringify({ out, status: report.status, added_cards: 102, added_printings: 102, whole_product_complete: false, write_ready: false }));
