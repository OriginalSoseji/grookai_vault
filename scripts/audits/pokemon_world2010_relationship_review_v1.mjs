import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { qualifyWorld2010Relationships, DECKS } from '../../backend/catalog/pokemon_world2010_relationship_review_v1.mjs';

export function reviewWorld2010(args) {
  const options = new Map();
  for (const arg of args) {
    const m = arg.match(/^--(snapshot|receipt|originals-dir|out-dir)=(.+)$/);
    assert.ok(m && !options.has(m[1]), 'unique_offline_review_arguments_required'); options.set(m[1], path.resolve(m[2]));
  }
  assert.equal(options.size, 4); const out = options.get('out-dir');
  assert.ok(!fs.existsSync(out), 'new_immutable_output_required');
  fs.mkdirSync(out); const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  try {
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = fs.readFileSync(options.get('snapshot')), receiptBytes = fs.readFileSync(options.get('receipt'));
  const receipt = JSON.parse(receiptBytes);
  assert.equal(receipt.status, 'whole109_existing_identity_observed_not_mapping_authority');
  assert.equal(receipt.snapshot_sha256, sha(bytes), 'observation_snapshot_hash_mismatch');
  assert.equal(receipt.independent_connections, 2); assert.equal(receipt.verified_tls, true); assert.equal(receipt.read_only, true);
  assert.equal(receipt.production_writes, 0); assert.equal(receipt.source_hashes_unchanged, true);
  assert.ok(receipt.sanity.cards >= 40000 && receipt.sanity.sets >= 150 && receipt.sanity.traits >= 5000);
  const originals = new Map(), inputs = [ { kind: 'snapshot', sha256: sha(bytes) }, { kind: 'readonly_observation_receipt', sha256: sha(receiptBytes) } ];
  const files = fs.readdirSync(options.get('originals-dir')).filter(f => fs.statSync(path.join(options.get('originals-dir'), f)).isFile());
  for (const deck of DECKS) {
    const matches = files.map(file => ({ file, bytes: fs.readFileSync(path.join(options.get('originals-dir'), file)) })).filter(x => sha(x.bytes) === deck.sha256);
    assert.equal(matches.length, 1, 'one_exact_original_per_deck_required');
    originals.set(deck.code, matches[0].bytes); inputs.push({ kind: 'original_checklist', deck: deck.code, file: matches[0].file, sha256: deck.sha256 });
  }
  const now = new Date().toISOString(), snapshot = JSON.parse(bytes);
  assert.deepEqual(snapshot.sanity, receipt.sanity, 'observation_environment_mismatch');
  assert.ok(Number.isFinite(Date.parse(receipt.at)), 'observation_time_required');
  const review = qualifyWorld2010Relationships(snapshot, originals, now);
  save('start.json', { at: now, mode: 'offline_new_automated_relationship_review', observed_at: receipt.at, inputs, production_writes: 0 });
  save('review.json', review);
  for (const input of inputs.filter(i => i.kind === 'original_checklist')) assert.equal(sha(fs.readFileSync(path.join(options.get('originals-dir'), input.file))), input.sha256);
  assert.equal(sha(fs.readFileSync(options.get('snapshot'))), sha(bytes)); assert.equal(sha(fs.readFileSync(options.get('receipt'))), sha(receiptBytes));
  const complete = { at: new Date().toISOString(), status: review.status, counts: review.counts, review_fingerprint: review.fingerprint,
    review_sha256: sha(fs.readFileSync(path.join(out, 'review.json'))), observations_are_current_only_at: receipt.at,
    source_bound_originals: 4, original_deck_entries_reparsed: true, prior_worklists_used_as_authority: false,
    all109_parents_and100_printings_preserved: true, production_writes: 0, relationships_repaired: 0,
    execution_authorized: false, new_finish_authority: false, open_gates: review.open_gates };
  save('complete.json', complete); return complete;
  } catch (error) { save('failure.json', { at: new Date().toISOString(), message: error.message, production_writes: 0, execution_authorized: false }); throw error; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(reviewWorld2010(process.argv.slice(2)))); }
  catch (error) { console.error('Offline World2010 review rejected: ' + error.message); process.exitCode = 1; }
}


