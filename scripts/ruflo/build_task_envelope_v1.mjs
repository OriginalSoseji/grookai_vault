import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertNoSensitiveKeysV1,
  normalizeAbsolutePath,
  normalizeRepoPath,
  readRegistryV1,
} from "./validate_agent_registry_v1.mjs";
import { stableJsonV1 } from "./build_operations_read_model_v1.mjs";

export const TASK_ENVELOPE_VERSION = "RUFLO_TASK_ENVELOPE_V1";

const TOP_LEVEL_KEYS = new Set([
  "task_id", "parent_goal", "agent_key", "repository", "objective", "inclusions",
  "exclusions", "non_goals", "inputs", "budgets", "expected_artifacts",
  "acceptance_tests", "evidence_expectations",
]);
const REPOSITORY_KEYS = new Set(["remote", "commit_sha", "ref", "worktree_path", "initial_status_sha256"]);
const INPUT_KEYS = new Set(["locator", "sha256"]);
const BUDGET_KEYS = new Set(["time_seconds", "row_limit", "request_limit", "cost_usd", "concurrency"]);
const EVIDENCE_KEYS = new Set(["direct_readback_required", "retention_class"]);
const PROHIBITED_KEY_PATTERN = /(authorization|token|secret|password|service.?role|api.?key|cookie|command|payload|arguments?|argv|shell|workflow|dispatch|agent_execute|tool_call)/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertObject(value, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
}

function assertOnlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    assert(allowed.has(key), `${label}.${key} is not allowed`);
    assert(!PROHIBITED_KEY_PATTERN.test(key), `${label}.${key} is prohibited`);
  }
}

function clean(value) {
  return String(value ?? "").trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function worktreeStatusFingerprintV1(worktree) {
  return sha256(stableJsonV1({
    path: worktree.path,
    branch: worktree.branch ?? null,
    head: worktree.head ?? null,
    detached: worktree.detached === true,
    status_available: worktree.status_available === true,
    dirty: worktree.dirty,
    change_count: worktree.change_count,
    protection: worktree.protection,
    write_allowed: worktree.write_allowed,
    cleanup_authorized: worktree.cleanup_authorized,
  }));
}

function validateStringArray(value, label, { allowEmpty = true, repoPaths = false } = {}) {
  assert(Array.isArray(value), `${label} must be an array`);
  assert(allowEmpty || value.length > 0, `${label} must not be empty`);
  return value.map((entry, index) => {
    const result = clean(entry);
    assert(result, `${label}[${index}] must be a non-empty string`);
    if (repoPaths) {
      const normalized = normalizeRepoPath(result);
      assert(!path.isAbsolute(normalized), `${label}[${index}] must be repository-relative`);
      assert(!normalized.split("/").includes(".."), `${label}[${index}] must not traverse outside the repository`);
      return normalized;
    }
    return result;
  });
}

function validateBudget(value, key) {
  assert(typeof value === "number" && Number.isFinite(value) && value >= 0, `spec.budgets.${key} must be a non-negative number`);
  if (key !== "cost_usd") assert(Number.isInteger(value), `spec.budgets.${key} must be an integer`);
  return value;
}

export function buildTaskEnvelopeV1({ spec, registry, inventory, repoRoot }) {
  assertNoSensitiveKeysV1(spec, "spec");
  assertObject(spec, "spec");
  assertOnlyKeys(spec, TOP_LEVEL_KEYS, "spec");
  assert(/^[a-z0-9][a-z0-9_.-]{2,127}$/.test(clean(spec.task_id)), "spec.task_id is invalid");
  assert(clean(spec.parent_goal), "spec.parent_goal is required");
  const agent = registry.agents.find((entry) => entry.agent_key === spec.agent_key);
  assert(agent, `spec.agent_key is not registered: ${clean(spec.agent_key)}`);
  assert(agent.execution_enabled === false, "registered agent must remain non-executable");
  assert(["R0", "R1"].includes(agent.permission_tier), "registered agent exceeds the read-only rollout tier");

  assertObject(spec.repository, "spec.repository");
  assertOnlyKeys(spec.repository, REPOSITORY_KEYS, "spec.repository");
  assert(clean(spec.repository.remote), "spec.repository.remote is required");
  assert(/^[a-f0-9]{40}$/.test(spec.repository.commit_sha), "spec.repository.commit_sha must be an exact lowercase 40-character commit SHA");
  assert(clean(spec.repository.ref), "spec.repository.ref is required");
  assert(/^[a-f0-9]{64}$/.test(spec.repository.initial_status_sha256), "spec.repository.initial_status_sha256 must be a lowercase SHA-256");
  const normalizedWorktree = normalizeAbsolutePath(spec.repository.worktree_path);
  const inventoryWorktree = inventory.worktrees.find((entry) => normalizeAbsolutePath(entry.path) === normalizedWorktree);
  assert(inventoryWorktree, "spec.repository.worktree_path is absent from the read-only inventory");
  assert(inventoryWorktree.protection === "protected", "spec.repository.worktree_path must be protected");
  assert(inventoryWorktree.write_allowed === false, "spec.repository.worktree_path must remain read-only");
  assert(inventoryWorktree.cleanup_authorized === false, "spec.repository.worktree_path must not authorize cleanup");
  assert(inventoryWorktree.head === spec.repository.commit_sha, "spec.repository.commit_sha must match the inventoried worktree HEAD");
  if (inventoryWorktree.branch) assert(inventoryWorktree.branch === spec.repository.ref, "spec.repository.ref must match the inventoried branch");
  assert(
    spec.repository.initial_status_sha256 === worktreeStatusFingerprintV1(inventoryWorktree),
    "spec.repository.initial_status_sha256 must match the inventoried worktree state",
  );

  const objective = clean(spec.objective);
  assert(objective, "spec.objective is required");
  const inclusions = validateStringArray(spec.inclusions, "spec.inclusions", { allowEmpty: false });
  const exclusions = validateStringArray(spec.exclusions, "spec.exclusions", { allowEmpty: false });
  const nonGoals = validateStringArray(spec.non_goals, "spec.non_goals", { allowEmpty: false });

  assert(Array.isArray(spec.inputs) && spec.inputs.length > 0, "spec.inputs must be a non-empty array");
  const inputs = spec.inputs.map((entry, index) => {
    assertObject(entry, `spec.inputs[${index}]`);
    assertOnlyKeys(entry, INPUT_KEYS, `spec.inputs[${index}]`);
    const locator = validateStringArray([entry.locator], `spec.inputs[${index}].locator`, { allowEmpty: false, repoPaths: true })[0];
    assert(/^[a-f0-9]{64}$/.test(entry.sha256), `spec.inputs[${index}].sha256 must be a lowercase SHA-256`);
    assert(repoRoot, "repoRoot is required to verify input fingerprints");
    const actualSha256 = sha256(readFileSync(path.resolve(repoRoot, locator)));
    assert(actualSha256 === entry.sha256, `spec.inputs[${index}].sha256 does not match ${locator}`);
    return { locator, sha256: entry.sha256 };
  });

  assertObject(spec.budgets, "spec.budgets");
  assertOnlyKeys(spec.budgets, BUDGET_KEYS, "spec.budgets");
  const budgets = Object.fromEntries([...BUDGET_KEYS].map((key) => [key, validateBudget(spec.budgets[key], key)]));
  assert(budgets.concurrency <= 4, "spec.budgets.concurrency exceeds the rollout maximum of 4");
  const expectedArtifacts = validateStringArray(spec.expected_artifacts, "spec.expected_artifacts", { allowEmpty: false, repoPaths: true });
  const acceptanceTests = validateStringArray(spec.acceptance_tests, "spec.acceptance_tests", { allowEmpty: false });
  assertObject(spec.evidence_expectations, "spec.evidence_expectations");
  assertOnlyKeys(spec.evidence_expectations, EVIDENCE_KEYS, "spec.evidence_expectations");
  assert(spec.evidence_expectations.direct_readback_required === true, "spec.evidence_expectations.direct_readback_required must be true");
  assert(clean(spec.evidence_expectations.retention_class), "spec.evidence_expectations.retention_class is required");

  const core = {
    envelope_version: TASK_ENVELOPE_VERSION,
    task_id: spec.task_id,
    parent_goal: spec.parent_goal,
    agent: {
      agent_key: agent.agent_key,
      integration_class: agent.integration_class,
      permission_tier: "R0",
      memory_namespace: `${agent.ruflo.memory_namespace}/${spec.task_id}/${spec.repository.commit_sha}`,
    },
    lifecycle: { initial_state: "validated", execution_state: "not_started" },
    repository: {
      remote: spec.repository.remote,
      commit_sha: spec.repository.commit_sha,
      ref: spec.repository.ref,
      worktree_path: inventoryWorktree.path,
      initial_status_sha256: spec.repository.initial_status_sha256,
      inventory_fingerprint_sha256: inventory.inventory_fingerprint_sha256,
      protection: "protected",
      write_allowed: false,
    },
    scope: { objective, inclusions, exclusions, non_goals: nonGoals },
    inputs,
    resource_locks: agent.resource_locks.map((lock) => ({ key: lock.key, mode: "read" })),
    budgets,
    expected_artifacts: expectedArtifacts,
    acceptance_tests: acceptanceTests,
    evidence_expectations: {
      direct_readback_required: true,
      retention_class: spec.evidence_expectations.retention_class,
    },
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

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find((entry) => entry.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function repoFile(repoRoot, value, label) {
  const normalized = normalizeRepoPath(value);
  assert(normalized && !path.isAbsolute(normalized) && !normalized.split("/").includes(".."), `${label} must be repository-relative without traversal`);
  return path.resolve(repoRoot, normalized);
}

function main() {
  const repoRoot = path.resolve(argument("repo-root", process.cwd()));
  const input = argument("input");
  assert(input, "--input=<repository-relative task spec.json> is required");
  const registryPath = argument("registry", "config/ruflo/agent_registry_v1.json");
  const inventoryPath = argument("inventory", "docs/audits/ruflo_agent_registry_v1/current_inventory_v1.json");
  const approvedRoot = path.resolve(repoRoot, "docs/audits/ruflo_operations_adapter_v1");
  const outDir = path.resolve(repoRoot, argument("out-dir", "docs/audits/ruflo_operations_adapter_v1"));
  assert(outDir === approvedRoot || outDir.startsWith(`${approvedRoot}${path.sep}`), "out-dir must remain under docs/audits/ruflo_operations_adapter_v1");
  const spec = JSON.parse(readFileSync(repoFile(repoRoot, input, "input"), "utf8"));
  const inventory = JSON.parse(readFileSync(repoFile(repoRoot, inventoryPath, "inventory"), "utf8"));
  const { registry } = readRegistryV1(registryPath, { repoRoot });
  const envelope = buildTaskEnvelopeV1({ spec, registry, inventory, repoRoot });
  mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, `${spec.task_id}.task_envelope_v1.json`);
  writeFileSync(outputPath, `${JSON.stringify(envelope, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: "pass", output: normalizeRepoPath(path.relative(repoRoot, outputPath)), fingerprint_sha256: envelope.fingerprint_sha256, boundaries: envelope.boundaries }, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) main();
