import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_SEALED_PRICING_QUALIFICATION_APPLY_PLAN_VERSION,
  buildOnePieceSealedPricingQualificationApplyPlanV1,
  validateOnePieceSealedPricingQualificationApplyPlanV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_apply_plan_v1.mjs";
import {
  hashOnePieceSealedPricingQualificationPlanV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_plan_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT_ROOT = path.join(ROOT, "docs", "audits", "pricing");
const SOURCE_PLAN_PATH = path.join(AUDIT_ROOT,
  "one_piece_sealed_pricing_qualification_plan_v1", "frozen_plan_v1",
  "qualification_plan.json.gz");
const CANARY_SUMMARY_PATH = path.join(AUDIT_ROOT,
  "one_piece_sealed_pricing_qualification_rollback_canary_v1",
  "production_rollback_v1", "summary.json");
const DEFAULT_OUT = path.join(AUDIT_ROOT,
  "one_piece_sealed_pricing_qualification_apply_plan_v1",
  "frozen_apply_plan_v1");

function parseArgs(argv) {
  const args = { expectedHeadSha: "", outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function repository(args) {
  const result = { branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"), tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "" };
  if (result.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      result.commit_sha !== args.expectedHeadSha ||
      !result.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean apply-plan producer");
  }
  return result;
}

async function writeJson(file, value) {
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await fs.writeFile(file, body);
  return body;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const [sourceBody, canaryBody] = await Promise.all([
    fs.readFile(SOURCE_PLAN_PATH), fs.readFile(CANARY_SUMMARY_PATH),
  ]);
  const qualificationPlan = JSON.parse(gunzipSync(sourceBody));
  const canarySummary = JSON.parse(canaryBody);
  const plan = buildOnePieceSealedPricingQualificationApplyPlanV1({
    repository: repo,
    qualificationPlan,
    qualificationPlanArtifactSha256:
      hashOnePieceSealedPricingQualificationPlanV1(sourceBody),
    rollbackCanarySummary: canarySummary,
    rollbackCanarySummarySha256:
      hashOnePieceSealedPricingQualificationPlanV1(canaryBody),
  });
  const validation = validateOnePieceSealedPricingQualificationApplyPlanV1({
    plan, qualificationPlan });
  if (!validation.valid) throw new Error(validation.findings.join(","));
  await fs.mkdir(args.outDir, { recursive: true });
  const report = `# One Piece Sealed Pricing Qualification Apply Plan V1\n\n` +
    `- Status: \`frozen_not_executed\`\n` +
    `- Planned inserts: \`374\`\n` +
    `- Missing-observation holds excluded: \`16\`\n` +
    `- Apply-plan fingerprint: \`${plan.apply_plan_fingerprint_sha256}\`\n` +
    `- Source payload fingerprint: \`${plan.source_payload_fingerprint_sha256}\`\n` +
    `- Mutation-contract hash: \`${plan.mutation_contract_sha256}\`\n` +
    `- Database connections/writes: \`0 / 0\`\n` +
    `- Release/publication/visibility writes: \`0 / 0 / 0\`\n`;
  const planBody = await writeJson(path.join(args.outDir, "plan.json"), plan);
  const summary = {
    version: ONE_PIECE_SEALED_PRICING_QUALIFICATION_APPLY_PLAN_VERSION,
    status: "frozen_not_executed",
    repository: repo,
    apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
    source_payload_fingerprint_sha256: plan.source_payload_fingerprint_sha256,
    mutation_contract_sha256: plan.mutation_contract_sha256,
    planned_inserts: 374,
    excluded_missing_observation_holds: 16,
    database_connections: 0,
    database_writes: 0,
    apply_executed: false,
    validation,
    exact_next_gate: "run the durable writer in no-connection dry-run mode",
  };
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"),
    summary);
  const reportBody = Buffer.from(report);
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody);
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256", producer_commit_sha: repo.commit_sha,
    artifacts: {
      "plan.json": { bytes: planBody.length, sha256:
        hashOnePieceSealedPricingQualificationPlanV1(planBody) },
      "summary.json": { bytes: summaryBody.length, sha256:
        hashOnePieceSealedPricingQualificationPlanV1(summaryBody) },
      "REPORT.md": { bytes: reportBody.length, sha256:
        hashOnePieceSealedPricingQualificationPlanV1(reportBody) },
    },
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
