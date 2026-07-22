#!/usr/bin/env node

import pg from "pg";

const { Client } = pg;
const DEFER_EXIT_CODE = 75;

function positiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

function logResult(status, details) {
  console.log(`[tcgcsv-load-guard] ${JSON.stringify({ status, ...details })}`);
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL is required for the historical load guard");
  }

  const connectTimeoutMs = positiveInteger("TCGCSV_LOAD_GUARD_CONNECT_TIMEOUT_MS", 3000);
  const statementTimeoutMs = positiveInteger("TCGCSV_LOAD_GUARD_STATEMENT_TIMEOUT_MS", 3000);
  const maxProbeMs = positiveInteger("TCGCSV_LOAD_GUARD_MAX_PROBE_MS", 750);
  const longQuerySeconds = positiveInteger("TCGCSV_LOAD_GUARD_LONG_QUERY_SECONDS", 10);
  const maxLongQueries = nonNegativeInteger("TCGCSV_LOAD_GUARD_MAX_LONG_QUERIES", 0);
  const maxIoWaiters = nonNegativeInteger("TCGCSV_LOAD_GUARD_MAX_IO_WAITERS", 0);
  const cronLookbackMinutes = positiveInteger("TCGCSV_LOAD_GUARD_CRON_LOOKBACK_MINUTES", 15);

  const startedAt = performance.now();
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: connectTimeoutMs,
    application_name: "grookai_tcgcsv_historical_load_guard_v1",
  });

  try {
    await client.connect();
    await client.query(`set statement_timeout = '${statementTimeoutMs}ms'`);
    const activity = await client.query(
      `select
         count(*) filter (
           where pid <> pg_backend_pid()
             and state = 'active'
             and query_start < clock_timestamp() - ($1::integer * interval '1 second')
         )::integer as long_running_queries,
         count(*) filter (
           where pid <> pg_backend_pid()
             and state = 'active'
             and wait_event_type = 'IO'
         )::integer as io_waiters
       from pg_stat_activity
       where datname = current_database()
         and backend_type = 'client backend'`,
      [longQuerySeconds],
    );

    let recentCriticalCronFailures = 0;
    const cronAvailable = await client.query(
      "select to_regclass('cron.job_run_details') is not null as available",
    );
    if (cronAvailable.rows[0]?.available) {
      const cronFailures = await client.query(
        `select count(*)::integer as failures
         from cron.job_run_details details
         join cron.job jobs on jobs.jobid = details.jobid
         where details.status = 'failed'
           and details.start_time >= now() - ($1::integer * interval '1 minute')
           and jobs.jobname in (
             'notification-dispatcher-every-minute-v1',
             'want-match-instant-every-5-min-v1',
             'want-match-digest-daily-v1',
             'pulse-daily-aggregation-v1',
             'e7_north_star_weekly_rollup_v1'
           )`,
        [cronLookbackMinutes],
      );
      recentCriticalCronFailures = Number(cronFailures.rows[0]?.failures ?? 0);
    }

    const elapsedMs = Math.round(performance.now() - startedAt);
    const longRunningQueries = Number(activity.rows[0]?.long_running_queries ?? 0);
    const ioWaiters = Number(activity.rows[0]?.io_waiters ?? 0);
    const reasons = [];
    if (elapsedMs > maxProbeMs) reasons.push("probe_latency");
    if (longRunningQueries > maxLongQueries) reasons.push("long_running_queries");
    if (ioWaiters > maxIoWaiters) reasons.push("io_waiters");
    if (recentCriticalCronFailures > 0) reasons.push("recent_critical_cron_failure");

    const details = {
      elapsed_ms: elapsedMs,
      long_running_queries: longRunningQueries,
      io_waiters: ioWaiters,
      recent_critical_cron_failures: recentCriticalCronFailures,
      reasons,
    };
    if (reasons.length > 0) {
      logResult("deferred", details);
      process.exitCode = DEFER_EXIT_CODE;
      return;
    }
    logResult("healthy", details);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  logResult("deferred", {
    reasons: ["load_guard_unavailable"],
    error: String(error?.message ?? error),
  });
  process.exitCode = DEFER_EXIT_CODE;
});
