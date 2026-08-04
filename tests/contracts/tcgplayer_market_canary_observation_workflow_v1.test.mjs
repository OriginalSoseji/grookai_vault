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
const observer = fs.readFileSync(
  path.join(ROOT, "scripts", "audits", "tcgplayer_market_canary_observation_v1.mjs"),
  "utf8",
);

test("scheduled canary observer is pinned to the reviewed source and canary", () => {
  assert.match(
    workflow,
    /OBSERVER_SOURCE_SHA: "6b729441bf8944048885ade5d9905e23166d9d46"/,
  );
  assert.match(
    workflow,
    /CANARY_EXPECTED_COMMIT_SHA: "6b729441bf8944048885ade5d9905e23166d9d46"/,
  );
  assert.match(
    workflow,
    /CANARY_ACTIVATION_RUN_ID: "01610cfc-df72-412f-bc21-a526044d35bc"/,
  );
  assert.match(workflow, /CANARY_EXPECTED_COUNT: "100"/);
  assert.match(
    workflow,
    /TCGPLAYER_MARKET_CANARY_MAX_SOURCE_MISSING_COUNT: "5"/,
  );
  assert.match(workflow, /ref: \$\{\{ env\.OBSERVER_SOURCE_SHA \}\}/);
});

test("scheduled canary observer allows final-slot completion before requiring a terminal pass", () => {
  assert.match(workflow, /CANARY_WINDOW_START: "2026-08-02T22:29:17\.856Z"/);
  assert.match(workflow, /CANARY_REQUIRED_END: "2026-08-05T22:29:17\.856Z"/);
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

test("canary runtime probe exercises the governed shared read model", () => {
  assert.match(
    observer,
    /get_market_pricing_read_model_v1\(uuid\[\],uuid\[\]\)/,
  );
  assert.match(
    observer,
    /from public\.get_market_pricing_read_model_v1\([\s\S]*?\$1::uuid\[\][\s\S]*?'\{\}'::uuid\[\]/,
  );
  assert.match(observer, /authenticated_runtime_latency_ms/);
  assert.match(observer, /sampled_card_print_ids/);
  assert.doesNotMatch(observer, /from public\.get_top_market_pricing_v1\(/);
});
