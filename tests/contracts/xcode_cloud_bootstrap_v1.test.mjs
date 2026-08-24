import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const script = readFileSync("ios/ci_scripts/ci_post_clone.sh", "utf8");
const secretWriter = readFileSync(
  "scripts/write_ios_xcode_secrets.rb",
  "utf8",
);
const releaseConfig = readFileSync("ios/Flutter/Release.xcconfig", "utf8");
const mainDart = readFileSync("lib/main.dart", "utf8");
const mainShell = readFileSync("lib/main_shell.dart", "utf8");
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
  assert.match(script, /FLUTTER_VERSION="3\.44\.9"/);
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

test("local Debug signing is automatic while release signing remains manual", () => {
  const debugConfig = project.match(
    /97C147061CF9000F007C117D \/\* Debug \*\/ = \{[\s\S]*?\n\t\t\};/,
  )?.[0];
  const releaseConfig = project.match(
    /97C147071CF9000F007C117D \/\* Release \*\/ = \{[\s\S]*?\n\t\t\};/,
  )?.[0];

  assert.ok(debugConfig, "Runner Debug configuration must exist");
  assert.match(debugConfig, /CODE_SIGN_STYLE = Automatic;/);
  assert.doesNotMatch(debugConfig, /PROVISIONING_PROFILE_SPECIFIER/);

  assert.ok(releaseConfig, "Runner Release configuration must exist");
  assert.match(releaseConfig, /CODE_SIGN_STYLE = Manual;/);
  assert.match(releaseConfig, /Grookai Vault App Store Push/);
});

test("iOS declares only release privacy purpose strings used by the app", () => {
  for (const key of [
    "NSCameraUsageDescription",
    "NSPhotoLibraryUsageDescription",
  ]) {
    assert.match(infoPlist, new RegExp(`<key>${key}</key>\\s*<string>[^<]+</string>`));
  }
  assert.doesNotMatch(infoPlist, /NSLocationWhenInUseUsageDescription/);
  assert.doesNotMatch(infoPlist, /NSPhotoLibraryAddUsageDescription/);
});

test("Xcode Cloud generates Flutter and CocoaPods build inputs", () => {
  assert.match(script, /flutter pub get --enforce-lockfile/);
  assert.match(script, /phase=release-secrets/);
  assert.match(script, /ruby scripts\/write_ios_xcode_secrets\.rb \|\| exit 27/);
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
    /flutter build ios --release --no-codesign --config-only[\s\S]*?GROOKAI_SOURCE_COMMIT_SHA=\$\{CI_COMMIT\}[\s\S]*?GROOKAI_BUILD_RUN_ID=\$\{CI_BUILD_ID:-xcode-cloud\}[\s\S]*?\|\| exit 26/,
  );

  const podAvailabilityIndex = script.indexOf("if ! command -v pod");
  const releaseSecretsIndex = script.indexOf(
    "ruby scripts/write_ios_xcode_secrets.rb",
  );
  const podInstallIndex = script.indexOf("pod install", podAvailabilityIndex);
  const releaseConfigIndex = script.indexOf(
    "flutter build ios --release --no-codesign --config-only",
  );

  assert.ok(podAvailabilityIndex >= 0);
  assert.ok(releaseSecretsIndex >= 0);
  assert.ok(releaseSecretsIndex < podAvailabilityIndex);
  assert.ok(podInstallIndex > podAvailabilityIndex);
  assert.ok(releaseConfigIndex > podInstallIndex);
});

test("Xcode Cloud injects required release configuration before archive", () => {
  assert.match(
    secretWriter,
    /required_keys = %w\[SUPABASE_URL SUPABASE_PUBLISHABLE_KEY\]/,
  );
  assert.match(secretWriter, /value = ENV\[key\]\.to_s/);
  assert.match(secretWriter, /env\[key\] = value unless value\.strip\.empty\?/);
  assert.match(secretWriter, /DART_DEFINES=#\{encoded\}/);
  assert.match(secretWriter, /firebase_options_path = File\.join\('lib', 'firebase_options\.dart'\)/);
  assert.match(secretWriter, /firebase_ios_app_id = ios_options/);
  assert.match(secretWriter, /FIREBASE_IOS_APP_ID=#\{firebase_ios_app_id\}/);
  assert.match(secretWriter, /binder_keys = %w\[/);
  for (const key of [
    "BINDERS_SCHEMA_V1",
    "BINDERS_PERSONAL_V1",
    "BINDERS_SHARED_V1",
    "BINDERS_VIEW_LINKS_V1",
    "BINDERS_PUBLIC_V1",
    "BINDERS_COMMUNITY_V1",
    "BINDERS_TEMPLATES_V1",
    "BINDERS_CUSTOM_TARGET_V1",
  ]) {
    assert.match(secretWriter, new RegExp(`'${key}' => 'true'`));
  }
  for (const key of [
    "BINDERS_NOTIFICATIONS_V1",
    "BINDERS_PULSE_SHARING_V1",
    "BINDERS_SET_TARGET_V1",
  ]) {
    assert.match(secretWriter, new RegExp(`'${key}' => 'false'`));
  }
  assert.match(
    secretWriter,
    /Missing required local Xcode secrets: #\{missing\.join\(', '\)\}/,
  );
  assert.doesNotMatch(secretWriter, /puts .*SUPABASE_/);
  assert.match(releaseConfig, /#include\? "ReleaseSecrets\.xcconfig"/);
});

test("enabled personal Binders have a visible signed-in navigation entry", () => {
  assert.match(mainShell, /Future<void> _openBinderLibrary\(\)/);
  assert.match(mainShell, /label: 'Binders'/);
  assert.match(
    mainShell,
    /BinderFeatureFlags\.production\.personalAvailable/,
  );
  assert.match(
    mainShell,
    /BinderLibraryScreen\(featureFlags: BinderFeatureFlags\.production\)/,
  );
});

test("startup configuration failure renders an explicit app state", () => {
  assert.match(mainDart, /catch \(error, stackTrace\)/);
  assert.match(mainDart, /runApp\(const _GrookaiStartupFailureApp\(\)\)/);
  assert.match(mainDart, /Grookai Vault could not start/);
  assert.match(mainDart, /missing required startup configuration/);
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

test("Xcode Cloud uploads release dSYMs to Firebase Crashlytics", () => {
  const runnerTarget = project.match(
    /97C146ED1CF9000F007C117D \/\* Runner \*\/ = \{[\s\S]*?\n\t\t\};/,
  )?.[0];

  assert.ok(runnerTarget, "Runner target must exist");
  assert.match(
    runnerTarget,
    /45A8DC11EE67A4129EBB6F70 \/\* \[CP\] Embed Pods Frameworks \*\/,\s+D5A9C0E7B3F14A829D6E7101 \/\* \[firebase_crashlytics\] Upload Symbols \*\/,\s+\);/,
    "Crashlytics symbol upload must be the final Runner build phase",
  );

  const uploadPhase = project.match(
    /D5A9C0E7B3F14A829D6E7101 \/\* \[firebase_crashlytics\] Upload Symbols \*\/ = \{[\s\S]*?\n\t\t\};/,
  )?.[0];

  assert.ok(uploadPhase, "Crashlytics upload phase must exist");
  assert.match(
    uploadPhase,
    /SourcePackages\/checkouts\/firebase-ios-sdk\/Crashlytics\/run/,
  );
  assert.match(
    uploadPhase,
    /\$\{DWARF_DSYM_FOLDER_PATH\}\/\$\{DWARF_DSYM_FILE_NAME\}/,
  );
  assert.match(
    uploadPhase,
    /Contents\/Resources\/DWARF\/\$\{PRODUCT_NAME\}/,
  );
  assert.match(
    uploadPhase,
    /Contents\/Resources\/DWARF\/\$\{PRODUCT_NAME\}\.debug\.dylib/,
  );
  assert.match(uploadPhase, /Contents\/Info\.plist/);
  assert.match(
    uploadPhase,
    /\$\(TARGET_BUILD_DIR\)\/\$\(EXECUTABLE_PATH\)/,
  );
  assert.match(uploadPhase, /FIREBASE_IOS_APP_ID is required/);
  assert.match(uploadPhase, /--app-id/);
  assert.doesNotMatch(uploadPhase, /GoogleService-Info\.plist/);
  assert.match(uploadPhase, /CONFIGURATION/);
  assert.match(uploadPhase, /Debug/);
  assert.match(uploadPhase, /Skipping Crashlytics symbol upload/);

  const releaseDsymConfigs = project.match(
    /DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";/g,
  );
  assert.equal(
    releaseDsymConfigs?.length,
    2,
    "Profile and Release must both emit dSYMs",
  );
});
