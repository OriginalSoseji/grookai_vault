import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildOnePieceSourceExpectationV1,
  ONE_PIECE_ROLLBACK_APPROVAL,
  ONE_PIECE_ROLLBACK_EXECUTOR_VERSION,
  PINNED_ONE_PIECE_CANARY_PLAN_SHA256,
  PINNED_ONE_PIECE_MIGRATION_DRAFT_SHA256,
  verifyOnePieceRollbackExecutionInputsV1,
} from "../../backend/pricing/one_piece_canonical_import_rollback_canary_v1.mjs";
import {
  assertOnePieceBaselineV1,
  assertOnePiecePostRollbackV1,
  captureOnePieceReadOnlyProofV1,
  runOnePieceRollbackTransactionV1,
} from "./one_piece_canonical_import_rollback_db_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_ROOT = path.join(
  ROOT,
  "docs",
  "audits",
  "pricing",
  "one_piece_canonical_import_staging_and_canary_v1",
  "e55e334b828db7b3_security_hardened",
);
const DEFAULT_PLAN = path.join(AUDIT_ROOT, "canary_plan.json");
const DEFAULT_MANIFEST = path.join(
  ROOT,
  "docs",
  "audits",
  "pricing",
  "one_piece_canonical_catalog_readiness_v1",
  "2026-08-14T04-53-27-691Z",
  "source_product_manifest.jsonl.gz",
);
const DEFAULT_MIGRATION = path.join(
  ROOT,
  "supabase",
  "migration_drafts",
  "20260814010000_one_piece_canonical_import_staging_v1.sql",
);
const APPROVAL_ENV = "ONE_PIECE_ROLLBACK_CANARY_APPROVAL";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function timestampSegment(date = new Date()) {
  return date.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

function parseArgs(argv) {
  const args = {
    execute: false,
    plan: DEFAULT_PLAN,
    manifest: DEFAULT_MANIFEST,
    migrationDraft: DEFAULT_MIGRATION,
    outDir: null,
  };
  for (const arg of argv) {
    if (arg === "--execute-rollback-canary") args.execute = true;
    else if (arg.startsWith("--plan=")) args.plan = path.resolve(arg.slice(7));
    else if (arg.startsWith("--manifest=")) args.manifest = path.resolve(arg.slice(11));
    else if (arg.startsWith("--migration-draft=")) {
      args.migrationDraft = path.resolve(arg.slice(18));
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.execute) throw new Error("--execute-rollback-canary is required");
  args.outDir ??= path.join(AUDIT_ROOT, `production_rollback_${timestampSegment()}`);
  return args;
}

function repositoryState() {
  const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  return {
    commit_sha: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]),
    tracked_worktree_clean:
      git(["status", "--porcelain", "--untracked-files=no"]) === "",
  };
}

function sanitizeError(error) {
  return String(error?.message ?? error)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .slice(0, 4000);
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body, "utf8");
}

function report(result) {
  return `# One Piece Canonical Import Production Rollback Canary V1

- Status: **${result.status.toUpperCase()}**
- Executor: \`${result.version}\`
- Repository SHA: \`${result.repository.commit_sha}\`
- Branch: \`${result.repository.branch}\`
- Plan fingerprint: \`${result.canary_plan_fingerprint_sha256}\`
- Migration draft SHA-256: \`${result.migration_draft_sha256}\`
- Selected group: \`${result.selected_group_id}\`
- Transaction-local batch rows: \`${result.database_proof?.transaction?.transaction_readback?.batch_count ?? 0}\`
- Transaction-local staging rows: \`${result.database_proof?.transaction?.transaction_readback?.row_count ?? 0}\`
- Rollback attempted: \`${result.database_proof?.transaction?.rollback_attempted ?? false}\`
- Rollback succeeded: \`${result.database_proof?.transaction?.rollback_succeeded ?? false}\`
- Fresh read-only verification: \`${result.database_proof?.post_rollback?.transaction_read_only ?? false}\`
- Durable schema objects: \`0\` required
- Durable rows authorized: \`0\`
- Findings: \`${result.findings.length}\`

This executor has no commit path. The staging draft, one batch, and 21 exact
source rows exist only inside one transaction that is always rolled back. The
automatic post-rollback proof uses a newly created read-only connection. A
second standalone verifier remains required for independent confirmation.
`;
}

async function preserveArtifacts(outDir, result, runPlan, failure = null) {
  await fs.mkdir(outDir, { recursive: true });
  const buffers = {};
  buffers["run_plan.json"] = await writeJson(path.join(outDir, "run_plan.json"), runPlan);
  if (result.database_proof?.baseline) {
    buffers["protected_before.json"] = await writeJson(
      path.join(outDir, "protected_before.json"),
      result.database_proof.baseline,
    );
  }
  if (result.database_proof?.transaction) {
    buffers["transaction_proof.json"] = await writeJson(
      path.join(outDir, "transaction_proof.json"),
      result.database_proof.transaction,
    );
  }
  if (result.database_proof?.post_rollback) {
    buffers["post_rollback_proof.json"] = await writeJson(
      path.join(outDir, "post_rollback_proof.json"),
      result.database_proof.post_rollback,
    );
  }
  if (failure) {
    buffers["failure.json"] = await writeJson(path.join(outDir, "failure.json"), failure);
  }
  buffers["summary.json"] = await writeJson(path.join(outDir, "summary.json"), result);
  buffers["REPORT.md"] = Buffer.from(report(result), "utf8");
  await fs.writeFile(path.join(outDir, "REPORT.md"), buffers["REPORT.md"]);
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.fromEntries(
      Object.entries(buffers)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, body]) => [name, sha256(body)]),
    ),
  });
}

export async function executeOnePieceProductionRollbackCanaryV1({
  args,
  approval = process.env[APPROVAL_ENV],
  captureReadOnly = captureOnePieceReadOnlyProofV1,
  runTransaction = runOnePieceRollbackTransactionV1,
  repository = repositoryState(),
}) {
  const recordedAt = new Date().toISOString();
  const [planBody, migrationDraft, compressedManifest] = await Promise.all([
    fs.readFile(args.plan),
    fs.readFile(args.migrationDraft),
    fs.readFile(args.manifest),
  ]);
  const plan = JSON.parse(planBody.toString("utf8"));
  const localPreflight = verifyOnePieceRollbackExecutionInputsV1({
    plan,
    migrationDraft,
    compressedManifest,
  });
  const runPlan = {
    version: ONE_PIECE_ROLLBACK_EXECUTOR_VERSION,
    recorded_at: recordedAt,
    repository,
    inputs: {
      plan_file: path.relative(ROOT, args.plan).replaceAll("\\", "/"),
      plan_file_sha256: sha256(planBody),
      canary_plan_fingerprint_sha256: plan.canary_plan_fingerprint_sha256,
      migration_draft_file: path.relative(ROOT, args.migrationDraft).replaceAll("\\", "/"),
      migration_draft_sha256: localPreflight.migration_draft_sha256,
      manifest_file: path.relative(ROOT, args.manifest).replaceAll("\\", "/"),
      manifest_logical_sha256: localPreflight.manifest_logical_sha256,
    },
    selected_group_id: plan.selected_group.source_group_id,
    selected_source_rows: plan.staging_rows.length,
    execution_mode: "rollback_only",
    authorized_durable_rows: 0,
    boundaries: plan.boundaries,
  };
  const result = {
    version: ONE_PIECE_ROLLBACK_EXECUTOR_VERSION,
    recorded_at: recordedAt,
    status: "blocked_before_database_access",
    repository,
    canary_plan_fingerprint_sha256: plan.canary_plan_fingerprint_sha256,
    migration_draft_sha256: localPreflight.migration_draft_sha256,
    manifest_logical_sha256: localPreflight.manifest_logical_sha256,
    selected_group_id: plan.selected_group.source_group_id,
    selected_source_rows: plan.staging_rows.length,
    local_preflight: { ...localPreflight, migration_inner_body: undefined },
    database_proof: { baseline: null, transaction: null, post_rollback: null },
    findings: [],
    authorized_durable_rows: 0,
  };
  let failure = null;
  let primaryError = null;
  const sourceExpectation = buildOnePieceSourceExpectationV1(plan);

  try {
    if (!localPreflight.valid) {
      throw new Error(`Local input verification failed: ${localPreflight.issues.join(", ")}`);
    }
    if (repository.branch !== "agent/one-piece-ingestion-readiness-v1") {
      throw new Error("Unexpected repository branch");
    }
    if (!repository.tracked_worktree_clean) {
      throw new Error("Tracked worktree must be clean before production execution");
    }
    if (approval !== ONE_PIECE_ROLLBACK_APPROVAL) {
      throw new Error(`Exact approval is missing from ${APPROVAL_ENV}`);
    }
    result.database_proof.baseline = await captureReadOnly({
      plan,
      sourceExpectation,
      applicationName: "one-piece-rollback-canary-baseline-v1",
    });
    assertOnePieceBaselineV1({
      baseline: result.database_proof.baseline,
      sourceExpectation,
    });
    result.status = "baseline_passed_transaction_pending";
    try {
      result.database_proof.transaction = await runTransaction({
        plan,
        migrationInnerBody: localPreflight.migration_inner_body,
        baseline: result.database_proof.baseline,
        sourceExpectation,
      });
    } catch (error) {
      if (error.databaseProof) result.database_proof.transaction = error.databaseProof;
      throw error;
    }
  } catch (error) {
    primaryError = error;
  } finally {
    if (result.database_proof.baseline && result.database_proof.transaction?.rollback_attempted) {
      try {
        result.database_proof.post_rollback = await captureReadOnly({
          plan,
          sourceExpectation,
          applicationName: "one-piece-rollback-canary-post-rollback-v1",
        });
        assertOnePiecePostRollbackV1({
          baseline: result.database_proof.baseline,
          postRollback: result.database_proof.post_rollback,
          sourceExpectation,
        });
      } catch (postError) {
        result.findings.push(`post_rollback_verification_failed:${sanitizeError(postError)}`);
        primaryError ??= postError;
      }
    }
  }

  if (!primaryError) {
    if (
      result.database_proof.transaction?.rollback_succeeded !== true ||
      result.database_proof.post_rollback?.transaction_read_only !== true
    ) {
      primaryError = new Error("Rollback and fresh read-only verification were not both proven");
    }
  }
  if (primaryError) {
    result.status = "blocked";
    result.findings.push(sanitizeError(primaryError));
    failure = {
      recorded_at: new Date().toISOString(),
      error: sanitizeError(primaryError),
      rollback_attempted: result.database_proof.transaction?.rollback_attempted ?? false,
      rollback_succeeded: result.database_proof.transaction?.rollback_succeeded ?? false,
      fresh_post_rollback_attempted: result.database_proof.post_rollback !== null,
    };
  } else {
    result.status = "rollback_canary_passed_zero_durable_change";
  }
  await preserveArtifacts(args.outDir, result, runPlan, failure);
  if (primaryError) {
    const error = new Error(`${sanitizeError(primaryError)}; artifacts: ${args.outDir}`);
    error.result = result;
    throw error;
  }
  return { out_dir: args.outDir, result };
}

async function main() {
  const execution = await executeOnePieceProductionRollbackCanaryV1({
    args: parseArgs(process.argv.slice(2)),
  });
  process.stdout.write(
    `${JSON.stringify({ out_dir: execution.out_dir, status: execution.result.status })}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(sanitizeError(error));
    process.exitCode = 1;
  });
}

export {
  APPROVAL_ENV,
  DEFAULT_MANIFEST,
  DEFAULT_MIGRATION,
  DEFAULT_PLAN,
  parseArgs,
};
