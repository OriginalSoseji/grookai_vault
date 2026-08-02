import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  evaluateTcgplayerMarketCanaryObservationV1,
  TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V3,
} from "../../backend/pricing/tcgplayer_market_canary_observation_policy_v1.mjs";
import {
  evaluateTcgplayerCurrentSourceHealthV1,
} from "../../backend/pricing/tcgplayer_market_health_policy_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "canary_observation",
);
const AUDIT_VERSION = "TCGPLAYER_MARKET_CANARY_OBSERVATION_AUDIT_V3";

function parseArgs(argv) {
  const args = {
    windowStart: process.env.TCGPLAYER_MARKET_CANARY_WINDOW_START || "",
    activationRunId:
      process.env.TCGPLAYER_MARKET_CANARY_ACTIVATION_RUN_ID || "",
    expectedCommitSha:
      process.env.TCGPLAYER_MARKET_CANARY_EXPECTED_COMMIT_SHA || "",
    asOf: null,
    requiredHours: 72,
    expectedCount: 100,
    maxSourceMissingCount: Number.parseInt(
      process.env.TCGPLAYER_MARKET_CANARY_MAX_SOURCE_MISSING_COUNT || "5",
      10,
    ),
    scheduleToleranceMinutes: 90,
    scheduleCompletionGraceMinutes: 480,
    outRoot: DEFAULT_OUT_ROOT,
    requirePass: false,
  };
  for (const arg of argv) {
    if (arg.startsWith("--window-start=")) {
      args.windowStart = arg.slice("--window-start=".length).trim();
    } else if (arg.startsWith("--activation-run-id=")) {
      args.activationRunId = arg.slice("--activation-run-id=".length).trim();
    } else if (arg.startsWith("--expected-commit-sha=")) {
      args.expectedCommitSha = arg
        .slice("--expected-commit-sha=".length)
        .trim();
    } else if (arg.startsWith("--as-of=")) {
      args.asOf = arg.slice("--as-of=".length).trim();
    } else if (arg.startsWith("--required-hours=")) {
      args.requiredHours = Number(arg.slice("--required-hours=".length));
    } else if (arg.startsWith("--expected-count=")) {
      args.expectedCount = Number.parseInt(
        arg.slice("--expected-count=".length),
        10,
      );
    } else if (arg.startsWith("--max-source-missing-count=")) {
      args.maxSourceMissingCount = Number.parseInt(
        arg.slice("--max-source-missing-count=".length),
        10,
      );
    } else if (arg.startsWith("--schedule-tolerance-minutes=")) {
      args.scheduleToleranceMinutes = Number(
        arg.slice("--schedule-tolerance-minutes=".length),
      );
    } else if (arg.startsWith("--schedule-completion-grace-minutes=")) {
      args.scheduleCompletionGraceMinutes = Number(
        arg.slice("--schedule-completion-grace-minutes=".length),
      );
    } else if (arg.startsWith("--out-root=")) {
      args.outRoot = path.resolve(arg.slice("--out-root=".length));
    } else if (arg === "--require-pass") {
      args.requirePass = true;
    }
  }
  if (!args.windowStart) throw new Error("--window-start is required");
  if (!args.activationRunId) throw new Error("--activation-run-id is required");
  if (!args.expectedCommitSha) {
    throw new Error("--expected-commit-sha is required");
  }
  if (!Number.isFinite(new Date(args.windowStart).getTime())) {
    throw new Error("--window-start must be a valid timestamp");
  }
  if (args.asOf && !Number.isFinite(new Date(args.asOf).getTime())) {
    throw new Error("--as-of must be a valid timestamp");
  }
  if (!Number.isFinite(args.requiredHours) || args.requiredHours <= 0) {
    throw new Error("--required-hours must be positive");
  }
  if (!Number.isInteger(args.expectedCount) || args.expectedCount < 1) {
    throw new Error("--expected-count must be a positive integer");
  }
  if (
    !Number.isInteger(args.maxSourceMissingCount) ||
    args.maxSourceMissingCount < 0 ||
    args.maxSourceMissingCount >= args.expectedCount
  ) {
    throw new Error(
      "--max-source-missing-count must be a non-negative integer below expected-count",
    );
  }
  if (
    !Number.isFinite(args.scheduleToleranceMinutes) ||
    args.scheduleToleranceMinutes < 1
  ) {
    throw new Error("--schedule-tolerance-minutes must be positive");
  }
  if (
    !Number.isFinite(args.scheduleCompletionGraceMinutes) ||
    args.scheduleCompletionGraceMinutes < args.scheduleToleranceMinutes
  ) {
    throw new Error(
      "--schedule-completion-grace-minutes must be at least the schedule tolerance",
    );
  }
  return args;
}

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function serializeError(error) {
  return {
    name: error?.name ?? "Error",
    code: error?.code ?? null,
    message: error?.message ?? String(error),
  };
}

export function buildTcgplayerMarketCanaryRunPlanV1(args, asOf) {
  return {
    audit_version: AUDIT_VERSION,
    policy_version: TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V3,
    window_start: args.windowStart,
    activation_run_id: args.activationRunId,
    expected_commit_sha: args.expectedCommitSha,
    as_of: asOf,
    required_hours: args.requiredHours,
    expected_count: args.expectedCount,
    max_source_missing_count: args.maxSourceMissingCount,
    schedule_tolerance_minutes: args.scheduleToleranceMinutes,
    schedule_completion_grace_minutes:
      args.scheduleCompletionGraceMinutes,
    boundaries: {
      database_reads_only: true,
      database_writes: false,
      publication_activation: false,
      grant_changes: false,
    },
  };
}

export async function writeTcgplayerMarketCanaryArtifactsV1(
  runDir,
  files,
  existingHashes = {},
) {
  await fs.mkdir(runDir, { recursive: true });
  const hashes = { ...existingHashes };
  for (const [name, contents] of Object.entries(files)) {
    await fs.writeFile(path.join(runDir, name), contents);
    hashes[name] = sha256(Buffer.from(contents));
  }
  await fs.writeFile(
    path.join(runDir, "artifact_hashes.json"),
    `${JSON.stringify(hashes, null, 2)}\n`,
  );
  return hashes;
}

export function buildTcgplayerMarketCanaryFailureArtifactsV1({
  runPlan,
  stage,
  error,
  failedAt = new Date().toISOString(),
}) {
  const failure = {
    audit_version: AUDIT_VERSION,
    policy_version: TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V3,
    status: "observer_error",
    failed_at: failedAt,
    stage,
    error: serializeError(error),
    window: {
      started_at: runPlan.window_start,
      as_of: runPlan.as_of,
    },
    boundaries: runPlan.boundaries,
  };
  const report = [
    "# TCGPlayer Market Canary Observation Failure",
    "",
    `- Status: \`${failure.status}\``,
    `- Stage: \`${failure.stage}\``,
    `- Error code: \`${failure.error.code ?? "unavailable"}\``,
    `- Error: ${failure.error.message}`,
    `- Failed at: \`${failure.failed_at}\``,
    "",
    "The observer failed closed. No database writes, publication activation,",
    "or grant changes were attempted.",
    "",
  ].join("\n");
  const serialized = `${JSON.stringify(failure, null, 2)}\n`;
  return {
    "failure.json": serialized,
    "summary.json": serialized,
    "REPORT.md": `${report}\n`,
  };
}

async function queryEvidence(client, args, asOf, onStage = () => {}) {
  onStage("activation_run_read");
  const activationRun = (
    await client.query(
      `select *
       from public.market_price_pipeline_runs
       where id = $1::uuid`,
      [args.activationRunId],
    )
  ).rows[0] ?? null;

  onStage("scheduled_runs_read");
  const scheduledRuns = (
    await client.query(
      `select *
       from public.market_price_pipeline_runs
       where run_mode = 'canary'
         and started_at > $1::timestamptz
         and started_at <= $2::timestamptz
         and run_key like 'TCGPLAYER-MARKET-SCHEDULE-CANARY-%-publication'
       order by started_at, id`,
      [args.windowStart, asOf],
    )
  ).rows;

  onStage("scheduled_source_runs_read");
  const scheduledSourceRuns = (
    await client.query(
      `select id, run_key, sync_mode, status, git_commit_sha,
              started_at, finished_at, failed_count, error, created_at
       from public.tcgcsv_source_sync_runs
       where sync_mode = 'current_full_sync'
         and started_at > $1::timestamptz
         and started_at <= $2::timestamptz
         and run_key like 'TCGPLAYER-MARKET-SCHEDULE-CANARY-%-warehouse'
       order by started_at, id`,
      [args.windowStart, asOf],
    )
  ).rows;

  onStage("terminal_alerts_read");
  const terminalAlerts = (
    await client.query(
      `select notification_id, event_type, severity, source_unit,
              source_commit_sha, received_at
       from public.operations_notification_events
       where received_at > $1::timestamptz
         and received_at <= $2::timestamptz
         and event_type = 'systemd_on_failure'
         and source_unit = 'grookai-tcgplayer-market-pipeline.service'
       order by received_at, notification_id`,
      [args.windowStart, asOf],
    )
  ).rows;

  onStage("current_read_model_read");
  const current = (
    await client.query(
      `with totals as (
         select
           count(*)::integer as exact_price_count,
           array_agg(
             card_printing_id
             order by card_printing_id
           ) as current_printing_ids,
           count(*) filter (
             where currency = 'USD' and market_price > 0
           )::integer as positive_usd_count,
           count(*) filter (
             where provenance_id is null
           )::integer as missing_provenance_count,
           count(*) filter (
             where freshness <> 'fresh' or age_seconds > 36 * 60 * 60
           )::integer as stale_price_count
       from public.v_market_price_current_v1
       ),
       pointer as (
         select publication_set_id, run_id, previous_publication_set_id,
                activated_at
         from public.market_price_current_publication
         where singleton = true
       ),
       broken_trace as (
         select count(*)::integer as broken_trace_count
         from pointer
         join public.market_price_publication_snapshots snapshot
           on snapshot.run_id = pointer.run_id
         left join public.market_price_qualification_decisions decision
           on decision.id = snapshot.qualification_decision_id
          and decision.run_id = pointer.run_id
          and decision.eligible = true
          and decision.source_observation_id = snapshot.source_observation_id
         left join public.tcgcsv_source_price_daily_observations observation
           on observation.id = snapshot.source_observation_id
         where decision.id is null or observation.id is null
       )
       select totals.*, broken_trace.*,
              pointer.publication_set_id as current_publication_set_id,
              pointer.run_id as current_publication_run_id,
              pointer.previous_publication_set_id,
              pointer.activated_at as current_publication_activated_at
       from totals
       cross join broken_trace
       left join pointer on true`,
    )
  ).rows[0];

  onStage("source_health_read");
  const sourceMetrics = (
    await client.query(
      `with latest_source as (
         select run_key, status, source_marker, finished_at, price_row_count,
                failed_count, error, payload
         from public.tcgcsv_source_sync_runs
         where sync_mode = 'current_full_sync'
         order by finished_at desc nulls last, created_at desc
         limit 1
       ),
       completed_source as (
         select run_key, status, source_marker, finished_at, price_row_count,
                failed_count, error, payload
         from public.tcgcsv_source_sync_runs
         where sync_mode = 'current_full_sync' and status = 'completed'
         order by finished_at desc nulls last, created_at desc
         limit 1
       )
       select
         latest_source.run_key as latest_source_run_key,
         latest_source.status as latest_source_status,
         latest_source.source_marker as latest_source_marker,
         latest_source.finished_at as latest_source_finished_at,
         latest_source.price_row_count as latest_source_price_row_count,
         latest_source.failed_count as latest_source_failed_count,
         latest_source.error as latest_source_error,
         latest_source.payload as latest_source_payload,
         completed_source.run_key as completed_source_run_key,
         completed_source.status as completed_source_status,
         completed_source.source_marker as completed_source_marker,
         completed_source.finished_at as completed_source_finished_at,
         completed_source.price_row_count as completed_source_price_row_count,
         completed_source.failed_count as completed_source_failed_count,
         completed_source.error as completed_source_error,
         completed_source.payload as completed_source_payload
       from latest_source
       full join completed_source on true`,
    )
  ).rows[0] ?? {};
  const sourceEvaluation = evaluateTcgplayerCurrentSourceHealthV1(
    sourceMetrics,
    { maxSourceAgeHours: 36, now: new Date(asOf) },
  );
  const sourceHealth = {
    status: sourceEvaluation.findings.length ? "critical" : "healthy",
    source_continuity_mode: sourceEvaluation.continuity_mode,
    effective_source_run_key: sourceEvaluation.effective_source_run_key,
    effective_source_status: sourceEvaluation.effective_source_status,
    effective_source_price_row_count:
      sourceEvaluation.effective_source_price_row_count,
    source_age_hours: sourceEvaluation.source_age_hours,
    findings: sourceEvaluation.findings,
  };

  onStage("access_grants_read");
  const grants = (
    await client.query(
      `select
         has_function_privilege(
           'authenticated',
           'public.get_market_pricing_read_model_v1(uuid[],uuid[])',
           'EXECUTE'
         ) as authenticated_execute_granted,
         has_function_privilege(
           'anon',
           'public.get_market_pricing_read_model_v1(uuid[],uuid[])',
           'EXECUTE'
         ) as anonymous_execute_granted,
         has_function_privilege(
           'service_role',
           'public.rollback_market_price_publication_set_v1(uuid,text)',
           'EXECUTE'
         ) as rollback_service_execute_granted`,
    )
  ).rows[0];

  let authenticatedReadCount = 0;
  onStage("authenticated_governed_read");
  await client.query("set role authenticated");
  try {
    authenticatedReadCount = Number(
      (
        await client.query(
          `select count(*)::integer as row_count
           from public.get_market_pricing_read_model_v1(
             '{}'::uuid[],
             $1::uuid[]
           )
           where pricing_scope = 'card_printing'
             and status = 'available'`,
          [current.current_printing_ids ?? []],
        )
      ).rows[0]?.row_count ?? 0,
    );
  } finally {
    await client.query("reset role");
  }

  let anonymousRuntimeDenied = false;
  let anonymousRuntimeCode = null;
  onStage("anonymous_governed_read");
  await client.query("set role anon");
  try {
    await client.query(
      `select count(*)::integer
       from public.get_market_pricing_read_model_v1(
         '{}'::uuid[],
         $1::uuid[]
       )`,
      [[current.current_printing_ids?.[0]].filter(Boolean)],
    );
  } catch (error) {
    anonymousRuntimeCode = error.code ?? null;
    anonymousRuntimeDenied = error.code === "42501";
  } finally {
    await client.query("reset role");
  }

  return {
    activationRun,
    scheduledSourceRuns,
    scheduledRuns,
    terminalAlerts,
    current,
    sourceHealth,
    sourceRunEvidence: sourceMetrics,
    access: {
      authenticated_execute_granted:
        grants.authenticated_execute_granted === true,
      authenticated_read_count: authenticatedReadCount,
      anonymous_execute_granted: grants.anonymous_execute_granted === true,
      anonymous_runtime_denied: anonymousRuntimeDenied,
      anonymous_runtime_code: anonymousRuntimeCode,
    },
    rollback: {
      service_execute_granted:
        grants.rollback_service_execute_granted === true,
      prior_publication_available: Boolean(
        current.previous_publication_set_id,
      ),
    },
  };
}

function markdown(report) {
  const lines = [
    "# TCGPlayer Market 72-Hour Canary Observation",
    "",
    `- Audit version: \`${AUDIT_VERSION}\``,
    `- Policy version: \`${TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V3}\``,
    `- Status: \`${report.status}\``,
    `- Window start: \`${report.window.started_at}\``,
    `- Required end: \`${report.window.required_end_at}\``,
    `- As of: \`${report.window.as_of}\``,
    `- Observed hours: \`${report.window.observed_hours}\``,
    `- Expected commit: \`${report.run_evidence.expected_commit_sha}\``,
    `- Allowed source gaps: \`${report.run_evidence.max_source_missing_count}\``,
    `- Expected current rows: \`${report.run_evidence.expected_current_count}\``,
    "",
    "## Schedule",
    "",
    `- Expected slots through this check: \`${report.schedule.expected_slots.length}\``,
    `- Matched slots: \`${report.schedule.matched_slots.length}\``,
    `- Pending slots: \`${report.schedule.pending_slots.length}\``,
    `- Missing slots: \`${report.schedule.missing_slots.length}\``,
    `- Unhealthy slots: \`${report.schedule.unhealthy_slots.length}\``,
    `- Unmatched source runs: \`${report.schedule.unmatched_source_run_keys.length}\``,
    `- Unmatched publication runs: \`${report.schedule.unmatched_publication_run_keys.length}\``,
    "",
    "## Current Read Model",
    "",
    `- Exact prices: \`${report.current.exact_price_count}\``,
    `- Positive USD prices: \`${report.current.positive_usd_count}\``,
    `- Missing provenance: \`${report.current.missing_provenance_count}\``,
    `- Stale visible prices: \`${report.current.stale_price_count}\``,
    `- Broken traces: \`${report.current.broken_trace_count}\``,
    "",
    "## Access",
    "",
    `- Authenticated runtime rows: \`${report.access.authenticated_read_count}\``,
    `- Anonymous runtime denied: \`${report.access.anonymous_runtime_denied}\``,
    `- Anonymous denial code: \`${report.access.anonymous_runtime_code}\``,
    "",
    "## Findings",
    "",
    ...(report.findings.length
      ? report.findings.map((finding) => `- \`${finding}\``)
      : ["- none"]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required",
    );
  }
  const asOf = args.asOf
    ? new Date(args.asOf).toISOString()
    : new Date().toISOString();
  const runDir = path.join(args.outRoot, stamp());
  const runPlan = buildTcgplayerMarketCanaryRunPlanV1(args, asOf);
  let artifactHashes = await writeTcgplayerMarketCanaryArtifactsV1(
    runDir,
    { "run_plan.json": `${JSON.stringify(runPlan, null, 2)}\n` },
  );
  let stage = "database_connect";
  let client = null;
  try {
    client = new Client({
      connectionString: url,
      ssl: sslConfig(url),
      connectionTimeoutMillis: 15_000,
      statement_timeout: 120_000,
      query_timeout: 120_000,
    });
    await client.connect();
    const evidence = await queryEvidence(
      client,
      args,
      asOf,
      (nextStage) => {
        stage = nextStage;
      },
    );
    stage = "policy_evaluation";
    const report = evaluateTcgplayerMarketCanaryObservationV1({
      windowStart: args.windowStart,
      asOf,
      requiredHours: args.requiredHours,
      scheduleToleranceMinutes: args.scheduleToleranceMinutes,
      scheduleCompletionGraceMinutes:
        args.scheduleCompletionGraceMinutes,
      expectedCount: args.expectedCount,
      maxSourceMissingCount: args.maxSourceMissingCount,
      expectedCommitSha: args.expectedCommitSha,
      ...evidence,
    });

    stage = "artifact_write";
    const files = {
      "evidence.json": `${JSON.stringify(evidence, null, 2)}\n`,
      "summary.json": `${JSON.stringify(report, null, 2)}\n`,
      "REPORT.md": markdown(report),
    };
    artifactHashes = await writeTcgplayerMarketCanaryArtifactsV1(
      runDir,
      files,
      artifactHashes,
    );

    process.stdout.write(
      `${JSON.stringify(
        {
          ...report,
          artifact_root: path
            .relative(REPO_ROOT, runDir)
            .replace(/\\/g, "/"),
        },
        null,
        2,
      )}\n`,
    );
    if (report.status === "failed") process.exitCode = 1;
    if (args.requirePass && report.status !== "passed") process.exitCode = 1;
  } catch (error) {
    const failureFiles = buildTcgplayerMarketCanaryFailureArtifactsV1({
      runPlan,
      stage,
      error,
    });
    await writeTcgplayerMarketCanaryArtifactsV1(
      runDir,
      failureFiles,
      artifactHashes,
    );
    error.artifactRoot = path
      .relative(REPO_ROOT, runDir)
      .replace(/\\/g, "/");
    throw error;
  } finally {
    await client?.end().catch(() => {});
  }
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main().catch((error) => {
    console.error(
      `[market-canary-observation] ${error.stack || error.message}`,
    );
    if (error.artifactRoot) {
      console.error(
        `[market-canary-observation] failure artifacts: ${error.artifactRoot}`,
      );
    }
    process.exitCode = 1;
  });
}
