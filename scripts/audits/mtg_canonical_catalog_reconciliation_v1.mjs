import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { buildMtgCanonicalCandidateV1 } from "../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_RECONCILIATION_V1";
const USER_AGENT = "GrookaiVault-MTG-Reconciliation/1.0 (support@grookai.com)";

function parseArgs(argv) {
  const args = {
    warehouseProducts: null,
    bulkFile: path.join(ROOT, ".tmp", "scryfall-default-cards.jsonl.gz"),
    metadataFile: null,
    outDir: null,
  };
  for (const arg of argv) {
    if (arg.startsWith("--warehouse-products=")) {
      args.warehouseProducts = path.resolve(arg.slice("--warehouse-products=".length));
    } else if (arg.startsWith("--bulk-file=")) {
      args.bulkFile = path.resolve(arg.slice("--bulk-file=".length));
    } else if (arg.startsWith("--metadata-file=")) {
      args.metadataFile = path.resolve(arg.slice("--metadata-file=".length));
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice("--out-dir=".length));
    }
  }
  if (!args.warehouseProducts) {
    throw new Error("--warehouse-products=<jsonl> is required");
  }
  return args;
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function sortedDistribution(map) {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

function timestampSegment(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function loadWarehouseProducts(file) {
  const products = new Map();
  const input = createReadStream(file, "utf8");
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    const productId = Number(row.product_id);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error(`Invalid warehouse product_id: ${row.product_id}`);
    }
    if (products.has(productId)) {
      throw new Error(`Duplicate warehouse product_id: ${productId}`);
    }
    products.set(productId, {
      product_id: productId,
      group_id: Number(row.group_id) || null,
      name: String(row.name ?? "").trim() || null,
      subtypes: [...new Set((row.subtypes ?? []).map((value) => String(value).trim().toLowerCase()).filter(Boolean))].sort(),
      positive_market_subtypes: [
        ...new Set(
          (row.positive_market_subtypes ?? [])
            .map((value) => String(value).trim().toLowerCase())
            .filter(Boolean),
        ),
      ].sort(),
    });
  }
  return products;
}

async function fetchBulkMetadata() {
  const response = await fetch("https://api.scryfall.com/bulk-data", {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`Scryfall bulk metadata failed: HTTP ${response.status}`);
  const payload = await response.json();
  const metadata = payload?.data?.find((entry) => entry.type === "default_cards");
  if (!metadata?.jsonl_download_uri) {
    throw new Error("Scryfall default_cards JSONL bulk metadata is unavailable");
  }
  return metadata;
}

async function loadBulkMetadata(file) {
  if (!file) return fetchBulkMetadata();
  const payload = JSON.parse(await fs.readFile(file, "utf8"));
  const metadata = Array.isArray(payload?.data)
    ? payload.data.find((entry) => entry.type === "default_cards")
    : payload;
  if (metadata?.type !== "default_cards" || !metadata?.jsonl_download_uri) {
    throw new Error("Pinned metadata file does not contain Scryfall default_cards JSONL metadata");
  }
  return metadata;
}

async function ensureBulkFile(file, metadata) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    const stat = await fs.stat(file);
    if (stat.size > 0) return { downloaded: false, byte_size: stat.size };
  } catch {
    // Download below.
  }
  const temp = `${file}.partial`;
  const response = await fetch(metadata.jsonl_download_uri, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/gzip,application/octet-stream;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok || !response.body) {
    throw new Error(`Scryfall bulk download failed: HTTP ${response.status}`);
  }
  await pipeline(Readable.fromWeb(response.body), (await import("node:fs")).createWriteStream(temp));
  await fs.rename(temp, file);
  const stat = await fs.stat(file);
  return { downloaded: true, byte_size: stat.size };
}

function expectedSourceSubtypes(link) {
  return [...new Set(link.expected_source_subtypes ?? [])].sort();
}

async function reconcileBulk(file, warehouseProducts) {
  const counts = {
    bulk_card_count: 0,
    eligible_candidate_count: 0,
    candidate_with_image_count: 0,
    candidate_without_tcgplayer_link_count: 0,
    planned_card_printing_count: 0,
  };
  const exclusionReasons = new Map();
  const sets = new Map();
  const finishes = new Map();
  const finishCombinations = new Map();
  const setTypes = new Map();
  const layouts = new Map();
  const treatmentSignals = new Map();
  const linkOwners = new Map();
  const samples = [];
  const candidatePayloadHash = createHash("sha256");
  const exactMappingPlanHash = createHash("sha256");

  const input = createReadStream(file).pipe(createGunzip());
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    counts.bulk_card_count += 1;
    const card = JSON.parse(line);
    const candidate = buildMtgCanonicalCandidateV1(card);
    if (candidate.status !== "candidate") {
      for (const reason of candidate.exclusion_reasons) increment(exclusionReasons, reason);
      continue;
    }

    counts.eligible_candidate_count += 1;
    candidatePayloadHash.update(`${JSON.stringify(candidate)}\n`);
    counts.planned_card_printing_count += candidate.printing_finishes.length;
    if (candidate.source_images.length > 0) counts.candidate_with_image_count += 1;
    if (candidate.exact_source_links.length === 0) {
      counts.candidate_without_tcgplayer_link_count += 1;
    }
    if (samples.length < 20) samples.push(candidate);

    sets.set(candidate.set.source_set_id, candidate.set);
    increment(setTypes, candidate.set.set_type ?? "unknown");
    increment(layouts, candidate.card.layout ?? "unknown");
    for (const finish of candidate.printing_finishes) increment(finishes, finish);
    increment(finishCombinations, candidate.printing_finishes.join("+") || "none");
    for (const effect of candidate.identity_payload.frame_effects) increment(treatmentSignals, `frame_effect:${effect}`);
    if (candidate.identity_payload.full_art) increment(treatmentSignals, "full_art");
    if (candidate.identity_payload.textless) increment(treatmentSignals, "textless");
    if (candidate.identity_payload.promo) increment(treatmentSignals, "promo");
    if (candidate.identity_payload.variation) increment(treatmentSignals, "variation");

    for (const link of candidate.exact_source_links) {
      exactMappingPlanHash.update(
        `${JSON.stringify({
          source_print_id: candidate.card.source_print_id,
          product_id: link.product_id,
          source_role: link.source_role,
          expected_source_subtypes: link.expected_source_subtypes,
        })}\n`,
      );
      const sourceSubtypes = expectedSourceSubtypes(link);
      if (sourceSubtypes.length === 0) {
        const identity = `${link.product_id}:etched`;
        const owners = linkOwners.get(identity) ?? [];
        owners.push({
          source_print_id: candidate.card.source_print_id,
          source_role: link.source_role,
          source_subtype: "etched",
          name: candidate.card.name,
          set_code: candidate.set.code,
          collector_number: candidate.card.collector_number,
          variation: candidate.identity_payload.variation,
          variation_of: candidate.identity_payload.variation_of,
        });
        linkOwners.set(identity, owners);
      }
      for (const sourceSubtype of sourceSubtypes) {
        const identity = `${link.product_id}:${sourceSubtype}`;
        const owners = linkOwners.get(identity) ?? [];
        owners.push({
          source_print_id: candidate.card.source_print_id,
          source_role: link.source_role,
          source_subtype: sourceSubtype,
          name: candidate.card.name,
          set_code: candidate.set.code,
          collector_number: candidate.card.collector_number,
          variation: candidate.identity_payload.variation,
          variation_of: candidate.identity_payload.variation_of,
        });
        linkOwners.set(identity, owners);
      }
    }
  }

  let exactStandardPriceLaneCount = 0;
  let exactPositiveMarketPriceLaneCount = 0;
  let exactEtchedProductCount = 0;
  const warehouseExactProductIds = new Set();
  const warehouseMissingProductIds = new Set();
  const collisions = [];
  const missingProducts = [];
  const exactProductIds = new Set();
  for (const [sourcePriceIdentity, owners] of linkOwners.entries()) {
    const [productIdText, sourceSubtype] = sourcePriceIdentity.split(":");
    const productId = Number(productIdText);
    exactProductIds.add(productId);
    const distinctPrints = new Set(owners.map((owner) => owner.source_print_id));
    if (distinctPrints.size !== 1) {
      collisions.push({
        source_price_row_identity: sourcePriceIdentity,
        product_id: productId,
        source_subtype: sourceSubtype,
        source_print_ids: [...distinctPrints].sort(),
        owners: owners.sort((left, right) =>
          left.source_print_id.localeCompare(right.source_print_id),
        ),
      });
    }
    const warehouse = warehouseProducts.get(productId);
    if (!warehouse) {
      warehouseMissingProductIds.add(productId);
      if (missingProducts.length < 100) missingProducts.push({ product_id: productId, owners });
      continue;
    }
    warehouseExactProductIds.add(productId);
    if (sourceSubtype === "etched") exactEtchedProductCount += 1;
    else if (warehouse.subtypes.includes(sourceSubtype)) {
      exactStandardPriceLaneCount += 1;
      if (warehouse.positive_market_subtypes.includes(sourceSubtype)) {
        exactPositiveMarketPriceLaneCount += 1;
      }
    }
  }

  const linkedWarehouseIds = new Set(
    [...exactProductIds].filter((productId) => warehouseProducts.has(productId)),
  );
  return {
    ...counts,
    canonical_set_candidate_count: sets.size,
    warehouse_product_count: warehouseProducts.size,
    exact_tcgplayer_product_link_count: exactProductIds.size,
    exact_tcgplayer_price_lane_link_count: linkOwners.size,
    warehouse_exact_product_count: warehouseExactProductIds.size,
    warehouse_missing_product_count: warehouseMissingProductIds.size,
    warehouse_unlinked_product_count: warehouseProducts.size - linkedWarehouseIds.size,
    exact_standard_price_lane_count: exactStandardPriceLaneCount,
    exact_positive_market_price_lane_count: exactPositiveMarketPriceLaneCount,
    warehouse_missing_or_unsupported_price_lane_count:
      linkOwners.size - exactStandardPriceLaneCount,
    exact_etched_product_count: exactEtchedProductCount,
    exact_product_collision_count: collisions.length,
    exclusions: sortedDistribution(exclusionReasons),
    finishes: sortedDistribution(finishes),
    finish_combinations: sortedDistribution(finishCombinations),
    set_types: sortedDistribution(setTypes),
    layouts: sortedDistribution(layouts),
    treatment_signals: sortedDistribution(treatmentSignals),
    collision_samples: collisions.slice(0, 100),
    missing_product_samples: missingProducts,
    candidate_samples: samples,
    candidate_payload_sha256: candidatePayloadHash.digest("hex"),
    exact_mapping_plan_sha256: exactMappingPlanHash.digest("hex"),
    publishable: false,
  };
}

function report(summary) {
  const r = summary.reconciliation;
  return `# MTG Canonical Catalog Reconciliation V1

- Recorded at: \`${summary.recorded_at}\`
- Result: **${r.exact_product_collision_count === 0 ? "DRY-RUN COMPLETE" : "COLLISIONS REQUIRE REVIEW"}**
- Database writes: \`0\`
- Scryfall bulk SHA-256: \`${summary.source_bulk.sha256}\`

## Candidate Catalog

- Bulk card objects: \`${r.bulk_card_count}\`
- English paper print candidates: \`${r.eligible_candidate_count}\`
- Canonical set candidates: \`${r.canonical_set_candidate_count}\`
- Planned printing-finish rows: \`${r.planned_card_printing_count}\`
- Candidates with source image references: \`${r.candidate_with_image_count}\`
- Candidates without a TCGPlayer product ID: \`${r.candidate_without_tcgplayer_link_count}\`

## Exact TCGPlayer Crosswalk

- Production Magic products: \`${r.warehouse_product_count}\`
- Scryfall exact product IDs: \`${r.exact_tcgplayer_product_link_count}\`
- Scryfall exact product/subtype lanes: \`${r.exact_tcgplayer_price_lane_link_count}\`
- Exact IDs present in the warehouse: \`${r.warehouse_exact_product_count}\`
- Exact IDs absent from the warehouse: \`${r.warehouse_missing_product_count}\`
- Warehouse products not linked by the candidate catalog: \`${r.warehouse_unlinked_product_count}\`
- Exact supported Normal/Foil price lanes: \`${r.exact_standard_price_lane_count}\`
- Exact positive Normal/Foil marketPrice lanes: \`${r.exact_positive_market_price_lane_count}\`
- Missing or unsupported source price lanes: \`${r.warehouse_missing_or_unsupported_price_lane_count}\`
- Etched product links preserved but excluded from V1: \`${r.exact_etched_product_count}\`
- Product ownership collisions: \`${r.exact_product_collision_count}\`
- Candidate payload SHA-256: \`${r.candidate_payload_sha256}\`
- Exact mapping plan SHA-256: \`${r.exact_mapping_plan_sha256}\`

## Decision

This output is a deterministic import and crosswalk dry-run. It does not authorize canonical writes, Storage writes, image repoints, exact mapping writes, or pricing publication. Missing and unlinked products remain preserved source evidence.
`;
}

function migrationRequirements(summary) {
  return {
    requirements_version: "MTG_CANONICAL_CATALOG_SCHEMA_REQUIREMENTS_V1",
    generated_from_candidate_payload_sha256:
      summary.reconciliation.candidate_payload_sha256,
    required_changes: [
      {
        object: "public.games",
        action: "insert_one",
        values: { code: "mtg", name: "Magic: The Gathering", slug: "mtg" },
      },
      {
        object: "public.card_print_identity",
        action: "extend_identity_domain_check",
        add_value: "mtg_eng_paper_print",
      },
      {
        object: "public.finish_keys",
        action: "insert_idempotent",
        values: [
          { key: "foil", label: "Foil" },
          { key: "etched", label: "Etched Foil" },
        ],
        publication_scope: { normal: "v1", foil: "v1", etched: "deferred" },
      },
      {
        object: "public.card_prints.card_prints_image_source_check",
        action: "extend_check",
        add_value: "scryfall",
      },
      {
        object: "public.card_prints",
        action: "use_existing_columns_with_mtg_identity_rules",
        rules: {
          number: "exact Scryfall collector_number token",
          number_plain: "derived compatibility only; never MTG identity authority",
          variant_key: "scryfall:<source print UUID>",
          print_identity_key: "scryfall:<source print UUID>",
          gv_id: "GV-MTG-SF-<source print UUID>",
          tcgplayer_id: "null; product IDs may span finish-specific parents",
        },
      },
      {
        object: "public.card_printings",
        action: "insert_finish_children",
        rules: {
          printing_gv_id: "<parent gv_id>-<NORMAL|FOIL|ETCHED>",
          provenance_source: "scryfall",
          publication_scope: "normal and foil only for MTG V1",
        },
      },
      {
        object: "public.external_mappings",
        action: "insert_parent_source_identity",
        rules: { source: "scryfall", external_id: "source print UUID" },
      },
      {
        object: "public.external_printing_mappings",
        action: "insert_exact_market_lane_identity",
        rules: {
          source: "tcgplayer_market",
          external_id: "<product_id>:<normal|foil>",
          collision_policy: "quarantine; never choose one owner",
        },
      },
    ],
    forbidden_changes: [
      "no mutation of Pokemon games, sets, cards, identities, mappings, or prices",
      "no use of card_prints.tcgplayer_id as MTG exact printing authority",
      "no name-only or collector-number-only mapping",
      "no image pointer before self-hosted upload hash and readback",
      "no etched price publication in V1",
      "no delete, truncate, cleanup, or quarantine removal",
    ],
    existing_schema_reused: [
      "public.sets unique (game, code)",
      "public.card_prints game_id and set_id",
      "public.card_print_identity identity_payload",
      "public.card_printings unique (card_print_id, finish_key)",
      "public.external_mappings unique (source, external_id)",
      "public.external_printing_mappings unique (source, external_id)",
      "MEE qualification, immutable publication, provenance, rollback, and read model",
    ],
    approval_state: "not_authorized_for_apply",
  };
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const metadata = await loadBulkMetadata(args.metadataFile);
  const bulkState = await ensureBulkFile(args.bulkFile, metadata);
  const [warehouseProducts, bulkHash] = await Promise.all([
    loadWarehouseProducts(args.warehouseProducts),
    fileSha256(args.bulkFile),
  ]);
  const reconciliation = await reconcileBulk(args.bulkFile, warehouseProducts);
  const recordedAt = new Date().toISOString();
  const outDir =
    args.outDir ??
    path.join(ROOT, "docs", "audits", "pricing", "mtg_canonical_catalog_reconciliation_v1", timestampSegment());
  await fs.mkdir(outDir, { recursive: true });
  const summary = {
    reconciliation_version: VERSION,
    recorded_at: recordedAt,
    source_bulk: {
      type: metadata.type,
      name: metadata.name,
      updated_at: metadata.updated_at,
      uri: metadata.uri,
      jsonl_download_uri: metadata.jsonl_download_uri,
      compressed_size: metadata.compressed_size,
      local_byte_size: bulkState.byte_size,
      downloaded_by_this_run: bulkState.downloaded,
      sha256: bulkHash,
    },
    warehouse_snapshot: {
      row_count: warehouseProducts.size,
      sha256: await fileSha256(args.warehouseProducts),
    },
    reconciliation,
    boundaries: {
      database_writes: false,
      storage_writes: false,
      canonical_import: false,
      exact_mapping_apply: false,
      price_publication: false,
    },
  };
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), summary);
  const reportBody = report(summary);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  const samplesBody = await writeJson(path.join(outDir, "candidate_samples.json"), reconciliation.candidate_samples);
  const migrationBody = await writeJson(
    path.join(outDir, "migration_requirements.json"),
    migrationRequirements(summary),
  );
  const hashes = {
    hash_algorithm: "sha256",
    artifacts: {
      "summary.json": sha256(summaryBody),
      "REPORT.md": sha256(reportBody),
      "candidate_samples.json": sha256(samplesBody),
      "migration_requirements.json": sha256(migrationBody),
    },
  };
  await writeJson(path.join(outDir, "artifact_hashes.json"), hashes);
  process.stdout.write(`${JSON.stringify({ out_dir: outDir, reconciliation }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
