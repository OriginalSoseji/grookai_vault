// Run after the documented `flutter create --no-pub` command. No build/install.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
assert.equal(process.argv.length, 2, "No arbitrary target supported");
const out = path.join(root, ".local/storefront/device_harness");
const manifest = path.join(out, "storefront-proof-prepared.json");
assert(!fs.existsSync(manifest), "Preserve an existing prepared shell");
assert(!fs.existsSync(path.join(out, "fixture-defines.json")), "Preserve an already configured local shell");
assert(
  fs
    .readFileSync(path.join(out, "pubspec.yaml"), "utf8")
    .includes("name: storefrontproof"),
);
const shell = JSON.parse(
  fs.readFileSync(
    path.join(root, "scripts/tests/storefront_device_shell_v1.json"),
  ),
);
for (const [name, value] of Object.entries(shell.files)) {
  const target = path.resolve(out, name);
  assert(target.startsWith(out + path.sep));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
}
for (const name of [
  "pubspec.lock",
  "android/settings.gradle.kts",
  "android/gradle/wrapper/gradle-wrapper.properties",
]) {
  fs.copyFileSync(path.join(root, name), path.join(out, name));
}
fs.mkdirSync(path.join(out, "integration_test"), { recursive: true });
for (const [source, target] of [
  ["storefront_device_harness_v1.dart.template", "lib/main.dart"],
  [
    "storefront_device_journey_v1.dart.template",
    "integration_test/storefront_device_test.dart",
  ],
])
  fs.copyFileSync(
    path.join(root, "scripts/tests", source),
    path.join(out, target),
  );
const fixture = JSON.parse(
  fs.readFileSync(path.join(root, ".local/storefront/http-fixture.json")),
);
assert(
  fixture.tokens.owner && fixture.tokens.visitor,
  "Start the dedicated synthetic adapter first",
);
fs.writeFileSync(
  path.join(out, "fixture-defines.json"),
  JSON.stringify(
    {
      FIXTURE_OWNER_TOKEN: fixture.tokens.owner,
      FIXTURE_VISITOR_TOKEN: fixture.tokens.visitor,
      GROOKAI_WEB_BASE_URL: "http://127.0.0.1:15440",
    },
    null,
    2,
  ),
);
fs.writeFileSync(
  manifest,
  JSON.stringify(
    {
      preparedAt: new Date().toISOString(),
      applicationId: shell.applicationId,
      installed: false,
    },
    null,
    2,
  ),
);
console.log(
  "Prepared separate local shell. Run flutter pub get --offline and verify lock parity before building.",
);
