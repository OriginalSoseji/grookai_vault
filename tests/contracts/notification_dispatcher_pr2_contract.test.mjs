import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const dispatcher = readFileSync(
  "supabase/functions/notification-dispatcher/index.ts",
  "utf8",
);
const scheduleMigration = readFileSync(
  "supabase/migrations/20260706122000_product_evolution_e2_notification_dispatcher_schedule_v1.sql",
  "utf8",
);
const rpcsMigration = readFileSync(
  "supabase/migrations/20260706121000_product_evolution_e2_notification_dispatcher_rpcs_v1.sql",
  "utf8",
);

test("notification dispatcher keeps FCM credentials in Edge Function secrets", () => {
  assert.match(dispatcher, /Deno\.env\.get\("FCM_SERVICE_ACCOUNT_JSON"\)/);
  assert.doesNotMatch(dispatcher, /private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/);
  assert.doesNotMatch(dispatcher, /AIza[0-9A-Za-z_-]{20,}/);
});

test("notification dispatcher preserves required failure and hygiene paths", () => {
  assert.match(dispatcher, /force_fcm_result/);
  assert.match(dispatcher, /notification_dispatcher_disable_token_v1/);
  assert.match(dispatcher, /notification_dispatcher_mark_retry_or_failed_v1/);
  assert.match(dispatcher, /notification_dispatcher_log_validation_failure_v1/);
  assert.match(dispatcher, /missing_card_anchor/);
  assert.match(dispatcher, /daily_budget_exhausted/);
  assert.match(dispatcher, /watch_muted/);
  assert.match(dispatcher, /instant_disabled/);
});

test("notification dispatcher database helpers use lease claim and atomic budget reservation", () => {
  assert.match(rpcsMigration, /for update skip locked/i);
  assert.match(rpcsMigration, /claim_expires_at = now\(\) \+ interval '5 minutes'/i);
  assert.match(rpcsMigration, /on conflict \(user_id, budget_date\)/i);
  assert.match(rpcsMigration, /where budgets\.push_count < 3/i);
  assert.match(rpcsMigration, /returning push_count into v_push_count/i);
});

test("notification dispatcher schedule is installed disabled without committing URL or secret", () => {
  assert.match(scheduleMigration, /notification-dispatcher-disabled-v1/);
  assert.match(scheduleMigration, /0 0 1 1 \*/);
  assert.match(scheduleMigration, /current_setting\('app\.notification_dispatcher_url'/);
  assert.match(scheduleMigration, /current_setting\('app\.notification_dispatcher_shared_secret'/);
  assert.doesNotMatch(scheduleMigration, /https:\/\/[^\s']+functions\/v1\/notification-dispatcher/);
});
