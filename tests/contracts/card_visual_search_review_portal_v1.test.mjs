import assert from "node:assert/strict";
import { brotliDecompressSync } from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CARD_VISUAL_SEARCH_REVIEW_PORTAL_BUNDLE_VERSION,
  validateCardVisualSearchReviewPortalSourceV1,
} from "../../scripts/audits/build_card_visual_search_review_portal_bundle_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRIVATE_DIR = path.join(
  ROOT,
  "apps/web/private/review/visual-search",
);

function fixture() {
  const sourceRecord = { generated_row: { card_print_id: "card-1" } };
  return {
    packet: {
      calibration_query_count: 200,
      holdout_query_count: 0,
      queries: Array.from({ length: 200 }, (_, index) => ({ query_id: index + 1 })),
      run_key: "run-1",
      boundaries: {
        provider_calls: false,
        database_connection: false,
        database_writes: false,
        approvals: false,
        embeddings: false,
        persistent_index_writes: false,
        holdout_exposed: false,
        public_reads: false,
      },
      saved_visual_records_by_card_id: { "card-1": sourceRecord },
      image_resolution: {
        resolved_source_records: 1,
        resolved_images: 1,
        missing_source_record_ids: [],
        missing_image_ids: [],
        missing_inventory_ids: [],
        unreadable_sources: [],
      },
    },
    report: {
      run_key: "run-1",
      reconciled: true,
      holdout_queries: 0,
      saved_visual_record_count: 1,
    },
    html: "localStorage Export JSONL click to inspect image Exact saved generated row JSON",
  };
}

test("portal source validation accepts reconciled calibration-only local export", () => {
  assert.deepEqual(validateCardVisualSearchReviewPortalSourceV1(fixture()), {
    calibration_query_count: 200,
    holdout_query_count: 0,
    saved_visual_record_count: 1,
  });
});

test("portal source validation rejects holdout exposure and runtime network paths", () => {
  const holdout = fixture();
  holdout.packet.holdout_query_count = 1;
  assert.throws(
    () => validateCardVisualSearchReviewPortalSourceV1(holdout),
    /must not contain holdout/u,
  );

  const network = fixture();
  network.html += " fetch('/write')";
  assert.throws(
    () => validateCardVisualSearchReviewPortalSourceV1(network),
    /forbidden runtime path/u,
  );
});

test("private bundle is calibration-only image-paired and export-only", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(PRIVATE_DIR, "manifest.json"), "utf8"),
  );
  const compressed = fs.readFileSync(
    path.join(PRIVATE_DIR, "CALIBRATION_REVIEW_DASHBOARD.html.br"),
  );
  const html = brotliDecompressSync(compressed).toString("utf8");

  assert.equal(manifest.bundle_version, CARD_VISUAL_SEARCH_REVIEW_PORTAL_BUNDLE_VERSION);
  assert.equal(manifest.calibration_query_count, 200);
  assert.equal(manifest.holdout_query_count, 0);
  assert.equal(manifest.saved_visual_record_count, 753);
  assert.equal(manifest.server_writes, false);
  assert.equal(manifest.browser_local_storage_only, true);
  assert.equal(manifest.jsonl_export_only, true);
  assert.match(html, /Read-only portal/u);
  assert.match(html, /click to inspect image/u);
  assert.match(html, /Exact saved generated row JSON/u);
  assert.match(html, /Export JSONL/u);
  assert.doesNotMatch(html, /fetch\s*\(|XMLHttpRequest|supabase|openai/iu);
});

test("portal routes authorize fixed identities and contain no server write client", () => {
  const access = fs.readFileSync(
    path.join(ROOT, "apps/web/src/lib/review/visualSearchReviewerAccess.ts"),
    "utf8",
  );
  const page = fs.readFileSync(
    path.join(ROOT, "apps/web/src/app/review/visual-search/page.tsx"),
    "utf8",
  );
  const route = fs.readFileSync(
    path.join(
      ROOT,
      "apps/web/src/app/api/review/visual-search/dashboard/route.ts",
    ),
    "utf8",
  );
  const routeAccess = fs.readFileSync(
    path.join(ROOT, "apps/web/src/lib/auth/routeAccess.ts"),
    "utf8",
  );

  assert.match(access, /POKEJAVI_AUTH_USER_ID/u);
  assert.match(access, /canUseFounderTools/u);
  assert.match(page, /requireServerUser/u);
  assert.match(page, /resolveVisualSearchReviewerAccess/u);
  assert.match(route, /export async function GET/u);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/u);
  assert.doesNotMatch(
    route,
    /createServerAdminClient|\.from\(|\.insert\(|\.upsert\(|\.delete\(/u,
  );
  assert.match(routeAccess, /"\/review"/u);
});
