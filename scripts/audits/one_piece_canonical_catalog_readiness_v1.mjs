import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_CATEGORY_ID,
  reconcileOnePieceCatalogV1,
} from "../../backend/pricing/one_piece_canonical_catalog_candidate_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "ONE_PIECE_CANONICAL_CATALOG_READINESS_AUDIT_V1";

function parseArgs(argv) {
  const args = {
    asOfDate: new Date().toISOString().slice(0, 10),
    envFile: null,
    outDir: null,
  };
  for (const arg of argv) {
    if (arg.startsWith("--as-of-date=")) args.asOfDate = arg.slice(13);
    else if (arg.startsWith("--env-file=")) args.envFile = path.resolve(arg.slice(11));
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.asOfDate)) {
    throw new Error("--as-of-date must use YYYY-MM-DD");
  }
  return args;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function timestampSegment(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, "-");
}

function findEnvFile(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.DOTENV_CONFIG_PATH,
    path.join(ROOT, ".env.local"),
    "C:\\grookai_vault\\.env.local",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function safeSample(row) {
  return {
    product_id: row.source_product_id,
    group_id: row.source_group_id,
    group_name: row.source_group_name,
    product_name: row.source_product_name,
    classification: row.classification,
    promotion_state: row.promotion_state,
    single_card_kind: row.single_card_kind,
    number: row.card_evidence.number,
    card_type: row.card_evidence.card_type,
    reasons: row.classification_reasons,
  };
}

function distribution(rows, getter) {
  const counts = new Map();
  for (const row of rows) {
    for (const value of [].concat(getter(row) ?? []).filter(Boolean)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function report(summary) {
  const { source, classifications, integrity } = summary;
  const lines = [
    "# One Piece Canonical Catalog Ingestion Readiness V1",
    "",
    `- Audit: \`${summary.audit_version}\``,
    `- Recorded at: \`${summary.recorded_at}\``,
    `- Producer commit: \`${summary.repository.commit_sha}\``,
    `- Branch: \`${summary.repository.branch}\``,
    `- As-of date: \`${summary.as_of_date}\``,
    `- Result: **${summary.status.toUpperCase()}**`,
    `- Database writes: \`0\``,
    "",
    "## Read-Only Proof",
    "",
    `- Transaction read-only: \`${summary.read_only_proof.transaction_read_only}\``,
    `- Session default read-only: \`${summary.read_only_proof.default_transaction_read_only}\``,
    `- Database connection closed after rollback: \`${summary.read_only_proof.rolled_back_and_closed}\``,
    "",
    "## Warehouse Inventory",
    "",
    `- Category: \`${source.category_id}\` (${source.category_display_name})`,
    `- Source groups: \`${source.group_count}\``,
    `- Source products: \`${source.product_count}\``,
    `- Active source products: \`${source.active_product_count}\``,
    `- Products with image references: \`${source.product_image_reference_count}\``,
    `- Latest market observation: \`${source.latest_observed_on}\``,
    `- Latest source price lanes: \`${source.latest_price_lane_count}\``,
    `- Latest priced products: \`${source.latest_priced_product_count}\``,
    "",
    "## Classification",
    "",
    `- Exact single-card candidates: \`${classifications.exact_single_card_candidates}\``,
    `- Numbered card candidates: \`${classifications.numbered_card_candidates}\``,
    `- DON!! card candidates: \`${classifications.don_card_candidates}\``,
    `- Sealed-product candidates: \`${classifications.sealed_product_candidates}\``,
    `- Ambiguous/quarantined rows: \`${classifications.ambiguous_quarantined}\``,
    `- Current single-card candidates: \`${classifications.current_single_candidates}\``,
    `- Future/presale holds: \`${classifications.future_or_presale_holds}\``,
    `- Inactive-source holds: \`${classifications.inactive_source_holds}\``,
    `- Source price lanes across all products: \`${classifications.source_price_lanes}\``,
    `- Exact single-card source price lanes: \`${classifications.exact_single_source_price_lanes}\``,
    "",
    "Missing Number was never used as a sealed classifier. Structured DON!! rows remain single-card candidates. Starter-deck singles and their sealed deck/display products remain separate identities.",
    "",
    "## Integrity",
    "",
    `- Manifest rows: \`${integrity.manifest_row_count}\``,
    `- Source products preserved exactly once: \`${integrity.every_source_product_preserved_once}\``,
    `- Duplicate product IDs: \`${integrity.duplicate_source_product_id_count}\``,
    `- Source price-lane collisions: \`${integrity.source_price_lane_collision_count}\``,
    `- Publishable rows: \`${integrity.publishable_row_count}\``,
    `- Canonical-write-authorized rows: \`${integrity.canonical_write_authorized_row_count}\``,
    `- Logical manifest SHA-256: \`${summary.manifest.logical_sha256}\``,
    `- Compressed manifest bytes: \`${summary.manifest.compressed_bytes}\``,
    "",
    "## Decision",
    "",
    "The One Piece warehouse is sufficient to produce a complete source-preserving readiness manifest. Exact candidates, sealed candidates, and quarantined rows are separated without mutating canonical data. Source presence does not authorize publication.",
    "",
    "Exact next gate: design a service-only immutable staging schema and generate a one-group rollback canary plan from this exact manifest fingerprint. Keep One Piece hidden and stop before durable canonical apply.",
    "",
    "## Boundaries",
    "",
    "- No database write, migration, Storage operation, network image acquisition, image repoint, release-control change, app visibility, pricing publication, Vault write, or deployment occurred.",
    "- No sealed product became a card-print candidate.",
    "- No future or presale row became current-promotion eligible.",
    "- No active MTG ingestion file, process, or worktree was touched.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function readProductionSource(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "one-piece-catalog-readiness-v1",
  });
  await client.connect();
  let transactionStarted = false;
  let rolledBack = false;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction read only");
    transactionStarted = true;
    await client.query("set local statement_timeout = '180s'");
    const transactionProof = await client.query("show transaction_read_only");
    const sessionProof = await client.query("show default_transaction_read_only");
    const userProof = await client.query("select current_user as database_user");
    const transactionReadOnly = transactionProof.rows[0]?.transaction_read_only;
    const defaultReadOnly = sessionProof.rows[0]?.default_transaction_read_only;
    if (transactionReadOnly !== "on" || defaultReadOnly !== "on") {
      throw new Error("Could not prove read-only session and transaction state");
    }

    const categoryResult = await client.query(
      `select category_id, name, display_name, source_active, last_seen_at
       from public.tcgcsv_source_categories
       where category_id = $1`,
      [ONE_PIECE_CATEGORY_ID],
    );
    if (categoryResult.rows.length !== 1) {
      throw new Error(`TCGCSV category ${ONE_PIECE_CATEGORY_ID} was not found`);
    }

    const groupsResult = await client.query(
      `select group_id, category_id, name, abbreviation, published_on,
              is_supplemental, source_active, catalog_metadata_status,
              payload_hash, last_seen_at
       from public.tcgcsv_source_groups
       where category_id = $1
       order by group_id`,
      [ONE_PIECE_CATEGORY_ID],
    );
    const productsResult = await client.query(
      `select product_id, category_id, group_id, name, clean_name, image_url,
              source_url, source_modified_on, image_count, presale_info,
              extended_data, payload_hash, source_active,
              catalog_metadata_status, first_seen_at, last_seen_at
       from public.tcgcsv_source_products
       where category_id = $1
       order by product_id`,
      [ONE_PIECE_CATEGORY_ID],
    );
    const latestDayResult = await client.query(
      `select max(observed_on) as observed_on
       from public.tcgcsv_source_price_daily_observations
       where category_id = $1`,
      [ONE_PIECE_CATEGORY_ID],
    );
    const latestObservedOn = latestDayResult.rows[0]?.observed_on ?? null;
    const pricesResult = latestObservedOn
      ? await client.query(
          `select source_price_row_identity, product_id, subtype_name,
                  subtype_name_normalized, observed_on, market_price
           from public.tcgcsv_source_price_daily_observations
           where category_id = $1 and observed_on = $2
           order by product_id, subtype_name_normalized, source_price_row_identity`,
          [ONE_PIECE_CATEGORY_ID, latestObservedOn],
        )
      : { rows: [] };

    await client.query("rollback");
    rolledBack = true;
    transactionStarted = false;
    return {
      proof: {
        transaction_read_only: transactionReadOnly,
        default_transaction_read_only: defaultReadOnly,
        database_user: userProof.rows[0]?.database_user ?? null,
      },
      category: categoryResult.rows[0],
      groups: groupsResult.rows,
      products: productsResult.rows,
      latest_observed_on: latestObservedOn,
      latest_prices: pricesResult.rows,
    };
  } finally {
    if (transactionStarted) {
      try {
        await client.query("rollback");
        rolledBack = true;
      } catch {
        // Preserve the original failure.
      }
    }
    await client.end();
    if (!rolledBack) throw new Error("Read-only production transaction did not roll back");
  }
}

function attachGroupAndPrices(source) {
  const groups = new Map(source.groups.map((row) => [Number(row.group_id), row]));
  const prices = new Map();
  for (const row of source.latest_prices) {
    const productId = Number(row.product_id);
    const lanes = prices.get(productId) ?? [];
    lanes.push(row);
    prices.set(productId, lanes);
  }
  return source.products.map((product) => {
    const group = groups.get(Number(product.group_id)) ?? {};
    return {
      ...product,
      group_name: group.name ?? null,
      published_on: group.published_on ?? null,
      source_price_lanes: prices.get(Number(product.product_id)) ?? [],
    };
  });
}

export function buildOnePieceReadinessArtifactsV1(source, options = {}) {
  const reconciliation = reconcileOnePieceCatalogV1(attachGroupAndPrices(source), {
    asOfDate: options.asOfDate,
  });
  const sourceProducts = new Map(
    source.products.map((row) => [Number(row.product_id), row]),
  );
  const rows = reconciliation.rows.map((row) => {
    const sourceProduct = sourceProducts.get(row.source_product_id);
    return {
      ...row,
      source_payload_hash: sourceProduct?.payload_hash ?? null,
      source_catalog_metadata_status: sourceProduct?.catalog_metadata_status ?? null,
      source_first_seen_at: sourceProduct?.first_seen_at ?? null,
      source_last_seen_at: sourceProduct?.last_seen_at ?? null,
    };
  });
  const manifestBody = `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  const manifestBuffer = Buffer.from(manifestBody, "utf8");
  const compressed = gzipSync(manifestBuffer, { level: 9, mtime: 0 });
  return {
    reconciliation,
    rows,
    manifestBody,
    compressed,
    manifest: {
      format: "jsonl+gzip",
      row_count: rows.length,
      logical_bytes: manifestBuffer.byteLength,
      compressed_bytes: compressed.byteLength,
      logical_sha256: sha256(manifestBuffer),
      compressed_sha256: sha256(compressed),
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const commitSha = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const recordedAt = new Date().toISOString();
  const outDir =
    args.outDir ??
    path.join(
      ROOT,
      "docs",
      "audits",
      "pricing",
      "one_piece_canonical_catalog_readiness_v1",
      timestampSegment(new Date()),
    );
  await fs.mkdir(outDir, { recursive: true });

  const runPlan = {
    audit_version: VERSION,
    recorded_at: recordedAt,
    producer_commit_sha: commitSha,
    branch,
    as_of_date: args.asOfDate,
    source: {
      provider: "tcgcsv_tcgplayer",
      category_id: ONE_PIECE_CATEGORY_ID,
      tables: [
        "tcgcsv_source_categories",
        "tcgcsv_source_groups",
        "tcgcsv_source_products",
        "tcgcsv_source_price_daily_observations",
      ],
    },
    mode: "production_read_only_inventory_and_local_planning",
    boundaries: {
      database_writes: false,
      migrations: false,
      canonical_rows: false,
      sealed_rows: false,
      storage_or_network_acquisition: false,
      image_repoints: false,
      release_control_changes: false,
      app_visibility: false,
      pricing_publication: false,
      vault_writes: false,
      deployments: false,
      active_mtg_ingestion_changes: false,
    },
  };
  const runPlanBody = await writeJson(path.join(outDir, "run_plan.json"), runPlan);

  const envFile = findEnvFile(args.envFile);
  if (!envFile) throw new Error("A local env file containing the database URL is required");
  dotenv.config({ path: envFile, quiet: true });
  const connectionString =
    process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required");

  const source = await readProductionSource(connectionString);
  source.proof.rolled_back_and_closed = true;
  const built = buildOnePieceReadinessArtifactsV1(source, { asOfDate: args.asOfDate });
  const duplicateCount = built.reconciliation.duplicate_source_product_ids.length;
  const collisionCount = built.reconciliation.source_price_lane_collisions.length;
  const sourceProductIds = source.products.map((row) => Number(row.product_id));
  const manifestProductIds = built.rows.map((row) => row.source_product_id);
  const uniqueManifestIds = new Set(manifestProductIds);
  const everySourceProductPreservedOnce =
    sourceProductIds.length === built.rows.length &&
    uniqueManifestIds.size === built.rows.length &&
    sourceProductIds.every((productId) => uniqueManifestIds.has(productId));
  const publishableCount = built.rows.filter((row) => row.publishable).length;
  const writeAuthorizedCount = built.rows.filter(
    (row) => row.canonical_write_authorized || row.sealed_write_authorized,
  ).length;
  const status =
    everySourceProductPreservedOnce &&
    duplicateCount === 0 &&
    collisionCount === 0 &&
    publishableCount === 0 &&
    writeAuthorizedCount === 0
      ? "ready_for_service_only_staging_design"
      : "blocked";

  const classifications = built.reconciliation.counts;
  const summary = {
    audit_version: VERSION,
    recorded_at: recordedAt,
    repository: { commit_sha: commitSha, branch },
    as_of_date: args.asOfDate,
    status,
    read_only_proof: source.proof,
    source: {
      category_id: Number(source.category.category_id),
      category_name: source.category.name,
      category_display_name: source.category.display_name,
      category_source_active: source.category.source_active,
      category_last_seen_at: source.category.last_seen_at,
      group_count: source.groups.length,
      active_group_count: source.groups.filter((row) => row.source_active).length,
      product_count: source.products.length,
      active_product_count: source.products.filter((row) => row.source_active).length,
      product_image_reference_count: source.products.filter(
        (row) => String(row.image_url ?? "").trim(),
      ).length,
      latest_observed_on: source.latest_observed_on,
      latest_price_lane_count: source.latest_prices.length,
      latest_priced_product_count: new Set(
        source.latest_prices.map((row) => Number(row.product_id)),
      ).size,
    },
    classifications,
    distributions: {
      classification_reasons: distribution(
        built.rows,
        (row) => row.classification_reasons,
      ),
      card_number_formats: distribution(
        built.rows,
        (row) => row.card_evidence.number_format,
      ),
      treatment_claims: distribution(
        built.rows,
        (row) => row.product_signals.treatments,
      ),
      sealed_signals: distribution(built.rows, (row) => row.product_signals.sealed),
      source_price_subtypes: distribution(
        built.rows,
        (row) => row.source_price_lanes.map((lane) => lane.subtype_name_normalized),
      ),
    },
    samples: {
      exact_numbered: built.rows
        .filter((row) => row.single_card_kind === "numbered_card")
        .slice(0, 5)
        .map(safeSample),
      exact_don: built.rows
        .filter((row) => row.single_card_kind === "don_card")
        .slice(0, 5)
        .map(safeSample),
      sealed: built.rows
        .filter((row) => row.classification === "sealed_product_candidate")
        .slice(0, 5)
        .map(safeSample),
      ambiguous: built.rows
        .filter((row) => row.classification === "ambiguous_quarantine")
        .slice(0, 5)
        .map(safeSample),
      future_or_presale: built.rows
        .filter((row) => row.promotion_state === "future_or_presale_hold")
        .slice(0, 5)
        .map(safeSample),
    },
    integrity: {
      manifest_row_count: built.rows.length,
      every_source_product_preserved_once: everySourceProductPreservedOnce,
      duplicate_source_product_id_count: duplicateCount,
      source_price_lane_collision_count: collisionCount,
      publishable_row_count: publishableCount,
      canonical_write_authorized_row_count: writeAuthorizedCount,
    },
    manifest: {
      file: "source_product_manifest.jsonl.gz",
      fingerprint: built.manifest.logical_sha256,
      ...built.manifest,
    },
    boundaries: runPlan.boundaries,
    exact_next_gate:
      "service-only immutable staging schema plus one-group rollback canary plan from this exact manifest fingerprint; no durable canonical apply",
  };

  await fs.writeFile(
    path.join(outDir, "source_product_manifest.jsonl.gz"),
    built.compressed,
  );
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), summary);
  const reportBody = report(summary);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  const hashes = {
    hash_algorithm: "sha256",
    producer_commit_sha: commitSha,
    artifacts: {
      "run_plan.json": { sha256: sha256(runPlanBody), bytes: Buffer.byteLength(runPlanBody) },
      "summary.json": { sha256: sha256(summaryBody), bytes: Buffer.byteLength(summaryBody) },
      "REPORT.md": { sha256: sha256(reportBody), bytes: Buffer.byteLength(reportBody) },
      "source_product_manifest.jsonl.gz": {
        sha256: built.manifest.compressed_sha256,
        bytes: built.manifest.compressed_bytes,
        logical_sha256: built.manifest.logical_sha256,
        logical_bytes: built.manifest.logical_bytes,
        row_count: built.manifest.row_count,
      },
    },
  };
  await writeJson(path.join(outDir, "artifact_hashes.json"), hashes);
  process.stdout.write(
    `${JSON.stringify({
      out_dir: outDir,
      status,
      manifest_fingerprint: built.manifest.logical_sha256,
      counts: classifications,
    })}\n`,
  );
  if (status === "blocked") process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
