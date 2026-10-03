import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { qualifyClassicFinishes } from '../../backend/catalog/pokemon_classic_finish_evidence_v1.mjs';
import { assertClassicMasterProfiles } from '../../backend/catalog/pokemon_classic_master_profile_v1.mjs';
import { ARTIFACTS, stageClassicMaster } from '../../backend/catalog/pokemon_classic_master_staging_v1.mjs';
import { qualifyClassicIdentities } from '../../backend/catalog/pokemon_classic_identity_evidence_v1.mjs';
const active = new URL('../../docs/audits/verified_master_set_index_v1/english_master_index_v1/', import.meta.url);
const identityRoot = new URL('../../docs/audits/english_master_index_completion_v1/classic_identity_20261002/', import.meta.url);
const finishRoot = new URL('../classic_finish_20261002/', identityRoot);
const read = (root, file) => JSON.parse(fs.readFileSync(new URL(file, root)));

test('integrated whole102 Master finish facts replay from all checked-in original physical evidence', () => {
  const identity = read(identityRoot, 'identity-package.json');
  const review = read(finishRoot, 'automated-visual-review.json');
  const finish = qualifyClassicFinishes({ identity, review, reviewBytes: Buffer.from(JSON.stringify(review)),
    photographs: read(finishRoot, 'physical-acquisition.json').map(p => ({ ...p, bytes: fs.readFileSync(new URL(p.file, active)) })),
    checklists: read(finishRoot, 'checklist-acquisition.json').map(p => ({ ...p, bytes: gunzipSync(fs.readFileSync(new URL(p.file, active))) })) });
  const master = Object.fromEntries(['cardsArtifact', 'printingsArtifact', 'setsArtifact'].map(key => [key, read(active, ARTIFACTS[key])]));
  assertClassicMasterProfiles(master);
  assert.deepEqual(master.cardsArtifact.cards.filter(r => r.set_key.startsWith('classic-')), identity.cards);
  assert.deepEqual(master.printingsArtifact.printings.filter(r => r.set_key.startsWith('classic-')), finish.printings);
  assert.equal(finish.outside_scope_reviews.length, 1);
  assert.equal(finish.outside_scope_reviews[0].resolved, false);
});

test('integrated Master scope cannot be staged twice even with replayed source evidence', () => {
  const preserved = read(identityRoot, 'identity-package.json');
  const sources = preserved.sources.map(s => ({ ...s, bytes: gunzipSync(fs.readFileSync(new URL('source_snapshots/' + s.key + '.html.gz', active))) }));
  const namespace = { project: 'ycdxbpibncqcchqiihfz', read_only: true, verified_tls: true,
    observed_at: '2026-10-02T18:00:00Z', sanity: { cards: 40000, sets: 150, traits: 5000 },
    sets: Array.from({ length: 150 }, (_, i) => ({ id: 'fixture-' + i, code: 'fixture-' + i, game: 'pokemon' })) };
  const identityPackage = qualifyClassicIdentities({ sources, namespace });
  const baseline = Object.fromEntries(Object.entries(ARTIFACTS).map(([key, file]) => [key, read(active, file)]));
  assert.throws(() => stageClassicMaster({ baseline, sources, namespace, identityPackage }), /classic_scope_already_present/);
});

test('Master integration rejects database/apply flags before touching any file', () => {
  const result = spawnSync(process.execPath, ['scripts/audits/pokemon_classic_master_integration_v1.mjs', '--apply=true'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unique_candidate_and_output_required/);
});
