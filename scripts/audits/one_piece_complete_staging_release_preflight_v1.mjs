import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";

import {
  sha256,
  stableJson,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import {
  evaluateOnePieceSchemaReadbackV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import {
  captureOnePieceProtectedBoundariesV1,
} from "./one_piece_canonical_import_rollback_db_v1.mjs";
import {
  captureOnePieceSchemaReadbackV1,
} from "./one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import {
  captureOnePieceCompleteSourceInventoryV1,
  captureOnePieceCompleteStagingCollisionStateV1,
  evaluateOnePieceCompleteSourceInventoryV1,
  loadFrozenOnePieceCompleteStagingReleaseV1,
  onePieceCompleteStagingClientV1,
} from "./one_piece_complete_staging_release_db_v1.mjs";
import {
  environmentFingerprint,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";

export const ONE_PIECE_COMPLETE_STAGING_PREFLIGHT_VERSION =
  "ONE_PIECE_COMPLETE_CATALOG_STAGING_RELEASE_PREFLIGHT_V1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_staging_release_v1", "production_preflight_v1");

function parseArgs(argv) {
  const args = { expectedHeadSha: "", outDir: DEFAULT_OUT,
    envFile: "C:\\grookai_vault\\.env.local" };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).trim().toLowerCase();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice(10));
    } else if (arg.startsWith("--env-file=")) {
      args.envFile = path.resolve(arg.slice(11));
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
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

function selectRollbackCanaryBatches(release) {
  const sortedBySize = [...release.batches].sort((left, right) =>
    left.staging_rows.length - right.staging_rows.length ||
    left.batch.source_group_id - right.batch.source_group_id);
  const selected = [sortedBySize[0], sortedBySize.at(-1)];
  const riskBatch = release.batches.find((entry) =>
    entry.batch.row_counts.ambiguous_quarantined > 0 ||
    entry.batch.row_counts.future_or_presale_holds > 0);
  if (riskBatch && !selected.some((entry) => entry.batch.id === riskBatch.batch.id)) {
    selected.push(riskBatch);
  }
  for (const candidate of sortedBySize) {
    if (selected.length >= 3) break;
    if (!selected.some((entry) => entry.batch.id === candidate.batch.id)) {
      selected.push(candidate);
    }
  }
  return selected.map((entry) => ({
    id: entry.batch.id,
    source_group_id: entry.batch.source_group_id,
    source_group_name: entry.batch.source_group_name,
    row_count: entry.staging_rows.length,
    row_counts: entry.batch.row_counts,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.commit_sha !== args.expectedHeadSha ||
      repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean preflight producer");
  }
  const loaded = await loadFrozenOnePieceCompleteStagingReleaseV1(ROOT);
  if (loaded.release.plan.repository.commit_sha !== repository.commit_sha) {
    throw new Error("Frozen plan producer does not match current HEAD");
  }
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlan = {
    version: ONE_PIECE_COMPLETE_STAGING_PREFLIGHT_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    plan_fingerprint_sha256: loaded.release.plan.plan_fingerprint_sha256,
    release_payload_fingerprint_sha256:
      loaded.release.plan.release_payload_fingerprint_sha256,
    mode: "read_only_preflight",
    expected_batches: loaded.release.plan.aggregate_counts.materialized_source_groups,
    expected_rows: loaded.release.plan.aggregate_counts.source_products,
    boundaries: {
      database_writes: false,
      canonical_or_public_writes: false,
      pricing_storage_pointer_or_vault_writes: false,
    },
  };
  const bodies = {
    "run_plan.json": await writeJson(path.join(args.outDir, "run_plan.json"), runPlan),
  };

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
  if (!connectionString) throw new Error("Production database URL is missing");
  const client = onePieceCompleteStagingClientV1(connectionString,
    "one-piece-complete-staging-preflight-v1");
  await client.connect();
  let open = false;
  let collision;
  let source;
  let schema;
  let protectedSnapshot;
  try {
    await client.query("set default_transaction_read_only=on");
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    collision = await captureOnePieceCompleteStagingCollisionStateV1(
      client, loaded.release);
    source = await captureOnePieceCompleteSourceInventoryV1(client, loaded.release);
    schema = await captureOnePieceSchemaReadbackV1(client);
    protectedSnapshot = await captureOnePieceProtectedBoundariesV1(client);
    await client.query("rollback");
    open = false;
  } finally {
    if (open) await client.query("rollback").catch(() => {});
    await client.end();
  }
  schema.transaction_closed_before_artifacts = true;
  const findings = [];
  findings.push(...collision.evaluation.findings);
  const sourceEvaluation = evaluateOnePieceCompleteSourceInventoryV1(
    loaded.release, source);
  findings.push(...sourceEvaluation.findings.map((value) => `source:${value}`));
  findings.push(...evaluateOnePieceSchemaReadbackV1({
    plan: loaded.schemaPlan,
    readback: schema,
    expectedTableRowCounts: {
      one_piece_canonical_import_batches: collision.existing_batch_rows,
      one_piece_canonical_import_rows: collision.existing_staging_rows,
    },
  }).map((value) => `schema:${value}`));
  if (collision.existing_batch_rows !== 1 || collision.existing_staging_rows !== 21) {
    findings.push("unexpected_existing_staging_baseline");
  }
  if (collision.historical_source_product_overlaps !== 21) {
    findings.push("historical_st01_overlap_mismatch");
  }
  const canaryBatches = selectRollbackCanaryBatches(loaded.release);
  const sourceProof = {
    group_count: source.group_count,
    active_group_count: source.active_group_count,
    product_count: source.product_count,
    active_product_count: source.active_product_count,
    selected_product_count: source.selected_product_count,
    empty_groups: source.empty_groups,
    selected_products_sha256: sha256(stableJson(source.products)),
    selected_groups_sha256: sha256(stableJson(source.groups)),
  };
  const core = {
    version: ONE_PIECE_COMPLETE_STAGING_PREFLIGHT_VERSION,
    producer_commit_sha: repository.commit_sha,
    plan_fingerprint_sha256: loaded.release.plan.plan_fingerprint_sha256,
    release_payload_fingerprint_sha256:
      loaded.release.plan.release_payload_fingerprint_sha256,
    collision_state: collision,
    source_proof: sourceProof,
    schema_readback_sha256: sha256(stableJson(schema)),
    protected_snapshot_sha256: sha256(stableJson(protectedSnapshot)),
    rollback_canary_batches: canaryBatches,
    findings: [...new Set(findings)],
  };
  const summary = {
    ...core,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "pass" : "blocked",
    preflight_fingerprint_sha256: sha256(stableJson(core)),
    environment: environmentFingerprint(connectionString, "production"),
    read_only_proof: {
      transaction_read_only: schema.transaction_read_only,
      transaction_closed_before_artifacts: true,
    },
    boundaries: runPlan.boundaries,
    exact_next_gate: findings.length === 0
      ? "rollback-only representative multi-group canary"
      : "repair preflight findings without database writes",
  };
  bodies["collision_state.json"] = await writeJson(
    path.join(args.outDir, "collision_state.json"), collision);
  bodies["source_proof.json"] = await writeJson(
    path.join(args.outDir, "source_proof.json"), sourceProof);
  bodies["schema_readback.json"] = await writeJson(
    path.join(args.outDir, "schema_readback.json"), schema);
  bodies["protected_snapshot.json"] = await writeJson(
    path.join(args.outDir, "protected_snapshot.json"), protectedSnapshot);
  bodies["summary.json"] = await writeJson(
    path.join(args.outDir, "summary.json"), summary);
  const report = `# One Piece Complete Staging Preflight V1\n\n` +
    `- Status: **${summary.status.toUpperCase()}**\n` +
    `- Proposed batches / rows: ` +
    `\`${runPlan.expected_batches}\` / \`${runPlan.expected_rows}\`\n` +
    `- Existing immutable baseline: ` +
    `\`${collision.existing_batch_rows}\` / ` +
    `\`${collision.existing_staging_rows}\`\n` +
    `- Blocking collisions: \`${collision.evaluation.findings.length}\`\n` +
    `- Historical ST-01 source overlaps: ` +
    `\`${collision.historical_source_product_overlaps}\` (expected)\n` +
    `- Empty source groups: \`${source.empty_groups.length}\`\n` +
    `- Findings: \`${summary.findings.length}\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), report, "utf8");
  bodies["REPORT.md"] = report;
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(bodies).map(([artifactPath, body]) => ({
      path: artifactPath,
      bytes: Buffer.byteLength(body),
      sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    preflight_fingerprint_sha256: summary.preflight_fingerprint_sha256,
    proposed_batches: runPlan.expected_batches,
    proposed_rows: runPlan.expected_rows,
    historical_source_overlaps: collision.historical_source_product_overlaps,
    empty_groups: source.empty_groups,
    canary_batches: canaryBatches,
    findings: summary.findings,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
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
