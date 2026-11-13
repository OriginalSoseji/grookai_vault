import fs from "node:fs/promises";
import path from "node:path";

import pg from "pg";

import "../../backend/env.mjs";
import {
  evaluateTcgplayerMarketContinuityV1,
} from "../../backend/pricing/tcgplayer_market_continuity_policy_v1.mjs";
import {
  marketSessionConnectionStringV1,
} from "../../backend/pricing/market_scheduler_session_v1.mjs";

const { Client } = pg;

function option(name, fallback = null) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function positiveNumber(name, fallback) {
  const value = Number(option(name, fallback));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--${name} must be positive`);
  }
  return value;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

async function main() {
  const rawUrl = databaseUrl();
  if (!rawUrl) throw new Error("SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required");
  const url = marketSessionConnectionStringV1(rawUrl);
  const outDir = path.resolve(option("out-dir", path.join("artifacts", "market_pricing_product_v1", "continuity_watchdog")));
  const githubOutput = option("github-output", process.env.GITHUB_OUTPUT || "");
  const expectedCommitSha = String(option("expected-commit-sha", process.env.GITHUB_SHA || "")).trim().toLowerCase() || null;
  const thresholds = {
    freshnessHours: positiveNumber("freshness-hours", 36),
    refreshAtHours: positiveNumber("refresh-at-hours", 26),
    failedRunRecoveryAtHours: positiveNumber("failed-run-recovery-at-hours", 18),
    activeRunGraceHours: positiveNumber("active-run-grace-hours", 6),
  };

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
    keepAlive: true,
  });
  await client.connect();
  let evidence;
  try {
    await client.query("begin transaction read only");
    const result = await client.query(`
      with current_state as (
        select current_pointer.publication_set_id,
               current_pointer.run_id,
               publication_set.expected_snapshot_count,
               pipeline_run.git_commit_sha,
               max(snapshot.source_sync_finished_at) as source_sync_finished_at,
               count(snapshot.id)::integer as snapshot_count
          from public.market_price_current_publication current_pointer
          join public.market_price_publication_sets publication_set
            on publication_set.id = current_pointer.publication_set_id
           and publication_set.run_id = current_pointer.run_id
          join public.market_price_pipeline_runs pipeline_run
            on pipeline_run.id = current_pointer.run_id
          left join public.market_price_publication_snapshots snapshot
            on snapshot.publication_set_id = current_pointer.publication_set_id
           and snapshot.run_id = current_pointer.run_id
         where current_pointer.singleton
         group by current_pointer.publication_set_id,
                  current_pointer.run_id,
                  publication_set.expected_snapshot_count,
                  pipeline_run.git_commit_sha
      ), latest_production as (
        select run_key, state, reconciliation_state, git_commit_sha,
               created_at, completed_at, failed_at, error
          from public.market_price_pipeline_runs
         where run_mode = 'production'
         order by created_at desc, id desc
         limit 1
      )
      select current_state.publication_set_id,
             current_state.run_id,
             current_state.expected_snapshot_count,
             current_state.snapshot_count,
             current_state.source_sync_finished_at,
             current_state.git_commit_sha as current_commit_sha,
             latest_production.run_key as latest_run_key,
             latest_production.state as latest_run_state,
             latest_production.reconciliation_state as latest_run_reconciliation_state,
             latest_production.git_commit_sha as latest_run_commit_sha,
             latest_production.created_at as latest_run_created_at,
             latest_production.completed_at as latest_run_completed_at,
             latest_production.failed_at as latest_run_failed_at,
             left(coalesce(latest_production.error, ''), 500) as latest_run_error
        from (select 1) singleton
        left join current_state on true
        left join latest_production on true
    `);
    evidence = result.rows[0] ?? {};
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  const evaluation = evaluateTcgplayerMarketContinuityV1(evidence, {
    ...thresholds,
    expectedCommitSha,
  });
  const report = {
    ...evaluation,
    evaluated_at: new Date().toISOString(),
    expected_commit_sha: expectedCommitSha,
    evidence,
    boundaries: {
      database_writes: 0,
      publication_activation: false,
      canonical_identity_writes: false,
      vault_writes: false,
    },
  };
  await fs.mkdir(outDir, { recursive: true });
  const reportPath = path.join(outDir, "continuity_report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (githubOutput) {
    await fs.appendFile(githubOutput, `refresh_required=${evaluation.refresh_required}\n`);
    await fs.appendFile(githubOutput, `status=${evaluation.status}\n`);
    await fs.appendFile(githubOutput, `report_path=${reportPath.replace(/\\/g, "/")}\n`);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`[tcgplayer-market-continuity-watchdog] ${error.stack || error.message}`);
  process.exitCode = 1;
});
