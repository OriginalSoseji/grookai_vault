import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  evaluateTcgplayerMarketFullRolloutObservationV1,
  expectedTcgplayerMarketFullRolloutSlotsV1,
  TCGPLAYER_MARKET_FULL_ROLLOUT_OBSERVATION_POLICY_V1,
} from "../../backend/pricing/tcgplayer_market_full_rollout_observation_policy_v1.mjs";
import {
  evaluateTcgplayerCurrentSourceHealthV1,
} from "../../backend/pricing/tcgplayer_market_health_policy_v1.mjs";
import {
  TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3,
} from "../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "full_rollout_observation",
);
const AUDIT_VERSION =
  "TCGPLAYER_MARKET_FULL_ROLLOUT_OBSERVATION_AUDIT_V1";
const MINUTE_MS = 60 * 1000;

function parseArgs(argv) {
  const args = {
    windowStart: process.env.TCGPLAYER_MARKET_FULL_WINDOW_START || "",
    activationRunId:
      process.env.TCGPLAYER_MARKET_FULL_ACTIVATION_RUN_ID || "",
    expectedCommitSha:
      process.env.TCGPLAYER_MARKET_FULL_EXPECTED_COMMIT_SHA || "",
    coverageSummary:
      process.env.TCGPLAYER_MARKET_FULL_COVERAGE_SUMMARY || "",
    performanceSummary:
      process.env.TCGPLAYER_MARKET_FULL_PERFORMANCE_SUMMARY || "",
    asOf: null,
    requiredCycles: 7,
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
        .trim()
        .toLowerCase();
    } else if (arg.startsWith("--coverage-summary=")) {
      args.coverageSummary = arg.slice("--coverage-summary=".length).trim();
    } else if (arg.startsWith("--performance-summary=")) {
      args.performanceSummary = arg
        .slice("--performance-summary=".length)
        .trim();
    } else if (arg.startsWith("--as-of=")) {
      args.asOf = arg.slice("--as-of=".length).trim();
    } else if (arg.startsWith("--required-cycles=")) {
      args.requiredCycles = Number.parseInt(
        arg.slice("--required-cycles=".length),
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
  if (!args.activationRunId) {
    throw new Error("--activation-run-id is required");
  }
  if (!/^[a-f0-9]{40}$/.test(args.expectedCommitSha)) {
    throw new Error("--expected-commit-sha must be a full lowercase SHA");
  }
  if (!args.coverageSummary) {
    throw new Error("--coverage-summary is required");
  }
  if (!args.performanceSummary) {
    throw new Error("--performance-summary is required");
  }
  if (!Number.isFinite(new Date(args.windowStart).getTime())) {
    throw new Error("--window-start must be a valid timestamp");
  }
  if (args.asOf && !Number.isFinite(new Date(args.asOf).getTime())) {
    throw new Error("--as-of must be a valid timestamp");
  }
  if (!Number.isInteger(args.requiredCycles) || args.requiredCycles < 1) {
    throw new Error("--required-cycles must be a positive integer");
  }
  if (
    !Number.isFinite(args.scheduleToleranceMinutes) ||
    args.scheduleToleranceMinutes < 1
  ) {
    throw new Error("--schedule-tolerance-minutes must be positive");
  }
  args.coverageSummary = path.resolve(args.coverageSummary);
  args.performanceSummary = path.resolve(args.performanceSummary);
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitValue(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

async function readGovernedSummary(summaryPath, commitField) {
  const summaryBuffer = await fs.readFile(summaryPath);
  const planPath = path.join(path.dirname(summaryPath), "run_plan.json");
  const planBuffer = await fs.readFile(planPath);
  const summary = JSON.parse(summaryBuffer.toString("utf8"));
  const plan = JSON.parse(planBuffer.toString("utf8"));
  return {
    ...summary,
    producing_commit_sha: String(plan[commitField] ?? "")
      .trim()
      .toLowerCase(),
    input: {
      summary_path: path
        .relative(REPO_ROOT, summaryPath)
        .replace(/\\/g, "/"),
      summary_sha256: sha256(summaryBuffer),
      run_plan_path: path.relative(REPO_ROOT, planPath).replace(/\\/g, "/"),
      run_plan_sha256: sha256(planBuffer),
    },
  };
}

async function queryEvidence(client, args, asOf, evidenceThrough) {
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
       where run_mode = 'production'
         and started_at > $1::timestamptz
         and started_at <= $2::timestamptz
         and run_key like
           'TCGPLAYER-MARKET-SCHEDULE-PRODUCTION-%-publication'
       order by started_at, id`,
      [args.windowStart, evidenceThrough],
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
      [args.windowStart, evidenceThrough],
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
           )::integer as stale_price_count,
           (array_agg(card_printing_id order by card_printing_id))[1]::text
             as sample_card_printing_id
         from public.v_market_price_current_v1
       ),
       current_rows as (
         select snapshot.*, decision.id as decision_id,
                decision.policy_version as decision_policy_version,
                decision.eligible,
                decision.decision,
                decision.publication_lane,
                decision.language_result,
                decision.finish_result,
                decision.source_integrity_result,
                decision.duplicate_product_result,
                decision.freshness_result,
                decision.source_observation_id as decision_observation_id,
                decision.card_print_id as decision_card_print_id,
                decision.card_printing_id as decision_card_printing_id
         from public.market_price_current_publication pointer
         join public.market_price_publication_snapshots snapshot
           on snapshot.publication_set_id = pointer.publication_set_id
         left join public.market_price_qualification_decisions decision
           on decision.id = snapshot.qualification_decision_id
         where pointer.singleton
       ),
       integrity as (
         select
           count(*) filter (
             where decision_id is null
                or decision_policy_version <>
                   '${TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3}'
                or policy_version <>
                   '${TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3}'
                or eligible is not true
                or decision <> 'publish'
                or publication_lane <> 'current'
                or language_result <> 'english'
                or finish_result <> 'exact_child_finish'
                or source_integrity_result <> 'passed'
                or duplicate_product_result <> 'unique'
                or freshness_result <> 'fresh'
                or currency <> 'USD'
                or market_price <= 0
                or qualification_decision_id is null
                or source_observation_id is null
                or source_sync_run_id is null
                or source_artifact_id is null
                or nullif(source_artifact_hash, '') is null
                or nullif(source_price_row_identity, '') is null
                or nullif(source_row_hash, '') is null
                or source_mapping_id is null
                or variant_assignment_id is null
                or card_print_id is null
                or card_printing_id is null
                or decision_observation_id <> source_observation_id
                or decision_card_print_id <> card_print_id
                or decision_card_printing_id <> card_printing_id
           )::integer as invalid_exact_policy_count,
           count(*) filter (
             where decision_id is null
                or decision_observation_id <> source_observation_id
                or decision_card_printing_id <> card_printing_id
           )::integer as broken_trace_count
         from current_rows
       ),
       pointer as (
         select publication_set_id, run_id, previous_publication_set_id,
                activated_at
         from public.market_price_current_publication
         where singleton
       )
       select totals.*, integrity.*,
              pointer.publication_set_id as current_publication_set_id,
              pointer.run_id as current_publication_run_id,
              pointer.previous_publication_set_id,
              pointer.activated_at as current_publication_activated_at
       from totals
       cross join integrity
       left join pointer on true`,
    )
  ).rows[0];

  const sourceMetrics = (
    await client.query(
      `with latest_source as (
         select run_key, status, source_marker, finished_at, price_row_count,
                failed_count, error
         from public.tcgcsv_source_sync_runs
         where sync_mode = 'current_full_sync'
         order by finished_at desc nulls last, created_at desc
         limit 1
       ),
       completed_source as (
         select run_key, status, source_marker, finished_at, price_row_count,
                failed_count, error
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
         completed_source.run_key as completed_source_run_key,
         completed_source.status as completed_source_status,
         completed_source.source_marker as completed_source_marker,
         completed_source.finished_at as completed_source_finished_at,
         completed_source.price_row_count as completed_source_price_row_count,
         completed_source.failed_count as completed_source_failed_count,
         completed_source.error as completed_source_error
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

  const samplePrintingId = current.sample_card_printing_id;
  let authenticatedReadCount = 0;
  await client.query("set role authenticated");
  try {
    authenticatedReadCount = Number(
      (
        await client.query(
          `select count(*)::integer as row_count
           from public.get_market_pricing_read_model_v1(
             null::uuid[],
             array[$1::uuid]
           )`,
          [samplePrintingId],
        )
      ).rows[0]?.row_count ?? 0,
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
         null::uuid[],
         array[$1::uuid]
       )`,
      [samplePrintingId],
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
    access: {
      authenticated_execute_granted:
        grants.authenticated_execute_granted === true,
      authenticated_read_count: authenticatedReadCount,
      anonymous_execute_granted: grants.anonymous_execute_granted === true,
      anonymous_runtime_denied: anonymousRuntimeDenied,
      anonymous_runtime_code: anonymousRuntimeCode,
      sample_card_printing_id: samplePrintingId,
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
    "# TCGPlayer Market Full Rollout Observation V1",
    "",
    `- Audit version: \`${AUDIT_VERSION}\``,
    `- Policy version: \`${TCGPLAYER_MARKET_FULL_ROLLOUT_OBSERVATION_POLICY_V1}\``,
    `- Status: \`${report.status}\``,
    `- Window start: \`${report.window.started_at}\``,
    `- Required end: \`${report.window.required_end_at}\``,
    `- As of: \`${report.window.as_of}\``,
    `- Producing commit: \`${report.run_evidence.expected_commit_sha}\``,
    `- Completed scheduled cycles: \`${report.window.completed_cycles}/${report.window.required_cycles}\``,
    "",
    "## Publication",
    "",
    `- Latest verified snapshots: \`${report.run_evidence.latest_healthy_snapshot_count}\``,
    `- Current exact prices: \`${report.current.exact_price_count}\``,
    `- Current positive USD prices: \`${report.current.positive_usd_count}\``,
    `- Missing provenance: \`${report.current.missing_provenance_count}\``,
    `- Stale current prices: \`${report.current.stale_price_count}\``,
    `- Broken traces: \`${report.current.broken_trace_count}\``,
    `- Invalid exact-policy rows: \`${report.current.invalid_exact_policy_count}\``,
    "",
    "## Product Gates",
    "",
    `- V1.2 coverage: \`${report.coverage.coverage_percent}%\``,
    `- Current scope: \`${report.coverage.current_publication_scope_status}\``,
    `- Performance: \`${report.performance.status}\``,
    `- Performance cases: \`${report.performance.case_count}\``,
    `- Authenticated runtime rows: \`${report.access.authenticated_read_count}\``,
    `- Anonymous runtime denied: \`${report.access.anonymous_runtime_denied}\``,
    `- Rollback available: \`${report.rollback.prior_publication_available}\``,
    "",
    "## Schedule",
    "",
    `- Expected slots: \`${report.schedule.expected_slots.length}\``,
    `- Due slots: \`${report.schedule.due_slots.length}\``,
    `- Matched slots: \`${report.schedule.matched_slots.length}\``,
    `- Missing due slots: \`${report.schedule.missing_due_slots.length}\``,
    `- Unmatched production runs: \`${report.schedule.unmatched_run_keys.length}\``,
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
  const slots = expectedTcgplayerMarketFullRolloutSlotsV1({
    windowStart: args.windowStart,
    requiredCycles: args.requiredCycles,
  });
  const gateEnd = new Date(
    new Date(slots.at(-1)).getTime() +
      args.scheduleToleranceMinutes * MINUTE_MS,
  );
  const evidenceThrough =
    new Date(asOf) < gateEnd ? asOf : gateEnd.toISOString();
  const coverage = await readGovernedSummary(
    args.coverageSummary,
    "source_commit_sha",
  );
  const performance = await readGovernedSummary(
    args.performanceSummary,
    "commit_sha",
  );

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 180_000,
    query_timeout: 180_000,
  });
  await client.connect();
  try {
    const evidence = await queryEvidence(
      client,
      args,
      asOf,
      evidenceThrough,
    );
    const report = evaluateTcgplayerMarketFullRolloutObservationV1({
      windowStart: args.windowStart,
      asOf,
      requiredCycles: args.requiredCycles,
      scheduleToleranceMinutes: args.scheduleToleranceMinutes,
      expectedCommitSha: args.expectedCommitSha,
      coverage,
      performance,
      ...evidence,
    });

    const runDir = path.join(args.outRoot, stamp());
    await fs.mkdir(runDir, { recursive: true });
    const runPlan = {
      audit_version: AUDIT_VERSION,
      policy_version:
        TCGPLAYER_MARKET_FULL_ROLLOUT_OBSERVATION_POLICY_V1,
      observer_commit_sha: gitValue(["rev-parse", "HEAD"]),
      observer_branch: gitValue(["branch", "--show-current"]),
      observer_tracked_worktree_clean:
        gitValue(["status", "--porcelain", "--untracked-files=no"]) === "",
      window_start: args.windowStart,
      activation_run_id: args.activationRunId,
      expected_commit_sha: args.expectedCommitSha,
      as_of: asOf,
      evidence_through: evidenceThrough,
      required_cycles: args.requiredCycles,
      schedule_hour_utc: 8,
      schedule_minute_utc: 15,
      schedule_tolerance_minutes: args.scheduleToleranceMinutes,
      coverage_input: coverage.input,
      performance_input: performance.input,
      boundaries: {
        database_reads_only: true,
        database_writes: false,
        publication_activation: false,
        grant_changes: false,
        deployment_changes: false,
      },
    };
    const files = {
      "run_plan.json": `${JSON.stringify(runPlan, null, 2)}\n`,
      "evidence.json": `${JSON.stringify(evidence, null, 2)}\n`,
      "coverage_summary_input.json": `${JSON.stringify(
        coverage,
        null,
        2,
      )}\n`,
      "performance_summary_input.json": `${JSON.stringify(
        performance,
        null,
        2,
      )}\n`,
      "summary.json": `${JSON.stringify(report, null, 2)}\n`,
      "REPORT.md": markdown(report),
    };
    const hashes = {};
    for (const [name, contents] of Object.entries(files)) {
      await fs.writeFile(path.join(runDir, name), contents);
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
  console.error(
    `[market-full-rollout-observation] ${error.stack || error.message}`,
  );
  process.exitCode = 1;
});
