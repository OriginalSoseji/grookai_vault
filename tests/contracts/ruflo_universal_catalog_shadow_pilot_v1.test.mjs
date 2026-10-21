import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildUniversalCatalogPilotLedgerV1,
  buildUniversalCatalogShadowObservationV1,
  defaultUniversalCatalogPilotOutputDirV1,
  readDiscoveryEvidenceV1,
} from "../../scripts/ruflo/build_universal_catalog_shadow_pilot_v1.mjs";
import { stableJsonV1 } from "../../scripts/ruflo/build_operations_read_model_v1.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const evidenceDir = path.join(repoRoot, "tests/fixtures/ruflo/universal_catalog_run_39334612376");
const secondEvidenceDir = path.join(repoRoot, "tests/fixtures/ruflo/universal_catalog_run_39372137263");
const thirdEvidenceDir = path.join(repoRoot, "tests/fixtures/ruflo/universal_catalog_run_39417042104");
const fourthEvidenceDir = path.join(repoRoot, "tests/fixtures/ruflo/universal_catalog_run_39464118813");
const fifthEvidenceDir = path.join(repoRoot, "tests/fixtures/ruflo/universal_catalog_run_39502200235");
const sixthEvidenceDir = path.join(repoRoot, "tests/fixtures/ruflo/universal_catalog_run_39546617897");
const seventhEvidenceDir = path.join(repoRoot, "tests/fixtures/ruflo/universal_catalog_run_39595599455");

function clone(value) {
  return structuredClone(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function refingerprint(observation) {
  const { fingerprint_sha256: ignored, ...core } = observation;
  return { ...core, fingerprint_sha256: sha256(stableJsonV1(core)) };
}

function envelope() {
  const core = {
    envelope_version: "RUFLO_TASK_ENVELOPE_V1",
    agent: { agent_key: "universal-catalog-discovery-v1", permission_tier: "R0" },
    lifecycle: { initial_state: "validated", execution_state: "not_started" },
    boundaries: {
      execution_enabled: false,
      workflow_dispatch: false,
      production_writes: false,
      external_actions: false,
      cleanup: false,
      cross_worktree_writes: false,
    },
  };
  return { ...core, fingerprint_sha256: sha256(stableJsonV1(core)) };
}

test("pilot verifies the captured scheduled discovery evidence", () => {
  const evidence = readDiscoveryEvidenceV1({ evidenceDir });
  assert.equal(evidence.metadata.run_id, 39334612376);
  assert.equal(evidence.metadata.event, "schedule");
  assert.equal(evidence.summary.actionable_gap_count, 7);
  assert.equal(evidence.sourceFailures.length, 1);
  assert.equal(evidence.runPlan.boundaries.database_transaction, "read_only");
});

test("pilot verifies the next captured scheduled discovery evidence", () => {
  const evidence = readDiscoveryEvidenceV1({ evidenceDir: secondEvidenceDir });
  assert.equal(evidence.metadata.run_id, 39372137263);
  assert.equal(evidence.metadata.event, "schedule");
  assert.equal(evidence.summary.completed_at, "2026-10-20T05:00:57.112Z");
  assert.equal(evidence.summary.run_status, "degraded_source_unavailable");
  assert.equal(evidence.sourceFailures.length, 1);
  assert.equal(evidence.runPlan.boundaries.database_transaction, "read_only");
});

test("pilot verifies the third captured scheduled discovery evidence", () => {
  const evidence = readDiscoveryEvidenceV1({ evidenceDir: thirdEvidenceDir });
  assert.equal(evidence.metadata.run_id, 39417042104);
  assert.equal(evidence.metadata.event, "schedule");
  assert.equal(evidence.summary.completed_at, "2026-10-20T11:49:38.308Z");
  assert.equal(evidence.summary.run_status, "degraded_source_unavailable");
  assert.equal(evidence.sourceFailures.length, 1);
  assert.equal(evidence.runPlan.boundaries.database_transaction, "read_only");
});

test("pilot verifies the fourth pre-repair scheduled discovery evidence", () => {
  const evidence = readDiscoveryEvidenceV1({ evidenceDir: fourthEvidenceDir });
  assert.equal(evidence.metadata.run_id, 39464118813);
  assert.equal(evidence.metadata.event, "schedule");
  assert.equal(evidence.metadata.head_sha, "51856a6a2f81aa9e18c9e96dbb6737e7d5067973");
  assert.equal(evidence.summary.completed_at, "2026-10-20T17:17:46.767Z");
  assert.equal(evidence.summary.run_status, "degraded_source_unavailable");
  assert.equal(evidence.sourceFailures.length, 1);
  assert.equal(evidence.runPlan.boundaries.database_transaction, "read_only");
});

test("pilot verifies the fifth post-repair scheduled discovery evidence", () => {
  const evidence = readDiscoveryEvidenceV1({ evidenceDir: fifthEvidenceDir });
  assert.equal(evidence.metadata.run_id, 39502200235);
  assert.equal(evidence.metadata.event, "schedule");
  assert.equal(evidence.metadata.head_sha, "515592aed9426d5736b694b15b54dfea12dfa0c6");
  assert.equal(evidence.summary.completed_at, "2026-10-20T21:45:24.727Z");
  assert.equal(evidence.summary.run_status, "degraded_source_unavailable");
  assert.equal(evidence.sourceFailures.length, 1);
  assert.match(evidence.sourceFailures[0].message, /30th_Celebration/);
  assert.equal(evidence.runPlan.boundaries.database_transaction, "read_only");
});

test("pilot verifies the sixth post-repair scheduled discovery evidence", () => {
  const evidence = readDiscoveryEvidenceV1({ evidenceDir: sixthEvidenceDir });
  assert.equal(evidence.metadata.run_id, 39546617897);
  assert.equal(evidence.metadata.event, "schedule");
  assert.equal(evidence.metadata.head_sha, "1e1ca17aee118e6b5b08434f847ec750826cde5e");
  assert.equal(evidence.summary.completed_at, "2026-10-21T04:59:35.863Z");
  assert.equal(evidence.summary.run_status, "degraded_source_unavailable");
  assert.equal(evidence.sourceFailures.length, 1);
  assert.match(evidence.sourceFailures[0].message, /30th_Celebration/);
  assert.equal(evidence.runPlan.boundaries.database_transaction, "read_only");
});

test("pilot verifies the seventh pre-fallback-repair scheduled discovery evidence", () => {
  const evidence = readDiscoveryEvidenceV1({ evidenceDir: seventhEvidenceDir });
  assert.equal(evidence.metadata.run_id, 39595599455);
  assert.equal(evidence.metadata.event, "schedule");
  assert.equal(evidence.metadata.head_sha, "f6205f12a58275b620cec7915a2826eba3d72ad0");
  assert.equal(evidence.summary.completed_at, "2026-10-21T12:01:23.252Z");
  assert.equal(evidence.summary.run_status, "degraded_source_unavailable");
  assert.equal(evidence.sourceFailures.length, 1);
  assert.match(evidence.sourceFailures[0].message, /30th_Celebration/);
  assert.equal(evidence.runPlan.boundaries.database_transaction, "read_only");
});

test("degraded source evidence is held and never becomes dispatch or promotion authority", () => {
  const evidence = readDiscoveryEvidenceV1({ evidenceDir });
  const observation = buildUniversalCatalogShadowObservationV1({ envelope: envelope(), evidence, cycleNumber: 1 });
  assert.equal(observation.findings.attention_class, "source_degraded");
  assert.deepEqual(observation.findings.source_failure_classes, ["source_access_denied"]);
  assert.equal(observation.outcome.status, "held");
  assert.equal(observation.outcome.qualifies_toward_pilot_minimum, false);
  assert.equal(observation.outcome.promotion_eligible, false);
  assert.equal(observation.outcome.dispatch_eligible, false);
  assert.ok(Object.values(observation.boundaries).every((value) => value === false));
});

test("a healthy observation remains evidence-only and deterministic", () => {
  const evidence = clone(readDiscoveryEvidenceV1({ evidenceDir }));
  evidence.summary.run_status = "completed";
  evidence.summary.source_failure_count = 0;
  evidence.summary.source_failures = [];
  evidence.sourceFailures = [];
  const first = buildUniversalCatalogShadowObservationV1({ envelope: envelope(), evidence, cycleNumber: 2 });
  const second = buildUniversalCatalogShadowObservationV1({ envelope: envelope(), evidence, cycleNumber: 2 });
  assert.deepEqual(first, second);
  assert.equal(first.outcome.status, "observed");
  assert.equal(first.outcome.qualifies_toward_pilot_minimum, true);
  assert.equal(first.outcome.promotion_eligible, false);
});

test("pilot rejects artifact hash drift", () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "ruflo-catalog-pilot-"));
  try {
    cpSync(evidenceDir, temporary, { recursive: true });
    writeFileSync(path.join(temporary, "source_failures.json"), "[]\n");
    assert.throws(() => readDiscoveryEvidenceV1({ evidenceDir: temporary }), /artifact hash mismatch/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("pilot rejects another agent, execution authority, and secret-shaped fields", () => {
  const evidence = readDiscoveryEvidenceV1({ evidenceDir });
  const wrongAgent = envelope();
  wrongAgent.agent.agent_key = "tcgplayer-pricing-completion-v1";
  assert.throws(() => buildUniversalCatalogShadowObservationV1({ envelope: wrongAgent, evidence, cycleNumber: 1 }), /not the universal catalog/);
  const executable = envelope();
  executable.boundaries.execution_enabled = true;
  assert.throws(() => buildUniversalCatalogShadowObservationV1({ envelope: executable, evidence, cycleNumber: 1 }), /must be false/);
  const sensitive = envelope();
  sensitive.api_token = "not-a-real-secret";
  assert.throws(() => buildUniversalCatalogShadowObservationV1({ envelope: sensitive, evidence, cycleNumber: 1 }), /Sensitive registry key is prohibited/);
  const staleFingerprint = envelope();
  staleFingerprint.lifecycle.initial_state = "tampered";
  assert.throws(
    () => buildUniversalCatalogShadowObservationV1({ envelope: staleFingerprint, evidence, cycleNumber: 1 }),
    /fingerprint does not match/,
  );
});

test("pilot ledger requires seven distinct qualifying cycles", () => {
  const evidence = clone(readDiscoveryEvidenceV1({ evidenceDir }));
  evidence.summary.run_status = "completed";
  evidence.summary.source_failure_count = 0;
  evidence.summary.source_failures = [];
  evidence.sourceFailures = [];
  const observations = Array.from({ length: 7 }, (_, index) => {
    const cycleEvidence = clone(evidence);
    cycleEvidence.metadata.run_id += index;
    return buildUniversalCatalogShadowObservationV1({ envelope: envelope(), evidence: cycleEvidence, cycleNumber: index + 1 });
  });
  const partial = buildUniversalCatalogPilotLedgerV1(observations.slice(0, 6));
  assert.equal(partial.readiness, "collecting");
  const complete = buildUniversalCatalogPilotLedgerV1(observations);
  assert.equal(complete.readiness, "minimum_observation_met");
  assert.equal(complete.qualifying_cycle_count, 7);
  assert.equal(complete.authority.execution_enabled, false);
  assert.throws(() => buildUniversalCatalogPilotLedgerV1([observations[0], observations[0]]), /duplicate cycle number/);
  const duplicateRun = clone(observations[1]);
  duplicateRun.source_run.run_id = observations[0].source_run.run_id;
  assert.throws(() => buildUniversalCatalogPilotLedgerV1([observations[0], duplicateRun]), /duplicate source run/);
  assert.throws(() => buildUniversalCatalogPilotLedgerV1([observations[1]]), /contiguous from 1/);
  const manualRun = clone(observations[0]);
  manualRun.source_run.event = "workflow_dispatch";
  assert.throws(
    () => buildUniversalCatalogPilotLedgerV1([refingerprint(manualRun)]),
    /must come from scheduled runs/,
  );
  const tampered = clone(observations[0]);
  tampered.findings.actionable_gap_count += 1;
  assert.throws(() => buildUniversalCatalogPilotLedgerV1([tampered]), /fingerprint mismatch/);
  const heldButQualifying = clone(observations[0]);
  heldButQualifying.outcome.status = "held";
  assert.throws(
    () => buildUniversalCatalogPilotLedgerV1([refingerprint(heldButQualifying)]),
    /status conflicts with source degradation/,
  );
  const degradedButQualifying = clone(observations[0]);
  degradedButQualifying.source_run.discovery_status = "degraded_source_unavailable";
  degradedButQualifying.findings.attention_class = "source_degraded";
  degradedButQualifying.findings.source_failure_count = 1;
  degradedButQualifying.findings.source_failure_classes = ["source_access_denied"];
  degradedButQualifying.outcome.status = "held";
  assert.throws(
    () => buildUniversalCatalogPilotLedgerV1([refingerprint(degradedButQualifying)]),
    /qualification conflicts with source degradation/,
  );
});

test("pilot source has no network, dispatch, execution, database, or destructive Git path", () => {
  const source = readFileSync(path.join(repoRoot, "scripts/ruflo/build_universal_catalog_shadow_pilot_v1.mjs"), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|child_process|execFile|spawn\s*\(|createClient\s*\(|\.rpc\s*\(/);
  assert.doesNotMatch(source, /workflow_dispatch\s*\(|agent_execute\s*\(|git\s+(?:clean|reset|checkout|branch\s+-D|worktree\s+remove)/i);
  assert.equal(
    defaultUniversalCatalogPilotOutputDirV1(7),
    "docs/audits/ruflo_universal_catalog_shadow_pilot_v1/cycle_07",
  );
});

test("checked-in cycle observations and cumulative ledger reproduce from frozen evidence", () => {
  const auditRoot = path.join(repoRoot, "docs/audits/ruflo_universal_catalog_shadow_pilot_v1");
  const manifest = JSON.parse(readFileSync(path.join(auditRoot, "artifact_hashes.json"), "utf8"));
  assert.equal(manifest.workflow_dispatched_by_ruflo, false);
  assert.equal(manifest.agent_executed_by_ruflo, false);
  assert.equal(manifest.captured_cycle_count, 7);
  assert.equal(manifest.latest_source_workflow_run_id, 39595599455);
  for (const [relative, expected] of Object.entries(manifest.files)) {
    assert.equal(sha256(readFileSync(path.resolve(auditRoot, relative))), expected, relative);
  }
  const taskEnvelope = JSON.parse(readFileSync(
    path.join(repoRoot, "docs/audits/ruflo_operations_adapter_v1/universal_catalog_shadow_pilot_v1/ruflo-universal-catalog-shadow-cycle-01-20261019.task_envelope_v1.json"),
    "utf8",
  ));
  const evidence = readDiscoveryEvidenceV1({ evidenceDir });
  const observation = buildUniversalCatalogShadowObservationV1({ envelope: taskEnvelope, evidence, cycleNumber: 1 });
  const checkedObservation = JSON.parse(readFileSync(path.join(auditRoot, "cycle_01/cycle_01_observation.json"), "utf8"));
  assert.deepEqual(observation, checkedObservation);
  const ledger = buildUniversalCatalogPilotLedgerV1([observation]);
  const checkedLedger = JSON.parse(readFileSync(path.join(auditRoot, "cycle_01/pilot_ledger_v1.json"), "utf8"));
  assert.deepEqual(ledger, checkedLedger);
  const secondTaskEnvelope = JSON.parse(readFileSync(
    path.join(repoRoot, "docs/audits/ruflo_operations_adapter_v1/universal_catalog_shadow_pilot_v1/ruflo-universal-catalog-shadow-cycle-02-20261020.task_envelope_v1.json"),
    "utf8",
  ));
  const secondEvidence = readDiscoveryEvidenceV1({ evidenceDir: secondEvidenceDir });
  const secondObservation = buildUniversalCatalogShadowObservationV1({
    envelope: secondTaskEnvelope,
    evidence: secondEvidence,
    cycleNumber: 2,
  });
  const checkedSecondObservation = JSON.parse(readFileSync(path.join(auditRoot, "cycle_02/cycle_02_observation.json"), "utf8"));
  assert.deepEqual(secondObservation, checkedSecondObservation);
  const cumulativeLedger = buildUniversalCatalogPilotLedgerV1([observation, secondObservation]);
  const checkedCumulativeLedger = JSON.parse(readFileSync(path.join(auditRoot, "cycle_02/pilot_ledger_v1.json"), "utf8"));
  assert.deepEqual(cumulativeLedger, checkedCumulativeLedger);
  assert.equal(cumulativeLedger.observed_cycle_count, 2);
  assert.equal(cumulativeLedger.qualifying_cycle_count, 0);
  const thirdTaskEnvelope = JSON.parse(readFileSync(
    path.join(repoRoot, "docs/audits/ruflo_operations_adapter_v1/universal_catalog_shadow_pilot_v1/ruflo-universal-catalog-shadow-cycle-03-20261020.task_envelope_v1.json"),
    "utf8",
  ));
  const thirdEvidence = readDiscoveryEvidenceV1({ evidenceDir: thirdEvidenceDir });
  const thirdObservation = buildUniversalCatalogShadowObservationV1({
    envelope: thirdTaskEnvelope,
    evidence: thirdEvidence,
    cycleNumber: 3,
  });
  const checkedThirdObservation = JSON.parse(readFileSync(path.join(auditRoot, "cycle_03/cycle_03_observation.json"), "utf8"));
  assert.deepEqual(thirdObservation, checkedThirdObservation);
  const threeCycleLedger = buildUniversalCatalogPilotLedgerV1([observation, secondObservation, thirdObservation]);
  const checkedThreeCycleLedger = JSON.parse(readFileSync(path.join(auditRoot, "cycle_03/pilot_ledger_v1.json"), "utf8"));
  assert.deepEqual(threeCycleLedger, checkedThreeCycleLedger);
  assert.equal(threeCycleLedger.observed_cycle_count, 3);
  assert.equal(threeCycleLedger.qualifying_cycle_count, 0);
  const fourthTaskEnvelope = JSON.parse(readFileSync(
    path.join(repoRoot, "docs/audits/ruflo_operations_adapter_v1/universal_catalog_shadow_pilot_v1/ruflo-universal-catalog-shadow-cycle-04-20261020.task_envelope_v1.json"),
    "utf8",
  ));
  const fourthEvidence = readDiscoveryEvidenceV1({ evidenceDir: fourthEvidenceDir });
  const fourthObservation = buildUniversalCatalogShadowObservationV1({
    envelope: fourthTaskEnvelope,
    evidence: fourthEvidence,
    cycleNumber: 4,
  });
  const checkedFourthObservation = JSON.parse(readFileSync(path.join(auditRoot, "cycle_04/cycle_04_observation.json"), "utf8"));
  assert.deepEqual(fourthObservation, checkedFourthObservation);
  const fourCycleLedger = buildUniversalCatalogPilotLedgerV1([
    observation,
    secondObservation,
    thirdObservation,
    fourthObservation,
  ]);
  const checkedFourCycleLedger = JSON.parse(readFileSync(path.join(auditRoot, "cycle_04/pilot_ledger_v1.json"), "utf8"));
  assert.deepEqual(fourCycleLedger, checkedFourCycleLedger);
  assert.equal(fourCycleLedger.observed_cycle_count, 4);
  assert.equal(fourCycleLedger.qualifying_cycle_count, 0);
  const fifthTaskEnvelope = JSON.parse(readFileSync(
    path.join(repoRoot, "docs/audits/ruflo_operations_adapter_v1/universal_catalog_shadow_pilot_v1/ruflo-universal-catalog-shadow-cycle-05-20261020.task_envelope_v1.json"),
    "utf8",
  ));
  const fifthEvidence = readDiscoveryEvidenceV1({ evidenceDir: fifthEvidenceDir });
  const fifthObservation = buildUniversalCatalogShadowObservationV1({
    envelope: fifthTaskEnvelope,
    evidence: fifthEvidence,
    cycleNumber: 5,
  });
  const checkedFifthObservation = JSON.parse(readFileSync(path.join(auditRoot, "cycle_05/cycle_05_observation.json"), "utf8"));
  assert.deepEqual(fifthObservation, checkedFifthObservation);
  const fiveCycleLedger = buildUniversalCatalogPilotLedgerV1([
    observation,
    secondObservation,
    thirdObservation,
    fourthObservation,
    fifthObservation,
  ]);
  const checkedFiveCycleLedger = JSON.parse(readFileSync(path.join(auditRoot, "cycle_05/pilot_ledger_v1.json"), "utf8"));
  assert.deepEqual(fiveCycleLedger, checkedFiveCycleLedger);
  assert.equal(fiveCycleLedger.observed_cycle_count, 5);
  assert.equal(fiveCycleLedger.qualifying_cycle_count, 0);
  const sixthTaskEnvelope = JSON.parse(readFileSync(
    path.join(repoRoot, "docs/audits/ruflo_operations_adapter_v1/universal_catalog_shadow_pilot_v1/ruflo-universal-catalog-shadow-cycle-06-20261020.task_envelope_v1.json"),
    "utf8",
  ));
  const sixthEvidence = readDiscoveryEvidenceV1({ evidenceDir: sixthEvidenceDir });
  const sixthObservation = buildUniversalCatalogShadowObservationV1({
    envelope: sixthTaskEnvelope,
    evidence: sixthEvidence,
    cycleNumber: 6,
  });
  const checkedSixthObservation = JSON.parse(readFileSync(path.join(auditRoot, "cycle_06/cycle_06_observation.json"), "utf8"));
  assert.deepEqual(sixthObservation, checkedSixthObservation);
  const sixCycleLedger = buildUniversalCatalogPilotLedgerV1([
    observation,
    secondObservation,
    thirdObservation,
    fourthObservation,
    fifthObservation,
    sixthObservation,
  ]);
  const checkedSixCycleLedger = JSON.parse(readFileSync(path.join(auditRoot, "cycle_06/pilot_ledger_v1.json"), "utf8"));
  assert.deepEqual(sixCycleLedger, checkedSixCycleLedger);
  assert.equal(sixCycleLedger.observed_cycle_count, 6);
  assert.equal(sixCycleLedger.qualifying_cycle_count, 0);
  const seventhTaskEnvelope = JSON.parse(readFileSync(
    path.join(repoRoot, "docs/audits/ruflo_operations_adapter_v1/universal_catalog_shadow_pilot_v1/ruflo-universal-catalog-shadow-cycle-07-20261021.task_envelope_v1.json"),
    "utf8",
  ));
  const seventhEvidence = readDiscoveryEvidenceV1({ evidenceDir: seventhEvidenceDir });
  const seventhObservation = buildUniversalCatalogShadowObservationV1({
    envelope: seventhTaskEnvelope,
    evidence: seventhEvidence,
    cycleNumber: 7,
  });
  const checkedSeventhObservation = JSON.parse(readFileSync(path.join(auditRoot, "cycle_07/cycle_07_observation.json"), "utf8"));
  assert.deepEqual(seventhObservation, checkedSeventhObservation);
  const sevenCycleLedger = buildUniversalCatalogPilotLedgerV1([
    observation,
    secondObservation,
    thirdObservation,
    fourthObservation,
    fifthObservation,
    sixthObservation,
    seventhObservation,
  ]);
  const checkedSevenCycleLedger = JSON.parse(readFileSync(path.join(auditRoot, "cycle_07/pilot_ledger_v1.json"), "utf8"));
  assert.deepEqual(sevenCycleLedger, checkedSevenCycleLedger);
  assert.equal(sevenCycleLedger.observed_cycle_count, 7);
  assert.equal(sevenCycleLedger.qualifying_cycle_count, 0);
  assert.equal(sevenCycleLedger.readiness, "collecting");
  const baseline = JSON.parse(readFileSync(path.join(auditRoot, "prepilot_baseline_runs_v1.json"), "utf8"));
  assert.equal(baseline.runs.length, 7);
  assert.equal(baseline.counts_toward_ruflo_pilot_minimum, false);
});
