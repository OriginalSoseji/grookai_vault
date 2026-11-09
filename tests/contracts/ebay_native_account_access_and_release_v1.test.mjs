import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const sellerHttp = read("apps/web/src/lib/ebay/sellerHttp.ts");
const supabaseServer = read("apps/web/src/lib/supabase/server.ts");
const sellerRoute = read("apps/web/src/app/api/ebay/seller/route.ts");
const accountScreen = read("lib/screens/account/account_screen.dart");
const androidReleaseWorkflow = read(".github/workflows/flutter-build-apk.yml");
const androidGradle = read("android/app/build.gradle.kts");
const operatorPlaybook = read("docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md");

test("native seller requests preserve the user's bearer identity for auth.uid RPCs", () => {
  assert.match(sellerHttp, /createServerComponentClient\(\)/);
  assert.match(sellerHttp, /client\.auth\.getUser\(\)/);
  assert.doesNotMatch(sellerHttp, /createServerAdminClient/);
  assert.match(supabaseServer, /headerStore\.get\("authorization"\)/);
  assert.match(supabaseServer, /createSupabaseClient\(url, publishableKey/);
  assert.match(supabaseServer, /global:\s*\{\s*headers:\s*\{\s*Authorization:\s*authorization/);
  assert.match(sellerRoute, /owner\.client\.rpc\('ebay_seller_workspace_v1'/);
  assert.match(sellerRoute, /owner\.client\.rpc\('ebay_seller_draft_status_v1'/);
});

test("native Account exposes the existing eBay seller workspace", () => {
  assert.match(accountScreen, /Connected accounts/);
  assert.match(accountScreen, /title:\s*'eBay seller account'/);
  assert.match(accountScreen, /onTap:\s*\(\)\s*=>\s*openEbaySeller\(context\)/);
});

test("signed Android update supports only a validated higher versionCode on the same package", () => {
  assert.match(androidReleaseWorkflow, /workflow_dispatch:\s+inputs:\s+build_number:/);
  assert.match(androidReleaseWorkflow, /REQUESTED_BUILD_NUMBER.*inputs\.build_number/);
  assert.match(androidReleaseWorkflow, /REQUESTED_BUILD_NUMBER.*=~ \^\[0-9\]\+\$/);
  assert.match(androidReleaseWorkflow, /REQUESTED_BUILD_NUMBER <= BASE_BUILD_NUMBER/);
  assert.match(androidReleaseWorkflow, /--build-number=\$REQUESTED_BUILD_NUMBER/);
  assert.match(androidGradle, /applicationId\s*=\s*["']com\.grookai\.vault["']/);
});

test("operator playbook documents the hosted build override and signer continuity", () => {
  assert.match(operatorPlaybook, /Flutter Build Signed APK workflow/);
  assert.match(operatorPlaybook, /optional `build_number`/);
  assert.match(operatorPlaybook, /eBay Native Account Access and Release contract/);
  assert.match(operatorPlaybook, /EBAY_NATIVE_ACCOUNT_ACCESS_20261107\.md/);
  assert.match(operatorPlaybook, /same signing certificate/);
  assert.match(operatorPlaybook, /do not treat it as a production release/);
});

