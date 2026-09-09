import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

import { PACKAGE_ID, fetchExistingCandidateMap, fetchExistingNormalizedKeys } from "../../scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE reference warehouse delta writer is guarded and non-public", () => {
  const script = source("scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs");
  const pkg = source("package.json");

  assert.equal(PACKAGE_ID, "MEE-REFERENCE-WAREHOUSE-DELTA-WRITER-V1");
  assert.match(pkg, /mee:reference-warehouse-delta-writer:dry-run/);
  assert.match(pkg, /mee:reference-warehouse-delta-writer:run/);
  assert.match(script, /dry_run_read_only_no_writes/);
  assert.match(script, /MEE_REFERENCE_WAREHOUSE_DELTA_ALLOW_RUN/);
  assert.match(script, /guarded_run_missing_rows_only/);
  assert.match(script, /market_reference_candidates/);
  assert.match(script, /market_reference_normalized_evidence/);
  assert.match(script, /SUPABASE_DB_URL/);
  assert.match(script, /REFERENCE_WAREHOUSE_TABLES/);
  assert.match(script, /unsafe table for pg count/);
  assert.match(script, /countRowsBySourceWithPg/);
  assert.match(script, /fetchExistingCandidateMapWithPg/);
  assert.match(script, /fetchExistingNormalizedKeysWithPg/);
  assert.match(script, /resolveMeeArtifactInputV1\(REPO_ROOT, item\.acquisitionPath\)/);
  assert.match(script, /resolveMeeArtifactInputV1\(REPO_ROOT, item\.normalizedPath\)/);
  assert.match(script, /db_writes:\s*run\s*&&\s*applyResults\.some/);
  assert.match(script, /pricing_observations_writes:\s*false/);
  assert.match(script, /ebay_active_prices_latest_writes:\s*false/);
  assert.match(script, /public_pricing_views:\s*false/);
  assert.match(script, /app_visible_pricing:\s*false/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
  assert.doesNotMatch(script, /\.from\(["']card_prints["']\)\.(?:insert|update|upsert|delete)/);
  assert.doesNotMatch(script, /\.from\(["']card_printings["']\)\.(?:insert|update|upsert|delete)/);
  assert.doesNotMatch(script, /\.upsert\s*\(|\.delete\s*\(/);
});

test("MEE reference warehouse delta writer checks all reference sources", () => {
  const script = source("scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs");

  assert.match(script, /tcgdex_tcgplayer_reference/);
  assert.match(script, /tcgdex_cardmarket_reference/);
  assert.match(script, /pokemontcg_io_reference/);
  assert.match(script, /tcgcsv_reference/);
  assert.match(script, /tcgdex_candidate_row_manifest_missing/);
  assert.match(script, /market_reference_candidates/);
  assert.match(script, /market_reference_normalized_evidence/);
});

test("MEE reference delta lookups are bounded to hashes and candidate IDs from the current artifacts", () => {
  const script = source("scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs");

  assert.match(script, /candidate_hash = any\(\$2::text\[\]\)/);
  assert.match(script, /candidate_id = any\(\$2::uuid\[\]\)/);
  assert.match(script, /\.in\("candidate_hash", hashes\)/);
  assert.match(script, /\.in\("candidate_id", ids\)/);
  assert.doesNotMatch(script, /where source = \$1\s+order by id asc/);
  assert.doesNotMatch(script, /where source = \$1\s+order by candidate_id asc/);
});

test("REST reference lookups preserve every key below a 4 KiB gateway URL budget", async () => {
  const previous = process.env.SUPABASE_DB_URL;
  delete process.env.SUPABASE_DB_URL;
  const urls = [];
  const supabase = createClient("https://reference-contract.invalid", "test-public-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      urls.push(new URL(String(input)));
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    } },
  });
  try {
    const hashes = Array.from({ length: 501 }, (_, index) => index.toString(16).padStart(64, "0"));
    const ids = Array.from({ length: 501 }, (_, index) => `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`);
    assert.equal((await fetchExistingCandidateMap(supabase, "pokemontcg_io_reference", hashes)).size, 0);
    assert.equal((await fetchExistingNormalizedKeys(supabase, "pokemontcg_io_reference", ids)).size, 0);
    for (const [field, expected] of [["candidate_hash", hashes], ["candidate_id", ids]]) {
      const requests = urls.filter(url => url.searchParams.has(field));
      assert.equal(requests.length, 13);
      assert.deepEqual(requests.flatMap(url => url.searchParams.get(field).slice(4, -1).split(",")), expected);
    }
    for (const url of urls) assert.ok(Buffer.byteLength(url.href) < 4096, `Oversized ${url.pathname} URL`);
    assert.match(source("scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs"), /const LOOKUP_CHUNK_SIZE = 500/);
  } finally {
    if (previous === undefined) delete process.env.SUPABASE_DB_URL;
    else process.env.SUPABASE_DB_URL = previous;
  }
});
