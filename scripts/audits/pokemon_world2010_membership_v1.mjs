import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prepareWorld2010IdentityProjection } from './pokemon_world2010_identity_projection_v1.mjs';
import { DECKS } from '../../backend/catalog/pokemon_world2010_relationship_review_v1.mjs';
import { stageWorld2010MembershipArtifacts } from '../../backend/catalog/pokemon_world2010_membership_v1.mjs';
import { buildArtifacts } from './english_master_index_completion_v1_build.mjs';
import { setManifestRow } from './english_master_index_publishable_v1_build.mjs';

export function prepareWorld2010Membership(args) {
  const options = new Map();
  for (const arg of args) {
    const m = arg.match(/^--(snapshot|receipt|review|originals-dir|master-dir|out-dir)=(.+)$/);
    assert.ok(m && !options.has(m[1]), 'unique_offline_membership_arguments_required');
    options.set(m[1], path.resolve(m[2]));
  }
  assert.equal(options.size, 6);
  const out = options.get('out-dir'); assert.ok(!fs.existsSync(out), 'new_immutable_output_required');
  fs.mkdirSync(out);
  const read = file => JSON.parse(fs.readFileSync(file));
  const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const save = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  try {
    const identityOut = path.join(out, 'identity-projection');
    prepareWorld2010IdentityProjection(args.map(arg => arg.startsWith('--out-dir=') ? '--out-dir=' + identityOut : arg));
    const projection = read(path.join(identityOut, 'projection.json'));
    const bindings = read(path.join(identityOut, 'inputs.json')).bindings;
    for (const b of bindings) assert.equal(sha(b.file), b.sha256, 'membership_input_changed');
    const originals = new Map(DECKS.map(d => {
      const b = bindings.find(b => b.sha256 === d.sha256); assert.ok(b);
      return [d.code, fs.readFileSync(b.file)];
    }));
    const masterFile = name => path.join(options.get('master-dir'), `english_master_index_${name}_v1.json`);
    const baseline = Object.fromEntries(['cards','sets','printings'].map(k => [k + 'Artifact', read(masterFile(k))]));
    const inputs = { baseline, originals, snapshot: read(options.get('snapshot')), review: read(options.get('review')) };
    const staged = stageWorld2010MembershipArtifacts(projection, inputs);
    const extra = Object.fromEntries(Object.entries({ availabilityArtifact: 'source_availability', manualReviewArtifact: 'manual_review',
      conflictsArtifact: 'conflicts', finishBlockerClosure: 'finish_blocker_closure' }).map(([k, name]) => {
      const file = masterFile(name); bindings.push({ file, sha256: sha(file) }); return [k, read(file)];
    }));
    const prior = buildArtifacts({ ...baseline, ...extra }), candidate = buildArtifacts({ ...staged, ...extra });
    for (const row of prior.setMatrix.sets)
      assert.deepEqual(candidate.setMatrix.sets.find(s => s.set_key === row.set_key), row, 'prior_completion_changed');
    const codes = new Set(DECKS.map(d => d.code));
    const rows = candidate.setMatrix.sets.filter(s => codes.has(s.set_key));
    const publication = rows.map(setManifestRow);
    assert.equal(rows.reduce((n, r) => n + r.card_identity.held_membership, 0), 17);
    assert.ok(publication.every(r => r.shard_refs === null && r.publishability_status === 'not_publishable_card_identity_gaps'));
    for (const [kind, artifact] of Object.entries(staged)) save(kind + '.json', artifact);
    for (const [kind, artifact] of Object.entries(candidate)) save(kind + '.json', artifact);
    save('publication.json', publication);
    for (const b of bindings) assert.equal(sha(b.file), b.sha256, 'membership_input_changed');
    for (const [kind, artifact] of Object.entries(staged)) assert.deepEqual(read(path.join(out, kind + '.json')), artifact);
    save('inputs.json', { bindings });
    const complete = { at: new Date().toISOString(), status: 'whole109_membership_guard_staged_not_active',
      projected_identities: 92, expected_membership: 109, held_identities: 17, prior_sets_preserved: prior.setMatrix.sets.length,
      public_shards: 0, active_master_changed: false, production_writes: 0, relationships_repaired: 0,
      profiles: rows.map(r => ({ set_key: r.set_key, fingerprint: r.anthology_membership.fingerprint })),
      outputs: fs.readdirSync(out).filter(f => fs.statSync(path.join(out, f)).isFile()).map(file => ({ file, sha256: sha(path.join(out, file)) })) };
    save('complete.json', complete); return complete;
  } catch (error) {
    save('failure.json', { at: new Date().toISOString(), message: error.message, production_writes: 0 }); throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(prepareWorld2010Membership(process.argv.slice(2)))); }
  catch (error) { console.error('Offline World2010 membership staging rejected: ' + error.message); process.exitCode = 1; }
}
