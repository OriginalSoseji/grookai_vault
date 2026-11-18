import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("mobile release contract is indexed and sets one synchronized release baseline", () => {
  const index = read("docs/CONTRACT_INDEX.md");
  const contract = read("docs/contracts/MOBILE_RELEASE_CONTINUITY_V1.md");
  const pubspec = read("pubspec.yaml");
  const metadata = JSON.parse(read("docs/release/app_store_connect_ios_1_0.json"));
  const match = pubspec.match(/^version:\s*(\d+\.\d+\.\d+)\+(\d+)$/m);

  assert.match(index, /MOBILE_RELEASE_CONTINUITY_V1\s*\| Active release contract/);
  assert.ok(match, "pubspec must declare the release version and build number");
  assert.equal(metadata.build_marketing_version, match[1]);
  assert.equal(metadata.build_number, match[2]);
  assert.match(metadata.archive_path, new RegExp(`build${match[2]}\\.xcarchive$`));
  assert.match(metadata.export_path, new RegExp(`build${match[2]}$`));
  assert.match(contract, /same merged\s+source commit/i);
  assert.match(contract, /signer SHA-256/i);
});

test("Android CI records verified package, build, source and signing provenance", () => {
  const workflow = read(".github/workflows/flutter-build-apk.yml");

  assert.match(workflow, /name: Record and verify Android release identity/);
  assert.match(workflow, /PACKAGE_ID.*com\.grookai\.vault/);
  assert.match(workflow, /VERSION_CODE.*EXPECTED_BUILD_NUMBER/);
  assert.match(workflow, /SIGNER_SHA256/);
  assert.match(workflow, /Android APK identity: package=/);
  assert.match(workflow, /gsub\(\/:\//);
  assert.match(workflow, /SIGNATURE_OUTPUT/);
  assert.match(workflow, /mobile-release-manifest\.json/);
  assert.match(workflow, /source_commit:process\.argv\[5\]/);
  assert.match(workflow, /signer_sha256:process\.argv\[6\]/);
});

test("Android update preflight blocks downgrade and signer mismatch without uninstalling", () => {
  const preflight = read("scripts/android_update_preflight.ps1");

  assert.match(preflight, /candidate\.VersionCode -le \$installedCode/);
  assert.match(preflight, /candidate\.SignerSha256 -ne \$installed\.SignerSha256/);
  assert.match(preflight, /adb.*'pull'/s);
  assert.match(preflight, /com\.grookai\.vault/);
  assert.doesNotMatch(preflight, /adb(?:\.exe)?['\s,]+(?:uninstall|shell\s+pm\s+clear)/i);
  assert.doesNotMatch(preflight, /adb\s+uninstall/i);
});
