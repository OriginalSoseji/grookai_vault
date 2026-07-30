import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { brotliDecompressSync } from "node:zlib";

function repoFile(relativePath) {
  return new URL(`../../${relativePath}`, import.meta.url);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const manifest = JSON.parse(
  readFileSync(
    repoFile("apps/web/private/review/visual-search/manifest.json"),
    "utf8",
  ),
);
const bundle = readFileSync(
  repoFile(
    "apps/web/private/review/visual-search/CALIBRATION_REVIEW_DASHBOARD.html.br",
  ),
);
const dashboardBuffer = brotliDecompressSync(bundle);
const dashboard = dashboardBuffer.toString("utf8");
const packetPrefix = "const packet=";
const packetSuffix = ";\nconst labels=";
const packetStart = dashboard.indexOf(packetPrefix) + packetPrefix.length;
const packetEnd = dashboard.indexOf(packetSuffix, packetStart);
const packet = JSON.parse(dashboard.slice(packetStart, packetEnd));
const route = readFileSync(
  repoFile(
    "apps/web/src/app/api/review/visual-search/dashboard/route.ts",
  ),
  "utf8",
);

test("V2 review portal bundle reconciles to the immutable final calibration packet", () => {
  assert.equal(
    manifest.bundle_version,
    "CARD_VISUAL_SEARCH_REVIEW_PORTAL_BUNDLE_V2",
  );
  assert.equal(bundle.byteLength, manifest.bundle_bytes);
  assert.equal(sha256(bundle), manifest.bundle_sha256);
  assert.equal(dashboardBuffer.byteLength, manifest.source_html_bytes);
  assert.equal(sha256(dashboardBuffer), manifest.source_html_sha256);
  assert.equal(packet.run_key, manifest.packet_run_key);
  assert.equal(packet.commit_sha, manifest.source_commit_sha);
  assert.equal(packet.calibration_query_count, 200);
  assert.equal(packet.holdout_query_count, 0);
  assert.equal(packet.queries.length, 200);
  assert.equal(
    Object.keys(packet.saved_visual_records_by_card_id).length,
    manifest.saved_visual_record_count,
  );
  assert.equal(packet.image_resolution.required_card_ids, 678);
  assert.equal(packet.image_resolution.resolved_source_records, 678);
  assert.equal(packet.image_resolution.resolved_images, 678);
  assert.deepEqual(packet.image_resolution.missing_source_record_ids, []);
  assert.deepEqual(packet.image_resolution.missing_image_ids, []);
  assert.deepEqual(packet.image_resolution.unreadable_sources, []);
});

test("review progress is run-key isolated, browser-local, and export-only", () => {
  assert.equal(manifest.server_writes, false);
  assert.equal(manifest.browser_local_storage_only, true);
  assert.equal(manifest.jsonl_export_only, true);
  assert.match(
    dashboard,
    /const storageKey="grookai-visual-search-calibration:"\+packet\.run_key/,
  );
  assert.match(dashboard, /localStorage\.setItem\(storageKey/);
  assert.match(dashboard, /CARD_VISUAL_SEARCH_JUDGMENTS_V1_/);
  assert.doesNotMatch(
    dashboard,
    /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/u,
  );
});

test("portal route requires reviewer auth and verifies the immutable bundle", () => {
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /resolveVisualSearchReviewerAccess\(user\)/);
  assert.match(route, /manifest\.server_writes !== false/);
  assert.match(route, /manifest\.holdout_query_count !== 0/);
  assert.match(route, /sha256\(bundle\) !== manifest\.bundle_sha256/);
  assert.match(route, /"Cache-Control": "private, no-store, max-age=0"/);
  assert.match(route, /"connect-src 'none'"/);
  assert.doesNotMatch(
    route,
    /createServerAdminClient|service_role|\.insert\s*\(|\.upsert\s*\(|\.delete\s*\(/u,
  );
});
