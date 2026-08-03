import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classifyMarketListingProductKindV2 } from "../../backend/pricing/market_listing_product_kind_v2.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_SOURCE = "docs/audits/market_evidence_engine_v1/mee_11f_market_listing_broad_intake_smoke_2026-06-25T23-00-35-379Z.json";
const OUTPUT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_listing_warehouse_v2");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function countInto(counts, key) {
  if (key) counts[key] = (counts[key] ?? 0) + 1;
}

function sorted(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function sourceArg(argv) {
  return argv.find((entry) => entry.startsWith("--source="))?.slice("--source=".length) ?? DEFAULT_SOURCE;
}

function renderMarkdown(report) {
  return [
    "# Market Listing Product Kind V2 Offline Replay",
    "",
    `- Source rows: \`${report.summary.source_observation_count}\``,
    `- Provider calls: \`0\``,
    `- Database writes: \`0\``,
    `- Canonical assignments: \`0\``,
    "",
    "## Product Kinds",
    "",
    "```json",
    JSON.stringify(report.summary.product_kind_counts, null, 2),
    "```",
    "",
    "## Sealed Phrase Repair",
    "",
    `- V1 rows carrying a sealed exclusion flag: \`${report.summary.v1_sealed_flag_count}\``,
    `- Reclassified as raw/graded card evidence: \`${report.summary.v1_sealed_flag_suppressed_to_card_count}\``,
    `- Reclassified as sealed product evidence: \`${report.summary.v1_sealed_flag_confirmed_product_count}\``,
    `- Rows with independently preserved sealed-packaging evidence: \`${report.summary.sealed_packaging_observation_count}\``,
    "",
    "## Boundary",
    "",
    "- This replay does not prove sealed-category coverage because the V1 source used the individual-card category.",
    "- It proves the V2 classifier preserves likely sealed products without treating every sealed phrase as a sealed product.",
    "- Exact card printing, grade identity, and sealed product identity remain deferred.",
    "",
    "## Samples",
    "",
    "```json",
    JSON.stringify(report.samples, null, 2),
    "```",
    "",
  ].join("\n");
}

export function buildProductKindReplayV2(sourcePayload, { sourcePath = null, sourceHash = null, generatedAt = new Date().toISOString() } = {}) {
  const itemById = new Map();
  for (const snapshot of sourcePayload?.raw_snapshots ?? []) {
    for (const item of snapshot?.raw_payload?.itemSummaries ?? []) {
      const id = item?.itemId ?? item?.legacyItemId;
      if (id && !itemById.has(id)) itemById.set(id, item);
    }
  }
  const productKindCounts = {};
  let v1SealedFlagCount = 0;
  let v1SealedFlagSuppressedToCardCount = 0;
  let v1SealedFlagConfirmedProductCount = 0;
  let sealedPackagingObservationCount = 0;
  const samples = {};
  for (const observation of sourcePayload?.projected_observations ?? []) {
    const item = itemById.get(observation.source_listing_id);
    const classified = classifyMarketListingProductKindV2({
      title: observation.listing_title,
      conditionText: observation.condition_text,
      conditionId: item?.conditionId,
      itemCategories: item?.categories,
      acquisitionProductKind: "raw_single",
      acquisitionCategoryIds: ["183454"],
    });
    countInto(productKindCounts, classified.product_kind);
    if (classified.packaging_state === "sealed") sealedPackagingObservationCount += 1;
    if ((samples[classified.product_kind] ?? []).length < 5) {
      (samples[classified.product_kind] ??= []).push({
        source_listing_id: observation.source_listing_id,
        title: observation.listing_title,
        product_kind: classified.product_kind,
        confidence: classified.product_kind_confidence,
        evidence: classified.product_kind_evidence,
      });
    }
    const hadSealedFlag = (observation.ingestion_exclusion_flags ?? []).includes("sealed");
    if (hadSealedFlag) {
      v1SealedFlagCount += 1;
      if (["raw_single", "graded_single"].includes(classified.product_kind)) v1SealedFlagSuppressedToCardCount += 1;
      if (classified.product_kind === "sealed_product") v1SealedFlagConfirmedProductCount += 1;
    }
  }
  return {
    package_id: "MARKET-LISTING-PRODUCT-KIND-REPLAY-V2",
    version: "MEE_MARKET_LISTING_PRODUCT_KIND_REPLAY_V2",
    generated_at: generatedAt,
    source_path: sourcePath,
    source_hash_sha256: sourceHash,
    summary: {
      source_observation_count: sourcePayload?.projected_observations?.length ?? 0,
      product_kind_counts: sorted(productKindCounts),
      v1_sealed_flag_count: v1SealedFlagCount,
      v1_sealed_flag_suppressed_to_card_count: v1SealedFlagSuppressedToCardCount,
      v1_sealed_flag_confirmed_product_count: v1SealedFlagConfirmedProductCount,
      sealed_packaging_observation_count: sealedPackagingObservationCount,
    },
    samples,
    boundary: {
      provider_calls: false,
      db_writes: false,
      canonical_assignment_writes: false,
      publication_writes: false,
    },
  };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const relativeSource = sourceArg(process.argv.slice(2));
  const sourcePath = path.resolve(REPO_ROOT, relativeSource);
  const sourceText = readFileSync(sourcePath, "utf8");
  const report = buildProductKindReplayV2(JSON.parse(sourceText), {
    sourcePath: path.relative(REPO_ROOT, sourcePath).replaceAll("\\", "/"),
    sourceHash: sha256(sourceText),
  });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(OUTPUT_DIR, `product_kind_replay_${stamp}.json`);
  const mdPath = path.join(OUTPUT_DIR, `product_kind_replay_${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  console.log(JSON.stringify({ summary: report.summary, artifacts: { json: jsonPath, markdown: mdPath } }, null, 2));
}
