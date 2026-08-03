import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "active_ask_refresh",
);
const WORKER_VERSION = "TCGPLAYER_MARKET_ACTIVE_ASK_REFRESH_V1";
const MATERIALIZED_VIEW =
  "public.mv_market_listing_active_ask_current_v1";

function parseArgs(argv) {
  const args = {
    apply: false,
    outRoot: DEFAULT_OUT_ROOT,
    timeoutMinutes: 20,
  };
  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg.startsWith("--out-root=")) {
      args.outRoot = path.resolve(arg.slice("--out-root=".length));
    } else if (arg.startsWith("--timeout-minutes=")) {
      args.timeoutMinutes = Number(arg.slice("--timeout-minutes=".length));
    }
  }
  if (
    !Number.isInteger(args.timeoutMinutes) ||
    args.timeoutMinutes < 1 ||
    args.timeoutMinutes > 120
  ) {
    throw new Error("--timeout-minutes must be an integer from 1 through 120");
  }
  return args;
}

function databaseUrl() {
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

function gitValue(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readback(client) {
  return (
    await client.query(
      `select
         count(*)::integer as row_count,
         count(*) filter (
           where currency <> 'USD'
              or lowest_active_ask is null
              or lowest_active_ask <= 0
              or median_active_ask is null
              or round(median_active_ask, 2) < round(lowest_active_ask, 2)
              or listing_count < 1
              or seller_count < 0
         )::integer as invalid_row_count,
         count(*) filter (
           where observed_at < now() - interval '72 hours'
         )::integer as stale_row_count,
         min(observed_at) as oldest_observed_at,
         max(observed_at) as newest_observed_at
       from public.mv_market_listing_active_ask_current_v1`,
    )
  ).rows[0];
}

async function configureRefreshSession(client, timeoutMinutes) {
  await client.query(
    "select set_config('statement_timeout', $1, false)",
    [`${timeoutMinutes}min`],
  );
  await client.query(
    "select set_config('enable_nestloop', 'off', false)",
  );
  return (
    await client.query(
      `select
         current_setting('statement_timeout') as statement_timeout,
         current_setting('enable_nestloop') as enable_nestloop`,
    )
  ).rows[0];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = databaseUrl();
  if (!url) throw new Error("SUPABASE_DB_URL is required");
  const trackedChanges = gitValue([
    "status",
    "--porcelain",
    "--untracked-files=no",
  ]);
  if (args.apply && trackedChanges) {
    throw new Error(
      "active-ask refresh apply requires a clean tracked working tree",
    );
  }
  const runDir = path.join(args.outRoot, stamp());
  await fs.mkdir(runDir, { recursive: true });
  const runPlan = {
    worker_version: WORKER_VERSION,
    mode: args.apply ? "apply" : "dry_run",
    commit_sha: gitValue(["rev-parse", "HEAD"]),
    branch: gitValue(["branch", "--show-current"]),
    created_at: new Date().toISOString(),
    materialized_view: MATERIALIZED_VIEW,
    timeout_minutes: args.timeoutMinutes,
    database_session_policy: {
      statement_timeout: `${args.timeoutMinutes}min`,
      enable_nestloop: "off",
    },
    boundaries: {
      canonical_identity_writes: false,
      price_publication_writes: false,
      vault_writes: false,
      active_ask_cache_write: args.apply,
    },
  };
  const runPlanContents = `${JSON.stringify(runPlan, null, 2)}\n`;
  await fs.writeFile(path.join(runDir, "run_plan.json"), runPlanContents);

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: args.timeoutMinutes * 60_000,
    query_timeout: args.timeoutMinutes * 60_000 + 5_000,
  });
  await client.connect();
  try {
    const databaseSession = await configureRefreshSession(
      client,
      args.timeoutMinutes,
    );
    const before = await readback(client);
    const startedAt = new Date().toISOString();
    if (args.apply) {
      await client.query(
        "refresh materialized view concurrently public.mv_market_listing_active_ask_current_v1",
      );
    }
    const after = await readback(client);
    const result = {
      worker_version: WORKER_VERSION,
      status:
        Number(after.invalid_row_count) === 0 &&
        Number(after.stale_row_count) === 0
          ? "passed"
          : "failed",
      mode: runPlan.mode,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      database_session: databaseSession,
      before,
      after,
      findings: [
        ...(Number(after.invalid_row_count) > 0
          ? ["invalid_active_ask_cache_rows"]
          : []),
        ...(Number(after.stale_row_count) > 0
          ? ["stale_active_ask_cache_rows"]
          : []),
      ],
    };
    const summaryContents = `${JSON.stringify(result, null, 2)}\n`;
    await fs.writeFile(path.join(runDir, "summary.json"), summaryContents);
    await fs.writeFile(
      path.join(runDir, "artifact_hashes.json"),
      `${JSON.stringify(
        {
          "run_plan.json": sha256(runPlanContents),
          "summary.json": sha256(summaryContents),
        },
        null,
        2,
      )}\n`,
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          ...result,
          artifact_root: path
            .relative(REPO_ROOT, runDir)
            .replace(/\\/g, "/"),
        },
        null,
        2,
      )}\n`,
    );
    if (result.status !== "passed") process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[active-ask-refresh] ${error.stack || error.message}`);
  process.exitCode = 1;
});
