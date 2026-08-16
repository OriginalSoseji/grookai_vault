import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  ONE_PIECE_COMPLETE_SEALED_PINNED_INPUTS,
  buildOnePieceCompleteSealedCandidatePlanV1,
  validateOnePieceCompleteSealedCandidatePlanV1,
} from "../../backend/pricing/one_piece_complete_sealed_candidate_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_readiness_v1",
  "current_complete_source_2026-08-14_v1", "source_product_manifest.jsonl.gz");
const RECONCILIATION = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_canonical_reconciliation_v1", "frozen_reconciliation_v1");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_sealed_candidate_v1", "frozen_plan_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function jsonl(body, compressed = false) {
  const text = compressed ? gunzipSync(body).toString("utf8") : body.toString("utf8");
  return text.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function main() {
  const repository = { commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "" };
  if (repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("Sealed plan requires the exact clean readiness branch");
  }
  const [manifest, summary, lane] = await Promise.all([fs.readFile(MANIFEST),
    fs.readFile(path.join(RECONCILIATION, "summary.json")),
    fs.readFile(path.join(RECONCILIATION, "sealed_lane.jsonl"))]);
  const inputHashes = { source_manifest_gzip_sha256: sha256(manifest),
    reconciliation_summary_sha256: sha256(summary),
    sealed_lane_sha256: sha256(lane) };
  if (JSON.stringify(inputHashes) !==
      JSON.stringify(ONE_PIECE_COMPLETE_SEALED_PINNED_INPUTS)) {
    throw new Error("Pinned sealed source hashes changed");
  }
  const plan = buildOnePieceCompleteSealedCandidatePlanV1({ repository,
    inputHashes, manifestRows: jsonl(manifest, true), sealedLane: jsonl(lane) });
  const validation = validateOnePieceCompleteSealedCandidatePlanV1(plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  await fs.mkdir(DEFAULT_OUT, { recursive: true });
  const compressed = gzipSync(Buffer.from(`${JSON.stringify(plan)}\n`), {
    level: 9, mtime: 0,
  });
  await fs.writeFile(path.join(DEFAULT_OUT, "candidate_plan.json.gz"), compressed);
  const outputSummary = { version: plan.version, recorded_at: new Date().toISOString(),
    status: "frozen_sealed_candidate_plan_passed_no_writes", repository,
    counts: plan.counts,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    input_hashes: inputHashes, boundaries: plan.boundaries, findings: [],
    exact_next_gate: "production read-only sealed candidate collision preflight" };
  const summaryBody = await writeJson(path.join(DEFAULT_OUT, "summary.json"),
    outputSummary);
  const report = `# One Piece Complete Sealed Candidate Plan V1\n\n` +
    `- Status: \`${outputSummary.status}\`\n- Candidate rows: \`403\`\n` +
    `- Canonical families/variants: \`0 / 0\`\n` +
    `- Plan fingerprint: \`${plan.plan_fingerprint_sha256}\`\n` +
    `- Payload fingerprint: \`${plan.payload_fingerprint_sha256}\`\n`;
  await fs.writeFile(path.join(DEFAULT_OUT, "REPORT.md"), report);
  await writeJson(path.join(DEFAULT_OUT, "artifact_hashes.json"), {
    "candidate_plan.json.gz": sha256(compressed),
    "summary.json": sha256(summaryBody),
    "REPORT.md": sha256(Buffer.from(report)),
  });
  process.stdout.write(`${JSON.stringify(outputSummary, null, 2)}\n`);
}

await main();
