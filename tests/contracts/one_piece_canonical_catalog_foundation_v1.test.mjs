import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  EXISTING_IDENTITY_DOMAINS,
  ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
  ONE_PIECE_FOUNDATION_VERSION,
  ONE_PIECE_GAME,
  ONE_PIECE_IDENTITY_DOMAIN,
  compareFoundationProtectedCountsV1,
  evaluateOnePieceFoundationAppliedStateV1,
  evaluateOnePieceFoundationPreflightV1,
} from "../../backend/pricing/one_piece_canonical_catalog_foundation_v1.mjs";

const MIGRATION = `supabase/migrations/${ONE_PIECE_FOUNDATION_MIGRATION_VERSION}` +
  "_one_piece_canonical_catalog_foundation_v1.sql";
const PREFLIGHT = "scripts/audits/one_piece_canonical_catalog_foundation_preflight_v1.mjs";

function constraint(domains) {
  return `CHECK ((identity_domain = ANY (ARRAY[${domains.map((domain) =>
    `'${domain}'::text`).join(", ")} ])))`;
}

function passingPreflight() {
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
    identity_domain_constraint: constraint(EXISTING_IDENTITY_DOMAINS),
    staged_total_rows: 21,
    staged_numbered_rows: 17,
    staged_don_rows: 1,
    staged_sealed_rows: 3,
    st01_set_count: 0,
    gv_id_collision_count: 0,
    tcgplayer_id_collision_count: 0,
    parent_mapping_collision_count: 0,
    conflicting_lock_count: 0,
  };
}

test("foundation migration is hidden, bounded, and preserves existing domains", () => {
  const sql = fs.readFileSync(MIGRATION, "utf8");
  assert.match(sql, /ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1/);
  assert.match(sql, new RegExp(ONE_PIECE_GAME.id));
  assert.match(sql, /'one_piece'[\s\S]*'One Piece Card Game'[\s\S]*'one-piece'/);
  assert.match(sql, /release_status[\s\S]*'hidden'/);
  assert.match(sql, new RegExp(ONE_PIECE_IDENTITY_DOMAIN));
  for (const domain of EXISTING_IDENTITY_DOMAINS) assert.match(sql, new RegExp(domain));
  assert.doesNotMatch(sql,
    /insert\s+into\s+public\.(?:sets|card_prints|card_print_identity|card_printings|external_mappings|external_printing_mappings|sealed_products)/i);
  assert.doesNotMatch(sql,
    /(?:update|delete\s+from|truncate)\s+public\.(?:sets|card_prints|card_print_identity|card_printings|external_mappings|external_printing_mappings|sealed_products|vault_)/i);
});

test("clean production preflight fixture passes and drift fails closed", () => {
  assert.deepEqual(evaluateOnePieceFoundationPreflightV1(passingPreflight()), {
    valid: true,
    findings: [],
  });
  const drift = passingPreflight();
  drift.game_code_count = 1;
  drift.visibility_policy_count = 4;
  drift.identity_domain_constraint = constraint([
    ...EXISTING_IDENTITY_DOMAINS,
    ONE_PIECE_IDENTITY_DOMAIN,
  ]);
  const result = evaluateOnePieceFoundationPreflightV1(drift);
  assert.equal(result.valid, false);
  assert.equal(result.findings.includes("game_code_count_not_zero"), true);
  assert.equal(result.findings.includes("catalog_visibility_boundary_incomplete"), true);
  assert.equal(result.findings.includes("one_piece_identity_domain_already_present"), true);
});

test("applied state requires exact game, hidden release, and all identity domains", () => {
  const readback = {
    game_count: 1,
    game_row: { ...ONE_PIECE_GAME },
    release_control_count: 1,
    release_control_row: {
      game_code: ONE_PIECE_GAME.code,
      release_status: "hidden",
      release_version: ONE_PIECE_FOUNDATION_VERSION,
    },
    identity_domain_constraint: constraint([
      ...EXISTING_IDENTITY_DOMAINS,
      ONE_PIECE_IDENTITY_DOMAIN,
    ]),
    anon_game_visible: false,
    authenticated_game_visible: false,
    service_game_visible: false,
  };
  assert.equal(evaluateOnePieceFoundationAppliedStateV1(readback).valid, true);
  readback.release_control_row.release_status = "public";
  assert.equal(evaluateOnePieceFoundationAppliedStateV1(readback).valid, false);
});

test("protected count comparison rejects any rollback residue", () => {
  const before = { cards: 10, mtg_sets: 2, vault_cards: 3 };
  assert.equal(compareFoundationProtectedCountsV1(before, { ...before }).valid, true);
  assert.deepEqual(
    compareFoundationProtectedCountsV1(before, { ...before, cards: 11 }).findings,
    ["protected_count_changed:cards"],
  );
});

test("production preflight is read-only and writes the run plan first", () => {
  const source = fs.readFileSync(PREFLIGHT, "utf8");
  assert.match(source, /set default_transaction_read_only = on/);
  assert.match(source, /begin transaction isolation level repeatable read read only/);
  assert.match(source, /run_plan_written_before_database_access:\s*true/);
  assert.doesNotMatch(source,
    /client\.query\s*\(\s*[`"']\s*(?:insert|update|delete|truncate|alter|drop|create)\b/i);
});
