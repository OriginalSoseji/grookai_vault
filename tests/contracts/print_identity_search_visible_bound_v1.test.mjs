import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MIGRATION = fs.readFileSync(
  path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260828021500_print_identity_search_visible_bound_v1.sql",
  ),
  "utf8",
);
const PREVIOUS = fs.readFileSync(
  path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260824174500_print_identity_search_bounded_candidates_v1.sql",
  ),
  "utf8",
);
const ROLLBACK_RUNNER = fs.readFileSync(
  path.join(ROOT, "scripts", "audits", "print_identity_search_visible_bound_rollback_v1.mjs"),
  "utf8",
);
const AUDIT = path.join(
  ROOT,
  "docs",
  "audits",
  "catalog_discovery",
  "print_identity_search_visible_bound_v1",
);
const ROLLBACK_PROOF_TEXT = fs.readFileSync(path.join(AUDIT, "rollback_proof.json"), "utf8");
const ROLLBACK_PROOF = JSON.parse(ROLLBACK_PROOF_TEXT);
const ARTIFACT_HASHES = JSON.parse(
  fs.readFileSync(path.join(AUDIT, "artifact_hashes.json"), "utf8"),
);

function cteBody(sql, cteName, nextCteName) {
  const start = sql.indexOf(`${cteName} as materialized (`);
  const end = sql.indexOf(`  ${nextCteName} as materialized (`, start);
  assert.ok(start >= 0, `${cteName} CTE is missing`);
  assert.ok(end > start, `${nextCteName} boundary is missing`);
  return sql.slice(start, end);
}

function visibleToRole(row, role) {
  if (row.game === "pokemon" || row.release === "public") return true;
  return row.release === "signed_in" && ["authenticated", "service_role"].includes(role);
}

function boundedNameSeed(rows, role, limit) {
  return rows
    .filter((row) => visibleToRole(row, role))
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, limit);
}

test("visibility is enforced inside name_seed before its bound", () => {
  const body = cteBody(MIGRATION, "name_seed", "matching_sets");
  const visibility = body.indexOf(
    "public.catalog_parent_gv_id_visible_to_request_v1(cp.gv_id)",
  );
  const order = body.indexOf("order by");
  const limit = body.indexOf("limit greatest(");

  assert.ok(visibility > 0);
  assert.ok(visibility < order);
  assert.ok(order < limit);
  assert.match(body, /cp\.gv_id is not null/);
});

test("name_seed_sufficient counts the already-visible seed", () => {
  const body = cteBody(MIGRATION, "name_seed_sufficient", "cameo_seed");
  assert.match(body, /from name_seed/);
  assert.doesNotMatch(body, /card_prints|catalog_parent_gv_id_visible/);
});

test("hidden rows cannot crowd anonymous visible rows out of the bound", () => {
  const rows = [
    ...Array.from({ length: 120 }, (_, index) => ({
      game: "one_piece",
      release: "signed_in",
      name: `A hidden match ${String(index).padStart(3, "0")}`,
    })),
    ...Array.from({ length: 25 }, (_, index) => ({
      game: "pokemon",
      release: "public",
      name: `Z visible match ${String(index).padStart(3, "0")}`,
    })),
  ];

  const anonymous = boundedNameSeed(rows, "anon", 25);
  assert.equal(anonymous.length, 25);
  assert.ok(anonymous.every((row) => row.game === "pokemon"));

  const authenticated = boundedNameSeed(rows, "authenticated", 25);
  assert.equal(authenticated.length, 25);
  assert.ok(authenticated.every((row) => row.game === "one_piece"));
});

test("function contract and security boundary remain unchanged", () => {
  for (const fragment of [
    "create or replace function public.search_print_identity_v1(",
    "q text default null",
    "limit_in integer default 50",
    "offset_in integer default 0",
    "returns table (",
    "language sql",
    "stable",
    "security definer",
    "set search_path = public",
    ") to anon, authenticated, service_role;",
  ]) {
    assert.ok(MIGRATION.includes(fragment), fragment);
    assert.ok(PREVIOUS.includes(fragment), `previous ${fragment}`);
  }

  assert.match(MIGRATION, /revoke all on function public\.search_print_identity_v1\([\s\S]*?\) from public;/);
  assert.match(MIGRATION, /PRINT_IDENTITY_SEARCH_VISIBLE_BOUND_V1/);
});

test("all candidate families retain final visibility defense", () => {
  const body = cteBody(MIGRATION, "candidate_cards", "cameo_agg");
  assert.match(body, /public\.catalog_parent_gv_id_visible_to_request_v1\(cp\.gv_id\)/);
});

test("migration is one narrow forward replacement", () => {
  assert.match(MIGRATION, /^-- PRINT_IDENTITY_SEARCH_VISIBLE_BOUND_V1/);
  assert.match(MIGRATION, /\bbegin;/i);
  assert.match(MIGRATION, /\bcommit;/i);
  assert.doesNotMatch(
    MIGRATION,
    /\b(?:insert|update|delete|truncate|create\s+table|alter\s+table|drop\s+table)\b/i,
  );
});

test("production smoke is explicitly rollback-only and proves restoration", () => {
  assert.match(ROLLBACK_RUNNER, /--execute-rollback-only/);
  assert.match(ROLLBACK_RUNNER, /await client\.query\("rollback"\)/);
  assert.doesNotMatch(ROLLBACK_RUNNER, /client\.query\(["'`]commit/i);
  assert.match(ROLLBACK_RUNNER, /assert\.deepEqual\(afterRollback, before/);
  assert.match(ROLLBACK_RUNNER, /assert\.deepEqual\(ledgerAfter, ledgerBefore/);
  assert.match(ROLLBACK_RUNNER, /durable_database_writes: false/);
});

test("production rollback artifact proves role behavior and zero durable drift", () => {
  const expectedHash = ARTIFACT_HASHES.artifacts.find(
    (artifact) => artifact.path === "rollback_proof.json",
  )?.sha256;
  const actualHash = crypto.createHash("sha256").update(ROLLBACK_PROOF_TEXT).digest("hex");

  assert.equal(actualHash, expectedHash);
  assert.equal(ROLLBACK_PROOF.execution_mode, "production_rollback_only");
  assert.equal(ROLLBACK_PROOF.migration_applied, false);
  assert.equal(ROLLBACK_PROOF.durable_database_writes, false);
  assert.equal(ROLLBACK_PROOF.transaction_rolled_back, true);
  assert.deepEqual(ROLLBACK_PROOF.ledger_after, ROLLBACK_PROOF.ledger_before);
  assert.deepEqual(ROLLBACK_PROOF.function_after_rollback, ROLLBACK_PROOF.function_before);
  assert.equal(
    ROLLBACK_PROOF.function_transient.identity_arguments,
    ROLLBACK_PROOF.function_before.identity_arguments,
  );
  assert.equal(ROLLBACK_PROOF.function_transient.result_type, ROLLBACK_PROOF.function_before.result_type);
  assert.equal(ROLLBACK_PROOF.function_transient.acl, ROLLBACK_PROOF.function_before.acl);
  assert.notEqual(
    ROLLBACK_PROOF.function_transient.definition_sha256,
    ROLLBACK_PROOF.function_before.definition_sha256,
  );
  assert.deepEqual(ROLLBACK_PROOF.probes.map((probe) => probe.role), ["anon", "authenticated"]);
  assert.deepEqual(ROLLBACK_PROOF.probes[0].game_codes, ["pokemon"]);
  assert.ok(ROLLBACK_PROOF.probes[1].game_codes.includes("mtg"));
  assert.doesNotMatch(ROLLBACK_PROOF_TEXT, /(?:postgres(?:ql)?:\/\/|SUPABASE_DB_URL|password)/i);
});
