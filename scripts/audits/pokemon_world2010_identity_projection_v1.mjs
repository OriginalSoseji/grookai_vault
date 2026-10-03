import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DECKS } from '../../backend/catalog/pokemon_world2010_relationship_review_v1.mjs';
import { projectWorld2010Identities, stageWorld2010IdentityArtifacts, projectionHash } from '../../backend/catalog/pokemon_world2010_identity_projection_v1.mjs';

export function prepareWorld2010IdentityProjection(args) {
  const options = new Map();
  for (const arg of args) {
    const m = arg.match(/^--(snapshot|receipt|review|originals-dir|master-dir|out-dir)=(.+)$/);
    assert.ok(m && !options.has(m[1]), 'unique_offline_projection_arguments_required');
    options.set(m[1], path.resolve(m[2]));
  }
  assert.equal(options.size, 6);
  const out = options.get('out-dir'); assert.ok(!fs.existsSync(out), 'new_immutable_output_required');
  fs.mkdirSync(out);
  const save = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const sha = bytes => createHash('sha256').update(bytes).digest('hex'), bindings = [];
  const load = file => { const bytes = fs.readFileSync(file); bindings.push({ file, sha256: sha(bytes) }); return bytes; };
  try {
    const snapshotBytes = load(options.get('snapshot')), snapshot = JSON.parse(snapshotBytes);
    const receipt = JSON.parse(load(options.get('receipt'))), review = JSON.parse(load(options.get('review')));
    assert.equal(receipt.snapshot_sha256, sha(snapshotBytes));
    assert.equal(receipt.status, 'whole109_existing_identity_observed_not_mapping_authority');
    assert.equal(receipt.independent_connections, 2); assert.equal(receipt.verified_tls, true);
    assert.equal(receipt.read_only, true); assert.equal(receipt.production_writes, 0);
    assert.equal(receipt.source_hashes_unchanged, true);
    assert.deepEqual(receipt.sanity, snapshot.sanity);
    assert.ok(receipt.sanity.cards >= 40000 && receipt.sanity.sets >= 150 && receipt.sanity.traits >= 5000);
    assert.ok(Number.isFinite(Date.parse(receipt.at)));
    const originals = new Map(), dir = options.get('originals-dir');
    const files = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile());
    for (const deck of DECKS) {
      const matches = files.filter(f => sha(fs.readFileSync(path.join(dir, f))) === deck.sha256);
      assert.equal(matches.length, 1, 'one_exact_original_per_deck_required');
      originals.set(deck.code, load(path.join(dir, matches[0])));
    }
    const baseline = {};
    for (const kind of ['cards', 'sets', 'printings'])
      baseline[kind + 'Artifact'] = JSON.parse(load(path.join(options.get('master-dir'), `english_master_index_${kind}_v1.json`)));
    const inputs = { snapshot, originals, review, baseline };
    const projection = projectWorld2010Identities(inputs), staged = stageWorld2010IdentityArtifacts(projection, inputs);
    save('projection.json', projection);
    save('held.json', projection.held);
    for (const [kind, artifact] of Object.entries(staged)) save(kind + '.json', artifact);
    for (const binding of bindings) assert.equal(sha(fs.readFileSync(binding.file)), binding.sha256, 'input_changed_during_projection');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'projection.json'))), projection);
    for (const [kind, artifact] of Object.entries(staged))
      assert.equal(projectionHash(JSON.parse(fs.readFileSync(path.join(out, kind + '.json')))), projectionHash(artifact));
    save('inputs.json', { bindings, observed_at: receipt.at, review_fingerprint: review.fingerprint });
    const complete = { at: new Date().toISOString(), status: 'whole92_identity_projection_staged_not_active_or_executable',
      projection_fingerprint: projection.fingerprint, projection_sha256: sha(fs.readFileSync(path.join(out, 'projection.json'))),
      counts: projection.counts, staged_cards: staged.cardsArtifact.cards.length, staged_sets: staged.setsArtifact.sets.length,
      preserved_printings: staged.printingsArtifact.printings.length, all_prior_master_facts_preserved: true,
      original_checklists_replayed: 4, observed_at: receipt.at, active_master_changed: false,
      production_writes: 0, relationships_repaired: 0, execution_authorized: false, open_gates: projection.open_gates };
    save('complete.json', complete); return complete;
  } catch (error) {
    save('failure.json', { at: new Date().toISOString(), message: error.message, production_writes: 0, execution_authorized: false });
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(prepareWorld2010IdentityProjection(process.argv.slice(2)))); }
  catch (error) { console.error('Offline World2010 identity projection rejected: ' + error.message); process.exitCode = 1; }
}
