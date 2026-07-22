import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("historical launcher is explicit, singleton, bounded, and load gated", () => {
  const agent = read("scripts/workers/tcgcsv_historical_backfill_agent_v1.sh");
  const service = read(
    "deploy/systemd/grookai-tcgcsv-historical-backfill.service",
  );
  const currentService = read(
    "deploy/systemd/grookai-tcgcsv-warehouse.service",
  );
  const installer = read(
    "deploy/scripts/install-tcgcsv-historical-backfill-systemd.sh",
  );

  assert.match(agent, /TCGCSV_HISTORICAL_BACKFILL_ENABLED:-0/);
  assert.match(agent, /TCGCSV_HISTORICAL_BACKFILL_MAX_DAYS:-1/);
  assert.match(agent, /TCGCSV_HISTORICAL_BACKFILL_MAX_RUNTIME_SECONDS:-7200/);
  assert.match(agent, /flock -n 9/);
  assert.match(agent, /command -v flock/);
  assert.match(agent, /command -v timeout/);
  assert.match(agent, /\[\[ "\$\{MAX_DAYS\}" != "1" \]\]/);
  assert.match(
    agent,
    /timeout --signal=TERM --kill-after=120s "\$\{remaining_seconds\}s"/,
  );
  assert.match(agent, /worker_timed_out/);
  assert.match(agent, /runtime_remaining_seconds/);
  assert.match(agent, /max_runtime_reached_during_pause/);
  assert.ok(
    agent.indexOf("pause_for_pricing_window ||") <
      agent.indexOf("if ! flock -n 9"),
    "shared warehouse lock must be acquired only after the pricing pause",
  );
  assert.match(agent, /tcgcsv_historical_load_guard_v1\.mjs/);
  assert.match(agent, /completed\|skipped_already_completed/);
  assert.match(agent, /skipped_worker_locked/);
  assert.match(agent, /write_state_atomically/);

  assert.match(service, /Type=oneshot/);
  assert.match(service, /Restart=no/);
  assert.match(service, /TimeoutStartSec=2h/);
  assert.doesNotMatch(service, /Restart=on-failure/);

  assert.match(agent, /\/tmp\/grookai-tcgcsv-warehouse\.lock/);
  assert.match(
    currentService,
    /ExecCondition=.*tcgcsv_historical_load_guard_v1\.mjs/,
  );
  assert.match(currentService, /TCGCSV_PRICE_OBSERVATION_BATCH_SIZE=2000/);
  assert.match(currentService, /TCGCSV_PRICE_BATCH_DELAY_MS=25/);
  assert.match(
    currentService,
    /flock -n \/tmp\/grookai-tcgcsv-warehouse\.lock/,
  );

  assert.match(installer, /TCGCSV_HISTORICAL_BACKFILL_START_ON_INSTALL:-0/);
  assert.match(installer, /systemctl disable/);
  assert.match(installer, /systemctl start/);
  assert.doesNotMatch(installer, /systemctl enable --now/);
  assert.match(
    installer,
    /must explicitly set TCGCSV_HISTORICAL_BACKFILL_ENABLED=1/,
  );
});

test("historical load guard protects critical cron and foreground reads", () => {
  const guard = read("scripts/workers/tcgcsv_historical_load_guard_v1.mjs");

  assert.match(guard, /connectionTimeoutMillis/);
  assert.match(guard, /statement_timeout/);
  assert.match(guard, /pg_stat_activity/);
  assert.match(guard, /wait_event_type = 'IO'/);
  assert.match(guard, /notification-dispatcher-every-minute-v1/);
  assert.match(guard, /want-match-instant-every-5-min-v1/);
  assert.match(guard, /pulse-daily-aggregation-v1/);
  assert.match(guard, /recent_critical_cron_failure/);
  assert.match(guard, /DEFER_EXIT_CODE = 75/);
});

test("retired pricing Edge entrypoints cannot execute legacy database work", () => {
  for (
    const relativePath of [
      "supabase/functions/import-prices/index.ts",
      "supabase/functions/import-prices-v3/index.ts",
      "supabase/functions/import-prices-bridge/index.ts",
    ]
  ) {
    const source = read(relativePath);
    assert.match(source, /legacy-pricing-pipeline-disabled/);
    assert.match(source, /}, 410\);/);
    assert.doesNotMatch(source, /createClient\s*\(/);
    assert.doesNotMatch(source, /\.rpc\s*\(/);
    assert.doesNotMatch(source, /mode === "env_debug"/);
  }

  const smoke = read("backend/pricing/import_prices_bridge_smoke.mjs");
  assert.match(smoke, /mode: 'health'/);
  assert.match(smoke, /AbortSignal\.timeout\(10_000\)/);
  assert.doesNotMatch(smoke, /BRIDGE_IMPORT_TOKEN/);
  assert.doesNotMatch(smoke, /mode: 'run'/);
});

test("notification dispatcher bounds work and stages recipient lookups", () => {
  const dispatcher = read(
    "supabase/functions/notification-dispatcher/index.ts",
  );

  assert.match(dispatcher, /MAX_DISPATCH_BATCH = 8/);
  assert.match(dispatcher, /DISPATCH_CONCURRENCY = 2/);
  assert.match(dispatcher, /MAX_DEVICE_TOKENS_PER_RECIPIENT = 3/);
  assert.match(dispatcher, /MAX_FCM_ATTEMPTS_PER_ROW = 2/);
  assert.match(dispatcher, /INVOCATION_DEADLINE_MS = 50_000/);
  assert.match(dispatcher, /ROW_DISPATCH_DEADLINE_MS = 9_000/);
  assert.match(dispatcher, /fetchWithTimeout/);
  assert.match(dispatcher, /external_request_timeout/);
  assert.match(dispatcher, /pendingAccessToken/);
  assert.match(
    dispatcher,
    /\[cardResult, profileResult, prefsResult\] = await Promise\.all\(\[/,
  );
  assert.match(dispatcher, /\.limit\(MAX_DEVICE_TOKENS_PER_RECIPIENT\)/);
  assert.match(dispatcher, /\.abortSignal\(rowSignal\)/);
  assert.match(dispatcher, /offset \+= DISPATCH_CONCURRENCY/);
  assert.match(dispatcher, /profile_lookup_failed/);
  assert.match(dispatcher, /watch_lookup_failed/);
});
