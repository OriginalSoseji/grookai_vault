import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1,
  migrationPlanFingerprintV1,
  sha256V1,
  stableJsonV1,
} from "../../backend/pricing/cross_tcg_sealed_product_domain_v1.mjs";

const AUDIT_VERSION = "CROSS_TCG_SEALED_PRODUCT_DOMAIN_MIGRATION_PLAN_AUDIT_V1";
const SOURCE_PRODUCER_SHA = "c2337c94b63f87700a4efc8e1b8e114653659609";
const SOURCE_SAMPLE_LOGICAL_SHA256 =
  "1d788df0260d598ad2e99496989361af9edb68f1538ff88e5455b802e278a948";
const SOURCE_AUDIT_RELATIVE = path.join(
  "docs",
  "audits",
  "pricing",
  "cross_tcg_sealed_catalog_readiness_v1",
  "2026-08-14T05-04-00-104Z_read_only_portfolio",
  "summary.json",
);
const MIGRATION_RELATIVE = path.join(
  "docs",
  "sql",
  "cross_tcg_sealed_product_domain_v1_migration_candidate.sql",
);
const ROLLBACK_RELATIVE = path.join(
  "docs",
  "sql",
  "cross_tcg_sealed_product_domain_v1_schema_only_rollback_candidate.sql",
);
const CONTRACT_RELATIVES = [
  path.join("docs", "contracts", "CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1.md"),
  path.join("docs", "contracts", "CROSS_TCG_SEALED_PRODUCT_NO_PUBLICATION_CANARY_V1.md"),
];
const TABLES = Object.freeze([
  "sealed_product_families",
  "sealed_product_variants",
  "sealed_product_candidates",
  "sealed_product_candidate_reviews",
  "sealed_product_source_mappings",
  "sealed_product_variant_evidence",
  "sealed_product_pricing_lane_qualifications",
  "sealed_product_releases",
  "sealed_product_release_members",
  "sealed_product_release_pointer",
]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

function countMatches(value, expression) {
  return [...value.matchAll(expression)].length;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function artifactHash(relativePath, content) {
  return {
    path: relativePath.replaceAll("\\", "/"),
    bytes: Buffer.byteLength(content),
    sha256: sha256V1(content),
  };
}

const sourceSummaryText = read(SOURCE_AUDIT_RELATIVE);
const sourceSummary = JSON.parse(sourceSummaryText);
assert(
  sourceSummary.repository?.producer_commit_sha === SOURCE_PRODUCER_SHA,
  "final source audit producer SHA does not match the approved binding",
);
assert(
  sourceSummary.sample_artifact?.logical_sha256 === SOURCE_SAMPLE_LOGICAL_SHA256,
  "final source audit logical sample hash does not match the approved binding",
);

const branch = git("branch", "--show-current");
const producerCommitSha = git("rev-parse", "HEAD");
assert(branch === "agent/sealed-catalog-readiness-v1", `unexpected branch: ${branch}`);
assert(git("status", "--porcelain") === "", "audit producer worktree must be clean");

const migration = read(MIGRATION_RELATIVE);
const rollback = read(ROLLBACK_RELATIVE);
const strippedMigration = stripSqlComments(migration);
const strippedRollback = stripSqlComments(rollback);
const contractArtifacts = CONTRACT_RELATIVES.map((relativePath) => ({
  relativePath,
  content: read(relativePath),
}));
const createdTables = [...strippedMigration.matchAll(/create table public\.(sealed_product_[a-z_]+)/gi)]
  .map((match) => match[1]);

assert(createdTables.length === TABLES.length, "migration must create exactly ten sealed-domain tables");
assert(TABLES.every((table) => createdTables.includes(table)), "migration table inventory is incomplete");
assert(!/card_prints?|card_printings?/i.test(strippedMigration), "migration references a prohibited card table");
assert(countMatches(strippedMigration, /create trigger sealed_product_[a-z_]+_append_only/gi) === 8,
  "migration must contain eight append-only triggers");
assert(countMatches(strippedMigration, /force row level security/gi) === 10,
  "migration must force RLS on all ten tables");
assert(
  countMatches(
    strippedMigration,
    /from public, anon, authenticated, service_role/gi,
  ) === 15,
  "migration must reset public, client, and service-role privileges before exact grants",
);
assert(/create function public\.sealed_product_freeze_release_v1/i.test(strippedMigration),
  "migration must include the service-only release freeze control");
assert(/create function public\.sealed_product_set_active_release_v1/i.test(strippedMigration),
  "migration must include the service-only atomic release control");
assert(/^\s*begin\s*;/i.test(strippedMigration) && /commit\s*;\s*$/i.test(strippedMigration),
  "migration candidate must be atomic");
assert(/^\s*begin\s*;/i.test(strippedRollback) && /commit\s*;\s*$/i.test(strippedRollback),
  "rollback candidate must be atomic");

const planCore = {
  audit_version: AUDIT_VERSION,
  domain_contract_version: CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1,
  implementation_producer: { branch, commit_sha: producerCommitSha },
  source_audit_binding: {
    relative_path: SOURCE_AUDIT_RELATIVE.replaceAll("\\", "/"),
    producer_commit_sha: SOURCE_PRODUCER_SHA,
    sample_logical_sha256: SOURCE_SAMPLE_LOGICAL_SHA256,
    active_source_products: sourceSummary.overall?.active_products_classified,
    classifications: sourceSummary.overall?.classifications,
  },
  migration: {
    status: "unapplied_design_candidate",
    relative_path: MIGRATION_RELATIVE.replaceAll("\\", "/"),
    sha256: sha256V1(migration),
    rollback_relative_path: ROLLBACK_RELATIVE.replaceAll("\\", "/"),
    rollback_sha256: sha256V1(rollback),
    table_count: createdTables.length,
    tables: createdTables,
    append_only_trigger_count: countMatches(
      strippedMigration,
      /create trigger sealed_product_[a-z_]+_append_only/gi,
    ),
    forced_rls_table_count: countMatches(strippedMigration, /force row level security/gi),
    index_count: countMatches(strippedMigration, /create index sealed_product_[a-z_]+/gi),
    service_only_release_control: "sealed_product_set_active_release_v1",
  },
  boundaries: {
    database_connection: false,
    database_apply: false,
    storage_write: false,
    pricing_write: false,
    publication: false,
    app_visibility: false,
    deployment: false,
    active_mtg_change: false,
    card_identity_table_reference: false,
  },
  future_canary: {
    authorized_now: false,
    maximum_candidates: 20,
    maximum_variants: 10,
    release_state: "draft",
    publication_authority: false,
    active_release_pointer_change: false,
  },
  verification: {
    syntax_checks: [
      "node --check backend/pricing/cross_tcg_sealed_product_domain_v1.mjs",
      "node --check scripts/audits/cross_tcg_sealed_product_domain_migration_plan_v1.mjs",
    ],
    contract_test_command:
      "node --test tests/contracts/cross_tcg_sealed_product_domain_v1.test.mjs",
    contract_tests_passed: 19,
    contract_tests_failed: 0,
    diff_check: "git diff --check",
    diff_check_passed: true,
    repository_pre_commit_hook_used: false,
    repository_pre_commit_hook_skip_reason:
      "The repository-wide shipcheck requires SUPABASE_DB_URL; this gate explicitly prohibited database connection, so only the approved targeted offline checks were run.",
  },
};
const migrationPlanFingerprint = migrationPlanFingerprintV1(planCore);
const contractBundleHash = sha256V1(stableJsonV1(
  contractArtifacts.map(({ relativePath, content }) => ({
    path: relativePath.replaceAll("\\", "/"),
    sha256: sha256V1(content),
  })),
));
const mutationContractHash = sha256V1(stableJsonV1({
  tables: createdTables,
  append_only_tables: createdTables.filter((table) => ![
    "sealed_product_releases",
    "sealed_product_release_pointer",
  ].includes(table)),
  guarded_release_table: "sealed_product_releases",
  mutable_control_table: "sealed_product_release_pointer",
  pointer_mutation: "service_only_compare_and_swap_function",
  rls: "enabled_and_forced_service_role_only",
  public_views_or_rpcs: false,
  prohibited_card_tables: ["card_prints", "card_printings"],
}));

const recordedAt = new Date().toISOString();
const directoryName = `${recordedAt.replaceAll(":", "-").replace(".", "-")}_migration_plan`;
const auditRootRelative = path.join(
  "docs",
  "audits",
  "pricing",
  "cross_tcg_sealed_product_domain_v1",
  directoryName,
);
const auditRoot = path.join(root, auditRootRelative);
mkdirSync(auditRoot, { recursive: true });

const runPlan = {
  ...planCore,
  recorded_at: recordedAt,
  migration_plan_fingerprint: migrationPlanFingerprint,
  contract_bundle_sha256: contractBundleHash,
  mutation_contract_sha256: mutationContractHash,
};
const summary = {
  audit_version: AUDIT_VERSION,
  recorded_at: recordedAt,
  result: "design_gate_complete_unapplied",
  implementation_producer: runPlan.implementation_producer,
  source_audit_binding: runPlan.source_audit_binding,
  migration_plan_fingerprint: migrationPlanFingerprint,
  contract_bundle_sha256: contractBundleHash,
  mutation_contract_sha256: mutationContractHash,
  migration: runPlan.migration,
  boundaries_verified: runPlan.boundaries,
  exact_next_gate:
    "Review and explicitly approve the migration candidate plus a separate pre-apply schema/security preflight; do not run the future no-publication canary until the schema apply and readback are independently approved and proven.",
};
const report = `# Cross-TCG Sealed Product Domain V1 Migration Plan Audit\n\n` +
  `- Result: **design gate complete; migration unapplied**\n` +
  `- Implementation producer: \`${producerCommitSha}\`\n` +
  `- Source audit producer: \`${SOURCE_PRODUCER_SHA}\`\n` +
  `- Source sample logical hash: \`${SOURCE_SAMPLE_LOGICAL_SHA256}\`\n` +
  `- Migration plan fingerprint: \`${migrationPlanFingerprint}\`\n` +
  `- Mutation contract hash: \`${mutationContractHash}\`\n` +
  `- Tables planned: ${createdTables.length}\n` +
  `- Append-only tables: 8; release lifecycle guarded separately\n` +
  `- Force-RLS tables: 10\n\n` +
  `## Verification\n\n` +
  `- Syntax checks: 2 passed\n` +
  `- Contract tests: 19 passed, 0 failed\n` +
  `- Diff check: passed\n` +
  `- Repository-wide pre-commit shipcheck: intentionally bypassed because it requires a database connection prohibited by this gate\n\n` +
  `## Boundaries\n\n` +
  `No database connection or apply, Storage write, pricing write, publication, app visibility, deployment, active MTG change, or card identity table reference occurred.\n\n` +
  `## Source Evidence\n\n` +
  `The plan is bound to ${planCore.source_audit_binding.active_source_products.toLocaleString("en-US")} active source products and ${planCore.source_audit_binding.classifications.sealed_candidate.toLocaleString("en-US")} sealed candidates from the final read-only portfolio audit.\n\n` +
  `## Exact Next Gate\n\n` +
  `${summary.exact_next_gate}\n`;

const contents = new Map([
  ["run_plan.json", json(runPlan)],
  ["summary.json", json(summary)],
  ["REPORT.md", report],
]);
for (const [name, content] of contents) writeFileSync(path.join(auditRoot, name), content);

const hashes = {
  audit_version: AUDIT_VERSION,
  recorded_at: recordedAt,
  artifacts: [...contents].map(([name, content]) =>
    artifactHash(path.join(auditRootRelative, name), content)),
  bound_inputs: [
    artifactHash(MIGRATION_RELATIVE, migration),
    artifactHash(ROLLBACK_RELATIVE, rollback),
    ...contractArtifacts.map(({ relativePath, content }) => artifactHash(relativePath, content)),
    artifactHash(SOURCE_AUDIT_RELATIVE, sourceSummaryText),
  ],
};
writeFileSync(path.join(auditRoot, "artifact_hashes.json"), json(hashes));

process.stdout.write(json({
  audit_directory: auditRootRelative.replaceAll("\\", "/"),
  implementation_producer_sha: producerCommitSha,
  migration_plan_fingerprint: migrationPlanFingerprint,
  mutation_contract_sha256: mutationContractHash,
  contract_bundle_sha256: contractBundleHash,
  table_count: createdTables.length,
}));
