import path from 'node:path';
import { contentFingerprint } from '../audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

// A shadow candidate build is diagnostic and cannot feed canonical admission.
export function resolveJapaneseCandidateManifestV1(root, candidateResult) {
  if (typeof candidateResult?.preservation_deferred !== 'boolean' || typeof candidateResult.manifest_path !== 'string') throw new Error('Candidate union did not report a valid preservation state');
  const indexRoot = candidateResult.preservation_deferred
    ? path.join('docs', 'audits', 'japanese_master_index_v4', 'continuous_verification', 'candidate_shadow')
    : path.join('docs', 'audits', 'japanese_master_index_v4', 'index');
  const manifestPath = path.resolve(root, indexRoot, 'candidate_union_manifest_v1.json');
  const actual = path.resolve(root, candidateResult.manifest_path);
  const normalize = value => process.platform === 'win32' ? value.toLowerCase() : value;
  if (normalize(actual) !== normalize(manifestPath)) throw new Error('Candidate union returned an unexpected manifest path');
  return { indexRoot, manifestPath };
}

export function validateJapaneseCandidateManifestV1(manifest, candidateResult) {
  if (manifest?.package_id !== 'JPN-MASTER-INDEX-CANDIDATE-UNION-MANIFEST-V1'
    || !manifest.content || contentFingerprint(manifest.content) !== manifest.content_fingerprint_sha256
    || manifest.content.preservation_deferred !== candidateResult.preservation_deferred) {
    throw new Error('Candidate union manifest or preservation state is invalid');
  }
  return manifest.content.status;
}

export function planJapaneseCandidateContinuationV1({ preservationDeferred, unionStatus, liveBaselineAvailable }) {
  if (typeof preservationDeferred !== 'boolean' || typeof liveBaselineAvailable !== 'boolean') throw new Error('Invalid candidate continuation state');
  // Final admission consumes every primary and targeted lane.
  const unionComplete = unionStatus === 'complete_primary_and_targeted_source_union';
  const runStrictAdmission = unionComplete && !preservationDeferred;
  const runFinalize = runStrictAdmission && liveBaselineAvailable;
  return {
    unionComplete,
    runStrictAdmission,
    runFinalize,
    deferredReason: preservationDeferred ? 'published_candidate_keys_require_reconciliation'
      : !unionComplete ? 'waiting_for_complete_accumulated_source_set'
        : !liveBaselineAvailable ? 'waiting_for_live_read_only_baseline' : null,
    reportStatus: preservationDeferred ? 'completed_evidence_only_waiting_for_index_reconciliation'
      : runFinalize ? 'completed_no_write'
        : unionComplete ? 'completed_evidence_only_waiting_for_live_baseline'
          : 'completed_evidence_only_waiting_for_complete_source_set',
  };
}
