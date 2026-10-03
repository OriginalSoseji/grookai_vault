import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { sha256, qualifyClassicIdentities } from '../../backend/catalog/pokemon_classic_identity_evidence_v1.mjs';
import { qualifyClassicFinishes } from '../../backend/catalog/pokemon_classic_finish_evidence_v1.mjs';

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^--(identity-dir|evidence-dir|out-dir)=(.+)$/);
  assert.ok(m && !args.has(m[1]), 'unique_identity_evidence_output_arguments_required'); args.set(m[1], path.resolve(m[2]));
}
assert.equal(args.size, 3);
const identityDir = args.get('identity-dir'), evidenceDir = args.get('evidence-dir'), out = args.get('out-dir');
for (const input of [identityDir, evidenceDir, path.resolve('docs/audits/verified_master_set_index_v1/english_master_index_v1')]) {
  assert.ok(out !== input && !out.startsWith(input + path.sep), 'output_cannot_overwrite_input_or_active_master');
}
assert.ok(!fs.existsSync(out), 'immutable_output_directory_required');
const inputs = new Map();
function read(root, name) {
  assert.ok(!path.isAbsolute(name) && !name.split(/[\\/]/).includes('..'), 'relative_bundle_path_required');
  const file = path.join(root, name), bytes = fs.readFileSync(file); inputs.set(file, sha256(bytes)); return bytes;
}
function load() {
  const identityPackage = JSON.parse(read(identityDir, 'identity-package.json'));
  const namespace = JSON.parse(read(identityDir, 'namespace-snapshot.json'));
  const sources = identityPackage.sources.map(s => ({ ...s, bytes: gunzipSync(read(identityDir, 'source_snapshots/' + s.key + '.html.gz')) }));
  const identity = qualifyClassicIdentities({ sources, namespace });
  assert.deepEqual(identity, identityPackage, 'identity_source_replay_mismatch');
  const manifest = JSON.parse(read(evidenceDir, 'manifest.json'));
  const checklists = manifest.checklists.map(s => ({ ...s, bytes: gunzipSync(read(evidenceDir, s.file)) }));
  const photographs = manifest.photographs.map(s => ({ ...s, bytes: read(evidenceDir, s.file) }));
  const reviewBytes = read(evidenceDir, 'review.json'), review = JSON.parse(reviewBytes);
  return { identity, checklists, photographs, review, reviewBytes, manifest };
}
const input = load(), result = qualifyClassicFinishes(input);
// No network, database, active Master mutation or execution authority.
fs.mkdirSync(out); fs.mkdirSync(path.join(out, 'source_snapshots')); fs.mkdirSync(path.join(out, 'photographs')); fs.mkdirSync(path.join(out, 'source_fixtures'));
const outputs = [];
function saveBytes(file, bytes) {
  fs.writeFileSync(path.join(out, file), bytes, { flag: 'wx' }); outputs.push({ file, sha256: sha256(bytes) });
}
const save = (file, value) => saveBytes(file, JSON.stringify(value, null, 2) + '\n');
for (const s of [...input.manifest.checklists, ...input.manifest.photographs]) saveBytes(s.file, read(evidenceDir, s.file));
saveBytes('review.json', input.reviewBytes); save('manifest.json', input.manifest);
save('finish-package.json', result); save('source_fixtures/classic-finishes.json', { version: result.version, records: result.records });
save('locked-standard-deck-profiles.json', result.profiles); save('outside-scope-reviews.json', result.outside_scope_reviews);
for (const [file, expected] of inputs) assert.equal(sha256(fs.readFileSync(file)), expected, 'input_changed_during_qualification');
for (const row of outputs) assert.equal(sha256(fs.readFileSync(path.join(out, row.file))), row.sha256, 'output_readback_hash_mismatch');
// Re-read copied bytes, including the review and every original photograph.
const readbackManifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json')));
const readbackReview = fs.readFileSync(path.join(out, 'review.json'));
const readback = qualifyClassicFinishes({ identity: input.identity,
  checklists: readbackManifest.checklists.map(s => ({ ...s, bytes: gunzipSync(fs.readFileSync(path.join(out, s.file))) })),
  photographs: readbackManifest.photographs.map(s => ({ ...s, bytes: fs.readFileSync(path.join(out, s.file)) })),
  review: JSON.parse(readbackReview), reviewBytes: readbackReview });
assert.deepEqual(readback, result, 'independent_output_replay_mismatch');
save('complete.json', { version: result.version, at: new Date().toISOString(), status: result.status,
  standard_printings: result.qualified_standard_printings, source_records: result.records.length,
  outside_scope_review_count: result.outside_scope_reviews.length, whole_product_complete: false,
  production_writes: 0, active_master_changed: false, write_ready: false, fingerprint: result.fingerprint,
  independent_file_readback: 'passed', original_source_replay: 'passed', inputs: [...inputs].map(([file, sha256]) => ({ file, sha256 })), outputs });
console.log(JSON.stringify({ out, status: result.status, standard_printings: result.qualified_standard_printings, outside_scope_reviews: result.outside_scope_reviews.length, write_ready: false }));
