import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  buildOnePieceCompleteCanonicalReconciliationV1,
  validateOnePieceCompleteCanonicalReconciliationV1,
} from "../../backend/pricing/one_piece_complete_canonical_reconciliation_v1.mjs";
import {
  ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256,
  ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
} from "../../backend/pricing/one_piece_complete_staging_release_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_readiness_v1",
  "current_complete_source_2026-08-14_v1");
const MANIFEST_PATH = path.join(SOURCE_DIR, "source_product_manifest.jsonl.gz");
const STAGING_PLAN_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_staging_release_v1", "frozen_plan_v1", "plan.json");
const STAGING_APPLY_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_staging_release_v1", "independent_post_apply_v1",
  "summary.json");
const ST01_PLAN_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "frozen_plan_v1", "plan.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_canonical_reconciliation_v1", "frozen_reconciliation_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = { expectedHeadSha: "", outDir: DEFAULT_OUT };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice("--expected-head-sha=".length).trim();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice("--out-dir=".length));
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
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

function jsonl(values) {
  return `${values.map((value) => JSON.stringify(value)).join("\n")}\n`;
}

function gzipJsonl(values) {
  return gzipSync(Buffer.from(jsonl(values), "utf8"), { level: 9 });
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
    throw new Error("Repository is not the exact clean reconciliation producer");
  }
  const [compressedManifest, stagingPlanBody, stagingApplyBody, st01PlanBody] =
    await Promise.all([
      fs.readFile(MANIFEST_PATH),
      fs.readFile(STAGING_PLAN_PATH, "utf8"),
      fs.readFile(STAGING_APPLY_PATH, "utf8"),
      fs.readFile(ST01_PLAN_PATH, "utf8"),
    ]);
  const logicalManifest = gunzipSync(compressedManifest).toString("utf8");
  if (sha256(compressedManifest) !==
      ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256 ||
      sha256(logicalManifest) !==
      ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256) {
    throw new Error("Frozen complete One Piece manifest changed");
  }
  const stagingPlan = JSON.parse(stagingPlanBody);
  const stagingApply = JSON.parse(stagingApplyBody);
  const st01Plan = JSON.parse(st01PlanBody);
  if (stagingApply.status !== "pass" ||
      stagingApply.release_payload_fingerprint_sha256 !==
        stagingPlan.release_payload_fingerprint_sha256) {
    throw new Error("Complete staging release is not independently verified");
  }
  const manifestRows = logicalManifest.trim().split(/\r?\n/).map(JSON.parse);
  const result = buildOnePieceCompleteCanonicalReconciliationV1({
    repository,
    manifestRows,
    manifestLogicalSha256: ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
    stagingReleasePlanFingerprint: stagingPlan.plan_fingerprint_sha256,
    stagingReleasePayloadFingerprint:
      stagingPlan.release_payload_fingerprint_sha256,
    existingCanonicalRows: st01Plan.payload.numbered_cards,
  });
  const validation = validateOnePieceCompleteCanonicalReconciliationV1(result);
  if (!validation.valid) {
    throw new Error(`Reconciliation failed: ${validation.findings.join(",")}`);
  }

  await fs.mkdir(args.outDir, { recursive: true });
  const artifacts = {};
  const summary = {
    version: result.version,
    recorded_at: new Date().toISOString(),
    status: "complete_offline_reconciliation_passed_no_writes",
    repository,
    reconciliation_fingerprint_sha256:
      result.reconciliation_fingerprint_sha256,
    source_authority: result.source_authority,
    counts: result.counts,
    diagnostics: result.diagnostics,
    boundaries: result.boundaries,
    exact_next_gate:
      "acquire and bind official English series/card authority to the 59 numbered-card set families",
  };
  artifacts["summary.json"] = await writeJson(
    path.join(args.outDir, "summary.json"), summary);
  artifacts["set_families.json"] = await writeJson(
    path.join(args.outDir, "set_families.json"), result.set_families);
  artifacts["current_numbered_candidates.jsonl.gz"] = gzipJsonl(
    result.numbered_candidates);
  artifacts["don_lane.jsonl"] = jsonl(result.don_lane);
  artifacts["sealed_lane.jsonl"] = jsonl(result.sealed_lane);
  artifacts["future_holds.jsonl"] = jsonl(result.future_holds);
  artifacts["quarantine.jsonl"] = jsonl(result.quarantine);
  for (const [name, body] of Object.entries(artifacts)) {
    if (name.endsWith(".jsonl") || name.endsWith(".jsonl.gz")) {
      await fs.writeFile(path.join(args.outDir, name), body,
        Buffer.isBuffer(body) ? undefined : "utf8");
    }
  }
  const existingRows = result.numbered_candidates.filter(
    (row) => row.existing_canonical);
  artifacts["existing_st01_reconciliation.json"] = await writeJson(
    path.join(args.outDir, "existing_st01_reconciliation.json"), existingRows);
  artifacts["collision_report.json"] = await writeJson(
    path.join(args.outDir, "collision_report.json"), result.diagnostics);
  const reportBody = `# Complete One Piece Canonical Reconciliation V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Current numbered products: \`${result.counts.current_numbered_products}\`\n` +
    `- Existing exact ST-01 bindings retained: \`${result.counts.existing_st01_products}\`\n` +
    `- New numbered parents pending official authority: \`${result.counts.proposed_new_numbered_products}\`\n` +
    `- Set-code families: \`${result.counts.current_numbered_set_families}\`\n` +
    `- Current DON!! lane: \`${result.counts.current_don_products}\`\n` +
    `- Sealed lane: \`${result.counts.sealed_products}\`\n` +
    `- Future holds: \`${result.future_holds.length}\`\n` +
    `- Quarantines: \`${result.counts.quarantined_products}\`\n` +
    `- Identity/mapping collisions: \`${result.diagnostics.collision_count}\`\n` +
    `- Database writes: \`0\`\n\n` +
    `Printed-number duplicates remain separate TCGPlayer product-backed parent ` +
    `candidates. Set identity is derived from the printed prefix, never from a ` +
    `promo, prerelease, or reprint merchandising group.\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  artifacts["REPORT.md"] = reportBody;
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(artifacts).map(([artifactPath, body]) => ({
      path: artifactPath,
      bytes: Buffer.byteLength(body),
      sha256: sha256(body),
    })),
    bound_inputs: [
      { path: path.relative(ROOT, MANIFEST_PATH).replaceAll("\\", "/"),
        sha256: ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256 },
      { path: path.relative(ROOT, STAGING_PLAN_PATH).replaceAll("\\", "/"),
        sha256: sha256(stagingPlanBody) },
      { path: path.relative(ROOT, STAGING_APPLY_PATH).replaceAll("\\", "/"),
        sha256: sha256(stagingApplyBody) },
      { path: path.relative(ROOT, ST01_PLAN_PATH).replaceAll("\\", "/"),
        sha256: sha256(st01PlanBody) },
    ],
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
