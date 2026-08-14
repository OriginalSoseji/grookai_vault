import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildOnePieceSourceExpectationV1,
  compareOnePieceProtectedSnapshotsV1,
  evaluateOnePieceExecutionSummaryV1,
  evaluateOnePieceSourceSnapshotV1,
  evaluateOnePieceStagingFootprintAbsentV1,
  ONE_PIECE_POST_ROLLBACK_VERIFIER_VERSION,
  PINNED_ONE_PIECE_CANARY_PLAN_SHA256,
  verifyOnePieceRollbackExecutionInputsV1,
} from "../../backend/pricing/one_piece_canonical_import_rollback_canary_v1.mjs";
import { captureOnePieceReadOnlyProofV1 } from "./one_piece_canonical_import_rollback_db_v1.mjs";
import {
  DEFAULT_MANIFEST,
  DEFAULT_MIGRATION,
  DEFAULT_PLAN,
} from "./one_piece_canonical_import_rollback_canary_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function timestampSegment(date = new Date()) {
  return date.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

function parseArgs(argv) {
  const args = {
    verify: false,
    plan: DEFAULT_PLAN,
    manifest: DEFAULT_MANIFEST,
    migrationDraft: DEFAULT_MIGRATION,
    executionSummary: null,
    outDir: null,
  };
  for (const arg of argv) {
    if (arg === "--verify-post-rollback") args.verify = true;
    else if (arg.startsWith("--plan=")) args.plan = path.resolve(arg.slice(7));
    else if (arg.startsWith("--manifest=")) args.manifest = path.resolve(arg.slice(11));
    else if (arg.startsWith("--migration-draft=")) args.migrationDraft = path.resolve(arg.slice(18));
    else if (arg.startsWith("--execution-summary=")) {
      args.executionSummary = path.resolve(arg.slice(20));
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.verify) throw new Error("--verify-post-rollback is required");
  if (!args.executionSummary) throw new Error("--execution-summary=<summary.json> is required");
  args.outDir ??= path.join(
    path.dirname(args.executionSummary),
    `independent_verify_${timestampSegment()}`,
  );
  return args;
}

function repositoryState() {
  const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  return {
    commit_sha: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]),
  };
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body, "utf8");
}

function report(result) {
  return `# One Piece Independent Post-Rollback Verification V1

- Status: **${result.status.toUpperCase()}**
- Verifier: \`${result.version}\`
- Repository SHA: \`${result.repository.commit_sha}\`
- Plan fingerprint: \`${result.canary_plan_fingerprint_sha256}\`
- Migration draft SHA-256: \`${result.migration_draft_sha256}\`
- Execution summary SHA-256: \`${result.execution_summary_sha256}\`
- Fresh transaction read-only: \`${result.production?.transaction_read_only ?? false}\`
- Staging tables/functions/policies/triggers/indexes present: \`0\` required
- Protected-boundary findings: \`${result.findings.length}\`
- Database writes: \`0\`
`;
}

async function preserveArtifacts(outDir, result, runPlan) {
  await fs.mkdir(outDir, { recursive: true });
  const buffers = {};
  buffers["run_plan.json"] = await writeJson(path.join(outDir, "run_plan.json"), runPlan);
  buffers["production_readback.json"] = await writeJson(
    path.join(outDir, "production_readback.json"),
    result.production,
  );
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

export function evaluateIndependentOnePiecePostRollbackV1({
  plan,
  executionSummary,
  production,
  sourceExpectation,
}) {
  const findings = [];
  findings.push(...evaluateOnePieceExecutionSummaryV1({ summary: executionSummary, sourceExpectation }));
  if (production.transaction_read_only !== true || production.default_transaction_read_only !== true) {
    findings.push("independent_connection_not_read_only");
  }
  findings.push(
    ...evaluateOnePieceStagingFootprintAbsentV1(production.staging_footprint),
    ...compareOnePieceProtectedSnapshotsV1(
      executionSummary.database_proof?.baseline?.protected_boundaries,
      production.protected_boundaries,
    ),
    ...evaluateOnePieceSourceSnapshotV1(sourceExpectation, production.source),
  );
  if (plan.canary_plan_fingerprint_sha256 !== PINNED_ONE_PIECE_CANARY_PLAN_SHA256) {
    findings.push("local_plan_fingerprint_mismatch");
  }
  return [...new Set(findings)];
}

export async function independentlyVerifyOnePieceRollbackV1({
  args,
  captureReadOnly = captureOnePieceReadOnlyProofV1,
  repository = repositoryState(),
}) {
  const [planBody, migrationDraft, compressedManifest, executionBody] = await Promise.all([
    fs.readFile(args.plan),
    fs.readFile(args.migrationDraft),
    fs.readFile(args.manifest),
    fs.readFile(args.executionSummary),
  ]);
  const plan = JSON.parse(planBody.toString("utf8"));
  const executionSummary = JSON.parse(executionBody.toString("utf8"));
  const localPreflight = verifyOnePieceRollbackExecutionInputsV1({
    plan,
    migrationDraft,
    compressedManifest,
  });
  if (!localPreflight.valid) {
    throw new Error(`Local input verification failed: ${localPreflight.issues.join(", ")}`);
  }
  const sourceExpectation = buildOnePieceSourceExpectationV1(plan);
  const executionFindings = evaluateOnePieceExecutionSummaryV1({
    summary: executionSummary,
    sourceExpectation,
  });
  if (executionFindings.length > 0) {
    throw new Error(
      `Execution summary failed local verification: ${executionFindings.join(", ")}`,
    );
  }
  const production = await captureReadOnly({
    plan,
    sourceExpectation,
    applicationName: "one-piece-independent-post-rollback-v1",
  });
  const findings = evaluateIndependentOnePiecePostRollbackV1({
    plan,
    executionSummary,
    production,
    sourceExpectation,
  });
  const result = {
    version: ONE_PIECE_POST_ROLLBACK_VERIFIER_VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "rollback_independently_verified" : "blocked",
    repository,
    canary_plan_fingerprint_sha256: plan.canary_plan_fingerprint_sha256,
    migration_draft_sha256: localPreflight.migration_draft_sha256,
    manifest_logical_sha256: localPreflight.manifest_logical_sha256,
    execution_summary_sha256: sha256(executionBody),
    production,
    findings,
    boundaries: {
      fresh_read_only_connection: true,
      database_writes: false,
      durable_staging_objects: false,
      canonical_writes: false,
      sealed_writes: false,
      publication_writes: false,
      pricing_writes: false,
      vault_writes: false,
      release_control_writes: false,
      mtg_writes: false,
    },
  };
  const runPlan = {
    version: ONE_PIECE_POST_ROLLBACK_VERIFIER_VERSION,
    repository,
    execution_summary_file: path.relative(ROOT, args.executionSummary).replaceAll("\\", "/"),
    execution_summary_sha256: result.execution_summary_sha256,
    plan_fingerprint: plan.canary_plan_fingerprint_sha256,
    mode: "fresh_read_only_post_rollback_verification",
  };
  await preserveArtifacts(args.outDir, result, runPlan);
  if (findings.length > 0) {
    throw new Error(`Independent post-rollback verification failed: ${findings.join(", ")}`);
  }
  return { out_dir: args.outDir, result };
}

async function main() {
  const verification = await independentlyVerifyOnePieceRollbackV1({
    args: parseArgs(process.argv.slice(2)),
  });
  process.stdout.write(
    `${JSON.stringify({ out_dir: verification.out_dir, status: verification.result.status })}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export { parseArgs };
