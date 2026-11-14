import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateTcgplayerMarketActiveAskRefreshV1,
  TCGPLAYER_MARKET_ACTIVE_ASK_REFRESH_POLICY_V1,
} from "../../backend/pricing/tcgplayer_market_active_ask_refresh_policy_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("active ask cache reports an empty cache without blocking market publication", () => {
  const result = evaluateTcgplayerMarketActiveAskRefreshV1({
    row_count: 0,
    invalid_row_count: 0,
    stale_row_count: 0,
  });
  assert.equal(
    result.policy_version,
    TCGPLAYER_MARKET_ACTIVE_ASK_REFRESH_POLICY_V1,
  );
  assert.equal(result.status, "passed_with_warning");
  assert.deepEqual(result.blocking_findings, []);
  assert.deepEqual(result.warning_findings, ["empty_active_ask_cache"]);
});

test("active ask cache fails closed for invalid or stale rows", () => {
  for (const sample of [
    { row_count: 3, invalid_row_count: 1, stale_row_count: 0 },
    { row_count: 3, invalid_row_count: 0, stale_row_count: 1 },
  ]) {
    assert.equal(evaluateTcgplayerMarketActiveAskRefreshV1(sample).status, "failed");
  }
});

test("continuity dispatcher has a separate receipt, mutex, and six-hour active grace", () => {
  const watchdog = fs.readFileSync(
    path.join(ROOT, "scripts", "ops", "ensure_pricing_completion_freshness_v1.ps1"),
    "utf8",
  );
  const installer = fs.readFileSync(
    path.join(ROOT, "scripts", "ops", "install_market_continuity_dispatch_watchdog_v1.ps1"),
    "utf8",
  );
  const playbook = fs.readFileSync(
    path.join(ROOT, "docs", "ops", "GROOKAI_OPERATOR_PLAYBOOK_V1.md"),
    "utf8",
  );
  assert.match(watchdog, /ValidateRange\(5, 180\)/);
  assert.match(watchdog, /ValidateRange\(15, 360\)/);
  assert.match(watchdog, /\$ReceiptSchemaVersion/);
  assert.match(watchdog, /\$MutexName/);
  assert.match(installer, /tcgplayer-market-continuity-watchdog\.yml/);
  assert.match(installer, /-MaxAgeMinutes', '135'/);
  assert.match(installer, /-ActiveMaxAgeMinutes', '360'/);
  assert.match(installer, /TCGPLAYER_MARKET_CONTINUITY_DISPATCH_WATCHDOG_V1/);
  assert.match(installer, /GrookaiTcgplayerMarketContinuityDispatchWatchdogV1/);
  assert.match(installer, /RepetitionInterval \(New-TimeSpan -Minutes 5\)/);
  assert.match(playbook, /Grookai TCGPlayer Market Continuity Dispatch Watchdog/);
  assert.match(playbook, /tcgplayer-market-continuity-watchdog\.yml/);
  assert.match(
    playbook,
    /tcgplayer_market_continuity_dispatch_watchdog_v1/,
  );
});
