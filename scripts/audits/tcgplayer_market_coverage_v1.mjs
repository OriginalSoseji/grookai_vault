import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  summarizeTcgplayerMarketCoverageV1,
  TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2,
  TCGPLAYER_MARKET_MINIMUM_COVERAGE_PERCENT_V1,
} from "../../backend/pricing/tcgplayer_market_coverage_policy_v1.mjs";
import {
  classifyTcgplayerMarketProductScopeV1_2,
} from "../../backend/pricing/tcgplayer_market_product_scope_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "coverage",
);
const AUDIT_VERSION = "TCGPLAYER_MARKET_COVERAGE_AUDIT_V1_3";

function parseArgs(argv) {
  const args = {
    runKey: "",
    outRoot: DEFAULT_OUT_ROOT,
    minimumCoveragePercent: TCGPLAYER_MARKET_MINIMUM_COVERAGE_PERCENT_V1,
    requirePass: false,
    requireCoveragePass: false,
  };
  for (const arg of argv) {
    if (arg.startsWith("--run-key=")) {
      args.runKey = arg.slice("--run-key=".length).trim();
    } else if (arg.startsWith("--out-root=")) {
      args.outRoot = path.resolve(arg.slice("--out-root=".length));
    } else if (arg.startsWith("--minimum-coverage-percent=")) {
      args.minimumCoveragePercent = Number(
        arg.slice("--minimum-coverage-percent=".length),
      );
    } else if (arg === "--require-pass") {
      args.requirePass = true;
    } else if (arg === "--require-coverage-pass") {
      args.requireCoveragePass = true;
    }
  }
  if (
    !Number.isFinite(args.minimumCoveragePercent) ||
    args.minimumCoveragePercent <= 0 ||
    args.minimumCoveragePercent > 100
  ) {
    throw new Error("--minimum-coverage-percent must be in (0, 100]");
  }
  return args;
}

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function jsonl(rows) {
  return (
    rows.map((row) => JSON.stringify(row)).join("\n") +
    (rows.length ? "\n" : "")
  );
}

function markdown(
  run,
  summary,
  shadowPublicationScope,
  currentPublicationScope,
) {
  const topGaps = Object.entries(summary.gap_reasons).slice(0, 20);
  const weakestSets = Object.entries(summary.by_set)
    .filter(([, row]) => row.denominator > 0)
    .sort(
      (left, right) =>
        left[1].coverage_percent - right[1].coverage_percent ||
        right[1].denominator - left[1].denominator,
    )
    .slice(0, 30);
  const largestSetGaps = Object.entries(summary.by_set)
    .filter(([, row]) => row.denominator > row.numerator)
    .sort(
      (left, right) =>
        right[1].denominator -
          right[1].numerator -
          (left[1].denominator - left[1].numerator) ||
        left[0].localeCompare(right[0]),
    )
    .slice(0, 30);
  const lines = [
    "# TCGPlayer Market Production V1 Coverage",
    "",
    `- Audit version: \`${AUDIT_VERSION}\``,
    `- Policy version: \`${TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2}\``,
    `- Source run: \`${run.run_key}\``,
    `- Source commit: \`${run.git_commit_sha}\``,
    `- Status: \`${summary.status}\``,
    `- Coverage threshold status: \`${summary.coverage_status}\``,
    `- Coverage: \`${summary.coverage_percent}%\``,
    `- Required: \`${summary.threshold_percent}%\``,
    `- Denominator: \`${summary.counts.denominator_rows}\``,
    `- Numerator: \`${summary.counts.numerator_rows}\``,
    `- Remaining gap rows: \`${summary.counts.gap_rows}\``,
    `- Exact rows needed to reach threshold: \`${summary.rows_needed_for_threshold}\``,
    "",
    "## Shadow Publication Boundary",
    "",
    `- Shadow publish rows: \`${shadowPublicationScope.row_count}\``,
    `- Shadow publish rows outside V1.2 scope: \`${shadowPublicationScope.out_of_scope_count}\``,
    `- Shadow publication scope status: \`${shadowPublicationScope.status}\``,
    "",
    "## Current Publication Boundary",
    "",
    `- Current exact publication rows: \`${currentPublicationScope.row_count}\``,
    `- Current rows outside V1.1 scope: \`${currentPublicationScope.out_of_scope_count}\``,
    `- Current publication scope status: \`${currentPublicationScope.status}\``,
    "",
    "## Denominator",
    "",
    "The denominator unit is one current TCGCSV source product/subtype price row.",
    "It includes positive USD ordinary English Pokemon single-card candidates",
    "with a supported V1 finish. Missing mapping evidence does not remove a row",
    "from the denominator. V1.1 special-print lanes, unsupported object formats,",
    "unsupported subtypes, nonpositive prices, and unusable source rows are",
    "excluded by a versioned deterministic reason.",
    "",
    "## Gap Reasons",
    "",
    "| Reason | Rows |",
    "| --- | ---: |",
    ...topGaps.map(([reason, count]) => `| ${reason} | ${count} |`),
    "",
    "## Weakest In-Scope Sets",
    "",
    "| Source group | Coverage | Numerator | Denominator |",
    "| --- | ---: | ---: | ---: |",
    ...weakestSets.map(
      ([setName, row]) =>
        `| ${setName.replace(/\|/g, "\\|")} | ${row.coverage_percent}% | ${row.numerator} | ${row.denominator} |`,
    ),
    "",
    "## Largest In-Scope Set Gaps",
    "",
    "| Source group | Gap rows | Coverage | Numerator | Denominator |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...largestSetGaps.map(
      ([setName, row]) =>
        `| ${setName.replace(/\|/g, "\\|")} | ${row.denominator - row.numerator} | ${row.coverage_percent}% | ${row.numerator} | ${row.denominator} |`,
    ),
    "",
    "## Findings",
    "",
    ...(summary.findings.length
      ? summary.findings.map((finding) => `- \`${finding}\``)
      : ["- none"]),
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required",
    );
  }
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 180_000,
    query_timeout: 180_000,
  });
  await client.connect();
  try {
    const run = (
      await client.query(
        `select *
         from public.market_price_pipeline_runs
         where run_mode = 'shadow'
           and ($1::text = '' or run_key = $1)
         order by created_at desc, id desc
         limit 1`,
        [args.runKey],
      )
    ).rows[0];
    if (!run) throw new Error("reconciled full shadow run not found");
    if (
      run.state !== "shadow_verified" ||
      run.reconciliation_state !== "reconciled"
    ) {
      throw new Error("coverage requires a reconciled shadow-verified run");
    }

    const rows = (
      await client.query(
        `select
           decision.id,
           decision.source_observation_id,
           decision.source_product_id,
           decision.source_subtype_name,
           decision.currency,
           decision.market_price,
           decision.decision,
           decision.language_result,
           decision.source_integrity_result,
           decision.reason_codes,
           decision.card_print_id,
           decision.card_printing_id,
           decision.variant_assignment_status,
           decision.evidence,
           observation.group_id as source_group_id,
           product.name as source_product_name,
           product.source_active as source_product_active,
           product.catalog_metadata_status as source_product_catalog_status,
           source_group.name as source_group_name,
           source_group.published_on::text as source_group_published_on
         from public.market_price_qualification_decisions decision
         join public.tcgcsv_source_price_daily_observations observation
           on observation.id = decision.source_observation_id
         join public.tcgcsv_source_products product
           on product.product_id = decision.source_product_id
         join public.tcgcsv_source_groups source_group
           on source_group.group_id = observation.group_id
         where decision.run_id = $1::uuid
         order by decision.source_product_id,
                  decision.source_subtype_name,
                  decision.source_observation_id`,
        [run.id],
      )
    ).rows;
    const result = summarizeTcgplayerMarketCoverageV1(rows, {
      minimumCoveragePercent: args.minimumCoveragePercent,
    });
    const { rows: classifiedRows, ...summary } = result;
    const shadowPublicationOutOfScope = classifiedRows.filter(
      (row) => row.decision === "publish" && !row.product_scope.in_scope,
    );
    const shadowPublicationScope = {
      policy_version: TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2,
      status:
        shadowPublicationOutOfScope.length === 0 ? "passed" : "failed",
      row_count: classifiedRows.filter((row) => row.decision === "publish")
        .length,
      out_of_scope_count: shadowPublicationOutOfScope.length,
      out_of_scope_rows: shadowPublicationOutOfScope,
    };
    summary.coverage_status = summary.status;
    summary.shadow_publication_scope_status = shadowPublicationScope.status;
    if (shadowPublicationOutOfScope.length > 0) {
      summary.findings = [
        ...summary.findings,
        "shadow_publication_contains_v1_2_scope_exclusion",
      ];
      summary.status = "failed";
    }
    const currentPublicationRows = (
      await client.query(
        `select
           snapshot.source_product_id,
           product.name as source_product_name,
           source_group.name as source_group_name,
           coalesce(
             (decision.evidence ->> 'has_printed_number_evidence')::boolean,
             false
           ) as has_printed_number_evidence
         from public.market_price_current_publication pointer
         join public.market_price_publication_snapshots snapshot
           on snapshot.publication_set_id = pointer.publication_set_id
         join public.market_price_qualification_decisions decision
           on decision.id = snapshot.qualification_decision_id
         join public.tcgcsv_source_products product
           on product.product_id = snapshot.source_product_id
         join public.tcgcsv_source_price_daily_observations observation
           on observation.id = snapshot.source_observation_id
         join public.tcgcsv_source_groups source_group
           on source_group.group_id = observation.group_id
         where pointer.singleton
         order by snapshot.source_product_id, snapshot.source_subtype_name`,
      )
    ).rows;
    const currentPublicationClassifications = currentPublicationRows.map(
      (row) => ({
        ...row,
        product_scope: classifyTcgplayerMarketProductScopeV1_2(row),
      }),
    );
    const currentPublicationOutOfScope =
      currentPublicationClassifications.filter(
        (row) => !row.product_scope.in_scope,
      );
    const currentPublicationScope = {
      policy_version: TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2,
      status:
        currentPublicationOutOfScope.length === 0 ? "passed" : "failed",
      row_count: currentPublicationClassifications.length,
      out_of_scope_count: currentPublicationOutOfScope.length,
      out_of_scope_rows: currentPublicationOutOfScope,
    };
    summary.current_publication_scope_status = currentPublicationScope.status;
    if (currentPublicationOutOfScope.length > 0) {
      summary.findings = [
        ...summary.findings,
        "current_publication_contains_v1_2_scope_exclusion",
      ];
      summary.status = "failed";
    }
    const gaps = classifiedRows.filter(
      (row) => row.in_denominator && !row.in_numerator,
    );
    const exclusions = classifiedRows.filter((row) => !row.in_denominator);
    const runDir = path.join(args.outRoot, stamp());
    await fs.mkdir(runDir, { recursive: true });
    const runPlan = {
      audit_version: AUDIT_VERSION,
      policy_version: TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2,
      source_run_id: run.id,
      source_run_key: run.run_key,
      source_commit_sha: run.git_commit_sha,
      minimum_coverage_percent: args.minimumCoveragePercent,
      denominator_unit: "source_product_subtype_price_row",
      boundaries: {
        database_reads_only: true,
        database_writes: false,
        mapping_writes: false,
        publication_writes: false,
      },
    };
    const files = {
      "run_plan.json": `${JSON.stringify(runPlan, null, 2)}\n`,
      "summary.json": `${JSON.stringify(summary, null, 2)}\n`,
      "coverage_gaps.jsonl": jsonl(gaps),
      "scope_exclusions.jsonl": jsonl(exclusions),
      "shadow_publication_scope.json": `${JSON.stringify(
        shadowPublicationScope,
        null,
        2,
      )}\n`,
      "current_publication_scope.json": `${JSON.stringify(
        currentPublicationScope,
        null,
        2,
      )}\n`,
      "REPORT.md": markdown(
        run,
        summary,
        shadowPublicationScope,
        currentPublicationScope,
      ),
    };
    const hashes = {};
    for (const [name, contents] of Object.entries(files)) {
      await fs.writeFile(path.join(runDir, name), contents);
      hashes[name] = sha256(Buffer.from(contents));
    }
    await fs.writeFile(
      path.join(runDir, "artifact_hashes.json"),
      `${JSON.stringify(hashes, null, 2)}\n`,
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          ...summary,
          by_set: undefined,
          artifact_root: path
            .relative(REPO_ROOT, runDir)
            .replace(/\\/g, "/"),
        },
        null,
        2,
      )}\n`,
    );
    if (args.requirePass && summary.status !== "passed") process.exitCode = 1;
    if (
      args.requireCoveragePass &&
      (summary.coverage_status !== "passed" ||
        summary.shadow_publication_scope_status !== "passed")
    ) {
      process.exitCode = 1;
    }
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[market-coverage] ${error.stack || error.message}`);
  process.exitCode = 1;
});
