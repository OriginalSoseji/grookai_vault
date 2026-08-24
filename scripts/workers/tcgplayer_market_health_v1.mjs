import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  evaluateTcgplayerCurrentSourceHealthV1,
  TCGPLAYER_MARKET_HEALTH_POLICY_V1,
} from "../../backend/pricing/tcgplayer_market_health_policy_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "health",
);
const HEALTH_VERSION = "TCGPLAYER_MARKET_HEALTH_V1";

function parseArgs(argv) {
  const args = {
    runKey: null,
    outRoot: DEFAULT_OUT_ROOT,
    maxSourceAgeHours: 36,
    minimumCurrentPrices: 1,
  };
  for (const arg of argv) {
    if (arg.startsWith("--run-key=")) args.runKey = arg.slice(10).trim();
    else if (arg.startsWith("--out-root=")) {
      args.outRoot = path.resolve(arg.slice("--out-root=".length));
    } else if (arg.startsWith("--max-source-age-hours=")) {
      args.maxSourceAgeHours = Number(
        arg.slice("--max-source-age-hours=".length),
      );
    } else if (arg.startsWith("--minimum-current-prices=")) {
      args.minimumCurrentPrices = Number.parseInt(
        arg.slice("--minimum-current-prices=".length),
        10,
      );
    }
  }
  if (!Number.isFinite(args.maxSourceAgeHours) || args.maxSourceAgeHours <= 0) {
    throw new Error("--max-source-age-hours must be positive");
  }
  if (
    !Number.isInteger(args.minimumCurrentPrices) ||
    args.minimumCurrentPrices < 0
  ) {
    throw new Error("--minimum-current-prices must be a non-negative integer");
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required",
    );
  }
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
  });
  await client.connect();

  try {
    const result = await client.query(
      `with latest_source as (
         select
           run_key,
           status,
           source_marker,
           finished_at,
           price_row_count,
           failed_count,
           error
         from public.tcgcsv_source_sync_runs
         where sync_mode = 'current_full_sync'
         order by finished_at desc nulls last, created_at desc
         limit 1
       ),
       completed_source as (
         select
           run_key,
           status,
           source_marker,
           finished_at,
           price_row_count,
           failed_count,
           error
         from public.tcgcsv_source_sync_runs
         where sync_mode = 'current_full_sync'
           and status = 'completed'
         order by finished_at desc nulls last, created_at desc
         limit 1
       ),
       selected_run as (
         select *
         from public.market_price_pipeline_runs
         where ($1::text is null or run_key = $1)
         order by created_at desc, id desc
         limit 1
       ),
       selected_publication as (
         select
           publication_set.id as publication_set_id,
           publication_set.run_id
         from public.market_price_publication_sets publication_set
         join selected_run pipeline_run
           on pipeline_run.id = publication_set.run_id
         limit 1
       ),
       selected_decisions as (
         select decision.*
         from public.market_price_qualification_decisions decision
         join selected_run pipeline_run
           on pipeline_run.id = decision.run_id
       ),
       decision_totals as (
         select
           count(*)::integer as decision_count,
           count(*) filter (where eligible)::integer as eligible_count,
           count(*) filter (where decision = 'delay')::integer as delayed_count,
           count(*) filter (where decision = 'suppress_stale')::integer as suppressed_count,
           count(*) filter (where decision = 'quarantine')::integer as quarantined_count,
           count(*) filter (where decision = 'exclude')::integer as excluded_count
         from selected_decisions
       ),
       snapshot_totals as (
         select
           count(distinct snapshot.id)::integer as snapshot_count,
           count(distinct snapshot.id) filter (
             where decision.id is not null
               and decision.source_observation_id = snapshot.source_observation_id
               and decision.card_printing_id = snapshot.card_printing_id
               and decision.eligible = true
           )::integer as traced_snapshot_count
         from selected_publication publication
         left join public.market_price_publication_snapshots snapshot
           on snapshot.publication_set_id = publication.publication_set_id
          and snapshot.run_id = publication.run_id
         left join public.market_price_qualification_decisions decision
           on decision.id = snapshot.qualification_decision_id
          and decision.run_id = snapshot.run_id
       ),
       phase_totals as (
         select
           count(distinct phase.phase_name) filter (
             where phase.state = 'succeeded'
               and phase.phase_name in (
                 'prepare_variant_assignments',
                 'stage_candidates',
                 'qualify',
                 'build_publication',
                 'reconcile'
               )
           )::integer as succeeded_required_phase_count,
           count(*) filter (where phase.state = 'failed')::integer as failed_phase_attempt_count
         from selected_run pipeline_run
         left join public.market_price_pipeline_phase_attempts phase
           on phase.run_id = pipeline_run.id
       ),
       current_totals as (
         select
           count(*)::integer as current_exact_price_count,
           count(distinct card_print_id)::integer as current_parent_price_count,
           max(observed_at) as latest_published_source_at
         from public.v_market_price_current_v1
       ),
       current_publication as (
         select publication_set_id, run_id, activated_at
         from public.market_price_current_publication
         where singleton = true
       )
       select
         source.run_key as latest_source_run_key,
         source.status as latest_source_status,
         source.source_marker as latest_source_marker,
         source.finished_at as latest_source_finished_at,
         source.price_row_count as latest_source_price_row_count,
         source.failed_count as latest_source_failed_count,
         source.error as latest_source_error,
         completed_source.run_key as completed_source_run_key,
         completed_source.status as completed_source_status,
         completed_source.source_marker as completed_source_marker,
         completed_source.finished_at as completed_source_finished_at,
         completed_source.price_row_count as completed_source_price_row_count,
         completed_source.failed_count as completed_source_failed_count,
         completed_source.error as completed_source_error,
         pipeline_run.id as selected_run_id,
         pipeline_run.run_mode as selected_run_mode,
         pipeline_run.state as selected_run_state,
         pipeline_run.reconciliation_state,
         pipeline_run.selected_count as run_selected_count,
         pipeline_run.excluded_count as run_excluded_count,
         pipeline_run.quarantined_count as run_quarantined_count,
         pipeline_run.delayed_count as run_delayed_count,
         pipeline_run.suppressed_count as run_suppressed_count,
         pipeline_run.eligible_count as run_eligible_count,
         pipeline_run.snapshot_count as run_snapshot_count,
         pipeline_run.required_phase_count,
         pipeline_run.succeeded_phase_count,
         decisions.*,
         snapshots.snapshot_count,
         snapshots.traced_snapshot_count,
         phases.succeeded_required_phase_count,
         phases.failed_phase_attempt_count,
         current_prices.*,
         current_publication.publication_set_id as current_publication_set_id,
         current_publication.run_id as current_publication_run_id,
         current_publication.activated_at as current_publication_activated_at,
         (snapshots.snapshot_count - snapshots.traced_snapshot_count)::integer
           as broken_trace_count
       from decision_totals decisions
       cross join snapshot_totals snapshots
       cross join phase_totals phases
       cross join current_totals current_prices
       left join latest_source source on true
       left join completed_source on true
       left join selected_run pipeline_run on true
       left join current_publication on true`,
      [args.runKey],
    );
    const metrics = result.rows[0];
    const sourceHealth = evaluateTcgplayerCurrentSourceHealthV1(metrics, {
      maxSourceAgeHours: args.maxSourceAgeHours,
    });
    const findings = [...sourceHealth.findings];
    if (args.runKey && !metrics.selected_run_id) {
      findings.push("durable_pipeline_run_missing");
    }
    if (
      metrics.selected_run_id &&
      metrics.reconciliation_state !== "reconciled"
    ) {
      findings.push("durable_pipeline_run_not_reconciled");
    }
    if (
      metrics.selected_run_mode === "shadow" &&
      metrics.selected_run_state !== "shadow_verified"
    ) {
      findings.push("shadow_run_not_verified");
    }
    if (
      ["canary", "production"].includes(metrics.selected_run_mode) &&
      metrics.selected_run_state !== "verified"
    ) {
      findings.push("published_run_not_verified");
    }
    if (
      metrics.selected_run_id &&
      (
        Number(metrics.required_phase_count) !==
          Number(metrics.succeeded_required_phase_count) ||
        Number(metrics.succeeded_phase_count) !==
          Number(metrics.required_phase_count)
      )
    ) {
      findings.push("required_pipeline_phases_incomplete");
    }
    if (
      metrics.selected_run_id &&
      Number(metrics.run_selected_count) !==
        Number(metrics.run_eligible_count) +
          Number(metrics.run_delayed_count) +
          Number(metrics.run_suppressed_count) +
          Number(metrics.run_quarantined_count) +
          Number(metrics.run_excluded_count)
    ) {
      findings.push("durable_run_lane_reconciliation_mismatch");
    }
    if (
      Number(metrics.current_exact_price_count) < args.minimumCurrentPrices
    ) {
      findings.push("current_exact_price_count_below_minimum");
    }
    if (
      args.runKey &&
      Number(metrics.snapshot_count) !== Number(metrics.eligible_count)
    ) {
      findings.push("eligible_snapshot_reconciliation_mismatch");
    }
    if (
      Number(metrics.snapshot_count) !==
      Number(metrics.traced_snapshot_count)
    ) {
      findings.push("snapshot_trace_reconciliation_mismatch");
    }
    if (
      ["canary", "production"].includes(metrics.selected_run_mode) &&
      metrics.current_publication_run_id !== metrics.selected_run_id
    ) {
      findings.push("current_publication_pointer_mismatch");
    }
    if (Number(metrics.broken_trace_count) !== 0) {
      findings.push("broken_source_to_publication_trace");
    }

    const summary = {
      health_version: HEALTH_VERSION,
      health_policy_version: TCGPLAYER_MARKET_HEALTH_POLICY_V1,
      checked_at: new Date().toISOString(),
      status: findings.length ? "critical" : "healthy",
      run_key: args.runKey,
      thresholds: {
        max_source_age_hours: args.maxSourceAgeHours,
        minimum_current_prices: args.minimumCurrentPrices,
      },
      metrics: {
        ...metrics,
        source_continuity_mode: sourceHealth.continuity_mode,
        effective_source_run_key: sourceHealth.effective_source_run_key,
        effective_source_status: sourceHealth.effective_source_status,
        effective_source_price_row_count:
          sourceHealth.effective_source_price_row_count,
        source_age_hours: sourceHealth.source_age_hours,
      },
      findings,
    };
    await fs.mkdir(args.outRoot, { recursive: true });
    const summaryPath = path.join(
      args.outRoot,
      `tcgplayer_market_health_${stamp()}.json`,
    );
    await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
    const hash = createHash("sha256")
      .update(await fs.readFile(summaryPath))
      .digest("hex");
    await fs.writeFile(
      `${summaryPath}.sha256`,
      `${hash}  ${path.basename(summaryPath)}\n`,
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          ...summary,
          artifact_path: path
            .relative(REPO_ROOT, summaryPath)
            .replace(/\\/g, "/"),
        },
        null,
        2,
      )}\n`,
    );
    if (findings.length) process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[market-health] ${error.stack || error.message}`);
  process.exitCode = 1;
});
