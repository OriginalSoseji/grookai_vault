import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  evaluateSealedSchemaSecurityPreflightV1,
  SEALED_FUNCTIONS_V1,
  SEALED_INDEXES_V1,
  SEALED_POLICIES_V1,
  SEALED_RESERVED_MIGRATION_VERSION,
  SEALED_TABLES_V1,
  SEALED_TRIGGERS_V1,
} from "../../backend/pricing/cross_tcg_sealed_product_schema_preflight_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function fixture() {
  return JSON.parse(source(
    "tests/fixtures/cross_tcg_sealed_product_schema_preflight_v1.json",
  ));
}

test("frozen object inventory and migration reservation are exact", () => {
  assert.equal(SEALED_TABLES_V1.length, 10);
  assert.equal(SEALED_FUNCTIONS_V1.length, 5);
  assert.equal(SEALED_POLICIES_V1.length, 10);
  assert.equal(SEALED_INDEXES_V1.length, 8);
  assert.equal(SEALED_TRIGGERS_V1.length, 10);
  assert.equal(SEALED_RESERVED_MIGRATION_VERSION, "20260814060000");
});

test("clean read-only production fixture passes", () => {
  assert.deepEqual(evaluateSealedSchemaSecurityPreflightV1(fixture()), []);
});

test("any partial sealed object state blocks", () => {
  const value = fixture();
  value.production.collisions.tables.push({ object_name: SEALED_TABLES_V1[0] });
  value.production.collisions.functions.push({ object_name: "sealed_product_freeze_release_v1" });
  assert.deepEqual(evaluateSealedSchemaSecurityPreflightV1(value), [
    "sealed_tables_collision",
    "sealed_functions_collision",
  ]);
});

test("migration history collisions and stale reservation block", () => {
  const value = fixture();
  value.production.migration_history.reserved_version_rows = 1;
  value.production.migration_history.sealed_history_rows = 1;
  value.production.migration_history.latest_version = SEALED_RESERVED_MIGRATION_VERSION;
  assert.deepEqual(evaluateSealedSchemaSecurityPreflightV1(value), [
    "reserved_migration_version_collision",
    "sealed_migration_history_collision",
    "reserved_migration_version_not_after_production_history",
  ]);
});

test("missing requirements and unsafe client schema privilege block", () => {
  const value = fixture();
  value.production.requirements.roles = value.production.requirements.roles
    .filter((row) => row.role_name !== "service_role");
  value.production.requirements.extensions = value.production.requirements.extensions
    .filter((row) => row.extension_name !== "pgcrypto");
  value.production.security_boundary.schema_create_privileges[0].has_create = true;
  assert.deepEqual(evaluateSealedSchemaSecurityPreflightV1(value), [
    "required_role_missing:service_role",
    "required_extension_missing:pgcrypto",
    "unsafe_schema_create_privilege:anon:public",
  ]);
});

test("protected baseline and MTG release drift block", () => {
  const value = fixture();
  value.production.baselines.missing_relations = ["card_prints"];
  value.production.baselines.rows.market_price_current_publication = 0;
  value.production.baselines.mtg.release_status = "public";
  assert.deepEqual(evaluateSealedSchemaSecurityPreflightV1(value), [
    "protected_relation_missing:card_prints",
    "market_publication_pointer_count_mismatch",
    "mtg_release_not_hidden",
  ]);
});

test("lock pressure blocks future DDL", () => {
  const value = fixture();
  value.production.lock_risk.ungranted_locks = 2;
  value.production.lock_risk.long_transactions = 1;
  value.production.lock_risk.connection_utilization = 0.8;
  assert.deepEqual(evaluateSealedSchemaSecurityPreflightV1(value), [
    "ungranted_locks_present",
    "long_transaction_present",
    "connection_utilization_high",
  ]);
});

test("live reader is fail-closed and writes only after transaction capture", () => {
  const script = source(
    "scripts/audits/cross_tcg_sealed_product_schema_preflight_v1.mjs",
  );
  assert.match(script, /set default_transaction_read_only = on/i);
  assert.match(script, /begin read only/i);
  assert.match(script, /show transaction_read_only/i);
  assert.match(script, /assertReadOnlySql/);
  assert.match(script, /await client\.query\("rollback"\)/);
  assert.ok(script.indexOf("captureProduction(databaseUrl)") < script.indexOf("fs.mkdir(outDir"));
  assert.doesNotMatch(script, /\bclient\.query\([`'"](?:insert|update|delete|create|alter|drop|grant|revoke|truncate)\b/i);
});

test("candidate remains outside applied migration history", () => {
  const migrations = readdirSync(new URL("../../supabase/migrations", import.meta.url));
  assert.equal(migrations.some((name) => name.includes("sealed_product_domain")), false);
});
