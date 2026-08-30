import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateTcgplayerMarketVaultProductionReadbackV1,
  selectTcgplayerMarketPublicVaultSampleGroupV1,
} from "../../backend/pricing/tcgplayer_market_vault_production_readback_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const AUDIT = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_market_vault_production_readback_v1.mjs",
  ),
  "utf8",
);
const DEPLOYMENT_HEALTH_ROUTE = readFileSync(
  path.join(
    ROOT,
    "apps",
    "web",
    "src",
    "app",
    "api",
    "health",
    "binders-client-state",
    "route.ts",
  ),
  "utf8",
);

function evidence() {
  return {
    schema: {
      relation_name: "v_vault_mobile_pricing_targets_v1",
      relation_kind: "v",
      relation_options: [
        "security_barrier=true",
        "security_invoker=true",
      ],
      owner_table_rls_enabled: true,
      definition_owner_scoped: false,
      definition_excludes_archived: false,
      definition_excludes_slabs: false,
      definition_uses_backing_function: true,
      backing_function_name:
        "vault_mobile_pricing_target_rows_for_current_user_v2",
      backing_function_security_definer: true,
      backing_function_stable: true,
      backing_function_fixed_search_path: true,
      backing_function_owner_scoped: true,
      backing_function_excludes_archived: true,
      backing_function_excludes_slabs: true,
    },
    access: {
      anonymous_select_granted: false,
      authenticated_select_granted: true,
      authenticated_write_or_ddl_granted: false,
      service_select_granted: true,
      service_write_or_ddl_granted: false,
      anonymous_runtime_denied: true,
      anonymous_runtime_code: "42501",
      authenticated_without_uid_count: 0,
      backing_function_anonymous_execute_granted: false,
      backing_function_authenticated_execute_granted: true,
      backing_function_service_execute_granted: true,
    },
    owner_scope: {
      sample_owner_available: true,
      expected_target_count: 3,
      authenticated_target_count: 3,
      foreign_owner_target_count: 0,
      duplicate_instance_count: 0,
      resolved_printing_count: 2,
      unresolved_printing_count: 1,
    },
    exact_pricing: {
      requested_printing_count: 1,
      returned_pricing_row_count: 1,
      non_exact_scope_count: 0,
      identity_mismatch_count: 0,
      priced_copy_count: 2,
      unpriced_copy_count: 1,
      reconciled_total_usd: 24.68,
      independent_total_usd: 24.68,
      sample_group: {
        card_print_id: "card-print-1",
        priced_copy_count: 2,
        unpriced_copy_count: 1,
        public_copy_count: 3,
        private_copy_count: 0,
        reconciled_total_usd: 24.68,
        independent_total_usd: 24.68,
        latest_observed_at: "2026-07-28T08:15:00.000Z",
        latest_published_at: "2026-07-28T08:20:00.000Z",
      },
    },
  };
}

test("clean production readback passes exact-copy pricing and access proof", () => {
  const result = evaluateTcgplayerMarketVaultProductionReadbackV1(
    evidence(),
  );
  assert.equal(result.status, "passed");
  assert.deepEqual(result.findings, []);
  assert.equal(
    result.schema.authority_mode,
    "security_invoker_function",
  );
  assert.equal(result.owner_scope.authenticated_target_count, 3);
  assert.equal(result.exact_pricing.priced_copy_count, 2);
  assert.equal(result.exact_pricing.reconciled_total_usd, 24.68);
});

test("legacy direct owner-scoped authority remains valid", () => {
  const input = evidence();
  input.schema.relation_options = [
    "security_barrier=true",
    "security_invoker=false",
  ];
  input.schema.definition_owner_scoped = true;
  input.schema.definition_excludes_archived = true;
  input.schema.definition_excludes_slabs = true;
  input.schema.definition_uses_backing_function = false;
  input.schema.backing_function_name = null;
  input.schema.backing_function_security_definer = false;
  input.schema.backing_function_stable = false;
  input.schema.backing_function_fixed_search_path = false;
  input.schema.backing_function_owner_scoped = false;
  input.schema.backing_function_excludes_archived = false;
  input.schema.backing_function_excludes_slabs = false;
  input.access.backing_function_authenticated_execute_granted = false;
  input.access.backing_function_service_execute_granted = false;
  const result =
    evaluateTcgplayerMarketVaultProductionReadbackV1(input);
  assert.equal(result.status, "passed");
  assert.equal(
    result.schema.authority_mode,
    "direct_security_definer_view",
  );
});

test("hardened authority fails closed when backing function grants widen", () => {
  const input = evidence();
  input.access.backing_function_anonymous_execute_granted = true;
  const result =
    evaluateTcgplayerMarketVaultProductionReadbackV1(input);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.includes("vault_pricing_target_authority_invalid"),
  );
});

test("missing schema and widened grants fail closed", () => {
  const input = evidence();
  input.schema.relation_name = null;
  input.schema.relation_kind = null;
  input.schema.relation_options = [];
  input.schema.owner_table_rls_enabled = false;
  input.access.anonymous_select_granted = true;
  input.access.authenticated_write_or_ddl_granted = true;
  input.access.service_write_or_ddl_granted = true;
  const result =
    evaluateTcgplayerMarketVaultProductionReadbackV1(input);
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("vault_pricing_target_view_missing"));
  assert.ok(
    result.findings.includes(
      "vault_pricing_target_anonymous_select_not_denied",
    ),
  );
  assert.ok(
    result.findings.includes(
      "vault_pricing_target_authenticated_write_or_ddl_granted",
    ),
  );
});

test("owner leakage, duplicate instances, and missing uid isolation fail", () => {
  const input = evidence();
  input.access.authenticated_without_uid_count = 1;
  input.owner_scope.authenticated_target_count = 4;
  input.owner_scope.foreign_owner_target_count = 1;
  input.owner_scope.duplicate_instance_count = 1;
  const result =
    evaluateTcgplayerMarketVaultProductionReadbackV1(input);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.includes(
      "vault_pricing_target_auth_without_uid_leaked_rows",
    ),
  );
  assert.ok(
    result.findings.includes("vault_pricing_target_owner_count_mismatch"),
  );
  assert.ok(
    result.findings.includes("vault_pricing_target_foreign_owner_leak"),
  );
  assert.ok(
    result.findings.includes("vault_pricing_target_duplicate_instance"),
  );
});

test("parent scope, identity drift, and total mismatch fail", () => {
  const input = evidence();
  input.exact_pricing.non_exact_scope_count = 1;
  input.exact_pricing.identity_mismatch_count = 1;
  input.exact_pricing.independent_total_usd = 20;
  const result =
    evaluateTcgplayerMarketVaultProductionReadbackV1(input);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.includes("vault_exact_pricing_non_exact_scope"),
  );
  assert.ok(
    result.findings.includes("vault_exact_pricing_identity_mismatch"),
  );
  assert.ok(
    result.findings.includes("vault_exact_pricing_total_mismatch"),
  );
});

test("a production proof requires at least one priced exact copy", () => {
  const input = evidence();
  input.exact_pricing.priced_copy_count = 0;
  input.exact_pricing.unpriced_copy_count = 3;
  input.exact_pricing.reconciled_total_usd = 0;
  input.exact_pricing.independent_total_usd = 0;
  const result =
    evaluateTcgplayerMarketVaultProductionReadbackV1(input);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.includes(
      "vault_exact_pricing_priced_sample_unavailable",
    ),
  );
});

test("shared product proof sample excludes private and mixed vault groups", () => {
  const selected = selectTcgplayerMarketPublicVaultSampleGroupV1([
    {
      card_print_id: "card-print-1",
      priced_copy_count: 1,
      unpriced_copy_count: 0,
      public_copy_count: 0,
      private_copy_count: 1,
    },
    {
      card_print_id: "card-print-2",
      priced_copy_count: 1,
      unpriced_copy_count: 1,
      public_copy_count: 1,
      private_copy_count: 1,
    },
    {
      card_print_id: "card-print-3",
      priced_copy_count: 1,
      unpriced_copy_count: 0,
      public_copy_count: 1,
      private_copy_count: 0,
    },
  ]);

  assert.equal(selected?.card_print_id, "card-print-3");
});

test("readback policy rejects a private cross-surface sample", () => {
  const input = evidence();
  input.exact_pricing.sample_group.public_copy_count = 0;
  input.exact_pricing.sample_group.private_copy_count = 3;
  const result = evaluateTcgplayerMarketVaultProductionReadbackV1(input);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.includes(
      "vault_exact_pricing_sample_group_not_fully_public",
    ),
  );
});

test("production readback is read-only, hashed, and omits owner identifiers", () => {
  assert.match(AUDIT, /begin read only/i);
  assert.doesNotMatch(AUDIT, /\b(insert|update|delete|truncate)\s+public\./i);
  assert.match(AUDIT, /customer_identifiers_in_artifacts:\s*false/);
  assert.match(AUDIT, /intent::text as intent/);
  assert.match(AUDIT, /selectTcgplayerMarketPublicVaultSampleGroupV1/);
  assert.match(AUDIT, /artifact_hashes\.json/);
  assert.match(AUDIT, /--require-pass/);
  assert.match(AUDIT, /value\("expected-commit-sha"\)/);
  assert.match(
    AUDIT,
    /--expected-commit-sha is required with --require-pass/,
  );
  assert.match(
    AUDIT,
    /tracked worktree must be clean with --require-pass/,
  );
  assert.match(
    DEPLOYMENT_HEALTH_ROUTE,
    /pricing_vault_sample:\s*"fully_public_only_v1"/,
  );
});
