import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("mobile release continuity V2 is active and sets one synchronized release baseline", () => {
  const index = read("docs/CONTRACT_INDEX.md");
  const contract = read("docs/contracts/MOBILE_RELEASE_CONTINUITY_V2.md");
  const pubspec = read("pubspec.yaml");
  const metadata = JSON.parse(read("docs/release/app_store_connect_ios_1_0.json"));
  const match = pubspec.match(/^version:\s*(\d+\.\d+\.\d+)\+(\d+)$/m);

  assert.match(index, /MOBILE_RELEASE_CONTINUITY_V2\s*\| Active release contract/);
  assert.match(index, /MOBILE_RELEASE_CONTINUITY_V1\s*\| Superseded by V2/);
  assert.ok(match, "pubspec must declare the release version and build number");
  assert.equal(metadata.build_marketing_version, match[1]);
  assert.equal(metadata.build_number, match[2]);
  assert.match(metadata.archive_path, new RegExp(`build${match[2]}\\.xcarchive$`));
  assert.match(metadata.export_path, new RegExp(`build${match[2]}$`));
  assert.match(contract, /same marketing version/i);
  assert.match(contract, /merged source commit/i);
  assert.match(contract, /signer SHA-256/i);
  assert.match(contract, /installed-data\s+capability/i);
  assert.match(contract, /candidate build must be greater than the installed version/i);
});

test("Android CI records verified package, build, source and signer lineage provenance", () => {
  const workflow = read(".github/workflows/flutter-build-apk.yml");
  const probe = read("scripts/android/AndroidSigningLineageProbe.java");

  assert.match(workflow, /name: Record and verify Android release identity/);
  assert.match(workflow, /PACKAGE_ID.*com\.grookai\.vault/);
  assert.match(workflow, /VERSION_CODE.*EXPECTED_BUILD_NUMBER/);
  assert.match(workflow, /SIGNER_SHA256/);
  assert.match(workflow, /include_debug_rotation/);
  assert.match(workflow, /ANDROID_LEGACY_DEBUG_KEYSTORE_BASE64/);
  assert.match(workflow, /\$APKSIGNER" rotate/);
  assert.match(workflow, /--set-installed-data true/);
  assert.match(workflow, /--lineage "\$LINEAGE"/);
  assert.match(workflow, /Android APK identity: package=/);
  assert.match(workflow, /gsub\(\/\[\^\[:xdigit:\]\]\//);
  assert.match(workflow, /tolower\(\$0\).*sha-256 digest:/);
  assert.match(workflow, /SIGNATURE_OUTPUT/);
  assert.match(workflow, /verify --print-certs.*2>&1/);
  assert.match(workflow, /apksigner report for diagnosis/);
  assert.match(workflow, /MOBILE_RELEASE_ARTIFACT_V2/);
  assert.match(workflow, /signer_lineage:p\.lineage/);
  assert.match(workflow, /mobile-release-manifest\.json/);
  assert.match(workflow, /source_commit:process\.argv\[5\]/);
  assert.match(workflow, /signer_sha256:process\.argv\[6\]/);
  assert.match(probe, /getSigningCertificateLineage/);
  assert.match(probe, /hasInstalledData/);
});

test("Android update preflight blocks unsafe updates and accepts only verified installed-data lineage", () => {
  const preflight = read("scripts/android_update_preflight.ps1");

  assert.match(preflight, /candidate\.VersionCode -le \$installedCode/);
  assert.match(preflight, /candidate\.SignerSha256 -ne \$releaseSigner/);
  assert.match(preflight, /candidate\.Lineage/);
  assert.match(preflight, /installedData -eq \$true/);
  assert.match(preflight, /AndroidSigningLineageProbe\.java/);
  assert.match(preflight, /adb.*'pull'/s);
  assert.match(preflight, /com\.grookai\.vault/);
  assert.doesNotMatch(preflight, /adb(?:\.exe)?['\s,]+(?:uninstall|shell\s+pm\s+clear)/i);
  assert.doesNotMatch(preflight, /adb\s+uninstall/i);
});
