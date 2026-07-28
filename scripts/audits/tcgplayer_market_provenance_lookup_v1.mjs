import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  validateCurrentMarketTrace,
  validateMarketTraceCompleteness,
} from "../../backend/pricing/tcgplayer_market_provenance_policy_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "provenance_lookup",
);
const AUDIT_VERSION = "TCGPLAYER_MARKET_PROVENANCE_LOOKUP_AUDIT_V1";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseArgs(argv) {
  const value = (name) =>
    argv
      .find((arg) => arg.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? "";
  const printingGvId = value("printing-gv-id");
  const provenanceId = value("provenance-id");
  if (Boolean(printingGvId) === Boolean(provenanceId)) {
    throw new Error(
      "provide exactly one of --printing-gv-id or --provenance-id",
    );
  }
  if (provenanceId && !UUID_PATTERN.test(provenanceId)) {
    throw new Error("--provenance-id must be a UUID");
  }
  return {
    printingGvId,
    provenanceId: provenanceId || null,
    requireAvailable: argv.includes("--require-available"),
    outRoot: path.resolve(value("out-root") || DEFAULT_OUT_ROOT),
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

async function loadIdentity(client, printingGvId) {
  const rows = (
    await client.query(
      `select
         printing.id::text as card_printing_id,
         printing.printing_gv_id,
         printing.finish_key,
         card.id::text as card_print_id,
         card.gv_id,
         card.name,
         card.number,
         card.set_code
       from public.card_printings printing
       join public.card_prints card
         on card.id = printing.card_print_id
      where printing.printing_gv_id = $1
      order by printing.id`,
      [printingGvId],
    )
  ).rows;
  if (rows.length !== 1) {
    throw new Error(
      `PRINTING_GV_ID_NOT_UNIQUE:${printingGvId}:${rows.length}`,
    );
  }
  return rows[0];
}

async function loadReadModel(client, cardPrintingId) {
  const rows = (
    await client.query(
      `select *
         from public.get_market_pricing_read_model_v1(
           null::uuid[],
           array[$1::uuid]
         )`,
      [cardPrintingId],
    )
  ).rows;
  if (rows.length !== 1) {
    throw new Error(
      `READ_MODEL_ROW_COUNT_MISMATCH:${cardPrintingId}:${rows.length}`,
    );
  }
  return rows[0];
}

async function loadTrace(client, provenanceId) {
  return (
    await client.query(
      `select public.get_market_price_trace_v1($1::uuid) as trace`,
      [provenanceId],
    )
  ).rows[0]?.trace ?? null;
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
  const url = databaseUrl();
  if (!url) throw new Error("database connection string is required");
  const commitSha = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const trackedWorktreeClean =
    !git(["status", "--porcelain", "--untracked-files=no"]);
  const runDir = path.join(args.outRoot, stamp());
  await fs.mkdir(runDir, { recursive: true });
  const runPlan = {
    audit_version: AUDIT_VERSION,
    mode: "read_only",
    commit_sha: commitSha,
    branch,
    tracked_worktree_clean: trackedWorktreeClean,
    printing_gv_id: args.printingGvId || null,
    provenance_id: args.provenanceId,
    require_available: args.requireAvailable,
    boundaries: {
      database_reads_only: true,
      database_writes: false,
      service_only_trace: true,
      public_trace_exposure: false,
    },
  };

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    query_timeout: 125_000,
    application_name: "tcgplayer-market-provenance-lookup-v1",
  });
  let identity = null;
  let readModel = null;
  let trace = null;
  const findings = [];
  const notices = [];
  await client.connect();
  try {
    await client.query("begin read only");
    if (args.printingGvId) {
      identity = await loadIdentity(client, args.printingGvId);
      readModel = await loadReadModel(
        client,
        identity.card_printing_id,
      );
      if (readModel.provenance_id) {
        trace = await loadTrace(client, readModel.provenance_id);
      }
      if (readModel.status === "available" || args.requireAvailable) {
        findings.push(
          ...validateCurrentMarketTrace(identity, readModel, trace),
        );
      }
    } else {
      trace = await loadTrace(client, args.provenanceId);
      if (!trace) {
        findings.push("trace_missing");
      } else {
        identity = await loadIdentity(client, trace.printing_gv_id);
        readModel = await loadReadModel(
          client,
          identity.card_printing_id,
        );
        findings.push(...validateMarketTraceCompleteness(identity, trace));
        if (readModel.provenance_id !== args.provenanceId) {
          notices.push("requested_provenance_is_not_current");
        }
      }
    }
    await client.query("rollback");
  } finally {
    await client.end().catch(() => {});
  }

  const summary = {
    audit_version: AUDIT_VERSION,
    status: findings.length === 0 ? "passed" : "failed",
    printing_gv_id: identity?.printing_gv_id ?? args.printingGvId ?? null,
    provenance_id: trace?.provenance_id ?? args.provenanceId ?? null,
    provenance_relationship:
      trace && readModel?.provenance_id === trace.provenance_id
        ? "current"
        : trace
          ? "historical"
          : null,
    read_model_status: readModel?.status ?? null,
    market_close:
      (args.provenanceId ? trace?.market_price : readModel?.market_close) ==
      null
        ? null
        : Number(
            args.provenanceId
              ? trace.market_price
              : readModel.market_close,
          ),
    current_market_close:
      readModel?.market_close == null
        ? null
        : Number(readModel.market_close),
    currency: readModel?.currency ?? null,
    source_label: readModel?.source_label ?? null,
    findings: [...new Set(findings)].sort(),
    notices: [...new Set(notices)].sort(),
    database_writes: 0,
  };
  const files = {
    "run_plan.json": `${JSON.stringify(runPlan, null, 2)}\n`,
    "canonical_identity.json": `${JSON.stringify(identity, null, 2)}\n`,
    "read_model.json": `${JSON.stringify(readModel, null, 2)}\n`,
    "provenance_trace.json": `${JSON.stringify(trace, null, 2)}\n`,
    "summary.json": `${JSON.stringify(summary, null, 2)}\n`,
  };
  await writeArtifacts(runDir, files);
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
  if (summary.status !== "passed") process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    `[tcgplayer-market-provenance-lookup] ${error.stack || error.message}`,
  );
  process.exitCode = 1;
});
