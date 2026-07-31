import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
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
  "publication_rollback",
);
const WORKER_VERSION = "TCGPLAYER_MARKET_PUBLICATION_ROLLBACK_V1";
const CONFIRMATION = "TCGPLAYER_MARKET_PUBLICATION_ROLLBACK_V1";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? "").trim();
}

function parseArgs(argv) {
  const value = (name) =>
    argv
      .find((arg) => arg.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? "";
  const apply = argv.includes("--apply");
  if (apply && argv.includes("--dry-run")) {
    throw new Error("MODE_CONFLICT: use either --apply or --dry-run");
  }
  const expectedCurrentPublicationSetId = value(
    "expected-current-publication-set-id",
  );
  const expectedRestorePublicationSetId = value(
    "expected-restore-publication-set-id",
  );
  const reason = value("reason");
  const expectedCommitSha = value("expected-commit-sha").toLowerCase();
  const confirmation = value("confirmation");
  const outRoot = path.resolve(value("out-root") || DEFAULT_OUT_ROOT);

  if (!UUID_PATTERN.test(expectedCurrentPublicationSetId)) {
    throw new Error("--expected-current-publication-set-id is required");
  }
  if (
    expectedRestorePublicationSetId &&
    !UUID_PATTERN.test(expectedRestorePublicationSetId)
  ) {
    throw new Error("--expected-restore-publication-set-id must be a UUID");
  }
  if (apply && !expectedRestorePublicationSetId) {
    throw new Error(
      "--expected-restore-publication-set-id is required for apply",
    );
  }
  if (apply && reason.length < 12) {
    throw new Error("--reason must contain at least 12 characters for apply");
  }
  if (apply && !/^[a-f0-9]{40}$/.test(expectedCommitSha)) {
    throw new Error("--expected-commit-sha is required for apply");
  }
  if (apply && confirmation !== CONFIRMATION) {
    throw new Error(`--confirmation must equal ${CONFIRMATION}`);
  }

  return {
    apply,
    expectedCurrentPublicationSetId,
    expectedRestorePublicationSetId:
      expectedRestorePublicationSetId || null,
    reason: reason || "dry-run precondition validation only",
    expectedCommitSha: expectedCommitSha || null,
    outRoot,
  };
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

function git(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function loadPublicationState(client) {
  const pointer = (
    await client.query(
      `select
         pointer.publication_set_id::text,
         pointer.run_id::text,
         pointer.previous_publication_set_id::text,
         pointer.activated_at,
         current_set.run_key as current_run_key,
         current_set.publication_state as current_publication_state,
         current_set.expected_snapshot_count as current_expected_snapshot_count,
         current_set.rollback_reason as current_rollback_reason,
         current_run.state as current_run_state,
         current_run.reconciliation_state as current_reconciliation_state,
         current_run.git_commit_sha as current_run_commit_sha,
         prior_set.run_id::text as prior_run_id,
         prior_set.run_key as prior_run_key,
         prior_set.publication_state as prior_publication_state,
         prior_set.expected_snapshot_count as prior_expected_snapshot_count,
         prior_set.previous_publication_set_id::text
           as prior_previous_publication_set_id,
         prior_run.state as prior_run_state,
         prior_run.reconciliation_state as prior_reconciliation_state,
         prior_run.git_commit_sha as prior_run_commit_sha,
         (
           select count(*)::integer
           from public.market_price_publication_snapshots snapshot
           where snapshot.publication_set_id = pointer.publication_set_id
         ) as current_snapshot_count,
         (
           select count(*)::integer
           from public.market_price_publication_snapshots snapshot
           where snapshot.publication_set_id =
             pointer.previous_publication_set_id
         ) as prior_snapshot_count
       from public.market_price_current_publication pointer
       join public.market_price_publication_sets current_set
         on current_set.id = pointer.publication_set_id
       join public.market_price_pipeline_runs current_run
         on current_run.id = pointer.run_id
       left join public.market_price_publication_sets prior_set
         on prior_set.id = pointer.previous_publication_set_id
       left join public.market_price_pipeline_runs prior_run
         on prior_run.id = prior_set.run_id
      where pointer.singleton = true`,
    )
  ).rows[0];
  return pointer ?? null;
}

function validatePreconditions(state, args) {
  const failures = [];
  if (!state) return ["current_publication_pointer_missing"];
  if (
    state.publication_set_id !== args.expectedCurrentPublicationSetId
  ) {
    failures.push("current_publication_set_changed");
  }
  if (!state.previous_publication_set_id) {
    failures.push("prior_publication_set_missing");
  }
  if (
    args.expectedRestorePublicationSetId &&
    state.previous_publication_set_id !==
      args.expectedRestorePublicationSetId
  ) {
    failures.push("restore_publication_set_changed");
  }
  if (state.current_publication_state !== "published") {
    failures.push("current_publication_not_published");
  }
  if (state.prior_publication_state !== "superseded") {
    failures.push("prior_publication_not_superseded");
  }
  if (state.current_reconciliation_state !== "reconciled") {
    failures.push("current_run_not_reconciled");
  }
  if (state.prior_reconciliation_state !== "reconciled") {
    failures.push("prior_run_not_reconciled");
  }
  if (
    Number(state.current_snapshot_count) !==
    Number(state.current_expected_snapshot_count)
  ) {
    failures.push("current_snapshot_count_mismatch");
  }
  if (
    Number(state.prior_snapshot_count) !==
    Number(state.prior_expected_snapshot_count)
  ) {
    failures.push("prior_snapshot_count_mismatch");
  }
  return failures;
}

async function loadRollbackEvents(
  client,
  currentPublicationSetId,
  restoredPublicationSetId,
  reason,
  startedAt,
) {
  return (
    await client.query(
      `select
         id::text,
         publication_set_id::text,
         run_id::text,
         event_type,
         prior_publication_set_id::text,
         reason,
         payload,
         created_at
       from public.market_price_publication_events
      where reason = $3
        and created_at >= $4::timestamptz
        and (
          (
            publication_set_id = $1::uuid
            and event_type = 'rolled_back'
          )
          or (
            publication_set_id = $2::uuid
            and event_type = 'restored'
          )
        )
      order by created_at, id`,
      [
        currentPublicationSetId,
        restoredPublicationSetId,
        reason,
        startedAt,
      ],
    )
  ).rows;
}

async function loadPublicationSetState(client, publicationSetId) {
  return (
    await client.query(
      `select
         publication_set.id::text as publication_set_id,
         publication_set.run_id::text,
         publication_set.publication_state,
         publication_set.expected_snapshot_count,
         publication_set.rollback_reason,
         publication_set.rolled_back_at,
         pipeline_run.state as run_state,
         pipeline_run.reconciliation_state,
         (
           select count(*)::integer
           from public.market_price_publication_snapshots snapshot
           where snapshot.publication_set_id = publication_set.id
         ) as snapshot_count
       from public.market_price_publication_sets publication_set
       join public.market_price_pipeline_runs pipeline_run
         on pipeline_run.id = publication_set.run_id
      where publication_set.id = $1::uuid`,
      [publicationSetId],
    )
  ).rows[0] ?? null;
}

function validatePostconditions(
  before,
  after,
  rolledBackSet,
  events,
  args,
) {
  const failures = [];
  if (
    after.publication_set_id !== args.expectedRestorePublicationSetId
  ) {
    failures.push("restored_publication_pointer_mismatch");
  }
  if (
    after.previous_publication_set_id !==
    before.prior_previous_publication_set_id
  ) {
    failures.push("restored_previous_pointer_mismatch");
  }
  if (after.current_publication_state !== "published") {
    failures.push("restored_publication_not_published");
  }
  if (rolledBackSet?.publication_state !== "rolled_back") {
    failures.push("former_current_publication_not_rolled_back");
  }
  if (rolledBackSet?.run_state !== "rolled_back") {
    failures.push("former_current_run_not_rolled_back");
  }
  if (rolledBackSet?.rollback_reason !== args.reason) {
    failures.push("rollback_reason_mismatch");
  }
  if (
    Number(after.current_snapshot_count) !==
    Number(before.prior_snapshot_count)
  ) {
    failures.push("restored_snapshot_count_mismatch");
  }
  if (
    events.length !== 2 ||
    !events.some((event) => event.event_type === "rolled_back") ||
    !events.some((event) => event.event_type === "restored")
  ) {
    failures.push("rollback_event_reconciliation_failed");
  }
  return failures;
}

async function writeArtifacts(runDir, files) {
  const hashes = {};
  for (const [name, contents] of Object.entries(files)) {
    await fs.writeFile(path.join(runDir, name), contents);
    hashes[name] = sha256(contents);
  }
  await fs.writeFile(
    path.join(runDir, "artifact_hashes.json"),
    `${JSON.stringify(hashes, null, 2)}\n`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const commitSha = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const trackedWorktreeClean =
    !git(["status", "--porcelain", "--untracked-files=no"]);
  if (args.apply) {
    if (!trackedWorktreeClean) {
      throw new Error("apply requires a clean tracked worktree");
    }
    if (commitSha !== args.expectedCommitSha) {
      throw new Error(
        `PRODUCING_COMMIT_MISMATCH:${commitSha}:${args.expectedCommitSha}`,
      );
    }
  }

  const url = databaseUrl();
  if (!url) throw new Error("database connection string is required");
  const rollbackRunId = randomUUID();
  const operationStartedAt = new Date().toISOString();
  const runDir = path.join(
    args.outRoot,
    `${stamp()}_${args.apply ? "apply" : "dry_run"}_${rollbackRunId}`,
  );
  await fs.mkdir(runDir, { recursive: true });
  const runPlan = {
    worker_version: WORKER_VERSION,
    mode: args.apply ? "apply" : "dry_run",
    rollback_run_id: rollbackRunId,
    producing_commit_sha: commitSha,
    branch,
    tracked_worktree_clean: trackedWorktreeClean,
    expected_current_publication_set_id:
      args.expectedCurrentPublicationSetId,
    expected_restore_publication_set_id:
      args.expectedRestorePublicationSetId,
    reason: args.reason,
    created_at: operationStartedAt,
    boundaries: {
      dry_run_default: true,
      publication_pointer_write: args.apply,
      publication_state_write: args.apply,
      pipeline_run_state_write: args.apply,
      publication_event_write: args.apply,
      source_archive_write: false,
      qualification_write: false,
      snapshot_write: false,
      canonical_identity_write: false,
      vault_write: false,
    },
  };
  const runPlanContents = `${JSON.stringify(runPlan, null, 2)}\n`;
  await fs.writeFile(path.join(runDir, "run_plan.json"), runPlanContents);

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    query_timeout: 125_000,
    application_name: "tcgplayer-market-publication-rollback-v1",
  });
  let before = null;
  let after = null;
  let rolledBackSet = null;
  let events = [];
  let committed = false;
  await client.connect();
  try {
    await client.query(
      args.apply ? "begin isolation level serializable" : "begin read only",
    );
    before = await loadPublicationState(client);
    const preconditionFailures = validatePreconditions(before, args);
    if (preconditionFailures.length > 0) {
      throw new Error(
        `ROLLBACK_PRECONDITION_FAILED:${JSON.stringify(preconditionFailures)}`,
      );
    }

    if (args.apply) {
      const restoredPublicationSetId = (
        await client.query(
          `select public.rollback_market_price_publication_set_v1(
             $1::uuid,
             $2::text
           )::text as restored_publication_set_id`,
          [args.expectedCurrentPublicationSetId, args.reason],
        )
      ).rows[0]?.restored_publication_set_id;
      if (
        restoredPublicationSetId !==
        args.expectedRestorePublicationSetId
      ) {
        throw new Error("ROLLBACK_FUNCTION_RETURN_MISMATCH");
      }
      after = await loadPublicationState(client);
      rolledBackSet = await loadPublicationSetState(
        client,
        args.expectedCurrentPublicationSetId,
      );
      events = await loadRollbackEvents(
        client,
        args.expectedCurrentPublicationSetId,
        restoredPublicationSetId,
        args.reason,
        operationStartedAt,
      );
      const postconditionFailures = validatePostconditions(
        before,
        after,
        rolledBackSet,
        events,
        args,
      );
      if (postconditionFailures.length > 0) {
        throw new Error(
          `ROLLBACK_POSTCONDITION_FAILED:${JSON.stringify(postconditionFailures)}`,
        );
      }
      await client.query("commit");
      committed = true;
    } else {
      await client.query("rollback");
    }
  } catch (error) {
    if (!committed) await client.query("rollback").catch(() => {});
    const summary = {
      worker_version: WORKER_VERSION,
      status: "failed",
      mode: runPlan.mode,
      rollback_run_id: rollbackRunId,
      committed,
      error: error instanceof Error ? error.message : String(error),
    };
    await writeArtifacts(runDir, {
      "run_plan.json": runPlanContents,
      "precondition_readback.json": `${JSON.stringify(before, null, 2)}\n`,
      "postcondition_readback.json": `${JSON.stringify(after, null, 2)}\n`,
      "rolled_back_set_readback.json":
        `${JSON.stringify(rolledBackSet, null, 2)}\n`,
      "publication_events.json": `${JSON.stringify(events, null, 2)}\n`,
      "summary.json": `${JSON.stringify(summary, null, 2)}\n`,
    });
    throw error;
  } finally {
    await client.end().catch(() => {});
  }

  const summary = {
    worker_version: WORKER_VERSION,
    status: "passed",
    mode: runPlan.mode,
    rollback_run_id: rollbackRunId,
    committed,
    current_publication_set_id:
      before.publication_set_id,
    restore_publication_set_id:
      before.previous_publication_set_id,
    current_snapshot_count: Number(before.current_snapshot_count),
    restore_snapshot_count: Number(before.prior_snapshot_count),
    rollback_event_count: events.length,
    database_writes: args.apply,
    source_archive_writes: 0,
    qualification_writes: 0,
    snapshot_writes: 0,
    canonical_identity_writes: 0,
    vault_writes: 0,
  };
  await writeArtifacts(runDir, {
    "run_plan.json": runPlanContents,
    "precondition_readback.json": `${JSON.stringify(before, null, 2)}\n`,
    "postcondition_readback.json": `${JSON.stringify(after, null, 2)}\n`,
    "rolled_back_set_readback.json":
      `${JSON.stringify(rolledBackSet, null, 2)}\n`,
    "publication_events.json": `${JSON.stringify(events, null, 2)}\n`,
    "summary.json": `${JSON.stringify(summary, null, 2)}\n`,
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        ...summary,
        artifact_root: path.relative(REPO_ROOT, runDir).replace(/\\/g, "/"),
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  console.error(`[tcgplayer-market-rollback] ${error.stack || error.message}`);
  process.exitCode = 1;
});
