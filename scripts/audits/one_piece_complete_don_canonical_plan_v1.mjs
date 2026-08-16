import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  ONE_PIECE_COMPLETE_DON_PINNED_INPUTS,
  buildOnePieceCompleteDonPromotionPlanV1,
  validateOnePieceCompleteDonPromotionPlanV1,
} from "../../backend/pricing/one_piece_complete_don_canonical_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_readiness_v1",
  "current_complete_source_2026-08-14_v1", "source_product_manifest.jsonl.gz");
const RECONCILIATION = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_canonical_reconciliation_v1", "frozen_reconciliation_v1");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_don_canonical_v1", "frozen_plan_v1");

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
  const outArg = process.argv.slice(2).find((arg) => arg.startsWith("--out-dir="));
  const outDir = outArg ? path.resolve(outArg.slice(10)) : DEFAULT_OUT;
  const unsupported = process.argv.slice(2).filter((arg) =>
    !arg.startsWith("--out-dir="));
  if (unsupported.length) throw new Error(`Unsupported argument: ${unsupported[0]}`);
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("DON plan requires the exact clean readiness branch");
  }
  const [manifest, reconciliationSummary, donLane] = await Promise.all([
    fs.readFile(MANIFEST),
    fs.readFile(path.join(RECONCILIATION, "summary.json")),
    fs.readFile(path.join(RECONCILIATION, "don_lane.jsonl")),
  ]);
  const inputHashes = {
    source_manifest_gzip_sha256: sha256(manifest),
    reconciliation_summary_sha256: sha256(reconciliationSummary),
    don_lane_sha256: sha256(donLane),
  };
  if (JSON.stringify(inputHashes) !==
      JSON.stringify(ONE_PIECE_COMPLETE_DON_PINNED_INPUTS)) {
    throw new Error("Pinned DON source hashes changed");
  }
  const plan = buildOnePieceCompleteDonPromotionPlanV1({
    repository,
    inputHashes,
    manifestRows: jsonl(manifest, true),
    donLane: jsonl(donLane),
  });
  const validation = validateOnePieceCompleteDonPromotionPlanV1(plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  await fs.mkdir(outDir, { recursive: true });
  const compressed = gzipSync(Buffer.from(`${JSON.stringify(plan)}\n`), {
    level: 9,
    mtime: 0,
  });
  await fs.writeFile(path.join(outDir, "promotion_plan.json.gz"), compressed);
  const summary = {
    version: plan.version,
    recorded_at: new Date().toISOString(),
    status: "frozen_don_plan_passed_no_writes",
    repository,
    counts: plan.counts,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    input_hashes: inputHashes,
    boundaries: plan.boundaries,
    findings: [],
    exact_next_gate: "production read-only collision and staging preflight",
  };
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), summary);
  const report = `# One Piece Complete DON Canonical Plan V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Current English DON products: \`${plan.counts.current_english_products}\`\n` +
    `- Non-English holds: \`${plan.counts.current_non_english_holds}\`\n` +
    `- Future holds: \`${plan.counts.future_or_presale_holds}\`\n` +
    `- Plan fingerprint: \`${plan.plan_fingerprint_sha256}\`\n` +
    `- Payload fingerprint: \`${plan.payload_fingerprint_sha256}\`\n` +
    `- Visibility: hidden\n- Database writes: zero\n`;
  await fs.writeFile(path.join(outDir, "REPORT.md"), report, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    "promotion_plan.json.gz": sha256(compressed),
    "summary.json": sha256(summaryBody),
    "REPORT.md": sha256(Buffer.from(report)),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
