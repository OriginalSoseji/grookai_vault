import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REGISTRY_VERSION = "RUFLO_AGENT_REGISTRY_V1";
export const READ_ONLY_PERMISSION_TIERS = new Set(["R0", "R1"]);
export const LIFECYCLE_STATES = new Set(["registered", "unregistered", "retired"]);
export const TOPOLOGY_ROLES = new Set(["operations_agent", "domain_supervisor", "bounded_worker"]);
export const ACTION_RISKS = new Set(["read_only", "source_write", "external_write"]);
export const ADOPTION_STATES = new Set([
  "not_adopted",
  "observed",
  "pilot",
  "coordinated",
  "execution_eligible",
  "held",
]);
export const SCHEDULE_KINDS = new Set(["cron", "timer", "continuous", "event", "manual"]);
export const SECRET_KEY_PATTERN = /(authorization|token|secret|password|service.?role|api.?key|cookie)/i;

const REQUIRED_FALSE_BOUNDARIES = [
  "agent_execution",
  "workflow_dispatch",
  "production_writes",
  "external_actions",
  "branch_cleanup",
  "worktree_cleanup",
  "cross_worktree_writes",
];

const REQUIRED_AGENT_FALSE_BOUNDARIES = [
  "production_writes",
  "external_actions",
  "workflow_dispatch",
  "cleanup",
];

function clean(value) {
  return String(value ?? "").trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertPlainObject(value, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
}

function assertStringArray(value, label, { allowEmpty = true } = {}) {
  assert(Array.isArray(value), `${label} must be an array`);
  assert(allowEmpty || value.length > 0, `${label} must not be empty`);
  assert(value.every((entry) => clean(entry)), `${label} must contain non-empty strings`);
  assert(new Set(value).size === value.length, `${label} must not contain duplicates`);
}

export function normalizeRepoPath(value) {
  return clean(value).replaceAll("\\", "/").replace(/^\.\//, "");
}

export function normalizeAbsolutePath(value) {
  return clean(value).replaceAll("\\", "/").replace(/\/$/, "").toLowerCase();
}

export function assertNoSensitiveKeysV1(value, label = "registry") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSensitiveKeysV1(entry, `${label}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    assert(!SECRET_KEY_PATTERN.test(key), `Sensitive registry key is prohibited: ${label}.${key}`);
    assertNoSensitiveKeysV1(entry, `${label}.${key}`);
  }
}

function assertRepositoryLocator(repoRoot, value, label) {
  const locator = normalizeRepoPath(value);
  assert(locator, `${label} is required`);
  assert(!path.isAbsolute(locator), `${label} must be repository-relative`);
  assert(!locator.split("/").includes(".."), `${label} must not traverse outside the repository`);
  assert(existsSync(path.resolve(repoRoot, locator)), `${label} does not exist: ${locator}`);
  return locator;
}

function validateSurfaceV1(surface, { repoRoot, label }) {
  assertPlainObject(surface, label);
  assert(/^[a-z0-9_.-]+$/.test(clean(surface.surface_key)), `${label}.surface_key is invalid`);
  assert(/^[a-z0-9_.-]+$/.test(clean(surface.surface_kind)), `${label}.surface_kind is invalid`);
  assert(LIFECYCLE_STATES.has(surface.lifecycle_state), `${label}.lifecycle_state is invalid`);
  assert(TOPOLOGY_ROLES.has(surface.topology_role), `${label}.topology_role is invalid`);
  assert(ACTION_RISKS.has(surface.action_risk), `${label}.action_risk is invalid`);
  assert(READ_ONLY_PERMISSION_TIERS.has(surface.permission_tier), `${label}.permission_tier exceeds R1`);
  assert(surface.execution_enabled === false, `${label}.execution_enabled must remain false`);
  assertRepositoryLocator(repoRoot, surface.source_locator, `${label}.source_locator`);
  assert(SCHEDULE_KINDS.has(surface.schedule_kind), `${label}.schedule_kind is invalid`);
  assert(
    surface.schedule_expression === null || clean(surface.schedule_expression),
    `${label}.schedule_expression must be null or non-empty`,
  );
  if (surface.contract !== undefined) {
    assertRepositoryLocator(repoRoot, surface.contract, `${label}.contract`);
  }
}

function validateAgentV1(agent, { repoRoot, index }) {
  const label = `agents[${index}]`;
  assertPlainObject(agent, label);
  assert(/^[a-z0-9][a-z0-9_.-]{2,127}$/.test(clean(agent.agent_key)), `${label}.agent_key is invalid`);
  for (const key of ["display_name", "domain", "owner_label", "execution_platform"]) {
    assert(clean(agent[key]), `${label}.${key} is required`);
  }
  assert(LIFECYCLE_STATES.has(agent.lifecycle_state), `${label}.lifecycle_state is invalid`);
  assert(TOPOLOGY_ROLES.has(agent.topology_role), `${label}.topology_role is invalid`);
  assert(ACTION_RISKS.has(agent.action_risk), `${label}.action_risk is invalid`);
  assert(ADOPTION_STATES.has(agent.adoption_state), `${label}.adoption_state is invalid`);
  assert(READ_ONLY_PERMISSION_TIERS.has(agent.permission_tier), `${label}.permission_tier exceeds R1`);
  assert(agent.execution_enabled === false, `${label}.execution_enabled must remain false`);
  assert(agent.source_ref_policy === "exact_task_commit", `${label}.source_ref_policy must be exact_task_commit`);
  assertRepositoryLocator(repoRoot, agent.source_locator, `${label}.source_locator`);
  assert(SCHEDULE_KINDS.has(agent.schedule_kind), `${label}.schedule_kind is invalid`);
  assert(
    agent.schedule_expression === null || clean(agent.schedule_expression),
    `${label}.schedule_expression must be null or non-empty`,
  );
  assertStringArray(agent.allowed_work_item_types, `${label}.allowed_work_item_types`);
  assertStringArray(agent.allowed_command_actions, `${label}.allowed_command_actions`);
  assertStringArray(agent.contracts, `${label}.contracts`, { allowEmpty: false });
  for (const [contractIndex, contract] of agent.contracts.entries()) {
    assertRepositoryLocator(repoRoot, contract, `${label}.contracts[${contractIndex}]`);
  }

  assert(Array.isArray(agent.resource_locks), `${label}.resource_locks must be an array`);
  const declaredLockKeys = new Set();
  for (const [lockIndex, lock] of agent.resource_locks.entries()) {
    assertPlainObject(lock, `${label}.resource_locks[${lockIndex}]`);
    assert(clean(lock.key), `${label}.resource_locks[${lockIndex}].key is required`);
    assert(!declaredLockKeys.has(lock.key), `${label} has duplicate resource lock declaration: ${lock.key}`);
    declaredLockKeys.add(lock.key);
    assert(["read", "write"].includes(lock.mode), `${label}.resource_locks[${lockIndex}].mode is invalid`);
    assert(lock.mode !== "write", `${label} requests a write lock in the read-only foundation`);
  }

  assertPlainObject(agent.worktree_policy, `${label}.worktree_policy`);
  assert(agent.worktree_policy.write_allowed === false, `${label} must not allow worktree writes`);
  assert(agent.worktree_policy.assigned_path === null, `${label} must not assign a writable worktree`);
  assertPlainObject(agent.evidence, `${label}.evidence`);
  assert(clean(agent.evidence.retention_class), `${label}.evidence.retention_class is required`);
  assert(agent.evidence.direct_readback_required === true, `${label} must require direct readback`);
  assertPlainObject(agent.ruflo, `${label}.ruflo`);
  assert(
    new RegExp(`^grookai/${agent.domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/${agent.agent_key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`).test(agent.ruflo.memory_namespace),
    `${label}.ruflo.memory_namespace must match its domain and agent_key`,
  );
  assertPlainObject(agent.boundaries, `${label}.boundaries`);
  for (const boundary of REQUIRED_AGENT_FALSE_BOUNDARIES) {
    assert(agent.boundaries[boundary] === false, `${label}.boundaries.${boundary} must remain false`);
  }

  if (agent.lifecycle_state !== "registered" || agent.adoption_state === "held") {
    assert(agent.execution_enabled === false, `${label} held or unregistered agent cannot execute`);
  }
  if (agent.lifecycle_state === "unregistered") {
    assert(["not_adopted", "held"].includes(agent.adoption_state), `${label} unregistered lifecycle requires not_adopted or held adoption`);
  }
  if (agent.lifecycle_state === "retired") {
    assert(agent.adoption_state === "held", `${label} retired lifecycle must remain held`);
  }
}

export function validateRegistryV1(registry, { repoRoot = process.cwd() } = {}) {
  assertPlainObject(registry, "registry");
  assertNoSensitiveKeysV1(registry);
  assert(registry.schema_version === REGISTRY_VERSION, `schema_version must be ${REGISTRY_VERSION}`);
  assert(registry.mode === "read_only_foundation", "mode must remain read_only_foundation");
  assertStringArray(registry.authority_order, "authority_order", { allowEmpty: false });

  assertPlainObject(registry.boundaries, "boundaries");
  for (const boundary of REQUIRED_FALSE_BOUNDARIES) {
    assert(registry.boundaries[boundary] === false, `boundaries.${boundary} must remain false`);
  }

  assert(Array.isArray(registry.surface_rules) && registry.surface_rules.length >= 3, "surface_rules must classify the repository automation roots");
  const surfaceKinds = new Set();
  for (const [index, rule] of registry.surface_rules.entries()) {
    const label = `surface_rules[${index}]`;
    assertPlainObject(rule, label);
    assert(/^[a-z0-9_.-]+$/.test(clean(rule.surface_kind)), `${label}.surface_kind is invalid`);
    assert(!surfaceKinds.has(rule.surface_kind), `Duplicate surface_kind: ${rule.surface_kind}`);
    surfaceKinds.add(rule.surface_kind);
    assertRepositoryLocator(repoRoot, rule.root, `${label}.root`);
    assert(clean(rule.pattern), `${label}.pattern is required`);
    try {
      new RegExp(rule.pattern, "i");
    } catch {
      throw new Error(`${label}.pattern is not a valid regular expression`);
    }
    assert(LIFECYCLE_STATES.has(rule.lifecycle_state), `${label}.lifecycle_state is invalid`);
    assert(TOPOLOGY_ROLES.has(rule.topology_role), `${label}.topology_role is invalid`);
    assert(ACTION_RISKS.has(rule.action_risk), `${label}.action_risk is invalid`);
    assert(READ_ONLY_PERMISSION_TIERS.has(rule.permission_tier), `${label}.permission_tier exceeds R1`);
  }

  assert(Array.isArray(registry.host_lanes), "host_lanes must be an array");
  const surfaceKeys = new Set();
  registry.host_lanes.forEach((surface, index) => {
    validateSurfaceV1(surface, { repoRoot, label: `host_lanes[${index}]` });
    assert(!surfaceKeys.has(surface.surface_key), `Duplicate host surface_key: ${surface.surface_key}`);
    surfaceKeys.add(surface.surface_key);
  });

  assert(Array.isArray(registry.protected_roots) && registry.protected_roots.length > 0, "protected_roots must not be empty");
  const protectedRoots = new Set();
  for (const [index, root] of registry.protected_roots.entries()) {
    const label = `protected_roots[${index}]`;
    assertPlainObject(root, label);
    assert(clean(root.path), `${label}.path is required`);
    const normalized = normalizeAbsolutePath(root.path);
    assert(/^(?:[a-z]:\/|\/)/.test(normalized), `${label}.path must be absolute`);
    assert(!protectedRoots.has(normalized), `Duplicate protected root: ${root.path}`);
    protectedRoots.add(normalized);
    assert(root.policy === "protected", `${label}.policy must be protected`);
    assert(root.write_allowed === false, `${label}.write_allowed must remain false`);
    assert(clean(root.reason), `${label}.reason is required`);
  }

  assert(Array.isArray(registry.agents) && registry.agents.length > 0, "agents must not be empty");
  const agentKeys = new Set();
  const declaredWriteLockKeys = new Set();
  registry.agents.forEach((agent, index) => {
    validateAgentV1(agent, { repoRoot, index });
    assert(!agentKeys.has(agent.agent_key), `Duplicate agent_key: ${agent.agent_key}`);
    agentKeys.add(agent.agent_key);
    for (const lock of agent.resource_locks) {
      if (lock.mode !== "write") continue;
      declaredWriteLockKeys.add(lock.key);
    }
  });

  return {
    schema_version: registry.schema_version,
    mode: registry.mode,
    agent_count: registry.agents.length,
    registered_agent_count: registry.agents.filter((agent) => agent.lifecycle_state === "registered").length,
    non_executable_agent_count: registry.agents.filter((agent) => agent.execution_enabled === false).length,
    host_lane_count: registry.host_lanes.length,
    protected_root_count: registry.protected_roots.length,
    write_lock_count: declaredWriteLockKeys.size,
    boundaries: { ...registry.boundaries },
  };
}

export function readRegistryV1(registryPath, { repoRoot = process.cwd() } = {}) {
  const resolved = path.resolve(repoRoot, registryPath);
  const registry = JSON.parse(readFileSync(resolved, "utf8"));
  return { registry, summary: validateRegistryV1(registry, { repoRoot }) };
}

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find((entry) => entry.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function main() {
  const repoRoot = path.resolve(argument("repo-root", process.cwd()));
  const registryPath = argument("registry", "config/ruflo/agent_registry_v1.json");
  const { summary } = readRegistryV1(registryPath, { repoRoot });
  process.stdout.write(`${JSON.stringify({ status: "pass", ...summary }, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) main();
