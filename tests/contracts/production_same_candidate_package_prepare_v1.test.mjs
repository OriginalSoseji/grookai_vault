import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSameCandidateManifestTemplateV1
} from '../../scripts/audits/production_same_candidate_package_prepare_v1.mjs';
import {
  REQUIRED_CLIENT_JOURNEYS_V1,
  evaluateProductionSameCandidateClientGateV1
} from '../../scripts/audits/production_same_candidate_client_gate_v1.mjs';

const SHA = 'a'.repeat(40);

test('same-candidate preparation preserves empty evidence until each artifact is proven', async () => {
  const manifest = buildSameCandidateManifestTemplateV1({ sourceCommitSha: SHA });
  assert.equal(manifest.candidate.source_commit_sha, SHA);
  assert.equal(manifest.candidate.frozen_at, null);
  for (const platform of ['web', 'android', 'ios']) {
    assert.equal(manifest.artifacts[platform].source_commit_sha, null);
    assert.equal(manifest.journeys[platform].source_commit_sha, null);
    assert.deepEqual(Object.keys(manifest.journeys[platform].checks), [...REQUIRED_CLIENT_JOURNEYS_V1]);
    assert.ok(Object.values(manifest.journeys[platform].checks).every((status) => status === 'not_run'));
  }
  const result = await evaluateProductionSameCandidateClientGateV1(manifest, { verifyEvidencePaths: false });
  assert.equal(result.status, 'blocked');
  assert.equal(result.gate_passed, false);
  assert.ok(result.findings.includes('invalid_candidate_frozen_at'));
});
