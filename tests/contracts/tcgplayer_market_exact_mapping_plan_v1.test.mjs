import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  normalizeTcgplayerMappingNameV1,
  normalizeTcgplayerMappingNumberV1,
  planTcgplayerExactMappingCandidateV1,
  quarantineTcgplayerTargetCollisionsV1,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_market_exact_mapping_plan_v1.mjs",
  ),
  "utf8",
);

function source(overrides = {}) {
  return {
    source_product_id: 704758,
    source_product_name: "Tropius - 001/084",
    source_group_id: 24688,
    source_group_name: "ME05: Pitch Black",
    printed_number: "001/084",
    has_printed_number_evidence: true,
    active_source_mapping_count: 0,
    source_subtypes: ["Normal", "Reverse Holofoil"],
    supporting_gap_observation_ids: ["obs-1", "obs-2"],
    supporting_gap_row_count: 2,
    ...overrides,
  };
}

function target(overrides = {}) {
  return {
    card_print_id: "card-1",
    gv_id: "GV-PK-ME05-001",
    set_id: "set-1",
    set_code: "me05",
    name: "Tropius",
    number: "001",
    variant_key: "",
    active_standard_identity_count: 1,
    active_tcgplayer_mapping_count: 0,
    embedded_external_id: "tcgcsv:24688:704758",
    ...overrides,
  };
}

test("normalizes TCGPlayer title suffixes, accents, genders, and numbers", () => {
  assert.equal(
    normalizeTcgplayerMappingNameV1("Flabébé - 086/182"),
    "flabebe",
  );
  assert.equal(normalizeTcgplayerMappingNameV1("Nidoran ♂"), "nidoran m");
  assert.equal(normalizeTcgplayerMappingNumberV1("001/084"), "1");
  assert.equal(normalizeTcgplayerMappingNumberV1("SVP001"), "SVP1");
  assert.equal(normalizeTcgplayerMappingNumberV1("TG01/TG30"), "TG1");
});

test("direct embedded identity produces an exact candidate", () => {
  const result = planTcgplayerExactMappingCandidateV1({
    source: source(),
    directTargets: [target()],
  });
  assert.equal(result.disposition, "candidate");
  assert.equal(result.evidence_lane, "embedded_tcgcsv_identity");
  assert.equal(result.mapping_confidence, 1);
  assert.equal(result.target.card_print_id, "card-1");
  assert.match(result.candidate_fingerprint, /^[a-f0-9]{64}$/);
});

test("embedded identity blocks without one active standard identity", () => {
  const result = planTcgplayerExactMappingCandidateV1({
    source: source(),
    directTargets: [target({ active_standard_identity_count: 0 })],
  });
  assert.equal(result.disposition, "blocked");
  assert.equal(
    result.reason,
    "target_missing_unique_active_standard_identity",
  );
});

test("unique group set consensus requires exact name and number", () => {
  const result = planTcgplayerExactMappingCandidateV1({
    source: source({
      source_product_id: 999,
      source_group_id: 100,
      source_group_name: "Test Set",
    }),
    groupConsensus: {
      set_count: 1,
      set_id: "set-1",
      set_code: "test",
      mapped_source_product_count: 50,
    },
    setTargets: [target({ embedded_external_id: null })],
  });
  assert.equal(result.disposition, "candidate");
  assert.equal(result.evidence_lane, "unique_group_set_consensus");
  assert.equal(result.mapping_confidence, 0.99);
});

test("ambiguous set authority and target collisions remain blocked", () => {
  const noAuthority = planTcgplayerExactMappingCandidateV1({
    source: source(),
    groupConsensus: { set_count: 2 },
  });
  assert.equal(noAuthority.reason, "missing_unique_set_authority");

  const collision = planTcgplayerExactMappingCandidateV1({
    source: source(),
    directTargets: [target({ active_tcgplayer_mapping_count: 1 })],
  });
  assert.equal(
    collision.reason,
    "target_already_has_active_tcgplayer_mapping",
  );
});

test("multiple source products for one canonical target are quarantined", () => {
  const first = planTcgplayerExactMappingCandidateV1({
    source: source({ source_product_id: 1001 }),
    directTargets: [target()],
  });
  const second = planTcgplayerExactMappingCandidateV1({
    source: source({ source_product_id: 1002 }),
    directTargets: [target()],
  });
  const independent = planTcgplayerExactMappingCandidateV1({
    source: source({ source_product_id: 1003 }),
    directTargets: [
      target({
        card_print_id: "card-2",
        gv_id: "GV-PK-ME05-002",
        embedded_external_id: "tcgcsv:24688:1003",
      }),
    ],
  });

  const [blockedFirst, blockedSecond, retained] =
    quarantineTcgplayerTargetCollisionsV1([first, second, independent]);

  assert.equal(blockedFirst.disposition, "blocked");
  assert.equal(
    blockedFirst.reason,
    "multiple_source_products_match_same_canonical_target",
  );
  assert.deepEqual(
    blockedFirst.collision.source_products.map((row) => row.source_product_id),
    [1001, 1002],
  );
  assert.equal(blockedFirst.candidate_fingerprint, undefined);
  assert.equal(blockedSecond.disposition, "blocked");
  assert.equal(retained.disposition, "candidate");
  assert.equal(retained.target.card_print_id, "card-2");
});

test("out-of-scope special variants never become mapping candidates", () => {
  const result = planTcgplayerExactMappingCandidateV1({
    source: source({
      source_product_name: "Tropius (Master Ball Pattern)",
    }),
    directTargets: [target()],
  });
  assert.equal(result.disposition, "blocked");
  assert.equal(result.reason, "source_outside_product_v1_scope");
});

test("planner is database-read-only and rejects apply mode", () => {
  assert.match(SCRIPT, /database_reads_only:\s*true/);
  assert.match(SCRIPT, /database_writes:\s*false/);
  assert.match(SCRIPT, /does not support --apply/);
  assert.match(SCRIPT, /begin read only/);
  assert.doesNotMatch(
    SCRIPT,
    /\b(insert|update|delete)\s+(?:into|from|public\.)/i,
  );
});
