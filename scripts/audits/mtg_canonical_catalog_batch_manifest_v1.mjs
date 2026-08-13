import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { createGunzip } from "node:zlib";
import { fileURLToPath } from "node:url";

import { buildMtgCanonicalCandidateV1 } from "../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs";
import { buildMtgCanaryPayloadV1 } from "./mtg_canonical_catalog_canary_plan_v1.mjs";
import { stableJson } from "./mtg_canonical_catalog_canary_stage_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_BATCH_MANIFEST_V1";
const SET_PAYLOAD_VERSION = "MTG_CANONICAL_CATALOG_SET_BATCH_V1";
const DSK_SOURCE_SET_ID = "a111d8a9-b647-48ec-afab-2b78f92173f5";
const MAX_BUFFER_BYTES = 32 * 1024 * 1024;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

function parseArgs(argv) {
  const args = {
    warehouseProducts: null,
    reconciliationSummary: null,
    bulkFile: path.join(ROOT, ".tmp", "scryfall-default-cards.jsonl.gz"),
    payloadDir: path.join(ROOT, ".tmp", "mtg_canonical_catalog_set_batches_v1"),
    outDir: null,
  };
  for (const arg of argv) {
    if (arg.startsWith("--warehouse-products=")) {
      args.warehouseProducts = path.resolve(arg.slice(21));
    } else if (arg.startsWith("--reconciliation-summary=")) {
      args.reconciliationSummary = path.resolve(arg.slice(25));
    } else if (arg.startsWith("--bulk-file=")) {
      args.bulkFile = path.resolve(arg.slice(12));
    } else if (arg.startsWith("--payload-dir=")) {
      args.payloadDir = path.resolve(arg.slice(14));
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice(10));
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }
  if (!args.warehouseProducts) throw new Error("--warehouse-products=<jsonl> is required");
  if (!args.reconciliationSummary) {
    throw new Error("--reconciliation-summary=<summary.json> is required");
  }
  return args;
}

async function loadWarehouseProducts(file) {
  const rows = new Map();
  const lines = readline.createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    rows.set(Number(row.product_id), {
      product_id: Number(row.product_id),
      subtypes: new Set(row.subtypes ?? []),
      positive_market_subtypes: new Set(row.positive_market_subtypes ?? []),
    });
  }
  return rows;
}

function safeSetFileName(set) {
  const code = String(set.code).replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  return `${code}__${set.source_set_id}.jsonl`;
}

async function flushCandidateBuffers(buffers, candidateDir) {
  for (const [fileName, lines] of buffers) {
    if (lines.length === 0) continue;
    await fs.appendFile(path.join(candidateDir, fileName), lines.join(""), "utf8");
  }
  buffers.clear();
}

async function partitionCandidates({ bulkFile, candidateDir }) {
  await fs.rm(candidateDir, { recursive: true, force: true });
  await fs.mkdir(candidateDir, { recursive: true });
  const sets = new Map();
  const buffers = new Map();
  const candidateHash = createHash("sha256");
  let bufferedBytes = 0;
  let bulkCount = 0;
  let eligibleCount = 0;
  const lines = readline.createInterface({
    input: createReadStream(bulkFile).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (!line.trim()) continue;
    bulkCount += 1;
    const candidate = buildMtgCanonicalCandidateV1(JSON.parse(line));
    if (candidate.status !== "candidate") continue;
    eligibleCount += 1;
    const serialized = `${JSON.stringify(candidate)}\n`;
    candidateHash.update(serialized);
    const fileName = safeSetFileName(candidate.set);
    const entry = sets.get(candidate.set.source_set_id) ?? {
      set: candidate.set,
      file_name: fileName,
      candidate_count: 0,
      release_dates: new Set(),
    };
    if (
      stableJson({ ...entry.set, released_at: null }) !==
      stableJson({ ...candidate.set, released_at: null })
    ) {
      throw new Error(`Inconsistent set metadata for ${candidate.set.source_set_id}`);
    }
    entry.candidate_count += 1;
    if (candidate.set.released_at) entry.release_dates.add(candidate.set.released_at);
    sets.set(candidate.set.source_set_id, entry);
    const fileLines = buffers.get(fileName) ?? [];
    fileLines.push(serialized);
    buffers.set(fileName, fileLines);
    bufferedBytes += Buffer.byteLength(serialized);
    if (bufferedBytes >= MAX_BUFFER_BYTES) {
      await flushCandidateBuffers(buffers, candidateDir);
      bufferedBytes = 0;
    }
  }
  await flushCandidateBuffers(buffers, candidateDir);
  return {
    bulk_count: bulkCount,
    eligible_count: eligibleCount,
    candidate_payload_sha256: candidateHash.digest("hex"),
    sets,
  };
}

async function loadCandidates(file) {
  const candidates = [];
  const lines = readline.createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.trim()) candidates.push(JSON.parse(line));
  }
  return candidates.sort((left, right) =>
    left.card.source_print_id.localeCompare(right.card.source_print_id),
  );
}

export function resolveMtgSetMetadataV1(candidates) {
  if (candidates.length === 0) throw new Error("Set candidates are required");
  const first = candidates[0].set;
  const releaseDates = new Set();
  for (const candidate of candidates) {
    const current = candidate.set;
    if (
      current.source_set_id !== first.source_set_id ||
      current.code !== first.code ||
      current.name !== first.name ||
      current.set_type !== first.set_type
    ) {
      throw new Error(`Inconsistent set identity for ${first.source_set_id}`);
    }
    if (current.released_at) releaseDates.add(current.released_at);
  }
  const observedReleaseDates = [...releaseDates].sort();
  const set = {
    ...first,
    released_at: observedReleaseDates.length === 1 ? observedReleaseDates[0] : null,
  };
  return {
    set,
    observed_release_dates: observedReleaseDates,
    release_date_resolution:
      observedReleaseDates.length === 0
        ? "not_observed"
        : observedReleaseDates.length === 1
          ? "single_observed_value"
          : "card_level_values_preserved_set_level_abstained",
    candidates: candidates.map((candidate) => ({
      ...candidate,
      source_card_released_at: candidate.set.released_at,
      set,
    })),
  };
}

function uniquenessTracker() {
  const values = new Map();
  return {
    add(label, value, owner) {
      const key = `${label}:${value}`;
      const existing = values.get(key);
      if (existing) throw new Error(`Global duplicate ${label} ${value}: ${existing}, ${owner}`);
      values.set(key, owner);
    },
    get size() {
      return values.size;
    },
  };
}

function addPayloadUniqueness(tracker, payload) {
  for (const row of payload.rows.sets) {
    tracker.add("set_id", row.id, payload.selected_set.code);
    tracker.add("set_code", row.code, payload.selected_set.source_set_id);
  }
  for (const row of payload.rows.card_prints) {
    tracker.add("card_print_id", row.id, row.gv_id);
    tracker.add("parent_gv_id", row.gv_id, row.id);
  }
  for (const row of payload.rows.card_print_identity) {
    tracker.add("identity_id", row.id, row.card_print_id);
    tracker.add("identity_hash", row.identity_key_hash, row.card_print_id);
  }
  for (const row of payload.rows.card_printings) {
    tracker.add("printing_id", row.id, row.printing_gv_id);
    tracker.add("printing_gv_id", row.printing_gv_id, row.id);
  }
  for (const row of payload.rows.external_mappings) {
    tracker.add("parent_mapping", `${row.source}:${row.external_id}`, row.card_print_id);
  }
  for (const row of payload.rows.external_printing_mappings) {
    tracker.add("printing_mapping", `${row.source}:${row.external_id}`, row.card_printing_id);
  }
}

function sumCounts(rows) {
  const totals = {};
  for (const row of rows) {
    for (const [key, count] of Object.entries(row.counts)) {
      totals[key] = (totals[key] ?? 0) + Number(count);
    }
  }
  return totals;
}

export function validateMtgCatalogBatchManifestV1(manifest, reconciliation) {
  const findings = [];
  if (manifest.source.bulk_sha256 !== reconciliation.source_bulk.sha256) {
    findings.push("source_bulk_hash_mismatch");
  }
  if (manifest.source.warehouse_sha256 !== reconciliation.warehouse_snapshot.sha256) {
    findings.push("warehouse_hash_mismatch");
  }
  if (
    manifest.source.candidate_payload_sha256 !==
    reconciliation.reconciliation.candidate_payload_sha256
  ) {
    findings.push("candidate_payload_hash_mismatch");
  }
  if (
    Number(manifest.coverage.total_candidate_count) !==
    Number(reconciliation.reconciliation.eligible_candidate_count)
  ) {
    findings.push("candidate_count_mismatch");
  }
  if (
    Number(manifest.coverage.total_set_count) !==
    Number(reconciliation.reconciliation.canonical_set_candidate_count)
  ) {
    findings.push("set_count_mismatch");
  }
  if (manifest.coverage.already_canonical_set_count !== 1) {
    findings.push("dsk_canonical_set_count_mismatch");
  }
  if (manifest.coverage.already_canonical_parent_count !== 417) {
    findings.push("dsk_canonical_parent_count_mismatch");
  }
  if (
    manifest.coverage.remaining_parent_count !==
    manifest.coverage.total_candidate_count - manifest.coverage.already_canonical_parent_count
  ) {
    findings.push("remaining_parent_count_mismatch");
  }
  const fingerprints = manifest.batches.map((row) => row.writer_payload_fingerprint);
  if (new Set(fingerprints).size !== fingerprints.length) {
    findings.push("duplicate_batch_payload_fingerprint");
  }
  return findings;
}

function pickNextBatch(batches) {
  const eligible = batches.filter(
    (row) =>
      row.catalog_state === "not_staged" &&
      row.set_type === "expansion" &&
      row.quarantined_collision_lanes === 0 &&
      row.candidate_count >= 100,
  );
  return eligible.sort(
    (left, right) =>
      String(right.released_at ?? "").localeCompare(String(left.released_at ?? "")) ||
      right.positive_market_lanes - left.positive_market_lanes ||
      left.code.localeCompare(right.code),
  )[0] ?? null;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function report(manifest) {
  const next = manifest.next_bounded_stage_candidate;
  return `# MTG Full Catalog Batch Manifest V1

- Status: **${manifest.status.toUpperCase()}**
- Source cards: \`${manifest.source.bulk_card_count}\`
- Eligible English paper parents: \`${manifest.coverage.total_candidate_count}\`
- Scryfall sets: \`${manifest.coverage.total_set_count}\`
- Already canonical DSK parents: \`${manifest.coverage.already_canonical_parent_count}\`
- Remaining parents: \`${manifest.coverage.remaining_parent_count}\`
- Remaining sets: \`${manifest.coverage.remaining_set_count}\`
- Planned finish printings: \`${manifest.totals.card_printings}\`
- Planned exact TCGPlayer mappings: \`${manifest.totals.external_printing_mappings}\`
- Global uniqueness findings: \`${manifest.findings.length}\`
- Database writes: \`0\`

## Next Bounded Stage

${next ? `The deterministic next set is **${next.name}** (\`${next.code}\`): ${next.candidate_count} parents, ${next.card_printings} finish printings, and ${next.external_printing_mappings} exact TCGPlayer mappings.` : "No eligible bounded stage candidate was found."}

Payload files are generated under the ignored \`.tmp\` directory from the pinned source hashes. The permanent manifest records every payload fingerprint and file SHA-256 without committing the large row payloads.
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reconciliation = JSON.parse(await fs.readFile(args.reconciliationSummary, "utf8"));
  const repository = {
    commit_sha: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim(),
    branch: execFileSync("git", ["branch", "--show-current"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim(),
  };
  const [warehouseProducts, bulkHash, warehouseHash, stagingMigrationSha, foundationMigrationSha] =
    await Promise.all([
      loadWarehouseProducts(args.warehouseProducts),
      fileSha256(args.bulkFile),
      fileSha256(args.warehouseProducts),
      fs
        .readFile(
          path.join(
            ROOT,
            "supabase",
            "migrations",
            "20260813185000_mtg_canonical_import_staging_v1.sql",
          ),
        )
        .then(sha256),
      fs
        .readFile(
          path.join(
            ROOT,
            "supabase",
            "migrations",
            "20260813190000_mtg_canonical_catalog_foundation_v1.sql",
          ),
        )
        .then(sha256),
    ]);
  if (bulkHash !== reconciliation.source_bulk.sha256) {
    throw new Error("Pinned Scryfall bulk hash does not match reconciliation");
  }
  if (warehouseHash !== reconciliation.warehouse_snapshot.sha256) {
    throw new Error("Pinned warehouse hash does not match reconciliation");
  }
  const candidateDir = path.join(args.payloadDir, "candidate_partitions");
  const payloadDir = path.join(args.payloadDir, "payloads");
  await fs.rm(args.payloadDir, { recursive: true, force: true });
  await fs.mkdir(payloadDir, { recursive: true });
  const partition = await partitionCandidates({ bulkFile: args.bulkFile, candidateDir });
  const collisionSourceRows = new Set(
    reconciliation.reconciliation.collision_samples.map(
      (row) => row.source_price_row_identity,
    ),
  );
  const tracker = uniquenessTracker();
  const batches = [];
  const orderedSets = [...partition.sets.values()].sort(
    (left, right) =>
      left.set.source_set_id.localeCompare(right.set.source_set_id) ||
      left.set.code.localeCompare(right.set.code),
  );
  for (const entry of orderedSets) {
    const loadedCandidates = await loadCandidates(path.join(candidateDir, entry.file_name));
    const resolvedSet = resolveMtgSetMetadataV1(loadedCandidates);
    const payload = buildMtgCanaryPayloadV1(
      {
        candidates: resolvedSet.candidates,
        warehouseProducts,
        collisionSourceRows,
        sourceBulkSha256: bulkHash,
        stagingMigrationSha256: stagingMigrationSha,
        foundationMigrationSha256: foundationMigrationSha,
        repository,
      },
      {
        plan_version: SET_PAYLOAD_VERSION,
        require_expansion: false,
        quality_flag: "mtg_catalog_set_batch_v1",
        include_source_card_release_evidence: true,
      },
    );
    addPayloadUniqueness(tracker, payload);
    const payloadFile = path.join(payloadDir, `${entry.set.code}__${entry.set.source_set_id}.json`);
    const payloadBody = `${JSON.stringify(payload, null, 2)}\n`;
    await fs.writeFile(payloadFile, payloadBody, "utf8");
    const alreadyCanonical = entry.set.source_set_id === DSK_SOURCE_SET_ID;
    batches.push({
      ordinal: batches.length,
      source_set_id: entry.set.source_set_id,
      code: entry.set.code,
      name: entry.set.name,
      set_type: entry.set.set_type,
      released_at: resolvedSet.set.released_at,
      observed_release_dates: resolvedSet.observed_release_dates,
      release_date_resolution: resolvedSet.release_date_resolution,
      catalog_state: alreadyCanonical ? "already_canonical_dsk" : "not_staged",
      candidate_count: payload.counts.card_prints,
      card_printings: payload.counts.card_printings,
      external_printing_mappings: payload.counts.external_printing_mappings,
      positive_market_lanes: payload.counts.positive_market_lanes,
      quarantined_collision_lanes: payload.counts.quarantined_collision_lanes,
      total_staging_rows:
        payload.counts.sets +
        payload.counts.card_prints +
        payload.counts.card_print_identity +
        payload.counts.card_printings +
        payload.counts.external_mappings +
        payload.counts.external_printing_mappings,
      writer_payload_fingerprint: payload.writer_payload_fingerprint,
      payload_file_sha256: sha256(payloadBody),
      payload_file: path.relative(ROOT, payloadFile).replaceAll("\\", "/"),
    });
  }
  const totals = sumCounts(
    batches.map((batch) => {
      const payload = {
        counts: {
          sets: 1,
          card_prints: batch.candidate_count,
          card_print_identity: batch.candidate_count,
          card_printings: batch.card_printings,
          external_mappings: batch.candidate_count,
          external_printing_mappings: batch.external_printing_mappings,
          positive_market_lanes: batch.positive_market_lanes,
          quarantined_collision_lanes: batch.quarantined_collision_lanes,
        },
      };
      return payload;
    }),
  );
  const dsk = batches.find((row) => row.catalog_state === "already_canonical_dsk");
  const manifest = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    status: "pending_validation",
    repository,
    source: {
      bulk_sha256: bulkHash,
      warehouse_sha256: warehouseHash,
      bulk_card_count: partition.bulk_count,
      candidate_payload_sha256: partition.candidate_payload_sha256,
    },
    coverage: {
      total_set_count: batches.length,
      total_candidate_count: partition.eligible_count,
      already_canonical_set_count: dsk ? 1 : 0,
      already_canonical_parent_count: dsk?.candidate_count ?? 0,
      remaining_set_count: batches.length - (dsk ? 1 : 0),
      remaining_parent_count: partition.eligible_count - (dsk?.candidate_count ?? 0),
    },
    totals,
    global_uniqueness_key_count: tracker.size,
    batches,
    next_bounded_stage_candidate: pickNextBatch(batches),
    findings: [],
    boundaries: {
      database_writes: false,
      canonical_writes: false,
      storage_writes: false,
      image_pointer_writes: false,
      pricing_writes: false,
      app_visibility: false,
      pokemon_mutation: false,
    },
  };
  manifest.findings = validateMtgCatalogBatchManifestV1(manifest, reconciliation);
  manifest.status = manifest.findings.length === 0 ? "full_catalog_batches_frozen" : "blocked";
  const outDir =
    args.outDir ??
    path.join(ROOT, "docs", "audits", "pricing", "mtg_canonical_catalog_batch_manifest_v1");
  await fs.mkdir(outDir, { recursive: true });
  const manifestBody = await writeJson(path.join(outDir, "manifest.json"), manifest);
  const reportBody = report(manifest);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: {
      "manifest.json": sha256(manifestBody),
      "REPORT.md": sha256(reportBody),
    },
  });
  process.stdout.write(
    `${JSON.stringify({
      out_dir: outDir,
      status: manifest.status,
      coverage: manifest.coverage,
      totals: manifest.totals,
      next_bounded_stage_candidate: manifest.next_bounded_stage_candidate,
      findings: manifest.findings,
    }, null, 2)}\n`,
  );
  if (manifest.findings.length > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
