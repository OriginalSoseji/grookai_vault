import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  "apps/web/src/app/api/canon/cards/[gv_id]/image/route.ts",
  "utf8",
);
const proxy = fs.readFileSync(
  "apps/web/src/lib/canon/canonImageProxy.ts",
  "utf8",
);

test("card image delivery supports the exact self-hosted One Piece path family", () => {
  assert.match(proxy, /EXTERNAL_CARD_IMAGE_BUCKET = "external-card-images"/);
  assert.match(proxy, /ONE_PIECE_CARD_IMAGE_PATH/);
  assert.match(route, /resolveCanonCardImageStorageLocation/);
  assert.match(route, /\.from\(imageLocation\.bucket\)/);
  assert.match(route, /\.download\(imageLocation\.path\)/);
});

test("privileged image lookup cannot bypass request-role catalog visibility", () => {
  assert.match(route, /createServerComponentClient/);
  assert.match(route, /request\.headers\.get\("authorization"\)/);
  assert.match(route, /createSupabaseClient\(url, publishableKey/);
  assert.match(route, /sets\(game,catalog_set_release_controls\(release_status\)\)/);
  assert.match(route, /games\(code,catalog_game_release_controls\(release_status\)\)/);
  assert.match(route, /function catalogImageAccess/);
  assert.match(route, /data_quality_flags/);
  assert.match(route, /app_visibility_v1/);
  assert.match(route, /appVisibilityStatus\.trim\(\)\.toLowerCase\(\) === "suppressed"/);
  assert.match(route, /explicitSetStatus === "hidden"/);
  assert.match(route, /if \(access === "hidden"\) return false/);
  assert.match(route, /return requestIsAuthenticated\(request\)/);
  assert.doesNotMatch(route, /catalog_card_print_visible_to_request_v1/);
});

test("signed-in-only catalog images never enter a public CDN cache", () => {
  assert.match(route, /catalog_game_release_controls/);
  assert.match(route, /explicitSetStatus === "public"/);
  assert.match(route, /gameStatus === "public"/);
  assert.match(route, /cacheScope === "public"/);
  assert.match(route, /"private, no-store"/);
});
