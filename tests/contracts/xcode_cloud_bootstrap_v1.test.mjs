import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const script = readFileSync("ios/ci_scripts/ci_post_clone.sh", "utf8");
const appDelegate = readFileSync("ios/Runner/AppDelegate.swift", "utf8");
const infoPlist = readFileSync("ios/Runner/Info.plist", "utf8");
const project = readFileSync("ios/Runner.xcodeproj/project.pbxproj", "utf8");
const scheme = readFileSync(
  "ios/Runner.xcodeproj/xcshareddata/xcschemes/Runner.xcscheme",
  "utf8",
);
const projectPackageResolution = JSON.parse(
  readFileSync(
    "ios/Runner.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved",
    "utf8",
  ),
);
const workspacePackageResolution = JSON.parse(
  readFileSync(
    "ios/Runner.xcworkspace/xcshareddata/swiftpm/Package.resolved",
    "utf8",
  ),
);

test("Xcode Cloud bootstraps Flutter from the repository root", () => {
  assert.match(script, /^#!\/bin\/sh\r?\n/);
  assert.match(script, /set -eu/);
  assert.match(script, /CI_PRIMARY_REPOSITORY_PATH is required/);
  assert.match(script, /cd "\$\{CI_PRIMARY_REPOSITORY_PATH\}"/);
});

test("Xcode Cloud uses the UIScene-compatible Flutter release", () => {
  assert.match(script, /FLUTTER_VERSION="3\.44\.7"/);
  assert.doesNotMatch(script, /^FLUTTER_VERSION="\$\{/m);
  assert.match(script, /FLUTTER_HOME="\$\{HOME\}\/flutter-\$\{FLUTTER_VERSION\}"/);
  assert.match(script, /--branch "\$\{FLUTTER_VERSION\}"/);
  assert.match(script, /https:\/\/github\.com\/flutter\/flutter\.git/);
  assert.match(script, /flutter --version --machine/);
  assert.match(script, /frameworkVersion.*\[:space:\]/);
  assert.match(script, /error=flutter-version-mismatch/);
  assert.match(script, /flutter precache --ios/);
  assert.match(appDelegate, /FlutterImplicitEngineDelegate/);
  assert.match(appDelegate, /FlutterImplicitEngineBridge/);
  assert.match(infoPlist, /FlutterSceneDelegate/);
});

test("Xcode Cloud generates Flutter and CocoaPods build inputs", () => {
  assert.match(script, /flutter pub get --enforce-lockfile/);
  assert.match(script, /flutter build ios --release --no-codesign --config-only/);
  assert.match(script, /command -v pod/);
  assert.match(script, /brew install cocoapods/);
  assert.match(script, /cd ios\r?\n\s+pod install/);
  assert.match(script, /phase=flutter-packages/);
  assert.match(script, /phase=pod-install/);
  assert.match(script, /phase=release-config/);
  assert.match(script, /phase=complete/);
  assert.match(script, /flutter pub get --enforce-lockfile \|\| exit 23/);
  assert.match(script, /pod install\r?\n\) \|\| exit 25/);
  assert.match(
    script,
    /flutter build ios --release --no-codesign --config-only \|\| exit 26/,
  );

  const podAvailabilityIndex = script.indexOf("if ! command -v pod");
  const podInstallIndex = script.indexOf("pod install", podAvailabilityIndex);
  const releaseConfigIndex = script.indexOf(
    "flutter build ios --release --no-codesign --config-only",
  );

  assert.ok(podAvailabilityIndex >= 0);
  assert.ok(podInstallIndex > podAvailabilityIndex);
  assert.ok(releaseConfigIndex > podInstallIndex);
});

test("Xcode Cloud uses a checked-in SwiftPM migration and resolution", () => {
  assert.match(project, /FlutterGeneratedPluginSwiftPackage in Frameworks/);
  assert.match(project, /XCLocalSwiftPackageReference/);
  assert.match(
    project,
    /relativePath = Flutter\/ephemeral\/Packages\/FlutterGeneratedPluginSwiftPackage/,
  );
  assert.match(scheme, /title = "Run Prepare Flutter Framework Script"/);
  assert.match(scheme, /xcode_backend\.sh&quot; prepare/);

  assert.equal(projectPackageResolution.version, 2);
  assert.ok(Array.isArray(projectPackageResolution.pins));
  assert.ok(projectPackageResolution.pins.length > 0);
  assert.deepEqual(workspacePackageResolution, projectPackageResolution);

  const picker = projectPackageResolution.pins.find(
    ({ identity }) => identity === "dkimagepickercontroller",
  );
  assert.deepEqual(picker?.state, {
    branch: "4.3.9",
    revision: "0bdfeacefa308545adde07bef86e349186335915",
  });
});
