import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const WORKFLOW = readFileSync(
  path.join(ROOT, ".github", "workflows", "prod-edge-probe.yml"),
  "utf8",
);

test("production edge probe cannot upload a stale root summary", () => {
  assert.match(WORKFLOW, /Remove-Item -LiteralPath \$artifactDir/);
  assert.match(WORKFLOW, /\$artifactDir\/SUMMARY\.md/);
  assert.match(WORKFLOW, /\$artifactDir\/probe\.json/);
  assert.match(WORKFLOW, /path: probe-artifacts/);
  assert.match(WORKFLOW, /if-no-files-found: error/);
  assert.doesNotMatch(WORKFLOW, /path: SUMMARY\.md/);
});

test("production edge probe handles HTTP errors without legacy response APIs", () => {
  assert.match(WORKFLOW, /-SkipHttpErrorCheck/);
  assert.match(WORKFLOW, /200 \{ "anonymous_accessible" \}/);
  assert.match(WORKFLOW, /401 \{ "anonymous_denied" \}/);
  assert.match(WORKFLOW, /403 \{ "anonymous_denied" \}/);
  assert.match(WORKFLOW, /400 \{ "application_error" \}/);
  assert.match(WORKFLOW, /endpoint_health = \$endpointHealth/);
  assert.match(
    WORKFLOW,
    /throw "wall_feed returned unexpected HTTP status \$status \(\$decision\)"/,
  );
  assert.doesNotMatch(WORKFLOW, /GetResponseStream/);
});

test("diagnostic failures are not masked by continue-on-error", () => {
  const diagnosticStep = WORKFLOW.match(
    /- name: Diagnose wall_feed \(anon\)([\s\S]*?)- name: Upload probe summary/,
  )?.[1];
  assert.ok(diagnosticStep);
  assert.doesNotMatch(diagnosticStep, /continue-on-error:\s*true/);
  assert.match(diagnosticStep, /\$ErrorActionPreference = "Stop"/);
  assert.match(
    diagnosticStep,
    /throw "wall_feed transport probe failed: \$transportError"/,
  );
  assert.match(
    diagnosticStep,
    /throw "wall_feed returned unexpected HTTP status/,
  );
});
