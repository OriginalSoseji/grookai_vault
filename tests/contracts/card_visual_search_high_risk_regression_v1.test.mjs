import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_SEARCH_HIGH_RISK_REGRESSION_VERSION,
  evaluateHighRiskRegressionV1,
  parseCardVisualSearchHighRiskRegressionArgsV1,
} from "../../backend/card_descriptions/card_visual_search_high_risk_regression_v1.mjs";

function response(overrides = {}) {
  return {
    total_matches: 1,
    strict_zero_reason: null,
    parsed_query: {
      detected_subjects: [{ normalized_name: "pikachu" }],
    },
    results: [
      {
        artwork_group_id: "group-cookie",
        matched_subject_roles: ["character_representation"],
        matching_printings: [{ gv_id: "GV-PK-ASC-094" }],
        matched_evidence: [
          {
            source_id: "evidence-cookie",
            match_authority: "human_image_confirmed",
            supporting_observation_ids: [],
            supporting_external_evidence_ids: ["review-cookie"],
          },
        ],
      },
    ],
    ...overrides,
  };
}

test("high-risk evaluator accepts governed external evidence and exact role binding", () => {
  const decision = evaluateHighRiskRegressionV1(
    {
      regression_id: "cookie",
      query: "Pikachu-shaped cookie",
      exact_matches: 1,
      required_gv_ids: ["GV-PK-ASC-094"],
      required_role: "character_representation",
      all_results_require_role: true,
    },
    response(),
  );
  assert.equal(decision.passed, true);
  assert.deepEqual(decision.findings, []);
});

test("high-risk evaluator fails missing, excluded, unreferenced, and role-confused evidence", () => {
  const decision = evaluateHighRiskRegressionV1(
    {
      regression_id: "negative",
      query: "fixture",
      exact_matches: 1,
      required_gv_ids: ["GV-REQUIRED"],
      excluded_gv_ids: ["GV-PK-ASC-094"],
      required_role: "depicted_subject",
      all_results_require_role: true,
      forbidden_detected_subjects: ["pikachu"],
    },
    response({
      results: [
        {
          artwork_group_id: "group-cookie",
          matched_subject_roles: ["character_representation"],
          matching_printings: [{ gv_id: "GV-PK-ASC-094" }],
          matched_evidence: [
            {
              source_id: "unreferenced",
              supporting_observation_ids: [],
              supporting_external_evidence_ids: [],
            },
          ],
        },
      ],
    }),
  );
  assert.equal(decision.passed, false);
  assert.ok(decision.findings.includes("required_gv_id_missing:GV-REQUIRED"));
  assert.ok(decision.findings.includes("excluded_gv_id_present:GV-PK-ASC-094"));
  assert.ok(decision.findings.includes("required_role_missing:depicted_subject"));
  assert.ok(decision.findings.includes("result_without_required_role:depicted_subject"));
  assert.ok(decision.findings.includes("forbidden_detected_subject:pikachu"));
  assert.ok(
    decision.findings.includes(
      "missing_evidence_reference:group-cookie:unreferenced",
    ),
  );
});

test("high-risk runner defaults to the frozen local corpus and has no mutation path", () => {
  const args = parseCardVisualSearchHighRiskRegressionArgsV1([]);
  assert.equal(
    CARD_VISUAL_SEARCH_HIGH_RISK_REGRESSION_VERSION,
    "CARD_VISUAL_SEARCH_HIGH_RISK_REGRESSION_V1",
  );
  assert.match(args.projectionDir, /projection_f407659f4d99$/u);
  const source = readFileSync(
    new URL(
      "../../backend/card_descriptions/card_visual_search_high_risk_regression_v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /OPENAI_API_KEY|responses\.create|embeddings?\.create|text-embedding/iu,
  );
  assert.doesNotMatch(
    source,
    /SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL|createClient\(/u,
  );
  assert.doesNotMatch(
    source,
    /insert\s+into|update\s+public\.|delete\s+from/iu,
  );
});
