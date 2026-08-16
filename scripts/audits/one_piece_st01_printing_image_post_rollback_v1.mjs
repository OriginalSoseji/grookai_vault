import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

import {
  evaluateOnePieceSt01PrintingImageZeroResidueV1,
  validateOnePieceSt01PrintingImageMutationPlanV1,
} from "../../backend/pricing/one_piece_st01_printing_image_mutation_plan_v1.mjs";
import {
  sha256,
  stableJson,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import {
  captureOnePieceSt01PrintingImageStateV1,
  PLAN_PATH,
} from "./one_piece_st01_printing_image_rollback_canary_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
export const VERIFIER_VERSION =
  "ONE_PIECE_ST01_PRINTING_IMAGE_POST_ROLLBACK_V1";
const DEFAULT_EXECUTION_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_printing_image_rollback_canary_v1", "production_rollback_v1");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_printing_image_rollback_canary_v1",
  "independent_post_rollback_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    expectedExecutionProducerSha: "",
    expectedExecutionSummarySha256: "",
    executionDir: DEFAULT_EXECUTION_DIR,
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--expected-execution-producer-sha=")) {
      args.expectedExecutionProducerSha = argument.slice(34).trim().toLowerCase();
    } else if (argument.startsWith("--expected-execution-summary-sha256=")) {
      args.expectedExecutionSummarySha256 = argument.slice(36).trim().toLowerCase();
    } else if (argument.startsWith("--execution-dir=")) {
      args.executionDir = path.resolve(argument.slice(16));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  for (const [key, value] of [
    ["expected-head-sha", args.expectedHeadSha],
    ["expected-execution-producer-sha", args.expectedExecutionProducerSha],
  ]) {
    if (!/^[0-9a-f]{40}$/.test(value)) {
      throw new Error(`--${key}=<40-character SHA> is required`);
    }
  }
  if (!/^[0-9a-f]{64}$/.test(args.expectedExecutionSummarySha256)) {
    throw new Error(
      "--expected-execution-summary-sha256=<64-character SHA-256> is required",
    );
  }
  return args;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

export function evaluateIndependentPostRollbackV1({
  plan,
  executionBefore,
  executionAfter,
  production,
}) {
  const findings = [
    ...evaluateOnePieceSt01PrintingImageZeroResidueV1({
      plan,
      readback: executionAfter,
    }).map((finding) => `execution_${finding}`),
    ...evaluateOnePieceSt01PrintingImageZeroResidueV1({
      plan,
      readback: production,
    }).map((finding) => `independent_${finding}`),
  ];
  if (production?.transaction_read_only !== true) {
    findings.push("independent_readback_not_read_only");
  }
  for (const key of ["parent_pointer_rows", "child_rows",
    "external_printing_mapping_rows", "release_status", "anon_visible",
    "authenticated_visible", "service_visible"]) {
    if (stableJson(executionBefore?.[key]) !==
        stableJson(executionAfter?.[key])) {
      findings.push(`execution_baseline_changed:${key}`);
    }
    if (stableJson(executionAfter?.[key]) !== stableJson(production?.[key])) {
      findings.push(`production_changed_after_execution:${key}`);
    }
  }
  return [...new Set(findings)];
}

function verifyExecutionArtifacts({ args, bodies, hashes, summary }) {
  const findings = [];
  if (sha256(bodies["summary.json"]) !==
      args.expectedExecutionSummarySha256) {
    findings.push("execution_summary_hash_mismatch");
  }
  if (summary.status !== "rollback_canary_passed_zero_durable_rows" ||
      summary.repository?.commit_sha !== args.expectedExecutionProducerSha ||
      summary.transaction?.rollback_succeeded !== true ||
      summary.findings?.length !== 0) {
    findings.push("execution_summary_not_authoritative");
  }
  for (const artifact of hashes.artifacts ?? []) {
    if (!(artifact.path in bodies) ||
        sha256(bodies[artifact.path]) !== artifact.sha256) {
      findings.push(`execution_artifact_hash_mismatch:${artifact.path}`);
    }
  }
  for (const required of ["run_plan.json", "protected_before.json",
    "transaction_proof.json", "post_rollback_readback.json", "summary.json",
    "REPORT.md"]) {
    if (!(required in bodies)) findings.push(`execution_artifact_missing:${required}`);
  }
  return [...new Set(findings)];
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
      repository.branch !== BRANCH || !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean independent verifier");
  }
  const names = ["run_plan.json", "protected_before.json",
    "transaction_proof.json", "post_rollback_readback.json", "summary.json",
    "REPORT.md"];
  const bodies = Object.fromEntries(await Promise.all(names.map(async (name) => [
    name,
    await fs.readFile(path.join(args.executionDir, name)),
  ])));
  const hashes = JSON.parse(await fs.readFile(
    path.join(args.executionDir, "artifact_hashes.json"),
    "utf8",
  ));
  const summary = JSON.parse(bodies["summary.json"]);
  const localFindings = verifyExecutionArtifacts({ args, bodies, hashes, summary });
  if (localFindings.length) {
    throw new Error(`Execution artifact verification failed: ${localFindings.join(",")}`);
  }
  const planBody = await fs.readFile(PLAN_PATH, "utf8");
  const plan = JSON.parse(planBody);
  const validation = validateOnePieceSt01PrintingImageMutationPlanV1(plan);
  if (!validation.valid || summary.mutation_plan_fingerprint_sha256 !==
      plan.mutation_plan_fingerprint_sha256) {
    throw new Error("Execution is not bound to the frozen valid mutation plan");
  }
  const runPlan = {
    version: VERIFIER_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    authority: {
      execution_directory:
        path.relative(ROOT, args.executionDir).replaceAll("\\", "/"),
      execution_summary_sha256: args.expectedExecutionSummarySha256,
      execution_producer_sha: args.expectedExecutionProducerSha,
      rollback_proof_sha256: summary.rollback_proof_sha256,
      mutation_plan_sha256: sha256(planBody),
      mutation_plan_fingerprint_sha256:
        plan.mutation_plan_fingerprint_sha256,
    },
    mode: "fresh_read_only_post_rollback_verification",
    boundaries: {
      database_writes: 0,
      storage_writes: 0,
      pointer_writes: 0,
      child_printing_writes: 0,
      printing_mapping_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      app_visibility_changes: 0,
    },
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"),
    runPlan);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const production = await captureOnePieceSt01PrintingImageStateV1(
    connectionString,
    plan,
    "one-piece-st01-printing-image-independent-post-rollback-v1",
  );
  const executionBefore = JSON.parse(bodies["protected_before.json"]);
  const executionAfter = JSON.parse(bodies["post_rollback_readback.json"]);
  const findings = evaluateIndependentPostRollbackV1({
    plan,
    executionBefore,
    executionAfter,
    production,
  });
  const resultCore = {
    version: VERIFIER_VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0
      ? "rollback_independently_verified_zero_residue"
      : "blocked",
    repository,
    execution_summary_sha256: args.expectedExecutionSummarySha256,
    execution_producer_sha: args.expectedExecutionProducerSha,
    rollback_proof_sha256: summary.rollback_proof_sha256,
    production,
    findings,
    boundaries: {
      run_plan_written_before_database_access: true,
      fresh_read_only_connection: true,
      database_writes: 0,
      storage_writes: 0,
      pointer_writes: 0,
      child_printing_writes: 0,
      printing_mapping_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      app_visibility_changes: 0,
    },
  };
  const result = {
    ...resultCore,
    independent_proof_sha256: sha256(stableJson(resultCore)),
  };
  const productionBody = await writeJson(path.join(args.outDir,
    "production_readback.json"), production);
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"),
    result);
  const reportBody = `# One Piece ST-01 Printing And Image Independent Post-Rollback V1\n\n` +
    `- Status: \`${result.status}\`\n` +
    `- Execution producer SHA: \`${args.expectedExecutionProducerSha}\`\n` +
    `- Execution summary SHA-256: \`${args.expectedExecutionSummarySha256}\`\n` +
    `- Fresh transaction read-only: \`${production.transaction_read_only}\`\n` +
    `- Durable target residue: \`0\`\n` +
    `- Findings: \`${findings.length}\`\n` +
    `- Database/Storage/pricing/publication/Vault writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  const artifactBodies = {
    "run_plan.json": runPlanBody,
    "production_readback.json": productionBody,
    "summary.json": summaryBody,
    "REPORT.md": reportBody,
  };
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(artifactBodies).map(([artifactPath, body]) => ({
      path: artifactPath,
      sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    independent_proof_sha256: result.independent_proof_sha256,
    findings,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
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

export { DEFAULT_EXECUTION_DIR, DEFAULT_OUT, verifyExecutionArtifacts };
