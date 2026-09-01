import { callOperationsRpcV1 } from "./operations_control_plane_v1.mjs";
import {
  TK_SM_R_APPLY_ACTION,
  TK_SM_R_APPLY_EXECUTOR_KEY,
  TK_SM_R_APPLY_EXECUTOR_VERSION,
} from "./tk_sm_r_founder_apply_v1.mjs";
import {
  FOUNDER_OUTCOME_WORKFLOW_ACTION,
  FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_KEY,
  FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_VERSION,
} from "./founder_outcome_workflow_v1.mjs";

export const FOUNDER_COMMAND_DISPATCHER_VERSION = "FOUNDER_COMMAND_DISPATCHER_V1";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export const FOUNDER_COMMAND_EXECUTOR_REGISTRY_V1 = Object.freeze([
  Object.freeze({
    registry_key: "founder_outcome_workflow_v1",
    action_type: FOUNDER_OUTCOME_WORKFLOW_ACTION,
    executor_key: FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_KEY,
    executor_version: FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_VERSION,
    workflow_handler: "founder_outcome_workflow_v1",
  }),
  Object.freeze({
    registry_key: "tk_sm_r_hidden_set_apply_v1",
    action_type: TK_SM_R_APPLY_ACTION,
    executor_key: TK_SM_R_APPLY_EXECUTOR_KEY,
    executor_version: TK_SM_R_APPLY_EXECUTOR_VERSION,
    workflow_handler: "tk_sm_r_hidden_set_apply_v1",
  }),
]);

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeRpcResult(payload) {
  if (Array.isArray(payload)) return payload[0] ?? null;
  return payload ?? null;
}

export function validateFounderCommandExecutorRegistryV1(registry) {
  if (!Array.isArray(registry) || registry.length === 0) {
    throw new Error("Founder command executor registry must be a non-empty array");
  }
  const keys = new Set();
  const pairs = new Set();
  for (const entry of registry) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Founder command executor registry entry must be an object");
    }
    for (const field of ["registry_key", "action_type", "executor_version", "workflow_handler"]) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,127}$/.test(clean(entry[field]))) {
        throw new Error(`Founder command executor registry ${field} is invalid`);
      }
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{2,127}$/.test(clean(entry.executor_key))) {
      throw new Error("Founder command executor registry executor_key is invalid");
    }
    const key = clean(entry.registry_key);
    const pair = `${clean(entry.action_type)}\n${clean(entry.executor_version)}`;
    if (keys.has(key)) throw new Error(`Duplicate founder command registry key: ${key}`);
    if (pairs.has(pair)) throw new Error("Duplicate founder command action and executor version");
    keys.add(key);
    pairs.add(pair);
  }
  return registry;
}

export function validateResolvedFounderCommandV1(command, registryEntry, now = new Date()) {
  if (!command || typeof command !== "object" || Array.isArray(command)) {
    throw new Error("Resolved founder command must be an object");
  }
  const commandId = clean(command.command_id);
  const actionType = clean(command.action_type);
  const executorVersion = clean(command.executor_version);
  const sourceCommitSha = clean(command.source_commit_sha).toLowerCase();
  const planFingerprint = clean(command.plan_fingerprint).toLowerCase();
  const executionDeadlineAt = clean(command.execution_deadline_at);
  if (!UUID_PATTERN.test(commandId)) throw new Error("Resolved founder command ID is invalid");
  if (actionType !== registryEntry.action_type) {
    throw new Error("Resolved founder command action is not registered");
  }
  if (executorVersion !== registryEntry.executor_version) {
    throw new Error("Resolved founder command executor version is not registered");
  }
  if (!SHA1_PATTERN.test(sourceCommitSha)) {
    throw new Error("Resolved founder command source commit is invalid");
  }
  if (!SHA256_PATTERN.test(planFingerprint)) {
    throw new Error("Resolved founder command plan fingerprint is invalid");
  }
  const deadline = Date.parse(executionDeadlineAt);
  if (!Number.isFinite(deadline) || deadline <= now.getTime()) {
    throw new Error("Resolved founder command execution deadline is invalid or expired");
  }
  return {
    command_id: commandId,
    action_type: actionType,
    executor_key: registryEntry.executor_key,
    executor_version: executorVersion,
    workflow_handler: registryEntry.workflow_handler,
    source_commit_sha: sourceCommitSha,
    plan_fingerprint: planFingerprint,
    execution_deadline_at: new Date(deadline).toISOString(),
  };
}

export async function resolveFounderCommandDispatchV1({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = globalThis.fetch,
  registry = FOUNDER_COMMAND_EXECUTOR_REGISTRY_V1,
  now = new Date(),
} = {}) {
  if (!clean(supabaseUrl) || !clean(serviceRoleKey)) {
    throw new Error("Founder command dispatcher requires Supabase service credentials");
  }
  validateFounderCommandExecutorRegistryV1(registry);
  for (const entry of registry) {
    const payload = await callOperationsRpcV1({
      supabaseUrl,
      serviceRoleKey,
      functionName: "operations_peek_command_action_v1",
      body: {
        p_action_type: entry.action_type,
        p_executor_version: entry.executor_version,
      },
      fetchImpl,
    });
    const command = normalizeRpcResult(payload);
    if (!command) continue;
    return {
      version: FOUNDER_COMMAND_DISPATCHER_VERSION,
      status: "resolved",
      command_found: true,
      registered_action_count: registry.length,
      canonical_writes: false,
      command: validateResolvedFounderCommandV1(command, entry, now),
    };
  }
  return {
    version: FOUNDER_COMMAND_DISPATCHER_VERSION,
    status: "idle",
    command_found: false,
    registered_action_count: registry.length,
    canonical_writes: false,
    command: null,
  };
}
