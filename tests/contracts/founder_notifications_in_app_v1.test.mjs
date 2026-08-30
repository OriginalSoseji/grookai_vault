import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260830210500_founder_notifications_in_app_v1.sql",
  "utf8",
);
const sourceMigration = readFileSync(
  "supabase/migrations/20260728050000_pricing_operations_notification_webhook_v1.sql",
  "utf8",
);
const service = readFileSync(
  "lib/services/notifications/founder_notification_service.dart",
  "utf8",
);
const inbox = readFileSync(
  "lib/screens/founder/founder_notifications_screen.dart",
  "utf8",
);
const pulse = readFileSync("lib/screens/network/network_screen.dart", "utf8");
const account = readFileSync("lib/screens/account/account_screen.dart", "utf8");
const routeService = readFileSync(
  "lib/services/navigation/grookai_web_route_service.dart",
  "utf8",
);
const dispatcher = readFileSync(
  "supabase/functions/notification-dispatcher/index.ts",
  "utf8",
);
const webInbox = readFileSync(
  "apps/web/src/app/founder/notifications/page.tsx",
  "utf8",
);

test("founder notification projection preserves the append-only source ledger", () => {
  assert.match(sourceMigration, /operations_notification_events is append-only/i);
  assert.match(migration, /operations_notification_events/);
  assert.match(migration, /never changes the append-only source event ledger/i);
  assert.doesNotMatch(migration, /update\s+public\.operations_notification_events/i);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.operations_notification_events/i);
});

test("founder notification storage remains private behind entitlement-checked RPCs", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(
    migration,
    /revoke all on table public\.founder_notification_viewer_state\s+from public, anon, authenticated/i,
  );
  assert.match(migration, /entitlements\.role = 'founder'/i);
  assert.equal(
    (migration.match(/current_user_has_founder_entitlement_v1\(\)/g) ?? [])
      .length >= 4,
    true,
  );
  assert.doesNotMatch(migration, /grant execute[^;]+to anon/is);
});

test("founder RPCs bound reads and enforce monotonic unread cursors", () => {
  assert.match(migration, /least\(greatest\(coalesce\(p_limit, 50\), 1\), 100\)/i);
  assert.match(migration, /founder_notification_cursor_requires_pair/i);
  assert.match(migration, /founder_notification_seen_cursor_requires_pair/i);
  assert.match(
    migration,
    /\(excluded\.seen_through_received_at, excluded\.seen_through_event_id\)/i,
  );
  assert.match(
    migration,
    /> \(\s*public\.founder_notification_viewer_state\.seen_through_received_at/is,
  );
  assert.match(migration, /order by events\.received_at desc, events\.id desc/i);
});

test("mobile service reads history and maintains the private seen cursor", () => {
  assert.match(service, /founder_notification_items_v1/);
  assert.match(service, /founder_notification_item_v1/);
  assert.match(service, /current_user_has_founder_entitlement_v1/);
  assert.match(service, /founder_notification_unread_count_v1/);
  assert.match(service, /founder_notification_mark_seen_v1/);
  assert.match(service, /latestReceivedAt/);
  assert.match(service, /latestEventId/);
});

test("Pulse exposes a concise founder projection and a permanent evidence inbox", () => {
  assert.match(pulse, /Founder alerts/);
  assert.match(pulse, /FounderNotificationRow/);
  assert.match(pulse, /FounderNotificationsScreen/);
  assert.match(pulse, /_founderNotificationUnread/);
  assert.match(pulse, /_founderNotificationService\.hasAccess\(\)/);
  assert.doesNotMatch(pulse, /FounderInsightService\.isFounderUser/);
  assert.match(
    account,
    /FounderNotificationService\(\s*client: _client,?\s*\)/,
  );
  assert.match(account, /_hasFounderAccess/);
  assert.match(inbox, /Founder Notifications/);
  assert.match(inbox, /Action/);
  assert.match(inbox, /Updates/);
  assert.match(inbox, /unitState/);
  assert.match(inbox, /journalTail/);
  assert.match(inbox, /sourceCommitSha/);
});

test("push, app, and web routes converge on the same founder inbox", () => {
  assert.match(dispatcher, /grookai:\/\/founder\/notifications\?notification_id=/);
  assert.match(dispatcher, /grookaivault\.com\/founder\/notifications\?notification_id=/);
  assert.match(routeService, /GrookaiCanonicalRouteKind\.founderNotifications/);
  assert.match(routeService, /notification_id/);
  assert.match(webInbox, /requireFounderAccess/);
  assert.match(webInbox, /operations_notification_events/);
  assert.match(webInbox, /\.eq\("notification_id", requestedId\)/);
});
