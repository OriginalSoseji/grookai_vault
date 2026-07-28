import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateTcgplayerMarketCompletionV1,
  TCGPLAYER_MARKET_COMPLETION_REQUIREMENTS_V1,
} from "../../backend/pricing/tcgplayer_market_completion_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const AUDIT = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_market_completion_v1.mjs",
  ),
  "utf8",
);
const STATE = JSON.parse(
  readFileSync(
    path.join(
      ROOT,
      "docs",
      "audits",
      "pricing",
      "mee_pricing_platform_production_v1",
      "production_completion_matrix_v1",
      "state.json",
    ),
    "utf8",
  ),
);

function rows(status = "passed") {
  return TCGPLAYER_MARKET_COMPLETION_REQUIREMENTS_V1.map(
    (requirementId) => ({
      requirement_id: requirementId,
      status,
      current_truth: "Evidence exists.",
      next_gate: status === "passed" ? null : "Complete the gate.",
      evidence: ["package.json"],
    }),
  );
}

test("completion policy allows completion only when every requirement passes", () => {
  const result = evaluateTcgplayerMarketCompletionV1(rows());
  assert.equal(result.status, "complete");
  assert.equal(result.completion_allowed, true);
  assert.equal(result.counts.passed, result.counts.required);
  assert.deepEqual(result.findings, []);
});

test("pending and external blockers prevent completion", () => {
  const pendingRows = rows();
  pendingRows[0].status = "pending";
  pendingRows[0].next_gate = "Wait for verified production evidence.";
  const pending = evaluateTcgplayerMarketCompletionV1(pendingRows);
  assert.equal(pending.status, "in_progress");
  assert.equal(pending.completion_allowed, false);

  const blockedRows = rows();
  blockedRows[0].status = "blocked_external";
  blockedRows[0].next_gate = "Obtain external authority.";
  const blocked = evaluateTcgplayerMarketCompletionV1(blockedRows);
  assert.equal(blocked.status, "blocked_external");
  assert.equal(blocked.completion_allowed, false);
});

test("invalid or incomplete requirement evidence cannot produce completion", () => {
  const invalidRows = rows();
  invalidRows[0].evidence = [];
  invalidRows[1].current_truth = "";
  invalidRows.push({ ...invalidRows[2] });
  const result = evaluateTcgplayerMarketCompletionV1(invalidRows);
  assert.equal(result.status, "invalid");
  assert.equal(result.completion_allowed, false);
  assert.ok(result.findings.some((value) => value.includes("missing_evidence")));
  assert.ok(
    result.findings.some((value) => value.includes("missing_current_truth")),
  );
  assert.ok(result.findings.some((value) => value.includes("duplicate")));
});

test("repository completion state covers the exact governed requirement set", () => {
  const result = evaluateTcgplayerMarketCompletionV1(STATE.requirements);
  assert.equal(result.status, "in_progress");
  assert.equal(result.completion_allowed, false);
  assert.equal(result.counts.required, 30);
  assert.equal(result.counts.represented, 30);
  assert.equal(result.counts.blocked_external, 1);
  assert.deepEqual(result.findings, []);
});

test("completion audit is read-only and can enforce the final gate", () => {
  assert.match(AUDIT, /repository_reads_only:\s*true/);
  assert.match(AUDIT, /database_reads:\s*false/);
  assert.match(AUDIT, /database_writes:\s*false/);
  assert.match(AUDIT, /deployment_changes:\s*false/);
  assert.match(AUDIT, /goal_status_update:\s*false/);
  assert.match(AUDIT, /--require-complete/);
  assert.match(AUDIT, /artifact_hashes\.json/);
});
