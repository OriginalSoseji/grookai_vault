import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

import {
  compareFoundationProtectedCountsV1,
  evaluateOnePieceFoundationPreflightV1,
  foundationRunPlanFingerprint,
} from "../../backend/pricing/one_piece_canonical_catalog_foundation_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { captureFoundationState } from "./one_piece_canonical_catalog_foundation_rollback_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
const VERIFIER_VERSION =
  "ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_POST_ROLLBACK_V1";
const EXECUTION_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_foundation_rollback_v1",
  "production_rollback_attempt_2_v1");
const EXECUTION_SUMMARY = path.join(EXECUTION_DIR, "summary.json");
const EXECUTION_RUN_PLAN = path.join(EXECUTION_DIR, "run_plan.json");
const EXECUTION_TRANSACTION_PROOF = path.join(EXECUTION_DIR, "transaction_proof.json");
const EXECUTION_BASELINE = path.join(EXECUTION_DIR, "protected_before.json");
const EXECUTION_POST_ROLLBACK = path.join(EXECUTION_DIR, "post_rollback_readback.json");
const EXECUTION_HASHES = path.join(EXECUTION_DIR, "artifact_hashes.json");
const PINNED_EXECUTION_SUMMARY_SHA256 =
  "5ce5f0b841ab3639ec9c2d8c17ad9bf8d0f6bbe5dfdaaf66a06a63f0190b1637";
const PINNED_ROLLBACK_PROOF_SHA256 =
  "c055c08d0231ad99b7958afc5e915b5bb9841a5169628d8523f5c3fa29472fe1";
const PINNED_EXECUTION_PRODUCER_SHA =
  "6238188779763f996787c867aff4c7fb487cc0ba";
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_foundation_rollback_v1",
  "independent_post_rollback_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    verify: false,
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument === "--verify-post-rollback") args.verify = true;
    else if (argument.startsWith("--env-file=")) args.envFile = path.resolve(argument.slice(11));
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!args.verify) throw new Error("--verify-post-rollback is required");
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function verifyExecutionArtifacts({ bodies, hashes, summary, transactionProof }) {
  const findings = [];
  if (sha256(bodies["summary.json"]) !== PINNED_EXECUTION_SUMMARY_SHA256) {
    findings.push("execution_summary_hash_mismatch");
  }
  if (summary.status !== "rollback_canary_passed_zero_durable_change" ||
      summary.rollback_proof_sha256 !== PINNED_ROLLBACK_PROOF_SHA256 ||
      summary.repository?.commit_sha !== PINNED_EXECUTION_PRODUCER_SHA ||
      summary.findings?.length !== 0) {
    findings.push("execution_summary_not_authoritative");
  }
  if (summary.transaction?.statements_planned !== 9 ||
      summary.transaction?.statements_executed !== 9 ||
      summary.transaction?.rollback_attempted !== true ||
      summary.transaction?.rollback_succeeded !== true) {
    findings.push("execution_transaction_proof_incomplete");
  }
  if (transactionProof.statements_planned !== 9 ||
      transactionProof.statements_executed !== 9 ||
      transactionProof.rollback_attempted !== true ||
      transactionProof.rollback_succeeded !== true ||
      transactionProof.applied_findings?.length !== 0 ||
      transactionProof.protected_count_findings?.length !== 0) {
    findings.push("transaction_artifact_not_authoritative");
  }
  for (const artifact of hashes.artifacts ?? []) {
    if (!(artifact.path in bodies) || sha256(bodies[artifact.path]) !== artifact.sha256) {
      findings.push(`execution_artifact_hash_mismatch:${artifact.path}`);
    }
  }
  for (const required of [
    "run_plan.json", "protected_before.json", "transaction_proof.json",
    "post_rollback_readback.json", "summary.json", "REPORT.md",
  ]) {
    if (!(required in bodies)) findings.push(`execution_artifact_missing:${required}`);
  }
  return [...new Set(findings)];
}

function evaluateIndependentFoundationPostRollbackV1({ baseline, executionPost, production }) {
  const findings = [];
  findings.push(...evaluateOnePieceFoundationPreflightV1(executionPost).findings);
  findings.push(...evaluateOnePieceFoundationPreflightV1(production).findings);
  findings.push(...compareFoundationProtectedCountsV1(
    baseline.protected_counts,
    executionPost.protected_counts,
  ).findings.map((finding) => `execution_${finding}`));
  findings.push(...compareFoundationProtectedCountsV1(
    executionPost.protected_counts,
    production.protected_counts,
  ).findings.map((finding) => `independent_${finding}`));
  for (const key of [
    "candidate_migration_count", "game_code_count", "game_id_count",
    "release_control_count", "st01_set_count", "gv_id_collision_count",
    "tcgplayer_id_collision_count", "parent_mapping_collision_count",
  ]) {
    if (Number(executionPost[key] ?? 0) !== Number(baseline[key] ?? 0)) {
      findings.push(`execution_post_rollback_changed:${key}`);
    }
    if (Number(production[key] ?? 0) !== Number(executionPost[key] ?? 0)) {
      findings.push(`independent_production_changed:${key}`);
    }
  }
  if (executionPost.identity_domain_constraint !== baseline.identity_domain_constraint) {
    findings.push("execution_post_rollback_constraint_changed");
  }
  if (production.identity_domain_constraint !== executionPost.identity_domain_constraint) {
    findings.push("independent_production_constraint_changed");
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
    throw new Error("Repository is not the exact clean independent-verifier producer");
  }
  const files = {
    "summary.json": EXECUTION_SUMMARY,
    "run_plan.json": EXECUTION_RUN_PLAN,
    "transaction_proof.json": EXECUTION_TRANSACTION_PROOF,
    "protected_before.json": EXECUTION_BASELINE,
    "post_rollback_readback.json": EXECUTION_POST_ROLLBACK,
    "artifact_hashes.json": EXECUTION_HASHES,
    "REPORT.md": path.join(EXECUTION_DIR, "REPORT.md"),
  };
  const bodies = Object.fromEntries(await Promise.all(
    Object.entries(files).map(async ([name, file]) => [name, await fs.readFile(file)]),
  ));
  const summary = JSON.parse(bodies["summary.json"]);
  const executionRunPlan = JSON.parse(bodies["run_plan.json"]);
  const transactionProof = JSON.parse(bodies["transaction_proof.json"]);
  const baseline = JSON.parse(bodies["protected_before.json"]);
  const executionPost = JSON.parse(bodies["post_rollback_readback.json"]);
  const hashes = JSON.parse(bodies["artifact_hashes.json"]);
  const localFindings = verifyExecutionArtifacts({
    bodies,
    hashes,
    summary,
    transactionProof,
  });
  if (localFindings.length) {
    throw new Error(`Execution artifact verification failed: ${localFindings.join(", ")}`);
  }
  const runPlanCore = {
    version: VERIFIER_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    authority: {
      execution_summary: path.relative(ROOT, EXECUTION_SUMMARY).replaceAll("\\", "/"),
      execution_summary_sha256: sha256(bodies["summary.json"]),
      rollback_proof_sha256: summary.rollback_proof_sha256,
      execution_producer_sha: summary.repository.commit_sha,
    },
    mode: "fresh_read_only_post_rollback_verification",
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
  const runPlan = {
    ...runPlanCore,
    run_plan_fingerprint_sha256: foundationRunPlanFingerprint(runPlanCore),
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const production = await captureFoundationState(connectionString, {
    productIds: executionRunPlan.exact_scope.product_ids,
    gvIds: executionRunPlan.exact_scope.gv_ids,
    applicationName: "one-piece-foundation-independent-post-rollback-v1",
  });
  const findings = evaluateIndependentFoundationPostRollbackV1({
    baseline,
    executionPost,
    production,
  });
  const resultCore = {
    version: VERIFIER_VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "rollback_independently_verified_zero_residue" : "blocked",
    repository,
    execution_summary_sha256: sha256(bodies["summary.json"]),
    rollback_proof_sha256: summary.rollback_proof_sha256,
    production,
    findings,
    boundaries: {
      run_plan_written_before_database_access: true,
      fresh_read_only_connection: true,
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
  const result = {
    ...resultCore,
    independent_proof_sha256: sha256(JSON.stringify(resultCore)),
  };
  const productionBody = await writeJson(
    path.join(args.outDir, "production_readback.json"),
    production,
  );
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), result);
  const reportBody = `# One Piece Foundation Independent Post-Rollback Verification V1\n\n` +
    `- Status: \`${result.status}\`\n` +
    `- Execution summary SHA-256: \`${result.execution_summary_sha256}\`\n` +
    `- Rollback proof: \`${result.rollback_proof_sha256}\`\n` +
    `- Fresh transaction read-only: \`${production.transaction_read_only}\`\n` +
    `- One Piece game/release rows: \`${production.game_code_count} / ` +
      `${production.release_control_count}\`\n` +
    `- Migration ledger rows: \`${production.candidate_migration_count}\`\n` +
    `- Findings: \`${findings.length}\`\n` +
    `- Database writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "run_plan.json", sha256: sha256(runPlanBody) },
      { path: "production_readback.json", sha256: sha256(productionBody) },
      { path: "summary.json", sha256: sha256(summaryBody) },
      { path: "REPORT.md", sha256: sha256(reportBody) },
    ],
  });
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    independent_proof_sha256: result.independent_proof_sha256,
    findings,
    output_directory: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
  if (findings.length) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

export {
  PINNED_EXECUTION_PRODUCER_SHA,
  PINNED_EXECUTION_SUMMARY_SHA256,
  PINNED_ROLLBACK_PROOF_SHA256,
  VERIFIER_VERSION,
  evaluateIndependentFoundationPostRollbackV1,
  parseArgs,
  verifyExecutionArtifacts,
};
