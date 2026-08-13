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

test("mobile release metadata uses one monotonic synchronized build number", () => {
  const pubspec = read("pubspec.yaml");
  const metadata = JSON.parse(read("docs/release/app_store_connect_ios_1_0.json"));
  const buildMatch = pubspec.match(/^version:\s*1\.0\.0\+(\d+)$/m);

  assert.ok(buildMatch, "pubspec must declare a 1.0.0 release build number");
  assert.equal(buildMatch[1], "289");
  assert.equal(metadata.build_number, buildMatch[1]);
  assert.match(metadata.archive_path, /build289\.xcarchive$/);
  assert.match(metadata.export_path, /build289$/);
});

test("web release resolves Nano ID to the supported patched branch", () => {
  const manifest = JSON.parse(read("apps/web/package.json"));
  const lockfile = JSON.parse(read("apps/web/package-lock.json"));

  assert.equal(manifest.overrides?.nanoid, "5.1.16");
  assert.equal(lockfile.packages?.["node_modules/nanoid"]?.version, "5.1.16");
});

test("Android release can produce a signed AAB without inventing a version tag", () => {
  const workflow = read(".github/workflows/release.yml");

  assert.match(workflow, /^\s{2}workflow_dispatch:\s*$/m);
  assert.match(workflow, /name: Upload signed AAB artifact/);
  assert.match(workflow, /name: signed-release-aab/);
  assert.match(workflow, /path: build\/app\/outputs\/bundle\/release\/app-release\.aab/);
  assert.match(workflow, /name: Create GitHub Release\s+if: github\.event_name == 'push'/);
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
  assert.match(automation, /--build-name=#\{build_marketing_version\}/);
  assert.match(automation, /--build-number=#\{build_number\}/);
  assert.match(automation, /derived_build_path\("archive", "\.xcarchive"\)/);
  assert.match(automation, /derived_build_path\("export"\)/);
});

test("App Store upload authenticates xcodebuild without logging API identifiers", () => {
  const automation = read("scripts/app_store_connect/ios_release_automation.rb");

  assert.match(automation, /xcodebuild_authentication_args/);
  assert.match(automation, /-authenticationKeyPath/);
  assert.match(automation, /-authenticationKeyID/);
  assert.match(automation, /-authenticationKeyIssuerID/);
  assert.match(automation, /redact_command/);
  assert.match(automation, /\[REDACTED\]/);
});

test("App Store status requests only supported app-info fields", () => {
  const automation = read("scripts/app_store_connect/ios_release_automation.rb");

  assert.match(
    automation,
    /fields\[appInfos\].*appStoreAgeRating,state,ageRatingDeclaration,appInfoLocalizations/,
  );
  assert.doesNotMatch(automation, /kidsAgeBand/);
});
