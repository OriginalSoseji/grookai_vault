import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import {
  MARKET_LISTING_PRODUCT_KIND_VERSION,
  classifyMarketListingProductKindV2,
} from "../../backend/pricing/market_listing_product_kind_v2.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_ROOT = path.join(REPO_ROOT, "docs", "audits", "market_listing_warehouse_v2");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(stable(value))).digest("hex");
}

async function* readJsonLines(filePath) {
  const rl = readline.createInterface({ input: createReadStream(filePath, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) yield JSON.parse(line);
}

function writeJsonLine(stream, row, hash) {
  stream.write(`${JSON.stringify(row)}\n`);
  hash.update(`${JSON.stringify(stable(row))}\n`);
}

function closeStream(stream) {
  return new Promise((resolve, reject) => stream.end((error) => error ? reject(error) : resolve()));
}

function countInto(counts, key) {
  if (key) counts[key] = (counts[key] ?? 0) + 1;
}

function sorted(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function itemByListingId(response) {
  return new Map((response?.raw_payload?.itemSummaries ?? [])
    .map((item) => [item?.itemId ?? item?.legacyItemId, item])
    .filter(([listingId]) => listingId));
}

function reclassifyResponse(response) {
  const items = itemByListingId(response);
  let changedCount = 0;
  const beforeKinds = {};
  const afterKinds = {};
  const afterPackaging = {};
  const afterExclusionFlags = {};
  const projectedObservations = (response.projected_observations ?? []).map((observation) => {
    const item = items.get(observation.source_listing_id);
    const classified = classifyMarketListingProductKindV2({
      title: observation.listing_title ?? item?.title,
      conditionText: observation.condition_text ?? item?.condition ?? item?.conditionDescription,
      conditionId: observation.provider_condition_id ?? item?.conditionId,
      itemCategories: item?.categories ?? observation.provider_categories,
      acquisitionProductKind: response.acquisition_product_kind,
      acquisitionCategoryIds: response.query_filters?.category_ids ?? [],
    });
    countInto(beforeKinds, observation.product_kind);
    countInto(afterKinds, classified.product_kind);
    countInto(afterPackaging, classified.packaging_state);
    for (const flag of classified.ingestion_exclusion_flags ?? []) countInto(afterExclusionFlags, flag);
    if (observation.product_kind !== classified.product_kind
      || observation.packaging_state !== classified.packaging_state
      || JSON.stringify(observation.product_kind_evidence ?? []) !== JSON.stringify(classified.product_kind_evidence)) {
      changedCount += 1;
    }
    return {
      ...observation,
      ...classified,
      target: {
        ...(observation.target ?? {}),
        card_print_id: null,
        card_printing_id: null,
        gv_id: null,
        printing_gv_id: null,
        canonical_assignment_status: "deferred",
        card_matching_deferred: true,
      },
    };
  });
  return { response: { ...response, projected_observations: projectedObservations }, changedCount, beforeKinds, afterKinds, afterPackaging, afterExclusionFlags };
}

export async function buildMarketListingWarehouseClassificationReplayV2({ fetchArtifact, outputDir, generatedAt = new Date().toISOString() } = {}) {
  if (fetchArtifact?.package_id !== "MARKET-LISTING-ACQUISITION-WAREHOUSE-FETCH-V2") throw new Error("[warehouse-classification-replay-v2] invalid source fetch artifact");
  if (!outputDir) throw new Error("[warehouse-classification-replay-v2] outputDir is required");
  mkdirSync(outputDir, { recursive: true });
  const rawSnapshotPath = path.join(outputDir, "raw_snapshots.jsonl");
  const projectedObservationPath = path.join(outputDir, "projected_observations.jsonl");
  const rawStream = createWriteStream(rawSnapshotPath, { encoding: "utf8" });
  const observationStream = createWriteStream(projectedObservationPath, { encoding: "utf8" });
  const rawHash = createHash("sha256");
  const observationHash = createHash("sha256");
  const beforeKinds = {};
  const afterKinds = {};
  const afterPackaging = {};
  const afterExclusionFlags = {};
  let snapshotCount = 0;
  let observationCount = 0;
  let changedCount = 0;
  const uniqueListings = new Set();

  try {
    for await (const sourceResponse of readJsonLines(fetchArtifact.artifacts.raw_snapshots_jsonl)) {
      const replay = reclassifyResponse(sourceResponse);
      snapshotCount += 1;
      changedCount += replay.changedCount;
      for (const [key, value] of Object.entries(replay.beforeKinds)) beforeKinds[key] = (beforeKinds[key] ?? 0) + value;
      for (const [key, value] of Object.entries(replay.afterKinds)) afterKinds[key] = (afterKinds[key] ?? 0) + value;
      for (const [key, value] of Object.entries(replay.afterPackaging)) afterPackaging[key] = (afterPackaging[key] ?? 0) + value;
      for (const [key, value] of Object.entries(replay.afterExclusionFlags)) afterExclusionFlags[key] = (afterExclusionFlags[key] ?? 0) + value;
      writeJsonLine(rawStream, replay.response, rawHash);
      for (const observation of replay.response.projected_observations ?? []) {
        observationCount += 1;
        if (observation.source_listing_id) uniqueListings.add(observation.source_listing_id);
        writeJsonLine(observationStream, observation, observationHash);
      }
    }
  } finally {
    await Promise.all([closeStream(rawStream), closeStream(observationStream)]);
  }

  const findings = [];
  if (snapshotCount !== fetchArtifact.summary?.attempted_request_count) findings.push("request_snapshot_count_mismatch");
  if (observationCount !== fetchArtifact.summary?.projected_observation_count) findings.push("observation_count_mismatch");
  if (uniqueListings.size !== observationCount) findings.push("duplicate_or_missing_listing_ids");
  const canonicalIdsPresent = [];
  for await (const observation of readJsonLines(projectedObservationPath)) {
    if (observation.target?.card_print_id || observation.target?.card_printing_id || observation.target?.gv_id || observation.target?.printing_gv_id) {
      canonicalIdsPresent.push(observation.source_listing_id);
    }
    if (observation.pricing_publication_eligible === true) findings.push("publication_eligible_observation_present");
  }
  if (canonicalIdsPresent.length > 0) findings.push("premature_canonical_assignment_present");

  const rawSnapshotManifestHash = rawHash.digest("hex");
  const projectedObservationManifestHash = observationHash.digest("hex");
  const packageFingerprint = sha256({
    source_package_fingerprint: fetchArtifact.package_fingerprint_sha256,
    product_kind_version: MARKET_LISTING_PRODUCT_KIND_VERSION,
    raw_snapshot_manifest_hash: rawSnapshotManifestHash,
    projected_observation_manifest_hash: projectedObservationManifestHash,
  });
  return {
    package_id: "MARKET-LISTING-ACQUISITION-WAREHOUSE-FETCH-V2",
    version: fetchArtifact.version,
    generated_at: generatedAt,
    mode: "offline_product_kind_replay_no_provider_calls_no_writes",
    source_package_fingerprint_sha256: fetchArtifact.package_fingerprint_sha256,
    source_request_manifest_hash_sha256: fetchArtifact.source_request_manifest_hash_sha256,
    schema_migration_hash_sha256: fetchArtifact.schema_migration_hash_sha256,
    product_kind_version: MARKET_LISTING_PRODUCT_KIND_VERSION,
    package_fingerprint_sha256: packageFingerprint,
    request_results_manifest_hash_sha256: fetchArtifact.request_results_manifest_hash_sha256,
    skipped_requests_manifest_hash_sha256: fetchArtifact.skipped_requests_manifest_hash_sha256,
    raw_snapshot_manifest_hash_sha256: rawSnapshotManifestHash,
    projected_observation_manifest_hash_sha256: projectedObservationManifestHash,
    summary: {
      ...(fetchArtifact.summary ?? {}),
      product_kind_counts: sorted(afterKinds),
      exclusion_flag_counts: sorted(afterExclusionFlags),
      projected_observation_count: observationCount,
      unique_listing_count: uniqueListings.size,
      replayed_snapshot_count: snapshotCount,
      reclassified_observation_count: changedCount,
      before_product_kind_counts: sorted(beforeKinds),
      packaging_state_counts: sorted(afterPackaging),
      canonical_assignment_deferred: true,
    },
    artifacts: {
      request_results_jsonl: fetchArtifact.artifacts.request_results_jsonl,
      skipped_requests_jsonl: fetchArtifact.artifacts.skipped_requests_jsonl,
      raw_snapshots_jsonl: rawSnapshotPath,
      projected_observations_jsonl: projectedObservationPath,
    },
    boundary: {
      provider_calls: false,
      source_fetches: false,
      local_artifacts_only: true,
      db_writes: false,
      canonical_assignment_writes: false,
      card_candidate_writes: false,
      sealed_product_identity_writes: false,
      public_pricing: false,
      app_visible_pricing: false,
    },
    findings: [...new Set(findings)],
    ready_for_local_db_backfill_plan: findings.length === 0 && observationCount > 0,
  };
}

async function main(argv) {
  const source = argv.find((entry) => entry.startsWith("--fetch="))?.slice("--fetch=".length);
  if (!source) throw new Error("[warehouse-classification-replay-v2] --fetch is required");
  const sourcePath = path.resolve(REPO_ROOT, source);
  const fetchArtifact = JSON.parse(readFileSync(sourcePath, "utf8"));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(AUDIT_ROOT, `warehouse_classification_replay_${stamp}`);
  const report = await buildMarketListingWarehouseClassificationReplayV2({ fetchArtifact, outputDir });
  const outputPath = path.join(outputDir, "summary.json");
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return { output_path: outputPath, summary: report.summary, findings: report.findings };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2))
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
