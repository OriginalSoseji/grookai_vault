import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

import {
  evaluateOnePieceSt01PrintingImagePostApplyV1,
  ONE_PIECE_ST01_PRINTING_IMAGE_POST_APPLY_VERSION,
  validateOnePieceSt01PrintingImageDurableApplyPlanV1,
} from "../../backend/pricing/one_piece_st01_printing_image_apply_v1.mjs";
import {
  validateOnePieceSt01PrintingImageMutationPlanV1,
} from "../../backend/pricing/one_piece_st01_printing_image_mutation_plan_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import {
  APPLY_PLAN_PATH,
  DEFAULT_OUT as DEFAULT_APPLY_OUT,
} from "./one_piece_st01_printing_image_apply_v1.mjs";
import {
  captureOnePieceSt01PrintingImageStateV1,
  PLAN_PATH,
} from "./one_piece_st01_printing_image_rollback_canary_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
export const DEFAULT_APPLY_SUMMARY = path.join(DEFAULT_APPLY_OUT, "summary.json");
export const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_printing_image_durable_apply_v1",
  "independent_post_apply_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    expectedExecutionProducerSha: "",
    expectedExecutionSummarySha256: "",
    applySummary: DEFAULT_APPLY_SUMMARY,
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
    } else if (argument.startsWith("--apply-summary=")) {
      args.applySummary = path.resolve(argument.slice(16));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedExecutionProducerSha)) {
    throw new Error("--expected-execution-producer-sha=<40-character SHA> is required");
  }
  if (!/^[0-9a-f]{64}$/.test(args.expectedExecutionSummarySha256)) {
    throw new Error("--expected-execution-summary-sha256=<SHA-256> is required");
  }
  return args;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
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
    throw new Error("Repository is not the exact clean post-apply verifier");
  }
  const [mutationPlanBody, applyPlanBody, applySummaryBody] = await Promise.all([
    fs.readFile(PLAN_PATH, "utf8"),
    fs.readFile(APPLY_PLAN_PATH, "utf8"),
    fs.readFile(args.applySummary, "utf8"),
  ]);
  const mutationPlan = JSON.parse(mutationPlanBody);
  const applyPlan = JSON.parse(applyPlanBody);
  const applySummary = JSON.parse(applySummaryBody);
  const findings = [
    ...validateOnePieceSt01PrintingImageMutationPlanV1(mutationPlan).findings,
    ...validateOnePieceSt01PrintingImageDurableApplyPlanV1(
      applyPlan,
      mutationPlan,
    ).findings,
  ];
  if (sha256(applySummaryBody) !== args.expectedExecutionSummarySha256) {
    findings.push("execution_summary_hash_mismatch");
  }
  if (applySummary?.repository?.commit_sha !==
      args.expectedExecutionProducerSha) {
    findings.push("execution_producer_sha_mismatch");
  }
  if (findings.length) throw new Error([...new Set(findings)].join(","));

  const runPlan = {
    version: ONE_PIECE_ST01_PRINTING_IMAGE_POST_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    execution_producer_sha: args.expectedExecutionProducerSha,
    execution_summary_sha256: args.expectedExecutionSummarySha256,
    mutation_plan_sha256: sha256(mutationPlanBody),
    apply_plan_sha256: sha256(applyPlanBody),
    mode: "fresh_read_only_production_verification",
    boundaries: {
      database_writes: 0,
      storage_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      app_visibility_changes: 0,
    },
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(
    path.join(args.outDir, "run_plan.json"),
    runPlan,
  );

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const freshReadback = await captureOnePieceSt01PrintingImageStateV1(
    connectionString,
    mutationPlan,
    "one-piece-st01-printing-image-independent-post-apply-v1",
  );
  const postApplyFindings = evaluateOnePieceSt01PrintingImagePostApplyV1({
    mutationPlan,
    applyPlan,
    applySummary,
    freshReadback,
  });
  const summary = {
    version: ONE_PIECE_ST01_PRINTING_IMAGE_POST_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    status: postApplyFindings.length === 0
      ? "fresh_read_only_post_apply_verification_passed"
      : "fresh_read_only_post_apply_verification_failed",
    repository,
    execution_producer_sha: args.expectedExecutionProducerSha,
    execution_summary_sha256: args.expectedExecutionSummarySha256,
    apply_plan_fingerprint_sha256:
      applyPlan.apply_plan_fingerprint_sha256,
    mutation_payload_fingerprint_sha256:
      mutationPlan.mutation_payload_fingerprint_sha256,
    transaction_read_only: freshReadback.transaction_read_only,
    fresh_readback: freshReadback,
    findings: postApplyFindings,
    boundaries: runPlan.boundaries,
  };
  const summaryBody = await writeJson(
    path.join(args.outDir, "summary.json"),
    summary,
  );
  const readbackBody = await writeJson(
    path.join(args.outDir, "fresh_readback.json"),
    freshReadback,
  );
  const reportBody =
    "# One Piece ST-01 Printing And Image Independent Post-Apply V1\n\n" +
    `- Status: \`${summary.status}\`\n` +
    `- Apply producer: \`${args.expectedExecutionProducerSha}\`\n` +
    `- Verifier producer: \`${repository.commit_sha}\`\n` +
    `- Transaction read-only: \`${summary.transaction_read_only}\`\n` +
    `- Findings: ${postApplyFindings.length
      ? postApplyFindings.map((item) => `\`${item}\``).join(", ")
      : "none"}\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      ["run_plan.json", runPlanBody],
      ["summary.json", summaryBody],
      ["fresh_readback.json", readbackBody],
      ["REPORT.md", reportBody],
    ].map(([artifactPath, body]) => ({
      path: artifactPath,
      sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    findings: postApplyFindings,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
  if (postApplyFindings.length) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
