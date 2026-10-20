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
  readDiscoveryEvidenceV1,
} from "../../scripts/ruflo/build_universal_catalog_shadow_pilot_v1.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const evidenceDir = path.join(repoRoot, "tests/fixtures/ruflo/universal_catalog_run_39334612376");

function clone(value) {
  return structuredClone(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function envelope() {
  return {
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
    fingerprint_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  };
}

test("pilot verifies the captured scheduled discovery evidence", () => {
  const evidence = readDiscoveryEvidenceV1({ evidenceDir });
  assert.equal(evidence.metadata.run_id, 39334612376);
  assert.equal(evidence.metadata.event, "schedule");
  assert.equal(evidence.summary.actionable_gap_count, 7);
  assert.equal(evidence.sourceFailures.length, 1);
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
  assert.throws(() => buildUniversalCatalogPilotLedgerV1([observations[0], observations[0]]), /duplicate source run/);
});

test("pilot source has no network, dispatch, execution, database, or destructive Git path", () => {
  const source = readFileSync(path.join(repoRoot, "scripts/ruflo/build_universal_catalog_shadow_pilot_v1.mjs"), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|child_process|execFile|spawn\s*\(|createClient\s*\(|\.rpc\s*\(/);
  assert.doesNotMatch(source, /workflow_dispatch\s*\(|agent_execute\s*\(|git\s+(?:clean|reset|checkout|branch\s+-D|worktree\s+remove)/i);
});

test("checked-in first-cycle observation and ledger reproduce from frozen evidence", () => {
  const auditRoot = path.join(repoRoot, "docs/audits/ruflo_universal_catalog_shadow_pilot_v1");
  const manifest = JSON.parse(readFileSync(path.join(auditRoot, "artifact_hashes.json"), "utf8"));
  assert.equal(manifest.workflow_dispatched_by_ruflo, false);
  assert.equal(manifest.agent_executed_by_ruflo, false);
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
  const baseline = JSON.parse(readFileSync(path.join(auditRoot, "prepilot_baseline_runs_v1.json"), "utf8"));
  assert.equal(baseline.runs.length, 7);
  assert.equal(baseline.counts_toward_ruflo_pilot_minimum, false);
});
