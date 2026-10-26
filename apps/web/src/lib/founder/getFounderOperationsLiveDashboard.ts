import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getFounderGovernedPricingPlatformSummary,
  type FounderGovernedPricingPlatformSummary,
} from "@/lib/founder/getGovernedPricingPlatformSummary";
import { createServerComponentClient } from "@/lib/supabase/server";

type AdminClient = SupabaseClient;

export type FounderOperationsAgentHealth = {
  agentKey: string;
  displayName: string;
  domain: string;
  executionPlatform: string;
  sourceLocator: string;
  health: string;
  isPaused: boolean;
  pausedReason: string | null;
  lastHeartbeatAt: string | null;
  lastSuccessAt: string | null;
  latestRunStatus: string | null;
  latestRunAt: string | null;
};

export type FounderOperationsSourceSync = {
  runKey: string;
  status: string;
  observedOn: string | null;
  requestCount: number;
  categoryCount: number;
  groupCount: number;
  productCount: number;
  priceRowCount: number;
  failedCount: number;
  startedAt: string | null;
  finishedAt: string | null;
};

export type FounderOperationsPricingCompletion = {
  runStatus: string;
  observedAt: string | null;
  completionStatus: string;
  publishedCount: number;
  nonPublishedCount: number;
  identityMappingBacklogCount: number;
  pokemonBacklogRows: number;
  pokemonSourceProducts: number;
  pokemonQueuedProducts: number;
  pokemonReviewCandidates: number;
  verifiedAutomaticCandidates: number | null;
  blockedMappingProducts: number | null;
  nextAction: string | null;
};

export type FounderOperationsLiveDashboard = {
  generatedAt: string;
  agents: FounderOperationsAgentHealth[];
  agentSummary: {
    total: number;
    healthy: number;
    running: number;
    attention: number;
    paused: number;
  };
  sourceSync: FounderOperationsSourceSync | null;
  pricingCompletion: FounderOperationsPricingCompletion | null;
  queue: {
    actionableWorkItems: number;
    queuedCommands: number;
    runningCommands: number;
    failedCommands: number;
    openIncidents: number;
  };
  pricing: FounderGovernedPricingPlatformSummary | null;
  errors: string[];
};

type AgentHealthRow = {
  agent_key: string;
  display_name: string;
  domain: string;
  execution_platform: string;
  source_locator: string;
  health: string;
  is_paused: boolean;
  paused_reason: string | null;
  last_heartbeat_at: string | null;
  last_success_at: string | null;
  latest_run_status: string | null;
  latest_run_at: string | null;
};

type SourceSyncRow = {
  run_key: string;
  status: string;
  observed_on: string | null;
  request_count: number | null;
  category_count: number | null;
  group_count: number | null;
  product_count: number | null;
  price_row_count: number | null;
  failed_count: number | null;
  started_at: string | null;
  finished_at: string | null;
};

type PricingCompletionRunRow = {
  status: string;
  summary: Record<string, unknown> | null;
  heartbeat_at: string | null;
};

function numberValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nullableNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function countValue(result: { count: number | null }) {
  return numberValue(result.count);
}

function describeFailure(label: string, reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason);
  return `${label}: ${message}`;
}

export async function getFounderOperationsLiveDashboard(
  admin: AdminClient,
): Promise<FounderOperationsLiveDashboard> {
  const session = await createServerComponentClient();
  const results = await Promise.allSettled([
    session.rpc("founder_operations_agent_health_v1"),
    admin
      .from("tcgcsv_source_sync_runs")
      .select("run_key,status,observed_on,request_count,category_count,group_count,product_count,price_row_count,failed_count,started_at,finished_at")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("founder_work_items")
      .select("id", { count: "exact", head: true })
      .in("state", ["ready_for_review", "deferred"])
      .gt("expires_at", new Date().toISOString()),
    admin.from("operations_commands").select("id", { count: "exact", head: true }).eq("status", "queued"),
    admin.from("operations_commands").select("id", { count: "exact", head: true }).eq("status", "running"),
    admin
      .from("operations_commands")
      .select("id,founder_work_items!inner(state)", { count: "exact", head: true })
      .eq("status", "failed")
      .eq("founder_work_items.state", "failed"),
    admin.from("operations_incidents").select("id", { count: "exact", head: true }).eq("status", "open"),
    getFounderGovernedPricingPlatformSummary(admin),
    admin
      .from("operations_agent_runs")
      .select("status,summary,heartbeat_at,operations_agents!inner(agent_key)")
      .eq("operations_agents.agent_key", "tcgplayer-pricing-completion-v1")
      .eq("status", "succeeded")
      .order("heartbeat_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const errors: string[] = [];
  const [agentResult, sourceResult, workItemResult, queuedResult, runningResult, failedResult, incidentResult, pricingResult, completionResult] = results;

  let agents: FounderOperationsAgentHealth[] = [];
  if (agentResult.status === "fulfilled" && !agentResult.value.error) {
    agents = ((agentResult.value.data ?? []) as AgentHealthRow[]).map((row) => ({
      agentKey: row.agent_key,
      displayName: row.display_name,
      domain: row.domain,
      executionPlatform: row.execution_platform,
      sourceLocator: row.source_locator,
      health: row.health,
      isPaused: row.is_paused,
      pausedReason: row.paused_reason,
      lastHeartbeatAt: row.last_heartbeat_at,
      lastSuccessAt: row.last_success_at,
      latestRunStatus: row.latest_run_status,
      latestRunAt: row.latest_run_at,
    }));
  } else if (agentResult.status === "rejected") {
    errors.push(describeFailure("Agent health", agentResult.reason));
  } else {
    errors.push(`Agent health: ${agentResult.value.error?.message ?? "Unavailable"}`);
  }

  let sourceSync: FounderOperationsSourceSync | null = null;
  if (sourceResult.status === "fulfilled" && !sourceResult.value.error && sourceResult.value.data) {
    const row = sourceResult.value.data as SourceSyncRow;
    sourceSync = {
      runKey: row.run_key,
      status: row.status,
      observedOn: row.observed_on,
      requestCount: numberValue(row.request_count),
      categoryCount: numberValue(row.category_count),
      groupCount: numberValue(row.group_count),
      productCount: numberValue(row.product_count),
      priceRowCount: numberValue(row.price_row_count),
      failedCount: numberValue(row.failed_count),
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    };
  } else if (sourceResult.status === "rejected") {
    errors.push(describeFailure("Source sync", sourceResult.reason));
  } else if (sourceResult.value.error) {
    errors.push(`Source sync: ${sourceResult.value.error.message}`);
  }

  const countResults = [
    ["Actionable work items", workItemResult],
    ["Queued commands", queuedResult],
    ["Running commands", runningResult],
    ["Failed commands", failedResult],
    ["Open incidents", incidentResult],
  ] as const;
  for (const [label, result] of countResults) {
    if (result.status === "rejected") errors.push(describeFailure(label, result.reason));
    else if (result.value.error) errors.push(`${label}: ${result.value.error.message}`);
  }

  let pricing: FounderGovernedPricingPlatformSummary | null = null;
  if (pricingResult.status === "fulfilled") pricing = pricingResult.value;
  else errors.push(describeFailure("Pricing platform", pricingResult.reason));

  let pricingCompletion: FounderOperationsPricingCompletion | null = null;
  if (completionResult.status === "fulfilled" && !completionResult.value.error && completionResult.value.data) {
    const row = completionResult.value.data as unknown as PricingCompletionRunRow;
    const summary = row.summary ?? {};
    const lanes = (summary.identity_repair_lanes ?? {}) as Record<string, unknown>;
    const pokemon = (lanes.pokemon ?? {}) as Record<string, unknown>;
    const review = (summary.ollama_review_candidates ?? {}) as Record<string, unknown>;
    pricingCompletion = {
      runStatus: row.status,
      observedAt: row.heartbeat_at,
      completionStatus: String(summary.completion_status ?? "unknown"),
      publishedCount: numberValue(summary.published_count as number | null),
      nonPublishedCount: numberValue(summary.non_published_count as number | null),
      identityMappingBacklogCount: numberValue(summary.identity_mapping_backlog_count as number | null),
      pokemonBacklogRows: numberValue(pokemon.backlog_rows as number | null),
      pokemonSourceProducts: numberValue(pokemon.source_products as number | null),
      pokemonQueuedProducts: numberValue(pokemon.queued_products as number | null),
      pokemonReviewCandidates: numberValue(review.pokemon as number | null),
      verifiedAutomaticCandidates: nullableNumberValue(summary.verified_mapping_candidates),
      blockedMappingProducts: nullableNumberValue(summary.blocked_mapping_products),
      nextAction: typeof summary.next_action === "string" ? summary.next_action : null,
    };
  } else if (completionResult.status === "rejected") {
    errors.push(describeFailure("Pricing completion agent", completionResult.reason));
  } else if (completionResult.value.error) {
    errors.push(`Pricing completion agent: ${completionResult.value.error.message}`);
  }

  const healthy = agents.filter((agent) => agent.health === "healthy").length;
  const running = agents.filter((agent) => agent.health === "running").length;
  const paused = agents.filter((agent) => agent.health === "paused").length;
  const attention = agents.filter((agent) => !["healthy", "running"].includes(agent.health)).length;

  return {
    generatedAt: new Date().toISOString(),
    agents,
    agentSummary: { total: agents.length, healthy, running, attention, paused },
    sourceSync,
    pricingCompletion,
    queue: {
      actionableWorkItems: workItemResult.status === "fulfilled" ? countValue(workItemResult.value) : 0,
      queuedCommands: queuedResult.status === "fulfilled" ? countValue(queuedResult.value) : 0,
      runningCommands: runningResult.status === "fulfilled" ? countValue(runningResult.value) : 0,
      failedCommands: failedResult.status === "fulfilled" ? countValue(failedResult.value) : 0,
      openIncidents: incidentResult.status === "fulfilled" ? countValue(incidentResult.value) : 0,
    },
    pricing,
    errors,
  };
}
