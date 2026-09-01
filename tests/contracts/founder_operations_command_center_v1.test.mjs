import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertOperationsPayloadSafeV1,
  buildCatalogDiscoveryAgentV1,
  buildCatalogSetWorkItemsV1,
  operationsSha256V1,
  publishCatalogWorkItemsV1,
  publishOperationsIncidentV1,
  recoverOperationsIncidentV1,
  runOperationsMaintenanceV1,
} from "../../backend/operations/operations_control_plane_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const migration = source(
  "supabase/migrations/20260830233000_founder_operations_command_center_v1.sql",
);
const repairMigration = source(
  "supabase/migrations/20260831054500_founder_operations_command_center_repair_v1.sql",
);
const mobileService = source(
  "lib/services/operations/founder_operations_service.dart",
);
const mobileScreen = source(
  "lib/screens/founder/founder_operations_screen.dart",
);
const workflow = source(".github/workflows/universal-catalog-discovery.yml");
const dispatcher = source("supabase/functions/notification-dispatcher/index.ts");
const maintenanceWorkflow = source(
  ".github/workflows/operations-control-plane-maintenance.yml",
);
const maintenanceWorker = source("scripts/workers/operations_maintenance_v1.mjs");

function catalogFixture() {
  return {
    game_code: "one_piece",
    source_id: "bandai_official_en",
    source_set_id: "OP-17",
    source_code: "OP-17",
    source_name: "The World's Strongest Warriors",
    release_date: "2026-08-28",
    expected_card_count: 119,
    database_card_count: 0,
    missing_card_count: 119,
    status: "missing_set",
    source_url: "https://en.onepiece-cardgame.com/cardlist/",
  };
}

test("operations tables are private and founder clients receive RPC access only", () => {
  for (const table of [
    "operations_agents", "operations_agent_runs", "operations_incidents",
    "operations_incident_events",
    "operations_evidence_objects", "founder_work_items",
    "founder_work_item_events", "founder_decisions", "operations_commands",
    "operations_command_attempts", "operations_command_events",
    "founder_agent_control_decisions",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(
      migration,
      new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "i"),
    );
  }
  assert.doesNotMatch(migration, /grant (select|insert|update|delete|all).*founder_work_items.*authenticated/i);
  assert.match(migration, /grant execute on function public\.founder_operations_work_items_v1[\s\S]*authenticated/i);
  assert.match(migration, /current_user_has_founder_entitlement_v1\(\)/g);
});

test("frozen work items and append-only histories are enforced in the database", () => {
  assert.match(migration, /protect_founder_work_item_frozen_fields_v1/);
  assert.match(migration, /founder_work_item_frozen_fields_are_immutable/);
  assert.match(migration, /trg_founder_decisions_append_only/);
  assert.match(migration, /trg_founder_work_item_events_append_only/);
  assert.match(migration, /trg_operations_command_events_append_only/);
  assert.match(migration, /operations_evidence_objects_append_only/);
  assert.match(migration, /trg_operations_incident_events_append_only/);
  assert.match(migration, /trg_founder_agent_control_decisions_append_only/);
});

test("founder decisions are versioned, fingerprint-bound, idempotent, and payload-free", () => {
  assert.match(migration, /founder_decisions_actor_idempotency_unique/);
  assert.match(migration, /v_item\.version <> p_expected_version/);
  assert.match(migration, /v_item\.plan_fingerprint <> lower\(btrim\(p_expected_fingerprint\)\)/);
  assert.match(migration, /founder_work_item_stale_plan/);
  assert.match(migration, /founder_work_item_expired/);
  assert.match(migration, /recent_authentication_required/);
  const signature = migration.match(/create or replace function public\.founder_operations_decide_v1\([\s\S]*?\)\nreturns table/i)?.[0] ?? "";
  assert.doesNotMatch(signature, /payload|sql|shell|command_scope/i);
});

test("commands require a service lease and successful reconciliation", () => {
  assert.match(migration, /operations_require_service_role_v1\(\)/);
  assert.match(migration, /for update of c skip locked limit 1/);
  assert.match(migration, /operations_command_lease_invalid/);
  assert.match(migration, /successful_command_requires_reconciliation/);
  assert.match(migration, /command_preflight_does_not_match_frozen_plan/);
  assert.match(migration, /command_retry_limit_reached/);
  assert.match(migration, /max_attempts between 1 and 10/);
  assert.match(migration, /execution_paused/);
  assert.match(migration, /a\.is_enabled and not a\.is_paused/);
  const commandGrant = migration.match(
    /grant execute on function public\.operations_claim_command_v1\(text, integer\) to [^;]+;/i,
  )?.[0] ?? "";
  assert.match(commandGrant, /to service_role/i);
  assert.doesNotMatch(commandGrant, /authenticated/i);
});

test("incident lifecycle is correlated, recoverable, and isolated from notification failure", () => {
  assert.match(migration, /create or replace function public\.operations_publish_incident_v1/);
  assert.match(migration, /create or replace function public\.operations_recover_incident_v1/);
  assert.match(migration, /incident_key = 'agent-stale:' \|\| v_agent\.agent_key/);
  assert.match(migration, /status = 'recovered'/);
  assert.match(migration, /operations_try_enqueue_notification_v1/);
  assert.match(migration, /exception when others then[\s\S]*operations_notification_enqueue_failed/);
  assert.doesNotMatch(migration, /perform public\.enqueue_operations_notification_v1/);
});

test("maintenance expires plans and leases and opens one stale incident per outage", () => {
  assert.match(migration, /create or replace function public\.operations_run_maintenance_v1/);
  assert.match(migration, /execution_deadline_expired/);
  assert.match(migration, /executor_lease_expired/);
  assert.match(migration, /status in \('recovered', 'resolved'\)/);
  assert.match(migration, /stale_incidents_opened/);
  assert.match(migration, /grant execute on function public\.operations_run_maintenance_v1\(\) to service_role/);
});

test("agent pause and resume are founder-only, audited, and policy-gated", () => {
  assert.match(migration, /create or replace function public\.founder_operations_control_agent_v1/);
  assert.match(migration, /current_user_has_founder_entitlement_v1\(\)/);
  assert.match(migration, /founder_pause_allowed/);
  assert.match(migration, /founder_agent_control_actor_idempotency_unique/);
  assert.match(migration, /grant execute on function public\.founder_operations_control_agent_v1[\s\S]*authenticated/);
  assert.doesNotMatch(migration, /grant (select|insert|update|delete|all).*founder_agent_control_decisions.*authenticated/i);
});

test("mobile operations uses bounded RPCs and never writes protected tables", () => {
  assert.match(mobileService, /founder_operations_counts_v1/);
  assert.match(mobileService, /founder_operations_work_items_v1/);
  assert.match(mobileService, /founder_operations_work_item_v1/);
  assert.match(mobileService, /founder_operations_agent_health_v1/);
  assert.match(mobileService, /founder_operations_decide_v1/);
  assert.match(mobileService, /founder_operations_control_agent_v1/);
  assert.doesNotMatch(mobileService, /\.from\(['"](?:founder_work_items|operations_commands|founder_decisions)/);
  assert.match(mobileScreen, /Approve and queue/);
  assert.match(mobileScreen, /No writer was dispatched/);
  assert.match(mobileScreen, /Request repair/);
  assert.match(mobileScreen, /Add note/);
  assert.match(mobileScreen, /Pause agent/);
  assert.match(mobileScreen, /Resume agent/);
});

test("catalog candidate work item preserves evidence and cannot dispatch a writer", () => {
  const candidate = catalogFixture();
  const hashes = {
    "canonical_promotion_candidates.json": operationsSha256V1([candidate]),
    "summary.json": operationsSha256V1({ actionable_gap_count: 1 }),
  };
  const [item] = buildCatalogSetWorkItemsV1({
    candidates: [candidate],
    discoverySummary: { actionable_gap_count: 1 },
    artifactHashes: hashes,
    sourceCommitSha: "a".repeat(40),
    sourceRunUri: "https://github.com/grookai/grookai/actions/runs/123",
    createdAt: "2026-08-30T00:00:00.000Z",
    expiresAt: "2026-09-06T00:00:00.000Z",
  });
  assert.equal(item.work_item_key, "catalog-set:one_piece:bandai_official_en:op-17");
  assert.equal(item.scope.game_code, "one_piece");
  assert.equal(item.scope.expected_card_count, 119);
  assert.equal(item.command_policy.execution_enabled, false);
  assert.equal(item.plan_payload.review_boundary.database_writes, false);
  assert.equal(item.plan_payload.review_boundary.writer_dispatches, false);
  assert.equal(item.evidence.length, 2);
  assert.equal(item.plan_fingerprint, operationsSha256V1(item.plan_payload));
});

test("operations payload sanitizer rejects secret-shaped fields", () => {
  assert.throws(
    () => assertOperationsPayloadSafeV1({ evidence: { authorization: "Bearer value" } }),
    /Sensitive operations payload key is prohibited/,
  );
  assert.doesNotThrow(() => assertOperationsPayloadSafeV1({ source_commit_sha: "abc" }));
});

test("live publisher reports running and succeeds only after every work item publishes", async () => {
  const calls = [];
  const fetchImpl = async (url, request) => {
    calls.push({ url, body: JSON.parse(request.body) });
    return { ok: true, status: 200, json: async () => [{ ok: true }] };
  };
  const candidate = catalogFixture();
  const workItems = buildCatalogSetWorkItemsV1({
    candidates: [candidate],
    discoverySummary: {},
    artifactHashes: {},
    sourceCommitSha: "b".repeat(40),
    sourceRunUri: null,
  });
  await publishCatalogWorkItemsV1({
    agent: buildCatalogDiscoveryAgentV1(),
    workItems,
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "test-service-role",
    fetchImpl,
  });
  assert.match(calls[0].url, /operations_register_agent_v1$/);
  assert.match(calls[1].url, /operations_agent_heartbeat_v1$/);
  assert.equal(calls[1].body.p_heartbeat.status, "running");
  assert.match(calls[2].url, /operations_publish_work_item_v1$/);
  assert.equal(calls[2].body.p_item.work_item_key, workItems[0].work_item_key);
  assert.match(calls[3].url, /operations_agent_heartbeat_v1$/);
  assert.equal(calls[3].body.p_heartbeat.status, "succeeded");
  assert.equal(calls[3].body.p_heartbeat.summary.published_count, 1);
});

test("live publisher records failed after a partial publication failure", async () => {
  const calls = [];
  const fetchImpl = async (url, request) => {
    const body = JSON.parse(request.body);
    calls.push({ url, body });
    if (url.endsWith("operations_publish_work_item_v1")) {
      return { ok: false, status: 503, json: async () => ({ message: "unavailable" }) };
    }
    return { ok: true, status: 200, json: async () => [{ ok: true }] };
  };
  const workItems = buildCatalogSetWorkItemsV1({
    candidates: [catalogFixture()],
    discoverySummary: {},
    artifactHashes: {},
    sourceCommitSha: "c".repeat(40),
    sourceRunUri: null,
  });
  await assert.rejects(
    publishCatalogWorkItemsV1({
      agent: buildCatalogDiscoveryAgentV1(),
      workItems,
      supabaseUrl: "https://example.supabase.co",
      serviceRoleKey: "test-service-role",
      fetchImpl,
    }),
    /Operations RPC operations_publish_work_item_v1 failed/,
  );
  const heartbeats = calls.filter((call) => call.url.endsWith("operations_agent_heartbeat_v1"));
  assert.deepEqual(heartbeats.map((call) => call.body.p_heartbeat.status), ["running", "failed"]);
  assert.equal(heartbeats[1].body.p_heartbeat.summary.published_count, 0);
});

test("repair migration closes decision races, retry expiry, and deferred count drift", () => {
  assert.match(
    repairMigration,
    /p_decision in \('defer', 'approve', 'reject', 'request_repair'\)[\s\S]*v_item\.state not in \('ready_for_review', 'deferred'\)/,
  );
  assert.match(repairMigration, /command_retry_deadline_expired/);
  assert.match(repairMigration, /v_failed_command\.execution_deadline_at <= now\(\)/);
  assert.match(repairMigration, /viewer\.snoozed_until is null or viewer\.snoozed_until <= now\(\)/);
  assert.match(repairMigration, /w\.deferred_until is null or w\.deferred_until <= now\(\)/);
});

test("scheduled discovery publishes only behind the explicit control-plane activation gate", () => {
  assert.match(workflow, /catalog_founder_work_item_publisher_v1\.mjs/);
  assert.match(workflow, /FOUNDER_OPERATIONS_CONTROL_PLANE_ACTIVE/);
  assert.match(workflow, /PUBLISH_ARGS=\(\)/);
  assert.match(workflow, /PUBLISH_ARGS\+=\(--publish\)/);
  assert.match(workflow, /EXPECTED_DATABASE_WRITES=false/);
  assert.match(workflow, /writer_dispatches.*false/);
  const workItemStep = workflow.match(/- name: Build founder set review work items[\s\S]*?(?=\n      - name:|$)/)?.[0] ?? "";
  assert.match(workItemStep, /SUPABASE_URL: \$\{\{ secrets\.PROD_SUPABASE_URL \}\}/);
  assert.match(
    workItemStep,
    /if \[\[ "\$FOUNDER_OPERATIONS_CONTROL_PLANE_ACTIVE" == "true" \]\][\s\S]*test -n "\$SUPABASE_URL"[\s\S]*test -n "\$SUPABASE_SECRET_KEY"[\s\S]*PUBLISH_ARGS\+=\(--publish\)/,
  );
});

test("maintenance schedule is activation-gated and the worker requires an explicit run flag", () => {
  assert.match(maintenanceWorkflow, /FOUNDER_OPERATIONS_CONTROL_PLANE_ACTIVE/);
  assert.match(maintenanceWorkflow, /SUPABASE_URL: \$\{\{ secrets\.PROD_SUPABASE_URL \}\}/);
  assert.match(maintenanceWorkflow, /SUPABASE_SECRET_KEY/);
  assert.match(maintenanceWorkflow, /set -euo pipefail/);
  assert.match(maintenanceWorkflow, /test -n "\$SUPABASE_URL"/);
  assert.match(maintenanceWorkflow, /test -n "\$SUPABASE_SECRET_KEY"/);
  assert.match(maintenanceWorkflow, /operations_maintenance_result\.json/);
  assert.match(maintenanceWorker, /explicit --run/);
  assert.match(maintenanceWorker, /runOperationsMaintenanceV1/);
});

test("operations client exposes bounded incident and maintenance RPC helpers", async () => {
  const calls = [];
  const fetchImpl = async (url, request) => {
    calls.push({ url, body: JSON.parse(request.body) });
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const common = {
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "test-service-role",
    fetchImpl,
  };
  await publishOperationsIncidentV1({
    ...common,
    incident: {
      incident_key: "agent-stale:test-agent",
      agent_key: "test-agent",
      incident_type: "agent_stale",
      severity: "high",
      title: "Test agent is stale",
      summary: "No heartbeat arrived.",
      evidence: { checked_at: "2026-08-30T00:00:00Z" },
    },
  });
  await recoverOperationsIncidentV1({
    ...common,
    incidentKey: "agent-stale:test-agent",
    resolutionNote: "Heartbeat resumed.",
  });
  await runOperationsMaintenanceV1(common);
  assert.match(calls[0].url, /operations_publish_incident_v1$/);
  assert.match(calls[1].url, /operations_recover_incident_v1$/);
  assert.match(calls[2].url, /operations_run_maintenance_v1$/);
});

test("work-item notifications deep-link to operations while legacy alerts remain compatible", () => {
  assert.match(migration, /founder_work_item_ready/);
  assert.match(dispatcher, /grookai:\/\/founder\/operations\?work_item_id=/);
  assert.match(dispatcher, /grookai:\/\/founder\/notifications\?notification_id=/);
});

test("work-item publication resolves pgcrypto through the extensions schema", () => {
  const migration = fs.readFileSync(
    new URL(
      "../../supabase/migrations/20260901030000_founder_operations_publish_digest_schema_fix_v1.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(migration, /create or replace function public\.operations_publish_work_item_v1\(p_item jsonb\)/);
  assert.match(
    migration,
    /extensions\.digest\(convert_to\(v_payload::text, 'UTF8'\), 'sha256'\)/,
  );
  assert.match(
    migration,
    /revoke all on function public\.operations_publish_work_item_v1\(jsonb\) from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.operations_publish_work_item_v1\(jsonb\) to service_role/,
  );
  assert.doesNotMatch(migration, /\b(?:insert|update|delete|truncate)\s+(?:public\.)?card_prints\b/i);
});
