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
import {
  buildTcgplayerExactMappingMetaV1,
  selectTcgplayerExactMappingApplyBatchV1,
  TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_CONFIRMATION_V1,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";

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
const MAINTENANCE_RUNNER = readFileSync(
  path.join(
    ROOT,
    "backend",
    "maintenance",
    "run_canon_maintenance_v1.mjs",
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

test("mapping apply is launcher-only, dry-run-default, bounded, and insert-only", () => {
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
  assert.match(APPLY_SCRIPT, /active_publication_overlap/);
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
    /\b(update|delete\s+from)\s+public\.external_mappings/i,
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
