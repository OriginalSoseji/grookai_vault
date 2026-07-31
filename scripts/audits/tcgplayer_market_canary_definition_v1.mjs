import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  TCGPLAYER_MARKET_CANARY_DEFINITION_SCHEMA_V1,
  TCGPLAYER_MARKET_CANARY_EXPECTED_COUNT_V1,
  validateTcgplayerMarketCanaryDefinitionV1,
} from "../../backend/pricing/tcgplayer_market_canary_definition_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const GENERATOR_VERSION = "TCGPLAYER_MARKET_CANARY_GENERATOR_V1";
const DEFAULT_OUT = path.join(
  REPO_ROOT,
  "backend",
  "pricing",
  "canaries",
  "tcgplayer_market_canary_100_v1.json",
);
const DEFAULT_REVIEW = path.join(
  REPO_ROOT,
  "docs",
  "audits",
  "pricing",
  "TCGPLAYER_MARKET_CANARY_100_V1_REVIEW.md",
);
const REQUIRED_REGRESSION_PRINTINGS = [
  "GV-PK-HP-101-HOLO",
  "GV-PK-AR-1-HOLO",
  "GV-PK-AR-1-RH",
  "GV-PK-ASC-276-HOLO",
];
const TARGETS = {
  finish: { holo: 30, reverse: 30, normal: 30 },
  era: { vintage: 20, middle: 25, modern: 40 },
  branch: { pokemon: 70, trainer: 20 },
  value_band: { low: 30, medium: 30, high: 30 },
  promo: { yes: 10 },
  multi_finish: { yes: 30 },
};
const WEIGHTS = {
  finish: 12,
  era: 10,
  branch: 8,
  value_band: 10,
  promo: 6,
  multi_finish: 5,
};

function parseArgs(argv) {
  const runKey = argv
    .find((arg) => arg.startsWith("--shadow-run-key="))
    ?.slice("--shadow-run-key=".length)
    .trim();
  const out = argv
    .find((arg) => arg.startsWith("--out="))
    ?.slice("--out=".length)
    .trim();
  const review = argv
    .find((arg) => arg.startsWith("--review="))
    ?.slice("--review=".length)
    .trim();
  if (!runKey) throw new Error("--shadow-run-key is required");
  return {
    runKey,
    out: path.resolve(out || DEFAULT_OUT),
    review: path.resolve(review || DEFAULT_REVIEW),
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

function era(releaseDate) {
  if (!releaseDate) return "middle";
  const date = new Date(releaseDate).toISOString().slice(0, 10);
  if (date < "2005-01-01") return "vintage";
  if (date >= "2016-01-01") return "modern";
  return "middle";
}

function branch(row) {
  const value = `${row.supertype ?? ""} ${row.card_category ?? ""}`.toLowerCase();
  return value.includes("trainer") ? "trainer" : "pokemon";
}

function valueBand(price) {
  if (price < 1) return "low";
  if (price < 20) return "medium";
  return "high";
}

function isPromo(row) {
  return /promo/i.test(
    `${row.set_name ?? ""} ${row.set_code ?? ""} ${row.source_group_name ?? ""}`,
  );
}

function classify(row) {
  return {
    ...row,
    market_price: Number(row.market_price),
    family_finish_count: Number(row.family_finish_count),
    finish: row.finish_key,
    era: era(row.release_date),
    branch: branch(row),
    value_band: valueBand(Number(row.market_price)),
    promo: isPromo(row) ? "yes" : "no",
    multi_finish: Number(row.family_finish_count) > 1 ? "yes" : "no",
  };
}

function emptyCounts() {
  return Object.fromEntries(
    Object.entries(TARGETS).map(([dimension, terms]) => [
      dimension,
      Object.fromEntries(Object.keys(terms).map((term) => [term, 0])),
    ]),
  );
}

function addCounts(counts, row) {
  for (const dimension of Object.keys(TARGETS)) {
    const term = row[dimension];
    if (Object.hasOwn(counts[dimension], term)) {
      counts[dimension][term] += 1;
    }
  }
}

function score(row, counts, setCounts, parentCounts) {
  let value = 0;
  for (const [dimension, terms] of Object.entries(TARGETS)) {
    const term = row[dimension];
    const target = terms[term];
    if (target && counts[dimension][term] < target) {
      const remaining = target - counts[dimension][term];
      value += WEIGHTS[dimension] * (remaining / target);
    }
  }
  value += Math.max(0, 2 - (setCounts.get(row.set_code) ?? 0)) * 0.75;
  value -= (parentCounts.get(row.card_print_id) ?? 0) * 2;
  return value;
}

function selectCanary(rows) {
  const candidates = [...rows].sort((left, right) =>
    left.printing_gv_id.localeCompare(right.printing_gv_id),
  );
  const selected = [];
  const selectedIds = new Set();
  const counts = emptyCounts();
  const setCounts = new Map();
  const parentCounts = new Map();

  function add(row, reason) {
    if (!row || selectedIds.has(row.card_printing_id)) return;
    selected.push({ ...row, selection_reason: reason });
    selectedIds.add(row.card_printing_id);
    addCounts(counts, row);
    setCounts.set(row.set_code, (setCounts.get(row.set_code) ?? 0) + 1);
    parentCounts.set(
      row.card_print_id,
      (parentCounts.get(row.card_print_id) ?? 0) + 1,
    );
  }

  for (const printingGvId of REQUIRED_REGRESSION_PRINTINGS) {
    const row = candidates.find(
      (candidate) => candidate.printing_gv_id === printingGvId,
    );
    if (!row) {
      throw new Error(`required regression printing missing: ${printingGvId}`);
    }
    add(row, "required_regression");
  }

  while (selected.length < TCGPLAYER_MARKET_CANARY_EXPECTED_COUNT_V1) {
    const available = candidates.filter((row) => {
      if (selectedIds.has(row.card_printing_id)) return false;
      if ((parentCounts.get(row.card_print_id) ?? 0) >= 2) return false;
      if ((setCounts.get(row.set_code) ?? 0) >= 5) return false;
      return true;
    });
    if (!available.length) throw new Error("canary candidate pool exhausted");
    available.sort((left, right) => {
      const delta =
        score(right, counts, setCounts, parentCounts) -
        score(left, counts, setCounts, parentCounts);
      return delta || left.printing_gv_id.localeCompare(right.printing_gv_id);
    });
    add(available[0], "stratified_greedy");
  }

  const deficits = [];
  for (const [dimension, terms] of Object.entries(TARGETS)) {
    for (const [term, target] of Object.entries(terms)) {
      if (counts[dimension][term] < target) {
        deficits.push(
          `${dimension}.${term}=${counts[dimension][term]} target=${target}`,
        );
      }
    }
  }
  if (deficits.length) {
    throw new Error(`stratification targets missed: ${deficits.join(", ")}`);
  }
  return { selected, counts };
}

async function loadRows(client, runKey) {
  const result = await client.query(
    `select
       run.id as shadow_run_id,
       run.source_sync_run_id,
       run.git_commit_sha as shadow_commit_sha,
       snapshot.id as snapshot_id,
       snapshot.provenance_id,
       snapshot.qualification_decision_id,
       snapshot.source_observation_id,
       snapshot.source_artifact_id,
       snapshot.source_artifact_hash,
       snapshot.source_row_hash,
       snapshot.source_price_row_identity,
       snapshot.source_mapping_id,
       snapshot.variant_assignment_id,
       decision.variant_assignment_version,
       snapshot.card_print_id,
       snapshot.card_printing_id,
       snapshot.gv_id,
       snapshot.printing_gv_id,
       snapshot.finish_key,
       snapshot.source_product_id,
       snapshot.source_subtype_name,
       snapshot.market_price,
       snapshot.currency,
       card.name as canonical_name,
       card.number as canonical_number,
       card.set_code,
       card.rarity,
       card.image_source as card_image_source,
       coalesce(
         printing.image_url,
         card.representative_image_url,
         card.image_url,
         product.image_url
       ) as image_url,
       coalesce(
         printing.image_source,
         card.image_source,
         'tcgcsv'
       ) as image_source,
       card.image_path,
       printing.image_path as printing_image_path,
       set_row.name as set_name,
       set_row.code as canonical_set_code,
       set_row.release_date,
       product.name as source_product_name,
       product.image_url as source_product_image_url,
       source_group.name as source_group_name,
       trait.supertype,
       trait.card_category,
       count(*) over (partition by snapshot.card_print_id) as family_finish_count
     from public.market_price_pipeline_runs run
     join public.market_price_publication_snapshots snapshot
       on snapshot.run_id = run.id
     join public.market_price_qualification_decisions decision
       on decision.id = snapshot.qualification_decision_id
     join public.card_prints card on card.id = snapshot.card_print_id
     join public.card_printings printing
       on printing.id = snapshot.card_printing_id
     left join public.sets set_row on set_row.id = card.set_id
     join public.tcgcsv_source_products product
       on product.product_id = snapshot.source_product_id
     left join public.tcgcsv_source_groups source_group
       on source_group.group_id = product.group_id
     left join lateral (
       select
         max(card_print_traits.supertype) as supertype,
         max(card_print_traits.card_category) as card_category
       from public.card_print_traits
       where card_print_traits.card_print_id = card.id
     ) trait on true
     where run.run_key = $1
       and run.state = 'shadow_verified'
       and run.reconciliation_state = 'reconciled'
       and snapshot.publication_state = 'published'
       and snapshot.market_price > 0
       and snapshot.currency = 'USD'
       and coalesce(
         printing.image_url,
         card.representative_image_url,
         card.image_url,
         product.image_url
       ) is not null
     order by snapshot.printing_gv_id`,
    [runKey],
  );
  if (!result.rowCount) {
    throw new Error(`no eligible snapshots found for ${runKey}`);
  }
  return result.rows.map(classify);
}

function buildDefinition(selected, counts) {
  const first = selected[0];
  return {
    schema_version: TCGPLAYER_MARKET_CANARY_DEFINITION_SCHEMA_V1,
    canary_id: "TCGPLAYER_MARKET_CANARY_100_V1",
    generator_version: GENERATOR_VERSION,
    source_shadow_run_id: first.shadow_run_id,
    source_shadow_run_key: first.source_shadow_run_key,
    source_sync_run_id: first.source_sync_run_id,
    source_shadow_commit_sha: first.shadow_commit_sha,
    expected_count: TCGPLAYER_MARKET_CANARY_EXPECTED_COUNT_V1,
    verification_status: "pending_visual_data_review",
    generated_at: new Date().toISOString(),
    stratification_targets: TARGETS,
    stratification_counts: counts,
    required_regression_printings: REQUIRED_REGRESSION_PRINTINGS,
    printings: selected.map((row, index) => ({
      ordinal: index + 1,
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      gv_id: row.gv_id,
      printing_gv_id: row.printing_gv_id,
      canonical_name: row.canonical_name,
      canonical_number: row.canonical_number,
      canonical_set_name: row.set_name,
      canonical_set_code: row.canonical_set_code ?? row.set_code,
      canonical_rarity: row.rarity,
      expected_language: "English",
      expected_finish: row.finish_key,
      source_product_id: Number(row.source_product_id),
      source_product_name: row.source_product_name,
      source_subtype_name: row.source_subtype_name,
      expected_publication_state: "publish",
      expected_headline_usd: row.market_price,
      expected_quarantine_reason: null,
      image_url: row.image_url,
      image_source: row.image_source,
      strata: {
        era: row.era,
        branch: row.branch,
        value_band: row.value_band,
        promo: row.promo === "yes",
        multi_finish_family: row.multi_finish === "yes",
        family_finish_count: row.family_finish_count,
      },
      selection_reason: row.selection_reason,
      provenance_verification: {
        status: "passed",
        source_snapshot_id: row.snapshot_id,
        provenance_id: row.provenance_id,
        qualification_decision_id: row.qualification_decision_id,
        source_observation_id: row.source_observation_id,
        source_artifact_id: row.source_artifact_id,
        source_artifact_hash: row.source_artifact_hash,
        source_row_hash: row.source_row_hash,
        source_price_row_identity: row.source_price_row_identity,
        source_mapping_id: row.source_mapping_id,
        variant_assignment_id: row.variant_assignment_id,
        variant_assignment_version: row.variant_assignment_version,
      },
      visual_data_verification: {
        status: "pending",
        canonical_identity_match: null,
        card_number_match: null,
        set_match: null,
        finish_data_match: null,
        source_market_price_match: null,
        notes: null,
      },
    })),
  };
}

function markdown(definition) {
  const lines = [
    "# TCGPlayer Market Canary 100 V1 Review",
    "",
    `- Canary: \`${definition.canary_id}\``,
    `- Shadow run: \`${definition.source_shadow_run_key}\``,
    `- Source run: \`${definition.source_sync_run_id}\``,
    `- Status: \`${definition.verification_status}\``,
    `- Printings: \`${definition.printings.length}\``,
    "",
    "This packet is review evidence only. It does not authorize activation.",
    "",
  ];
  for (const row of definition.printings) {
    lines.push(
      `## ${row.ordinal}. ${row.canonical_name} ${row.printing_gv_id}`,
      "",
      `![${row.canonical_name}](${row.image_url})`,
      "",
      `- Canonical: \`${row.gv_id}\`, ${row.canonical_set_name} #${row.canonical_number}`,
      `- Printing: \`${row.card_printing_id}\`, finish \`${row.expected_finish}\``,
      `- Source: TCGPlayer product \`${row.source_product_id}\` ${row.source_product_name}, subtype \`${row.source_subtype_name}\``,
      `- Expected TCGPlayer Market: \`$${row.expected_headline_usd.toFixed(2)}\``,
      `- Strata: \`${Object.entries(row.strata)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")}\``,
      `- Provenance: \`${row.provenance_verification.status}\``,
      `- Visual/data verification: \`${row.visual_data_verification.status}\``,
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) throw new Error("database URL is required");
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
  });
  await client.connect();
  try {
    const rows = await loadRows(client, args.runKey);
    for (const row of rows) row.source_shadow_run_key = args.runKey;
    const { selected, counts } = selectCanary(rows);
    const definition = buildDefinition(selected, counts);
    validateTcgplayerMarketCanaryDefinitionV1(definition, {
      requireVerified: false,
    });
    await fs.mkdir(path.dirname(args.out), { recursive: true });
    await fs.mkdir(path.dirname(args.review), { recursive: true });
    const json = `${JSON.stringify(definition, null, 2)}\n`;
    await fs.writeFile(args.out, json);
    await fs.writeFile(args.review, markdown(definition));
    const result = {
      generator_version: GENERATOR_VERSION,
      canary_id: definition.canary_id,
      source_shadow_run_key: args.runKey,
      eligible_pool_count: rows.length,
      selected_count: selected.length,
      verification_status: definition.verification_status,
      stratification_counts: counts,
      definition_path: path.relative(REPO_ROOT, args.out).replace(/\\/g, "/"),
      definition_sha256: sha256(json),
      review_path: path.relative(REPO_ROOT, args.review).replace(/\\/g, "/"),
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[tcgplayer-market-canary] ${error.stack || error.message}`);
  process.exitCode = 1;
});
