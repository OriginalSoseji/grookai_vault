import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260728050000_pricing_operations_notification_webhook_v1.sql",
  "utf8",
);
const webhook = readFileSync(
  "supabase/functions/operations-webhook-v1/index.ts",
  "utf8",
);
const dispatcher = readFileSync(
  "supabase/functions/notification-dispatcher/index.ts",
  "utf8",
);
const supabaseConfig = readFileSync("supabase/config.toml", "utf8");
const notifier = readFileSync(
  "scripts/ops/grookai_operations_webhook_v1.mjs",
  "utf8",
);
const envExample = readFileSync(
  "deploy/env/tcgplayer-market-pricing.env.example",
  "utf8",
);
const installer = readFileSync(
  "deploy/scripts/install-tcgplayer-market-pipeline-systemd.sh",
  "utf8",
);
const verifier = readFileSync(
  "deploy/scripts/verify-tcgplayer-market-pipeline-systemd.sh",
  "utf8",
);

test("operations alert migration preserves card anchors for non-operations rows", () => {
  assert.match(
    migration,
    /event_type = 'operations_alert'\s+and card_print_id is null/i,
  );
  assert.match(
    migration,
    /event_type <> 'operations_alert'\s+and card_print_id is not null/i,
  );
  assert.match(
    migration,
    /operations_notification_events is append-only/i,
  );
  assert.match(
    migration,
    /revoke all on table public\.operations_notification_events\s+from public, anon, authenticated/i,
  );
});

test("operations alert enqueue is founder-only, idempotent, and evidence preserving", () => {
  assert.match(migration, /entitlements\.role = 'founder'/);
  assert.match(migration, /operations-alert:' \|\| v_notification_id/);
  assert.match(
    migration,
    /on conflict \(recipient_user_id, dedupe_key\) do nothing/i,
  );
  assert.match(
    migration,
    /notification_dispatcher_claim_operations_alert_v1/,
  );
  assert.match(migration, /for update skip locked/i);
});

test("operations webhook requires its own bearer and dispatches the exact alert", () => {
  assert.match(webhook, /OPERATIONS_WEBHOOK_SHARED_SECRET/);
  assert.match(webhook, /constantTimeEqual/);
  assert.match(webhook, /enqueue_operations_notification_v1/);
  assert.match(webhook, /operations_notification_id: notificationId/);
  assert.match(webhook, /MAX_PAYLOAD_BYTES/);
  assert.doesNotMatch(webhook, /service_role.*eyJ/i);
});

test("shared-secret operations functions bypass the Supabase JWT gateway", () => {
  assert.match(
    supabaseConfig,
    /\[functions\.notification-dispatcher\]\s+enabled = true\s+verify_jwt = false/s,
  );
  assert.match(
    supabaseConfig,
    /\[functions\.operations-webhook-v1\]\s+enabled = true\s+verify_jwt = false/s,
  );
});

test("dispatcher routes operations alerts to the founder notification inbox", () => {
  assert.match(dispatcher, /outbox\.event_type === "operations_alert"/);
  assert.match(dispatcher, /notification_dispatcher_claim_operations_alert_v1/);
  assert.match(dispatcher, /if \(!isOperationsAlert && !row\.card_print_id\)/);
  assert.match(dispatcher, /if \(!isOperationsAlert\) \{\s+const reserved/s);
  assert.match(dispatcher, /payload\.severity/);
  assert.match(dispatcher, /payload\.event/);
  assert.match(dispatcher, /grookai:\/\/founder\/notifications\?notification_id=/);
  assert.match(dispatcher, /grookaivault\.com\/founder\/notifications\?notification_id=/);
});

test("systemd notifier and installer require the protected webhook bearer", () => {
  assert.match(notifier, /GROOKAI_OPERATIONS_WEBHOOK_BEARER_TOKEN/);
  assert.match(notifier, /authorization: `Bearer \$\{webhookBearerToken\}`/);
  assert.match(envExample, /^GROOKAI_OPERATIONS_WEBHOOK_BEARER_TOKEN=$/m);
  assert.match(
    installer,
    /require_env_value "GROOKAI_OPERATIONS_WEBHOOK_BEARER_TOKEN"/,
  );
  assert.match(verifier, /missing_operations_webhook_bearer_token/);
});
