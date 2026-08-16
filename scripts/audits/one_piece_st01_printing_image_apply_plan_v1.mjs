import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildOnePieceSt01PrintingImageDurableApplyPlanV1,
  ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_PINNED_INPUTS,
  validateOnePieceSt01PrintingImageDurableApplyPlanV1,
} from "../../backend/pricing/one_piece_st01_printing_image_apply_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const INPUTS = Object.freeze({
  mutation_plan:
    "docs/audits/pricing/one_piece_st01_printing_image_mutation_plan_v1/hot_update_policy_frozen_plan_v1/mutation_plan.json",
  rollback_summary:
    "docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/production_rollback_hot_policy_v1/summary.json",
  transaction_proof:
    "docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/production_rollback_hot_policy_v1/transaction_proof.json",
  independent_summary:
    "docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/independent_post_rollback_hot_policy_v1/summary.json",
  independent_readback:
    "docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/independent_post_rollback_hot_policy_v1/production_readback.json",
});
export const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_printing_image_durable_apply_v1", "frozen_apply_plan_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function parseArgs(argv) {
  const args = { expectedHeadSha: "", outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
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
    throw new Error("Repository is not the exact clean apply-plan producer");
  }
  const bodies = {};
  for (const [key, relativePath] of Object.entries(INPUTS)) {
    bodies[key] = await fs.readFile(path.join(ROOT, relativePath), "utf8");
  }
  const inputHashes = Object.fromEntries(
    Object.entries(bodies).map(([key, body]) => [`${key}_sha256`, sha256(body)]),
  );
  if (JSON.stringify(inputHashes) !==
      JSON.stringify(ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_PINNED_INPUTS)) {
    throw new Error("Pinned durable-apply evidence changed");
  }
  const mutationPlan = JSON.parse(bodies.mutation_plan);
  const applyPlan = buildOnePieceSt01PrintingImageDurableApplyPlanV1({
    repository,
    inputHashes,
    mutationPlan,
    rollbackSummary: JSON.parse(bodies.rollback_summary),
    transactionProof: JSON.parse(bodies.transaction_proof),
    independentSummary: JSON.parse(bodies.independent_summary),
    independentReadback: JSON.parse(bodies.independent_readback),
  });
  const validation = validateOnePieceSt01PrintingImageDurableApplyPlanV1(
    applyPlan,
    mutationPlan,
  );
  if (!validation.valid) throw new Error(validation.findings.join(","));
  await fs.mkdir(args.outDir, { recursive: true });
  const planBody = await writeJson(
    path.join(args.outDir, "apply_plan.json"),
    applyPlan,
  );
  const reportBody =
    "# One Piece ST-01 Printing And Image Durable Apply Plan V1\n\n" +
    "- Status: `durable_apply_plan_frozen_no_database_access`\n" +
    `- Apply-plan fingerprint: \`${applyPlan.apply_plan_fingerprint_sha256}\`\n` +
    `- Mutation payload fingerprint: \`${applyPlan.mutation_payload_fingerprint_sha256}\`\n` +
    "- Exact scope: `17 parent updates / 14 child inserts / 14 mapping inserts`\n" +
    "- Durable execution performed: `false`\n" +
    "- One Piece visibility: `hidden`\n";
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "apply_plan.json", sha256: sha256(planBody) },
      { path: "REPORT.md", sha256: sha256(reportBody) },
    ],
    bound_inputs: Object.entries(INPUTS).map(([key, inputPath]) => ({
      key,
      path: inputPath,
      sha256: inputHashes[`${key}_sha256`],
    })),
  });
  process.stdout.write(`${JSON.stringify({
    status: "durable_apply_plan_frozen_no_database_access",
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    mutation_payload_fingerprint_sha256:
      applyPlan.mutation_payload_fingerprint_sha256,
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
