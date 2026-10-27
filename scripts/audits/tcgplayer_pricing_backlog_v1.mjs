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
  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(url)) return false;
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim();
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
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

function integer(value) {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error(`invalid non-negative integer: ${value}`);
  }
  return number;
}

async function readPokemonCatalogPriceCoverageV1(client) {
  const row = (await client.query(
    `with current_publication as (
       select publication_set_id, run_id
         from public.market_price_current_publication
        where singleton = true
     ),
     physical_parents as materialized (
       select card.id
         from public.card_prints card
         join public.games game on game.id = card.game_id
         join public.sets catalog_set on catalog_set.id = card.set_id
         left join public.catalog_set_release_controls release_control
           on release_control.set_id = catalog_set.id
        where game.code = 'pokemon'
          and card.identity_domain = 'pokemon_eng_standard'
          and catalog_set.identity_domain_default = 'pokemon_eng_standard'
          and coalesce(card.data_quality_flags #>> '{app_visibility_v1,status}', 'visible') <> 'suppressed'
          and coalesce(release_control.release_status, 'public') in ('public', 'signed_in')
     ),
     physical_printings as materialized (
       select printing.id, printing.card_print_id
         from public.card_printings printing
         join physical_parents parent on parent.id = printing.card_print_id
        where not exists (
          select 1
            from public.card_printing_truth_reviews truth_review
           where truth_review.card_printing_id = printing.id
             and truth_review.active = true
             and truth_review.public_visibility in (
               'hidden_pending_review',
               'hidden_unsupported'
             )
        )
     ),
     edition_sensitive_parents as materialized (
       select snapshot.card_print_id
         from current_publication current_state
         join public.market_price_publication_snapshots snapshot
           on snapshot.publication_set_id = current_state.publication_set_id
          and snapshot.run_id = current_state.run_id
         join physical_parents parent on parent.id = snapshot.card_print_id
        where snapshot.gym_edition_assignment_id is not null
           or snapshot.edition_assignment_id is not null
       union
       select edition_link.legacy_card_print_id
         from public.jungle_edition_identity_links_v1 edition_link
         join physical_parents parent
           on parent.id = edition_link.legacy_card_print_id
        where edition_link.state in ('active', 'retired')
       union
       select edition_link.card_print_id
         from public.jungle_edition_identity_links_v1 edition_link
         join physical_parents parent on parent.id = edition_link.card_print_id
        where edition_link.state in ('active', 'retired')
     ),
     edition_sensitive_printings as materialized (
       select printing.id, printing.card_print_id
         from physical_printings printing
         join edition_sensitive_parents parent
           on parent.card_print_id = printing.card_print_id
     ),
     regular_current_prices as materialized (
       select snapshot.card_printing_id, snapshot.card_print_id
         from current_publication current_state
         join public.market_price_publication_sets publication_set
           on publication_set.id = current_state.publication_set_id
          and publication_set.run_id = current_state.run_id
          and publication_set.publication_state = 'published'
         join public.market_price_pipeline_runs pipeline_run
           on pipeline_run.id = current_state.run_id
          and pipeline_run.reconciliation_state = 'reconciled'
          and pipeline_run.state in ('published', 'verified')
         join public.market_price_publication_snapshots snapshot
           on snapshot.publication_set_id = current_state.publication_set_id
          and snapshot.run_id = current_state.run_id
         join public.market_price_qualification_decisions decision
           on decision.id = snapshot.qualification_decision_id
          and decision.run_id = snapshot.run_id
          and decision.eligible = true
          and decision.decision = 'publish'
          and decision.publication_lane = 'current'
         join physical_printings printing
           on printing.id = snapshot.card_printing_id
          and printing.card_print_id = snapshot.card_print_id
        where not exists (
          select 1
            from public.external_mappings rejected_mapping
           where rejected_mapping.id = snapshot.source_mapping_id
             and rejected_mapping.meta->'reviewed_invalidation'->>'reason_code'
               = 'PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT'
        )
          and not exists (
            select 1
              from edition_sensitive_parents sensitive_parent
             where sensitive_parent.card_print_id = snapshot.card_print_id
          )
          and snapshot.publication_state = 'published'
          and snapshot.freshness_state = 'fresh'
          and snapshot.source_sync_finished_at >= now() - interval '36 hours'
     ),
     physical_counts as (
       select
         (select count(*)::integer from physical_parents) as parent_count,
         (select count(*)::integer from physical_printings) as exact_printing_count,
         (select count(distinct card_print_id)::integer from physical_printings)
           as parents_with_exact_printing_count,
         (select count(distinct card_print_id)::integer from regular_current_prices)
           as regular_priced_parent_count,
         (select count(distinct card_printing_id)::integer from regular_current_prices)
           as regular_priced_exact_printing_count,
         (select count(*)::integer from edition_sensitive_parents)
           as edition_sensitive_parent_count,
         (select count(*)::integer from edition_sensitive_printings)
           as edition_sensitive_exact_printing_count
     ),
     excluded_printing_counts as (
       select
         count(printing.id) filter (
           where card.identity_domain = 'pokemon_jpn'
             and coalesce(card.data_quality_flags #>> '{app_visibility_v1,status}', 'visible') <> 'suppressed'
         )::integer as japanese_exact_printing_count,
         count(printing.id) filter (
           where card.identity_domain = 'tcg_pocket_excluded'
             and coalesce(card.data_quality_flags #>> '{app_visibility_v1,status}', 'visible') <> 'suppressed'
         )::integer as pocket_exact_printing_count
       from public.card_prints card
       join public.games game on game.id = card.game_id
       left join public.card_printings printing on printing.card_print_id = card.id
       where game.code = 'pokemon'
         and card.identity_domain in ('pokemon_jpn', 'tcg_pocket_excluded')
     ),
     excluded_parent_counts as (
       select
         count(*) filter (
           where card.identity_domain = 'pokemon_jpn'
             and coalesce(card.data_quality_flags #>> '{app_visibility_v1,status}', 'visible') <> 'suppressed'
         )::integer as japanese_parent_count,
         count(*) filter (
           where card.identity_domain = 'tcg_pocket_excluded'
             and coalesce(card.data_quality_flags #>> '{app_visibility_v1,status}', 'visible') <> 'suppressed'
         )::integer as pocket_parent_count
       from public.card_prints card
       join public.games game on game.id = card.game_id
       where game.code = 'pokemon'
         and card.identity_domain in ('pokemon_jpn', 'tcg_pocket_excluded')
     )
     select physical_counts.*,
            excluded_parent_counts.japanese_parent_count,
            excluded_printing_counts.japanese_exact_printing_count,
            excluded_parent_counts.pocket_parent_count,
            excluded_printing_counts.pocket_exact_printing_count
       from physical_counts
       cross join excluded_printing_counts
       cross join excluded_parent_counts`,
  )).rows[0];
  if (!row) throw new Error("Pokemon catalog price coverage query returned no row");
  const parentCount = integer(row.parent_count);
  const exactPrintingCount = integer(row.exact_printing_count);
  const parentsWithExactPrintingCount = integer(row.parents_with_exact_printing_count);
  const pricedParentCount = integer(row.regular_priced_parent_count);
  const pricedExactPrintingCount = integer(row.regular_priced_exact_printing_count);
  return {
    policy_version: "POKEMON_PHYSICAL_PRICE_COVERAGE_V1",
    scope: {
      game: "pokemon",
      identity_domain: "pokemon_eng_standard",
      set_identity_domain: "pokemon_eng_standard",
      app_visibility: "public_or_signed_in",
      price_basis: "TCGPLAYER_MARKET",
      currency: "USD",
    },
    physical_english: {
      parent_count: parentCount,
      exact_printing_count: exactPrintingCount,
      parents_with_exact_printing_count: parentsWithExactPrintingCount,
      parents_without_exact_printing_count: parentCount - parentsWithExactPrintingCount,
      priced_parent_count: pricedParentCount,
      unpriced_parent_count: parentCount - pricedParentCount,
      priced_exact_printing_count: pricedExactPrintingCount,
      unpriced_exact_printing_count: exactPrintingCount - pricedExactPrintingCount,
      edition_sensitive_parent_count_held: integer(row.edition_sensitive_parent_count),
      edition_sensitive_exact_printing_count_held: integer(row.edition_sensitive_exact_printing_count),
      coverage_is_conservative: true,
    },
    excluded_from_tcgplayer_us: {
      japanese_parent_count: integer(row.japanese_parent_count),
      japanese_exact_printing_count: integer(row.japanese_exact_printing_count),
      pocket_parent_count: integer(row.pocket_parent_count),
      pocket_exact_printing_count: integer(row.pocket_exact_printing_count),
    },
  };
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
                as product_scope_rule_id,
              decision.evidence ->> 'product_scope_policy_version'
                as product_scope_policy_version,
              coalesce(
                (decision.evidence ->> 'has_printed_number_evidence')::boolean,
                false
              ) as has_printed_number_evidence
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
    const pokemonCatalogCoverage = await readPokemonCatalogPriceCoverageV1(client);
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
        mtg_top_groups: identityWorklist.groups.filter((row) =>
          row.source_category_id === 1).slice(0, 30),
        pokemon_top_groups: identityWorklist.groups.filter((row) =>
          row.source_category_id === 3).slice(0, 30),
      },
      pokemon_catalog_coverage: pokemonCatalogCoverage,
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
