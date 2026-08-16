import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  EXISTING_IDENTITY_DOMAINS,
  ONE_PIECE_IDENTITY_DOMAIN,
} from "../../backend/pricing/one_piece_canonical_catalog_foundation_v1.mjs";
import {
  PINNED_MIGRATION_SHA256,
  PINNED_PREFLIGHT_FINGERPRINT,
  PINNED_PREFLIGHT_SUMMARY_SHA256,
  evaluatePostRollback,
  parseArgs,
  verifyInputs,
} from "../../scripts/audits/one_piece_canonical_catalog_foundation_rollback_v1.mjs";

const SCRIPT = "scripts/audits/one_piece_canonical_catalog_foundation_rollback_v1.mjs";

function constraint(domains = EXISTING_IDENTITY_DOMAINS) {
  return `CHECK ((identity_domain = ANY (ARRAY[${domains.map((domain) =>
    `'${domain}'::text`).join(", ")} ])))`;
}

function baseline() {
  return {
    transaction_read_only: true,
    latest_migration: "20260814120000",
    candidate_migration_count: 0,
    later_migration_count: 0,
    game_code_count: 0,
    game_id_count: 0,
    release_control_table_present: true,
    release_control_count: 0,
    release_control_rls_enabled: true,
    anon_release_control_select: false,
    authenticated_release_control_select: false,
    service_release_control_select: true,
    service_release_control_insert: true,
    visibility_function_count: 4,
    visibility_policy_count: 5,
    normal_finish_count: 1,
    identity_domain_constraint: constraint(),
    staged_total_rows: 21,
    staged_numbered_rows: 17,
    staged_don_rows: 1,
    staged_sealed_rows: 3,
    st01_set_count: 0,
    gv_id_collision_count: 0,
    tcgplayer_id_collision_count: 0,
    parent_mapping_collision_count: 0,
    conflicting_lock_count: 0,
    protected_counts: { games: 3, sets: 10, card_prints: 20, vault_items: 1 },
  };
}

test("rollback executor requires explicit mode and exact producer SHA", () => {
  assert.throws(() => parseArgs([]), /execute-rollback-canary/);
  assert.throws(() => parseArgs(["--execute-rollback-canary"]), /expected-head-sha/);
  const args = parseArgs([
    "--execute-rollback-canary",
    `--expected-head-sha=${"a".repeat(40)}`,
  ]);
  assert.equal(args.execute, true);
  assert.equal(args.expectedHeadSha, "a".repeat(40));
});

test("rollback executor pins the migration and authoritative preflight", () => {
  const migrationBody = fs.readFileSync(
    "supabase/migrations/20260814150000_one_piece_canonical_catalog_foundation_v1.sql",
  );
  const preflightBody = fs.readFileSync(
    "docs/audits/pricing/one_piece_canonical_catalog_foundation_preflight_v1/" +
      "production_read_only_v1/summary.json",
  );
  const preflight = JSON.parse(preflightBody);
  const preflightRunPlan = JSON.parse(fs.readFileSync(
    "docs/audits/pricing/one_piece_canonical_catalog_foundation_preflight_v1/" +
      "production_read_only_v1/run_plan.json",
  ));
  assert.equal(preflight.preflight_fingerprint_sha256, PINNED_PREFLIGHT_FINGERPRINT);
  assert.equal(preflight.migration.sha256, PINNED_MIGRATION_SHA256);
  assert.equal(PINNED_PREFLIGHT_SUMMARY_SHA256.length, 64);
  assert.deepEqual(verifyInputs({ migrationBody, preflightBody, preflight, preflightRunPlan }), []);
  assert.deepEqual(verifyInputs({
    migrationBody: Buffer.concat([migrationBody, Buffer.from("\n-- drift")]),
    preflightBody,
    preflight,
    preflightRunPlan,
  }), ["migration_hash_mismatch"]);
});

test("post-rollback evaluation accepts exact restoration and rejects residue", () => {
  const before = baseline();
  assert.deepEqual(evaluatePostRollback({ baseline: before, postRollback: structuredClone(before) }), []);
  const residue = structuredClone(before);
  residue.game_code_count = 1;
  residue.protected_counts.games = 4;
  residue.identity_domain_constraint = constraint([
    ...EXISTING_IDENTITY_DOMAINS,
    ONE_PIECE_IDENTITY_DOMAIN,
  ]);
  const findings = evaluatePostRollback({ baseline: before, postRollback: residue });
  assert.equal(findings.includes("game_code_count_not_zero"), true);
  assert.equal(findings.includes("protected_count_changed:games"), true);
  assert.equal(findings.includes("post_rollback_identity_constraint_changed"), true);
});

test("rollback executor has no database commit or migration-ledger write path", () => {
  const source = fs.readFileSync(SCRIPT, "utf8");
  assert.match(source, /run_plan\.json/);
  assert.match(source, /rollback_canary_passed_zero_durable_change/);
  assert.doesNotMatch(source, /client\.query\s*\(\s*[`"']\s*commit\b/i);
  assert.doesNotMatch(source,
    /insert\s+into\s+supabase_migrations\.schema_migrations/i);
});
