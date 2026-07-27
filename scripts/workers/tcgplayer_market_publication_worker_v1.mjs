import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  TCGPLAYER_MARKET_FRESHNESS_HOURS_V1,
  TCGPLAYER_MARKET_PUBLICATION_POLICY_V1,
  evaluateTcgplayerMarketQualificationV1,
} from "../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
);
const WORKER_VERSION = "TCGPLAYER_MARKET_PUBLICATION_WORKER_V1";

function parseArgs(argv) {
  const args = {
    apply: false,
    runKey: null,
    outRoot: DEFAULT_OUT_ROOT,
    limit: null,
    freshnessHours: TCGPLAYER_MARKET_FRESHNESS_HOURS_V1,
    batchSize: 500,
  };

  for (const arg of argv) {
    if (arg === "--apply" || arg === "--run") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg.startsWith("--run-key=")) args.runKey = arg.slice(10).trim();
    else if (arg.startsWith("--out-root=")) {
      args.outRoot = path.resolve(arg.slice("--out-root=".length));
    } else if (arg.startsWith("--limit=")) {
      args.limit = Number.parseInt(arg.slice("--limit=".length), 10);
    } else if (arg.startsWith("--freshness-hours=")) {
      args.freshnessHours = Number(arg.slice("--freshness-hours=".length));
    } else if (arg.startsWith("--batch-size=")) {
      args.batchSize = Number.parseInt(arg.slice("--batch-size=".length), 10);
    }
  }

  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error("--limit must be a positive integer");
  }
  if (!Number.isFinite(args.freshnessHours) || args.freshnessHours <= 0) {
    throw new Error("--freshness-hours must be positive");
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 2000) {
    throw new Error("--batch-size must be between 1 and 2000");
  }
  return args;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function sha256(value) {
  return createHash("sha256")
    .update(
      Buffer.isBuffer(value)
        ? value
        : typeof value === "string"
          ? value
          : JSON.stringify(stable(value)),
    )
    .digest("hex");
}

function runKeyNow() {
  return `tcgplayer-market-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function safePathSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9_.-]+/g, "_");
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

function chunks(rows, size) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

async function candidateRows(client, limit) {
  const params = [];
  const limitSql = limit === null ? "" : "limit $1";
  if (limit !== null) params.push(limit);
  const result = await client.query(
    `select *
       from public.v_tcgplayer_market_qualification_candidates_v1
      order by source_product_id, source_subtype_name, source_observation_id
      ${limitSql}`,
    params,
  );
  return result.rows;
}

function buildDecision(row, evaluation, runKey) {
  const decisionKey = sha256({
    run_key: runKey,
    source_observation_id: row.source_observation_id,
    card_printing_id: row.card_printing_id ?? null,
    policy_version: evaluation.policy_version,
  });

  return {
    decision_key: decisionKey,
    run_key: runKey,
    policy_version: evaluation.policy_version,
    source_observation_id: row.source_observation_id,
    source_sync_run_id: row.source_sync_run_id,
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    gv_id: row.gv_id,
    printing_gv_id: row.printing_gv_id,
    finish_key: row.finish_key,
    source_product_id: Number(row.source_product_id),
    source_subtype_name: row.source_subtype_name,
    source_observed_on: row.source_observed_on,
    source_sync_finished_at: row.source_sync_finished_at,
    currency: row.currency,
    market_price: row.market_price,
    decision: evaluation.decision,
    eligible: evaluation.eligible,
    reason_codes: evaluation.reason_codes,
    evidence: evaluation.evidence,
    snapshot: evaluation.eligible
      ? {
          source_observation_id: row.source_observation_id,
          source_sync_run_id: row.source_sync_run_id,
          source_artifact_id: row.source_artifact_id,
          source_payload_hash: row.source_payload_hash,
          source_price_row_identity: row.source_price_row_identity,
          source_product_id: Number(row.source_product_id),
          source_subtype_name: row.source_subtype_name,
          source_observed_on: row.source_observed_on,
          source_sync_finished_at: row.source_sync_finished_at,
          card_print_id: row.card_print_id,
          card_printing_id: row.card_printing_id,
          gv_id: row.gv_id,
          printing_gv_id: row.printing_gv_id,
          finish_key: row.finish_key,
          currency: row.currency,
          market_price: row.market_price,
          low_price: row.low_price,
          mid_price: row.mid_price,
          high_price: row.high_price,
          direct_low_price: row.direct_low_price,
        }
      : null,
  };
}

async function insertDecisions(client, decisions) {
  for (const batch of chunks(decisions, 500)) {
    await client.query(
      `with incoming as (
         select *
         from jsonb_to_recordset($1::jsonb) as row(
           decision_key text,
           run_key text,
           policy_version text,
           source_observation_id uuid,
           source_sync_run_id uuid,
           card_print_id uuid,
           card_printing_id uuid,
           gv_id text,
           printing_gv_id text,
           finish_key text,
           source_product_id integer,
           source_subtype_name text,
           source_observed_on date,
           source_sync_finished_at timestamptz,
           currency text,
           market_price numeric,
           decision text,
           eligible boolean,
           reason_codes text[],
           evidence jsonb
         )
       )
       insert into public.market_price_qualification_decisions (
         decision_key,
         run_key,
         policy_version,
         source_observation_id,
         source_sync_run_id,
         card_print_id,
         card_printing_id,
         gv_id,
         printing_gv_id,
         finish_key,
         source_product_id,
         source_subtype_name,
         source_observed_on,
         source_sync_finished_at,
         currency,
         market_price,
         decision,
         eligible,
         reason_codes,
         evidence
       )
       select
         decision_key,
         run_key,
         policy_version,
         source_observation_id,
         source_sync_run_id,
         card_print_id,
         card_printing_id,
         gv_id,
         printing_gv_id,
         finish_key,
         source_product_id,
         source_subtype_name,
         source_observed_on,
         source_sync_finished_at,
         currency,
         market_price,
         decision,
         eligible,
         reason_codes,
         evidence
       from incoming
       on conflict (decision_key) do nothing`,
      [JSON.stringify(batch.map(({ snapshot, ...decision }) => decision))],
    );
  }
}

async function insertSnapshots(client, decisions, batchSize) {
  const eligible = decisions.filter((decision) => decision.eligible);
  for (const batch of chunks(eligible, batchSize)) {
    const payload = batch.map((decision) => ({
      decision_key: decision.decision_key,
      policy_version: decision.policy_version,
      ...decision.snapshot,
    }));
    await client.query(
      `with incoming as (
         select *
         from jsonb_to_recordset($1::jsonb) as row(
           decision_key text,
           policy_version text,
           source_observation_id uuid,
           source_sync_run_id uuid,
           source_artifact_id uuid,
           source_payload_hash text,
           source_price_row_identity text,
           source_product_id integer,
           source_subtype_name text,
           source_observed_on date,
           source_sync_finished_at timestamptz,
           card_print_id uuid,
           card_printing_id uuid,
           gv_id text,
           printing_gv_id text,
           finish_key text,
           currency text,
           market_price numeric,
           low_price numeric,
           mid_price numeric,
           high_price numeric,
           direct_low_price numeric
         )
       )
       insert into public.market_price_publication_snapshots (
         qualification_decision_id,
         policy_version,
         source_observation_id,
         source_sync_run_id,
         source_artifact_id,
         source_payload_hash,
         source_price_row_identity,
         source_product_id,
         source_subtype_name,
         source_observed_on,
         source_sync_finished_at,
         card_print_id,
         card_printing_id,
         gv_id,
         printing_gv_id,
         finish_key,
         currency,
         market_price,
         low_price,
         mid_price,
         high_price,
         direct_low_price
       )
       select
         decision.id,
         incoming.policy_version,
         incoming.source_observation_id,
         incoming.source_sync_run_id,
         incoming.source_artifact_id,
         incoming.source_payload_hash,
         incoming.source_price_row_identity,
         incoming.source_product_id,
         incoming.source_subtype_name,
         incoming.source_observed_on,
         incoming.source_sync_finished_at,
         incoming.card_print_id,
         incoming.card_printing_id,
         incoming.gv_id,
         incoming.printing_gv_id,
         incoming.finish_key,
         incoming.currency,
         incoming.market_price,
         incoming.low_price,
         incoming.mid_price,
         incoming.high_price,
         incoming.direct_low_price
       from incoming
       join public.market_price_qualification_decisions decision
         on decision.decision_key = incoming.decision_key
        and decision.eligible = true
       on conflict (
         source_observation_id,
         card_printing_id,
         policy_version
       ) do nothing`,
      [JSON.stringify(payload)],
    );
  }
}

async function reconcile(client, runKey) {
  const result = await client.query(
    `with decisions as (
       select *
       from public.market_price_qualification_decisions
       where run_key = $1
     ),
     snapshots as (
       select distinct
         decision.decision_key,
         snapshot.id
       from decisions decision
       join public.market_price_publication_snapshots snapshot
         on snapshot.source_observation_id = decision.source_observation_id
        and snapshot.card_printing_id = decision.card_printing_id
        and snapshot.policy_version = decision.policy_version
       where decision.eligible = true
     )
     select
       (select count(*)::integer from decisions) as decision_count,
       (select count(*)::integer from decisions where eligible) as eligible_count,
       (select count(*)::integer from decisions where not eligible) as quarantined_count,
       (select count(*)::integer from snapshots) as reconciled_snapshot_count`,
    [runKey],
  );
  return result.rows[0];
}

async function writeArtifacts(outDir, summary, decisions, reconciliation) {
  await fs.mkdir(outDir, { recursive: true });
  const files = {
    summary: path.join(outDir, "summary.json"),
    decisions: path.join(outDir, "qualification_decisions.jsonl"),
    reconciliation: path.join(outDir, "reconciliation.json"),
  };
  await fs.writeFile(files.summary, `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(
    files.decisions,
    decisions.map((decision) => JSON.stringify(decision)).join("\n") +
      (decisions.length ? "\n" : ""),
  );
  await fs.writeFile(
    files.reconciliation,
    `${JSON.stringify(reconciliation, null, 2)}\n`,
  );
  const hashes = {};
  for (const [name, filePath] of Object.entries(files)) {
    hashes[name] = sha256(await fs.readFile(filePath));
  }
  await fs.writeFile(
    path.join(outDir, "artifact_hashes.json"),
    `${JSON.stringify(hashes, null, 2)}\n`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required",
    );
  }
  const runKey = args.runKey || runKeyNow();
  const outDir = path.join(args.outRoot, safePathSegment(runKey));
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 300_000,
    statement_timeout: 300_000,
  });
  await client.connect();

  let inTransaction = false;
  try {
    if (args.apply) {
      await client.query("begin isolation level repeatable read");
      inTransaction = true;
      await client.query(
        "select pg_advisory_xact_lock(hashtext('tcgplayer_market_publication_v1'))",
      );
    }

    const candidates = await candidateRows(client, args.limit);
    const evaluatedAt = new Date();
    const decisions = candidates.map((row) =>
      buildDecision(
        row,
        evaluateTcgplayerMarketQualificationV1(row, {
          now: evaluatedAt,
          freshnessHours: args.freshnessHours,
        }),
        runKey,
      ),
    );
    const eligibleCount = decisions.filter((row) => row.eligible).length;
    const quarantinedCount = decisions.length - eligibleCount;
    const reasonCounts = {};
    for (const decision of decisions) {
      for (const reason of decision.reason_codes) {
        reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
      }
    }

    let reconciliation = {
      decision_count: decisions.length,
      eligible_count: eligibleCount,
      quarantined_count: quarantinedCount,
      reconciled_snapshot_count: 0,
      expected_snapshot_count: eligibleCount,
      mismatches: [],
    };

    if (args.apply) {
      await insertDecisions(client, decisions);
      await insertSnapshots(client, decisions, args.batchSize);
      const dbReconciliation = await reconcile(client, runKey);
      reconciliation = {
        ...dbReconciliation,
        expected_decision_count: decisions.length,
        expected_snapshot_count: eligibleCount,
        mismatches: [],
      };
      if (Number(dbReconciliation.decision_count) !== decisions.length) {
        reconciliation.mismatches.push("decision_count");
      }
      if (Number(dbReconciliation.eligible_count) !== eligibleCount) {
        reconciliation.mismatches.push("eligible_count");
      }
      if (Number(dbReconciliation.quarantined_count) !== quarantinedCount) {
        reconciliation.mismatches.push("quarantined_count");
      }
      if (Number(dbReconciliation.reconciled_snapshot_count) !== eligibleCount) {
        reconciliation.mismatches.push("snapshot_count");
      }
      if (reconciliation.mismatches.length) {
        throw new Error(
          `publication reconciliation failed: ${reconciliation.mismatches.join(",")}`,
        );
      }
      await client.query("commit");
      inTransaction = false;
    }

    const summary = {
      worker_version: WORKER_VERSION,
      policy_version: TCGPLAYER_MARKET_PUBLICATION_POLICY_V1,
      run_key: runKey,
      mode: args.apply ? "apply" : "dry_run",
      evaluated_at: evaluatedAt.toISOString(),
      freshness_hours: args.freshnessHours,
      selected_count: decisions.length,
      eligible_count: eligibleCount,
      quarantined_count: quarantinedCount,
      reason_counts: reasonCounts,
      source_of_market_close: "tcgcsv_source_price_daily_observations.market_price",
      supporting_fields_change_market_close: false,
      writes_publication_tables: args.apply,
      writes_canonical_identity: false,
      writes_vault: false,
    };
    await writeArtifacts(outDir, summary, decisions, reconciliation);
    process.stdout.write(
      `${JSON.stringify({ ...summary, reconciliation, artifact_dir: outDir }, null, 2)}\n`,
    );
  } catch (error) {
    if (inTransaction) await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[tcgplayer-market-publication] ${error.stack || error.message}`);
  process.exitCode = 1;
});
