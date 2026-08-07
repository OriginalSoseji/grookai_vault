import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("public privacy copy is release-facing and does not claim unused location collection", () => {
  const privacy = read("apps/web/src/app/privacy/page.tsx");

  assert.doesNotMatch(privacy, /launch draft|reviewed by counsel|broad public launch/i);
  assert.doesNotMatch(privacy, /permission-based location|approximate location/i);
  assert.match(privacy, /choices available to collectors/i);
});

test("iOS requests only camera and photo-library permissions used by the release app", () => {
  const infoPlist = read("ios/Runner/Info.plist");

  assert.match(infoPlist, /NSCameraUsageDescription/);
  assert.match(infoPlist, /NSPhotoLibraryUsageDescription/);
  assert.doesNotMatch(infoPlist, /NSLocationWhenInUseUsageDescription/);
  assert.doesNotMatch(infoPlist, /NSPhotoLibraryAddUsageDescription/);
});

test("Scanner does not expose an unimplemented history action", () => {
  const scanner = read("lib/screens/scanner_v5/scan_capture_v5_screen.dart");
  const chrome = read("lib/screens/scanner_v5/widgets/scanner_viewfinder_chrome.dart");

  assert.doesNotMatch(scanner, /History coming soon|Recent scans will live here|_showHistoryStub/);
  assert.doesNotMatch(chrome, /onHistory|Scan history|Icons\.history_rounded/);
});

test("App Store release metadata describes the shipping product without stale beta instructions", () => {
  const metadata = JSON.parse(read("docs/release/app_store_connect_ios_1_0.json"));
  const joined = JSON.stringify({
    description: metadata.version_localization?.description,
    review_notes: metadata.review_detail?.notes,
    whats_new: metadata.beta_build_localization?.whatsNew,
  });

  assert.doesNotMatch(joined, /early beta|under-construction placeholder|scanner placeholder|beta 1\.0\.0\+2/i);
  assert.match(joined, /exact-printing|exact card|printing-aware/i);
  assert.match(metadata.review_detail?.notes ?? "", /account\/delete/);
});

test("App Store privacy worksheet includes active Firebase diagnostics and messaging identifiers", () => {
  const privacy = read("docs/release/app_store_privacy_ios_1_0.md");

  for (const expected of [
    "Device ID",
    "Crash Data",
    "Other Diagnostic Data",
    "Customer Support",
    "Firebase Cloud Messaging",
    "Firebase Crashlytics",
  ]) {
    assert.match(privacy, new RegExp(expected));
  }
  assert.match(privacy, /Do Not Select Unless The App Changes[\s\S]*Precise Location[\s\S]*Coarse Location/);
});

test("App Store automation supports an explicit immutable build-number override", () => {
  const automation = read("scripts/app_store_connect/ios_release_automation.rb");

  assert.match(automation, /ASC_BUILD_NUMBER/);
  assert.match(automation, /APP_STORE_CONNECT_BUILD_NUMBER/);
});
