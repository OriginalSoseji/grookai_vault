import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import {
  PACKAGE_ID as AUDIT_PACKAGE_ID,
  TCGDEX_CARDMARKET_SOURCE,
  TCGDEX_TCGPLAYER_SOURCE,
} from "../../backend/pricing/market_reference_tcgdex_pricing_audit_v1.mjs";

const PACKAGE_ID = "MEE-TCGDEX-REFERENCE-PRICING-BACKFILL-PLAN-V1";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");

function parseArgs(argv) {
  const parsed = {
    audit: null,
    outDir: AUDIT_DIR,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--audit=")) parsed.audit = path.resolve(arg.slice("--audit=".length));
    else if (arg.startsWith("--out-dir=")) parsed.outDir = path.resolve(arg.slice("--out-dir=".length));
  }
  return parsed;
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function latestAuditPath() {
  const entries = await fs.readdir(AUDIT_DIR, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/^mee_tcgdex_reference_pricing_audit_.*\.json$/.test(entry.name)) continue;
    const fullPath = path.join(AUDIT_DIR, entry.name);
    const stat = await fs.stat(fullPath);
    candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (candidates.length === 0) {
    throw new Error("[tcgdex-backfill-plan] no TCGdex pricing audit JSON found");
  }
  return candidates[0].fullPath;
}

async function sourceCounts(supabase) {
  const out = {};
  for (const source of [TCGDEX_TCGPLAYER_SOURCE, TCGDEX_CARDMARKET_SOURCE]) {
    const { count, error } = await supabase
      .from("market_reference_candidates")
      .select("*", { count: "exact", head: true })
      .eq("source", source);
    if (error) throw new Error(`[tcgdex-backfill-plan] source collision check failed: ${error.message}`);
    out[source] = count ?? 0;
  }
  return out;
}

function renderPreflightSql() {
  return [
    "-- MEE-TCGDEX-REFERENCE-PRICING-BACKFILL-PLAN-V1 preflight only.",
    "-- Read-only guard. Do not edit into an apply script.",
    "select",
    "  source,",
    "  count(*) as existing_candidate_rows",
    "from public.market_reference_candidates",
    `where source in ('${TCGDEX_TCGPLAYER_SOURCE}', '${TCGDEX_CARDMARKET_SOURCE}')`,
    "group by source",
    "order by source;",
    "",
    "select",
    "  source,",
    "  count(*) as existing_normalized_rows",
    "from public.market_reference_normalized_evidence",
    `where source in ('${TCGDEX_TCGPLAYER_SOURCE}', '${TCGDEX_CARDMARKET_SOURCE}')`,
    "group by source",
    "order by source;",
    "",
  ].join("\n");
}

function renderReadbackSql() {
  return [
    "-- MEE-TCGDEX-REFERENCE-PRICING-BACKFILL-PLAN-V1 post-apply readback.",
    "-- Expected counts are supplied by the plan artifact.",
    "select",
    "  source,",
    "  count(*) as candidate_rows,",
    "  count(distinct card_print_id) as unique_card_prints,",
    "  bool_or(can_publish_price_directly) as any_direct_publish,",
    "  bool_and(needs_review) as all_need_review",
    "from public.market_reference_candidates",
    `where source in ('${TCGDEX_TCGPLAYER_SOURCE}', '${TCGDEX_CARDMARKET_SOURCE}')`,
    "group by source",
    "order by source;",
    "",
    "select",
    "  source,",
    "  count(*) as normalized_rows,",
    "  count(*) filter (where model_eligible) as model_eligible_rows,",
    "  count(*) filter (where model_disposition = 'quarantined_metric') as quarantined_metric_rows,",
    "  count(distinct card_print_id) as unique_card_prints",
    "from public.market_reference_normalized_evidence",
    `where source in ('${TCGDEX_TCGPLAYER_SOURCE}', '${TCGDEX_CARDMARKET_SOURCE}')`,
    "group by source",
    "order by source;",
    "",
  ].join("\n");
}

function renderMarkdown(plan) {
  return [
    "# MEE-TCGDEX Reference Pricing Backfill Plan V1",
    "",
    `Generated: ${plan.generated_at}`,
    "",
    "## Boundary",
    "",
    "- Plan only.",
    "- No DB writes.",
    "- No provider calls.",
    "- No source fetches.",
    "- No pricing_observations writes.",
    "- No ebay_active_prices_latest writes.",
    "- No public pricing views.",
    "- No app-visible pricing.",
    "- No identity, card_print, vault, image, delete, migration, merge, or global apply.",
    "",
    "## Input Audit",
    "",
    `- Audit package: \`${plan.input_audit.package_id}\``,
    `- Audit artifact: ${plan.input_audit.path}`,
    `- Audit fingerprint: \`${plan.input_audit.package_fingerprint}\``,
    "",
    "## Proposed Rows",
    "",
    `- market_reference_candidates: ${plan.proposed_rows.market_reference_candidates}`,
    `- market_reference_normalized_evidence: ${plan.proposed_rows.market_reference_normalized_evidence}`,
    `- unique card prints: ${plan.proposed_rows.unique_card_prints}`,
    `- model eligible normalized rows: ${plan.proposed_rows.model_eligible_rows}`,
    `- quarantined metric rows: ${plan.proposed_rows.quarantined_metric_rows}`,
    "",
    "## Chunking",
    "",
    `- Candidate chunk size: ${plan.chunking.candidate_chunk_size}`,
    `- Normalized chunk size: ${plan.chunking.normalized_chunk_size}`,
    `- Candidate chunks: ${plan.chunking.candidate_chunks}`,
    `- Normalized chunks: ${plan.chunking.normalized_chunks}`,
    "",
    "## Collision Guard",
    "",
    `- Existing \`${TCGDEX_TCGPLAYER_SOURCE}\` candidates: ${plan.remote_collision_check.existing_candidate_rows[TCGDEX_TCGPLAYER_SOURCE]}`,
    `- Existing \`${TCGDEX_CARDMARKET_SOURCE}\` candidates: ${plan.remote_collision_check.existing_candidate_rows[TCGDEX_CARDMARKET_SOURCE]}`,
    `- Ready for apply package: ${plan.ready_for_apply_package}`,
    "",
    "## Hashes",
    "",
    `- candidate_rows_hash: \`${plan.hashes.candidate_rows_hash}\``,
    `- normalized_rows_hash: \`${plan.hashes.normalized_rows_hash}\``,
    `- package_fingerprint: \`${plan.hashes.package_fingerprint}\``,
    `- backfill_plan_fingerprint: \`${plan.backfill_plan_fingerprint}\``,
    "",
    "## SQL Artifacts",
    "",
    `- Preflight: ${plan.artifacts.preflight_sql}`,
    `- Readback: ${plan.artifacts.readback_sql}`,
    "",
    "## Findings",
    "",
    ...(plan.findings.length > 0 ? plan.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Step",
    "",
    "Create the apply package that regenerates rows from current TCGdex raw imports, verifies the audit hashes, inserts candidate rows first, links normalized rows by candidate_hash, and then runs the readback. Keep all rows internal and review-only.",
    "",
  ].join("\n");
}

async function sha256(text) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text).digest("hex");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const auditPath = args.audit ?? await latestAuditPath();
  const audit = JSON.parse(await fs.readFile(auditPath, "utf8"));
  if (audit.package_id !== AUDIT_PACKAGE_ID) {
    throw new Error(`[tcgdex-backfill-plan] expected audit package ${AUDIT_PACKAGE_ID}, got ${audit.package_id}`);
  }

  const supabase = createBackendClient();
  const existingCandidateRows = await sourceCounts(supabase);
  const findings = [];
  if (Object.values(existingCandidateRows).some((count) => count > 0)) {
    findings.push("target_source_candidates_already_exist");
  }
  if (audit.findings?.length) findings.push("input_audit_has_findings");
  if (audit.proofs?.no_candidate_can_publish_directly !== true) findings.push("input_audit_public_boundary_failed");
  if (audit.proofs?.all_candidates_need_review !== true) findings.push("input_audit_review_boundary_failed");
  if (audit.proofs?.all_candidate_hashes_unique !== true) findings.push("input_audit_candidate_hash_uniqueness_failed");

  const candidateRows = audit.summary.projected_market_reference_candidate_rows;
  const normalizedRows = audit.summary.projected_market_reference_normalized_evidence_rows;
  const candidateChunkSize = 5000;
  const normalizedChunkSize = 5000;
  const preflightSql = renderPreflightSql();
  const readbackSql = renderReadbackSql();
  const planCore = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    input_audit: {
      package_id: audit.package_id,
      path: rel(auditPath),
      package_fingerprint: audit.hashes.package_fingerprint,
    },
    proposed_rows: {
      market_reference_candidates: candidateRows,
      market_reference_normalized_evidence: normalizedRows,
      unique_card_prints: audit.summary.projected_unique_card_prints,
      model_eligible_rows: audit.summary.projected_model_eligible_rows,
      quarantined_metric_rows: audit.summary.projected_quarantined_rows,
    },
    chunking: {
      candidate_chunk_size: candidateChunkSize,
      normalized_chunk_size: normalizedChunkSize,
      candidate_chunks: Math.ceil(candidateRows / candidateChunkSize),
      normalized_chunks: Math.ceil(normalizedRows / normalizedChunkSize),
    },
    remote_collision_check: {
      existing_candidate_rows: existingCandidateRows,
    },
    hashes: audit.hashes,
    boundary: {
      db_writes: false,
      provider_calls: false,
      source_fetches: false,
      public_pricing: false,
      app_visible_pricing: false,
    },
    findings,
  };
  const planFingerprint = await sha256(JSON.stringify(planCore));
  const plan = {
    ...planCore,
    ready_for_apply_package: findings.length === 0,
    backfill_plan_fingerprint: planFingerprint,
    artifacts: {},
  };

  await fs.mkdir(args.outDir, { recursive: true });
  await fs.mkdir(SQL_DIR, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_tcgdex_reference_pricing_backfill_plan_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_tcgdex_reference_pricing_backfill_plan_${stamp}.md`);
  const preflightPath = path.join(SQL_DIR, "mee_tcgdex_reference_pricing_backfill_v1_preflight.sql");
  const readbackPath = path.join(SQL_DIR, "mee_tcgdex_reference_pricing_backfill_v1_readback.sql");
  plan.artifacts = {
    json: rel(jsonPath),
    markdown: rel(mdPath),
    preflight_sql: rel(preflightPath),
    readback_sql: rel(readbackPath),
  };

  await fs.writeFile(preflightPath, preflightSql);
  await fs.writeFile(readbackPath, readbackSql);
  await fs.writeFile(jsonPath, `${JSON.stringify(plan, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(plan));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    ready_for_apply_package: plan.ready_for_apply_package,
    proposed_rows: plan.proposed_rows,
    chunking: plan.chunking,
    findings: plan.findings,
    backfill_plan_fingerprint: plan.backfill_plan_fingerprint,
    artifacts: plan.artifacts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
