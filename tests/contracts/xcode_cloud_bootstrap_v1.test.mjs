import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const script = readFileSync("ios/ci_scripts/ci_post_clone.sh", "utf8");

test("Xcode Cloud bootstraps Flutter from the repository root", () => {
  assert.match(script, /^#!\/bin\/sh\r?\n/);
  assert.match(script, /set -eu/);
  assert.match(script, /CI_PRIMARY_REPOSITORY_PATH is required/);
  assert.match(script, /cd "\$\{CI_PRIMARY_REPOSITORY_PATH\}"/);
});

test("Xcode Cloud uses the repository-tested Flutter release", () => {
  assert.match(script, /FLUTTER_VERSION="\$\{FLUTTER_VERSION:-3\.35\.2\}"/);
  assert.match(script, /--branch "\$\{FLUTTER_VERSION\}"/);
  assert.match(script, /https:\/\/github\.com\/flutter\/flutter\.git/);
  assert.match(script, /flutter precache --ios/);
});

test("Xcode Cloud generates Flutter and CocoaPods build inputs", () => {
  assert.match(script, /flutter pub get/);
  assert.match(script, /flutter build ios --config-only --release/);
  assert.match(script, /command -v pod/);
  assert.match(script, /brew install cocoapods/);
  assert.match(script, /cd ios\r?\n\s+pod install/);

  const podAvailabilityIndex = script.indexOf("if ! command -v pod");
  const podInstallIndex = script.indexOf("pod install", podAvailabilityIndex);
  const releaseConfigIndex = script.indexOf(
    "flutter build ios --config-only --release",
  );

  assert.ok(podAvailabilityIndex >= 0);
  assert.ok(podInstallIndex > podAvailabilityIndex);
  assert.ok(releaseConfigIndex > podInstallIndex);
});
