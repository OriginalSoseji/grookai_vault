import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const manifest = fs.readFileSync(
  "android/app/src/main/AndroidManifest.xml",
  "utf8",
);
const gradle = fs.readFileSync("android/app/build.gradle.kts", "utf8");

test("Android release traffic is HTTPS-only while local debug remains usable", () => {
  assert.match(
    manifest,
    /android:usesCleartextTraffic="\$\{usesCleartextTraffic\}"/,
  );
  assert.match(
    gradle,
    /defaultConfig\s*\{[\s\S]*manifestPlaceholders\["usesCleartextTraffic"\]\s*=\s*"false"/,
  );
  assert.match(
    gradle,
    /debug\s*\{[\s\S]*manifestPlaceholders\["usesCleartextTraffic"\]\s*=\s*"true"/,
  );
  assert.match(
    gradle,
    /release\s*\{[\s\S]*manifestPlaceholders\["usesCleartextTraffic"\]\s*=\s*"false"/,
  );
  assert.doesNotMatch(manifest, /android:usesCleartextTraffic="true"/);
});
