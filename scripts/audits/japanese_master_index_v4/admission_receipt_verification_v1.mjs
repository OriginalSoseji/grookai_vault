import path from 'node:path';
import { readVerifiedArtifact } from './artifact_rows_v1.mjs';
import { verifyRawArchive } from './package_preserved_evidence_v1.mjs';
import { contentFingerprint } from './deterministic_artifact_v1.mjs';

const DEFAULT_LEDGER = 'docs/audits/japanese_master_index_v4/cards/raw_evidence_preservation_ledger_v1.json.gz';

export function assertSourceReceiptEntriesV1(assertions, lane, entries) {
  const prefix = `tar+gzip://${lane.archive_path}#`;
  const entryMap = new Map(entries.map((entry) => [entry.entry_path, entry]));
  if (entryMap.size !== entries.length) throw new Error(`Duplicate archive member for ${lane.source_lane}`);
  for (const assertion of assertions) {
    if (assertion.source_id !== lane.source_lane || typeof assertion.raw_snapshot_ref !== 'string'
      || !assertion.raw_snapshot_ref.startsWith(prefix)) {
      throw new Error(`Assertion archive reference mismatch: ${assertion.assertion_key}`);
    }
    const entry = entryMap.get(assertion.raw_snapshot_ref.slice(prefix.length));
    if (!entry || entry.sha256 !== assertion.raw_snapshot_sha256) {
      throw new Error(`Assertion raw hash mismatch: ${assertion.assertion_key}`);
    }
  }
}

// Verify each actual archived body, not merely the format of the recorded hash.
// This read-only gate runs before any final-admission output is written.
export async function verifyAdmissionSourceReceiptsV1(assertionsByLane, ledgerPath = DEFAULT_LEDGER) {
  const ledger = (await readVerifiedArtifact(ledgerPath, {
    expectedPackageId: 'JPN-MASTER-INDEX-PRESERVED-EVIDENCE-PACKAGE-V1',
  })).artifact;
  const lanes = ledger.content.source_lanes ?? [];
  const byId = new Map(lanes.map((lane) => [lane.source_lane, lane]));
  if (byId.size !== lanes.length || byId.size !== assertionsByLane.size) {
    throw new Error('Source preservation ledger lane mismatch');
  }
  for (const [laneId, assertions] of assertionsByLane) {
    const lane = byId.get(laneId);
    if (!lane || !/^docs\/audits\/japanese_master_index_v4\/cards\/raw_archives\/[a-z0-9_]+\.tar\.gz$/.test(lane.archive_path)) {
      throw new Error(`Unrecognized source preservation lane: ${laneId}`);
    }
    const [assertionArtifact, manifest] = await Promise.all([
      readVerifiedArtifact(lane.assertion_path), readVerifiedArtifact(lane.manifest_path),
    ]);
    if (assertionArtifact.artifact.content_fingerprint_sha256 !== lane.assertion_content_fingerprint_sha256
      || contentFingerprint(assertionArtifact.artifact.content.assertions ?? []) !== contentFingerprint(assertions)
      || manifest.artifact.content.raw_archive?.archive_sha256 !== lane.archive_sha256) {
      throw new Error(`Source preservation ledger drift: ${laneId}`);
    }
    const entries = await verifyRawArchive(path.resolve(lane.archive_path), lane);
    assertSourceReceiptEntriesV1(assertions, lane, entries);
  }
}
