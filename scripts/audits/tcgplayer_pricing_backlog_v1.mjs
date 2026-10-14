import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import pg from "pg";

import "../../backend/env.mjs";
import {
  evaluateTcgplayerPricingBacklogV1,
} from "../../backend/pricing/tcgplayer_pricing_backlog_policy_v1.mjs";
import {
  buildTcgplayerIdentityMappingWorklistV1,
  escapeTcgplayerWorklistMarkdownCellV1,
} from "../../backend/pricing/tcgplayer_identity_mapping_worklist_v1.mjs";

const { Client } = pg;

function parseArgs(argv) {
  const value = (name) => argv.find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
    .trim() ?? "";
  return {
    runKey: value("run-key"),
    outRoot: path.resolve(value("out-root") || "artifacts/tcgplayer_pricing_backlog_v1"),
    requireComplete: argv.includes("--require-complete"),
  };
}

function connectionString() {
  return process.env.SUPABASE_DB_URL
    || process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || "";
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: true };
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function jsonl(rows) {
  return rows.length
    ? `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`
    : "";
}

function markdown(report) {
  return [
    "# TCGPlayer Pricing Completion Backlog",
    "",
    `- Status: \`${report.status}\``,
    `- Run: \`${report.run.run_key}\``,
    `- Selected: \`${report.counts.selected}\``,
    `- Published: \`${report.counts.published}\``,
    `- Missing published price: \`${report.counts.non_published}\``,
    "",
    "| Repair lane | Completion owner | Backlog |",
    "|---|---|---:|",
    ...report.lanes.map((lane) =>
      `| ${lane.lane_id} | ${lane.agent_key} | ${lane.backlog_count} |`),
    "",
    "| Decision | Primary reason | Rows | Repair lane |",
    "|---|---|---:|---|",
    ...report.primary_reasons.map((row) =>
      `| ${row.decision} | ${row.primary_reason} | ${row.count} | ${row.lane_id} |`),
    "",
    "## Identity Mapping Worklist",
    "",
    `- Status: \`${report.identity_mapping_worklist.status}\``,
    `- Backlog rows: \`${report.identity_mapping_worklist.counts.backlog_rows}\``,
    `- Source products: \`${report.identity_mapping_worklist.counts.source_products}\``,
    `- Source groups: \`${report.identity_mapping_worklist.counts.source_groups}\``,
    "",
    "| Source category | Completion owner | Rows | Products | Groups |",
    "|---|---|---:|---:|---:|",
    ...report.identity_mapping_worklist.categories.map((row) =>
      `| ${escapeTcgplayerWorklistMarkdownCellV1(row.source_category_name)} | ${row.agent_key} | ${row.backlog_rows} | ${row.source_products} | ${row.source_groups} |`),
    "",
    "| Routed scope | Completion owner | Rows | Products | Groups |",
    "|---|---|---:|---:|---:|",
    ...report.identity_mapping_worklist.routes.map((row) =>
      `| ${escapeTcgplayerWorklistMarkdownCellV1(row.source_category_name)} / ${row.product_scope_result} | ${row.agent_key} | ${row.backlog_rows} | ${row.source_products} | ${row.source_groups} |`),
    "",
    "| Source group | Rows | Products |",
    "|---|---:|---:|",
    ...report.identity_mapping_worklist.top_groups.map((row) =>
      `| ${escapeTcgplayerWorklistMarkdownCellV1(row.source_group_name)} | ${row.backlog_rows} | ${row.source_products} |`),
    "",
    ...(report.findings.length
      ? ["## Findings", "", ...report.findings.map((finding) => `- ${finding}`), ""]
      : []),
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) throw new Error("SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required");
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    query_timeout: 125_000,
    application_name: "tcgplayer_pricing_backlog_v1_read_only",
  });
  await client.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    await client.query("set local lock_timeout = '3s'");
    const run = (await client.query(
      `select id, run_key, source_sync_run_id, selected_count, eligible_count, snapshot_count,
              excluded_count, quarantined_count, delayed_count,
              suppressed_count, completed_at
         from public.market_price_pipeline_runs
        where run_mode = 'production'
          and state in ('published', 'verified')
          and ($1::text = '' or run_key = $1)
        order by completed_at desc nulls last, created_at desc, id desc
        limit 1`,
      [args.runKey],
    )).rows[0];
    if (!run) throw new Error("verified production pricing run not found");
    const primaryReasons = (await client.query(
      `select decision,
              coalesce(reason_codes[1], 'unclassified') as primary_reason,
              count(*)::integer as count
         from public.market_price_qualification_decisions
        where run_id = $1::uuid
          and decision <> 'publish'
        group by decision, coalesce(reason_codes[1], 'unclassified')
        order by count(*) desc, decision, primary_reason`,
      [run.id],
    )).rows;
    const reasonOccurrences = (await client.query(
      `select decision, reason.reason, count(*)::integer as count
         from public.market_price_qualification_decisions decision_row
         cross join lateral unnest(decision_row.reason_codes) reason(reason)
        where decision_row.run_id = $1::uuid
          and decision_row.decision <> 'publish'
        group by decision, reason.reason
        order by count(*) desc, decision, reason.reason`,
      [run.id],
    )).rows;
    const identityRows = (await client.query(
      `select
              decision.decision,
              decision.reason_codes[1] as primary_reason,
              decision.source_observation_id::text,
              decision.source_product_id,
              decision.source_subtype_name,
              product.name as source_product_name,
              product.category_id as source_category_id,
              coalesce(category.display_name, category.name)
                as source_category_name,
              product.group_id as source_group_id,
              source_group.name as source_group_name,
              decision.evidence ->> 'product_scope_result'
                as product_scope_result,
              decision.evidence ->> 'product_scope_rule_id'
                as product_scope_rule_id
         from public.market_price_qualification_decisions decision
         join public.tcgcsv_source_products product
           on product.product_id = decision.source_product_id
         join public.tcgcsv_source_groups source_group
           on source_group.group_id = product.group_id
         join public.tcgcsv_source_categories category
           on category.category_id = product.category_id
        where decision.run_id = $1::uuid
          and decision.decision <> 'publish'
          and decision.reason_codes[1] = any($2::text[])
        order by product.group_id, decision.source_product_id,
                 decision.source_subtype_name, decision.source_observation_id`,
      [run.id, ["missing_active_source_mapping", "missing_mapping_method"]],
    )).rows;
    await client.query("rollback");

    const evaluated = evaluateTcgplayerPricingBacklogV1({
      run,
      primaryReasons,
      reasonOccurrences,
    });
    const expectedIdentityRows = evaluated.lanes.find((lane) =>
      lane.lane_id === "identity_mapping")?.backlog_count ?? 0;
    const identityWorklist = buildTcgplayerIdentityMappingWorklistV1(identityRows, {
      expectedRowCount: expectedIdentityRows,
    });
    const report = {
      ...evaluated,
      identity_mapping_worklist: {
        policy_version: identityWorklist.policy_version,
        status: identityWorklist.status,
        counts: identityWorklist.counts,
        findings: identityWorklist.findings,
        routes: identityWorklist.routes,
        categories: identityWorklist.categories,
        top_groups: identityWorklist.groups.slice(0, 30),
      },
      generated_at: new Date().toISOString(),
      read_only: true,
    };
    if (identityWorklist.status !== "ready") {
      report.status = "invalid";
      report.findings = [
        ...report.findings,
        ...identityWorklist.findings.map((finding) =>
          `identity_mapping_worklist:${finding}`),
      ];
    }
    const runDir = path.join(args.outRoot, stamp());
    await fs.mkdir(runDir, { recursive: true });
    const summary = `${JSON.stringify(report, null, 2)}\n`;
    const reportMarkdown = markdown(report);
    const identityGaps = jsonl(identityWorklist.gaps);
    const pokemonIdentityGaps = jsonl(identityWorklist.gaps.filter((row) =>
      row.source_category_id === 3
      && row.product_scope_result === "in_scope"));
    const mtgIdentityGaps = jsonl(identityWorklist.gaps.filter((row) =>
      row.source_category_id === 1
      && row.product_scope_result === "in_scope"));
    const identityGroups = `${JSON.stringify(identityWorklist.groups, null, 2)}\n`;
    const hashes = {
      "summary.json": sha256(summary),
      "REPORT.md": sha256(reportMarkdown),
      "identity_mapping_gaps.jsonl": sha256(identityGaps),
      "pokemon_identity_mapping_gaps.jsonl": sha256(pokemonIdentityGaps),
      "mtg_identity_mapping_gaps.jsonl": sha256(mtgIdentityGaps),
      "identity_mapping_groups.json": sha256(identityGroups),
    };
    await Promise.all([
      fs.writeFile(path.join(runDir, "summary.json"), summary),
      fs.writeFile(path.join(runDir, "REPORT.md"), reportMarkdown),
      fs.writeFile(path.join(runDir, "identity_mapping_gaps.jsonl"), identityGaps),
      fs.writeFile(path.join(runDir, "pokemon_identity_mapping_gaps.jsonl"), pokemonIdentityGaps),
      fs.writeFile(path.join(runDir, "mtg_identity_mapping_gaps.jsonl"), mtgIdentityGaps),
      fs.writeFile(path.join(runDir, "identity_mapping_groups.json"), identityGroups),
      fs.writeFile(path.join(runDir, "artifact_hashes.json"), `${JSON.stringify(hashes, null, 2)}\n`),
      fs.writeFile(path.join(args.outRoot, "latest.json"), summary),
      fs.writeFile(path.join(args.outRoot, "LATEST.md"), reportMarkdown),
      fs.writeFile(path.join(args.outRoot, "latest_identity_mapping_gaps.jsonl"), identityGaps),
      fs.writeFile(path.join(args.outRoot, "latest_pokemon_identity_mapping_gaps.jsonl"), pokemonIdentityGaps),
      fs.writeFile(path.join(args.outRoot, "latest_mtg_identity_mapping_gaps.jsonl"), mtgIdentityGaps),
      fs.writeFile(path.join(args.outRoot, "latest_identity_mapping_groups.json"), identityGroups),
    ]);
    process.stdout.write(`${JSON.stringify({
      status: report.status,
      counts: report.counts,
      lanes: report.lanes,
      findings: report.findings,
      artifact_root: runDir,
    }, null, 2)}\n`);
    if (report.status === "invalid") process.exitCode = 1;
    else if (args.requireComplete && report.status !== "complete") process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[tcgplayer-pricing-backlog] ${error.stack || error.message}`);
  process.exitCode = 1;
});
