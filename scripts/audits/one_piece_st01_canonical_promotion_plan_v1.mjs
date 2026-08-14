import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildOnePieceSt01PromotionPlanV1,
  ONE_PIECE_ST01_PINNED_INPUTS,
  validateOnePieceSt01PromotionPlanV1,
} from "../../backend/pricing/one_piece_st01_canonical_promotion_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const INPUTS = Object.freeze({
  staged_readback: "docs/audits/pricing/one_piece_canonical_import_durable_payload_apply_v1/production_apply_v1_independent_verify/readback.json",
  readiness_rows: "docs/audits/pricing/one_piece_st01_language_and_image_readiness_v1/st01_group_3189_v1/readiness_rows.jsonl",
  storage_readback_rows: "docs/audits/pricing/one_piece_st01_storage_permanent_readback_v1/st01_18_objects_v1/readback_rows.jsonl",
  foundation_summary: "docs/audits/pricing/one_piece_canonical_catalog_foundation_apply_v1/independent_post_apply_v1/summary.json",
});
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "frozen_plan_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

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

function jsonLines(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
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
    throw new Error("Repository is not the exact clean plan producer");
  }
  const bodies = {};
  for (const [key, relativePath] of Object.entries(INPUTS)) {
    bodies[key] = await fs.readFile(path.join(ROOT, relativePath), "utf8");
  }
  const inputHashes = {
    staged_readback_sha256: sha256(bodies.staged_readback),
    readiness_rows_sha256: sha256(bodies.readiness_rows),
    storage_readback_rows_sha256: sha256(bodies.storage_readback_rows),
    foundation_summary_sha256: sha256(bodies.foundation_summary),
  };
  if (JSON.stringify(inputHashes) !== JSON.stringify(ONE_PIECE_ST01_PINNED_INPUTS)) {
    throw new Error("Checked-in evidence hash mismatch");
  }
  const plan = buildOnePieceSt01PromotionPlanV1({
    repository,
    inputHashes,
    stagedReadback: JSON.parse(bodies.staged_readback),
    readinessRows: jsonLines(bodies.readiness_rows),
    storageRows: jsonLines(bodies.storage_readback_rows),
    foundationSummary: JSON.parse(bodies.foundation_summary),
  });
  const validation = validateOnePieceSt01PromotionPlanV1(plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  await fs.mkdir(args.outDir, { recursive: true });
  const planBody = await writeJson(path.join(args.outDir, "plan.json"), plan);
  const reportBody = `# One Piece ST-01 Canonical Promotion Plan V1\n\n` +
    `- Status: \`frozen_offline_plan_passed\`\n` +
    `- Plan fingerprint: \`${plan.plan_fingerprint_sha256}\`\n` +
    `- Payload fingerprint: \`${plan.payload_fingerprint_sha256}\`\n` +
    `- Numbered cards: \`17\`\n` +
    `- Durable writes authorized: \`0\`\n` +
    `- Image pointer writes authorized: \`0\`\n` +
    `- DON/sealed rows: \`0 / 0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "plan.json", sha256: sha256(planBody) },
      { path: "REPORT.md", sha256: sha256(reportBody) },
    ],
    bound_inputs: Object.entries(INPUTS).map(([key, inputPath]) => ({
      key, path: inputPath, sha256: inputHashes[`${key}_sha256`],
    })),
  });
  process.stdout.write(`${JSON.stringify({
    status: "frozen_offline_plan_passed",
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { INPUTS, parseArgs };

