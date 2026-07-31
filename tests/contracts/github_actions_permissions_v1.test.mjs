import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflows = [
  ".github/workflows/staging-probe.yml",
  ".github/workflows/contracts-runtime-protection.yml",
  ".github/workflows/flutter-ci.yml",
  ".github/workflows/flutter-build-apk.yml",
  ".github/workflows/contracts-drift-gate.yml",
  ".github/workflows/ci-guard-keys.yml",
];

test("runtime workflows declare a least-privilege repository permission boundary", () => {
  for (const workflow of workflows) {
    const source = fs.readFileSync(workflow, "utf8");
    assert.match(source, /^permissions:\r?\n  contents: read$/m, workflow);
    assert.doesNotMatch(
      source,
      /^\s{2}(actions|checks|deployments|issues|packages|pull-requests|security-events|statuses): write$/m,
      workflow,
    );
  }
});
