import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertNoSensitiveKeysV1,
  normalizeRepoPath,
  readRegistryV1,
} from "./validate_agent_registry_v1.mjs";

export const OPERATIONS_READ_MODEL_VERSION = "RUFLO_OPERATIONS_READ_MODEL_V1";
export const OPERATIONS_SNAPSHOT_VERSION = "OPERATIONS_AGENT_HEALTH_SNAPSHOT_V1";

const HEALTH_VALUES = new Set(["healthy", "running", "degraded", "failed", "stale", "paused", "unknown"]);
const RUN_STATUS_VALUES = new Set(["queued", "running", "succeeded", "failed", "cancelled"]);
const PERIODIC_SCHEDULES = new Set(["cron", "timer", "continuous"]);
const TOP_LEVEL_KEYS = new Set(["snapshot_version", "captured_at", "source", "agents"]);
const SOURCE_KEYS = new Set(["kind", "locator"]);
const AGENT_KEYS = new Set([
  "agent_key", "display_name", "domain", "execution_platform", "source_locator",
  "health", "is_paused", "paused_reason", "last_heartbeat_at", "last_success_at",
  "stale_after_seconds", "latest_run_status", "latest_run_at", "evidence_refs",
]);
const EVIDENCE_KEYS = new Set(["kind", "locator", "sha256", "captured_at"]);
const EXECUTABLE_KEY_PATTERN = /(command|payload|arguments?|argv|shell|script|workflow_dispatch|agent_execute|tool_call)/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertObject(value, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
}

function assertOnlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    assert(allowed.has(key), `${label}.${key} is not allowed`);
    assert(!EXECUTABLE_KEY_PATTERN.test(key), `${label}.${key} is executable data and is prohibited`);
  }
}

function clean(value) {
  return String(value ?? "").trim();
}

function assertTimestamp(value, label, { nullable = true } = {}) {
  if (value === null && nullable) return null;
  assert(typeof value === "string" && value.length > 0, `${label} must be an ISO timestamp${nullable ? " or null" : ""}`);
  assert(Number.isFinite(Date.parse(value)), `${label} must be an ISO timestamp`);
  return new Date(value).toISOString();
}

function assertRepoRelative(value, label) {
  const normalized = normalizeRepoPath(value);
  assert(normalized, `${label} is required`);
  assert(!path.isAbsolute(normalized), `${label} must be repository-relative`);
  assert(!normalized.split("/").includes(".."), `${label} must not traverse outside the repository`);
  assert(!/[?#]/.test(normalized), `${label} must not contain a URL query or fragment`);
  return normalized;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function stableJsonV1(value) {
  if (Array.isArray(value)) return `[${value.map(stableJsonV1).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJsonV1(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function validateEvidenceRef(value, label) {
  assertObject(value, label);
  assertOnlyKeys(value, EVIDENCE_KEYS, label);
  assert(["repository", "workflow_artifact", "operations_evidence"].includes(value.kind), `${label}.kind is invalid`);
  const locator = assertRepoRelative(value.locator, `${label}.locator`);
  assert(/^[a-f0-9]{64}$/.test(value.sha256), `${label}.sha256 must be a lowercase SHA-256`);
  return {
    kind: value.kind,
    locator,
    sha256: value.sha256,
    captured_at: assertTimestamp(value.captured_at, `${label}.captured_at`, { nullable: false }),
  };
}

function validateAgentSnapshot(value, registryAgent, label) {
  assertObject(value, label);
  assertOnlyKeys(value, AGENT_KEYS, label);
  assert(clean(value.agent_key) === registryAgent.agent_key, `${label}.agent_key does not match the registry`);
  assert(clean(value.display_name) === registryAgent.display_name, `${label}.display_name does not match the registry`);
  assert(clean(value.domain) === registryAgent.domain, `${label}.domain does not match the registry`);
  assert(clean(value.execution_platform) === registryAgent.execution_platform, `${label}.execution_platform does not match the registry`);
  assert(normalizeRepoPath(value.source_locator) === registryAgent.source_locator, `${label}.source_locator does not match the registry`);
  assert(HEALTH_VALUES.has(value.health), `${label}.health is invalid`);
  assert(typeof value.is_paused === "boolean", `${label}.is_paused must be boolean`);
  assert(value.paused_reason === null || typeof value.paused_reason === "string", `${label}.paused_reason must be a string or null`);
  assert(Number.isInteger(value.stale_after_seconds) && value.stale_after_seconds > 0, `${label}.stale_after_seconds must be a positive integer`);
  assert(value.stale_after_seconds === registryAgent.stale_after_seconds, `${label}.stale_after_seconds does not match the registry`);
  assert(value.latest_run_status === null || RUN_STATUS_VALUES.has(value.latest_run_status), `${label}.latest_run_status is invalid`);
  if (!PERIODIC_SCHEDULES.has(registryAgent.schedule_kind)) {
    assert(value.health !== "stale", `${label}.health cannot be stale for ${registryAgent.schedule_kind} agents`);
  }
  if (value.is_paused) assert(value.health === "paused", `${label}.health must be paused when is_paused is true`);
  if (value.health === "running") assert(value.latest_run_status === "running", `${label}.running health requires a running latest run`);
  if (value.health === "failed") assert(value.latest_run_status === "failed", `${label}.failed health requires a failed latest run`);
  const evidenceRefs = value.evidence_refs ?? [];
  assert(Array.isArray(evidenceRefs), `${label}.evidence_refs must be an array`);
  return {
    agent_key: registryAgent.agent_key,
    display_name: registryAgent.display_name,
    domain: registryAgent.domain,
    lifecycle_state: registryAgent.lifecycle_state,
    topology_role: registryAgent.topology_role,
    action_risk: registryAgent.action_risk,
    adoption_state: registryAgent.adoption_state,
    permission_tier: registryAgent.permission_tier,
    schedule_kind: registryAgent.schedule_kind,
    health: value.health,
    is_paused: value.is_paused,
    paused_reason: value.paused_reason,
    last_heartbeat_at: assertTimestamp(value.last_heartbeat_at, `${label}.last_heartbeat_at`),
    last_success_at: assertTimestamp(value.last_success_at, `${label}.last_success_at`),
    heartbeat_interval_seconds: registryAgent.heartbeat_interval_seconds,
    stale_after_seconds: registryAgent.stale_after_seconds,
    latest_run_status: value.latest_run_status,
    latest_run_at: assertTimestamp(value.latest_run_at, `${label}.latest_run_at`),
    evidence_refs: evidenceRefs.map((entry, index) => validateEvidenceRef(entry, `${label}.evidence_refs[${index}]`)),
    execution_enabled: false,
  };
}

export function buildOperationsReadModelV1({ snapshot, registry }) {
  assertNoSensitiveKeysV1(snapshot, "snapshot");
  assertObject(snapshot, "snapshot");
  assertOnlyKeys(snapshot, TOP_LEVEL_KEYS, "snapshot");
  assert(snapshot.snapshot_version === OPERATIONS_SNAPSHOT_VERSION, "snapshot.snapshot_version is invalid");
  const capturedAt = assertTimestamp(snapshot.captured_at, "snapshot.captured_at", { nullable: false });
  assertObject(snapshot.source, "snapshot.source");
  assertOnlyKeys(snapshot.source, SOURCE_KEYS, "snapshot.source");
  assert(snapshot.source.kind === "operations_rpc_export", "snapshot.source.kind must be operations_rpc_export");
  assert(snapshot.source.locator === "founder_operations_agent_health_v1", "snapshot.source.locator is not approved");
  assert(Array.isArray(snapshot.agents), "snapshot.agents must be an array");

  const registryAgents = new Map(registry.agents.map((agent) => [agent.agent_key, agent]));
  const seen = new Set();
  const agents = snapshot.agents.map((entry, index) => {
    const key = clean(entry?.agent_key);
    assert(!seen.has(key), `snapshot.agents contains duplicate agent_key: ${key}`);
    seen.add(key);
    const registered = registryAgents.get(key);
    assert(registered, `snapshot agent is not registered: ${key}`);
    return validateAgentSnapshot(entry, registered, `snapshot.agents[${index}]`);
  }).sort((left, right) => left.agent_key.localeCompare(right.agent_key));

  const summary = Object.fromEntries([...HEALTH_VALUES].sort().map((health) => [health, agents.filter((agent) => agent.health === health).length]));
  const core = {
    read_model_version: OPERATIONS_READ_MODEL_VERSION,
    source_snapshot_version: snapshot.snapshot_version,
    captured_at: capturedAt,
    source: snapshot.source,
    agents,
    summary: { agent_count: agents.length, health_counts: summary },
    boundaries: {
      read_only: true,
      agent_execution: false,
      workflow_dispatch: false,
      production_writes: false,
      external_actions: false,
      cleanup: false,
    },
  };
  return { ...core, fingerprint_sha256: sha256(stableJsonV1(core)) };
}

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find((entry) => entry.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function resolveRepoFile(repoRoot, value, label) {
  return path.resolve(repoRoot, assertRepoRelative(value, label));
}

function assertOutputDirectory(repoRoot, value) {
  const approvedRoot = path.resolve(repoRoot, "docs/audits/ruflo_operations_adapter_v1");
  const resolved = path.resolve(repoRoot, value);
  assert(resolved === approvedRoot || resolved.startsWith(`${approvedRoot}${path.sep}`), "out-dir must remain under docs/audits/ruflo_operations_adapter_v1");
  return resolved;
}

function main() {
  const repoRoot = path.resolve(argument("repo-root", process.cwd()));
  const input = argument("input");
  assert(input, "--input=<repository-relative snapshot.json> is required");
  const registryPath = argument("registry", "config/ruflo/agent_registry_v1.json");
  const outDir = assertOutputDirectory(repoRoot, argument("out-dir", "docs/audits/ruflo_operations_adapter_v1"));
  const snapshot = JSON.parse(readFileSync(resolveRepoFile(repoRoot, input, "input"), "utf8"));
  const { registry } = readRegistryV1(registryPath, { repoRoot });
  const readModel = buildOperationsReadModelV1({ snapshot, registry });
  mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, "operations_read_model_v1.json");
  writeFileSync(outputPath, `${JSON.stringify(readModel, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: "pass", output: normalizeRepoPath(path.relative(repoRoot, outputPath)), fingerprint_sha256: readModel.fingerprint_sha256, boundaries: readModel.boundaries }, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) main();
