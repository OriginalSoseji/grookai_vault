import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ARTIFACTS } from '../../backend/catalog/pokemon_classic_master_staging_v1.mjs';
import { stageClassicFinishes, assertClassicFinishPreservation } from '../../backend/catalog/pokemon_classic_finish_staging_v1.mjs';
import { sha256 } from '../../backend/catalog/pokemon_classic_identity_evidence_v1.mjs';

// Offline, source-only integration. There is no database client or release action.
const args = new Map();
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--(candidate-dir|out-dir)=(.+)$/);
  assert.ok(match && !args.has(match[1]), 'unique_candidate_and_output_required');
  args.set(match[1], path.resolve(match[2]));
}
assert.equal(args.size, 2);
const root = fileURLToPath(new URL('../../', import.meta.url));
const active = path.join(root, 'docs/audits/verified_master_set_index_v1/english_master_index_v1');
const candidate = args.get('candidate-dir'), out = args.get('out-dir');
assert.ok(!fs.existsSync(out), 'immutable_output_required');
assert.ok(!out.startsWith(active + path.sep) && out !== active && candidate !== active);
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
assert.equal(git('branch', '--show-current'), 'pokemon-relationship-repair-20261002/work');
assert.equal(fs.realpathSync(active), active, 'active_master_symlink_forbidden');
const inputs = new Map();
const safe = (dir, name) => {
  assert.ok(!path.isAbsolute(name) && !name.split(/[\\/]/).includes('..'));
  const file = path.join(dir, name);
  for (let part = file; part !== dir; part = path.dirname(part)) if (fs.existsSync(part)) assert.ok(!fs.lstatSync(part).isSymbolicLink(), 'symlink_forbidden');
  return file;
};
const bytes = (dir, name) => { const file = safe(dir, name), data = fs.readFileSync(file); inputs.set(file, sha256(data)); return data; };
const json = (dir, name) => JSON.parse(bytes(dir, name));
const baseline = Object.fromEntries(Object.entries(ARTIFACTS).map(([key, name]) => [key, json(active, name)]));
const identityPackage = json(candidate, 'identity-package.json'), finishPackage = json(candidate, 'finish-package.json');
const namespace = json(candidate, 'namespace-snapshot.json'), manifest = json(candidate, 'manifest.json');
const reviewBytes = bytes(candidate, 'review.json');
const sourceFiles = [...identityPackage.sources.map(s => `source_snapshots/${s.key}.html.gz`), ...manifest.checklists.map(s => s.file), ...manifest.photographs.map(s => s.file)];
assert.equal(new Set(sourceFiles).size, 109);
const evidence = new Map(sourceFiles.map(file => [file, bytes(candidate, file)]));
const sources = identityPackage.sources.map(s => ({ ...s, bytes: gunzipSync(evidence.get(`source_snapshots/${s.key}.html.gz`)) }));
const finishEvidence = { reviewBytes, review: JSON.parse(reviewBytes),
  checklists: manifest.checklists.map(s => ({ ...s, bytes: gunzipSync(evidence.get(s.file)) })),
  photographs: manifest.photographs.map(s => ({ ...s, bytes: evidence.get(s.file) })) };
const { staged, report } = stageClassicFinishes({ baseline, identityPackage, finishPackage, namespace, sources, finishEvidence });
for (const [key, name] of Object.entries(ARTIFACTS)) assert.deepEqual(json(candidate, name), staged[key], `candidate_current_baseline_mismatch:${name}`);
assertClassicFinishPreservation(baseline, staged, identityPackage, finishPackage);
for (const fact of [...identityPackage.records, ...finishPackage.records]) {
  const [, ref, expected] = fact.raw_snapshot_ref.match(/^([^#]+)#sha256=([a-f0-9]{64})$/) ?? [];
  assert.ok(evidence.has(ref)); const raw = evidence.get(ref);
  assert.equal(sha256(ref.endsWith('.gz') ? gunzipSync(raw) : raw), expected);
}
// Preserve exact serialized bytes of unchanged/protected artifacts. Only five
// base artifacts gain content; the independent completion builder runs later.
const writes = [];
for (const [key, name] of Object.entries(ARTIFACTS)) {
  if (JSON.stringify(baseline[key]) === JSON.stringify(staged[key])) continue;
  const original = fs.readFileSync(path.join(active, name), 'utf8');
  const indent = original.match(/^[{\[]\r?\n([ \t]+)\S/)?.[1];
  const newline = original.endsWith('\r\n') ? '\r\n' : '\n';
  const serialized = JSON.stringify(staged[key], null, indent).replaceAll('\n', newline) + newline;
  writes.push({ file: name, before: inputs.get(path.join(active, name)), bytes: Buffer.from(serialized) });
}
assert.equal(writes.length, 5);
for (const [file, data] of evidence) {
  const destination = safe(active, file);
  if (fs.existsSync(destination)) assert.equal(sha256(fs.readFileSync(destination)), sha256(data), 'existing_evidence_collision');
  else writes.push({ file, before: null, bytes: data });
}
fs.mkdirSync(out);
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const verifyInputs = () => { for (const [file, hash] of inputs) assert.equal(sha256(fs.readFileSync(file)), hash, 'input_changed_before_integration'); };
verifyInputs();
for (const row of writes.filter(r => r.before)) {
  const backup = path.join(out, 'before', row.file); fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.copyFileSync(path.join(active, row.file), backup, fs.constants.COPYFILE_EXCL);
}
save('pending.json', { version: 'POKEMON_CLASSIC_MASTER_INTEGRATION_V1', at: new Date().toISOString(), head: git('rev-parse', 'HEAD'),
  actor: 'automated_agent:codex_pokemon_relationship_repair', human_signature: null, production_writes: 0,
  writes: writes.map(({ bytes, ...r }) => ({ ...r, after: sha256(bytes) })), inputs: [...inputs].map(([file, sha256]) => ({ file, sha256 })),
  recovery: 'Source-only multi-file write. If terminal receipt is absent, compare every pending before/after hash before any retry; retain this directory.' });
try {
  verifyInputs();
  for (const row of writes) {
    const file = safe(active, row.file); fs.mkdirSync(path.dirname(file), { recursive: true });
    if (row.before) assert.equal(sha256(fs.readFileSync(file)), row.before);
    else assert.equal(fs.existsSync(file), false);
    fs.writeFileSync(file, row.bytes, { flag: row.before ? 'w' : 'wx' });
  }
  const after = Object.fromEntries(Object.entries(ARTIFACTS).map(([key, name]) => [key, JSON.parse(fs.readFileSync(path.join(active, name)))]));
  assertClassicFinishPreservation(baseline, after, identityPackage, finishPackage);
  for (const row of writes) assert.equal(sha256(fs.readFileSync(path.join(active, row.file))), sha256(row.bytes));
  for (const [key, name] of Object.entries(ARTIFACTS)) if (!writes.some(r => r.file === name)) assert.equal(sha256(fs.readFileSync(path.join(active, name))), inputs.get(path.join(active, name)));
  // Re-read all copied sources; count or output hashes alone cannot bless facts.
  const copied = new Map(sourceFiles.map(file => [file, fs.readFileSync(path.join(active, file))]));
  const replay = stageClassicFinishes({ baseline, identityPackage, finishPackage, namespace,
    sources: identityPackage.sources.map(s => ({ ...s, bytes: gunzipSync(copied.get(`source_snapshots/${s.key}.html.gz`)) })),
    finishEvidence: { reviewBytes, review: JSON.parse(reviewBytes),
      checklists: manifest.checklists.map(s => ({ ...s, bytes: gunzipSync(copied.get(s.file)) })),
      photographs: manifest.photographs.map(s => ({ ...s, bytes: copied.get(s.file) })) } });
  assert.deepEqual(after, replay.staged);
  save('complete.json', { version: 'POKEMON_CLASSIC_MASTER_INTEGRATION_V1', status: 'source_integrated_and_independently_replayed', at: new Date().toISOString(),
    prior_cards: baseline.cardsArtifact.cards.length, prior_printings: baseline.printingsArtifact.printings.length,
    cards: after.cardsArtifact.cards.length, printings: after.printingsArtifact.printings.length, added_cards: 102, added_printings: 102,
    original_evidence_files: sourceFiles.length, writes: writes.length, original_evidence_records: 408, preservation: 'passed', locked_ME04: 'passed',
    outside_scope_reviews: report.outside_scope_reviews, production_writes: 0, commit_push: false, release: false,
    remaining: ['normal completion rebuild and source hooks/commit/push', 'governed canonical production executor and full dependencies', 'public image and Auth/HTTP proof'] });
  console.log(JSON.stringify({ status: 'source_integrated', cards: after.cardsArtifact.cards.length, printings: after.printingsArtifact.printings.length, production_writes: 0 }));
} catch (error) { save('failure.json', { at: new Date().toISOString(), status: 'requires_source_readback', error: error.message, production_writes: 0 }); throw error; }
