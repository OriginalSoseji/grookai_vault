import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITIES_V1,
  TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITY_AUTHORITY_V1,
  reviewedTcgplayerProfessorProgramProductIdentityByIdV1,
} from "../../backend/pricing/tcgplayer_professor_program_product_identity_authority_v1.mjs";
import { planTcgplayerExactMappingCandidateV1 } from
  "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";
import { validateTcgplayerExactMappingCandidateForApplyV1 } from
  "../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";

const readinessPath = path.join(process.cwd(), "docs", "audits",
  "tcgplayer_professor_program_mapping_readiness_post_printing_apply_20261105_v1.json");

test("Professor Program reviewed-product authority admits exactly seven frozen stamped targets", () => {
  assert.equal(TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITIES_V1.length, 7);
  assert.deepEqual(TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITIES_V1.map((row) => row.source_product_id),
    [176629, 176630, 176631, 176632, 176633, 213516, 499366]);
  assert.equal(reviewedTcgplayerProfessorProgramProductIdentityByIdV1(176638), null);
  for (const row of TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITIES_V1) {
    assert.equal(row.authority_version, TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITY_AUTHORITY_V1);
    assert.equal(row.source_group_id, 2332);
    assert.equal(row.target.variant_key, "professor_program_stamp");
    assert.ok(row.printing.printing_id);
    assert.ok(row.printing.printing_gv_id);
  }
});

test("Professor Program reviewed products pass exact plan and apply policy without widening scope", () => {
  for (const row of TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITIES_V1) {
    const source = { source_product_id: row.source_product_id,
      source_product_name: row.source_product_name, source_group_id: row.source_group_id,
      source_group_name: row.source_group_name, printed_number: row.printed_number,
      has_printed_number_evidence: true, active_source_mapping_count: 0,
      source_subtypes: [row.printing.finish_key], supporting_gap_observation_ids: ["observation"],
      supporting_gap_row_count: 1 };
    const target = { card_print_id: row.target.card_print_id, gv_id: row.target.gv_id,
      set_id: row.target.set_id, set_code: row.target.set_code, name: row.target.name,
      number: row.target.number, variant_key: row.target.variant_key,
      active_standard_identity_count: 1, active_tcgplayer_mapping_count: 0 };
    const candidate = planTcgplayerExactMappingCandidateV1({ source, directTargets: [target] });
    assert.equal(candidate.disposition, "candidate", JSON.stringify(candidate));
    assert.equal(candidate.reviewed_product_identity_authority_version,
      TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITY_AUTHORITY_V1);
    assert.equal(candidate.mapping_method, "exact_reviewed_product_identity_authority_v1");
    assert.equal(validateTcgplayerExactMappingCandidateForApplyV1(candidate).accepted, true);
  }
});

test("post-repair production readiness freezes seven ready mappings and holds Sycamore", async () => {
  const report = JSON.parse(await fs.readFile(readinessPath, "utf8"));
  assert.equal(report.counts.ready, 7);
  assert.equal(report.counts.blocked, 0);
  assert.equal(report.counts.active_mapping_collisions, 0);
  assert.equal(report.counts.active_publication_overlap, 0);
  assert.equal(report.held_row.source_product_id, 176638);
  assert.equal(report.held_row.status, "held_finish_conflict_confirmed");
});
