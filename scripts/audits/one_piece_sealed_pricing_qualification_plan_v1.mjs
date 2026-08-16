import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  ONE_PIECE_SEALED_PRICING_QUALIFICATION_PLAN_VERSION,
  buildOnePieceSealedPricingQualificationPlanV1,
  hashOnePieceSealedPricingQualificationPlanV1,
  validateOnePieceSealedPricingQualificationPlanV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_plan_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_pricing_lineage_v1", "production_read_only_v1");
const SOURCE_PATH = path.join(SOURCE_DIR, "qualification_plan.json.gz");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_pricing_qualification_plan_v1", "frozen_plan_v1");

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
    throw new Error("Repository is not the exact clean qualification-plan producer");
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
  const [sourceBuffer, hashText] = await Promise.all([
    fs.readFile(SOURCE_PATH),
    fs.readFile(path.join(SOURCE_DIR, "artifact_hashes.json"), "utf8"),
  ]);
  const hashes = JSON.parse(hashText);
  const expectedSourceHash = hashes.artifacts.find((entry) =>
    entry.path === "qualification_plan.json.gz")?.sha256;
  const sourceArtifactSha256 =
    hashOnePieceSealedPricingQualificationPlanV1(sourceBuffer);
  if (!expectedSourceHash || expectedSourceHash !== sourceArtifactSha256) {
    throw new Error("Source qualification artifact hash mismatch");
  }
  const sourcePlan = JSON.parse(gunzipSync(sourceBuffer));
  const plan = buildOnePieceSealedPricingQualificationPlanV1({
    repository: repo, sourcePlan, sourceArtifactSha256,
  });
  const validation = validateOnePieceSealedPricingQualificationPlanV1(plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlan = {
    version: ONE_PIECE_SEALED_PRICING_QUALIFICATION_PLAN_VERSION,
    recorded_at: new Date().toISOString(),
    repository: repo,
    mode: "offline_database_shaped_plan",
    source_qualification_artifact_sha256: sourceArtifactSha256,
    boundaries: { database_connections: 0, database_writes: 0,
      release_writes: 0, publication_writes: 0, app_visibility_changes: 0 },
  };
  const planBody = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  const compressedPlan = gzipSync(planBody);
  const summary = { ...runPlan, status: "frozen_plan_passed_no_writes",
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    counts: plan.counts, validation,
    exact_next_gate: "run a three-status production rollback-only insertion canary" };
  const report = `# One Piece Sealed Pricing Qualification Plan V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Qualification rows: \`${plan.counts.qualification_rows}\`\n` +
    `- Missing-observation holds: \`${plan.counts.missing_observation_holds}\`\n` +
    `- Statuses: \`${JSON.stringify(plan.counts.qualification_statuses)}\`\n` +
    `- Plan fingerprint: \`${plan.plan_fingerprint_sha256}\`\n` +
    `- Payload fingerprint: \`${plan.payload_fingerprint_sha256}\`\n` +
    `- Database connections/writes: \`0 / 0\`\n` +
    `- Release/publication/visibility writes: \`0 / 0 / 0\`\n`;
  const artifacts = {
    "run_plan.json": await writeJson(path.join(args.outDir, "run_plan.json"),
      runPlan),
    "qualification_plan.json.gz": compressedPlan,
    "summary.json": await writeJson(path.join(args.outDir, "summary.json"),
      summary),
    "REPORT.md": Buffer.from(report),
  };
  await Promise.all([
    fs.writeFile(path.join(args.outDir, "qualification_plan.json.gz"),
      compressedPlan),
    fs.writeFile(path.join(args.outDir, "REPORT.md"), artifacts["REPORT.md"]),
  ]);
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    producer_commit_sha: repo.commit_sha,
    artifacts: Object.fromEntries(Object.entries(artifacts).map(
      ([name, body]) => [name, { bytes: body.length, sha256:
        hashOnePieceSealedPricingQualificationPlanV1(body) }])),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
