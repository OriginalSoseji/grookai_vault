import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { brotliCompress as brotliCompressCallback, constants as zlibConstants } from "node:zlib";

export const CARD_VISUAL_SEARCH_REVIEW_PORTAL_BUNDLE_VERSION =
  "CARD_VISUAL_SEARCH_REVIEW_PORTAL_BUNDLE_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_SOURCE_PACKET_DIR =
  "docs/audits/card_visual_search_judgment_packet_v1/2026-07-22T05-07-32-269Z_packet_dbd10cbc7ca6";
const DEFAULT_OUTPUT_DIR = "apps/web/private/review/visual-search";
const brotliCompress = promisify(brotliCompressCallback);

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function posixRelative(value) {
  return path.relative(REPO_ROOT, value).replace(/\\/gu, "/");
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const value = argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

export function parseCardVisualSearchReviewPortalBundleArgsV1(argv = []) {
  return {
    sourcePacketDir:
      parseFlag(argv, "source-packet-dir") ?? DEFAULT_SOURCE_PACKET_DIR,
    outputDir: parseFlag(argv, "output-dir") ?? DEFAULT_OUTPUT_DIR,
  };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertNoRuntimeWritePath(html) {
  const forbidden = [
    /fetch\s*\(/iu,
    /XMLHttpRequest/iu,
    /supabase/iu,
    /openai/iu,
    /indexedDB/iu,
    /navigator\.sendBeacon/iu,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(html)) {
      throw new Error(`dashboard contains forbidden runtime path: ${pattern}`);
    }
  }
}

export function validateCardVisualSearchReviewPortalSourceV1({
  packet,
  report,
  html,
}) {
  if (packet.calibration_query_count !== 200 || packet.queries?.length !== 200) {
    throw new Error("review portal requires exactly 200 calibration queries");
  }
  if (packet.holdout_query_count !== 0 || report.holdout_queries !== 0) {
    throw new Error("review portal bundle must not contain holdout queries");
  }
  if (report.reconciled !== true) {
    throw new Error("source judgment packet must be reconciled");
  }
  if (packet.run_key !== report.run_key) {
    throw new Error("packet/report run key mismatch");
  }
  const sourceRecordCount = Object.keys(
    packet.saved_visual_records_by_card_id ?? {},
  ).length;
  if (
    sourceRecordCount === 0 ||
    report.saved_visual_record_count !== sourceRecordCount ||
    packet.image_resolution?.resolved_source_records !== sourceRecordCount ||
    packet.image_resolution?.resolved_images !== sourceRecordCount
  ) {
    throw new Error("saved visual record/image reconciliation failed");
  }
  if (
    packet.image_resolution?.missing_source_record_ids?.length ||
    packet.image_resolution?.missing_image_ids?.length ||
    packet.image_resolution?.missing_inventory_ids?.length ||
    packet.image_resolution?.unreadable_sources?.length
  ) {
    throw new Error("review portal source contains missing records or images");
  }
  if (Object.values(packet.boundaries ?? {}).some((value) => value !== false)) {
    throw new Error("review portal source boundary is not read-only");
  }
  if (!html.includes("localStorage") || !html.includes("Export JSONL")) {
    throw new Error("dashboard must preserve local-only progress and JSONL export");
  }
  if (
    !html.includes("click to inspect image") ||
    !html.includes("Exact saved generated row JSON")
  ) {
    throw new Error("dashboard must preserve image-paired complete evidence review");
  }
  assertNoRuntimeWritePath(html);
  return {
    calibration_query_count: packet.calibration_query_count,
    holdout_query_count: packet.holdout_query_count,
    saved_visual_record_count: sourceRecordCount,
  };
}

export async function buildCardVisualSearchReviewPortalBundleV1(args) {
  const sourceDir = repoPath(args.sourcePacketDir);
  const outputDir = repoPath(args.outputDir);
  const [packetText, reportText, html] = await Promise.all([
    fs.readFile(path.join(sourceDir, "calibration_review_packet.json"), "utf8"),
    fs.readFile(path.join(sourceDir, "JUDGMENT_PACKET_REPORT.json"), "utf8"),
    fs.readFile(path.join(sourceDir, "CALIBRATION_REVIEW_DASHBOARD.html"), "utf8"),
  ]);
  const packet = JSON.parse(packetText);
  const report = JSON.parse(reportText);
  const counts = validateCardVisualSearchReviewPortalSourceV1({
    packet,
    report,
    html,
  });
  const sourceBytes = Buffer.from(html, "utf8");
  const bundle = await brotliCompress(sourceBytes, {
    params: {
      [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
    },
  });
  const manifest = {
    bundle_version: CARD_VISUAL_SEARCH_REVIEW_PORTAL_BUNDLE_VERSION,
    created_at: new Date().toISOString(),
    source_packet_dir: posixRelative(sourceDir),
    packet_version: packet.packet_version,
    packet_run_key: packet.run_key,
    source_commit_sha: packet.commit_sha,
    calibration_query_count: counts.calibration_query_count,
    holdout_query_count: counts.holdout_query_count,
    saved_visual_record_count: counts.saved_visual_record_count,
    server_writes: false,
    browser_local_storage_only: true,
    jsonl_export_only: true,
    source_html_sha256: sha256(sourceBytes),
    source_html_bytes: sourceBytes.byteLength,
    bundle_sha256: sha256(bundle),
    bundle_bytes: bundle.byteLength,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(
      path.join(outputDir, "CALIBRATION_REVIEW_DASHBOARD.html.br"),
      bundle,
    ),
    fs.writeFile(
      path.join(outputDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    ),
  ]);
  return { outputDir, manifest };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await buildCardVisualSearchReviewPortalBundleV1(
    parseCardVisualSearchReviewPortalBundleArgsV1(argv),
  );
  console.log(
    `[card-visual-search-review-portal] output_dir=${posixRelative(result.outputDir)}`,
  );
  console.log(
    `[card-visual-search-review-portal] packet_run_key=${result.manifest.packet_run_key}`,
  );
  console.log(
    `[card-visual-search-review-portal] bundle_bytes=${result.manifest.bundle_bytes}`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
