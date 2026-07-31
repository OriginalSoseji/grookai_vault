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
    /OBSERVER_SOURCE_SHA: "416c4691d1c1d6be8a1461c148deebe627e813f8"/,
  );
  assert.match(
    workflow,
    /CANARY_EXPECTED_COMMIT_SHA: "416c4691d1c1d6be8a1461c148deebe627e813f8"/,
  );
  assert.match(
    workflow,
    /CANARY_ACTIVATION_RUN_ID: "0c23045d-8141-4b9c-ba41-2f8c44522921"/,
  );
  assert.match(workflow, /CANARY_EXPECTED_COUNT: "100"/);
  assert.match(workflow, /ref: \$\{\{ env\.OBSERVER_SOURCE_SHA \}\}/);
});

test("scheduled canary observer allows final-slot completion before requiring a terminal pass", () => {
  assert.match(workflow, /CANARY_WINDOW_START: "2026-07-31T10:34:15\.670Z"/);
  assert.match(workflow, /CANARY_REQUIRED_END: "2026-08-03T10:34:15\.670Z"/);
  assert.match(workflow, /CANARY_COMPLETION_GRACE_SECONDS: "28800"/);
  assert.match(workflow, /--required-hours=72/);
  assert.match(workflow, /--schedule-tolerance-minutes=90/);
  assert.match(workflow, /--schedule-completion-grace-minutes=480/);
  assert.match(
    workflow,
    /final_completion_deadline="\$\(\(required_end_epoch \+ CANARY_COMPLETION_GRACE_SECONDS\)\)"/,
  );
  assert.match(
    workflow,
    /final_observation_deadline="\$\(\(final_completion_deadline \+ 21600\)\)"/,
  );
  assert.match(workflow, /now_epoch >= final_completion_deadline/);
  assert.doesNotMatch(workflow, /now_epoch >= required_end_epoch/);
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
