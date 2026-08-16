import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildOnePieceSt01PrintingImageMutationPlanV1,
  ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PINNED_INPUTS,
  ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PLAN_VERSION,
  validateOnePieceSt01PrintingImageMutationPlanV1,
} from "../../backend/pricing/one_piece_st01_printing_image_mutation_plan_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const READINESS_ROOT = "docs/audits/pricing/one_piece_st01_printing_image_readiness_v1/identity_source_candidate_v1";
export const INPUTS = Object.freeze({
  evidence_plan: `${READINESS_ROOT}/evidence_plan.json`,
  readiness_rows: `${READINESS_ROOT}/readiness_rows.jsonl`,
  readiness_summary: `${READINESS_ROOT}/summary.json`,
  production_readback: `${READINESS_ROOT}/production_readback.json`,
});
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_printing_image_mutation_plan_v1", "frozen_offline_plan_v1");

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
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function parseJsonl(body) {
  return body.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function report(plan) {
  const blockers = plan.mutation_payload.foil_taxonomy_blockers
    .map((row) => `- \`${row.card_number}\` ${row.name}`).join("\n");
  return `# One Piece ST-01 Printing And Image Mutation Plan V1\n\n` +
    `- Status: \`frozen_offline_plan_no_database_access\`\n` +
    `- Plan fingerprint: \`${plan.mutation_plan_fingerprint_sha256}\`\n` +
    `- Mutation payload fingerprint: \`${plan.mutation_payload_fingerprint_sha256}\`\n` +
    `- Parent artwork-pointer updates: \`17\`\n` +
    `- Normal child-printing inserts: \`14\`\n` +
    `- TCGPlayer printing-mapping inserts: \`14\`\n` +
    `- Foil taxonomy blockers: \`3\`\n` +
    `- Child image writes: \`0\`\n` +
    `- Database access: \`false\`\n` +
    `- Execution performed: \`false\`\n\n` +
    `## Foil Blockers\n\n${blockers}\n\n` +
    `The source-foil rows have no proposed child or printing-mapping row and ` +
    `are not translated to \`holo\`.\n\n` +
    `## Rollback Contract\n\n` +
    `A future canary must attribute exactly 17 updates to \`card_prints\`, ` +
    `14 inserts to \`card_printings\`, and 14 inserts to ` +
    `\`external_printing_mappings\`. It must read back the exact transaction ` +
    `state, roll back, and independently prove the original zero-child, ` +
    `zero-mapping, null-pointer baseline.\n\n` +
    `This artifact has no database client, execution mode, approval token, ` +
    `Storage access, or durable writer.\n`;
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
    throw new Error("Repository is not the exact clean offline-plan producer");
  }
  const bodies = {};
  for (const [key, relativePath] of Object.entries(INPUTS)) {
    bodies[key] = await fs.readFile(path.join(ROOT, relativePath), "utf8");
  }
  const inputHashes = Object.fromEntries(Object.entries(bodies).map(([key, body]) => [
    `${key}_sha256`, sha256(body),
  ]));
  if (JSON.stringify(inputHashes) !==
      JSON.stringify(ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PINNED_INPUTS)) {
    throw new Error("Pinned mutation-plan evidence changed");
  }
  const plan = buildOnePieceSt01PrintingImageMutationPlanV1({
    repository,
    inputHashes,
    evidencePlan: JSON.parse(bodies.evidence_plan),
    readinessRows: parseJsonl(bodies.readiness_rows),
    readinessSummary: JSON.parse(bodies.readiness_summary),
    productionReadback: JSON.parse(bodies.production_readback),
  });
  const validation = validateOnePieceSt01PrintingImageMutationPlanV1(plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));

  await fs.mkdir(args.outDir, { recursive: true });
  const planBody = await writeJson(path.join(args.outDir, "mutation_plan.json"), plan);
  const reportBody = report(plan);
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  const summary = {
    version: ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PLAN_VERSION,
    recorded_at: new Date().toISOString(),
    status: "frozen_offline_plan_no_database_access",
    repository,
    mutation_plan_fingerprint_sha256: plan.mutation_plan_fingerprint_sha256,
    mutation_payload_fingerprint_sha256:
      plan.mutation_payload_fingerprint_sha256,
    counts: plan.counts,
    rollback_attribution:
      plan.rollback_contract.expected_attributable_writes,
    findings: validation.findings,
    boundaries: plan.boundaries,
    next_gate:
      "separately_governed_rollback_only_production_canary_from_frozen_plan",
  };
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "mutation_plan.json", sha256: sha256(planBody) },
      { path: "summary.json", sha256: sha256(summaryBody) },
      { path: "REPORT.md", sha256: sha256(reportBody) },
    ],
    bound_inputs: Object.entries(INPUTS).map(([key, inputPath]) => ({
      key,
      path: inputPath,
      sha256: inputHashes[`${key}_sha256`],
    })),
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    mutation_plan_fingerprint_sha256: plan.mutation_plan_fingerprint_sha256,
    mutation_payload_fingerprint_sha256:
      plan.mutation_payload_fingerprint_sha256,
    counts: plan.counts,
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

export { DEFAULT_OUT, parseArgs };
