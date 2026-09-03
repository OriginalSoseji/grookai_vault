import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  appRouteFromPath,
  captureCompletenessFindings,
  compareDatabaseSnapshots,
  compareParitySnapshots,
  compareProductSnapshots,
  compareRepositorySnapshots,
  parseGitTree,
  productCaseStatus,
  projectRefFromDatabaseConnectionString,
  projectRefFromSupabaseUrl,
  stableJson,
} from "../../scripts/audits/system_parity_crawl_v1.mjs";

function repository(overrides = {}) {
  return {
    migrations: [{ path: "supabase/migrations/001.sql", object: "one" }],
    workflows: [{ path: ".github/workflows/ci.yml", object: "two", schedules: [] }],
    web_routes: [{ kind: "page", path: "/sets", source_path: "apps/web/src/app/sets/page.tsx" }],
    executable_entrypoints: [{ entrypoint_kind: "worker", path: "scripts/workers/catalog.mjs", object: "three" }],
    ...overrides,
  };
}

function database(overrides = {}) {
  return {
    queries: {
      relations: { rows: [{ schema_name: "public", relation_name: "card_prints", relkind: "r", rls_enabled: true, rls_forced: true }] },
      functions: { rows: [{ schema_name: "public", function_name: "search_cards", identity_arguments: "text" }] },
      policies: { rows: [{ schema_name: "public", relation_name: "card_prints", policyname: "read", roles: ["authenticated"], qual: "true" }] },
      grants: { rows: [{ table_schema: "public", table_name: "card_prints", grantee: "authenticated", privilege_type: "SELECT", is_grantable: "NO" }] },
      card_prints_by_game: { rows: [{ game_code: "pokemon", identity_domain: "eng", row_count: "100" }] },
      ...overrides,
    },
  };
}

function product(status = "captured") {
  return {
    cases: [{ route_id: "sets", viewport: "desktop", status, duration_ms: 100, failed_visible_image_count: 0 }],
  };
}

test("git tree parsing and route derivation preserve exact source identity", () => {
  const rows = parseGitTree("100644 blob abc123\tapps/web/src/app/sets/page.tsx\0");
  assert.deepEqual(rows, [{ mode: "100644", type: "blob", object: "abc123", path: "apps/web/src/app/sets/page.tsx" }]);
  assert.deepEqual(appRouteFromPath(rows[0].path), {
    path: "/sets",
    kind: "page",
    source_path: "apps/web/src/app/sets/page.tsx",
  });
  assert.equal(appRouteFromPath("apps/web/src/components/Foo.tsx"), null);
});

test("stable JSON ignores object key insertion order", () => {
  assert.equal(stableJson({ b: 2, a: { d: 4, c: 3 } }), stableJson({ a: { c: 3, d: 4 }, b: 2 }));
});

test("database connection identity must come from the database URL itself", () => {
  const projectRef = "ycdxbpibncqcchqiihfz";
  assert.equal(
    projectRefFromDatabaseConnectionString(`postgresql://postgres.${projectRef}:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres`),
    projectRef,
  );
  assert.equal(
    projectRefFromDatabaseConnectionString(`postgresql://postgres:secret@db.${projectRef}.supabase.co:5432/postgres`),
    projectRef,
  );
  assert.equal(
    projectRefFromDatabaseConnectionString("postgresql://postgres:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres"),
    null,
  );
  assert.equal(projectRefFromSupabaseUrl(`https://${projectRef}.supabase.co`), projectRef);
});

test("migration mutation and unexplained workflow removal fail closed", () => {
  const candidate = repository({
    migrations: [{ path: "supabase/migrations/001.sql", object: "changed" }],
    workflows: [],
  });
  const result = compareRepositorySnapshots(repository(), candidate);
  assert.ok(result.findings.some((finding) => finding.code === "migration_mutated"));
  assert.ok(result.findings.some((finding) => finding.code === "workflow_removed"));
});

test("an explicit ledger can explain a workflow retirement but never a migration mutation", () => {
  const candidate = repository({
    migrations: [{ path: "supabase/migrations/001.sql", object: "changed" }],
    workflows: [],
  });
  const result = compareRepositorySnapshots(repository(), candidate, {
    allowed_removed_paths: [".github/workflows/ci.yml"],
  });
  assert.ok(!result.findings.some((finding) => finding.code === "workflow_removed"));
  assert.ok(result.findings.some((finding) => finding.code === "migration_mutated"));
});

test("database object or canonical row loss fails parity", () => {
  const result = compareDatabaseSnapshots(database(), database({
    relations: { rows: [] },
    card_prints_by_game: { rows: [{ game_code: "pokemon", identity_domain: "eng", row_count: "99" }] },
  }));
  assert.ok(result.findings.some((finding) => finding.code === "relation_removed"));
  assert.ok(result.findings.some((finding) => finding.code === "canonical_card_count_decreased"));
});

test("RLS, policy, and grant weakening fail closed unless explicitly ledgered", () => {
  const weakened = database({
    relations: { rows: [{ schema_name: "public", relation_name: "card_prints", relkind: "r", rls_enabled: false, rls_forced: false }] },
    policies: { rows: [{ schema_name: "public", relation_name: "card_prints", policyname: "read", roles: ["anon", "authenticated"], qual: "true" }] },
    grants: { rows: [
      { table_schema: "public", table_name: "card_prints", grantee: "authenticated", privilege_type: "SELECT", is_grantable: "YES" },
      { table_schema: "public", table_name: "card_prints", grantee: "anon", privilege_type: "SELECT", is_grantable: "NO" },
    ] },
  });
  const result = compareDatabaseSnapshots(database(), weakened);
  assert.ok(result.findings.some((finding) => finding.code === "relation_rls_weakened"));
  assert.ok(result.findings.some((finding) => finding.code === "policy_changed_without_ledger"));
  assert.ok(result.findings.some((finding) => finding.code === "grant_became_grantable"));
  assert.ok(result.findings.some((finding) => finding.code === "grant_added_without_ledger"));

  const ledgered = compareDatabaseSnapshots(database(), weakened, {
    allowed_changed_database_security_objects: [
      "relation:public.card_prints:r",
      "policy:public.card_prints:read",
      "grant:public.card_prints:authenticated:SELECT",
      "grant:public.card_prints:anon:SELECT",
    ],
  });
  assert.ok(!ledgered.findings.some((finding) => /rls|policy_changed|grant_/.test(finding.code)));
});

test("a newly broken product route or image is a regression", () => {
  const failed = compareProductSnapshots(product(), product("failed"));
  assert.ok(failed.findings.some((finding) => finding.code === "product_case_failed"));
  const images = compareProductSnapshots(product(), {
    cases: [{ route_id: "sets", viewport: "desktop", status: "captured", duration_ms: 100, failed_visible_image_count: 1 }],
  });
  assert.ok(images.findings.some((finding) => finding.code === "visible_image_failures_increased"));
  const hardError = compareProductSnapshots(product(), {
    cases: [{ route_id: "sets", viewport: "desktop", status: "captured", hard_error_copy: true }],
  });
  assert.ok(hardError.findings.some((finding) => finding.code === "product_hard_error_copy"));
});

test("hard-error copy and incomplete required domains fail capture", () => {
  assert.equal(productCaseStatus({ httpStatus: 200, hardErrorCopy: true }), "failed");
  assert.equal(productCaseStatus({ httpStatus: 200, pageErrorCount: 0 }), "captured");
  const findings = captureCompletenessFindings(
    { required_query_failures: [] },
    { errors: [{ component: "github_workflow_runs" }] },
    { case_count: 1, failed_case_count: 1, cases: [{ route_id: "sets", viewport: "desktop", status: "failed" }] },
  );
  assert.ok(findings.some((finding) => finding.domain === "runtime"));
  assert.ok(findings.some((finding) => finding.code === "product_case_incomplete"));
});

test("unchanged snapshots pass the aggregate parity gate", () => {
  const snapshot = {
    manifest: { authority: { sha: "abc" } },
    repository: repository(),
    database: database(),
    product: product(),
    runtime: {},
  };
  const result = compareParitySnapshots(snapshot, snapshot);
  assert.equal(result.parity_status, "PASS");
  assert.equal(result.regression_count, 0);
});

test("runtime capture errors block aggregate parity", () => {
  const baseline = {
    manifest: { authority: { sha: "abc" } },
    repository: repository(),
    database: database(),
    product: product(),
    runtime: { errors: [] },
  };
  const candidate = { ...baseline, runtime: { errors: [{ component: "deployment" }] } };
  const result = compareParitySnapshots(baseline, candidate);
  assert.equal(result.parity_status, "BLOCKED");
  assert.ok(result.findings.some((finding) => finding.code === "runtime_capture_incomplete"));
});

test("the active contract and operator entry preserve the no-write baseline boundary", () => {
  const contract = fs.readFileSync("docs/contracts/SYSTEM_PARITY_CRAWL_V1.md", "utf8");
  const index = fs.readFileSync("docs/CONTRACT_INDEX.md", "utf8");
  const playbook = fs.readFileSync("docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md", "utf8");
  const crawler = fs.readFileSync("scripts/audits/system_parity_crawl_v1.mjs", "utf8");
  assert.match(contract, /production database is inspected inside a read-only transaction/i);
  assert.match(contract, /Temporary auth-account creation is forbidden/i);
  assert.match(index, /SYSTEM_PARITY_CRAWL_V1 \| Active/);
  assert.match(playbook, /one bounded capability, one fresh-main branch/i);
  assert.doesNotMatch(crawler, /createTemporaryAccount|auth\/v1\/admin\/users/);
});
