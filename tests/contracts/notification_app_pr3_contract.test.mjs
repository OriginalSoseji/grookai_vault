import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const service = readFileSync(
  "lib/services/notifications/grookai_push_notification_service.dart",
  "utf8",
);
const main = readFileSync("lib/main.dart", "utf8");
const shell = readFileSync("lib/main_shell.dart", "utf8");
const routeService = readFileSync(
  "lib/services/navigation/grookai_web_route_service.dart",
  "utf8",
);
const appRpcs = readFileSync(
  "supabase/migrations/20260706123000_product_evolution_e2_notification_app_rpcs_v1.sql",
  "utf8",
);
const manifest = readFileSync(
  "android/app/src/main/AndroidManifest.xml",
  "utf8",
);

test("notification app service registers tokens and handles all FCM tap states", () => {
  assert.match(service, /FirebaseMessaging\.onMessage\.listen/);
  assert.match(service, /FirebaseMessaging\.onMessageOpenedApp\.listen/);
  assert.match(service, /getInitialMessage\(\)/);
  assert.match(service, /onTokenRefresh\.listen/);
  assert.match(service, /notification_register_device_token_v1/);
  assert.match(service, /notification_disable_device_token_v1/);
  assert.match(service, /mark_notification_tapped_v1/);
  assert.match(service, /foreground notifications are intentionally non-navigating/i);
});

test("app lifecycle starts push service and disables token before sign-out", () => {
  assert.match(main, /GrookaiPushNotificationService\.instance\.start/);
  assert.match(main, /onRoute: _queueCanonicalRoute/);
  assert.match(main, /registerForCurrentUser\(\s*reason: 'auth_\$\{event\.event\.name\}'/);
  assert.match(main, /GrookaiPushNotificationService\.instance\.dispose/);
  assert.match(shell, /disableCurrentTokenBeforeSignOut\(\)/);
  assert.match(shell, /await _supabase\.auth\.signOut\(\)/);
});

test("notification app links route through the canonical route service", () => {
  assert.match(routeService, /scheme == 'grookai'/);
  assert.match(routeService, /scheme == 'grookaivault'/);
  assert.match(routeService, /host == 'card'/);
  assert.match(routeService, /GrookaiCanonicalRoute\.card\(segments\.first\)/);
});

test("app RPCs enforce auth-owned token registration and tap tracking", () => {
  assert.match(appRpcs, /auth\.uid\(\)/);
  assert.match(appRpcs, /on conflict \(token\) do update set\s+user_id = v_user_id/i);
  assert.match(appRpcs, /disabled_at = null/i);
  assert.match(appRpcs, /recipient_user_id = v_user_id/i);
  assert.match(appRpcs, /tapped_at is null/i);
  assert.match(appRpcs, /grant execute on function public\.notification_register_device_token_v1/);
  assert.doesNotMatch(appRpcs, /grant execute .* to anon/i);
});

test("android declares Android 13 notification permission", () => {
  assert.match(manifest, /android\.permission\.POST_NOTIFICATIONS/);
});
