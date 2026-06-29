import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import {
  EXPECTED_SECOND_SOURCE_MANIFEST_HASH,
  EXPECTED_SECOND_SOURCE_NORMALIZED_HASH,
  buildPokemonTcgSecondSourceBackfillPlanV1,
  sha256V1,
} from "../../backend/pricing/market_reference_pokemontcg_second_source_backfill_plan_v1.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-BACKFILL-PLAN-V1";
export const APPROVAL_TEXT = "Approve real MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-BACKFILL-PLAN-V1 apply plan only. Manifest hash: e8a91143648af9076118642afb82da02be8e2086fc7f91995f7cc497afd713fc. Normalized artifact hash: 387d7dd270c26f1a0b5a4ad41506abe0b6d54a08f890c2f755b94d2c23d92eda. Scope: prepare DB backfill apply package for PokemonTCG.io second-source evidence covering 570 targets, 10,720 candidate evidence rows, and 10,720 normalized evidence rows only. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const INPUTS = {
  manifest: "docs/audits/market_evidence_engine_v1/mee_09j_pokemontcg_second_source_consolidated_manifest_2026-06-25T19-54-58-427Z.json",
  normalized: "docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T19-55-05-157Z.json",
};

function parseArgs(argv) {
  const parsed = {
    applyPlan: false,
    approvalText: "",
    skipRemoteCollisionCheck: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply-plan") parsed.applyPlan = true;
    else if (arg === "--skip-remote-collision-check") parsed.skipRemoteCollisionCheck = true;
    else if (arg === "--approval-text") {
      parsed.approvalText = argv[index + 1] ?? "";
      index += 1;
    }
  }
  return parsed;
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function read(relativePath) {
  return fs.readFile(path.join(REPO_ROOT, relativePath), "utf8");
}

async function readJson(relativePath) {
  return JSON.parse(await read(relativePath));
}

async function remoteCollisionSummary(candidateRows) {
  const supabase = createBackendClient();
  const collisions = [];
  const hashes = [...new Set(candidateRows.map((row) => row.candidate_hash))];
  for (let index = 0; index < hashes.length; index += 100) {
    const chunk = hashes.slice(index, index + 100);
    let data = null;
    let error = null;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const response = await supabase
        .from("market_reference_candidates")
        .select("id,source,candidate_hash,card_print_id,gv_id")
        .eq("source", "pokemontcg_io_reference")
        .in("candidate_hash", chunk);
      data = response.data;
      error = response.error;
      if (!error) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
    if (error) throw new Error(`[pokemontcg-second-source-backfill-plan] remote collision check failed: ${error.message}`);
    collisions.push(...(data ?? []));
  }
  return {
    checked: true,
    candidate_hashes_checked: hashes.length,
    candidate_hash_collisions: collisions.length,
    collision_samples: collisions.slice(0, 25),
  };
}

function planWithoutRows(plan) {
  const { rows, ...withoutRows } = plan;
  return {
    ...withoutRows,
    row_hashes: {
      candidate_rows_hash: sha256V1(rows.candidateRows),
      normalized_rows_hash: sha256V1(rows.normalizedRows),
    },
    row_samples: {
      candidates: rows.candidateRows.slice(0, 25),
      normalized_evidence: rows.normalizedRows.slice(0, 25),
    },
  };
}

function renderMarkdown(report) {
  return [
    "# MEE-09K PokemonTCG.io Second Source Backfill Plan",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready: \`${report.ready_for_apply_package}\``,
    `- Manifest hash: \`${report.manifest_hash_sha256}\``,
    `- Normalized artifact hash: \`${report.normalized_artifact_hash_sha256}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Target count: \`${report.target_count}\``,
    `- Candidate rows: \`${report.proposed_table_row_counts.market_reference_candidates}\``,
    `- Normalized rows: \`${report.proposed_table_row_counts.market_reference_normalized_evidence}\``,
    "",
    "## Boundary",
    "",
    "- Apply plan only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No DB writes.",
    "- No pricing observations writes.",
    "- No public/app-visible pricing.",
    "- No price rollups.",
    "",
    "## Remote Collision Check",
    "",
    `- Checked: \`${report.remote_collision_summary?.checked ?? false}\``,
    `- Candidate hashes checked: \`${report.remote_collision_summary?.candidate_hashes_checked ?? 0}\``,
    `- Candidate hash collisions: \`${report.remote_collision_summary?.candidate_hash_collisions ?? 0}\``,
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Approval Prompt",
    "",
    "```text",
    `Approve real MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-BACKFILL-APPLY-V1 apply only. Package fingerprint: ${report.package_fingerprint_sha256}. Manifest hash: ${report.manifest_hash_sha256}. Normalized artifact hash: ${report.normalized_artifact_hash_sha256}. Scope: insert 10,720 market_reference_candidates rows and 10,720 market_reference_normalized_evidence rows for PokemonTCG.io second-source evidence only. Use candidate_hash to link normalized rows to inserted candidates. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No migrations. No global apply.`,
    "```",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const manifestText = await read(INPUTS.manifest);
  const normalizedText = await read(INPUTS.normalized);
  const manifestHash = sha256V1(manifestText);
  const normalizedHash = sha256V1(normalizedText);
  const manifest = JSON.parse(manifestText);
  const normalizedArtifact = JSON.parse(normalizedText);
  const initialPlan = buildPokemonTcgSecondSourceBackfillPlanV1({
    manifest,
    normalizedArtifact,
    manifestHash,
    normalizedHash,
    generatedAt,
    remoteCollisionSummary: args.skipRemoteCollisionCheck ? { checked: false } : null,
  });
  const remoteSummary = args.skipRemoteCollisionCheck
    ? { checked: false, reason: "skipped_by_arg" }
    : await remoteCollisionSummary(initialPlan.rows.candidateRows);
  const plan = buildPokemonTcgSecondSourceBackfillPlanV1({
    manifest,
    normalizedArtifact,
    manifestHash,
    normalizedHash,
    generatedAt,
    remoteCollisionSummary: remoteSummary,
  });

  if (args.applyPlan && args.approvalText !== APPROVAL_TEXT) {
    plan.findings.push("approval_text_mismatch");
    plan.ready_for_apply_package = false;
  }
  if (manifestHash !== EXPECTED_SECOND_SOURCE_MANIFEST_HASH || normalizedHash !== EXPECTED_SECOND_SOURCE_NORMALIZED_HASH) {
    plan.ready_for_apply_package = false;
  }

  const report = {
    ...planWithoutRows(plan),
    approval_required: true,
    approval_text_matched: args.approvalText === APPROVAL_TEXT,
    input_artifacts: INPUTS,
    applied: false,
  };

  await fs.mkdir(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_09k_pokemontcg_second_source_backfill_plan_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_09k_pokemontcg_second_source_backfill_plan_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    ready: report.ready_for_apply_package,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    proposed_table_row_counts: report.proposed_table_row_counts,
    remote_collision_summary: report.remote_collision_summary,
    findings: report.findings,
    artifacts: { jsonPath: rel(jsonPath), mdPath: rel(mdPath) },
  }, null, 2));
  if (!report.ready_for_apply_package) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
