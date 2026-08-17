import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  assertEmulatorVideoScenarioV1,
  validateEmulatorVideoScenarioV1,
} from "../../scripts/social_media/emulator_video_policy_v1.mjs";

const scenarioPath = new URL(
  "../../scripts/social_media/scenarios/signed_out_charizard_search_v1.json",
  import.meta.url,
);

test("social video scenario is bounded and cannot publish", async () => {
  const scenario = JSON.parse(await fs.readFile(scenarioPath, "utf8"));
  const result = assertEmulatorVideoScenarioV1(scenario);
  assert.equal(result.valid, true);
  assert.equal(result.publishing_enabled, false);
});

test("publishing mode is rejected", async () => {
  const scenario = JSON.parse(await fs.readFile(scenarioPath, "utf8"));
  scenario.publishing.mode = "automatic";
  const result = validateEmulatorVideoScenarioV1(scenario);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("publishing_must_be_disabled"));
});

test("posting actions are outside the agent action vocabulary", async () => {
  const scenario = JSON.parse(await fs.readFile(scenarioPath, "utf8"));
  scenario.steps.push({ action: "publish_to_tiktok" });
  const result = validateEmulatorVideoScenarioV1(scenario);
  assert.equal(result.valid, false);
  assert.ok(result.findings.some((finding) => finding.includes("unsupported_action")));
  assert.ok(result.findings.some((finding) => finding.includes("publishing_action_forbidden")));
});

test("recordings longer than the canary envelope are rejected", async () => {
  const scenario = JSON.parse(await fs.readFile(scenarioPath, "utf8"));
  scenario.recording.max_duration_seconds = 180;
  const result = validateEmulatorVideoScenarioV1(scenario);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("recording_duration_out_of_bounds"));
});

