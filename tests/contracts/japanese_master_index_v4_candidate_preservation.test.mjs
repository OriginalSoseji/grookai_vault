import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { assertCanonicalCandidateOutputPreserved, assertPublishedCandidateKeysPreservedV1, selectCandidateUnionOutputV1 } from '../../scripts/audits/japanese_master_index_v4/candidate_union_v1.mjs';
import { planJapaneseCandidateContinuationV1, resolveJapaneseCandidateManifestV1, validateJapaneseCandidateManifestV1 } from '../../scripts/agents/japanese_master_index_candidate_route_v1.mjs';
import { contentFingerprint } from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

test('candidate union cannot lose a published identity or printing key', () => {
  const cards = [{ jpn_card_identity_key: 'existing:one' }, { jpn_card_identity_key: 'product:two' }];
  const prints = [{ printing_fact_key: 'print:one', parent_jpn_card_identity_key: 'existing:one' }];
  const candidates = [{ candidate_key: 'existing:one' }, { candidate_key: 'product:two' }, { candidate_key: 'new:three' }];
  const printingCandidates = [{ printing_candidate_key: 'print:one', identity_candidate_key: 'existing:one' }];
  assert.doesNotThrow(() => assertPublishedCandidateKeysPreservedV1(cards, prints, candidates, printingCandidates));
  assert.throws(() => assertPublishedCandidateKeysPreservedV1(cards, prints, candidates.slice(0, 1), printingCandidates), /1 prior identities would be removed/);
  assert.throws(() => assertPublishedCandidateKeysPreservedV1(cards, prints, candidates, []), /1 prior printings would be removed/);
  assert.throws(() => assertPublishedCandidateKeysPreservedV1(cards, prints, candidates, [{ printing_candidate_key: 'print:one', identity_candidate_key: 'product:two' }]), /printing ownership would be changed/);
  assert.throws(() => assertPublishedCandidateKeysPreservedV1(cards, prints, candidates, [{ printing_candidate_key: 'print:one' }]), /missing parent identity/);
  assert.throws(() => assertPublishedCandidateKeysPreservedV1(cards, prints, [candidates[0], candidates[0]], printingCandidates), /duplicate next identity key/);
  assert.throws(() => assertPublishedCandidateKeysPreservedV1(cards, prints, candidates, [{ printing_candidate_key: '' }]), /invalid or duplicate next/);
});

test('only missing published keys can fall back to a non-overlapping review shadow', async () => {
  const canonical = 'docs/audits/japanese_master_index_v4/index';
  const shadow = 'docs/audits/japanese_master_index_v4/continuous_verification/candidate_shadow';
  const incomplete = { identityCandidates: [], printingCandidates: [] };
  const selected = await selectCandidateUnionOutputV1(canonical, shadow, incomplete);
  assert.equal(selected.outputRoot, shadow);
  assert.equal(selected.preservationDeferred, true);
  assert.match(selected.preservationReason, /prior identities would be removed/);
  await assert.rejects(selectCandidateUnionOutputV1(canonical, null, incomplete), /prior identities would be removed/);
  await assert.rejects(selectCandidateUnionOutputV1(canonical, canonical, incomplete), /must not overlap/);
  await assert.rejects(selectCandidateUnionOutputV1(canonical, `${canonical}/nested`, incomplete), /must not overlap/);
  await assert.rejects(selectCandidateUnionOutputV1(canonical, '../outside-shadow', incomplete), /must remain inside/);
  await assert.rejects(selectCandidateUnionOutputV1(canonical, 'docs/audits/japanese_master_index_v4/final', incomplete), /designated review directory/);
  await assert.rejects(selectCandidateUnionOutputV1(canonical, shadow, { identityCandidates: [{ candidate_key: '' }], printingCandidates: [] }), /invalid or duplicate next/);
});

test('scheduled verifier defers admission for shadow or incomplete source evidence', () => {
  const base = { unionStatus: 'complete_primary_and_targeted_source_union', liveBaselineAvailable: true };
  assert.equal(planJapaneseCandidateContinuationV1({ ...base, preservationDeferred: false }).runFinalize, true);
  const shadow = planJapaneseCandidateContinuationV1({ ...base, preservationDeferred: true });
  assert.equal(shadow.runStrictAdmission, false);
  assert.equal(shadow.runFinalize, false);
  assert.equal(shadow.deferredReason, 'published_candidate_keys_require_reconciliation');
  assert.equal(shadow.reportStatus, 'completed_evidence_only_waiting_for_index_reconciliation');
  assert.equal(planJapaneseCandidateContinuationV1({ ...base, unionStatus: 'complete_primary_source_union', preservationDeferred: false }).runStrictAdmission, false);
  const noLive = planJapaneseCandidateContinuationV1({ ...base, liveBaselineAvailable: false, preservationDeferred: false });
  assert.equal(noLive.runFinalize, false);
  assert.equal(noLive.reportStatus, 'completed_evidence_only_waiting_for_live_baseline');
  assert.throws(() => planJapaneseCandidateContinuationV1({ ...base, preservationDeferred: undefined }), /Invalid candidate continuation state/);
});

test('scheduled verifier binds routing to a verified manifest and its preservation state', () => {
  const shadow = { preservation_deferred: true, manifest_path: 'docs/audits/japanese_master_index_v4/continuous_verification/candidate_shadow/candidate_union_manifest_v1.json' };
  assert.match(resolveJapaneseCandidateManifestV1(process.cwd(), shadow).indexRoot, /candidate_shadow$/);
  assert.throws(() => resolveJapaneseCandidateManifestV1(process.cwd(), { ...shadow, manifest_path: 'docs/audits/japanese_master_index_v4/index/candidate_union_manifest_v1.json' }), /unexpected manifest path/);
  const content = { status: 'complete_primary_and_targeted_source_union', preservation_deferred: true };
  const artifact = { package_id: 'JPN-MASTER-INDEX-CANDIDATE-UNION-MANIFEST-V1', content, content_fingerprint_sha256: contentFingerprint(content) };
  assert.equal(validateJapaneseCandidateManifestV1(artifact, shadow), content.status);
  assert.throws(() => validateJapaneseCandidateManifestV1({ ...artifact, content: { ...content, preservation_deferred: false } }, shadow), /manifest or preservation state is invalid/);
  assert.throws(() => validateJapaneseCandidateManifestV1(artifact, { ...shadow, preservation_deferred: false }), /manifest or preservation state is invalid/);
});

test('canonical output checks the actual retained index before writing, while separate review output remains possible', async () => {
  const manifest = 'docs/audits/japanese_master_index_v4/index/candidate_union_manifest_v1.json';
  const before = await readFile(manifest);
  const incomplete = { identityCandidates: [], printingCandidates: [] };
  await assert.rejects(assertCanonicalCandidateOutputPreserved('docs/audits/japanese_master_index_v4/index', incomplete), /prior identities would be removed/);
  assert.deepEqual(await readFile(manifest), before);
  await assert.doesNotReject(assertCanonicalCandidateOutputPreserved('docs/audits/japanese_master_index_v4/candidate_review_shadow', incomplete));
});
