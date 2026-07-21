import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseEligibilityAuditArgsV1,
  selectEligibilityAuditSampleV1,
} from "../../backend/card_descriptions/card_visual_search_eligibility_audit_v1.mjs";

function decision(id, tier, branch, options = {}) {
  return {
    card_print_id: id,
    decision_sha256: id.padEnd(64, "0").slice(0, 64),
    tier,
    prompt_branch: branch,
    projection_guard_keys: options.guards ?? [],
    critical_reasons: options.reasons ?? [],
  };
}

test("eligibility audit defaults to the reconciled policy artifact", () => {
  const args = parseEligibilityAuditArgsV1([]);
  assert.match(args.eligibilityDir, /2026-07-21T16-27-41-733Z_eligibility_9c39e1521be3$/);
});

test("audit selection deterministically covers branches guards critical reasons and gaps", () => {
  const decisions = [];
  let index = 1;
  for (const branch of ["pokemon", "trainer", "stadium", "item_tool_supporter"]) {
    decisions.push(decision(`a${index++}`, "A", branch), decision(`a${index++}`, "A", branch));
    decisions.push(decision(`b${index++}`, "B", branch, { guards: ["counts"] }), decision(`b${index++}`, "B", branch, { guards: ["counts"] }));
  }
  decisions.push(decision("bg1", "B", "pokemon", { guards: ["environment_setting"] }));
  decisions.push(decision("bg2", "B", "trainer", { guards: ["environment_setting"] }));
  for (let i = 0; i < 3; i += 1) decisions.push(decision(`c${i}`, "C", "pokemon", { reasons: ["critical_flag:potential_primary_subject_mismatch"] }));
  for (let i = 0; i < 3; i += 1) decisions.push(decision(`e${i}`, "C", "pokemon", { reasons: ["energy_card_excluded"] }));
  decisions.push(decision("g1", "C", "pokemon", { reasons: ["source_gap:image_skip"] }));
  decisions.push(decision("g2", "C", "trainer", { reasons: ["source_gap:image_skip"] }));

  const first = selectEligibilityAuditSampleV1(decisions, "seed");
  const second = selectEligibilityAuditSampleV1(decisions, "seed");
  assert.deepEqual(first, second);
  assert.ok(first.coverage.every((row) => row.satisfied));
  assert.ok(first.sample.some((row) => row.audit_strata.includes("tier_b_guard:environment_setting")));
  assert.ok(first.sample.some((row) => row.audit_strata.includes("tier_c_reason:critical_flag:potential_primary_subject_mismatch")));
  assert.ok(first.sample.some((row) => row.audit_strata.includes("tier_c_reason:energy_card_excluded")));
  assert.ok(first.sample.some((row) => row.audit_strata.includes("tier_c_gap:source_gap:image_skip")));
});

test("audit selector never duplicates sample IDs", () => {
  const shared = decision("shared", "B", "pokemon", { guards: ["counts", "environment_setting"] });
  const result = selectEligibilityAuditSampleV1([
    decision("a1", "A", "pokemon"),
    decision("a2", "A", "pokemon"),
    shared,
    decision("b2", "B", "pokemon", { guards: ["counts"] }),
    decision("b3", "B", "pokemon", { guards: ["environment_setting"] }),
  ], "seed");
  assert.equal(new Set(result.sample.map((row) => row.card_print_id)).size, result.sample.length);
});

test("eligibility audit implementation has no mutation or provider path", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_search_eligibility_audit_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /openai\.com|responses\.create|OPENAI_API_KEY/);
  assert.doesNotMatch(source, /\bpg\b|SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL/);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.match(source, /human_review_status:\s*"awaiting_stratified_policy_review"/);
});
