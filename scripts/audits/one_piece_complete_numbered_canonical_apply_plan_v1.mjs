import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_COMPLETE_NUMBERED_APPLY_PINNED_INPUTS,
  buildOnePieceCompleteNumberedApplyPlanV1,
  validateOnePieceCompleteNumberedApplyPlanV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_apply_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PATHS = Object.freeze({
  promotionPlan: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_numbered_canonical_promotion_v1", "frozen_plan_v1",
    "promotion_plan.json.gz"),
  preflightSummary: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_numbered_canonical_preflight_v1", "production_read_only_v1",
    "summary.json"),
  rollbackSummary: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_numbered_canonical_rollback_canary_v1",
    "production_rollback_v1", "summary.json"),
  rollbackTransaction: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_numbered_canonical_rollback_canary_v1",
    "production_rollback_v1", "transaction_proof.json"),
  postRollbackReadback: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_numbered_canonical_rollback_canary_v1",
    "production_rollback_v1", "post_rollback_readback.json"),
});
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_numbered_canonical_apply_v1", "frozen_apply_plan_v1");

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

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body, "utf8");
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
    throw new Error("Repository is not the exact clean apply-plan producer");
  }
  const bodies = Object.fromEntries(await Promise.all(Object.entries(PATHS)
    .map(async ([key, file]) => [key, await fs.readFile(file)])));
  const inputHashes = {
    promotion_plan_gzip_sha256: sha256(bodies.promotionPlan),
    preflight_summary_sha256: sha256(bodies.preflightSummary),
    rollback_summary_sha256: sha256(bodies.rollbackSummary),
    rollback_transaction_sha256: sha256(bodies.rollbackTransaction),
    post_rollback_readback_sha256: sha256(bodies.postRollbackReadback),
  };
  if (JSON.stringify(inputHashes) !== JSON.stringify(
    ONE_PIECE_COMPLETE_NUMBERED_APPLY_PINNED_INPUTS)) {
    throw new Error("Pinned apply-plan inputs changed");
  }
  const promotionPlan = JSON.parse(gunzipSync(bodies.promotionPlan));
  const applyPlan = buildOnePieceCompleteNumberedApplyPlanV1({
    repository,
    inputHashes,
    promotionPlan,
    preflightSummary: JSON.parse(bodies.preflightSummary),
    rollbackSummary: JSON.parse(bodies.rollbackSummary),
    rollbackTransaction: JSON.parse(bodies.rollbackTransaction),
    postRollbackReadback: JSON.parse(bodies.postRollbackReadback),
  });
  const validation = validateOnePieceCompleteNumberedApplyPlanV1(
    applyPlan, promotionPlan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  await fs.mkdir(args.outDir, { recursive: true });
  const artifacts = {};
  artifacts["apply_plan.json"] = await writeJson(
    path.join(args.outDir, "apply_plan.json"), applyPlan);
  const summary = {
    version: applyPlan.version,
    recorded_at: new Date().toISOString(),
    status: "complete_numbered_durable_apply_plan_frozen",
    repository,
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    promotion_plan_fingerprint_sha256:
      applyPlan.promotion_plan_fingerprint_sha256,
    payload_fingerprint_sha256: applyPlan.payload_fingerprint_sha256,
    preflight_fingerprint_sha256: applyPlan.preflight_fingerprint_sha256,
    rollback_canary_fingerprint_sha256:
      applyPlan.rollback_canary_fingerprint_sha256,
    target_binding: applyPlan.target_binding,
    boundaries: applyPlan.boundaries,
    findings: validation.findings,
    exact_next_gate: "run the exact frozen insert-only durable writer",
  };
  artifacts["summary.json"] = await writeJson(
    path.join(args.outDir, "summary.json"), summary);
  const report = `# Complete One Piece Numbered Canonical Apply Plan V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Apply-plan fingerprint: \`${summary.apply_plan_fingerprint_sha256}\`\n` +
    `- Hidden set/card/identity/evidence/mapping inserts: \`58 / 6491 / 6491 / 6491 / 6491\`\n` +
    `- Updates/deletes/children/DON/sealed/Storage/images/pricing/publication/Vault: \`0\`\n` +
    `- App visibility enabled: \`false\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), report, "utf8");
  artifacts["REPORT.md"] = Buffer.from(report, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(artifacts).map(([artifactPath, body]) => ({
      path: artifactPath,
      bytes: body.length,
      sha256: sha256(body),
    })),
    bound_inputs: Object.entries(PATHS).map(([name, file]) => ({
      name,
      path: path.relative(ROOT, file).replaceAll("\\", "/"),
      sha256: inputHashes[{
        promotionPlan: "promotion_plan_gzip_sha256",
        preflightSummary: "preflight_summary_sha256",
        rollbackSummary: "rollback_summary_sha256",
        rollbackTransaction: "rollback_transaction_sha256",
        postRollbackReadback: "post_rollback_readback_sha256",
      }[name]],
    })),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { parseArgs };
