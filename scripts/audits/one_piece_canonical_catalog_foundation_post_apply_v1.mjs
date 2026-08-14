import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

import {
  ONE_PIECE_FOUNDATION_APPLY_PLAN_PATH,
  ONE_PIECE_FOUNDATION_APPLY_VERSION,
  evaluateOnePieceFoundationDurableReadbackV1,
} from "../../backend/pricing/one_piece_canonical_catalog_foundation_apply_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import {
  captureFreshReadOnly,
  evaluateAttributableWrites,
} from "./one_piece_canonical_catalog_foundation_apply_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
const VERIFIER_VERSION = "ONE_PIECE_CANONICAL_FOUNDATION_POST_APPLY_V1";

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    executionSummary: "",
    outDir: "",
  };
  for (const argument of argv) {
    if (argument.startsWith("--env-file=")) args.envFile = path.resolve(argument.slice(11));
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--execution-summary=")) {
      args.executionSummary = path.resolve(argument.slice(20));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  if (!args.executionSummary) throw new Error("--execution-summary is required");
  if (!args.outDir) throw new Error("--out-dir is required");
  return args;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function evaluateExecutionSummary({ plan, execution }) {
  const findings = [];
  if (execution.version !== ONE_PIECE_FOUNDATION_APPLY_VERSION ||
      execution.status !== "foundation_applied_hidden_and_readback_passed" ||
      execution.committed !== true) {
    findings.push("execution_status_not_authoritative");
  }
  if (execution.apply_plan_fingerprint_sha256 !==
      plan.apply_plan_fingerprint_sha256 ||
      execution.migration_sha256 !== plan.migration.sha256) {
    findings.push("execution_plan_binding_mismatch");
  }
  findings.push(...evaluateAttributableWrites(execution.attributable_writes ?? []));
  if (execution.boundaries?.app_visibility_enabled !== false ||
      Number(execution.boundaries?.card_rows) !== 0 ||
      Number(execution.boundaries?.sealed_rows) !== 0 ||
      Number(execution.boundaries?.pricing_writes) !== 0 ||
      Number(execution.boundaries?.vault_writes) !== 0) {
    findings.push("execution_boundary_mismatch");
  }
  return [...new Set(findings)];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
  };
  if (repository.commit_sha !== args.expectedHeadSha || repository.branch !== BRANCH ||
      git("status", "--porcelain", "--untracked-files=no") !== "") {
    throw new Error("Repository is not the exact clean post-apply verifier producer");
  }
  const [planBody, executionBody] = await Promise.all([
    fs.readFile(path.join(ROOT, ONE_PIECE_FOUNDATION_APPLY_PLAN_PATH)),
    fs.readFile(args.executionSummary),
  ]);
  const plan = JSON.parse(planBody);
  const execution = JSON.parse(executionBody);
  const executionFindings = evaluateExecutionSummary({ plan, execution });
  if (executionFindings.length) {
    throw new Error(`Execution proof is ineligible: ${executionFindings.join(",")}`);
  }
  const runPlan = {
    version: VERIFIER_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    execution_summary_path: path.relative(ROOT, args.executionSummary).replaceAll("\\", "/"),
    execution_summary_sha256: sha256(executionBody),
    apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
    mode: "fresh_read_only_post_apply_verification",
    boundaries: {
      database_writes: 0,
      migration_apply: 0,
      canonical_writes: 0,
      sealed_writes: 0,
      storage_writes: 0,
      pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
    },
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const readback = await captureFreshReadOnly(connectionString);
  const findings = evaluateOnePieceFoundationDurableReadbackV1({ plan, readback });
  const summary = {
    version: VERIFIER_VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "foundation_post_apply_independently_verified" : "blocked",
    repository,
    execution_summary_sha256: sha256(executionBody),
    apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
    migration_sha256: plan.migration.sha256,
    readback,
    findings,
    boundaries: {
      fresh_read_only_connection: true,
      database_writes: 0,
      app_visibility_enabled: false,
      canonical_card_rows_written: 0,
      sealed_rows_written: 0,
      pricing_writes: 0,
      vault_writes: 0,
    },
  };
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const readbackBody = await writeJson(path.join(args.outDir, "readback.json"), readback);
  const reportBody = `# One Piece Canonical Foundation Independent Post-Apply V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Plan fingerprint: \`${summary.apply_plan_fingerprint_sha256}\`\n` +
    `- Release state: \`${readback.release_control_row?.release_status}\`\n` +
    `- One Piece card rows: \`${readback.card_count}\`\n` +
    `- Findings: \`${findings.length}\`\n` +
    `- Database writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "run_plan.json", sha256: sha256(runPlanBody) },
      { path: "summary.json", sha256: sha256(summaryBody) },
      { path: "readback.json", sha256: sha256(readbackBody) },
      { path: "REPORT.md", sha256: sha256(reportBody) },
    ],
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    findings,
    output_directory: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
  if (findings.length) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { evaluateExecutionSummary, parseArgs };
