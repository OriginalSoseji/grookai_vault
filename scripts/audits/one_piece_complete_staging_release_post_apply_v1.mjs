import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";

import {
  evaluateOnePieceSchemaReadbackV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import {
  sha256,
  stableJson,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import {
  captureOnePieceSchemaReadbackV1,
} from "./one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import {
  captureOnePieceCompleteSourceInventoryV1,
  captureOnePieceCompleteStagingReadbackV1,
  captureOnePieceReleaseVisibilityV1,
  evaluateOnePieceCompleteSourceInventoryV1,
  evaluateOnePieceCompleteStagingReadbackV1,
  evaluateOnePieceReleaseVisibilityV1,
  loadFrozenOnePieceCompleteStagingReleaseV1,
  onePieceCompleteStagingClientV1,
  summarizeOnePieceCompleteStagingReadbackV1,
} from "./one_piece_complete_staging_release_db_v1.mjs";
import {
  environmentFingerprint,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";

export const ONE_PIECE_COMPLETE_STAGING_POST_APPLY_VERSION =
  "ONE_PIECE_COMPLETE_CATALOG_STAGING_INDEPENDENT_READBACK_V1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APPLY_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_staging_release_v1", "durable_apply_v1", "summary.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_staging_release_v1", "independent_post_apply_v1");

function parseArgs(argv) {
  const args = { expectedProducerSha: "", expectedApplySummarySha: "",
    outDir: DEFAULT_OUT, envFile: "C:\\grookai_vault\\.env.local" };
  for (const arg of argv) {
    if (arg.startsWith("--expected-producer-sha=")) {
      args.expectedProducerSha = arg.split("=")[1].trim().toLowerCase();
    } else if (arg.startsWith("--expected-apply-summary-sha=")) {
      args.expectedApplySummarySha = arg.split("=")[1].trim().toLowerCase();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice(10));
    } else if (arg.startsWith("--env-file=")) {
      args.envFile = path.resolve(arg.slice(11));
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedProducerSha) ||
      !/^[0-9a-f]{64}$/.test(args.expectedApplySummarySha)) {
    throw new Error("Exact producer and apply-summary hashes are required");
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const currentRepository = { commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current") };
  if (currentRepository.commit_sha !== args.expectedProducerSha ||
      currentRepository.branch !== "agent/one-piece-ingestion-readiness-v1") {
    throw new Error("Independent verifier is not running from the apply producer");
  }
  const [loaded, applyText] = await Promise.all([
    loadFrozenOnePieceCompleteStagingReleaseV1(ROOT),
    fs.readFile(APPLY_PATH, "utf8"),
  ]);
  const apply = JSON.parse(applyText);
  if (sha256(applyText) !== args.expectedApplySummarySha ||
      apply.status !== "durable_apply_committed_and_fresh_readback_passed" ||
      apply.committed !== true ||
      apply.repository?.commit_sha !== args.expectedProducerSha ||
      apply.plan_fingerprint_sha256 !== loaded.release.plan.plan_fingerprint_sha256 ||
      apply.release_payload_fingerprint_sha256 !==
        loaded.release.plan.release_payload_fingerprint_sha256) {
    throw new Error("Durable apply evidence is not exact and passing");
  }
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlan = {
    version: ONE_PIECE_COMPLETE_STAGING_POST_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    apply_producer_sha: args.expectedProducerSha,
    apply_summary_sha256: args.expectedApplySummarySha,
    mode: "fresh_read_only_independent_verification",
    boundaries: { database_writes: false, canonical_or_public_writes: false,
      pricing_storage_pointer_or_vault_writes: false },
  };
  const bodies = {
    "run_plan.json": await writeJson(path.join(args.outDir, "run_plan.json"), runPlan),
  };

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
  if (!connectionString) throw new Error("Production database URL is missing");
  const client = onePieceCompleteStagingClientV1(connectionString,
    "one-piece-complete-staging-independent-readback-v1");
  await client.connect();
  let open = false;
  let readback;
  let schema;
  let source;
  let visibility;
  let transactionReadOnly;
  let databaseUser;
  try {
    await client.query("set default_transaction_read_only=on");
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    transactionReadOnly = (await client.query("show transaction_read_only"))
      .rows[0].transaction_read_only;
    databaseUser = (await client.query("select current_user as database_user"))
      .rows[0].database_user;
    readback = await captureOnePieceCompleteStagingReadbackV1(
      client, loaded.release);
    schema = await captureOnePieceSchemaReadbackV1(client);
    source = await captureOnePieceCompleteSourceInventoryV1(client, loaded.release);
    visibility = await captureOnePieceReleaseVisibilityV1(client);
    await client.query("rollback");
    open = false;
  } finally {
    if (open) await client.query("rollback").catch(() => {});
    await client.end();
  }
  schema.transaction_closed_before_artifacts = true;
  const findings = [];
  findings.push(...evaluateOnePieceCompleteStagingReadbackV1(
    loaded.release, readback).findings);
  findings.push(...evaluateOnePieceSchemaReadbackV1({
    plan: loaded.schemaPlan,
    readback: schema,
    expectedTableRowCounts: {
      one_piece_canonical_import_batches: apply.final_total_batch_rows,
      one_piece_canonical_import_rows: apply.final_total_staging_rows,
    },
  }).map((value) => `schema:${value}`));
  findings.push(...evaluateOnePieceCompleteSourceInventoryV1(
    loaded.release, source).findings.map((value) => `source:${value}`));
  findings.push(...evaluateOnePieceReleaseVisibilityV1(visibility).findings);
  if (transactionReadOnly !== "on") findings.push("transaction_not_read_only");
  if (readback.total_batch_count !== apply.final_total_batch_rows ||
      readback.total_row_count !== apply.final_total_staging_rows) {
    findings.push("apply_total_reconciliation_mismatch");
  }
  const compactReadback = summarizeOnePieceCompleteStagingReadbackV1(readback);
  const summary = {
    version: ONE_PIECE_COMPLETE_STAGING_POST_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "pass" : "blocked",
    apply_producer_sha: args.expectedProducerSha,
    apply_summary_sha256: args.expectedApplySummarySha,
    plan_fingerprint_sha256: loaded.release.plan.plan_fingerprint_sha256,
    release_payload_fingerprint_sha256:
      loaded.release.plan.release_payload_fingerprint_sha256,
    batch_rows: compactReadback.selected_batch_count,
    staging_rows: compactReadback.selected_row_count,
    total_batch_rows: compactReadback.total_batch_count,
    total_staging_rows: compactReadback.total_row_count,
    selected_batches_sha256: compactReadback.selected_batches_sha256,
    selected_rows_sha256: compactReadback.selected_rows_sha256,
    source_product_ids_sha256: compactReadback.source_product_ids_sha256,
    visibility,
    schema_readback_sha256: sha256(stableJson(schema)),
    source_readback_sha256: sha256(stableJson(source)),
    findings: [...new Set(findings)],
    environment: environmentFingerprint(connectionString, "production"),
    read_only_proof: {
      transaction_read_only: transactionReadOnly,
      database_user: databaseUser,
      rolled_back_and_closed: true,
    },
    boundaries: runPlan.boundaries,
  };
  bodies["readback.json"] = await writeJson(
    path.join(args.outDir, "readback.json"), compactReadback);
  bodies["schema_readback.json"] = await writeJson(
    path.join(args.outDir, "schema_readback.json"), schema);
  bodies["source_readback.json"] = await writeJson(
    path.join(args.outDir, "source_readback.json"), {
      group_count: source.group_count,
      active_group_count: source.active_group_count,
      product_count: source.product_count,
      active_product_count: source.active_product_count,
      selected_product_count: source.selected_product_count,
      empty_groups: source.empty_groups,
      products_sha256: sha256(stableJson(source.products)),
      groups_sha256: sha256(stableJson(source.groups)),
    });
  bodies["summary.json"] = await writeJson(
    path.join(args.outDir, "summary.json"), summary);
  const report = `# One Piece Complete Staging Independent Readback V1\n\n` +
    `- Status: **${summary.status.toUpperCase()}**\n` +
    `- Apply producer: \`${args.expectedProducerSha}\`\n` +
    `- Complete release batches / rows: ` +
    `\`${summary.batch_rows}\` / \`${summary.staging_rows}\`\n` +
    `- Total immutable batches / rows: ` +
    `\`${summary.total_batch_rows}\` / \`${summary.total_staging_rows}\`\n` +
    `- Release status: \`${visibility.release_status}\`\n` +
    `- Findings: \`${summary.findings.length}\`\n` +
    `- Database writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), report, "utf8");
  bodies["REPORT.md"] = report;
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(bodies).map(([artifactPath, body]) => ({
      path: artifactPath, bytes: Buffer.byteLength(body), sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify({ status: summary.status,
    batches: summary.batch_rows, rows: summary.staging_rows,
    total_batches: summary.total_batch_rows,
    total_rows: summary.total_staging_rows,
    visibility, findings: summary.findings,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/") }, null, 2)}\n`);
  if (summary.status !== "pass") process.exitCode = 1;
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invoked === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
