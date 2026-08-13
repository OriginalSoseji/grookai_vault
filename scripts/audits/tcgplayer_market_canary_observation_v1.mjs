import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  evaluateTcgplayerMarketCanaryObservationV1,
  TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V1,
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
const AUDIT_VERSION = "TCGPLAYER_MARKET_CANARY_OBSERVATION_AUDIT_V1";

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
    maxSourceMissingCount: 0,
    scheduleToleranceMinutes: 90,
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
      "--max-source-missing-count must be a non-negative integer below --expected-count",
    );
  }
  if (
    !Number.isFinite(args.scheduleToleranceMinutes) ||
    args.scheduleToleranceMinutes < 1
  ) {
    throw new Error("--schedule-tolerance-minutes must be positive");
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

async function queryEvidence(client, args, asOf) {
  const activationRun = (
    await client.query(
      `select *
       from public.market_price_pipeline_runs
       where id = $1::uuid`,
      [args.activationRunId],
    )
  ).rows[0] ?? null;

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

  const current = (
    await client.query(
      `with totals as (
         select
           count(*)::integer as exact_price_count,
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
       broken_trace as (
         select count(*)::integer as broken_trace_count
         from public.market_price_publication_snapshots snapshot
         left join public.market_price_qualification_decisions decision
           on decision.id = snapshot.qualification_decision_id
          and decision.eligible = true
          and decision.source_observation_id = snapshot.source_observation_id
         left join public.tcgcsv_source_price_daily_observations observation
           on observation.id = snapshot.source_observation_id
         where decision.id is null or observation.id is null
       ),
       pointer as (
         select publication_set_id, run_id, previous_publication_set_id,
                activated_at
         from public.market_price_current_publication
         where singleton = true
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

  const sampleCardPrintIds = (
    await client.query(
      `select distinct current_price.card_print_id
       from public.v_market_price_current_v1 current_price
       where current_price.card_print_id is not null
       order by current_price.card_print_id
       limit 1`,
    )
  ).rows.map((row) => row.card_print_id);
  if (sampleCardPrintIds.length !== 1) {
    throw new Error("No current card print is available for the authenticated read-model probe");
  }

  let authenticatedReadCount = 0;
  let authenticatedRuntimeLatencyMs = null;
  await client.query("set role authenticated");
  try {
    const startedAt = performance.now();
    authenticatedReadCount = Number(
      (
        await client.query(
          `select count(*)::integer as row_count
           from public.get_market_pricing_read_model_v1(
             $1::uuid[],
             '{}'::uuid[]
           )`,
          [sampleCardPrintIds],
        )
      ).rows[0]?.row_count ?? 0,
    );
    authenticatedRuntimeLatencyMs = Number(
      (performance.now() - startedAt).toFixed(3),
    );
  } finally {
    await client.query("reset role");
  }

  let anonymousRuntimeDenied = false;
  let anonymousRuntimeCode = null;
  await client.query("set role anon");
  try {
    await client.query(
      `select count(*)::integer
       from public.get_market_pricing_read_model_v1(
         $1::uuid[],
         '{}'::uuid[]
       )`,
      [sampleCardPrintIds],
    );
  } catch (error) {
    anonymousRuntimeCode = error.code ?? null;
    anonymousRuntimeDenied = error.code === "42501";
  } finally {
    await client.query("reset role");
  }

  return {
    activationRun,
    scheduledRuns,
    terminalAlerts,
    current,
    sourceHealth,
    sourceRunEvidence: sourceMetrics,
    access: {
      authenticated_execute_granted:
        grants.authenticated_execute_granted === true,
      authenticated_read_count: authenticatedReadCount,
      authenticated_runtime_latency_ms: authenticatedRuntimeLatencyMs,
      sampled_card_print_ids: sampleCardPrintIds,
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
    `- Policy version: \`${TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V1}\``,
    `- Status: \`${report.status}\``,
    `- Window start: \`${report.window.started_at}\``,
    `- Required end: \`${report.window.required_end_at}\``,
    `- As of: \`${report.window.as_of}\``,
    `- Observed hours: \`${report.window.observed_hours}\``,
    `- Expected commit: \`${report.run_evidence.expected_commit_sha}\``,
    `- Frozen cohort size: \`${report.run_evidence.expected_count}\``,
    `- Allowed source-missing rows: \`${report.run_evidence.max_source_missing_count}\``,
    `- Latest resolved rows: \`${report.run_evidence.latest_resolved_count}\``,
    "",
    "## Schedule",
    "",
    `- Expected slots through this check: \`${report.schedule.expected_slots.length}\``,
    `- Matched slots: \`${report.schedule.matched_slots.length}\``,
    `- Missing slots: \`${report.schedule.missing_slots.length}\``,
    `- Unmatched canary runs: \`${report.schedule.unmatched_run_keys.length}\``,
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
    `- Authenticated runtime latency: \`${report.access.authenticated_runtime_latency_ms} ms\``,
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
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    query_timeout: 120_000,
  });
  await client.connect();
  try {
    const evidence = await queryEvidence(client, args, asOf);
    const report = evaluateTcgplayerMarketCanaryObservationV1({
      windowStart: args.windowStart,
      asOf,
      requiredHours: args.requiredHours,
      scheduleToleranceMinutes: args.scheduleToleranceMinutes,
      expectedCount: args.expectedCount,
      maxSourceMissingCount: args.maxSourceMissingCount,
      expectedCommitSha: args.expectedCommitSha,
      ...evidence,
    });

    const runDir = path.join(args.outRoot, stamp());
    await fs.mkdir(runDir, { recursive: true });
    const runPlan = {
      audit_version: AUDIT_VERSION,
      policy_version: TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V1,
      window_start: args.windowStart,
      activation_run_id: args.activationRunId,
      expected_commit_sha: args.expectedCommitSha,
      as_of: asOf,
      required_hours: args.requiredHours,
      expected_count: args.expectedCount,
      max_source_missing_count: args.maxSourceMissingCount,
      schedule_tolerance_minutes: args.scheduleToleranceMinutes,
      boundaries: {
        database_reads_only: true,
        database_writes: false,
        publication_activation: false,
        grant_changes: false,
      },
    };
    const files = {
      "run_plan.json": `${JSON.stringify(runPlan, null, 2)}\n`,
      "evidence.json": `${JSON.stringify(evidence, null, 2)}\n`,
      "summary.json": `${JSON.stringify(report, null, 2)}\n`,
      "REPORT.md": markdown(report),
    };
    const hashes = {};
    for (const [name, contents] of Object.entries(files)) {
      const filePath = path.join(runDir, name);
      await fs.writeFile(filePath, contents);
      hashes[name] = sha256(Buffer.from(contents));
    }
    await fs.writeFile(
      path.join(runDir, "artifact_hashes.json"),
      `${JSON.stringify(hashes, null, 2)}\n`,
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
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[market-canary-observation] ${error.stack || error.message}`);
  process.exitCode = 1;
});
