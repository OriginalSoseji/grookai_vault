import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import pg from "pg";

import "../../backend/env.mjs";
import {
  planTcgplayerExactMappingCandidateV1,
  quarantineTcgplayerTargetCollisionsV1,
  TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_1,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";

const { Client } = pg;
const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PLANNER_VERSION = "TCGPLAYER_MARKET_EXACT_MAPPING_PLANNER_V1_1";
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "exact_mapping_plan",
);

const REVIEWED_SET_AUTHORITIES = Object.freeze([
  {
    source_group_id: 23529,
    source_group_name: "SV: Shrouded Fable",
    target_set_code: "sv06.5",
    evidence_lane: "reviewed_group_set_authority",
    mapping_method: "exact_reviewed_set_number_name_authority_v1",
    mapping_confidence: 0.99,
    authority_evidence: {
      authority_version: "TCGPLAYER_MARKET_REVIEWED_SET_AUTHORITY_V1",
      rationale:
        "TCGdex canonical set is the established TCGPlayer target when a PokemonAPI duplicate set exists",
    },
  },
]);

function parseArgs(argv) {
  if (argv.includes("--apply")) {
    throw new Error("this planner is read-only and does not support --apply");
  }
  const value = (name) =>
    argv
      .find((arg) => arg.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim();
  const sourceRunId = value("source-run-id");
  const coverageGaps = value("coverage-gaps");
  if (!sourceRunId) throw new Error("--source-run-id is required");
  if (!coverageGaps) throw new Error("--coverage-gaps is required");
  return {
    sourceRunId,
    coverageGaps: path.resolve(coverageGaps),
    outRoot: path.resolve(value("out-root") || DEFAULT_OUT_ROOT),
  };
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function jsonl(rows) {
  return rows.length
    ? `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`
    : "";
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function git(args) {
  const result = await execFileAsync("git", args, {
    cwd: REPO_ROOT,
    timeout: 15_000,
    windowsHide: true,
  });
  return result.stdout.trim();
}

async function readJsonl(filePath) {
  const contents = await fs.readFile(filePath, "utf8");
  return contents
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = row[key] ?? "none";
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

function numberField(extendedData) {
  const fields = Array.isArray(extendedData) ? extendedData : [];
  return String(
    fields.find(
      (field) => String(field?.name ?? "").trim().toLowerCase() === "number",
    )?.value ?? "",
  ).trim();
}

function groupGapRows(gaps) {
  const groups = new Map();
  for (const gap of gaps) {
    if (gap.primary_gap_reason !== "missing_active_source_mapping") continue;
    const productId = Number(gap.source_product_id);
    const item = groups.get(productId) ?? {
      source_product_id: productId,
      source_product_name: gap.source_product_name,
      source_group_id: Number(gap.source_group_id),
      source_group_name: gap.source_group_name,
      source_subtypes: [],
      supporting_gap_observation_ids: [],
      supporting_gap_row_count: 0,
    };
    item.source_subtypes.push(gap.source_subtype_name);
    item.supporting_gap_observation_ids.push(gap.source_observation_id);
    item.supporting_gap_row_count += 1;
    groups.set(productId, item);
  }
  return [...groups.values()].sort(
    (left, right) => left.source_product_id - right.source_product_id,
  );
}

async function loadSourceContext(client, sourceRunId, groupedGaps) {
  const productIds = groupedGaps.map((row) => row.source_product_id);
  const sourceRun = (
    await client.query(
      `select id::text, sync_mode, status, failed_count, observed_on,
              finished_at, artifact_hash
         from public.tcgcsv_source_sync_runs
        where id = $1::uuid`,
      [sourceRunId],
    )
  ).rows[0];
  if (
    !sourceRun ||
    sourceRun.sync_mode !== "current_full_sync" ||
    sourceRun.status !== "completed" ||
    Number(sourceRun.failed_count) !== 0
  ) {
    throw new Error("source run is not a completed reconciled current sync");
  }

  const products = (
    await client.query(
      `select
         product.product_id,
         product.name as source_product_name,
         product.group_id as source_group_id,
         source_group.name as source_group_name,
         product.extended_data,
         product.source_active,
         product.catalog_metadata_status,
         count(distinct mapping.id)::integer as active_source_mapping_count
       from public.tcgcsv_source_products product
       join public.tcgcsv_source_groups source_group
         on source_group.group_id = product.group_id
       left join public.external_mappings mapping
         on mapping.source = 'tcgplayer'
        and mapping.external_id = product.product_id::text
        and mapping.active = true
       where product.product_id = any($1::integer[])
       group by product.product_id, product.name, product.group_id,
                source_group.name, product.extended_data,
                product.source_active, product.catalog_metadata_status
       order by product.product_id`,
      [productIds],
    )
  ).rows;
  if (products.length !== productIds.length) {
    throw new Error(
      `source product reconciliation failed: expected ${productIds.length}, found ${products.length}`,
    );
  }

  const observations = (
    await client.query(
      `select product_id, id::text as source_observation_id
         from public.tcgcsv_source_price_daily_observations
        where last_seen_run_id = $1::uuid
          and observed_on = $2::date
          and product_id = any($3::integer[])
        order by product_id, subtype_name, id`,
      [sourceRunId, sourceRun.observed_on, productIds],
    )
  ).rows;
  const observedIds = new Set(
    observations.map((row) => row.source_observation_id),
  );
  const expectedIds = new Set(
    groupedGaps.flatMap((row) => row.supporting_gap_observation_ids),
  );
  if (
    expectedIds.size === 0 ||
    [...expectedIds].some((id) => !observedIds.has(id))
  ) {
    throw new Error("coverage gap observations do not reconcile to source run");
  }

  const productsById = new Map(
    products.map((row) => [Number(row.product_id), row]),
  );
  const sources = groupedGaps.map((gap) => {
    const product = productsById.get(gap.source_product_id);
    return {
      ...gap,
      source_product_name: product.source_product_name,
      source_group_id: Number(product.source_group_id),
      source_group_name: product.source_group_name,
      printed_number: numberField(product.extended_data),
      has_printed_number_evidence: Boolean(numberField(product.extended_data)),
      source_product_active: product.source_active === true,
      source_product_catalog_status: product.catalog_metadata_status,
      active_source_mapping_count: Number(
        product.active_source_mapping_count,
      ),
    };
  });
  return { sourceRun, sources };
}

async function loadDirectTargets(client, sources) {
  const embeddedIds = sources.map(
    (row) =>
      `tcgcsv:${row.source_group_id}:${row.source_product_id}`,
  );
  const rows = (
    await client.query(
      `select
         card.id::text as card_print_id,
         card.gv_id,
         card.set_id::text,
         card.set_code,
         card.name,
         card.number,
         card.variant_key,
         card.external_ids #>> '{new_set_release_ingestion_v1,external_id}'
           as embedded_external_id,
         count(distinct identity.id) filter (
           where identity.is_active = true
             and identity.identity_domain = 'pokemon_eng_standard'
         )::integer as active_standard_identity_count,
         count(distinct mapping.id) filter (
           where mapping.source = 'tcgplayer' and mapping.active = true
         )::integer as active_tcgplayer_mapping_count
       from public.card_prints card
       left join public.card_print_identity identity
         on identity.card_print_id = card.id
       left join public.external_mappings mapping
         on mapping.card_print_id = card.id
       where card.external_ids #>> '{new_set_release_ingestion_v1,external_id}'
         = any($1::text[])
       group by card.id, card.gv_id, card.set_id, card.set_code, card.name,
                card.number, card.variant_key, embedded_external_id
       order by embedded_external_id, card.id`,
      [embeddedIds],
    )
  ).rows;
  const result = new Map();
  for (const row of rows) {
    const productId = Number(row.embedded_external_id.split(":").at(-1));
    const targets = result.get(productId) ?? [];
    targets.push(row);
    result.set(productId, targets);
  }
  return result;
}

async function loadGroupConsensus(client, sources) {
  const groupIds = [...new Set(sources.map((row) => row.source_group_id))];
  const rows = (
    await client.query(
      `select
         product.group_id as source_group_id,
         count(distinct mapping.external_id)::integer
           as mapped_source_product_count,
         count(distinct card.set_id)::integer as set_count,
         min(card.set_id::text) as set_id,
         min(set_row.code) as set_code
       from public.tcgcsv_source_products product
       join public.external_mappings mapping
         on mapping.source = 'tcgplayer'
        and mapping.external_id = product.product_id::text
        and mapping.active = true
       join public.card_prints card on card.id = mapping.card_print_id
       join public.sets set_row on set_row.id = card.set_id
       where product.group_id = any($1::integer[])
       group by product.group_id
       order by product.group_id`,
      [groupIds],
    )
  ).rows;
  return new Map(rows.map((row) => [Number(row.source_group_id), row]));
}

async function resolveAuthorities(client, sources, consensusByGroup) {
  const sourceGroups = new Set(sources.map((row) => row.source_group_id));
  const applicable = REVIEWED_SET_AUTHORITIES.filter((authority) =>
    sourceGroups.has(authority.source_group_id),
  );
  const setCodes = applicable.map((authority) => authority.target_set_code);
  const setRows = setCodes.length
    ? (
        await client.query(
          `select id::text as set_id, code, name
             from public.sets
            where code = any($1::text[])
            order by code, id`,
          [setCodes],
        )
      ).rows
    : [];
  const setsByCode = new Map();
  for (const row of setRows) {
    const values = setsByCode.get(row.code) ?? [];
    values.push(row);
    setsByCode.set(row.code, values);
  }
  const authorities = new Map();
  for (const authority of applicable) {
    const matches = setsByCode.get(authority.target_set_code) ?? [];
    if (matches.length !== 1) {
      throw new Error(
        `reviewed set authority ${authority.target_set_code} resolved ${matches.length} rows`,
      );
    }
    authorities.set(authority.source_group_id, {
      ...authority,
      set_id: matches[0].set_id,
      set_code: matches[0].code,
    });
  }

  const targetSetIds = new Set(
    [...consensusByGroup.values()]
      .filter((row) => Number(row.set_count) === 1)
      .map((row) => row.set_id),
  );
  for (const authority of authorities.values()) {
    targetSetIds.add(authority.set_id);
  }
  return { authorities, targetSetIds: [...targetSetIds].sort() };
}

async function loadSetTargets(client, setIds) {
  if (setIds.length === 0) return [];
  return (
    await client.query(
      `select
         card.id::text as card_print_id,
         card.gv_id,
         card.set_id::text,
         card.set_code,
         card.name,
         card.number,
         card.variant_key,
         count(distinct identity.id) filter (
           where identity.is_active = true
             and identity.identity_domain = 'pokemon_eng_standard'
         )::integer as active_standard_identity_count,
         count(distinct mapping.id) filter (
           where mapping.source = 'tcgplayer' and mapping.active = true
         )::integer as active_tcgplayer_mapping_count
       from public.card_prints card
       left join public.card_print_identity identity
         on identity.card_print_id = card.id
       left join public.external_mappings mapping
         on mapping.card_print_id = card.id
       where card.set_id = any($1::uuid[])
       group by card.id, card.gv_id, card.set_id, card.set_code, card.name,
                card.number, card.variant_key
       order by card.set_id, card.number, card.name, card.id`,
      [setIds],
    )
  ).rows;
}

function markdown(summary) {
  const lines = [
    "# TCGPlayer Exact Mapping Plan V1",
    "",
    `- Status: \`${summary.status}\``,
    `- Source products reviewed: \`${summary.counts.source_products}\``,
    `- Exact candidates: \`${summary.counts.candidates}\``,
    `- Blocked: \`${summary.counts.blocked}\``,
    `- Covered gap rows projected: \`${summary.counts.projected_gap_rows}\``,
    `- Database writes: \`0\``,
    "",
    "## Candidate Lanes",
    "",
    ...Object.entries(summary.candidates_by_lane).map(
      ([lane, count]) => `- ${lane}: \`${count}\``,
    ),
    "",
    "## Blocked Reasons",
    "",
    ...Object.entries(summary.blocked_by_reason).map(
      ([reason, count]) => `- ${reason}: \`${count}\``,
    ),
    "",
    "## Boundary",
    "",
    "This artifact is a read-only plan. It does not insert, update, deactivate,",
    "or approve any canonical mapping. Every candidate requires one exact target,",
    "one active standard identity, no existing source mapping, no target mapping",
    "collision, and exact normalized name and collector-number evidence.",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) throw new Error("database URL is required");
  const [commitSha, branch, trackedWorktreeStatus] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain", "--untracked-files=no"]),
  ]);
  const gaps = await readJsonl(args.coverageGaps);
  if (
    gaps.length === 0 ||
    gaps.some(
      (row) =>
        row.policy_version !== "TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2",
    )
  ) {
    throw new Error("coverage artifact is empty or not V1.2");
  }
  const groupedGaps = groupGapRows(gaps);
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    application_name: "tcgplayer-market-exact-mapping-plan-v1",
  });
  await client.connect();
  try {
    await client.query("begin read only");
    await client.query("set local statement_timeout = '120s'");
    const { sourceRun, sources } = await loadSourceContext(
      client,
      args.sourceRunId,
      groupedGaps,
    );
    const [directTargetsByProduct, consensusByGroup] = await Promise.all([
      loadDirectTargets(client, sources),
      loadGroupConsensus(client, sources),
    ]);
    const { authorities, targetSetIds } = await resolveAuthorities(
      client,
      sources,
      consensusByGroup,
    );
    const setTargets = await loadSetTargets(client, targetSetIds);
    const results = quarantineTcgplayerTargetCollisionsV1(
      sources.map((source) =>
        planTcgplayerExactMappingCandidateV1({
          source,
          directTargets:
            directTargetsByProduct.get(source.source_product_id) ?? [],
          groupConsensus: consensusByGroup.get(source.source_group_id) ?? null,
          authority: authorities.get(source.source_group_id) ?? null,
          setTargets,
        }),
      ),
    );
    await client.query("rollback");

    const candidates = results.filter(
      (row) => row.disposition === "candidate",
    );
    const blocked = results.filter((row) => row.disposition === "blocked");
    const candidateSourceIds = new Set(
      candidates.map((row) => row.source_product_id),
    );
    const duplicateCandidateIds =
      candidateSourceIds.size !== candidates.length;
    const targetIds = candidates.map((row) => row.target.card_print_id);
    const duplicateTargetIds = new Set(targetIds).size !== targetIds.length;
    const fingerprints = candidates.map((row) => row.candidate_fingerprint);
    const duplicateFingerprints =
      new Set(fingerprints).size !== fingerprints.length;
    const findings = [];
    if (duplicateCandidateIds) findings.push("duplicate_candidate_source_id");
    if (duplicateTargetIds) findings.push("duplicate_candidate_target_id");
    if (duplicateFingerprints) findings.push("duplicate_candidate_fingerprint");
    if (candidates.some((row) => !row.target.gv_id)) {
      findings.push("candidate_missing_gv_id");
    }

    const summary = {
      planner_version: PLANNER_VERSION,
      policy_version: TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_1,
      status: findings.length === 0 ? "passed" : "failed",
      source_run: sourceRun,
      coverage_gaps_artifact: path
        .relative(REPO_ROOT, args.coverageGaps)
        .replace(/\\/g, "/"),
      counts: {
        coverage_gap_rows: gaps.length,
        missing_mapping_gap_rows: groupedGaps.reduce(
          (sum, row) => sum + row.supporting_gap_row_count,
          0,
        ),
        source_products: sources.length,
        candidates: candidates.length,
        blocked: blocked.length,
        projected_gap_rows: candidates.reduce(
          (sum, row) => sum + row.supporting_gap_row_count,
          0,
        ),
      },
      candidates_by_lane: countBy(candidates, "evidence_lane"),
      blocked_by_reason: countBy(blocked, "reason"),
      findings,
      boundaries: {
        database_reads_only: true,
        database_writes: false,
        mapping_writes: false,
        publication_writes: false,
        customer_state_writes: false,
      },
    };
    const outDir = path.join(args.outRoot, stamp());
    await fs.mkdir(outDir, { recursive: true });
    const runPlan = {
      planner_version: PLANNER_VERSION,
      policy_version: TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_1,
      mode: "read_only_dry_run",
      commit_sha: commitSha,
      branch,
      tracked_worktree_clean: !trackedWorktreeStatus,
      source_sync_run_id: args.sourceRunId,
      coverage_gaps_artifact: summary.coverage_gaps_artifact,
      reviewed_set_authorities: REVIEWED_SET_AUTHORITIES,
      boundaries: summary.boundaries,
    };
    const files = {
      "run_plan.json": `${JSON.stringify(runPlan, null, 2)}\n`,
      "summary.json": `${JSON.stringify(summary, null, 2)}\n`,
      "candidates.jsonl": jsonl(candidates),
      "blocked.jsonl": jsonl(blocked),
      "REPORT.md": markdown(summary),
    };
    const hashes = {};
    for (const [name, contents] of Object.entries(files)) {
      await fs.writeFile(path.join(outDir, name), contents);
      hashes[name] = sha256(contents);
    }
    await fs.writeFile(
      path.join(outDir, "artifact_hashes.json"),
      `${JSON.stringify(hashes, null, 2)}\n`,
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          ...summary,
          source_run: undefined,
          artifact_root: path.relative(REPO_ROOT, outDir).replace(/\\/g, "/"),
        },
        null,
        2,
      )}\n`,
    );
    if (summary.status !== "passed") process.exitCode = 1;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[tcgplayer-exact-mapping-plan] ${error.stack || error.message}`);
  process.exitCode = 1;
});
