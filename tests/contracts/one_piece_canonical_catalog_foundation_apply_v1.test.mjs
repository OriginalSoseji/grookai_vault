import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  ONE_PIECE_FOUNDATION_APPLY_APPROVAL_ENV,
  ONE_PIECE_FOUNDATION_INDEPENDENT_SUMMARY_PATH,
  ONE_PIECE_FOUNDATION_MIGRATION_PATH,
  ONE_PIECE_FOUNDATION_PREFLIGHT_SUMMARY_PATH,
  ONE_PIECE_FOUNDATION_ROLLBACK_SUMMARY_PATH,
  buildOnePieceFoundationApplyPlanV1,
  evaluateOnePieceFoundationDurableReadbackV1,
  stableJsonFoundationApplyV1,
} from "../../backend/pricing/one_piece_canonical_catalog_foundation_apply_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";
import {
  evaluateAttributableWrites,
  parseArgs,
} from "../../scripts/audits/one_piece_canonical_catalog_foundation_apply_v1.mjs";

const WRITER = "scripts/audits/one_piece_canonical_catalog_foundation_apply_v1.mjs";
const VERIFIER =
  "scripts/audits/one_piece_canonical_catalog_foundation_post_apply_v1.mjs";

async function fixture() {
  const [migration, preflight, rollback, independent] = await Promise.all([
    fs.readFile(ONE_PIECE_FOUNDATION_MIGRATION_PATH),
    fs.readFile(ONE_PIECE_FOUNDATION_PREFLIGHT_SUMMARY_PATH),
    fs.readFile(ONE_PIECE_FOUNDATION_ROLLBACK_SUMMARY_PATH),
    fs.readFile(ONE_PIECE_FOUNDATION_INDEPENDENT_SUMMARY_PATH),
  ]);
  return buildOnePieceFoundationApplyPlanV1({
    migrationSql: migration.toString("utf8"),
    preflightSummary: JSON.parse(preflight),
    rollbackSummary: JSON.parse(rollback),
    independentSummary: JSON.parse(independent),
    inputHashes: {
      preflight: sha256(preflight),
      rollback: sha256(rollback),
      independent: sha256(independent),
    },
  });
}

function readback(plan) {
  return {
    transaction_read_only: true,
    game_count: 1,
    game_row: structuredClone(plan.target.game),
    release_control_count: 1,
    release_control_row: {
      game_code: "one_piece",
      release_status: "hidden",
      release_version: "ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1",
    },
    identity_domain_constraint: `CHECK ((identity_domain = ANY (ARRAY[${
      plan.target.identity_domains.map((domain) => `'${domain}'::text`).join(",")}])))`,
    anon_game_visible: false,
    authenticated_game_visible: false,
    service_game_visible: false,
    migration_ledger: [structuredClone(plan.ledger_row)],
    set_count: 0,
    card_count: 0,
    identity_count: 0,
    printing_count: 0,
    sealed_count: 0,
    staged_total_rows: 21,
    staged_numbered_rows: 17,
    staged_don_rows: 1,
    staged_sealed_rows: 3,
  };
}

test("foundation apply plan binds every passed authority and stays hidden", async () => {
  const plan = await fixture();
  assert.equal(plan.migration.sha256,
    "a072e55f5bf3362aefcf1056b37e93a4e861b64ffeb529e0fd554d046586fbba");
  assert.equal(plan.authority.rollback_proof_sha256,
    "c055c08d0231ad99b7958afc5e915b5bb9841a5169628d8523f5c3fa29472fe1");
  assert.equal(plan.authority.independent_proof_sha256,
    "42fa494f412c03395a39bc3bd63b8ab9956fcdff4e8263f61ccea734c720eec5");
  assert.equal(plan.target.release_status, "hidden");
  assert.equal(plan.boundaries.card_rows, 0);
  assert.equal(plan.boundaries.app_visibility_enabled, false);
  assert.equal(plan.approval_env, ONE_PIECE_FOUNDATION_APPLY_APPROVAL_ENV);
  assert.match(plan.guard_token, /^EXECUTE_ONE_PIECE_CANONICAL_FOUNDATION_ONLY:/);
});

test("authority byte drift fails closed", async () => {
  const plan = await fixture();
  assert.equal(plan.apply_plan_fingerprint_sha256.length, 64);
  const migration = await fs.readFile(ONE_PIECE_FOUNDATION_MIGRATION_PATH, "utf8");
  const preflight = JSON.parse(await fs.readFile(ONE_PIECE_FOUNDATION_PREFLIGHT_SUMMARY_PATH));
  const rollback = JSON.parse(await fs.readFile(ONE_PIECE_FOUNDATION_ROLLBACK_SUMMARY_PATH));
  const independent = JSON.parse(await fs.readFile(ONE_PIECE_FOUNDATION_INDEPENDENT_SUMMARY_PATH));
  assert.throws(() => buildOnePieceFoundationApplyPlanV1({
    migrationSql: `${migration}\n-- drift`,
    preflightSummary: preflight,
    rollbackSummary: rollback,
    independentSummary: independent,
    inputHashes: { preflight: "0".repeat(64), rollback: "0".repeat(64),
      independent: "0".repeat(64) },
  }), /authority failed/);
});

test("valid hidden durable readback passes and residue fails closed", async () => {
  const plan = await fixture();
  assert.deepEqual(evaluateOnePieceFoundationDurableReadbackV1({
    plan,
    readback: readback(plan),
  }), []);
  const bad = readback(plan);
  bad.release_control_row.release_status = "public";
  bad.card_count = 1;
  bad.authenticated_game_visible = true;
  const findings = evaluateOnePieceFoundationDurableReadbackV1({ plan, readback: bad });
  assert.equal(findings.includes("hidden_release_readback_mismatch"), true);
  assert.equal(findings.includes("card_count_not_zero"), true);
  assert.equal(findings.includes("one_piece_visibility_not_hidden"), true);
});

test("transaction attribution permits only one game and one release insert", () => {
  const valid = [
    { table_name: "games", inserted: 1, updated: 0, deleted: 0, hot_updated: 0 },
    { table_name: "catalog_game_release_controls", inserted: 1,
      updated: 0, deleted: 0, hot_updated: 0 },
  ];
  assert.deepEqual(evaluateAttributableWrites(valid), []);
  assert.equal(evaluateAttributableWrites([...valid, {
    table_name: "card_prints", inserted: 1, updated: 0, deleted: 0, hot_updated: 0,
  }]).includes("unexpected_attributable_write:card_prints"), true);
});

test("writer is inert by default and execution requires an exact SHA", () => {
  assert.equal(parseArgs([]).mode, "plan");
  assert.throws(() => parseArgs(["--execute-foundation-apply"]), /expected-head-sha/);
});

test("writer and verifier preserve the durable boundary", async () => {
  const [writer, verifier] = await Promise.all([
    fs.readFile(WRITER, "utf8"),
    fs.readFile(VERIFIER, "utf8"),
  ]);
  assert.match(writer, /--execute-foundation-apply/);
  assert.match(writer, /ONE_PIECE_FOUNDATION_APPLY_APPROVAL_ENV/);
  assert.match(writer, /insert into supabase_migrations\.schema_migrations/);
  assert.match(writer, /await client\.query\("commit"\)/);
  assert.match(writer, /await client\.query\("rollback"\)/);
  assert.match(writer, /pg_stat_xact_user_tables/);
  assert.match(writer, /writeFailureArtifacts/);
  assert.match(writer, /run_plan\.json/);
  assert.doesNotMatch(writer, /supabase\s+db\s+push/i);
  assert.match(verifier, /fresh_read_only_post_apply_verification/);
  assert.match(verifier, /database_writes:\s*0/);
});

test("checked-in plan reproduces exactly when present", async () => {
  const plan = await fixture();
  const path = "docs/audits/pricing/one_piece_canonical_catalog_foundation_apply_v1/" +
    "foundation_apply_plan_v1/plan.json";
  try {
    const checkedIn = JSON.parse(await fs.readFile(path));
    assert.equal(stableJsonFoundationApplyV1(checkedIn), stableJsonFoundationApplyV1(plan));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
});
