import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const WORKFLOW_PATH = path.join(
  ROOT,
  ".github",
  "workflows",
  "tcgplayer-market-canary-observation.yml",
);
const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");

test("scheduled canary observer is pinned to the reviewed source and canary", () => {
  assert.match(
    workflow,
    /OBSERVER_SOURCE_SHA: "d02d52aeda9bd02826ea85c8624638e048b8372f"/,
  );
  assert.match(
    workflow,
    /CANARY_EXPECTED_COMMIT_SHA: "c0cdce5500c96cdc5b1d689e5178d9fa4e117e1d"/,
  );
  assert.match(
    workflow,
    /CANARY_ACTIVATION_RUN_ID: "87b13fc1-3639-47cb-843f-2f5d8b29d3b0"/,
  );
  assert.match(workflow, /CANARY_EXPECTED_COUNT: "100"/);
  assert.match(workflow, /ref: \$\{\{ env\.OBSERVER_SOURCE_SHA \}\}/);
});

test("scheduled canary observer requires the terminal pass after 72 hours", () => {
  assert.match(workflow, /CANARY_REQUIRED_END: "2026-07-31T08:40:15\.793Z"/);
  assert.match(workflow, /--required-hours=72/);
  assert.match(workflow, /require_pass=\(--require-pass\)/);
  assert.match(workflow, /"\$\{require_pass\[@\]\}"/);
});

test("scheduled canary observer is read-only and cannot apply migrations", () => {
  assert.match(
    workflow,
    /node scripts\/audits\/tcgplayer_market_canary_observation_v1\.mjs/,
  );
  assert.match(workflow, /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_URL \}\}/);
  assert.doesNotMatch(workflow, /supabase\s+db\s+push/i);
  assert.doesNotMatch(workflow, /pricing:market:[^\s]*apply/i);
  assert.doesNotMatch(workflow, /tcgplayer_market_publication_worker_v1/i);
  assert.doesNotMatch(workflow, /tcgplayer_market_pipeline_v1/i);
});
