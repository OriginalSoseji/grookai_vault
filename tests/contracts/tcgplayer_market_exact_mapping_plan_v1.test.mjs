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
  tcgplayerExactMappingCandidateFingerprintV1,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";
import {
  buildTcgplayerExactMappingMetaV1,
  matchesTcgplayerExactMappingLiveSourceNumberV1,
  selectTcgplayerExactMappingApplyBatchV1,
  TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_CONFIRMATION_V1,
  validateTcgplayerExactMappingCandidateForApplyV1,
  validateTcgplayerExactMappingLiveTargetV1,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";
import {
  assertTcgplayerInactiveMappingRepairAuthorityV1,
  buildTcgplayerInactiveMappingRepairMetaV1,
  tcgplayerInactiveMappingRepairFingerprintV1,
} from "../../backend/pricing/tcgplayer_inactive_mapping_repair_policy_v1.mjs";
import {
  TCGPLAYER_REVIEWED_PRODUCT_IDENTITIES_V1,
  TCGPLAYER_REVIEWED_PRODUCT_IDENTITY_AUTHORITY_V1,
} from "../../backend/pricing/tcgplayer_reviewed_product_identity_authority_v1.mjs";
import {
  TCGPLAYER_G1_RC_PRODUCT_IDENTITIES_V1,
  TCGPLAYER_G1_RC_PRODUCT_IDENTITY_AUTHORITY_V1,
} from "../../backend/pricing/tcgplayer_g1_rc_product_identity_authority_v1.mjs";
import {
  TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITIES_V1,
  TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1,
} from "../../backend/pricing/tcgplayer_30c_classic_alias_product_identity_authority_v1.mjs";

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
const APPLY_SCRIPT = readFileSync(
  path.join(
    ROOT,
    "backend",
    "maintenance",
    "tcgplayer_market_exact_mapping_apply_v1.mjs",
  ),
  "utf8",
);
const CLASSIC_AUTHORITY_SCRIPT = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_30c_classic_mapping_authority_v1.mjs",
  ),
  "utf8",
);
const SVP_AUTHORITY_SCRIPT = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_svp_reviewed_product_mapping_authority_v1.mjs",
  ),
  "utf8",
);
const G1_RC_AUTHORITY_SCRIPT = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_g1_rc_mapping_authority_v1.mjs",
  ),
  "utf8",
);
const CLASSIC_ALIAS_AUTHORITY_SCRIPT = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_30c_classic_alias_mapping_authority_v1.mjs",
  ),
  "utf8",
);
const MAINTENANCE_RUNNER = readFileSync(
  path.join(
    ROOT,
    "backend",
    "maintenance",
    "run_canon_maintenance_v1.mjs",
  ),
  "utf8",
);

test("read-only exact mapping planner requires verified remote database TLS", () => {
  assert.match(SCRIPT, /rejectUnauthorized:\s*true/);
  assert.match(SCRIPT, /SUPABASE_DB_CA_CERT/);
  assert.doesNotMatch(SCRIPT, /rejectUnauthorized:\s*false/);
});

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

test("collector suffix normalization preserves unfamiliar printing labels", () => {
  for (const label of ["Prize Pack", "Play Pokemon", "Special Release", "Alternate Treatment"]) {
    assert.equal(
      normalizeTcgplayerMappingNameV1(`Luxray - 071/193 (${label})`),
      normalizeTcgplayerMappingNameV1(`Luxray (${label})`),
    );
    assert.notEqual(normalizeTcgplayerMappingNameV1(`Luxray - 071/193 (${label})`), "luxray");
    const result = planTcgplayerExactMappingCandidateV1({
      source: source({ source_product_name: `Luxray - 071/193 (${label})`, printed_number: "071/193" }),
      directTargets: [target({ name: "Luxray", number: "071" })],
    });
    assert.equal(result.disposition, "blocked");
  }
});

test("old fingerprint-valid candidates cannot hide discarded source labels", () => {
  const candidate = planTcgplayerExactMappingCandidateV1({ source: source(), directTargets: [target()] });
  candidate.source_product_name = "Tropius - 001/084 (Special Release)";
  const { candidate_fingerprint: ignored, ...payload } = candidate;
  candidate.candidate_fingerprint = tcgplayerExactMappingCandidateFingerprintV1(payload);
  const result = validateTcgplayerExactMappingCandidateForApplyV1(candidate);
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes("source_name_normalization_mismatch"));
});

test("old policy plans must be regenerated, not silently reinterpreted", () => {
  const candidate = planTcgplayerExactMappingCandidateV1({ source: source(), directTargets: [target()] });
  candidate.policy_version = "TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_1";
  const { candidate_fingerprint: ignored, ...payload } = candidate;
  candidate.candidate_fingerprint = tcgplayerExactMappingCandidateFingerprintV1(payload);
  assert.throws(() => selectTcgplayerExactMappingApplyBatchV1([candidate], { limit: 1 }), /unexpected_candidate_policy_version/);
});

test("live target validation preserves every frozen identity boundary", () => {
  const candidate = planTcgplayerExactMappingCandidateV1({ source: source(), directTargets: [target()] });
  assert.deepEqual(validateTcgplayerExactMappingLiveTargetV1(candidate, target()), []);
  for (const [field, value, failure] of [
    ["card_print_id", "other-card", "target_id_changed"],
    ["gv_id", "other-gvid", "target_gv_id_changed"],
    ["set_id", "other-set", "target_set_id_changed"],
    ["set_code", "other-code", "target_set_code_changed"],
    ["set_id", null, "target_set_id_changed"],
    ["set_code", "", "target_set_code_changed"],
    ["variant_key", "prize_pack_stamp", "target_not_base_variant"],
    ["name", "Tropius (Special Release)", "target_name_changed"],
    ["number", "002", "target_number_changed"],
    ["active_standard_identity_count", 2, "target_standard_identity_not_unique"],
    ["active_tcgplayer_mapping_count", 1, "target_mapping_now_exists"],
  ]) {
    assert.ok(validateTcgplayerExactMappingLiveTargetV1(candidate, target({ [field]: value })).includes(failure), field);
  }
  assert.deepEqual(validateTcgplayerExactMappingLiveTargetV1(candidate, null), ["target_missing"]);
});

test("hash-valid malformed identities cannot enter an apply batch", () => {
  const original = planTcgplayerExactMappingCandidateV1({ source: source(), directTargets: [target()] });
  for (const [field, value, failure] of [
    ["set_id", "", "missing_target_set_id"],
    ["set_code", "", "missing_target_set_code"],
    ["canonical_name", "Luxray", "target_name_mismatch"],
    ["canonical_number", "002", "target_number_mismatch"],
  ]) {
    const candidate = structuredClone(original);
    candidate.target[field] = value;
    const { candidate_fingerprint: ignored, ...payload } = candidate;
    candidate.candidate_fingerprint = tcgplayerExactMappingCandidateFingerprintV1(payload);
    assert.throws(() => selectTcgplayerExactMappingApplyBatchV1([candidate], { limit: 1 }), new RegExp(failure));
  }
});

test("multiple suffix labels and meaningful name numbers survive normalization", () => {
  assert.equal(normalizeTcgplayerMappingNameV1("Luxray - 071/193 (Prize Pack) (Series 3)"), "luxray prize pack series 3");
  assert.equal(normalizeTcgplayerMappingNameV1("Porygon2"), "porygon2");
  assert.equal(normalizeTcgplayerMappingNameV1("Porygon-Z - 075/091"), "porygon z");
});

test("historical treatment labels cannot enter the base set-consensus lane", () => {
  for (const [name, number, label] of [
    ["Champions Festival", "BW95", "Worlds 13"],
    ["Chimecho", "024", "e-League"],
    ["Flygon", "025", "e-League"],
    ["Mew", "8", "Glossy Finish"],
  ]) {
    const result = planTcgplayerExactMappingCandidateV1({
      source: source({ source_product_name: `${name} - ${number} (${label})`, printed_number: number }),
      groupConsensus: { set_count: 1, set_id: "set-1", set_code: "test", mapped_source_product_count: 50 },
      setTargets: [target({ name, number })],
    });
    assert.equal(result.disposition, "blocked", label);
  }
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

  const yearQualifiedStaff = planTcgplayerExactMappingCandidateV1({
    source: source({
      source_product_name: "Champions Festival - XY27 (2014 Staff)",
      printed_number: "XY27",
    }),
    directTargets: [
      target({
        name: "Champions Festival",
        number: "XY27",
        embedded_external_id: null,
      }),
    ],
  });
  assert.equal(yearQualifiedStaff.disposition, "blocked");
  assert.equal(
    yearQualifiedStaff.reason,
    "source_outside_product_v1_scope",
  );
});

test("reviewed product authority admits only the exact bound Pokemon Center identity", () => {
  const authority = TCGPLAYER_REVIEWED_PRODUCT_IDENTITIES_V1[0];
  const reviewedSource = source({
    source_product_id: authority.source_product_id,
    source_product_name: authority.source_product_name,
    source_group_id: authority.source_group_id,
    source_group_name: authority.source_group_name,
    printed_number: authority.printed_number,
  });
  const reviewedTarget = target({
    card_print_id: authority.target.card_print_id,
    gv_id: authority.target.gv_id,
    set_id: authority.target.set_id,
    set_code: authority.target.set_code,
    name: authority.target.name,
    number: authority.target.number,
    variant_key: authority.target.variant_key,
    embedded_external_id: null,
  });
  const candidate = planTcgplayerExactMappingCandidateV1({
    source: reviewedSource,
    setTargets: [reviewedTarget],
  });
  assert.equal(candidate.disposition, "candidate");
  assert.equal(candidate.evidence_lane, "reviewed_product_identity_authority");
  assert.equal(
    candidate.reviewed_product_identity_authority_version,
    TCGPLAYER_REVIEWED_PRODUCT_IDENTITY_AUTHORITY_V1,
  );
  assert.equal(candidate.target.variant_key, "pokemon_center_stamp");
  assert.equal(validateTcgplayerExactMappingCandidateForApplyV1(candidate).accepted, true);
  assert.deepEqual(validateTcgplayerExactMappingLiveTargetV1(candidate, reviewedTarget), []);

  const sourceDrift = planTcgplayerExactMappingCandidateV1({
    source: { ...reviewedSource, source_product_name: "Koraidon - 014" },
    groupConsensus: {
      set_count: 1,
      set_id: authority.target.set_id,
      set_code: authority.target.set_code,
      mapped_source_product_count: 1,
    },
    setTargets: [target({
      card_print_id: "base-koraidon-014",
      gv_id: "GV-PK-SVP-014",
      set_id: authority.target.set_id,
      set_code: authority.target.set_code,
      name: "Koraidon",
      number: "014",
      variant_key: "",
      embedded_external_id: null,
    })],
  });
  assert.equal(sourceDrift.disposition, "blocked");
  assert.equal(sourceDrift.reason, "reviewed_product_source_drift");
  assert.equal(sourceDrift.evidence_lane, "reviewed_product_identity_authority");

  const forgedGeneralCandidate = planTcgplayerExactMappingCandidateV1({
    source: {
      ...reviewedSource,
      source_product_id: 999999,
      source_product_name: "Koraidon - 014",
    },
    groupConsensus: {
      set_count: 1,
      set_id: authority.target.set_id,
      set_code: authority.target.set_code,
      mapped_source_product_count: 1,
    },
    setTargets: [target({
      card_print_id: "base-koraidon-014",
      gv_id: "GV-PK-SVP-014",
      set_id: authority.target.set_id,
      set_code: authority.target.set_code,
      name: "Koraidon",
      number: "014",
      variant_key: "",
      embedded_external_id: null,
    })],
  });
  assert.equal(forgedGeneralCandidate.disposition, "candidate");
  forgedGeneralCandidate.source_product_id = authority.source_product_id;
  const {
    candidate_fingerprint: ignoredForgedFingerprint,
    ...forgedPayload
  } = forgedGeneralCandidate;
  forgedGeneralCandidate.candidate_fingerprint =
    tcgplayerExactMappingCandidateFingerprintV1(forgedPayload);
  assert.ok(
    validateTcgplayerExactMappingCandidateForApplyV1(forgedGeneralCandidate)
      .failures.includes("reviewed_product_source_drift"),
  );

  const unreviewedProduct = planTcgplayerExactMappingCandidateV1({
    source: { ...reviewedSource, source_product_id: 999999 },
    setTargets: [reviewedTarget],
  });
  assert.equal(unreviewedProduct.disposition, "blocked");
  assert.equal(unreviewedProduct.reason, "missing_unique_set_authority");
});

test("reviewed product authority remains fail-closed under target or authority drift", () => {
  const authority = TCGPLAYER_REVIEWED_PRODUCT_IDENTITIES_V1[0];
  const reviewedSource = source({
    source_product_id: authority.source_product_id,
    source_product_name: authority.source_product_name,
    source_group_id: authority.source_group_id,
    source_group_name: authority.source_group_name,
    printed_number: authority.printed_number,
  });
  const reviewedTarget = target({
    card_print_id: authority.target.card_print_id,
    gv_id: authority.target.gv_id,
    set_id: authority.target.set_id,
    set_code: authority.target.set_code,
    name: authority.target.name,
    number: authority.target.number,
    variant_key: authority.target.variant_key,
    embedded_external_id: null,
  });
  const missing = planTcgplayerExactMappingCandidateV1({
    source: reviewedSource,
    setTargets: [{ ...reviewedTarget, gv_id: "GV-DRIFTED" }],
  });
  assert.equal(missing.reason, "reviewed_product_target_missing_or_drifted");

  const candidate = planTcgplayerExactMappingCandidateV1({
    source: reviewedSource,
    setTargets: [reviewedTarget],
  });
  candidate.reviewed_product_identity_authority_version = "DRIFTED";
  const { candidate_fingerprint: ignored, ...payload } = candidate;
  candidate.candidate_fingerprint = tcgplayerExactMappingCandidateFingerprintV1(payload);
  const validation = validateTcgplayerExactMappingCandidateForApplyV1(candidate);
  assert.equal(validation.accepted, false);
  assert.ok(validation.failures.includes("reviewed_product_identity_authority_version_mismatch"));
  const legacyPolicyCandidate = {
    ...candidate,
    reviewed_product_identity_authority_version:
      TCGPLAYER_REVIEWED_PRODUCT_IDENTITY_AUTHORITY_V1,
    policy_version: "TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_2",
  };
  const {
    candidate_fingerprint: ignoredLegacyFingerprint,
    ...legacyPolicyPayload
  } = legacyPolicyCandidate;
  legacyPolicyCandidate.candidate_fingerprint =
    tcgplayerExactMappingCandidateFingerprintV1(legacyPolicyPayload);
  assert.ok(
    validateTcgplayerExactMappingCandidateForApplyV1(legacyPolicyCandidate)
      .failures.includes("unexpected_candidate_policy_version"),
  );
  assert.ok(validateTcgplayerExactMappingLiveTargetV1(
    { ...candidate, reviewed_product_identity_authority_version: TCGPLAYER_REVIEWED_PRODUCT_IDENTITY_AUTHORITY_V1 },
    { ...reviewedTarget, variant_key: "staff_stamp" },
  ).includes("target_not_base_variant"));
});

test("SVP reviewed registry and authority builder are bounded and read-only", () => {
  assert.equal(TCGPLAYER_REVIEWED_PRODUCT_IDENTITIES_V1.length, 18);
  assert.equal(
    new Set(TCGPLAYER_REVIEWED_PRODUCT_IDENTITIES_V1.map((row) => row.source_product_id)).size,
    18,
  );
  assert.equal(
    new Set(TCGPLAYER_REVIEWED_PRODUCT_IDENTITIES_V1.map((row) => row.target.card_print_id)).size,
    18,
  );
  assert.equal(
    TCGPLAYER_REVIEWED_PRODUCT_IDENTITIES_V1.filter((row) =>
      row.target.variant_key === "pokemon_center_stamp").length,
    17,
  );
  assert.match(SVP_AUTHORITY_SCRIPT, /begin transaction isolation level repeatable read read only/);
  assert.match(SVP_AUTHORITY_SCRIPT, /rejectUnauthorized:\s*true/);
  assert.match(SVP_AUTHORITY_SCRIPT, /const EXPECTED_CANDIDATES = 18/);
  assert.match(SVP_AUTHORITY_SCRIPT, /World Championship and other unresolved aliases remain outside/);
  assert.match(SVP_AUTHORITY_SCRIPT, /freezeMasterMappingAuthority/);
  assert.doesNotMatch(
    SVP_AUTHORITY_SCRIPT,
    /\b(insert|update|delete)\s+(?:into|from|public\.)/i,
  );
});

test("Generations Radiant Collection registry admits only its 32 exact identities", () => {
  assert.equal(TCGPLAYER_G1_RC_PRODUCT_IDENTITIES_V1.length, 32);
  assert.equal(
    new Set(TCGPLAYER_G1_RC_PRODUCT_IDENTITIES_V1.map((row) => row.source_product_id)).size,
    32,
  );
  assert.equal(
    new Set(TCGPLAYER_G1_RC_PRODUCT_IDENTITIES_V1.map((row) => row.target.card_print_id)).size,
    32,
  );
  assert.ok(TCGPLAYER_G1_RC_PRODUCT_IDENTITIES_V1.every((row) =>
    row.source_group_id === 1729 && row.target.set_code === "g1" &&
    row.target.variant_key === "rc"));

  const authority = TCGPLAYER_G1_RC_PRODUCT_IDENTITIES_V1.find(
    (row) => row.source_product_id === 113748,
  );
  const reviewedSource = source({
    source_product_id: authority.source_product_id,
    source_product_name: authority.source_product_name,
    source_group_id: authority.source_group_id,
    source_group_name: authority.source_group_name,
    printed_number: authority.printed_number,
  });
  const reviewedTarget = target({
    card_print_id: authority.target.card_print_id,
    gv_id: authority.target.gv_id,
    set_id: authority.target.set_id,
    set_code: authority.target.set_code,
    name: authority.target.name,
    number: authority.target.number,
    variant_key: authority.target.variant_key,
    embedded_external_id: null,
  });
  const candidate = planTcgplayerExactMappingCandidateV1({
    source: reviewedSource,
    setTargets: [reviewedTarget],
  });
  assert.equal(candidate.disposition, "candidate");
  assert.equal(candidate.target.canonical_name, "Flareon-EX");
  assert.equal(candidate.reviewed_product_identity_authority_version,
    TCGPLAYER_G1_RC_PRODUCT_IDENTITY_AUTHORITY_V1);
  assert.equal(validateTcgplayerExactMappingCandidateForApplyV1(candidate).accepted, true);
  assert.deepEqual(validateTcgplayerExactMappingLiveTargetV1(candidate, reviewedTarget), []);

  const drift = planTcgplayerExactMappingCandidateV1({
    source: { ...reviewedSource, source_product_name: "Flareon EX" },
    setTargets: [reviewedTarget],
  });
  assert.equal(drift.reason, "reviewed_product_source_drift");

  candidate.reviewed_product_identity_authority_version = "DRIFTED";
  const { candidate_fingerprint: ignored, ...payload } = candidate;
  candidate.candidate_fingerprint = tcgplayerExactMappingCandidateFingerprintV1(payload);
  assert.ok(validateTcgplayerExactMappingCandidateForApplyV1(candidate).failures.includes(
    "reviewed_product_identity_authority_version_mismatch",
  ));
  assert.ok(validateTcgplayerExactMappingLiveTargetV1(
    { ...candidate, reviewed_product_identity_authority_version: TCGPLAYER_G1_RC_PRODUCT_IDENTITY_AUTHORITY_V1 },
    { ...reviewedTarget, variant_key: "staff_stamp" },
  ).includes("target_not_base_variant"));
});

test("Generations Radiant Collection authority is read-only and split into bounded batches", () => {
  assert.match(G1_RC_AUTHORITY_SCRIPT, /begin transaction isolation level repeatable read read only/);
  assert.match(G1_RC_AUTHORITY_SCRIPT, /rejectUnauthorized:\s*true/);
  assert.match(G1_RC_AUTHORITY_SCRIPT, /const EXPECTED_CANDIDATES = 32/);
  assert.match(G1_RC_AUTHORITY_SCRIPT, /const batchSize = 25/);
  assert.match(G1_RC_AUTHORITY_SCRIPT, /special_variant_and_english_master_index/);
  assert.match(G1_RC_AUTHORITY_SCRIPT, /left join public\.finish_keys/);
  assert.match(G1_RC_AUTHORITY_SCRIPT, /card_printing_truth_reviews/);
  assert.match(G1_RC_AUTHORITY_SCRIPT, /live_child_hidden/);
  assert.match(G1_RC_AUTHORITY_SCRIPT, /freezeMasterMappingAuthority/);
  assert.doesNotMatch(
    G1_RC_AUTHORITY_SCRIPT,
    /\b(insert|update|delete)\s+(?:into|from|public\.)/i,
  );
  assert.match(SCRIPT, /TCGPLAYER_G1_RC_PRODUCT_IDENTITIES_V1/);
});

test("30th Celebration Classic aliases require exact reviewed product tuples", () => {
  assert.equal(TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITIES_V1.length, 2);
  assert.deepEqual(
    TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITIES_V1.map((row) =>
      row.source_product_id),
    [716158, 716198],
  );
  assert.ok(TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITIES_V1.every((row) =>
    row.source_group_id === 24837 && row.target.set_code === "30c-classic" &&
    row.target.variant_key === "" && row.printing.finish_key === "holo"));

  const authority = TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITIES_V1[0];
  const reviewedSource = source({
    source_product_id: authority.source_product_id,
    source_product_name: authority.source_product_name,
    source_group_id: authority.source_group_id,
    source_group_name: authority.source_group_name,
    printed_number: authority.printed_number,
  });
  const reviewedTarget = target({
    card_print_id: authority.target.card_print_id,
    gv_id: authority.target.gv_id,
    set_id: authority.target.set_id,
    set_code: authority.target.set_code,
    name: authority.target.name,
    number: authority.target.number,
    variant_key: authority.target.variant_key,
    embedded_external_id: null,
  });
  const candidate = planTcgplayerExactMappingCandidateV1({
    source: reviewedSource,
    setTargets: [reviewedTarget],
  });
  assert.equal(candidate.disposition, "candidate");
  assert.equal(candidate.target.canonical_name, "Genesect EX");
  assert.equal(candidate.reviewed_product_identity_authority_version,
    TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1);
  assert.equal(validateTcgplayerExactMappingCandidateForApplyV1(candidate).accepted, true);
  assert.equal(
    matchesTcgplayerExactMappingLiveSourceNumberV1(candidate, "11/101"),
    true,
  );
  assert.equal(
    matchesTcgplayerExactMappingLiveSourceNumberV1(candidate, "11/102"),
    false,
  );

  const drift = planTcgplayerExactMappingCandidateV1({
    source: { ...reviewedSource, source_product_name: "Genesect EX" },
    setTargets: [reviewedTarget],
  });
  assert.equal(drift.reason, "reviewed_product_source_drift");
});

test("30th Celebration Classic alias authority is read-only and binds live child state", () => {
  assert.match(CLASSIC_ALIAS_AUTHORITY_SCRIPT,
    /begin transaction isolation level repeatable read read only/);
  assert.match(CLASSIC_ALIAS_AUTHORITY_SCRIPT, /rejectUnauthorized:\s*true/);
  assert.match(CLASSIC_ALIAS_AUTHORITY_SCRIPT, /const EXPECTED_CANDIDATES = 2/);
  assert.match(CLASSIC_ALIAS_AUTHORITY_SCRIPT, /left join public\.finish_keys/);
  assert.match(CLASSIC_ALIAS_AUTHORITY_SCRIPT, /card_printing_truth_reviews/);
  assert.match(CLASSIC_ALIAS_AUTHORITY_SCRIPT, /live_child_hidden/);
  assert.match(CLASSIC_ALIAS_AUTHORITY_SCRIPT,
    /active_truth_review, "verified"/);
  assert.match(CLASSIC_ALIAS_AUTHORITY_SCRIPT,
    /public_visibility, "visible"/);
  assert.match(CLASSIC_ALIAS_AUTHORITY_SCRIPT, /freezeMasterMappingAuthority/);
  assert.doesNotMatch(
    CLASSIC_ALIAS_AUTHORITY_SCRIPT,
    /\b(insert|update|delete)\s+(?:into|from|public\.)/i,
  );
  assert.match(SCRIPT, /TCGPLAYER_30C_CLASSIC_ALIAS_PRODUCT_IDENTITIES_V1/);
});

test("apply batch validates fingerprints, excludes canary rows, and stays bounded", () => {
  const candidates = [1001, 1002, 1003].map((sourceProductId, index) =>
    planTcgplayerExactMappingCandidateV1({
      source: source({ source_product_id: sourceProductId }),
      directTargets: [
        target({
          card_print_id: `card-${index + 1}`,
          gv_id: `GV-PK-ME05-00${index + 1}`,
          embedded_external_id: `tcgcsv:24688:${sourceProductId}`,
        }),
      ],
    }),
  );
  const batch = selectTcgplayerExactMappingApplyBatchV1(candidates, {
    limit: 2,
    excludedSourceProductIds: [1001],
  });
  assert.deepEqual(
    batch.selected.map((row) => row.source_product_id),
    [1002, 1003],
  );
  assert.equal(batch.excluded_count, 1);
  assert.match(batch.batch_fingerprint, /^[a-f0-9]{64}$/);
  assert.throws(
    () =>
      selectTcgplayerExactMappingApplyBatchV1(candidates, {
        limit: 26,
      }),
    /APPLY_LIMIT_OUT_OF_RANGE/,
  );

  const tampered = structuredClone(candidates);
  tampered[0].target.gv_id = "GV-TAMPERED";
  assert.throws(
    () =>
      selectTcgplayerExactMappingApplyBatchV1(tampered, {
        limit: 1,
      }),
    /candidate_fingerprint_mismatch/,
  );
});

test("mapping metadata preserves exact candidate and run provenance", () => {
  const candidate = planTcgplayerExactMappingCandidateV1({
    source: source({ source_product_id: 1001 }),
    directTargets: [
      target({ embedded_external_id: "tcgcsv:24688:1001" }),
    ],
  });
  const meta = buildTcgplayerExactMappingMetaV1(candidate, {
    batch_fingerprint: "batch-hash",
    maintenance_run_id: "run-id",
    source_sync_run_id: "source-run-id",
    candidate_artifact_sha256: "artifact-hash",
    candidate_artifact_path: "docs/audits/candidates.jsonl",
    candidate_plan_commit_sha: "plan-commit-sha",
    producing_commit_sha: "commit-sha",
  });
  assert.equal(meta.mapping_method, candidate.mapping_method);
  assert.equal(meta.confidence, candidate.mapping_confidence);
  assert.equal(meta.candidate_fingerprint, candidate.candidate_fingerprint);
  assert.equal(meta.maintenance_run_id, "run-id");
  assert.equal(meta.candidate_plan_commit_sha, "plan-commit-sha");
  assert.equal(meta.canonical_gv_id, candidate.target.gv_id);
});

test("inactive mapping repair is exact, drift-bound, and preserves invalidation history", () => {
  const candidate = planTcgplayerExactMappingCandidateV1({
    source: source({ source_product_id: 1001 }),
    directTargets: [target({ embedded_external_id: "tcgcsv:24688:1001" })],
  });
  const liveMapping = {
    id: "77",
    source: "tcgplayer",
    external_id: "1001",
    card_print_id: "old-stamped-parent",
    active: false,
    synced_at: "2026-01-02T03:04:05.000Z",
    meta: {
      source_url: "https://example.test/product/1001",
      reviewed_invalidation: {
        reason_code: "PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT",
      },
    },
  };
  const body = {
    version: "TCGPLAYER_INACTIVE_MAPPING_REPAIR_POLICY_V1",
    status: "reviewed_repair_evidence",
    execution_authorized: false,
    source_product_id: 1001,
    candidate_fingerprint: candidate.candidate_fingerprint,
    mapping_id: "77",
    expected_current: {
      card_print_id: "old-stamped-parent",
      active: false,
      synced_at: "2026-01-02T03:04:05.000Z",
      meta_fingerprint: tcgplayerInactiveMappingRepairFingerprintV1(liveMapping.meta),
      reviewed_invalidation_reason_code:
        "PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT",
    },
    target_card_print_id: candidate.target.card_print_id,
    reason_code: "REPLACE_REVIEWED_INVALID_STAMPED_PARENT_WITH_EXACT_BASE_PARENT",
  };
  const authority = {
    ...body,
    fingerprint: tcgplayerInactiveMappingRepairFingerprintV1(body),
  };
  assert.doesNotThrow(() =>
    assertTcgplayerInactiveMappingRepairAuthorityV1(authority, {
      candidate,
      liveMapping,
    }),
  );
  const meta = buildTcgplayerInactiveMappingRepairMetaV1({
    authority,
    liveMapping,
    exactMappingMeta: { candidate_fingerprint: candidate.candidate_fingerprint },
  });
  assert.equal(meta.reviewed_invalidation, undefined);
  assert.equal(
    meta.inactive_mapping_repair.prior_reviewed_invalidation.reason_code,
    "PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT",
  );
  assert.throws(
    () =>
      assertTcgplayerInactiveMappingRepairAuthorityV1(authority, {
        candidate,
        liveMapping: { ...liveMapping, card_print_id: "drifted" },
      }),
    /INACTIVE_REPAIR_LIVE_MAPPING_DRIFT/,
  );
});

test("mapping apply is launcher-only, dry-run-default, bounded, and exact-write-only", () => {
  assert.match(
    MAINTENANCE_RUNNER,
    /backend\/maintenance\/tcgplayer_market_exact_mapping_apply_v1\.mjs/,
  );
  assert.match(APPLY_SCRIPT, /canon maintenance scripts must be launched/);
  assert.match(
    APPLY_SCRIPT,
    /CANON_MAINTENANCE_DRY_RUN_ENV_V1\]\s*!==\s*"false"/,
  );
  assert.match(
    APPLY_SCRIPT,
    /begin isolation level serializable/,
  );
  assert.match(APPLY_SCRIPT, /pg_advisory_xact_lock/);
  assert.match(APPLY_SCRIPT, /insert into public\.external_mappings/);
  assert.match(APPLY_SCRIPT, /update public\.external_mappings/);
  assert.match(APPLY_SCRIPT, /and external_id = \$4::text/);
  assert.match(APPLY_SCRIPT, /and card_print_id = \$5::uuid/);
  assert.match(APPLY_SCRIPT, /and active = false/);
  assert.match(APPLY_SCRIPT, /active_publication_overlap/);
  assert.match(APPLY_SCRIPT, /rowFailures\.push\(\.\.\.validateTcgplayerExactMappingLiveTargetV1\(candidate, target\)\)/);
  assert.match(APPLY_SCRIPT, /SOURCE_PLAN_TRACKED_WORKTREE_NOT_CLEAN/);
  assert.match(APPLY_SCRIPT, /SOURCE_PLAN_COMMIT_NOT_ANCESTOR/);
  assert.match(
    APPLY_SCRIPT,
    /TCGPLAYER_EXACT_MAPPING_EXPECTED_PLAN_COMMIT_SHA/,
  );
  assert.match(APPLY_SCRIPT, /rollback_manifest\.json/);
  assert.match(
    APPLY_SCRIPT,
    new RegExp(TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_CONFIRMATION_V1),
  );
  assert.doesNotMatch(
    APPLY_SCRIPT,
    /\bdelete\s+from\s+public\.external_mappings/i,
  );
  assert.doesNotMatch(
    APPLY_SCRIPT,
    /\b(insert\s+into|update|delete\s+from)\s+public\.market_price_/i,
  );
});

test("planner is database-read-only and rejects apply mode", () => {
  assert.match(SCRIPT, /database_reads_only:\s*true/);
  assert.match(SCRIPT, /database_writes:\s*false/);
  assert.match(SCRIPT, /does not support --apply/);
  assert.match(SCRIPT, /begin read only/);
  assert.match(
    SCRIPT,
    /tracked_worktree_clean:\s*!trackedWorktreeStatus/,
  );
  assert.doesNotMatch(
    SCRIPT,
    /\b(insert|update|delete)\s+(?:into|from|public\.)/i,
  );
});

test("planner carries reviewed 30th Celebration Classic Collection authority", () => {
  assert.match(SCRIPT, /source_group_id:\s*24837/);
  assert.match(SCRIPT, /source_group_name:\s*"ME: 30th Celebration Classic Collection"/);
  assert.match(SCRIPT, /target_set_code:\s*"30c-classic"/);
  assert.match(SCRIPT, /only exact normalized name and printed-coordinate matches/);
});

test("Classic Collection authority is read-only, evidence-bound, and keeps aliases out", () => {
  assert.match(CLASSIC_AUTHORITY_SCRIPT, /begin transaction isolation level repeatable read read only/);
  assert.match(CLASSIC_AUTHORITY_SCRIPT, /SUPABASE_DB_CA_CERT/);
  assert.match(CLASSIC_AUTHORITY_SCRIPT, /rejectUnauthorized:\s*true/);
  assert.match(CLASSIC_AUTHORITY_SCRIPT, /const GROUP_ID = 24837/);
  assert.match(CLASSIC_AUTHORITY_SCRIPT, /const EXACT_CANDIDATE_COUNT = 28/);
  assert.match(CLASSIC_AUTHORITY_SCRIPT, /Genesect EX \(Team Plasma\) and Gengar \(Prime\) remain outside/);
  assert.match(CLASSIC_AUTHORITY_SCRIPT, /freezeMasterMappingAuthority/);
  assert.doesNotMatch(
    CLASSIC_AUTHORITY_SCRIPT,
    /\b(insert|update|delete)\s+(?:into|from|public\.)/i,
  );
});
