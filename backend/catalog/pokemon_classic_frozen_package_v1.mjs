import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sha256, DECKS } from './pokemon_classic_identity_evidence_v1.mjs';
import { printingManifestHash as hash } from './printing_completeness_gate_v1.mjs';
import { buildClassicCanonicalPlan, ACTOR } from './pokemon_classic_canonical_admission_v1.mjs';
import { assertClassicMasterProfiles } from './pokemon_classic_master_profile_v1.mjs';

export const VERSION = 'POKEMON_CLASSIC_FROZEN_PACKAGE_V1';
const REVIEW_ROOT = 'docs/audits/english_master_index_completion_v1/classic_canonical_20261002';
const MASTER_ROOT = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';

// Database observation time must never regenerate the immutable source review.
// This loader supplies evidence bindings only, with no production authorization.
export function loadClassicFrozenPackage(root) {
  const files = new Map();
  const read = file => { const bytes = fs.readFileSync(path.join(root, file)); files.set(file, bytes); return bytes; };
  const manifests = DECKS.map(d => JSON.parse(read(`${REVIEW_ROOT}/${d.set_key}-manifest.json`)));
  const reviews = new Map(DECKS.map(d => [`reviews/${d.set_key}.json`, read(`${REVIEW_ROOT}/reviews/${d.set_key}.json`)]));
  const parsed = [...reviews.values()].map(b => JSON.parse(b));
  const qualificationAt = parsed[0].reviewed_at;
  assert.ok(Number.isFinite(Date.parse(qualificationAt)), 'frozen_review_time_required');
  for (const review of parsed) {
    assert.equal(review.reviewed_at, qualificationAt, 'frozen_review_times_disagree');
    assert.equal(review.reviewer, ACTOR); assert.equal(review.actor_type, 'automated_agent');
    assert.equal(review.human_signature, null);
  }
  const masterBytes = read(`${REVIEW_ROOT}/classic-master-projection.json`);
  const master = Object.fromEntries(['cards', 'printings', 'sets'].map(kind =>
    [kind + 'Artifact', JSON.parse(read(`${MASTER_ROOT}/english_master_index_${kind}_v1.json`))]));
  assertClassicMasterProfiles(master);
  const body = { version: VERSION, qualification_at: qualificationAt,
    files: [...files].map(([file, bytes]) => ({ file, sha256: sha256(bytes) })).sort((a,b) => a.file.localeCompare(b.file)),
    production_apply_enabled: false };
  return { ...body, fingerprint: hash(body), manifests, reviews, masterBytes, master, root };
}

export function assertClassicFrozenPackageUnchanged(frozen) {
  const current = loadClassicFrozenPackage(frozen.root);
  assert.equal(current.fingerprint, frozen.fingerprint, 'checked_in_classic_package_drift');
}

export function buildClassicFrozenPlan(bundle, ingress, frozen) {
  assert.equal(bundle.qualificationAt, frozen.qualification_at, 'immutable_source_review_time_required');
  const built = buildClassicCanonicalPlan(bundle, ingress);
  assert.deepEqual(built.plan.manifests, frozen.manifests, 'checked_in_manifest_source_replay_mismatch');
  assert.deepEqual(built.masterBytes, frozen.masterBytes, 'checked_in_master_projection_mismatch');
  assert.deepEqual(built.reviewArtifacts, frozen.reviews, 'checked_in_review_bytes_mismatch');
  for (const [kind, rows] of [['cardsArtifact', bundle.identity.cards], ['printingsArtifact', bundle.finish.printings]]) {
    const key = kind === 'cardsArtifact' ? 'cards' : 'printings';
    assert.deepEqual(frozen.master[kind][key].filter(r => DECKS.some(d => d.set_key === r.set_key)), rows,
      'active_master_classic_source_replay_mismatch');
  }
  return built;
}

export function classicFrozenPackageBinding(frozen) {
  const { version, qualification_at, files, fingerprint, production_apply_enabled } = frozen;
  const body = { version, qualification_at, files, production_apply_enabled };
  assert.equal(fingerprint, hash(body), 'frozen_package_binding_tamper');
  return { ...body, fingerprint };
}