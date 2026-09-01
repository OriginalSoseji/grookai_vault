import {
  FOUNDER_WORK_ITEM_CONTRACT_VERSION,
  OPERATIONS_AGENT_PROTOCOL_VERSION,
  operationsSha256V1,
  stableJsonV1,
  validateFounderWorkItemV1,
  validateOperationsAgentV1,
} from "./operations_control_plane_v1.mjs";

export const FOUNDER_OUTCOME_WORKFLOW_VERSION = "FOUNDER_OUTCOME_WORKFLOW_V1";
export const FOUNDER_OUTCOME_WORKFLOW_ACTION = "execute_registered_outcome_workflow_v1";
export const FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_VERSION = "FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_V1";
export const FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_KEY = "github-actions:founder-outcome-workflow-v1";

const TOKEN_PATTERN = /^[a-z0-9][a-z0-9_.-]{2,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const STAGE_MODES = new Set(["read_only", "canonical_write", "storage_write", "publication"]);
const STOP_REASONS = new Set([
  "scope_expansion_required",
  "contradictory_evidence",
  "cost_ceiling_exceeded",
  "write_ceiling_exceeded",
  "destructive_action_not_approved",
  "public_action_not_approved",
  "reconciliation_failed",
]);

// Domain workflows are added here only with code-reviewed stage handlers;
// plan payloads cannot add executable behavior.
export const FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1 = Object.freeze([
  Object.freeze({
    workflow_key: "operations_outcome_contract_proof_v1",
    stage_handlers: Object.freeze([
      "verify_frozen_scope_v1",
      "verify_terminal_contract_v1",
    ]),
    max_stages: 2,
    allowed_modes: Object.freeze(["read_only"]),
  }),
  Object.freeze({
    workflow_key: "catalog_set_completion_v1",
    stage_handlers: Object.freeze([
      "verify_catalog_frozen_scope_v1",
      "apply_catalog_frozen_plan_v1",
    ]),
    max_stages: 2,
    allowed_modes: Object.freeze(["read_only", "canonical_write"]),
  }),
]);

function clean(value) {
  return String(value ?? "").trim();
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertToken(value, label) {
  if (!TOKEN_PATTERN.test(clean(value))) throw new Error(`${label} is invalid`);
}

function assertSafeStageValue(value, path = "stage") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSafeStageValue(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (/^(sql|shell|command|script|executable|url|endpoint|environment|secrets?)$/i.test(key)) {
      throw new Error(`${path}.${key} is prohibited in a founder outcome workflow`);
    }
    assertSafeStageValue(nested, `${path}.${key}`);
  }
}

export function buildFounderOutcomeStageV1({
  stageKey,
  handlerKey,
  mode,
  expectedEffects = {},
  exclusions = [],
  maxAttempts = 1,
}) {
  const stage = {
    stage_key: clean(stageKey),
    handler_key: clean(handlerKey),
    mode: clean(mode),
    expected_effects: expectedEffects,
    exclusions,
    max_attempts: Number(maxAttempts),
  };
  stage.stage_fingerprint = operationsSha256V1(stage);
  return stage;
}

export function buildFounderOutcomeWorkflowPlanV1({
  workflowKey,
  stages,
  terminalOutcome,
  automaticTransientRetry = true,
}) {
  const workflow = {
    version: FOUNDER_OUTCOME_WORKFLOW_VERSION,
    workflow_key: clean(workflowKey),
    automatic_transient_retry: automaticTransientRetry === true,
    stages,
    terminal_outcome: terminalOutcome,
    stop_reasons: [...STOP_REASONS].sort(),
  };
  workflow.workflow_fingerprint = operationsSha256V1(workflow);
  return workflow;
}

export function buildFounderOutcomeAgentV1({
  agentKey,
  displayName,
  domain,
  sourceLocator,
  description,
  scheduleKind = "event",
}) {
  return validateOperationsAgentV1({
    agent_key: clean(agentKey),
    display_name: clean(displayName),
    domain: clean(domain),
    owner_label: "Grookai Operations",
    description: clean(description),
    execution_platform: "github_actions",
    source_locator: clean(sourceLocator),
    schedule_kind: scheduleKind,
    schedule_expression: null,
    heartbeat_interval_seconds: 86400,
    stale_after_seconds: 604800,
    allowed_work_item_types: ["founder_outcome_workflow"],
    allowed_command_actions: [FOUNDER_OUTCOME_WORKFLOW_ACTION],
    contract_version: OPERATIONS_AGENT_PROTOCOL_VERSION,
    executor_version: FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_VERSION,
    escalation_policy: {
      stale_severity: "warning",
      failure_severity: "critical",
      recovery_notification: true,
      founder_pause_allowed: true,
    },
  });
}

export function buildFounderOutcomeWorkItemV1({
  workItemKey,
  agentKey,
  title,
  summary,
  domain,
  riskLevel,
  scope,
  exclusions,
  workflow,
  sourceCommitSha,
  evidence = [],
  costCeilingUsd = 0,
  maxAttempts = 3,
  createdAt = new Date().toISOString(),
  expiresAt = new Date(Date.now() + 3 * 86400_000).toISOString(),
  registry = FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
}) {
  if (!SHA1_PATTERN.test(clean(sourceCommitSha))) {
    throw new Error("Founder outcome source commit must be SHA-1");
  }
  validateFounderOutcomeWorkflowPlanV1(workflow, { registry });
  const planPayload = {
    proposal_kind: "founder_outcome_workflow",
    proposal_version: FOUNDER_WORK_ITEM_CONTRACT_VERSION,
    created_at: createdAt,
    expires_at: expiresAt,
    source_commit_sha: clean(sourceCommitSha),
    outcome_workflow: workflow,
  };
  return validateFounderWorkItemV1({
    work_item_key: clean(workItemKey),
    work_item_type: "founder_outcome_workflow",
    action_type: FOUNDER_OUTCOME_WORKFLOW_ACTION,
    agent_key: clean(agentKey),
    title: clean(title),
    summary: clean(summary),
    domain: clean(domain),
    risk_level: clean(riskLevel),
    scope,
    exclusions,
    plan_payload: planPayload,
    plan_fingerprint: operationsSha256V1(planPayload),
    source_commit_sha: clean(sourceCommitSha),
    contract_version: FOUNDER_WORK_ITEM_CONTRACT_VERSION,
    executor_version: FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_VERSION,
    requires_recent_auth: true,
    command_policy: {
      execution_enabled: true,
      cost_ceiling_usd: Number(costCeilingUsd),
      execution_deadline_seconds: 86400,
      max_attempts: Number(maxAttempts),
      retry_policy: "automatic_transient_only_with_founder_exception_fallback",
    },
    expires_at: expiresAt,
    evidence,
  });
}

export function validateFounderOutcomeWorkflowRegistryV1(registry) {
  if (!Array.isArray(registry) || registry.length === 0) {
    throw new Error("Founder outcome workflow registry must be a non-empty array");
  }
  const workflowKeys = new Set();
  for (const recipe of registry) {
    assertObject(recipe, "Founder outcome workflow registry entry");
    assertToken(recipe.workflow_key, "Founder outcome workflow registry key");
    if (workflowKeys.has(recipe.workflow_key)) {
      throw new Error(`Duplicate founder outcome workflow key: ${recipe.workflow_key}`);
    }
    workflowKeys.add(recipe.workflow_key);
    if (!Array.isArray(recipe.stage_handlers) || recipe.stage_handlers.length === 0) {
      throw new Error("Founder outcome workflow recipe must register stage handlers");
    }
    const handlers = new Set();
    for (const handler of recipe.stage_handlers) {
      assertToken(handler, "Founder outcome workflow stage handler");
      if (handlers.has(handler)) throw new Error(`Duplicate founder outcome stage handler: ${handler}`);
      handlers.add(handler);
    }
    if (!Number.isInteger(recipe.max_stages) || recipe.max_stages < 1 || recipe.max_stages > 32) {
      throw new Error("Founder outcome workflow max_stages must be between 1 and 32");
    }
    if (!Array.isArray(recipe.allowed_modes) || recipe.allowed_modes.some((mode) => !STAGE_MODES.has(mode))) {
      throw new Error("Founder outcome workflow allowed_modes are invalid");
    }
  }
  return registry;
}

export function validateFounderOutcomeWorkflowPlanV1(workflow, {
  registry,
  expectedWorkflowFingerprint = null,
} = {}) {
  assertObject(workflow, "Founder outcome workflow");
  if (workflow.version !== FOUNDER_OUTCOME_WORKFLOW_VERSION) {
    throw new Error("Founder outcome workflow version is unsupported");
  }
  assertToken(workflow.workflow_key, "Founder outcome workflow key");
  validateFounderOutcomeWorkflowRegistryV1(registry);
  const recipe = registry.find((entry) => entry.workflow_key === workflow.workflow_key);
  if (!recipe) throw new Error("Founder outcome workflow is not registered");
  if (!Array.isArray(workflow.stages) || workflow.stages.length === 0) {
    throw new Error("Founder outcome workflow must contain stages");
  }
  if (workflow.stages.length > recipe.max_stages) {
    throw new Error("Founder outcome workflow exceeds its registered stage ceiling");
  }
  assertObject(workflow.terminal_outcome, "Founder outcome terminal outcome");
  if (!clean(workflow.terminal_outcome.summary)) {
    throw new Error("Founder outcome terminal summary is required");
  }
  assertSafeStageValue(workflow.terminal_outcome, "workflow.terminal_outcome");
  if (!Array.isArray(workflow.stop_reasons)
      || stableJsonV1([...workflow.stop_reasons].sort()) !== stableJsonV1([...STOP_REASONS].sort())) {
    throw new Error("Founder outcome workflow stop policy changed");
  }
  const seenStages = new Set();
  const allowedHandlers = new Set(recipe.stage_handlers);
  const allowedModes = new Set(recipe.allowed_modes);
  workflow.stages.forEach((stage, index) => {
    assertObject(stage, `Founder outcome stage ${index + 1}`);
    assertToken(stage.stage_key, `Founder outcome stage ${index + 1} key`);
    assertToken(stage.handler_key, `Founder outcome stage ${index + 1} handler`);
    if (seenStages.has(stage.stage_key)) throw new Error(`Duplicate founder outcome stage: ${stage.stage_key}`);
    seenStages.add(stage.stage_key);
    if (!allowedHandlers.has(stage.handler_key)) {
      throw new Error(`Founder outcome stage handler is not registered: ${stage.handler_key}`);
    }
    if (!allowedModes.has(stage.mode)) {
      throw new Error(`Founder outcome stage mode is not registered: ${stage.mode}`);
    }
    assertObject(stage.expected_effects, `Founder outcome stage ${stage.stage_key} expected effects`);
    if (!Array.isArray(stage.exclusions)) {
      throw new Error(`Founder outcome stage ${stage.stage_key} exclusions must be an array`);
    }
    if (!Number.isInteger(stage.max_attempts) || stage.max_attempts < 1 || stage.max_attempts > 3) {
      throw new Error(`Founder outcome stage ${stage.stage_key} max attempts are invalid`);
    }
    if (!SHA256_PATTERN.test(clean(stage.stage_fingerprint))) {
      throw new Error(`Founder outcome stage ${stage.stage_key} fingerprint is invalid`);
    }
    const fingerprintPayload = { ...stage };
    delete fingerprintPayload.stage_fingerprint;
    if (operationsSha256V1(fingerprintPayload) !== stage.stage_fingerprint) {
      throw new Error(`Founder outcome stage ${stage.stage_key} fingerprint changed`);
    }
    assertSafeStageValue(stage, `workflow.stages[${index}]`);
  });
  if (!SHA256_PATTERN.test(clean(workflow.workflow_fingerprint))) {
    throw new Error("Founder outcome workflow fingerprint is invalid");
  }
  const fingerprintPayload = { ...workflow };
  delete fingerprintPayload.workflow_fingerprint;
  const calculatedFingerprint = operationsSha256V1(fingerprintPayload);
  if (calculatedFingerprint !== workflow.workflow_fingerprint) {
    throw new Error("Founder outcome workflow fingerprint changed");
  }
  if (expectedWorkflowFingerprint && calculatedFingerprint !== expectedWorkflowFingerprint) {
    throw new Error("Founder outcome workflow does not match the frozen expected fingerprint");
  }
  return workflow;
}

export function validateFounderOutcomeCommandV1(command, { registry, headSha }) {
  assertObject(command, "Founder outcome command");
  if (command.action_type !== FOUNDER_OUTCOME_WORKFLOW_ACTION) {
    throw new Error("Founder outcome command action mismatch");
  }
  if (command.executor_version !== FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_VERSION) {
    throw new Error("Founder outcome command executor mismatch");
  }
  if (clean(command.frozen_scope?.plan_payload?.source_commit_sha) !== clean(headSha)) {
    throw new Error("Founder outcome command source revision mismatch");
  }
  const workflow = command.frozen_scope?.plan_payload?.outcome_workflow;
  validateFounderOutcomeWorkflowPlanV1(workflow, { registry });
  if (operationsSha256V1(command.frozen_scope.plan_payload) !== command.plan_fingerprint) {
    throw new Error("Founder outcome command plan fingerprint mismatch");
  }
  return workflow;
}

export async function executeFounderOutcomeWorkflowV1({
  workflow,
  registry,
  handlers,
  completedStageKeys = [],
  stageAttemptCounts = {},
  onStageReceipt = async () => {},
}) {
  validateFounderOutcomeWorkflowPlanV1(workflow, { registry });
  assertObject(handlers, "Founder outcome workflow handlers");
  const completed = new Set(completedStageKeys.map(clean));
  const receipts = [];
  for (let index = 0; index < workflow.stages.length; index += 1) {
    const stage = workflow.stages[index];
    if (completed.has(stage.stage_key)) {
      receipts.push({ stage_key: stage.stage_key, status: "already_succeeded" });
      continue;
    }
    const priorAttempts = Number(stageAttemptCounts[stage.stage_key] ?? 0);
    if (!Number.isInteger(priorAttempts) || priorAttempts < 0) {
      throw new Error(`Founder outcome stage attempt state is invalid: ${stage.stage_key}`);
    }
    if (priorAttempts >= stage.max_attempts) {
      throw new Error(`Founder outcome stage attempt ceiling reached: ${stage.stage_key}`);
    }
    const handler = handlers[stage.handler_key];
    if (typeof handler !== "function") {
      throw new Error(`Founder outcome stage implementation is unavailable: ${stage.handler_key}`);
    }
    await onStageReceipt({ stage, stage_index: index, status: "started", result: null });
    try {
      const result = await handler({ stage, stageIndex: index, workflow });
      if (!result || result.reconciled !== true) {
        throw new Error(`Founder outcome stage did not reconcile: ${stage.stage_key}`);
      }
      const receipt = { stage_key: stage.stage_key, status: "succeeded", result };
      receipts.push(receipt);
      await onStageReceipt({ stage, stage_index: index, status: "succeeded", result });
    } catch (error) {
      await onStageReceipt({
        stage,
        stage_index: index,
        status: "failed",
        result: {
          error_class: error instanceof Error ? error.name : "UnknownError",
          error_message: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }
  return {
    reconciled: true,
    workflow_key: workflow.workflow_key,
    workflow_fingerprint: workflow.workflow_fingerprint,
    stage_count: workflow.stages.length,
    receipts,
  };
}
