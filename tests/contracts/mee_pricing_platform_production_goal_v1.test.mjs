import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadGoal } from "../../.codex/goals/load_goal.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const registry = JSON.parse(
  readFileSync(path.join(ROOT, ".codex", "goals", "registry.json"), "utf8"),
);

test("MEE Pricing Platform Production V1 appears in the supported goal registry", () => {
  const goal = registry.goals.find(
    (candidate) => candidate.id === "mee-pricing-platform-production-v1",
  );
  assert.equal(goal?.title, "MEE Pricing Platform Production V1");
  assert.equal(goal?.status, "active");
});

test("goal loader verifies and returns the complete founder specification", async () => {
  const goal = await loadGoal("mee-pricing-platform-production-v1");
  const actualHash = createHash("sha256")
    .update(goal.specification)
    .digest("hex");
  assert.equal(actualHash, goal.spec_sha256);
  assert.match(goal.specification, /# 1\. Goal Registration/);
  assert.match(goal.specification, /# 23\. Execution Reporting/);
  assert.match(goal.specification, /stratified 100-printing canary/);
  assert.match(goal.specification, /seven unattended daily cycles/i);
});

test("goal preserves autonomous execution without micro-approvals", async () => {
  const goal = await loadGoal("mee-pricing-platform-production-v1");
  assert.equal(goal.autonomous_execution, true);
  assert.equal(goal.micro_approvals_required, false);
  assert.match(goal.specification, /Do not stop for planning approval/);
  assert.match(goal.specification, /Do not ask for micro-approvals/);
});

test("goal cannot complete from partial UI functionality", async () => {
  const goal = await loadGoal("mee-pricing-platform-production-v1");
  assert.equal(goal.completion_model, "production_verified");
  assert.ok(goal.completion_requires.includes("three_shadow_cycles"));
  assert.ok(
    goal.completion_requires.includes("authenticated_72_hour_canary"),
  );
  assert.ok(
    goal.completion_requires.includes("seven_unattended_full_eligible_cycles"),
  );
  assert.match(
    goal.specification,
    /A partial backend, one working endpoint, one card-page price, or an incomplete rollout is not completion\./,
  );
});

test("goal requires production verification before completion", async () => {
  const goal = await loadGoal("mee-pricing-platform-production-v1");
  assert.ok(goal.completion_requires.includes("production_migration_parity"));
  assert.ok(
    goal.completion_requires.includes("complete_source_to_client_provenance"),
  );
  assert.match(
    goal.specification,
    /Do not report success without command output, database readbacks, API evidence, and client verification\./,
  );
});
