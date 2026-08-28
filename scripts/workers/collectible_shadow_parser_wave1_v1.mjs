import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  COLLECTIBLE_SHADOW_PARSER_WAVE1_VERSION,
  COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_VERSION,
  collectibleShadowParserWave1SourcesV1,
  extractYugiohAlternativeArtworkEvidenceV1,
  parseGundamGcgApiCandidatesV1,
  parseYugiohYgoprodeckCandidatesV1,
} from "../../backend/catalog/collectible_shadow_parser_wave1_v1.mjs";

const DEFAULT_MAX_RESPONSE_BYTES = 128 * 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
const USER_AGENT = "GrookaiVaultShadowParser/1.0 (+https://grookai.com)";
const FROZEN_YUGIOH_ALT_ART_SOURCE_SHA256 =
  "883c6da2281e2594608c04b21280ae10bd94d0f5d642269760f698314b337a97";
const FROZEN_YUGIOH_ALT_ART_SOURCE_CARD_COUNT = 124;
const FIXTURE_YUGIOH_ALT_ART_SOURCE_SHA256 =
  "67e6c5579148eb9c8bd299c4f78c96a8a955175ded920f31090432596fd070b8";
const FIXTURE_YUGIOH_ALT_ART_SOURCE_CARD_COUNT = 1;

function expectedYugiohAltArtInput(options) {
  return options.fixtureDir ? {
    sourceSha256: FIXTURE_YUGIOH_ALT_ART_SOURCE_SHA256,
    sourceCardCount: FIXTURE_YUGIOH_ALT_ART_SOURCE_CARD_COUNT,
  } : {
    sourceSha256: FROZEN_YUGIOH_ALT_ART_SOURCE_SHA256,
    sourceCardCount: FROZEN_YUGIOH_ALT_ART_SOURCE_CARD_COUNT,
  };
}

function parseArgs(argv) {
  const options = {
    expectedHeadSha: process.env.GITHUB_SHA ?? null,
    emitYugiohAltArtIndex: false,
    fixtureDir: null,
    maxResponseBytes: DEFAULT_MAX_RESPONSE_BYTES,
    outDir: null,
    requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    sourceIds: null,
  };
  for (const token of argv) {
    if (token.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = token.slice(20);
    } else if (token === "--emit-yugioh-alt-art-index") {
      options.emitYugiohAltArtIndex = true;
    } else if (token.startsWith("--fixture-dir=")) {
      options.fixtureDir = path.resolve(token.slice(14));
    } else if (token.startsWith("--max-response-bytes=")) {
      options.maxResponseBytes = Number.parseInt(token.slice(21), 10);
    } else if (token.startsWith("--out-dir=")) {
      options.outDir = path.resolve(token.slice(10));
    } else if (token.startsWith("--request-timeout-ms=")) {
      options.requestTimeoutMs = Number.parseInt(token.slice(21), 10);
    } else if (token.startsWith("--source-ids=")) {
      options.sourceIds = new Set(token.slice(13).split(",")
        .map((value) => value.trim()).filter(Boolean));
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  if (!options.outDir) throw new Error("--out-dir is required");
  if (!Number.isInteger(options.maxResponseBytes) ||
      options.maxResponseBytes < 1_024 ||
      options.maxResponseBytes > 256 * 1024 * 1024) {
    throw new Error("--max-response-bytes must be between 1024 and 268435456");
  }
  if (!Number.isInteger(options.requestTimeoutMs) ||
      options.requestTimeoutMs < 1_000 ||
      options.requestTimeoutMs > 300_000) {
    throw new Error("--request-timeout-ms must be between 1000 and 300000");
  }
  if (options.expectedHeadSha && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha must be a lowercase 40-character SHA");
  }
  if (options.emitYugiohAltArtIndex &&
      (options.sourceIds?.size !== 1 ||
       !options.sourceIds.has("yugioh_ygoprodeck_api_v7"))) {
    throw new Error(
      "--emit-yugioh-alt-art-index requires --source-ids=yugioh_ygoprodeck_api_v7",
    );
  }
  return options;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function sanitizeSnapshotUrlV1(value) {
  const parsed = new URL(value);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function currentHeadSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

async function writeBytes(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  return bytes;
}

async function writeJson(file, value) {
  return writeBytes(file, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

async function writeJsonl(file, rows) {
  const text = rows.length === 0 ? "" : `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  return writeBytes(file, Buffer.from(text));
}

function serializeError(error) {
  return {
    message: String(error?.message ?? error),
    code: error?.code ?? null,
    cause_message: error?.cause?.message ?? null,
    cause_code: error?.cause?.code ?? null,
    evidence: error?.evidence ?? null,
  };
}

function refinementFailure(message, snapshots, evidence) {
  const error = new Error(message);
  error.snapshots = snapshots;
  error.evidence = evidence;
  return error;
}

async function readBoundedResponse(response, maxResponseBytes) {
  const declaredLength = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
    throw new Error(`response exceeds ${maxResponseBytes} bytes`);
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let byteCount = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > maxResponseBytes) {
        await reader.cancel("response size limit exceeded");
        throw new Error(`response exceeds ${maxResponseBytes} bytes`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, byteCount);
}

async function loadResource({
  fixtureDir,
  fixtureName,
  maxResponseBytes,
  parseAs,
  requestTimeoutMs,
  sourceId,
  sourceUrl,
}) {
  let bytes;
  let metadata;
  if (fixtureDir) {
    bytes = await fs.readFile(path.join(fixtureDir, fixtureName));
    if (bytes.length > maxResponseBytes) {
      throw new Error(`fixture exceeds ${maxResponseBytes} bytes`);
    }
    metadata = {
      http_status: 200,
      final_url: sourceUrl,
      content_type: parseAs === "ndjson" ? "application/x-ndjson" : "application/json",
      etag: null,
      last_modified: null,
      fixture: true,
    };
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(sourceUrl, {
        headers: {
          Accept: parseAs === "ndjson" ? "application/x-ndjson,application/json" : "application/json",
          "User-Agent": USER_AGENT,
        },
        redirect: "follow",
        signal: controller.signal,
      });
      bytes = await readBoundedResponse(response, maxResponseBytes);
      metadata = {
        http_status: response.status,
        final_url: sanitizeSnapshotUrlV1(response.url),
        content_type: response.headers.get("content-type"),
        etag: response.headers.get("etag"),
        last_modified: response.headers.get("last-modified"),
        fixture: false,
      };
      if (!response.ok) throw new Error(`${sourceUrl} returned HTTP ${response.status}`);
    } finally {
      clearTimeout(timeout);
    }
  }
  const responseSha256 = sha256(bytes);
  const text = bytes.toString("utf8");
  const value = parseAs === "ndjson"
    ? text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line))
    : JSON.parse(text);
  return {
    value,
    snapshot: {
      source_id: sourceId,
      source_url: sourceUrl,
      response_bytes: bytes.length,
      response_sha256: responseSha256,
      body_persisted: false,
      ...metadata,
    },
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function validateYugiohAuxiliaryPayloadsV1(manifest, sets) {
  if (!Array.isArray(manifest) || manifest.length === 0 ||
      !String(manifest[0]?.database_version ?? "").trim() ||
      !String(manifest[0]?.last_update ?? "").trim()) {
    throw new Error("YGOPRODeck manifest payload is malformed");
  }
  if (!Array.isArray(sets) || sets.length === 0 ||
      sets.some((row) => !String(row?.set_name ?? "").trim())) {
    throw new Error("YGOPRODeck set manifest payload is malformed");
  }
}

export function validateGundamAuxiliaryPayloadsV1(manifest, sets) {
  const manifestCount = Number(manifest?.card_count);
  if (!String(manifest?.dataset_version ?? "").trim() ||
      !Number.isInteger(manifestCount) || manifestCount < 0) {
    throw new Error("Gundam manifest payload is malformed");
  }
  if (!Array.isArray(sets?.data) || sets.data.length === 0 ||
      sets.data.some((row) => !String(row?.set_code ?? "").trim())) {
    throw new Error("Gundam set manifest payload is malformed");
  }
}

async function runYugioh(binding, options) {
  const prefix = binding.source.source_id;
  const [manifest, sets, cards] = await Promise.all([
    loadResource({
      fixtureDir: options.fixtureDir,
      fixtureName: `${prefix}.manifest.json`,
      maxResponseBytes: options.maxResponseBytes,
      parseAs: "json",
      requestTimeoutMs: options.requestTimeoutMs,
      sourceId: prefix,
      sourceUrl: binding.source.manifest_url,
    }),
    loadResource({
      fixtureDir: options.fixtureDir,
      fixtureName: `${prefix}.sets.json`,
      maxResponseBytes: options.maxResponseBytes,
      parseAs: "json",
      requestTimeoutMs: options.requestTimeoutMs,
      sourceId: prefix,
      sourceUrl: binding.source.set_manifest_url,
    }),
    loadResource({
      fixtureDir: options.fixtureDir,
      fixtureName: `${prefix}.data.json`,
      maxResponseBytes: options.maxResponseBytes,
      parseAs: "json",
      requestTimeoutMs: options.requestTimeoutMs,
      sourceId: prefix,
      sourceUrl: binding.source.data_url,
    }),
  ]);
  validateYugiohAuxiliaryPayloadsV1(manifest.value, sets.value);
  const parsed = parseYugiohYgoprodeckCandidatesV1(
    cards.value,
    cards.snapshot.response_sha256,
  );
  const sourceSnapshots = [manifest.snapshot, sets.snapshot, cards.snapshot];
  let alternativeArtworkEvidence = [];
  if (options.emitYugiohAltArtIndex) {
    const expectedInput = expectedYugiohAltArtInput(options);
    if (cards.snapshot.response_sha256 !== expectedInput.sourceSha256) {
      throw refinementFailure(
        "YGOPRODeck source response drifted from the frozen refinement input",
        sourceSnapshots,
        {
          expected_source_sha256: expectedInput.sourceSha256,
          observed_source_sha256: cards.snapshot.response_sha256,
        },
      );
    }
    alternativeArtworkEvidence = extractYugiohAlternativeArtworkEvidenceV1(
      cards.value,
      cards.snapshot.response_sha256,
      parsed.candidates,
    );
    if (alternativeArtworkEvidence.length !== expectedInput.sourceCardCount) {
      throw refinementFailure(
        "YGOPRODeck alternative-artwork source-card count drifted",
        sourceSnapshots,
        {
          expected_source_card_count: expectedInput.sourceCardCount,
          observed_source_card_count: alternativeArtworkEvidence.length,
          source_sha256: cards.snapshot.response_sha256,
        },
      );
    }
  }
  const expectedSetNames = unique((Array.isArray(sets.value) ? sets.value : [])
    .map((row) => String(row?.set_name ?? "").trim()));
  const observedSetNames = unique(parsed.candidates
    .map((row) => row.identity_coordinates.set_or_product));
  const observed = new Set(observedSetNames);
  const missingSets = expectedSetNames.filter((name) => !observed.has(name));
  return {
    source_id: prefix,
    status: parsed.failures.length === 0 ? "parsed" : "parsed_with_failures",
    candidates: parsed.candidates,
    failures: parsed.failures.map((row) => ({ source_id: prefix, ...row })),
    alternative_artwork_evidence: alternativeArtworkEvidence,
    snapshots: sourceSnapshots,
    completeness: {
      source_id: prefix,
      database_version: manifest.value?.[0]?.database_version ?? null,
      database_last_update: manifest.value?.[0]?.last_update ?? null,
      ...parsed.metrics,
      set_manifest_count: expectedSetNames.length,
      observed_set_count: observedSetNames.length,
      set_manifest_names_without_candidates: missingSets,
      unresolved_variant_classes: {
        alternative_artwork_mapping: parsed.metrics.cards_with_unresolved_alternative_artwork,
      },
      alternative_artwork_row_addressability: options.emitYugiohAltArtIndex ? {
        evidence_version: COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_VERSION,
        source_card_count: alternativeArtworkEvidence.length,
        printing_candidate_reference_count: alternativeArtworkEvidence.reduce(
          (sum, row) => sum + row.source_printing_candidate_count, 0),
        source_cards_without_printing_candidates: alternativeArtworkEvidence.filter(
          (row) => row.source_printing_candidate_count === 0).length,
        artwork_to_printing_mapping_status: "unresolved",
      } : null,
      review_status: parsed.failures.length === 0 && missingSets.length === 0
        ? "likely_complete"
        : "needs_review",
    },
  };
}

async function runGundam(binding, options) {
  const prefix = binding.source.source_id;
  const [manifest, sets, cards] = await Promise.all([
    loadResource({
      fixtureDir: options.fixtureDir,
      fixtureName: `${prefix}.manifest.json`,
      maxResponseBytes: options.maxResponseBytes,
      parseAs: "json",
      requestTimeoutMs: options.requestTimeoutMs,
      sourceId: prefix,
      sourceUrl: binding.source.manifest_url,
    }),
    loadResource({
      fixtureDir: options.fixtureDir,
      fixtureName: `${prefix}.sets.json`,
      maxResponseBytes: options.maxResponseBytes,
      parseAs: "json",
      requestTimeoutMs: options.requestTimeoutMs,
      sourceId: prefix,
      sourceUrl: binding.source.set_manifest_url,
    }),
    loadResource({
      fixtureDir: options.fixtureDir,
      fixtureName: `${prefix}.data.ndjson`,
      maxResponseBytes: options.maxResponseBytes,
      parseAs: "ndjson",
      requestTimeoutMs: options.requestTimeoutMs,
      sourceId: prefix,
      sourceUrl: binding.source.data_url,
    }),
  ]);
  validateGundamAuxiliaryPayloadsV1(manifest.value, sets.value);
  const parsed = parseGundamGcgApiCandidatesV1(
    cards.value,
    cards.snapshot.response_sha256,
  );
  const expectedSetCodes = unique((sets.value?.data ?? [])
    .map((row) => String(row?.set_code ?? "").trim()));
  const observedSetCodes = unique(parsed.candidates
    .map((row) => row.identity_coordinates.set_code));
  const observed = new Set(observedSetCodes);
  const missingSets = expectedSetCodes.filter((code) => !observed.has(code));
  const manifestCount = Number(manifest.value?.card_count ?? 0);
  const countMatches = manifestCount === parsed.metrics.source_card_count;
  return {
    source_id: prefix,
    status: parsed.failures.length === 0 ? "parsed" : "parsed_with_failures",
    candidates: parsed.candidates,
    failures: parsed.failures.map((row) => ({ source_id: prefix, ...row })),
    snapshots: [manifest.snapshot, sets.snapshot, cards.snapshot],
    completeness: {
      source_id: prefix,
      dataset_version: manifest.value?.dataset_version ?? null,
      manifest_card_count: manifestCount,
      manifest_count_matches_payload: countMatches,
      ...parsed.metrics,
      set_manifest_count: expectedSetCodes.length,
      observed_set_count: observedSetCodes.length,
      set_manifest_codes_without_candidates: missingSets,
      review_status: parsed.failures.length === 0 && countMatches && missingSets.length === 0
        ? "likely_complete"
        : "needs_review",
    },
  };
}

async function runSource(binding, options) {
  try {
    if (binding.source.source_id === "yugioh_ygoprodeck_api_v7") {
      return await runYugioh(binding, options);
    }
    if (binding.source.source_id === "gundam_gcg_api_v1") {
      return await runGundam(binding, options);
    }
    throw new Error(`No parser for ${binding.source.source_id}`);
  } catch (error) {
    return {
      source_id: binding.source.source_id,
      status: "source_failed",
      candidates: [],
      alternative_artwork_evidence: [],
      failures: [{
        source_id: binding.source.source_id,
        failure_class: "source_or_parser_failure",
        error: serializeError(error),
      }],
      snapshots: Array.isArray(error?.snapshots) ? error.snapshots : [],
      completeness: {
        source_id: binding.source.source_id,
        review_status: "source_failed",
        error: serializeError(error),
      },
    };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (process.env.CATALOG_AUTOMATION_MODE !== "shadow-only") {
    throw new Error("CATALOG_AUTOMATION_MODE must equal shadow-only");
  }
  const actualHeadSha = currentHeadSha();
  if (options.expectedHeadSha && options.expectedHeadSha !== actualHeadSha) {
    throw new Error("Current HEAD does not match --expected-head-sha");
  }
  const available = collectibleShadowParserWave1SourcesV1();
  const selected = available.filter((binding) =>
    !options.sourceIds || options.sourceIds.has(binding.source.source_id));
  if (options.sourceIds) {
    const selectedIds = new Set(selected.map((binding) => binding.source.source_id));
    const missing = [...options.sourceIds].filter((id) => !selectedIds.has(id));
    if (missing.length > 0) throw new Error(`Unknown parser sources: ${missing.join(",")}`);
  }
  if (selected.length === 0) throw new Error("No parser sources selected");

  const boundaries = {
    database_access: false,
    database_writes: false,
    storage_writes: false,
    image_downloads: false,
    image_url_persistence: false,
    source_text_persistence: false,
    pricing_persistence: false,
    canonical_writes: false,
    writer_dispatches: false,
  };
  const expectedAltArtInput = expectedYugiohAltArtInput(options);
  const runPlan = {
    version: COLLECTIBLE_SHADOW_PARSER_WAVE1_VERSION,
    mode: "shadow-only",
    expected_head_sha: options.expectedHeadSha,
    actual_head_sha: actualHeadSha,
    fixture_mode: Boolean(options.fixtureDir),
    emit_yugioh_alt_art_index: options.emitYugiohAltArtIndex,
    alt_art_refinement: options.emitYugiohAltArtIndex ? {
      version: COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_VERSION,
      expected_source_sha256: expectedAltArtInput.sourceSha256,
      expected_source_card_count: expectedAltArtInput.sourceCardCount,
      mapping_authority: "unresolved_artwork_to_printing",
    } : null,
    max_response_bytes: options.maxResponseBytes,
    request_timeout_ms: options.requestTimeoutMs,
    sources: selected.map((binding) => ({
      adapter_id: binding.adapter.adapter_id,
      source_id: binding.source.source_id,
      data_url: binding.source.data_url,
      source_authority: binding.source.source_authority,
      data_license: binding.source.data_license,
      allowed_persistence: binding.source.allowed_persistence,
    })),
    boundaries,
    runtime: {
      node_version: process.version,
      platform: process.platform,
      system_ca_enabled: String(process.env.NODE_OPTIONS ?? "")
        .split(/\s+/).includes("--use-system-ca"),
    },
  };
  const artifacts = [];
  const planBytes = await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);
  artifacts.push({ path: "run_plan.json", bytes: planBytes.length, sha256: sha256(planBytes) });

  const results = await Promise.all(selected.map((binding) => runSource(binding, options)));
  const candidates = results.flatMap((row) => row.candidates)
    .sort((left, right) => left.shadow_candidate_id.localeCompare(right.shadow_candidate_id));
  const failures = results.flatMap((row) => row.failures);
  const alternativeArtworkEvidence = results.flatMap(
    (row) => row.alternative_artwork_evidence ?? [],
  ).sort((left, right) =>
    left.variant_evidence_id.localeCompare(right.variant_evidence_id));
  const snapshots = results.flatMap((row) => row.snapshots);
  const completeness = results.map((row) => row.completeness);
  const duplicateIds = candidates.map((row) => row.shadow_candidate_id)
    .filter((id, index, values) => values.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate candidate IDs across sources: ${unique(duplicateIds).join(",")}`);
  }
  const sourceFailures = results.filter((row) => row.status === "source_failed");
  const reviewSources = completeness.filter((row) => row.review_status !== "likely_complete");
  const summary = {
    version: COLLECTIBLE_SHADOW_PARSER_WAVE1_VERSION,
    mode: "shadow-only",
    status: sourceFailures.length > 0
      ? "completed_with_source_failures"
      : reviewSources.length > 0
        ? "completed_with_review_findings"
        : "completed",
    selected_source_count: selected.length,
    parsed_source_count: results.length - sourceFailures.length,
    failed_source_count: sourceFailures.length,
    candidate_count: candidates.length,
    validation_failure_count: failures.length,
    review_source_count: reviewSources.length,
    alternative_artwork_source_card_count: alternativeArtworkEvidence.length,
    alternative_artwork_printing_candidate_reference_count:
      alternativeArtworkEvidence.reduce(
        (sum, row) => sum + row.source_printing_candidate_count, 0),
    source_statuses: Object.fromEntries(results.map((row) => [row.source_id, row.status])),
    boundaries,
    completed_at: new Date().toISOString(),
  };
  const outputArtifacts = [
    ["candidate_index.jsonl", candidates, writeJsonl],
    ["validation_failures.jsonl", failures, writeJsonl],
    ["source_snapshots.json", snapshots, writeJson],
    ["completeness_report.json", completeness, writeJson],
    ["summary.json", summary, writeJson],
  ];
  if (options.emitYugiohAltArtIndex) {
    outputArtifacts.splice(1, 0, [
      "alternative_artwork_index.jsonl",
      alternativeArtworkEvidence,
      writeJsonl,
    ]);
  }
  for (const [name, value, writer] of outputArtifacts) {
    const bytes = await writer(path.join(options.outDir, name), value);
    artifacts.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    algorithm: "sha256",
    artifacts,
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (options.emitYugiohAltArtIndex &&
      (sourceFailures.length > 0 ||
       alternativeArtworkEvidence.length !== expectedAltArtInput.sourceCardCount)) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
