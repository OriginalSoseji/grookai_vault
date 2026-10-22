import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildOperationsReadModelV1, stableJsonV1 } from "../../scripts/ruflo/build_operations_read_model_v1.mjs";
import { buildTaskEnvelopeV1, worktreeStatusFingerprintV1 } from "../../scripts/ruflo/build_task_envelope_v1.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, "config/ruflo/agent_registry_v1.json"), "utf8"));
const inventory = JSON.parse(fs.readFileSync(path.join(repoRoot, "docs/audits/ruflo_agent_registry_v1/current_inventory_v1.json"), "utf8"));
const snapshot = JSON.parse(fs.readFileSync(path.join(repoRoot, "tests/fixtures/ruflo/operations_health_snapshot_v1.json"), "utf8"));

function clone(value) {
  return structuredClone(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const portableRepoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ruflo-envelope-contract-"));
const portableWorktreePath = portableRepoRoot.replaceAll("\\", "/");
fs.mkdirSync(path.join(portableRepoRoot, "config/ruflo"), { recursive: true });
fs.mkdirSync(path.join(portableRepoRoot, "tests/fixtures/ruflo"), { recursive: true });
fs.copyFileSync(path.join(repoRoot, "config/ruflo/agent_registry_v1.json"), path.join(portableRepoRoot, "config/ruflo/agent_registry_v1.json"));
fs.copyFileSync(path.join(repoRoot, "tests/fixtures/ruflo/operations_health_snapshot_v1.json"), path.join(portableRepoRoot, "tests/fixtures/ruflo/operations_health_snapshot_v1.json"));
execFileSync("git", ["init", "-b", "fixture"], { cwd: portableRepoRoot, stdio: "ignore" });
execFileSync("git", ["config", "user.name", "Ruflo Contract"], { cwd: portableRepoRoot });
execFileSync("git", ["config", "user.email", "ruflo-contract@example.invalid"], { cwd: portableRepoRoot });
execFileSync("git", ["add", "config/ruflo/agent_registry_v1.json", "tests/fixtures/ruflo/operations_health_snapshot_v1.json"], { cwd: portableRepoRoot, stdio: "ignore" });
execFileSync("git", ["commit", "-m", "fixture"], { cwd: portableRepoRoot, stdio: "ignore" });
const portableCommitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: portableRepoRoot, encoding: "utf8" }).trim();
const portableInventory = clone(inventory);
const portableWorktree = portableInventory.worktrees.find((entry) => entry.path === "C:/gv_ruflo_readonly_adapter_20261017");
assert.ok(portableWorktree, "expected adapter worktree in frozen inventory");
Object.assign(portableWorktree, {
  path: portableWorktreePath,
  branch: "fixture",
  head: portableCommitSha,
  detached: false,
  status_available: true,
  dirty: false,
  change_count: 0,
});
const portableInventoryCore = clone(portableInventory);
delete portableInventoryCore.generated_at;
delete portableInventoryCore.inventory_fingerprint_sha256;
portableInventory.inventory_fingerprint_sha256 = sha256(stableJsonV1(portableInventoryCore));
test.after(() => fs.rmSync(portableRepoRoot, { recursive: true, force: true }));

function taskSpec() {
  const worktree = portableWorktree;
  return {
    task_id: "ruflo-readonly-catalog-health-20261017",
    parent_goal: "Observe registered Grookai agent health without dispatching work",
    agent_key: "universal-catalog-discovery-v1",
    inventory_fingerprint_sha256: portableInventory.inventory_fingerprint_sha256,
    repository: {
      remote: "OriginalSoseji/grookai_vault",
      commit_sha: worktree.head,
      ref: worktree.branch,
      worktree_path: worktree.path,
      initial_status_sha256: worktreeStatusFingerprintV1(worktree),
    },
    objective: "Build a sanitized read-only health summary.",
    inclusions: ["Registered agent health and evidence references"],
    exclusions: ["Production mutation"],
    non_goals: ["Agent execution", "Workflow dispatch", "Worktree cleanup"],
    inputs: [{
      locator: "tests/fixtures/ruflo/operations_health_snapshot_v1.json",
      sha256: "6cdaa59efa5cd752b093f04f4417276d89c0f488932d651dd706fbfd9cec6b47",
    }],
    budgets: { time_seconds: 60, row_limit: 100, request_limit: 0, cost_usd: 0, concurrency: 1 },
    expected_artifacts: ["docs/audits/ruflo_operations_adapter_v1/operations_read_model_v1.json"],
    acceptance_tests: ["Ruflo adapter contract suite passes"],
    evidence_expectations: { direct_readback_required: true, retention_class: "repository_checkpoint" },
  };
}

test("read adapter preserves authoritative periodic staleness and event idle health", () => {
  const model = buildOperationsReadModelV1({ snapshot: clone(snapshot), registry });
  const periodic = model.agents.find((agent) => agent.agent_key === "universal-catalog-discovery-v1");
  const eventAgent = model.agents.find((agent) => agent.agent_key === "catalog-set-outcome-v1");
  assert.equal(periodic.health, "stale");
  assert.equal(periodic.lifecycle_state, "registered");
  assert.equal(periodic.topology_role, "operations_agent");
  assert.equal(periodic.action_risk, "read_only");
  assert.equal(periodic.heartbeat_interval_seconds, 21600);
  assert.equal(periodic.stale_after_seconds, 50400);
  assert.equal(eventAgent.schedule_kind, "event");
  assert.equal(eventAgent.health, "healthy");
  assert.equal(eventAgent.lifecycle_state, "registered");
  assert.equal(eventAgent.action_risk, "external_write");
  assert.equal(model.boundaries.agent_execution, false);
  assert.equal(model.boundaries.workflow_dispatch, false);
  assert.equal(model.boundaries.production_writes, false);
});

test("read adapter rejects unknown agents", () => {
  const candidate = clone(snapshot);
  candidate.agents[0].agent_key = "unknown-agent-v1";
  assert.throws(() => buildOperationsReadModelV1({ snapshot: candidate, registry }), /not registered/);

  const impossibleHealth = clone(snapshot);
  impossibleHealth.agents[0].health = "degraded";
  assert.throws(() => buildOperationsReadModelV1({ snapshot: impossibleHealth, registry }), /health is invalid/);
});

test("read adapter rejects secret-shaped and executable fields", () => {
  const secretCandidate = clone(snapshot);
  secretCandidate.api_token = "not-a-real-secret";
  assert.throws(() => buildOperationsReadModelV1({ snapshot: secretCandidate, registry }), /Sensitive registry key is prohibited/);
  const executableCandidate = clone(snapshot);
  executableCandidate.agents[0].command = "do-not-run";
  assert.throws(() => buildOperationsReadModelV1({ snapshot: executableCandidate, registry }), /not allowed|executable data/);

  const uriEvidence = clone(snapshot);
  uriEvidence.agents[0].evidence_refs[0].locator = "https://example.com/artifact.json";
  assert.throws(() => buildOperationsReadModelV1({ snapshot: uriEvidence, registry }), /must not use a URI scheme/);
});

test("read adapter rejects stale health for event and manual agents", () => {
  const candidate = clone(snapshot);
  candidate.agents[1].health = "stale";
  assert.throws(() => buildOperationsReadModelV1({ snapshot: candidate, registry }), /cannot be stale for event agents/);
});

test("read adapter rejects health that contradicts the latest run", () => {
  const candidate = clone(snapshot);
  candidate.agents[1].health = "healthy";
  candidate.agents[1].latest_run_status = "failed";
  assert.throws(() => buildOperationsReadModelV1({ snapshot: candidate, registry }), /latest failed run requires failed health/);

  const falselyPaused = clone(snapshot);
  falselyPaused.agents[1].health = "paused";
  falselyPaused.agents[1].is_paused = false;
  falselyPaused.agents[1].latest_run_status = "failed";
  assert.throws(() => buildOperationsReadModelV1({ snapshot: falselyPaused, registry }), /is_paused must be true when health is paused/);

  const impossibleUnknown = clone(snapshot);
  impossibleUnknown.agents[1].health = "unknown";
  assert.throws(
    () => buildOperationsReadModelV1({ snapshot: impossibleUnknown, registry }),
    /unknown health requires null heartbeat and latest run status/,
  );

  const missingUnknown = clone(snapshot);
  missingUnknown.agents[1].last_heartbeat_at = null;
  missingUnknown.agents[1].latest_run_status = null;
  missingUnknown.agents[1].latest_run_at = null;
  assert.throws(
    () => buildOperationsReadModelV1({ snapshot: missingUnknown, registry }),
    /null heartbeat and latest run status require unknown health/,
  );

  const statusWithoutTimestamp = clone(snapshot);
  statusWithoutTimestamp.agents[1].health = "failed";
  statusWithoutTimestamp.agents[1].latest_run_status = "failed";
  statusWithoutTimestamp.agents[1].latest_run_at = null;
  assert.throws(
    () => buildOperationsReadModelV1({ snapshot: statusWithoutTimestamp, registry }),
    /latest_run_status and latest_run_at must be jointly null or non-null/,
  );

  const timestampWithoutStatus = clone(snapshot);
  timestampWithoutStatus.agents[1].latest_run_status = null;
  assert.throws(
    () => buildOperationsReadModelV1({ snapshot: timestampWithoutStatus, registry }),
    /latest_run_status and latest_run_at must be jointly null or non-null/,
  );

  const periodicMissingHeartbeat = clone(snapshot);
  periodicMissingHeartbeat.agents[0].last_heartbeat_at = null;
  periodicMissingHeartbeat.agents[0].health = "healthy";
  assert.throws(
    () => buildOperationsReadModelV1({ snapshot: periodicMissingHeartbeat, registry }),
    /missing periodic heartbeat requires stale health/,
  );

  periodicMissingHeartbeat.agents[0].health = "stale";
  assert.doesNotThrow(
    () => buildOperationsReadModelV1({ snapshot: periodicMissingHeartbeat, registry }),
  );
});

test("task envelope is deterministic, protected, and permanently non-executable", () => {
  const first = buildTaskEnvelopeV1({ spec: taskSpec(), registry, inventory: portableInventory, repoRoot: portableRepoRoot });
  const second = buildTaskEnvelopeV1({ spec: taskSpec(), registry, inventory: portableInventory, repoRoot: portableRepoRoot });
  assert.deepEqual(first, second);
  assert.match(first.fingerprint_sha256, /^[a-f0-9]{64}$/);
  assert.equal(first.agent.permission_tier, "R0");
  assert.equal(first.agent.lifecycle_state, "registered");
  assert.equal(first.agent.topology_role, "operations_agent");
  assert.equal(first.agent.action_risk, "read_only");
  assert.equal(first.lifecycle.execution_state, "not_started");
  assert.deepEqual(first.boundaries, {
    execution_enabled: false,
    workflow_dispatch: false,
    production_writes: false,
    external_actions: false,
    cleanup: false,
    cross_worktree_writes: false,
  });
});

test("task envelope normalizes task IDs consistently", () => {
  const padded = taskSpec();
  padded.task_id = "  ruflo-readonly-catalog-health-20261017  ";
  const envelope = buildTaskEnvelopeV1({ spec: padded, registry, inventory: portableInventory, repoRoot: portableRepoRoot });
  assert.equal(envelope.task_id, "ruflo-readonly-catalog-health-20261017");
  assert.match(envelope.agent.memory_namespace, /\/ruflo-readonly-catalog-health-20261017\//);
  assert.doesNotMatch(envelope.agent.memory_namespace, /\s/);
});

test("task envelope rejects mutable refs, unknown worktrees, and traversal", () => {
  const shortSha = taskSpec();
  shortSha.repository.commit_sha = "deadbeef";
  assert.throws(() => buildTaskEnvelopeV1({ spec: shortSha, registry, inventory: portableInventory, repoRoot: portableRepoRoot }), /exact lowercase 40-character/);

  const unknownTree = taskSpec();
  unknownTree.repository.worktree_path = path.join(portableRepoRoot, "not-in-the-inventory");
  assert.throws(() => buildTaskEnvelopeV1({ spec: unknownTree, registry, inventory: portableInventory, repoRoot: portableRepoRoot }), /absent from the read-only inventory/);

  const traversal = taskSpec();
  traversal.expected_artifacts = ["../escape.json"];
  assert.throws(() => buildTaskEnvelopeV1({ spec: traversal, registry, inventory: portableInventory, repoRoot: portableRepoRoot }), /must not traverse/);

  const uri = taskSpec();
  uri.expected_artifacts = ["https://example.com/result.json"];
  assert.throws(() => buildTaskEnvelopeV1({ spec: uri, registry, inventory: portableInventory, repoRoot: portableRepoRoot }), /must not use a URI scheme/);

  const detachedInventory = clone(portableInventory);
  const detachedWorktree = detachedInventory.worktrees.find((entry) => entry.path === portableWorktreePath);
  detachedWorktree.branch = null;
  detachedWorktree.detached = true;
  const detachedCore = clone(detachedInventory);
  delete detachedCore.generated_at;
  delete detachedCore.inventory_fingerprint_sha256;
  detachedInventory.inventory_fingerprint_sha256 = sha256(stableJsonV1(detachedCore));

  const unrelatedDetachedRef = taskSpec();
  unrelatedDetachedRef.inventory_fingerprint_sha256 = detachedInventory.inventory_fingerprint_sha256;
  unrelatedDetachedRef.repository.ref = "main";
  unrelatedDetachedRef.repository.initial_status_sha256 = worktreeStatusFingerprintV1(detachedWorktree);
  assert.throws(
    () => buildTaskEnvelopeV1({ spec: unrelatedDetachedRef, registry, inventory: detachedInventory, repoRoot: portableRepoRoot }),
    /ref must equal the inventoried commit for a detached worktree/,
  );

  unrelatedDetachedRef.repository.ref = portableCommitSha;
  assert.doesNotThrow(
    () => buildTaskEnvelopeV1({ spec: unrelatedDetachedRef, registry, inventory: detachedInventory, repoRoot: portableRepoRoot }),
  );
});

test("task envelope rejects unknown agents and executable fields", () => {
  const unknownAgent = taskSpec();
  unknownAgent.agent_key = "not-registered-v1";
  assert.throws(() => buildTaskEnvelopeV1({ spec: unknownAgent, registry, inventory: portableInventory, repoRoot: portableRepoRoot }), /not registered/);

  const executable = taskSpec();
  executable.command = "do-not-run";
  assert.throws(() => buildTaskEnvelopeV1({ spec: executable, registry, inventory: portableInventory, repoRoot: portableRepoRoot }), /prohibited|not allowed/);

  const objectRemote = taskSpec();
  objectRemote.repository.remote = { command: "do-not-run" };
  assert.throws(
    () => buildTaskEnvelopeV1({ spec: objectRemote, registry, inventory: portableInventory, repoRoot: portableRepoRoot }),
    /remote must be a non-empty string/,
  );

  const wrongRemote = taskSpec();
  wrongRemote.repository.remote = "another/repository";
  assert.throws(
    () => buildTaskEnvelopeV1({ spec: wrongRemote, registry, inventory: portableInventory, repoRoot: portableRepoRoot }),
    /must identify OriginalSoseji\/grookai_vault/,
  );

  const objectParentGoal = taskSpec();
  objectParentGoal.parent_goal = { command: "do-not-run" };
  assert.throws(
    () => buildTaskEnvelopeV1({ spec: objectParentGoal, registry, inventory: portableInventory, repoRoot: portableRepoRoot }),
    /parent_goal must be a non-empty string/,
  );

  const objectRetention = taskSpec();
  objectRetention.evidence_expectations.retention_class = { command: "do-not-run" };
  assert.throws(
    () => buildTaskEnvelopeV1({ spec: objectRetention, registry, inventory: portableInventory, repoRoot: portableRepoRoot }),
    /retention_class must be a non-empty string/,
  );
});

test("task envelope rejects mismatched worktree-state and input fingerprints", () => {
  const statusMismatch = taskSpec();
  statusMismatch.repository.initial_status_sha256 = "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
  assert.throws(() => buildTaskEnvelopeV1({ spec: statusMismatch, registry, inventory: portableInventory, repoRoot: portableRepoRoot }), /must match the inventoried worktree state/);

  const inputMismatch = taskSpec();
  inputMismatch.inputs[0].sha256 = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  assert.throws(() => buildTaskEnvelopeV1({ spec: inputMismatch, registry, inventory: portableInventory, repoRoot: portableRepoRoot }), /does not match/);
});

test("task envelope validates the frozen inventory before trusting worktree protection", () => {
  const wrongVersion = clone(portableInventory);
  wrongVersion.inventory_version = "UNKNOWN";
  assert.throws(() => buildTaskEnvelopeV1({ spec: taskSpec(), registry, inventory: wrongVersion, repoRoot: portableRepoRoot }), /inventory_version/);

  const wrongRegistry = clone(portableInventory);
  wrongRegistry.registry_sha256 = "a".repeat(64);
  assert.throws(() => buildTaskEnvelopeV1({ spec: taskSpec(), registry, inventory: wrongRegistry, repoRoot: portableRepoRoot }), /registry_sha256/);

  const drifted = clone(portableInventory);
  drifted.worktrees[0].head = "b".repeat(40);
  assert.throws(() => buildTaskEnvelopeV1({ spec: taskSpec(), registry, inventory: drifted, repoRoot: portableRepoRoot }), /content fingerprint/);
});

test("adapter source has no network, database, dispatch, agent execution, or destructive Git path", () => {
  const sources = [
    "scripts/ruflo/build_operations_read_model_v1.mjs",
    "scripts/ruflo/build_task_envelope_v1.mjs",
  ].map((relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8")).join("\n");
  assert.doesNotMatch(sources, /\bfetch\s*\(|createClient\s*\(|\.rpc\s*\(|agent_execute\s*\(|workflow_dispatch\s*\(/);
  assert.doesNotMatch(sources, /git\s+(?:clean|reset|checkout|branch\s+-D|worktree\s+remove)/i);
  assert.match(sources, /execFileSync\("git", \["-C", worktreePath, "show"/);
});

test("runtime protection fetches the immutable commits verified by task envelopes", () => {
  const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/contracts-runtime-protection.yml"), "utf8");
  assert.match(workflow, /- name: Checkout\s+uses: actions\/checkout@v4\s+with:\s+# Ruflo envelopes[^\n]*\s+fetch-depth: 0/);
  assert.equal(workflow.match(/'scripts\/ruflo\/\*\*'/g)?.length, 2);
  assert.equal(workflow.match(/'config\/ruflo\/\*\*'/g)?.length, 2);
});

test("checked-in sample artifacts reproduce and match their manifest", () => {
  const sampleDir = path.join(repoRoot, "docs/audits/ruflo_operations_adapter_v1/sample");
  const manifest = JSON.parse(fs.readFileSync(path.join(sampleDir, "artifact_hashes.json"), "utf8"));
  assert.equal(manifest.live_runtime_readback, false);
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert.equal(sha256(fs.readFileSync(path.join(sampleDir, name))), expected, name);
  }
  const checkedReadModel = JSON.parse(fs.readFileSync(path.join(sampleDir, "operations_read_model_v1.json"), "utf8"));
  assert.deepEqual(buildOperationsReadModelV1({ snapshot: clone(snapshot), registry }), checkedReadModel);
  const checkedSpec = JSON.parse(fs.readFileSync(path.join(sampleDir, "task_spec_v1.json"), "utf8"));
  const checkedEnvelope = JSON.parse(fs.readFileSync(path.join(sampleDir, "ruflo-readonly-catalog-health-20261017.task_envelope_v1.json"), "utf8"));
  assert.deepEqual(buildTaskEnvelopeV1({ spec: checkedSpec, registry, inventory, repoRoot }), checkedEnvelope);
});
