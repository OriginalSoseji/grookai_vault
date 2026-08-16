import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildOnePieceDurablePayloadPlanV1,
  validateOnePieceDurablePayloadPlanV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_payload_v1.mjs";
import {
  verifyOnePieceRollbackExecutionInputsV1,
} from "../../backend/pricing/one_piece_canonical_import_rollback_canary_v1.mjs";
import {
  sha256,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE_ROOT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_staging_and_canary_v1",
  "e55e334b828db7b3_security_hardened");
const CANARY_PLAN = path.join(SOURCE_ROOT, "canary_plan.json");
const MANIFEST = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_readiness_v1", "2026-08-14T04-53-27-691Z",
  "source_product_manifest.jsonl.gz");
const OLD_MIGRATION = path.join(ROOT, "supabase", "migration_drafts",
  "20260814010000_one_piece_canonical_import_staging_v1.sql");
const SCHEMA_PROOF = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_staging_schema_apply_v1",
  "production_schema_apply_v1", "summary.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_payload_v1", "bounded_21_row_plan_v1");

function parseArgs(argv) {
  const args = { outDir: DEFAULT_OUT, expectedHeadSha: "" };
  for (const arg of argv) {
    if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).trim().toLowerCase();
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
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
  };
  if (repository.commit_sha !== args.expectedHeadSha) {
    throw new Error("HEAD does not match expected producer SHA");
  }
  if (repository.branch !== "agent/one-piece-ingestion-readiness-v1") {
    throw new Error(`Unexpected branch: ${repository.branch}`);
  }
  if (git("status", "--porcelain") !== "") {
    throw new Error("Payload-plan producer worktree must be clean");
  }
  const [canaryText, manifest, oldMigration, schemaProofText] = await Promise.all([
    fs.readFile(CANARY_PLAN, "utf8"),
    fs.readFile(MANIFEST),
    fs.readFile(OLD_MIGRATION),
    fs.readFile(SCHEMA_PROOF, "utf8"),
  ]);
  const canaryPlan = JSON.parse(canaryText);
  const sourceValidation = verifyOnePieceRollbackExecutionInputsV1({
    plan: canaryPlan,
    migrationDraft: oldMigration,
    compressedManifest: manifest,
  });
  if (!sourceValidation.valid) {
    throw new Error(`Frozen source packet failed: ${sourceValidation.issues.join(",")}`);
  }
  const schemaApplyProof = JSON.parse(schemaProofText);
  const plan = buildOnePieceDurablePayloadPlanV1({
    repository,
    canaryPlan,
    schemaApplyProof,
    schemaApplyProofSha256: sha256(schemaProofText),
  });
  const validation = validateOnePieceDurablePayloadPlanV1(plan);
  if (!validation.valid) {
    throw new Error(`Payload plan failed: ${validation.findings.join(",")}`);
  }
  await fs.mkdir(args.outDir, { recursive: true });
  const planBody = await writeJson(path.join(args.outDir, "plan.json"), plan);
  const payloadBody = await writeJson(path.join(args.outDir, "payload.json"), {
    batch: plan.batch,
    staging_rows: plan.staging_rows,
  });
  const summary = {
    status: "bounded_payload_plan_frozen_no_database_access",
    repository,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    source_manifest_logical_sha256: plan.source_manifest_logical_sha256,
    schema_apply_plan_fingerprint_sha256:
      plan.schema_apply_plan_fingerprint_sha256,
    batch_rows: 1,
    staging_rows: 21,
    counts: plan.counts,
    validation,
    database_connections: 0,
    database_writes: 0,
    exact_next_gate: "fresh production source/schema preflight, then exact 1-batch/21-row service-only staging apply and independent readback",
  };
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const reportBody = `# One Piece Durable Payload Plan V1\n\n` +
    `- Status: **FROZEN / NOT EXECUTED**\n` +
    `- Producer: \`${repository.commit_sha}\`\n` +
    `- Plan fingerprint: \`${plan.plan_fingerprint_sha256}\`\n` +
    `- Payload fingerprint: \`${plan.payload_fingerprint_sha256}\`\n` +
    `- Batch rows: \`1\`\n` +
    `- Staging rows: \`21\`\n` +
    `- Single-card candidates: \`18\`\n` +
    `- Sealed-product candidates: \`3\`\n` +
    `- Canonical or publication authority: \`false\`\n` +
    `- Database connections/writes: \`0 / 0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "plan.json", bytes: Buffer.byteLength(planBody), sha256: sha256(planBody) },
      { path: "payload.json", bytes: Buffer.byteLength(payloadBody),
        sha256: sha256(payloadBody) },
      { path: "summary.json", bytes: Buffer.byteLength(summaryBody),
        sha256: sha256(summaryBody) },
      { path: "REPORT.md", bytes: Buffer.byteLength(reportBody),
        sha256: sha256(reportBody) },
    ],
    bound_inputs: [CANARY_PLAN, MANIFEST, OLD_MIGRATION, SCHEMA_PROOF]
      .map((file) => ({
        path: path.relative(ROOT, file).replaceAll("\\", "/"),
        bytes: null,
        sha256: null,
      })),
  });
  const hashesPath = path.join(args.outDir, "artifact_hashes.json");
  const hashes = JSON.parse(await fs.readFile(hashesPath, "utf8"));
  for (const row of hashes.bound_inputs) {
    const content = await fs.readFile(path.join(ROOT, row.path));
    row.bytes = content.length;
    row.sha256 = sha256(content);
  }
  await writeJson(hashesPath, hashes);
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    guard_token: plan.guard_token,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
