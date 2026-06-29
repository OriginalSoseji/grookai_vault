import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMarketReferenceWarehouseAutomatedApplyPlanV1,
  MARKET_REFERENCE_WAREHOUSE_AUTOMATED_APPLY_PACKAGE_ID,
  sha256MarketReferenceAutomatedApplyV1,
} from "../../backend/pricing/market_reference_warehouse_automated_apply_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");

export const PACKAGE_ID = MARKET_REFERENCE_WAREHOUSE_AUTOMATED_APPLY_PACKAGE_ID;

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

export function renderReferenceWarehouseAutomatedApplyPreflightSqlV1() {
  return [
    "-- MEE-REFERENCE-WAREHOUSE-AUTOMATED-APPLY-V1 preflight.",
    "-- Read-only. This SQL must not be edited into an apply script.",
    "",
    "select",
    "  conrelid::regclass::text as table_name,",
    "  conname,",
    "  pg_get_constraintdef(oid) as constraint_definition",
    "from pg_constraint",
    "where conrelid in (",
    "  'public.market_reference_candidates'::regclass,",
    "  'public.market_reference_normalized_evidence'::regclass,",
    "  'public.market_reference_raw_snapshots'::regclass,",
    "  'public.market_reference_acquisition_runs'::regclass,",
    "  'public.market_reference_coverage_reports'::regclass",
    ")",
    "order by table_name, conname;",
    "",
    "select",
    "  source,",
    "  count(*)::bigint as candidate_rows,",
    "  count(*) filter (where needs_review is not true)::bigint as unsafe_review_rows,",
    "  count(*) filter (where can_publish_price_directly is true)::bigint as direct_publish_rows",
    "from public.market_reference_candidates",
    "where source in (",
    "  'tcgdex_tcgplayer_reference',",
    "  'tcgdex_cardmarket_reference',",
    "  'pokemontcg_io_reference',",
    "  'tcgcsv_reference'",
    ")",
    "group by source",
    "order by source;",
    "",
    "select",
    "  source,",
    "  candidate_hash,",
    "  count(*)::bigint as duplicate_rows",
    "from public.market_reference_candidates",
    "where source in (",
    "  'tcgdex_tcgplayer_reference',",
    "  'tcgdex_cardmarket_reference',",
    "  'pokemontcg_io_reference',",
    "  'tcgcsv_reference'",
    ")",
    "group by source, candidate_hash",
    "having count(*) > 1",
    "order by duplicate_rows desc, source",
    "limit 50;",
    "",
    "select",
    "  source,",
    "  count(*)::bigint as normalized_rows,",
    "  count(*) filter (where normalized_currency is distinct from 'USD' and source <> 'tcgdex_cardmarket_reference')::bigint as unexpected_non_usd_rows,",
    "  count(*) filter (where model_eligible is true)::bigint as model_eligible_rows",
    "from public.market_reference_normalized_evidence",
    "where source in (",
    "  'tcgdex_tcgplayer_reference',",
    "  'tcgdex_cardmarket_reference',",
    "  'pokemontcg_io_reference',",
    "  'tcgcsv_reference'",
    ")",
    "group by source",
    "order by source;",
    "",
  ].join("\n");
}

export function renderReferenceWarehouseAutomatedApplyReadbackSqlV1() {
  return [
    "-- MEE-REFERENCE-WAREHOUSE-AUTOMATED-APPLY-V1 readback.",
    "-- Read-only post-run proof for future internal writer packages.",
    "",
    "select",
    "  source,",
    "  count(*)::bigint as candidate_rows,",
    "  count(distinct card_print_id)::bigint as unique_card_prints,",
    "  max(observed_at) as latest_observed_at,",
    "  count(*) filter (where needs_review is not true)::bigint as unsafe_review_rows,",
    "  count(*) filter (where can_publish_price_directly is true)::bigint as direct_publish_rows",
    "from public.market_reference_candidates",
    "where source in (",
    "  'tcgdex_tcgplayer_reference',",
    "  'tcgdex_cardmarket_reference',",
    "  'pokemontcg_io_reference',",
    "  'tcgcsv_reference'",
    ")",
    "group by source",
    "order by source;",
    "",
    "select",
    "  source,",
    "  count(*)::bigint as normalized_rows,",
    "  count(distinct card_print_id)::bigint as unique_card_prints,",
    "  count(*) filter (where model_eligible is true)::bigint as model_eligible_rows,",
    "  count(*) filter (where model_disposition <> 'reference_model_candidate')::bigint as non_model_candidate_rows",
    "from public.market_reference_normalized_evidence",
    "where source in (",
    "  'tcgdex_tcgplayer_reference',",
    "  'tcgdex_cardmarket_reference',",
    "  'pokemontcg_io_reference',",
    "  'tcgcsv_reference'",
    ")",
    "group by source",
    "order by source;",
    "",
    "select",
    "  bridge_state,",
    "  count(*)::bigint as rows,",
    "  count(*) filter (where internal_bridge_candidate)::bigint as internal_bridge_candidates,",
    "  count(*) filter (where publishable or app_visible or market_truth or can_publish_price_directly)::bigint as public_boundary_leaks",
    "from public.v_market_evidence_publication_bridge_candidates_v1",
    "group by bridge_state",
    "order by rows desc;",
    "",
  ].join("\n");
}

function renderMarkdown(report) {
  return [
    `# ${PACKAGE_ID}`,
    "",
    `Generated: ${report.generated_at}`,
    `Fingerprint: \`${report.package_fingerprint_sha256}\``,
    "",
    "## Objective",
    "",
    report.objective,
    "",
    "## Boundary",
    "",
    "```json",
    JSON.stringify(report.boundary, null, 2),
    "```",
    "",
    "## Sources",
    "",
    ...report.sources.map((source) => `- ${source.source}: ${source.source_type}, ${source.acquisition_mode}, review gated`),
    "",
    "## Lifecycle",
    "",
    ...report.lifecycle_stages.map((stage, index) => `${index + 1}. ${stage.stage}: ${stage.rule}`),
    "",
    "## Idempotency",
    "",
    ...Object.entries(report.idempotency).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Failure Guards",
    "",
    ...report.failure_guards.map((guard) => `- ${guard}`),
    "",
    "## SQL Artifacts",
    "",
    `- Preflight: ${report.artifacts.preflight_sql}`,
    `- Readback: ${report.artifacts.readback_sql}`,
    `- Preflight hash: \`${report.artifacts.preflight_sql_sha256}\``,
    `- Readback hash: \`${report.artifacts.readback_sql_sha256}\``,
    "",
    "## Next Contract",
    "",
    "The next contract may implement the actual internal writer. It must use this plan's natural-key idempotency, stop on any guard failure, and still keep all public pricing boundaries closed.",
    "",
  ].join("\n");
}

function writeArtifacts(report) {
  mkdirSync(AUDIT_DIR, { recursive: true });
  mkdirSync(SQL_DIR, { recursive: true });
  const preflightSql = renderReferenceWarehouseAutomatedApplyPreflightSqlV1();
  const readbackSql = renderReferenceWarehouseAutomatedApplyReadbackSqlV1();
  const preflightPath = path.join(SQL_DIR, "mee_reference_warehouse_automated_apply_v1_preflight.sql");
  const readbackPath = path.join(SQL_DIR, "mee_reference_warehouse_automated_apply_v1_readback.sql");
  writeFileSync(preflightPath, preflightSql);
  writeFileSync(readbackPath, readbackSql);

  const withSql = {
    ...report,
    artifacts: {
      preflight_sql: rel(preflightPath),
      readback_sql: rel(readbackPath),
      preflight_sql_sha256: sha256MarketReferenceAutomatedApplyV1(preflightSql),
      readback_sql_sha256: sha256MarketReferenceAutomatedApplyV1(readbackSql),
    },
  };
  const stamp = report.generated_at.replace(/[:.]/g, "-");
  const jsonPath = path.join(AUDIT_DIR, `mee_reference_warehouse_automated_apply_plan_v1_${stamp}.json`);
  const mdPath = path.join(AUDIT_DIR, `mee_reference_warehouse_automated_apply_plan_v1_${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(withSql, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(withSql));
  return {
    ...withSql,
    artifacts: {
      ...withSql.artifacts,
      json: rel(jsonPath),
      markdown: rel(mdPath),
    },
  };
}

export function buildMarketReferenceWarehouseAutomatedApplyPlanReportV1({
  generatedAt = new Date().toISOString(),
} = {}) {
  const plan = buildMarketReferenceWarehouseAutomatedApplyPlanV1({ generatedAt });
  const preflightSql = renderReferenceWarehouseAutomatedApplyPreflightSqlV1();
  const readbackSql = renderReferenceWarehouseAutomatedApplyReadbackSqlV1();
  return {
    ...plan,
    artifacts: {
      preflight_sql: "docs/sql/mee_reference_warehouse_automated_apply_v1_preflight.sql",
      readback_sql: "docs/sql/mee_reference_warehouse_automated_apply_v1_readback.sql",
      preflight_sql_sha256: sha256MarketReferenceAutomatedApplyV1(preflightSql),
      readback_sql_sha256: sha256MarketReferenceAutomatedApplyV1(readbackSql),
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const report = writeArtifacts(buildMarketReferenceWarehouseAutomatedApplyPlanV1());
  console.log(JSON.stringify(report, null, 2));
}
