import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { sha256 } from './pokemon_classic_identity_evidence_v1.mjs';

// A source bundle is replayed, not trusted because a completion receipt exists.
export function loadClassicCanonicalBundle({ stagingDir, speciesFile, observationFile, qualificationAt }) {
  assert.ok(Number.isFinite(Date.parse(qualificationAt)), 'qualification_timestamp_required');
  const artifacts = new Map(), inputHashes = new Map();
  const readFile = file => { const bytes = fs.readFileSync(file); inputHashes.set(path.resolve(file), sha256(bytes)); return bytes; };
  const read = name => { assert.ok(!path.isAbsolute(name) && !name.split(/[\\/]/).includes('..')); const bytes = readFile(path.join(stagingDir, name));
    const raw = name.endsWith('.gz') ? gunzipSync(bytes) : bytes; artifacts.set(name, raw); return raw; };
  const json = name => JSON.parse(read(name));
  const identity = json('identity-package.json'), manifest = json('manifest.json'), reviewBytes = read('review.json');
  return { qualificationAt, identity, finish: json('finish-package.json'), namespace: json('namespace-snapshot.json'),
    sources: identity.sources.map(s => ({ ...s, bytes: read(`source_snapshots/${s.key}.html.gz`) })),
    finishEvidence: { reviewBytes, review: JSON.parse(reviewBytes),
      checklists: manifest.checklists.map(s => ({ ...s, bytes: read(s.file) })), photographs: manifest.photographs.map(s => ({ ...s, bytes: read(s.file) })) },
    species: JSON.parse(readFile(speciesFile)), observation: JSON.parse(readFile(observationFile)),
    master: { cardsArtifact: json('english_master_index_cards_v1.json'), printingsArtifact: json('english_master_index_printings_v1.json'), setsArtifact: json('english_master_index_sets_v1.json') },
    artifacts, inputHashes };
}

export function assertClassicBundleFilesUnchanged(bundle) {
  for (const [file, hash] of bundle.inputHashes) assert.equal(sha256(fs.readFileSync(file)), hash, 'canonical_source_file_drift');
}
