import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { createGzip, gunzipSync } from "node:zlib";

import {
  buildMtgWarehousePricingIndexV1,
  classifyMtgUnmappedPrintingGapV1,
  gapReasonForMtgLaneV1,
  isMtgShadowQualificationCandidateV1,
  markMtgMappingCollisionsV1,
  MTG_EXACT_PRINTING_PRICING_RECONCILIATION_V1,
  MTG_PRICING_RECONCILIATION_BOUNDARIES_V1,
  reconcileMtgExternalPrintingMappingV1,
} from "../../backend/pricing/mtg_exact_printing_pricing_reconciliation_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const MANIFEST_VERSION = "MTG_CANONICAL_CATALOG_BATCH_MANIFEST_V1";
const PAYLOAD_VERSION = "MTG_CANONICAL_CATALOG_SET_BATCH_V1";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function timestampSegment(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function parseMtgPricingReconciliationArgsV1(argv) {
  const args = {
    manifest: null,
    payloadDir: null,
    warehouseSnapshot: null,
    outDir: null,
  };
  for (const arg of argv) {
    if (arg.startsWith("--manifest=")) args.manifest = path.resolve(arg.slice(11));
    else if (arg.startsWith("--payload-dir=")) args.payloadDir = path.resolve(arg.slice(14));
    else if (arg.startsWith("--warehouse-snapshot=")) {
      args.warehouseSnapshot = path.resolve(arg.slice(21));
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.manifest) throw new Error("--manifest=<manifest.json> is required");
  if (!args.payloadDir) throw new Error("--payload-dir=<directory> is required");
  if (!args.warehouseSnapshot) {
    throw new Error("--warehouse-snapshot=<warehouse.jsonl> is required");
  }
  args.outDir ??= path.join(
    ROOT,
    "docs",
    "audits",
    "pricing",
    "mtg_exact_printing_pricing_reconciliation_v1",
    timestampSegment(),
  );
  return args;
}

async function loadJsonl(file) {
  const rows = [];
  const input = readline.createInterface({
    input: createReadStream(file, "utf8"),
    crlfDelay: Infinity,
  });
  let lineNumber = 0;
  for await (const line of input) {
    lineNumber += 1;
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch (error) {
      throw new Error(`Invalid JSONL at ${file}:${lineNumber}: ${error.message}`);
    }
  }
  return rows;
}

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeJsonl(file, rows) {
  const stream = createWriteStream(file, { encoding: "utf8" });
  for (const row of rows) {
    if (!stream.write(`${JSON.stringify(row)}\n`)) await once(stream, "drain");
  }
  stream.end();
  await once(stream, "finish");
}

export async function writeDeterministicGzipJsonlPartsV1(
  outDir,
  prefix,
  rows,
  maxRowsPerPart = 20_000,
) {
  const parts = [];
  const aggregateLogicalHash = createHash("sha256");
  for (let offset = 0; offset < rows.length; offset += maxRowsPerPart) {
    const partRows = rows.slice(offset, offset + maxRowsPerPart);
    const ordinal = parts.length + 1;
    const name = `${prefix}_part_${String(ordinal).padStart(4, "0")}.jsonl.gz`;
    const file = path.join(outDir, name);
    const gzip = createGzip({ level: 9, mtime: 0 });
    const output = createWriteStream(file);
    gzip.pipe(output);
    const partLogicalHash = createHash("sha256");
    for (const row of partRows) {
      const line = `${JSON.stringify(row)}\n`;
      partLogicalHash.update(line);
      aggregateLogicalHash.update(line);
      if (!gzip.write(line)) await once(gzip, "drain");
    }
    gzip.end();
    await once(output, "finish");
    const compressedSha = await fileSha256(file);
    const compressedByteSize = (await fs.stat(file)).size;
    parts.push({
      file: name,
      row_count: partRows.length,
      first_row_ordinal: offset,
      last_row_ordinal: offset + partRows.length - 1,
      logical_jsonl_sha256: partLogicalHash.digest("hex"),
      compressed_sha256: compressedSha,
      compressed_byte_size: compressedByteSize,
      content_encoding: "gzip",
    });
  }
  const index = {
    version: MTG_EXACT_PRINTING_PRICING_RECONCILIATION_V1,
    artifact: prefix,
    total_row_count: rows.length,
    logical_jsonl_sha256: aggregateLogicalHash.digest("hex"),
    max_rows_per_part: maxRowsPerPart,
    part_count: parts.length,
    parts,
  };
  const indexName = `${prefix}_index.json`;
  await writeJson(path.join(outDir, indexName), index);
  return {
    index_name: indexName,
    part_names: parts.map((row) => row.file),
    part_metadata: parts,
    index,
  };
}

export async function readGzipJsonlLogicalEvidenceV1(file) {
  const compressed = await fs.readFile(file);
  const logical = gunzipSync(compressed);
  const text = logical.toString("utf8");
  return {
    compressed_sha256: sha256(compressed),
    compressed_byte_size: compressed.length,
    logical_jsonl_sha256: sha256(logical),
    row_count: text.length === 0 ? 0 : text.trimEnd().split("\n").length,
  };
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function coverageKey(setCode, finish) {
  return `${setCode}\u0000${finish}`;
}

function gapFromLane(lane, reason) {
  return {
    reconciliation_version: lane.reconciliation_version,
    gap_scope: "printing_lane",
    set_ordinal: lane.set_ordinal,
    set_id: lane.set_id,
    set_code: lane.set_code,
    set_name: lane.set_name,
    card_print_id: lane.card_print_id,
    card_name: lane.card_name,
    collector_number: lane.collector_number,
    card_printing_id: lane.card_printing_id,
    printing_gv_id: lane.printing_gv_id,
    finish: lane.finish,
    product_id: lane.product_id,
    source_subtype: lane.source_subtype,
    source_lane_identity: lane.source_lane_identity,
    gap_reason: reason,
    warehouse_lane_status: lane.warehouse_lane_status,
    publication_state: "blocked",
    inferred_mapping: false,
  };
}

function validatePayloadAgainstBatch(payload, batch) {
  const findings = [];
  if (payload?.plan_version !== PAYLOAD_VERSION) findings.push("payload_version_mismatch");
  if (payload?.writer_payload_fingerprint !== batch.writer_payload_fingerprint) {
    findings.push("writer_payload_fingerprint_mismatch");
  }
  if (payload?.selected_set?.source_set_id !== batch.source_set_id) {
    findings.push("payload_set_id_mismatch");
  }
  const expected = {
    card_prints: batch.candidate_count,
    card_printings: batch.card_printings,
    external_printing_mappings: batch.external_printing_mappings,
    positive_market_lanes: batch.positive_market_lanes,
    quarantined_collision_lanes: batch.quarantined_collision_lanes,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (Number(payload?.counts?.[key]) !== Number(value)) {
      findings.push(`payload_count_mismatch:${key}`);
    }
  }
  for (const key of [
    "card_prints",
    "card_print_identity",
    "card_printings",
    "external_mappings",
    "external_printing_mappings",
  ]) {
    if (!Array.isArray(payload?.rows?.[key])) findings.push(`payload_rows_missing:${key}`);
  }
  return findings;
}

function validateManifest(manifest) {
  const findings = [];
  if (manifest?.version !== MANIFEST_VERSION) findings.push("manifest_version_mismatch");
  if (manifest?.status !== "full_catalog_batches_frozen") findings.push("manifest_not_frozen");
  if (!Array.isArray(manifest?.batches) || manifest.batches.length === 0) {
    findings.push("manifest_batches_missing");
  }
  const ordinals = new Set();
  const setIds = new Set();
  for (const batch of manifest?.batches ?? []) {
    if (ordinals.has(batch.ordinal)) findings.push(`duplicate_batch_ordinal:${batch.ordinal}`);
    if (setIds.has(batch.source_set_id)) findings.push(`duplicate_source_set_id:${batch.source_set_id}`);
    ordinals.add(batch.ordinal);
    setIds.add(batch.source_set_id);
  }
  return findings;
}

export function buildMtgPricingCoverageRowsV1({ printings, lanes, gaps }) {
  const coverage = new Map();
  for (const row of printings) {
    const key = coverageKey(row.set_code, row.finish);
    if (!coverage.has(key)) {
      coverage.set(key, {
        set_ordinal: row.set_ordinal,
        set_id: row.set_id,
        set_code: row.set_code,
        set_name: row.set_name,
        finish: row.finish,
        printing_count: 0,
        exact_mapping_lane_count: 0,
        exact_mapped_printing_count: 0,
        warehouse_supported_lane_count: 0,
        snapshot_positive_signal_lane_count: 0,
        shadow_qualification_candidate_lane_count: 0,
        blocked_gap_count: 0,
      });
    }
    coverage.get(key).printing_count += 1;
  }
  const exactPrintingKeys = new Set();
  for (const lane of lanes) {
    const key = coverageKey(lane.set_code, lane.finish);
    const row = coverage.get(key);
    if (!row) continue;
    row.exact_mapping_lane_count += 1;
    if (lane.exact_mapping) exactPrintingKeys.add(`${key}\u0000${lane.card_printing_id}`);
    if (lane.warehouse_subtype_present) row.warehouse_supported_lane_count += 1;
    if (lane.positive_market_signal_present) {
      row.snapshot_positive_signal_lane_count += 1;
    }
    if (isMtgShadowQualificationCandidateV1(lane)) {
      row.shadow_qualification_candidate_lane_count += 1;
    }
  }
  for (const identity of exactPrintingKeys) {
    const parts = identity.split("\u0000");
    coverage.get(coverageKey(parts[0], parts[1])).exact_mapped_printing_count += 1;
  }
  for (const gap of gaps) {
    if (gap.gap_scope !== "printing_lane") continue;
    const row = coverage.get(coverageKey(gap.set_code, gap.finish));
    if (row) row.blocked_gap_count += 1;
  }
  return [...coverage.values()]
    .map((row) => ({
      ...row,
      exact_mapping_printing_coverage:
        row.printing_count === 0 ? 0 : row.exact_mapped_printing_count / row.printing_count,
      snapshot_positive_signal_printing_coverage:
        row.printing_count === 0
          ? 0
          : row.shadow_qualification_candidate_lane_count / row.printing_count,
      publication_state: "blocked_requires_amount_and_freshness",
    }))
    .sort((left, right) =>
      left.set_ordinal - right.set_ordinal || left.finish.localeCompare(right.finish),
    );
}

function renderReport(summary) {
  const c = summary.counts;
  return `# MTG Exact-Printing Pricing Reconciliation V1

## Status

**${summary.status}**

This is an offline, read-only reconciliation plan. It does not access the
database and does not authorize or perform price publication.

## Frozen Inputs

- Manifest SHA-256: \`${summary.inputs.manifest_sha256}\`
- Payload inventory SHA-256: \`${summary.inputs.payload_inventory_sha256}\`
- Warehouse snapshot SHA-256: \`${summary.inputs.warehouse_snapshot_sha256}\`
- Result fingerprint: \`${summary.result_fingerprint}\`

## Coverage

| Measure | Count |
|---|---:|
| Sets | ${c.set_count.toLocaleString("en-US")} |
| Canonical finish printings | ${c.card_printing_count.toLocaleString("en-US")} |
| Exact TCGPlayer mapping rows | ${c.external_printing_mapping_count.toLocaleString("en-US")} |
| Warehouse-supported exact lanes | ${c.warehouse_supported_lane_count.toLocaleString("en-US")} |
| Snapshot-bound positive-market signals | ${c.snapshot_positive_signal_lane_count.toLocaleString("en-US")} |
| Zero-map sets | ${c.zero_map_set_count.toLocaleString("en-US")} |
| Missing warehouse products | ${c.missing_warehouse_product_lane_count.toLocaleString("en-US")} |
| Missing warehouse subtypes | ${c.missing_warehouse_subtype_lane_count.toLocaleString("en-US")} |
| Lanes without a snapshot-bound positive-market signal | ${c.no_positive_market_signal_lane_count.toLocaleString("en-US")} |
| Unmapped canonical printings | ${c.unmapped_printing_count.toLocaleString("en-US")} |
| Manifest-quarantined collision lanes | ${c.manifest_quarantined_collision_lane_count.toLocaleString("en-US")} |
| Detected collision conditions | ${c.detected_collision_condition_count.toLocaleString("en-US")} |
| Publication-blocked gap rows | ${c.publication_blocked_gap_count.toLocaleString("en-US")} |

## Decision

The warehouse snapshot proves subtype support and a positive-market signal only.
It does not contain a publishable amount or prove freshness. Exact signal rows
are eligible only for a later shadow-qualification gate. Publication remains
blocked until database-aware evidence proves amount, freshness, release
isolation, and shared read-model behavior. Missing and quarantined lanes remain
preserved; this plan chooses no inferred owner.

## Boundaries

${Object.entries(summary.boundaries)
  .map(([key, value]) => `- ${key}: \`${value}\``)
  .join("\n")}
`;
}

async function main() {
  const args = parseMtgPricingReconciliationArgsV1(process.argv.slice(2));
  await fs.mkdir(args.outDir, { recursive: true });

  const manifestBytes = await fs.readFile(args.manifest);
  const manifestSha = sha256(manifestBytes);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const manifestFindings = validateManifest(manifest);
  if (manifestFindings.length) {
    throw new Error(`Frozen manifest validation failed: ${manifestFindings.join(", ")}`);
  }
  const warehouseSha = await fileSha256(args.warehouseSnapshot);
  if (warehouseSha !== manifest.source.warehouse_sha256) {
    throw new Error(
      `Warehouse snapshot hash mismatch: expected ${manifest.source.warehouse_sha256}, got ${warehouseSha}`,
    );
  }

  const payloadInventory = [];
  for (const batch of [...manifest.batches].sort((a, b) => a.ordinal - b.ordinal)) {
    const file = path.join(args.payloadDir, path.basename(batch.payload_file));
    const actualSha = await fileSha256(file);
    if (actualSha !== batch.payload_file_sha256) {
      throw new Error(`Payload hash mismatch for ${batch.code}: ${actualSha}`);
    }
    payloadInventory.push({
      ordinal: batch.ordinal,
      source_set_id: batch.source_set_id,
      code: batch.code,
      payload_file: file,
      payload_file_sha256: actualSha,
      writer_payload_fingerprint: batch.writer_payload_fingerprint,
    });
  }
  const payloadInventorySha = sha256(stableJson(payloadInventory.map((row) => ({
    ordinal: row.ordinal,
    source_set_id: row.source_set_id,
    code: row.code,
    payload_file_sha256: row.payload_file_sha256,
    writer_payload_fingerprint: row.writer_payload_fingerprint,
  }))));

  const repository = {
    branch: git(["branch", "--show-current"]),
    commit_sha: git(["rev-parse", "HEAD"]),
    tracked_worktree_clean: git(["status", "--short", "--untracked-files=no"]) === "",
  };
  const runPlan = {
    version: MTG_EXACT_PRINTING_PRICING_RECONCILIATION_V1,
    recorded_at: new Date().toISOString(),
    repository,
    inputs: {
      manifest_path: args.manifest,
      manifest_sha256: manifestSha,
      payload_directory: args.payloadDir,
      payload_file_count: payloadInventory.length,
      payload_inventory_sha256: payloadInventorySha,
      warehouse_snapshot_path: args.warehouseSnapshot,
      warehouse_snapshot_sha256: warehouseSha,
    },
    boundaries: MTG_PRICING_RECONCILIATION_BOUNDARIES_V1,
  };
  await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);

  const warehouseRows = await loadJsonl(args.warehouseSnapshot);
  const warehouseIndex = buildMtgWarehousePricingIndexV1(warehouseRows);
  const lanes = [];
  const printings = [];
  const mappedPrintingIds = new Set();
  const zeroMapSets = [];
  const quarantineRows = [];

  for (let index = 0; index < payloadInventory.length; index += 1) {
    const inventory = payloadInventory[index];
    const batch = manifest.batches.find((row) => row.ordinal === inventory.ordinal);
    const payload = JSON.parse(await fs.readFile(inventory.payload_file, "utf8"));
    const payloadFindings = validatePayloadAgainstBatch(payload, batch);
    if (payloadFindings.length) {
      throw new Error(`Payload validation failed for ${batch.code}: ${payloadFindings.join(", ")}`);
    }
    const cardPrints = new Map(payload.rows.card_prints.map((row) => [row.id, row]));
    const cardPrintings = new Map(payload.rows.card_printings.map((row) => [row.id, row]));

    for (const printing of payload.rows.card_printings) {
      const cardPrint = cardPrints.get(printing.card_print_id);
      printings.push({
        set_ordinal: batch.ordinal,
        set_id: batch.source_set_id,
        set_code: batch.code,
        set_name: batch.name,
        card_print_id: printing.card_print_id,
        card_name: cardPrint?.name ?? null,
        collector_number: cardPrint?.number ?? null,
        card_printing_id: printing.id,
        printing_gv_id: printing.printing_gv_id,
        finish: String(printing.finish_key ?? "").toLowerCase(),
        printing,
        card_print: cardPrint,
      });
    }
    for (const mapping of payload.rows.external_printing_mappings) {
      const printing = cardPrintings.get(mapping.card_printing_id);
      const cardPrint = printing ? cardPrints.get(printing.card_print_id) : null;
      const lane = reconcileMtgExternalPrintingMappingV1({
        mapping,
        printing,
        cardPrint,
        set: batch,
        warehouseIndex,
      });
      lanes.push(lane);
      if (lane.card_printing_id) mappedPrintingIds.add(lane.card_printing_id);
    }
    if (payload.rows.external_printing_mappings.length === 0) {
      zeroMapSets.push({
        set_ordinal: batch.ordinal,
        set_id: batch.source_set_id,
        set_code: batch.code,
        set_name: batch.name,
        set_type: batch.set_type,
        canonical_printing_count: batch.card_printings,
        exact_mapping_count: 0,
        reason: "no_exact_external_printing_mappings_in_frozen_payload",
        publication_state: "blocked",
      });
    }
    if (Number(batch.quarantined_collision_lanes) > 0) {
      quarantineRows.push({
        reconciliation_version: MTG_EXACT_PRINTING_PRICING_RECONCILIATION_V1,
        gap_scope: "set_aggregate",
        set_ordinal: batch.ordinal,
        set_id: batch.source_set_id,
        set_code: batch.code,
        set_name: batch.name,
        gap_reason: "manifest_quarantined_collision_lanes",
        quarantined_lane_count: Number(batch.quarantined_collision_lanes),
        owner_assignment: "withheld",
        publication_state: "blocked",
        inferred_mapping: false,
      });
    }
    if ((index + 1) % 100 === 0 || index + 1 === payloadInventory.length) {
      process.stdout.write(`Validated ${index + 1}/${payloadInventory.length} payloads\n`);
    }
  }

  lanes.sort((left, right) =>
    left.set_ordinal - right.set_ordinal ||
    String(left.card_printing_id).localeCompare(String(right.card_printing_id)) ||
    String(left.source_lane_identity).localeCompare(String(right.source_lane_identity)),
  );
  printings.sort((left, right) =>
    left.set_ordinal - right.set_ordinal ||
    left.card_printing_id.localeCompare(right.card_printing_id),
  );
  const detectedCollisions = markMtgMappingCollisionsV1(lanes);
  const collisionConditions = [
    ...[...warehouseIndex.duplicate_product_ids].sort((a, b) => a - b).map((productId) => ({
      collision_type: "duplicate_warehouse_product_id",
      collision_key: String(productId),
      publication_state: "blocked",
    })),
    ...detectedCollisions,
    ...quarantineRows.map((row) => ({
      collision_type: "manifest_quarantined_source_lanes",
      collision_key: row.set_id,
      set_code: row.set_code,
      quarantined_lane_count: row.quarantined_lane_count,
      owner_assignment: "withheld",
      publication_state: "blocked",
    })),
  ];

  const gaps = [];
  for (const row of printings) {
    if (!mappedPrintingIds.has(row.card_printing_id)) {
      gaps.push({
        gap_scope: "printing_lane",
        ...classifyMtgUnmappedPrintingGapV1({
          printing: row.printing,
          cardPrint: row.card_print,
          set: {
            ordinal: row.set_ordinal,
            source_set_id: row.set_id,
            code: row.set_code,
            name: row.set_name,
          },
        }),
      });
    }
  }
  for (const lane of lanes) {
    if (isMtgShadowQualificationCandidateV1(lane)) continue;
    gaps.push(gapFromLane(lane, gapReasonForMtgLaneV1(lane) ?? "lane_not_publishable"));
  }
  gaps.push(...quarantineRows);
  gaps.sort((left, right) =>
    Number(left.set_ordinal) - Number(right.set_ordinal) ||
    String(left.card_printing_id ?? "").localeCompare(String(right.card_printing_id ?? "")) ||
    String(left.gap_reason).localeCompare(String(right.gap_reason)),
  );

  const coverageRows = buildMtgPricingCoverageRowsV1({ printings, lanes, gaps });
  const snapshotPositiveSignals = lanes.filter(isMtgShadowQualificationCandidateV1);
  const missingWarehouse = lanes.filter((lane) => [
    "missing_warehouse_product",
    "missing_warehouse_subtype",
    "duplicate_warehouse_product",
  ].includes(lane.warehouse_lane_status));
  const noPositive = lanes.filter(
    (lane) => lane.warehouse_lane_status === "exact_lane_without_positive_market_signal",
  );
  const unmappedPrintingCount = printings.filter(
    (row) => !mappedPrintingIds.has(row.card_printing_id),
  ).length;
  const manifestQuarantinedCount = manifest.batches.reduce(
    (sum, row) => sum + Number(row.quarantined_collision_lanes ?? 0),
    0,
  );

  const counts = {
    set_count: manifest.batches.length,
    warehouse_snapshot_row_count: warehouseIndex.input_row_count,
    warehouse_unique_product_count: warehouseIndex.unique_product_count,
    card_printing_count: printings.length,
    external_printing_mapping_count: lanes.length,
    warehouse_supported_lane_count: lanes.filter((row) => row.warehouse_subtype_present).length,
    snapshot_positive_signal_lane_count: snapshotPositiveSignals.length,
    zero_map_set_count: zeroMapSets.length,
    missing_warehouse_product_lane_count: lanes.filter(
      (row) => row.warehouse_lane_status === "missing_warehouse_product",
    ).length,
    missing_warehouse_subtype_lane_count: lanes.filter(
      (row) => row.warehouse_lane_status === "missing_warehouse_subtype",
    ).length,
    duplicate_warehouse_product_id_count: warehouseIndex.duplicate_product_ids.size,
    no_positive_market_signal_lane_count: noPositive.length,
    unmapped_printing_count: unmappedPrintingCount,
    unsupported_etched_printing_count: gaps.filter(
      (row) => row.gap_reason === "unsupported_etched_finish_v1",
    ).length,
    manifest_quarantined_collision_lane_count: manifestQuarantinedCount,
    detected_collision_condition_count: detectedCollisions.length,
    publication_blocked_gap_count: gaps.length,
  };
  const reconciliationFindings = [];
  const expectedCounts = {
    set_count: manifest.totals.sets,
    card_printing_count: manifest.totals.card_printings,
    external_printing_mapping_count: manifest.totals.external_printing_mappings,
    snapshot_positive_signal_lane_count: manifest.totals.positive_market_lanes,
    manifest_quarantined_collision_lane_count: manifest.totals.quarantined_collision_lanes,
  };
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (Number(counts[key]) !== Number(expected)) {
      reconciliationFindings.push({
        finding: `manifest_reconciliation_mismatch:${key}`,
        expected: Number(expected),
        actual: Number(counts[key]),
      });
    }
  }
  if (warehouseIndex.duplicate_product_ids.size > 0) {
    reconciliationFindings.push({
      finding: "duplicate_warehouse_product_ids",
      count: warehouseIndex.duplicate_product_ids.size,
    });
  }
  if (detectedCollisions.length > 0) {
    reconciliationFindings.push({
      finding: "unquarantined_mapping_collisions_detected",
      count: detectedCollisions.length,
    });
  }

  const resultFingerprint = sha256(stableJson({
    version: MTG_EXACT_PRINTING_PRICING_RECONCILIATION_V1,
    manifest_sha256: manifestSha,
    payload_inventory_sha256: payloadInventorySha,
    warehouse_snapshot_sha256: warehouseSha,
    counts,
    findings: reconciliationFindings,
  }));
  const summary = {
    version: MTG_EXACT_PRINTING_PRICING_RECONCILIATION_V1,
    recorded_at: new Date().toISOString(),
    status: reconciliationFindings.length === 0
      ? "offline_reconciliation_complete_publication_blocked"
      : "offline_reconciliation_findings_publication_blocked",
    repository,
    inputs: runPlan.inputs,
    result_fingerprint: resultFingerprint,
    counts,
    reconciliation_findings: reconciliationFindings,
    publication: {
      authorized: false,
      performed: false,
      amount_available_in_snapshot: false,
      freshness_proven_by_snapshot: false,
      exact_signal_rows_are_shadow_candidates_only: true,
      next_gate: "database_aware_shadow_qualification_plan",
    },
    boundaries: MTG_PRICING_RECONCILIATION_BOUNDARIES_V1,
  };

  const publicLanes = lanes.map(({ source_lane_collision, card_printing_mapping_collision, ...row }) => ({
    ...row,
    source_lane_collision: source_lane_collision === true,
    card_printing_mapping_collision: card_printing_mapping_collision === true,
  }));
  const laneArtifacts = await writeDeterministicGzipJsonlPartsV1(
    args.outDir,
    "reconciled_exact_lanes",
    publicLanes,
  );
  const gapArtifacts = await writeDeterministicGzipJsonlPartsV1(
    args.outDir,
    "publication_blocked_gap_ledger",
    gaps,
    50_000,
  );
  await writeJsonl(path.join(args.outDir, "set_finish_coverage.jsonl"), coverageRows);
  await writeJsonl(path.join(args.outDir, "missing_warehouse_lanes.jsonl"), missingWarehouse);
  await writeJsonl(path.join(args.outDir, "collision_conditions.jsonl"), collisionConditions);
  await writeJson(path.join(args.outDir, "zero_map_sets.json"), zeroMapSets);
  await writeJson(path.join(args.outDir, "summary.json"), summary);
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), renderReport(summary), "utf8");

  const artifactNames = [
    "run_plan.json",
    "summary.json",
    laneArtifacts.index_name,
    ...laneArtifacts.part_names,
    gapArtifacts.index_name,
    ...gapArtifacts.part_names,
    "set_finish_coverage.jsonl",
    "missing_warehouse_lanes.jsonl",
    "collision_conditions.jsonl",
    "zero_map_sets.json",
    "REPORT.md",
  ];
  const logicalMetadata = new Map(
    [...laneArtifacts.part_metadata, ...gapArtifacts.part_metadata].map((row) => [
      row.file,
      row,
    ]),
  );
  const artifactHashes = {};
  for (const name of artifactNames) {
    const compressed = logicalMetadata.get(name);
    artifactHashes[name] = {
      sha256: await fileSha256(path.join(args.outDir, name)),
      byte_size: (await fs.stat(path.join(args.outDir, name))).size,
      ...(compressed
        ? {
            content_encoding: "gzip",
            logical_row_count: compressed.row_count,
            logical_jsonl_sha256: compressed.logical_jsonl_sha256,
            compressed_sha256: compressed.compressed_sha256,
            compressed_byte_size: compressed.compressed_byte_size,
          }
        : {}),
    };
  }
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    version: MTG_EXACT_PRINTING_PRICING_RECONCILIATION_V1,
    result_fingerprint: resultFingerprint,
    artifacts: artifactHashes,
  });

  process.stdout.write(`${JSON.stringify({ out_dir: args.outDir, ...summary }, null, 2)}\n`);
  if (reconciliationFindings.length > 0) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
