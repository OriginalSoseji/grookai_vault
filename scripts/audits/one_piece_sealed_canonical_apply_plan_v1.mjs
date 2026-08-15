import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_SEALED_CANONICAL_APPLY_PLAN_VERSION,
  buildOnePieceSealedCanonicalApplyPlanV1,
  hashOnePieceSealedCanonicalApplyPlanV1,
  validateOnePieceSealedCanonicalApplyPlanV1,
} from "../../backend/pricing/one_piece_sealed_canonical_apply_plan_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT_ROOT = path.join(ROOT, "docs", "audits", "pricing");
const CANONICAL_PATH = path.join(AUDIT_ROOT,
  "one_piece_sealed_online_evidence_resolution_v1", "frozen_live_resolution_v1",
  "canonical_plan.json.gz");
const PREFLIGHT_PATH = path.join(AUDIT_ROOT,
  "one_piece_sealed_canonical_preflight_v1", "production_read_only_v1",
  "summary.json");
const CANARY_PATH = path.join(AUDIT_ROOT,
  "one_piece_sealed_canonical_rollback_canary_v1", "production_rollback_v1",
  "summary.json");
const OUT_DIR = path.join(AUDIT_ROOT,
  "one_piece_sealed_canonical_apply_plan_v1", "frozen_apply_plan_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const prefix = "--expected-head-sha=";
  const arg = argv.find((entry) => entry.startsWith(prefix));
  if (argv.length !== 1 || !arg || !/^[0-9a-f]{40}$/.test(arg.slice(
    prefix.length))) throw new Error("Exact --expected-head-sha is required");
  return { expectedHeadSha: arg.slice(prefix.length) };
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = { branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"), tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "" };
  if (repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      repository.commit_sha !== args.expectedHeadSha ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean apply-plan producer");
  }
  const [canonicalBuffer, preflightText, canaryText] = await Promise.all([
    fs.readFile(CANONICAL_PATH), fs.readFile(PREFLIGHT_PATH, "utf8"),
    fs.readFile(CANARY_PATH, "utf8")]);
  const canonicalPlan = JSON.parse(gunzipSync(canonicalBuffer));
  const plan = buildOnePieceSealedCanonicalApplyPlanV1({ repository,
    canonicalPlan,
    canonicalPlanSha256:
      hashOnePieceSealedCanonicalApplyPlanV1(canonicalBuffer),
    preflight: JSON.parse(preflightText),
    rollbackCanary: JSON.parse(canaryText) });
  const validation = validateOnePieceSealedCanonicalApplyPlanV1(plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  await fs.mkdir(OUT_DIR, { recursive: true });
  const report = `# One Piece Sealed Canonical Apply Plan V1\n\n` +
    `- Status: \`frozen_not_executed\`\n` +
    `- Apply-plan fingerprint: \`${plan.apply_plan_fingerprint_sha256}\`\n` +
    `- Payload fingerprint: \`${plan.canonical_payload_fingerprint_sha256}\`\n` +
    `- Mutation-contract hash: \`${plan.mutation_contract_sha256}\`\n` +
    `- Planned inserts: \`242 / 390 / 390 / 390 / 1731\`\n` +
    `- Updates/deletes: \`0 / 0\`\n` +
    `- Pricing/release/publication/Vault writes: \`0\`\n` +
    `- Database writes performed by this plan: \`0\`\n`;
  const planBody = await writeJson(path.join(OUT_DIR, "plan.json"), plan);
  const reportBody = Buffer.from(report);
  await fs.writeFile(path.join(OUT_DIR, "REPORT.md"), reportBody);
  await writeJson(path.join(OUT_DIR, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    producer_commit_sha: repository.commit_sha,
    artifacts: {
      "plan.json": { sha256:
        hashOnePieceSealedCanonicalApplyPlanV1(planBody), bytes: planBody.length },
      "REPORT.md": { sha256:
        hashOnePieceSealedCanonicalApplyPlanV1(reportBody), bytes: reportBody.length },
    },
  });
  console.log(JSON.stringify({
    version: ONE_PIECE_SEALED_CANONICAL_APPLY_PLAN_VERSION,
    status: "frozen_not_executed",
    apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
    canonical_payload_fingerprint_sha256:
      plan.canonical_payload_fingerprint_sha256,
    mutation_contract_sha256: plan.mutation_contract_sha256,
    database_writes: 0,
  }, null, 2));
}

await main();
