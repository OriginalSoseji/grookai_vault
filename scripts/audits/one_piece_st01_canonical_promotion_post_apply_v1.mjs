import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

import {
  evaluateOnePieceSt01PostApplyV1,
  ONE_PIECE_ST01_POST_APPLY_VERSION,
  validateOnePieceSt01DurableApplyPlanV1,
} from "../../backend/pricing/one_piece_st01_canonical_promotion_apply_v1.mjs";
import { validateOnePieceSt01PromotionPlanV1 } from
  "../../backend/pricing/one_piece_st01_canonical_promotion_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import {
  APPLY_PLAN_PATH,
  captureFreshOnePieceSt01DurableReadbackV1,
} from "./one_piece_st01_canonical_promotion_apply_v1.mjs";
import { PLAN_PATH } from "./one_piece_st01_canonical_promotion_preflight_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_APPLY_SUMMARY = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "durable_apply_execution_v1",
  "summary.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "independent_post_apply_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    applySummary: DEFAULT_APPLY_SUMMARY,
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--apply-summary=")) {
      args.applySummary = path.resolve(argument.slice(16));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
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
    throw new Error("Repository is not the exact clean post-apply verifier producer");
  }
  const [promotionBody, applyPlanBody, applySummaryBody] = await Promise.all([
    fs.readFile(PLAN_PATH, "utf8"),
    fs.readFile(APPLY_PLAN_PATH, "utf8"),
    fs.readFile(args.applySummary, "utf8"),
  ]);
  const promotionPlan = JSON.parse(promotionBody);
  const applyPlan = JSON.parse(applyPlanBody);
  const applySummary = JSON.parse(applySummaryBody);
  const inputFindings = [
    ...validateOnePieceSt01PromotionPlanV1(promotionPlan).findings,
    ...validateOnePieceSt01DurableApplyPlanV1(applyPlan, promotionPlan).findings,
  ];
  if (inputFindings.length) throw new Error(inputFindings.join(","));
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const freshReadback = await captureFreshOnePieceSt01DurableReadbackV1(
    connectionString,
    promotionPlan,
    "one-piece-st01-independent-post-apply-v1",
  );
  const findings = evaluateOnePieceSt01PostApplyV1({
    promotionPlan,
    applyPlan,
    applySummary,
    freshReadback,
  });
  const summary = {
    version: ONE_PIECE_ST01_POST_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0
      ? "fresh_read_only_post_apply_verification_passed"
      : "fresh_read_only_post_apply_verification_failed",
    repository,
    transaction_read_only: true,
    promotion_plan_sha256: sha256(promotionBody),
    apply_plan_sha256: sha256(applyPlanBody),
    apply_summary_sha256: sha256(applySummaryBody),
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: promotionPlan.payload_fingerprint_sha256,
    apply_producer_commit_sha: applySummary.repository?.commit_sha ?? null,
    fresh_readback: freshReadback,
    findings,
    boundaries: applyPlan.boundaries,
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const readbackBody = await writeJson(
    path.join(args.outDir, "fresh_readback.json"), freshReadback);
  const reportBody = `# One Piece ST-01 Independent Post-Apply Verification V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Apply producer: \`${summary.apply_producer_commit_sha}\`\n` +
    `- Verifier producer: \`${repository.commit_sha}\`\n` +
    `- Transaction read-only: \`true\`\n` +
    `- Findings: ${findings.length ? findings.map((item) => `\`${item}\``).join(", ") : "none"}\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
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

export { parseArgs };
