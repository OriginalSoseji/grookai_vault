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
    /OBSERVER_SOURCE_SHA: "a2267285a236e89330f3002ee567ddce991c4232"/,
  );
  assert.match(
    workflow,
    /CANARY_EXPECTED_COMMIT_SHA: "456306bdb2a335286d513c1d612a97a58a1f01cc"/,
  );
  assert.match(
    workflow,
    /CANARY_ACTIVATION_RUN_ID: "421f40ab-2d2d-4411-a1b3-7420603c5b86"/,
  );
  assert.match(workflow, /CANARY_EXPECTED_COUNT: "100"/);
  assert.match(workflow, /ref: \$\{\{ env\.OBSERVER_SOURCE_SHA \}\}/);
});

test("scheduled canary observer requires the terminal pass after 72 hours", () => {
  assert.match(workflow, /CANARY_WINDOW_START: "2026-07-30T18:17:48\.625Z"/);
  assert.match(workflow, /CANARY_REQUIRED_END: "2026-08-02T18:17:48\.625Z"/);
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
