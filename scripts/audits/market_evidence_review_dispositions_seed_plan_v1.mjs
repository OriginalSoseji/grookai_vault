import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");

const LANE_DISPOSITION = {
  high_signal_review: "review_pending_high_signal",
  candidate_review: "review_pending_candidate",
  classification_review: "review_pending_classification_fix",
  reference_only_review: "review_pending_reference_only",
  low_signal_monitor: "monitor_only",
};

const LANE_STATUS = {
  high_signal_review: "pending",
  candidate_review: "pending",
  classification_review: "pending",
  reference_only_review: "pending",
  low_signal_monitor: "resolved",
};

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256Text(JSON.stringify(stable(value)));
}

function sqlText(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJsonb(value) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}

function supabaseReadOnlyQuery(sql) {
  const output = execFileSync("supabase", ["db", "query", "--linked", sql], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 80,
  });
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

function evidenceLaneFor(row) {
  if ((row.raw_single_count ?? 0) > 0 && (row.slab_count ?? 0) > 0) return "mixed_raw_slab";
  if ((row.slab_count ?? 0) > 0) return "slab";
  if ((row.raw_single_count ?? 0) > 0) return "raw_single";
  if (row.review_lane === "classification_review") return "classification_blocked";
  if ((row.reference_evidence_count ?? 0) > 0 && (row.active_listing_evidence_count ?? 0) === 0) return "reference_metric";
  if (row.review_lane === "low_signal_monitor") return "low_signal";
  return "unknown";
}

function seedRowFor(row) {
  const reviewLane = row.review_lane;
  const evidenceLane = evidenceLaneFor(row);
  return {
    card_print_id: row.card_print_id,
    gv_id: row.sample_gv_id,
    review_lane: reviewLane,
    evidence_lane: evidenceLane,
    review_status: LANE_STATUS[reviewLane] ?? "pending",
    review_disposition: LANE_DISPOSITION[reviewLane] ?? "review_blocked",
    review_actor: "system_seed_plan",
    evidence_summary: {
      evidence_count: row.evidence_count,
      rollup_eligible_count: row.rollup_eligible_count,
      raw_single_count: row.raw_single_count,
      slab_count: row.slab_count,
      reference_metric_count: row.reference_metric_count,
      review_required_evidence_count: row.review_required_evidence_count,
      quality_flag_count: row.quality_flag_count,
      exclusion_flag_count: row.exclusion_flag_count,
      internal_rollup_candidate: row.internal_rollup_candidate,
    },
    source_mix: {
      source_family_count: row.source_family_count,
      reference_evidence_count: row.reference_evidence_count,
      active_listing_evidence_count: row.active_listing_evidence_count,
    },
    blocker_summary: {
      mixed_raw_slab: evidenceLane === "mixed_raw_slab",
      classification_blocked: evidenceLane === "classification_blocked",
      reference_only: reviewLane === "reference_only_review",
      low_signal: reviewLane === "low_signal_monitor",
      publication_blocked: true,
    },
    review_payload: {
      package_id: PACKAGE_ID,
      source_view: "v_market_evidence_card_review_queue_v1",
      lane_mapping_version: "MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1",
      no_public_price_claim: true,
    },
    needs_review: true,
    publication_gate_candidate: false,
    can_publish_price_directly: false,
    publishable: false,
    app_visible: false,
    market_truth: false,
  };
}

function buildInsertSql(rows) {
  const columns = [
    "card_print_id",
    "gv_id",
    "review_lane",
    "evidence_lane",
    "review_status",
    "review_disposition",
    "review_actor",
    "evidence_summary",
    "source_mix",
    "blocker_summary",
    "review_payload",
    "needs_review",
    "publication_gate_candidate",
    "can_publish_price_directly",
    "publishable",
    "app_visible",
    "market_truth",
  ];
  const values = rows
    .map((row) =>
      [
        row.card_print_id,
        row.gv_id,
        row.review_lane,
        row.evidence_lane,
        row.review_status,
        row.review_disposition,
        row.review_actor,
        row.evidence_summary,
        row.source_mix,
        row.blocker_summary,
        row.review_payload,
        row.needs_review,
        row.publication_gate_candidate,
        row.can_publish_price_directly,
        row.publishable,
        row.app_visible,
        row.market_truth,
      ]
        .map((value) => {
          if (typeof value === "boolean") return value ? "true" : "false";
          if (value && typeof value === "object") return sqlJsonb(value);
          return sqlText(value);
        })
        .join(", "),
    )
    .map((valueList) => `  (${valueList})`)
    .join(",\n");

  return [
    "-- MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_PLAN_V1 apply candidate.",
    "-- Local package only. Do not execute without separate apply approval.",
    "-- Inserts internal review disposition seed rows only; no public pricing writes.",
    "",
    "begin;",
    "",
    `insert into public.market_evidence_review_dispositions (${columns.join(", ")})`,
    "values",
    `${values};`,
    "",
    "select",
    `  '${PACKAGE_ID}'::text as package_id,`,
    `  ${rows.length}::int as planned_insert_rows,`,
    "  false::boolean as public_price_publication,",
    "  false::boolean as app_visible_pricing,",
    "  false::boolean as public_price_rollup,",
    "  false::boolean as market_truth;",
    "",
    "commit;",
    "",
  ].join("\n");
}

function renderMarkdown(report) {
  return [
    "# MEE Core Internal Review Dispositions Seed Plan V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "Mode: plan only, local artifacts only",
    "",
    "## Summary",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Planned seed rows: ${report.audit.planned_seed_rows}`,
    `- Duplicate keys in package: ${report.audit.duplicate_package_keys}`,
    `- Existing active disposition conflicts: ${report.audit.existing_active_conflicts}`,
    `- Findings: ${report.findings.length}`,
    "",
    "## Lane Mapping",
    "",
    ...Object.entries(report.audit.lane_counts).map(
      ([lane, count]) => `- ${lane}: ${count} -> \`${LANE_DISPOSITION[lane]}\``,
    ),
    "",
    "## Evidence Lanes",
    "",
    ...Object.entries(report.audit.evidence_lane_counts).map(([lane, count]) => `- ${lane}: ${count}`),
    "",
    "## Boundary Proof",
    "",
    "```json",
    JSON.stringify(report.boundary_proof, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

const queueRows = supabaseReadOnlyQuery(`
select
  card_print_id,
  sample_gv_id,
  review_lane,
  evidence_count,
  reference_evidence_count,
  active_listing_evidence_count,
  source_family_count,
  needs_review_count,
  model_eligible_count,
  rollup_eligible_count,
  publishable_count,
  app_visible_count,
  market_truth_count,
  reference_metric_count,
  raw_single_count,
  slab_count,
  review_required_evidence_count,
  quality_flag_count,
  exclusion_flag_count,
  internal_rollup_candidate
from public.v_market_evidence_card_review_queue_v1
order by review_lane, card_print_id;
`);

const existingActiveRows = supabaseReadOnlyQuery(`
select
  card_print_id,
  review_lane,
  evidence_lane,
  review_status
from public.market_evidence_review_dispositions
where review_status in ('pending', 'in_review', 'resolved', 'blocked');
`);

const seedRows = queueRows.map(seedRowFor);
const manifest = seedRows.map((row) => ({
  ...row,
  package_key: `${row.card_print_id}|${row.review_lane}|${row.evidence_lane}`,
  row_hash: sha256Json(row),
}));

const packageKeys = new Map();
for (const row of manifest) packageKeys.set(row.package_key, (packageKeys.get(row.package_key) ?? 0) + 1);
const duplicatePackageKeys = [...packageKeys.entries()].filter(([, count]) => count > 1);

const existingKeys = new Set(
  existingActiveRows.map((row) => `${row.card_print_id}|${row.review_lane}|${row.evidence_lane}`),
);
const existingActiveConflicts = manifest.filter((row) => existingKeys.has(row.package_key));

const laneCounts = {};
const dispositionCounts = {};
const evidenceLaneCounts = {};
for (const row of manifest) {
  laneCounts[row.review_lane] = (laneCounts[row.review_lane] ?? 0) + 1;
  dispositionCounts[row.review_disposition] = (dispositionCounts[row.review_disposition] ?? 0) + 1;
  evidenceLaneCounts[row.evidence_lane] = (evidenceLaneCounts[row.evidence_lane] ?? 0) + 1;
}

const findings = [];
if (duplicatePackageKeys.length) findings.push("duplicate_package_keys");
if (existingActiveConflicts.length) findings.push("existing_active_disposition_conflicts");
if (manifest.some((row) => row.publication_gate_candidate || row.can_publish_price_directly || row.publishable || row.app_visible || row.market_truth)) {
  findings.push("public_flag_present_in_seed_manifest");
}
for (const lane of Object.keys(laneCounts)) {
  if (!LANE_DISPOSITION[lane]) findings.push(`unknown_review_lane:${lane}`);
}

const manifestJsonl = manifest.map((row) => JSON.stringify(stable(row))).join("\n") + "\n";
const insertSql = buildInsertSql(seedRows);
const readbackSql = [
  "-- MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_PLAN_V1 readback SQL.",
  "-- Intended for use only after a separately approved seed apply.",
  "",
  "select",
  `  '${PACKAGE_ID}'::text as package_id,`,
  "  count(*)::int as disposition_rows,",
  "  count(*) filter (where review_actor = 'system_seed_plan')::int as seed_plan_rows,",
  "  count(*) filter (where publication_gate_candidate)::int as publication_gate_candidate_rows,",
  "  count(*) filter (where can_publish_price_directly)::int as direct_publish_rows,",
  "  count(*) filter (where publishable)::int as publishable_rows,",
  "  count(*) filter (where app_visible)::int as app_visible_rows,",
  "  count(*) filter (where market_truth)::int as market_truth_rows",
  "from public.market_evidence_review_dispositions;",
  "",
  "select",
  `  '${PACKAGE_ID}'::text as package_id,`,
  "  review_lane,",
  "  review_disposition,",
  "  evidence_lane,",
  "  count(*)::int as row_count",
  "from public.market_evidence_review_dispositions",
  "where review_actor = 'system_seed_plan'",
  "group by review_lane, review_disposition, evidence_lane",
  "order by row_count desc, review_lane, evidence_lane;",
  "",
].join("\n");

const audit = {
  source_view_rows: queueRows.length,
  existing_active_disposition_rows: existingActiveRows.length,
  planned_seed_rows: manifest.length,
  duplicate_package_keys: duplicatePackageKeys.length,
  existing_active_conflicts: existingActiveConflicts.length,
  lane_counts: laneCounts,
  disposition_counts: dispositionCounts,
  evidence_lane_counts: evidenceLaneCounts,
  no_public_flags_in_manifest: findings.includes("public_flag_present_in_seed_manifest") === false,
  sample_rows: manifest.slice(0, 25).map((row) => ({
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    review_lane: row.review_lane,
    evidence_lane: row.evidence_lane,
    review_status: row.review_status,
    review_disposition: row.review_disposition,
    package_key: row.package_key,
    row_hash: row.row_hash,
  })),
};

const reportPayload = { audit, findings, lane_disposition: LANE_DISPOSITION, lane_status: LANE_STATUS };
const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_internal_review_disposition_seed",
  package_fingerprint_sha256: sha256Json(reportPayload),
  audit,
  lane_disposition: LANE_DISPOSITION,
  lane_status: LANE_STATUS,
  artifacts: {
    row_manifest_jsonl: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}/row_manifest.jsonl`,
    apply_candidate_sql: "docs/sql/mee_core_internal_review_dispositions_seed_v1_apply_candidate.sql",
    readback_sql: "docs/sql/mee_core_internal_review_dispositions_seed_v1_readback.sql",
    report_json: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}/report.json`,
    report_md: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}.md`,
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_PLAN_V1.md",
  },
  hashes: {
    row_manifest_sha256: sha256Text(manifestJsonl),
    apply_candidate_sql_sha256: sha256Text(insertSql),
    readback_sql_sha256: sha256Text(readbackSql),
  },
  findings,
  boundary_proof: {
    db_writes: false,
    evidence_backfill_apply: false,
    provider_calls: false,
    source_fetches: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    vault_writes: false,
    image_storage_writes: false,
    deletes: false,
    upserts: false,
    merges: false,
    migrations: false,
    global_apply: false,
  },
};

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });

writeFileSync(path.join(ARTIFACT_DIR, "row_manifest.jsonl"), manifestJsonl);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), renderMarkdown(report));
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_dispositions_seed_v1_apply_candidate.sql"), insertSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_dispositions_seed_v1_readback.sql"), readbackSql);
writeFileSync(
  path.join(PLAN_DIR, "MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_PLAN_V1.md"),
  [
    "# MEE Core Internal Review Dispositions Seed Plan V1",
    "",
    "Status: plan only",
    "",
    "## Objective",
    "",
    "Prepare a local seed package from `v_market_evidence_card_review_queue_v1` into `market_evidence_review_dispositions`.",
    "",
    "## Planned Rows",
    "",
    `- ${manifest.length} internal review disposition rows`,
    `- duplicate package keys: ${duplicatePackageKeys.length}`,
    `- existing active conflicts: ${existingActiveConflicts.length}`,
    "",
    "## Boundary",
    "",
    "No DB writes, evidence backfill apply, provider calls, source fetches, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, deletes, upserts, merges, migrations, or global apply.",
    "",
  ].join("\n"),
);

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      findings: report.findings,
      audit: report.audit,
      hashes: report.hashes,
      artifacts: report.artifacts,
    },
    null,
    2,
  ),
);
