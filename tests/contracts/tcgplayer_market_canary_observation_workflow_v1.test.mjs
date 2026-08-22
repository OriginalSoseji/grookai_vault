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
    /OBSERVER_SOURCE_SHA: "3ac5e70b88176895f1422b52626c5b89bca3bfc2"/,
  );
  assert.match(
    workflow,
    /CANARY_EXPECTED_COMMIT_SHA: "6b729441bf8944048885ade5d9905e23166d9d46"/,
  );
  assert.match(
    workflow,
    /CANARY_ACTIVATION_RUN_ID: "e902fb55-c0ac-49d5-a9b4-9412d694900e"/,
  );
  assert.match(workflow, /CANARY_EXPECTED_COUNT: "100"/);
  assert.match(
    workflow,
    /TCGPLAYER_MARKET_CANARY_MAX_SOURCE_MISSING_COUNT: "5"/,
  );
  assert.match(
    workflow,
    /--max-source-missing-count=\$\{TCGPLAYER_MARKET_CANARY_MAX_SOURCE_MISSING_COUNT\}/,
  );
  assert.match(workflow, /ref: \$\{\{ env\.OBSERVER_SOURCE_SHA \}\}/);
});

test("manual final replay uses the immutable GitHub artifact and repaired observer", () => {
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /uses: actions\/download-artifact@v4/);
  assert.match(workflow, /run-id: 31965591823/);
  assert.match(
    workflow,
    /FINAL_EVIDENCE_SHA256: "7b84a452de3afff671fbbc83801f779020c5e9c1f2ad4edab5c4969999916013"/,
  );
  assert.match(
    workflow,
    /FINAL_EVIDENCE_AS_OF: "2026-08-16T18:47:26\.299Z"/,
  );
  assert.match(
    workflow,
    /now_epoch > final_observation_deadline[\s\S]*GITHUB_EVENT_NAME[\s\S]*workflow_dispatch/,
  );
  assert.match(workflow, /--frozen-evidence=\$\{frozen_evidence\}/);
  assert.match(
    workflow,
    /--frozen-evidence-sha256=\$\{FINAL_EVIDENCE_SHA256\}/,
  );
  assert.match(workflow, /"\$\{frozen_replay\[@\]\}"/);
});

test("scheduled canary observer allows final-slot completion before requiring a terminal pass", () => {
  assert.match(workflow, /CANARY_WINDOW_START: "2026-08-13T09:56:42\.279Z"/);
  assert.match(workflow, /CANARY_REQUIRED_END: "2026-08-16T09:56:42\.279Z"/);
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
  assert.match(
    observer,
    /arg\.startsWith\("--schedule-completion-grace-minutes="\)/,
  );
  assert.match(
    observer,
    /scheduleCompletionGraceMinutes:\s*args\.scheduleCompletionGraceMinutes/,
  );
  assert.match(observer, /schedule_completion_grace_minutes/);
  assert.match(observer, /--frozen-evidence=/);
  assert.match(observer, /--frozen-evidence-sha256=/);
  assert.match(observer, /Frozen evidence hash mismatch/);
  assert.match(
    observer,
    /hash_verified_frozen_evidence_with_linked_source_readback/,
  );
});

test("scheduled canary observer reads linked source-cycle schedule evidence", () => {
  assert.match(
    observer,
    /left join public\.tcgcsv_source_sync_runs source\s+on source\.id = run\.source_sync_run_id/,
  );
  assert.match(observer, /source\.started_at as schedule_source_started_at/);
  assert.match(observer, /source\.finished_at as schedule_source_finished_at/);
  assert.match(observer, /source\.run_key as schedule_source_run_key/);
  assert.match(observer, /source\.git_commit_sha as schedule_source_commit_sha/);
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
