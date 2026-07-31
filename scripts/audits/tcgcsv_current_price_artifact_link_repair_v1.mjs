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
  "artifact_link_repair",
);
const REPAIR_VERSION = "TCGCSV_CURRENT_PRICE_ARTIFACT_LINK_REPAIR_V1";
const POKEMON_CATEGORY_ID = 3;

function parseArgs(argv) {
  const sourceRunArg = argv.find((arg) => arg.startsWith("--source-run-id="));
  const outRootArg = argv.find((arg) => arg.startsWith("--out-root="));
  const args = {
    apply: argv.includes("--apply"),
    sourceRunId: sourceRunArg?.slice("--source-run-id=".length).trim() ?? null,
    outRoot: path.resolve(
      outRootArg?.slice("--out-root=".length) || DEFAULT_OUT_ROOT,
    ),
  };
  if (!args.sourceRunId) {
    throw new Error("--source-run-id is required");
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function git(args) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const result = await promisify(execFile)("git", args, {
    cwd: REPO_ROOT,
    timeout: 15_000,
    windowsHide: true,
  });
  return result.stdout.trim();
}

async function readCounts(client, sourceRunId) {
  const result = await client.query(
    `with source_run as (
       select id, observed_on
       from public.tcgcsv_source_sync_runs
       where id = $1
         and sync_mode = 'current_full_sync'
         and status = 'completed'
         and failed_count = 0
     ),
     scoped as (
       select
         observation.id,
         observation.source_artifact_id,
         artifact.id as matched_artifact_id
       from source_run
       join public.tcgcsv_source_price_daily_observations observation
         on observation.last_seen_run_id = source_run.id
        and observation.observed_on = source_run.observed_on
        and observation.category_id = $2
       left join public.tcgcsv_source_artifacts artifact
         on artifact.sync_run_id = source_run.id
        and artifact.artifact_kind = 'prices'
        and artifact.category_id = observation.category_id
        and artifact.group_id = observation.group_id
     )
     select
       count(*)::integer as scoped_rows,
       count(*) filter (
         where source_artifact_id is null
       )::integer as missing_links,
       count(*) filter (
         where matched_artifact_id is null
       )::integer as unmatched_rows,
       count(*) filter (
         where source_artifact_id = matched_artifact_id
       )::integer as correctly_linked_rows
     from scoped`,
    [sourceRunId, POKEMON_CATEGORY_ID],
  );
  return result.rows[0];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required",
    );
  }
  const [commitSha, branch, trackedChanges] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain", "--untracked-files=no"]),
  ]);
  if (args.apply && trackedChanges) {
    throw new Error("apply requires a clean tracked working tree");
  }

  const runKey = `${REPAIR_VERSION}-${args.sourceRunId}`;
  const outDir = path.join(args.outRoot, runKey);
  await fs.mkdir(outDir, { recursive: true });
  const runPlan = {
    repair_version: REPAIR_VERSION,
    run_key: runKey,
    mode: args.apply ? "apply" : "dry_run",
    commit_sha: commitSha,
    branch,
    source_sync_run_id: args.sourceRunId,
    category_id: POKEMON_CATEGORY_ID,
    boundaries: {
      source_artifact_link_updates: args.apply,
      source_price_updates: false,
      canonical_identity_writes: false,
      publication_writes: false,
      current_publication_activation: false,
      vault_writes: false,
    },
  };
  await writeJson(path.join(outDir, "run_plan.json"), runPlan);

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 15 * 60_000,
    statement_timeout: 15 * 60_000,
  });
  await client.connect();
  try {
    const before = await readCounts(client, args.sourceRunId);
    if (before.scoped_rows === 0) {
      throw new Error("source run has no scoped Pokémon price observations");
    }
    if (before.unmatched_rows !== 0) {
      throw new Error(
        `artifact-link repair refused: ${before.unmatched_rows} rows lack one matching price artifact`,
      );
    }

    await client.query("begin");
    const updateResult = await client.query(
      `update public.tcgcsv_source_price_daily_observations observation
          set source_artifact_id = artifact.id,
              source_archive_path = artifact.local_path,
              updated_at = now()
         from public.tcgcsv_source_sync_runs source_run,
              public.tcgcsv_source_artifacts artifact
        where source_run.id = $1
          and source_run.sync_mode = 'current_full_sync'
          and source_run.status = 'completed'
          and source_run.failed_count = 0
          and observation.last_seen_run_id = source_run.id
          and observation.observed_on = source_run.observed_on
          and observation.category_id = $2
          and artifact.sync_run_id = source_run.id
          and artifact.artifact_kind = 'prices'
          and artifact.category_id = observation.category_id
          and artifact.group_id = observation.group_id
          and (
            observation.source_artifact_id is distinct from artifact.id
            or observation.source_archive_path is distinct from artifact.local_path
          )`,
      [args.sourceRunId, POKEMON_CATEGORY_ID],
    );
    const after = await readCounts(client, args.sourceRunId);
    const expectedLinkedRows = Number(after.scoped_rows);
    if (
      Number(after.missing_links) !== 0 ||
      Number(after.unmatched_rows) !== 0 ||
      Number(after.correctly_linked_rows) !== expectedLinkedRows
    ) {
      throw new Error("post-repair artifact-link readback did not reconcile");
    }
    if (args.apply) await client.query("commit");
    else await client.query("rollback");

    const result = {
      ...runPlan,
      status: args.apply ? "applied" : "dry_run_rolled_back",
      before,
      updated_rows: updateResult.rowCount,
      after,
    };
    await writeJson(path.join(outDir, "result.json"), result);
    const hashes = {
      run_plan_sha256: sha256(
        await fs.readFile(path.join(outDir, "run_plan.json")),
      ),
      result_sha256: sha256(
        await fs.readFile(path.join(outDir, "result.json")),
      ),
    };
    await writeJson(path.join(outDir, "artifact_hashes.json"), hashes);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[tcgcsv-artifact-link-repair] ${error.stack || error.message}`);
  process.exitCode = 1;
});
