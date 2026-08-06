import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { evaluateReleaseCompletionManifestV1 } from "../../scripts/audits/release_completion_gate_v1.mjs";

const manifestPath = path.resolve(
  "docs/audits/release_completion_v1/completion_manifest_v1.json",
);

test("current release ledger is internally valid and remains incomplete", async () => {
  const result = await evaluateReleaseCompletionManifestV1(manifestPath);
  assert.deepEqual(result.findings, []);
  assert.equal(result.status, "IN_PROGRESS");
  assert.equal(result.completion_allowed, false);
  assert.ok(result.proven_gate_count > 0);
  assert.ok(result.non_proven_gate_ids.includes("final_72_hour_release_candidate_soak"));
});

test("completion cannot be asserted while a gate remains open", async () => {
  const source = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  source.completion_allowed = true;
  source.status = "COMPLETE";
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "grookai-release-ledger-"));
  const tempManifest = path.join(tempDirectory, "manifest.json");
  await fs.writeFile(tempManifest, `${JSON.stringify(source, null, 2)}\n`);
  const result = await evaluateReleaseCompletionManifestV1(tempManifest);
  assert.equal(result.completion_allowed, false);
  assert.ok(result.findings.includes("completion_flag_does_not_match_gate_truth"));
  assert.ok(result.findings.includes("manifest_status_does_not_match_gate_truth"));
});

test("release parity never silently reuses an unrelated local server", async () => {
  const config = await fs.readFile(
    path.resolve("apps/web/playwright.config.ts"),
    "utf8",
  );
  assert.match(
    config,
    /GROOKAI_PLAYWRIGHT_REUSE_SERVER === "1"/,
  );
  assert.doesNotMatch(config, /reuseExistingServer:\s*!process\.env\.CI/);
});
