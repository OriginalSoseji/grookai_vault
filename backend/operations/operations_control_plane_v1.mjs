import { createHash } from "node:crypto";

export const OPERATIONS_AGENT_PROTOCOL_VERSION = "OPERATIONS_AGENT_PROTOCOL_V1";
export const FOUNDER_WORK_ITEM_CONTRACT_VERSION = "FOUNDER_WORK_ITEM_COMMAND_V1";
export const FOUNDER_OPERATIONS_CLIENT_VERSION = "FOUNDER_OPERATIONS_MOBILE_V1";

const SECRET_KEY_PATTERN = /(authorization|token|secret|password|service.?role|api.?key|cookie)/i;

export function stableJsonV1(value) {
  if (Array.isArray(value)) return `[${value.map(stableJsonV1).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJsonV1(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function operationsSha256V1(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(
    typeof value === "string" ? value : stableJsonV1(value),
  );
  return createHash("sha256").update(bytes).digest("hex");
}

export function assertOperationsPayloadSafeV1(value, path = "payload") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertOperationsPayloadSafeV1(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      throw new Error(`Sensitive operations payload key is prohibited: ${path}.${key}`);
    }
    assertOperationsPayloadSafeV1(entry, `${path}.${key}`);
  }
}

export function validateOperationsAgentV1(agent) {
  if (!agent || typeof agent !== "object" || Array.isArray(agent)) {
    throw new Error("Operations agent must be an object");
  }
  if (!/^[a-z0-9][a-z0-9_.-]{2,127}$/.test(String(agent.agent_key ?? ""))) {
    throw new Error("Operations agent_key is invalid");
  }
  for (const key of ["display_name", "domain", "execution_platform", "source_locator"]) {
    if (!String(agent[key] ?? "").trim()) throw new Error(`Operations agent ${key} is required`);
  }
  for (const key of ["allowed_work_item_types", "allowed_command_actions"]) {
    if (!Array.isArray(agent[key]) || agent[key].some((entry) => !String(entry).trim())) {
      throw new Error(`Operations agent ${key} must be a non-empty string array`);
    }
  }
  assertOperationsPayloadSafeV1(agent);
  return agent;
}

export function validateFounderWorkItemV1(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error("Founder work item must be an object");
  }
  for (const key of [
    "work_item_key", "work_item_type", "action_type", "agent_key", "title",
    "summary", "domain", "risk_level", "plan_fingerprint", "expires_at",
  ]) {
    if (!String(item[key] ?? "").trim()) throw new Error(`Founder work item ${key} is required`);
  }
  if (!/^[a-f0-9]{64}$/.test(item.plan_fingerprint)) {
    throw new Error("Founder work item plan_fingerprint must be lowercase SHA-256");
  }
  if (!item.plan_payload || typeof item.plan_payload !== "object" || Array.isArray(item.plan_payload)) {
    throw new Error("Founder work item plan_payload must be an object");
  }
  if (Number.isNaN(Date.parse(item.expires_at))) throw new Error("Founder work item expiry is invalid");
  assertOperationsPayloadSafeV1(item);
  return item;
}

export function buildCatalogDiscoveryAgentV1() {
  return validateOperationsAgentV1({
    agent_key: "universal-catalog-discovery-v1",
    display_name: "Universal Catalog Discovery",
    domain: "catalog",
    owner_label: "Grookai Catalog Operations",
    description: "Official-source discovery and evidence-only canonical gap reconciliation.",
    execution_platform: "github_actions",
    source_locator: ".github/workflows/universal-catalog-discovery.yml",
    schedule_kind: "cron",
    schedule_expression: "17 */6 * * *",
    heartbeat_interval_seconds: 21600,
    stale_after_seconds: 50400,
    allowed_work_item_types: ["catalog_set_candidate_review"],
    allowed_command_actions: ["review_catalog_set_candidate"],
    contract_version: OPERATIONS_AGENT_PROTOCOL_VERSION,
    executor_version: null,
    escalation_policy: {
      stale_severity: "high",
      failure_severity: "high",
      recovery_notification: true,
      founder_pause_allowed: true,
    },
  });
}

function clean(value) {
  return String(value ?? "").trim();
}

function safeKey(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "");
}

function titleGame(gameCode) {
  if (gameCode === "one_piece") return "One Piece";
  if (gameCode === "mtg") return "Magic: The Gathering";
  if (gameCode === "pokemon") return "Pokemon";
  return clean(gameCode) || "Collectible";
}

export function buildCatalogSetWorkItemsV1({
  candidates,
  discoverySummary,
  artifactHashes,
  sourceCommitSha,
  sourceRunUri,
  createdAt = new Date().toISOString(),
  expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString(),
}) {
  if (!Array.isArray(candidates)) throw new Error("Catalog candidates must be an array");
  const summaryFingerprint = operationsSha256V1(discoverySummary ?? {});
  return candidates.map((candidate) => {
    const gameCode = clean(candidate.game_code);
    const sourceSetKey = clean(candidate.source_set_id || candidate.source_code || candidate.source_name);
    const planPayload = {
      proposal_kind: "catalog_set_candidate_review",
      proposal_version: FOUNDER_WORK_ITEM_CONTRACT_VERSION,
      created_at: createdAt,
      source_commit_sha: clean(sourceCommitSha) || null,
      source_run_uri: clean(sourceRunUri) || null,
      discovery_summary_fingerprint_sha256: summaryFingerprint,
      candidate,
      review_boundary: {
        database_writes: false,
        storage_writes: false,
        publication_writes: false,
        writer_dispatches: false,
      },
    };
    const planFingerprint = operationsSha256V1(planPayload);
    const itemKey = ["catalog-set", safeKey(gameCode), safeKey(candidate.source_id), safeKey(sourceSetKey)]
      .filter(Boolean).join(":");
    const evidence = [];
    for (const name of ["canonical_promotion_candidates.json", "summary.json"]) {
      const sha256 = clean(artifactHashes?.[name]);
      if (!/^[a-f0-9]{64}$/.test(sha256)) continue;
      evidence.push({
        evidence_key: `${safeKey(sourceRunUri || sourceCommitSha || createdAt)}:${name}`,
        sha256,
        media_type: "application/json",
        source_uri: sourceRunUri ? `${sourceRunUri}#artifact-${name}` : null,
        durable_uri: null,
        retention_class: "workflow_90_day",
        role: name === "canonical_promotion_candidates.json" ? "frozen_plan" : "run_summary",
        summary: `Universal catalog discovery ${name}`,
        metadata: { artifact_name: name },
      });
    }
    const workItem = {
      work_item_key: itemKey,
      work_item_type: "catalog_set_candidate_review",
      action_type: "review_catalog_set_candidate",
      agent_key: "universal-catalog-discovery-v1",
      title: `Review ${titleGame(gameCode)} set: ${clean(candidate.source_name || candidate.source_code)}`,
      summary: `${clean(candidate.status || "catalog gap")} from ${clean(candidate.source_id)}; review official evidence before a source-specific writer package is built.`,
      domain: "catalog",
      risk_level: "medium",
      scope: {
        game_code: gameCode,
        source_id: clean(candidate.source_id),
        source_set_id: clean(candidate.source_set_id) || null,
        source_code: clean(candidate.source_code) || null,
        source_name: clean(candidate.source_name),
        release_date: clean(candidate.release_date) || null,
        expected_card_count: candidate.expected_card_count ?? null,
        canonical_reconciliation_status: clean(candidate.status),
        missing_card_count: candidate.missing_card_count ?? null,
      },
      exclusions: [
        "no database writes",
        "no Storage writes",
        "no image pointer updates",
        "no pricing or Vault writes",
        "no public visibility change",
        "no writer dispatch",
      ],
      plan_payload: planPayload,
      plan_fingerprint: planFingerprint,
      source_commit_sha: clean(sourceCommitSha) || null,
      contract_version: FOUNDER_WORK_ITEM_CONTRACT_VERSION,
      executor_version: null,
      requires_recent_auth: false,
      command_policy: {
        execution_enabled: false,
        reason: "review_only_until_source_specific_writer_package_is_frozen",
      },
      expires_at: expiresAt,
      evidence,
    };
    return validateFounderWorkItemV1(workItem);
  });
}

export async function callOperationsRpcV1({
  supabaseUrl,
  serviceRoleKey,
  functionName,
  body,
  fetchImpl = fetch,
}) {
  if (!/^https:\/\//.test(String(supabaseUrl ?? ""))) throw new Error("HTTPS SUPABASE_URL is required");
  if (!String(serviceRoleKey ?? "").trim()) throw new Error("SUPABASE_SECRET_KEY is required");
  if (!/^[a-z0-9_]+$/.test(String(functionName ?? ""))) throw new Error("Invalid RPC function name");
  const response = await fetchImpl(`${String(supabaseUrl).replace(/\/$/, "")}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Operations RPC ${functionName} failed (${response.status}): ${payload?.message ?? "unknown"}`);
  }
  return payload;
}

export async function publishOperationsIncidentV1({
  incident,
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = fetch,
}) {
  if (!incident || typeof incident !== "object" || Array.isArray(incident)) {
    throw new Error("Operations incident must be an object");
  }
  for (const key of ["incident_key", "agent_key", "incident_type", "severity", "title", "summary"]) {
    if (!String(incident[key] ?? "").trim()) throw new Error(`Operations incident ${key} is required`);
  }
  if (!["critical", "high", "warning", "info"].includes(incident.severity)) {
    throw new Error("Operations incident severity is invalid");
  }
  assertOperationsPayloadSafeV1(incident);
  return callOperationsRpcV1({
    supabaseUrl,
    serviceRoleKey,
    functionName: "operations_publish_incident_v1",
    body: { p_incident: incident },
    fetchImpl,
  });
}

export async function recoverOperationsIncidentV1({
  incidentKey,
  resolutionNote,
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = fetch,
}) {
  if (!String(incidentKey ?? "").trim()) throw new Error("Operations incident key is required");
  return callOperationsRpcV1({
    supabaseUrl,
    serviceRoleKey,
    functionName: "operations_recover_incident_v1",
    body: {
      p_incident_key: String(incidentKey).trim(),
      p_resolution_note: String(resolutionNote ?? "").trim() || null,
    },
    fetchImpl,
  });
}

export async function runOperationsMaintenanceV1({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = fetch,
}) {
  return callOperationsRpcV1({
    supabaseUrl,
    serviceRoleKey,
    functionName: "operations_run_maintenance_v1",
    body: {},
    fetchImpl,
  });
}

export async function publishCatalogWorkItemsV1({
  agent,
  workItems,
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = fetch,
}) {
  validateOperationsAgentV1(agent);
  workItems.forEach(validateFounderWorkItemV1);
  await callOperationsRpcV1({
    supabaseUrl,
    serviceRoleKey,
    functionName: "operations_register_agent_v1",
    body: { p_agent: agent },
    fetchImpl,
  });
  const runKey = `publisher-${operationsSha256V1(workItems).slice(0, 20)}`;
  await callOperationsRpcV1({
    supabaseUrl,
    serviceRoleKey,
    functionName: "operations_agent_heartbeat_v1",
    body: {
      p_heartbeat: {
        agent_key: agent.agent_key,
        run_key: runKey,
        status: "running",
        summary: { work_item_count: workItems.length, published_count: 0 },
      },
    },
    fetchImpl,
  });
  const receipts = [];
  try {
    for (const item of workItems) {
      const receipt = await callOperationsRpcV1({
        supabaseUrl,
        serviceRoleKey,
        functionName: "operations_publish_work_item_v1",
        body: { p_item: item },
        fetchImpl,
      });
      receipts.push({ work_item_key: item.work_item_key, receipt });
    }
    await callOperationsRpcV1({
      supabaseUrl,
      serviceRoleKey,
      functionName: "operations_agent_heartbeat_v1",
      body: {
        p_heartbeat: {
          agent_key: agent.agent_key,
          run_key: runKey,
          status: "succeeded",
          summary: {
            work_item_count: workItems.length,
            published_count: receipts.length,
          },
        },
      },
      fetchImpl,
    });
  } catch (error) {
    await callOperationsRpcV1({
      supabaseUrl,
      serviceRoleKey,
      functionName: "operations_agent_heartbeat_v1",
      body: {
        p_heartbeat: {
          agent_key: agent.agent_key,
          run_key: runKey,
          status: "failed",
          summary: {
            work_item_count: workItems.length,
            published_count: receipts.length,
            error_class: error instanceof Error ? error.name : "UnknownError",
          },
        },
      },
      fetchImpl,
    }).catch(() => {});
    throw error;
  }
  return receipts;
}
