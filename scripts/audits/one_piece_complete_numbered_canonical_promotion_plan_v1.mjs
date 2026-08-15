import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  ONE_PIECE_COMPLETE_NUMBERED_PINNED_INPUTS,
  buildOnePieceCompleteNumberedPromotionPlanV1,
  validateOnePieceCompleteNumberedPromotionPlanV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_promotion_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PATHS = Object.freeze({
  authoritySummary: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_official_catalog_authority_v1", "official_english_v1",
    "summary.json"),
  bindings: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_official_catalog_authority_v1", "official_english_v1",
    "numbered_product_bindings.jsonl.gz"),
  seriesSources: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_official_catalog_authority_v1", "official_english_v1",
    "series_sources.json"),
  reconciliationSummary: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_complete_canonical_reconciliation_v1", "frozen_reconciliation_v1",
    "summary.json"),
  manifest: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_canonical_catalog_readiness_v1",
    "current_complete_source_2026-08-14_v1", "source_product_manifest.jsonl.gz"),
  existingSt01Plan: path.join(ROOT, "docs", "audits", "pricing",
    "one_piece_st01_canonical_promotion_v1", "frozen_plan_v1", "plan.json"),
});
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_numbered_canonical_promotion_v1", "frozen_plan_v1");

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

function jsonLines(buffer, compressed = false) {
  const body = compressed ? gunzipSync(buffer).toString("utf8") : buffer.toString("utf8");
  return body.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
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
    throw new Error("Repository is not the exact clean promotion-plan producer");
  }
  const entries = await Promise.all(Object.values(PATHS).map((file) =>
    fs.readFile(file)));
  const [authoritySummaryBody, bindingsBody, seriesSourcesBody,
    reconciliationSummaryBody, manifestBody, existingSt01PlanBody] = entries;
  const inputHashes = {
    authority_summary_sha256: sha256(authoritySummaryBody),
    numbered_bindings_gzip_sha256: sha256(bindingsBody),
    official_series_sources_sha256: sha256(seriesSourcesBody),
    reconciliation_summary_sha256: sha256(reconciliationSummaryBody),
    source_manifest_gzip_sha256: sha256(manifestBody),
    existing_st01_plan_sha256: sha256(existingSt01PlanBody),
  };
  if (JSON.stringify(inputHashes) !==
      JSON.stringify(ONE_PIECE_COMPLETE_NUMBERED_PINNED_INPUTS)) {
    throw new Error("Complete numbered promotion input hashes changed");
  }
  const plan = buildOnePieceCompleteNumberedPromotionPlanV1({
    repository,
    inputHashes,
    authoritySummary: JSON.parse(authoritySummaryBody),
    bindings: jsonLines(bindingsBody, true),
    seriesSources: JSON.parse(seriesSourcesBody),
    reconciliationSummary: JSON.parse(reconciliationSummaryBody),
    manifestRows: jsonLines(manifestBody, true),
    existingSt01Plan: JSON.parse(existingSt01PlanBody),
  });
  const validation = validateOnePieceCompleteNumberedPromotionPlanV1(plan);
  if (!validation.valid) {
    throw new Error(`Promotion plan invalid: ${validation.findings.join(",")}`);
  }
  await fs.mkdir(args.outDir, { recursive: true });
  const planLogicalBody = Buffer.from(JSON.stringify(plan), "utf8");
  const planCompressedBody = gzipSync(planLogicalBody, { level: 9, mtime: 0 });
  await fs.writeFile(path.join(args.outDir, "promotion_plan.json.gz"),
    planCompressedBody);
  const summary = {
    version: plan.version,
    recorded_at: new Date().toISOString(),
    status: "complete_hidden_numbered_promotion_plan_frozen_no_writes",
    repository,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    logical_plan_sha256: sha256(planLogicalBody),
    compressed_plan_sha256: sha256(planCompressedBody),
    counts: plan.counts,
    findings: validation.findings,
    boundaries: plan.boundaries,
    exact_next_gate:
      "run fresh read-only production collision and durable-staging preflight",
  };
  const artifacts = { "promotion_plan.json.gz": planCompressedBody };
  artifacts["summary.json"] = await writeJson(path.join(args.outDir, "summary.json"),
    summary);
  artifacts["set_rows.json"] = await writeJson(path.join(args.outDir, "set_rows.json"),
    plan.payload.set_rows);
  const retainedBody = Buffer.from(`${plan.payload.retained_existing_rows
    .map(JSON.stringify).join("\n")}\n`, "utf8");
  await fs.writeFile(path.join(args.outDir, "retained_existing_rows.jsonl"),
    retainedBody);
  artifacts["retained_existing_rows.jsonl"] = retainedBody;
  const holdsBody = Buffer.from(`${plan.payload.authority_holds
    .map(JSON.stringify).join("\n")}\n`, "utf8");
  await fs.writeFile(path.join(args.outDir, "authority_holds.jsonl"), holdsBody);
  artifacts["authority_holds.jsonl"] = holdsBody;
  const languageHoldsBody = Buffer.from(`${plan.payload.non_english_language_holds
    .map(JSON.stringify).join("\n")}\n`, "utf8");
  await fs.writeFile(path.join(args.outDir, "non_english_language_holds.jsonl"),
    languageHoldsBody);
  artifacts["non_english_language_holds.jsonl"] = languageHoldsBody;
  const report = `# Complete One Piece Numbered Canonical Promotion Plan V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Producer commit: \`${repository.commit_sha}\`\n` +
    `- Authority eligible: \`${plan.counts.authority_eligible_products}\`\n` +
    `- Existing ST-01 retained without writes: \`${plan.counts.retained_existing_products}\`\n` +
    `- New hidden sets/cards/identities/evidence/mappings: ` +
    `\`${plan.counts.new_set_rows} / ${plan.counts.new_card_prints} / ` +
    `${plan.counts.new_identity_rows} / ${plan.counts.new_source_evidence_rows} / ` +
    `${plan.counts.new_external_mappings}\`\n` +
    `- Official catalog gap holds: \`${plan.counts.official_catalog_gap_holds}\`\n` +
    `- Non-English source-language holds: \`${plan.counts.non_english_language_holds}\`\n` +
    `- Database/Storage/image/pricing/publication/Vault writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), report, "utf8");
  artifacts["REPORT.md"] = Buffer.from(report, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(artifacts).map(([artifactPath, body]) => ({
      path: artifactPath,
      bytes: body.length,
      sha256: sha256(body),
    })),
    bound_inputs: Object.entries(PATHS).map(([name, file], index) => ({
      name,
      path: path.relative(ROOT, file).replaceAll("\\", "/"),
      sha256: sha256(entries[index]),
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

export { PATHS, parseArgs };
