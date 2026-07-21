import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  computeCalibrationMetricsV1,
  reconcileCalibrationJudgmentsV1,
  validateJudgmentSubmissionV1,
} from "../../backend/card_descriptions/card_visual_search_calibration_evaluator_v1.mjs";

function packetQuery(index, family = "environment") {
  const queryId = `vsq_${String(index).padStart(4, "0")}`;
  const groupId = `group-${index}`;
  return { query_id: queryId, family, query_text: `query ${index}`, result_count: 1, top_results: [{ rank: 1, artwork_group_id: groupId, eligibility_tier: index % 2 ? "A" : "B" }], source_candidate: { artwork_group_id: groupId, present_in_top_results: true, rank: 1 } };
}

function packet() {
  const difficult = new Set(["subject_roles", "multi_subject_scenes", "objects_counts", "representation_cameo", "alias_intent", "printing_expansion", "negative_zero_result"]);
  const families = [...difficult];
  return { packet_version: "CARD_VISUAL_SEARCH_JUDGMENT_PACKET_V1", judgment_set_version: "CARD_VISUAL_SEARCH_JUDGMENTS_V1_CALIBRATION_DRAFT", commit_sha: "packet-sha", run_key: "packet-run", queries: Array.from({ length: 200 }, (_, index) => packetQuery(index + 1, index < families.length ? families[index] : "environment")) };
}

function submissionRows(value, reviewer, { completeAll = true, label = "relevant" } = {}) {
  return value.queries.map((query) => ({ packet_version: value.packet_version, judgment_set_version: value.judgment_set_version, query_id: query.query_id, reviewer_key: reviewer, source_commit_sha: value.commit_sha, source_run_key: value.run_key, query_decision: "results_judged", failure_labels: [], notes: null, completed_at: completeAll ? "2026-07-21T00:00:00.000Z" : null, top_result_judgments: query.top_results.map((result) => ({ artwork_group_id: result.artwork_group_id, rank: result.rank, judgment: label, notes: null })), source_candidate_judgment: null }));
}

test("complete primary submission validates exact packet provenance and result identities", () => {
  const value = packet();
  const result = validateJudgmentSubmissionV1(submissionRows(value, "reviewer-a"), value, { requireAllQueries: true });
  assert.equal(result.valid, true);
  assert.equal(result.completed_count, 200);
  assert.equal(result.reviewer_key, "reviewer-a");
});

test("missing labels and provenance mismatches fail closed", () => {
  const value = packet();
  const rows = submissionRows(value, "reviewer-a");
  rows[0].source_run_key = "wrong";
  rows[1].top_result_judgments[0].judgment = null;
  const result = validateJudgmentSubmissionV1(rows, value, { requireAllQueries: true });
  assert.equal(result.valid, false);
  assert.ok(result.findings.some((finding) => finding.startsWith("source_run_key_mismatch")));
  assert.ok(result.findings.some((finding) => finding.startsWith("missing_or_invalid_result_judgment")));
});

test("difficult families require two independent matching reviews", () => {
  const value = packet();
  const primary = validateJudgmentSubmissionV1(submissionRows(value, "reviewer-a"), value, { requireAllQueries: true });
  const secondary = validateJudgmentSubmissionV1(submissionRows(value, "reviewer-b"), value, { requiredFamilies: new Set(["subject_roles", "multi_subject_scenes", "objects_counts", "representation_cameo", "alias_intent", "printing_expansion", "negative_zero_result"]) });
  const reconciled = reconcileCalibrationJudgmentsV1(value, [primary, secondary]);
  assert.equal(reconciled.reconciled, true);
  assert.equal(reconciled.final_judgments.size, 200);
  const duplicateReviewer = reconcileCalibrationJudgmentsV1(value, [primary, { ...secondary, reviewer_key: "reviewer-a" }]);
  assert.equal(duplicateReviewer.reconciled, false);
  assert.ok(duplicateReviewer.findings.includes("reviewer_keys_not_independent"));
});

test("disagreement produces an adjudication queue and blocks metrics", () => {
  const value = packet();
  const primary = validateJudgmentSubmissionV1(submissionRows(value, "reviewer-a"), value, { requireAllQueries: true });
  const rows = submissionRows(value, "reviewer-b");
  rows[0].top_result_judgments[0].judgment = "not_relevant";
  const secondary = validateJudgmentSubmissionV1(rows, value, { requiredFamilies: new Set([value.queries[0].family]) });
  const reconciled = reconcileCalibrationJudgmentsV1(value, [primary, secondary]);
  assert.equal(reconciled.reconciled, false);
  assert.equal(reconciled.disagreements.length, 1);
  assert.equal(reconciled.disagreements[0].query_id, "vsq_0001");
});

test("official calibration metrics are global and family stratified", () => {
  const value = packet();
  const primary = validateJudgmentSubmissionV1(submissionRows(value, "reviewer-a"), value, { requireAllQueries: true });
  const metrics = computeCalibrationMetricsV1(value, primary.completed);
  assert.equal(metrics.global.precision_at_10, 1);
  assert.equal(metrics.global.recall_at_10, 1);
  assert.equal(metrics.global.recall_at_25, 1);
  assert.equal(metrics.global.ndcg_at_10, 1);
  assert.equal(metrics.global.mean_reciprocal_rank, 1);
  assert.ok(metrics.by_family.environment);
});

test("implementation has no provider database embedding holdout or mutation path", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_search_calibration_evaluator_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /OPENAI_API_KEY|responses\.create|embeddings?\.create|text-embedding/i);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL|createClient\(/);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.match(source, /holdout_executed:\s*false/);
});
