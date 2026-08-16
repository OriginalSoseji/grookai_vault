import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  evaluateOnePieceDurableStagingPreflightV1,
  ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
  ONE_PIECE_DURABLE_STAGING_PLAN_FINGERPRINT,
  ONE_PIECE_DURABLE_STAGING_ROLLBACK_SHA256,
  ONE_PIECE_PREFLIGHT_PROTECTED_RELATIONS,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_preflight_v1.mjs";

function fixture() {
  return {
    local: {
      migration_sha256: ONE_PIECE_DURABLE_STAGING_MIGRATION_SHA256,
      rollback_sha256: ONE_PIECE_DURABLE_STAGING_ROLLBACK_SHA256,
      plan_fingerprint_sha256: ONE_PIECE_DURABLE_STAGING_PLAN_FINGERPRINT,
      target_migration_present: false,
      duplicate_migration_versions: 0,
      latest_migration_version: "20260814060000",
    },
    production: {
      guard: {
        transaction_read_only: "on",
        default_transaction_read_only: "on",
        transaction_closed_before_artifacts: true,
      },
      collisions: {
        expected_counts: { tables: 2, functions: 1, indexes: 2, policies: 4, triggers: 2 },
        tables: [], functions: [], indexes: [], policies: [], triggers: [],
      },
      migration_history: {
        schema_present: true,
        table_present: true,
        reserved_version_rows: 0,
        reserved_name_rows: 0,
        later_migration_rows: 0,
        duplicate_versions: 0,
      },
      requirements: {
        roles: ["anon", "authenticated", "authenticator", "service_role"]
          .map((role_name) => ({ role_name })),
        current_user_can_create_public: true,
      },
      security_boundary: {
        default_acl_captured: true,
        candidate_object_grants: [],
        schema_create_privileges: [
          { role_name: "anon", has_create: false },
          { role_name: "authenticated", has_create: false },
        ],
      },
      baselines: {
        missing_relations: [],
        schema_fingerprint_sha256: "a".repeat(64),
        row_counts: Object.fromEntries(ONE_PIECE_PREFLIGHT_PROTECTED_RELATIONS
          .map((table) => [table, table.startsWith("sealed_product_") ? 0 : 1])),
        sealed_migration_present: true,
        one_piece_active_source_products: 100,
        mtg: { game_count: 1, set_count: 100, release_status: "hidden" },
      },
      lock_risk: {
        ungranted_locks: 0,
        protected_access_exclusive_locks: 0,
        long_transactions: 0,
        prepared_transactions: 0,
        connection_utilization: 0.2,
      },
    },
  };
}

test("clean durable staging preflight fixture passes", () => {
  assert.deepEqual(evaluateOnePieceDurableStagingPreflightV1(fixture()), []);
});

test("object and migration collisions fail closed", () => {
  const value = fixture();
  value.production.collisions.tables.push({ object_name: "one_piece_canonical_import_rows" });
  value.production.migration_history.reserved_version_rows = 1;
  assert.deepEqual(evaluateOnePieceDurableStagingPreflightV1(value), [
    "one_piece_tables_collision",
    "reserved_migration_version_collision",
  ]);
});

test("unsafe privileges, protected drift, and locks fail closed", () => {
  const value = fixture();
  value.production.security_boundary.schema_create_privileges[0].has_create = true;
  value.production.baselines.row_counts.sealed_product_candidates = 1;
  value.production.baselines.mtg.release_status = "public";
  value.production.lock_risk.long_transactions = 1;
  const findings = evaluateOnePieceDurableStagingPreflightV1(value);
  assert.ok(findings.includes("unsafe_schema_create_privilege:anon"));
  assert.ok(findings.includes("sealed_domain_not_empty:sealed_product_candidates"));
  assert.ok(findings.includes("mtg_release_not_hidden"));
  assert.ok(findings.includes("long_transaction_present"));
});

test("production reader is statically read-only and artifact-last", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_canonical_import_durable_staging_preflight_v1.mjs",
    "utf8",
  );
  assert.match(source, /set default_transaction_read_only = on/i);
  assert.match(source, /begin read only/i);
  assert.match(source, /assertReadOnlySql/);
  assert.match(source, /await client\.query\("rollback"\)/);
  assert.ok(source.indexOf("captureProduction(connectionString)") <
    source.indexOf("fs.mkdir(outDir"));
  assert.doesNotMatch(source,
    /\bclient\.query\([`'"](?:insert|update|delete|create|alter|drop|grant|revoke|truncate)\b/i);
});
