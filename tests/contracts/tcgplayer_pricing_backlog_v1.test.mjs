import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateTcgplayerPricingBacklogV1,
} from "../../backend/pricing/tcgplayer_pricing_backlog_policy_v1.mjs";
import {
  buildTcgplayerIdentityMappingWorklistV1,
} from "../../backend/pricing/tcgplayer_identity_mapping_worklist_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKLOG_SCRIPT = readFileSync(
  path.resolve(__dirname, "..", "..", "scripts", "audits", "tcgplayer_pricing_backlog_v1.mjs"),
  "utf8",
);

test("read-only pricing backlog audit requires verified remote database TLS", () => {
  assert.match(BACKLOG_SCRIPT, /rejectUnauthorized:\s*true/);
  assert.match(BACKLOG_SCRIPT, /SUPABASE_DB_CA_CERT/);
  assert.doesNotMatch(BACKLOG_SCRIPT, /rejectUnauthorized:\s*false/);
});

test("Pokemon coverage measures physical English cards separately from excluded domains", () => {
  assert.match(BACKLOG_SCRIPT, /pokemon_catalog_coverage:\s*pokemonCatalogCoverage/);
  assert.match(BACKLOG_SCRIPT, /PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT/);
  assert.match(BACKLOG_SCRIPT, /edition_sensitive_parents as materialized/);
  assert.match(BACKLOG_SCRIPT, /edition_sensitive_exact_printing_count_held/);
  assert.match(BACKLOG_SCRIPT, /coverage_is_conservative:\s*true/);
  assert.match(BACKLOG_SCRIPT, /card\.identity_domain = 'pokemon_eng_standard'/);
  assert.match(BACKLOG_SCRIPT, /catalog_set\.identity_domain_default = 'pokemon_eng_standard'/);
  assert.match(BACKLOG_SCRIPT, /identity_domain in \('pokemon_jpn', 'tcg_pocket_excluded'\)/);
  assert.match(BACKLOG_SCRIPT, /unpriced_parent_count:\s*parentCount - pricedParentCount/);
  assert.match(BACKLOG_SCRIPT, /unpriced_exact_printing_count:\s*exactPrintingCount - pricedExactPrintingCount/);
});

const run = {
  id: "e658d577-a40c-46e8-b115-b3f9a7211507",
  run_key: "gym-release-production-20261014T0214Z",
  selected_count: 208599,
  eligible_count: 165581,
  snapshot_count: 165581,
  excluded_count: 11688,
  quarantined_count: 31330,
  delayed_count: 0,
  suppressed_count: 0,
};

const primaryReasons = [
  { decision: "quarantine", primary_reason: "missing_active_source_mapping", count: 20372 },
  { decision: "exclude", primary_reason: "missing_active_source_mapping", count: 10441 },
  { decision: "quarantine", primary_reason: "missing_printed_number_evidence", count: 7394 },
  { decision: "quarantine", primary_reason: "missing_positive_market_price", count: 1695 },
  { decision: "quarantine", primary_reason: "edition_bound_pricing_authority_required", count: 1663 },
  { decision: "exclude", primary_reason: "cosmos_assignment_required", count: 569 },
  { decision: "exclude", primary_reason: "special_variant_v1_1", count: 392 },
  { decision: "exclude", primary_reason: "edition_bound_pricing_authority_required", count: 206 },
  { decision: "quarantine", primary_reason: "missing_canonical_printing_identity", count: 205 },
  { decision: "exclude", primary_reason: "missing_printed_number_evidence", count: 34 },
  { decision: "exclude", primary_reason: "cosmos_exact_finish_required", count: 32 },
  { decision: "exclude", primary_reason: "missing_canonical_printing_identity", count: 7 },
  { decision: "exclude", primary_reason: "missing_mapping_method", count: 5 },
  { decision: "exclude", primary_reason: "missing_positive_market_price", count: 2 },
  { decision: "quarantine", primary_reason: "missing_mapping_method", count: 1 },
];

test("pricing backlog is partitioned into mutually exclusive completion lanes", () => {
  const report = evaluateTcgplayerPricingBacklogV1({ run, primaryReasons });
  assert.equal(report.status, "incomplete");
  assert.deepEqual(report.findings, []);
  assert.equal(report.counts.non_published, 43018);
  assert.equal(report.counts.primary_reason_rows, 43018);
  assert.deepEqual(
    report.lanes.map((lane) => [lane.lane_id, lane.backlog_count]),
    [
      ["identity_mapping", 30819],
      ["catalog_evidence", 7428],
      ["edition_authority", 1869],
      ["source_price", 1697],
      ["finish_assignment", 601],
      ["variant_support", 392],
      ["exact_printing", 212],
    ],
  );
  assert.equal(report.lanes.some((lane) => lane.lane_id === "unclassified"), false);
});

test("a missing primary-reason row invalidates the backlog instead of hiding work", () => {
  const report = evaluateTcgplayerPricingBacklogV1({
    run,
    primaryReasons: primaryReasons.slice(1),
  });
  assert.equal(report.status, "invalid");
  assert.ok(report.findings.includes("primary_reason_partition_mismatch"));
});

test("zero backlog is the only complete pricing state", () => {
  const report = evaluateTcgplayerPricingBacklogV1({
    run: {
      ...run,
      selected_count: 100,
      eligible_count: 100,
      snapshot_count: 100,
      excluded_count: 0,
      quarantined_count: 0,
    },
  });
  assert.equal(report.status, "complete");
  assert.equal(report.counts.non_published, 0);
});

test("identity groups retain their source category for game-scoped routing", () => {
  const worklist = buildTcgplayerIdentityMappingWorklistV1([
    {
      decision: "quarantine",
      primary_reason: "missing_active_source_mapping",
      source_observation_id: "observation-1",
      source_product_id: 232318,
      source_product_name: "Bulbasaur",
      source_category_id: 3,
      source_category_name: "Pokemon",
      source_group_id: 2782,
      source_group_name: "McDonald's 25th Anniversary Promos",
      source_subtype_name: "Normal",
      product_scope_result: "in_scope",
      product_scope_rule_id: "pokemon_numbered_card",
    },
  ], { expectedRowCount: 1 });
  assert.equal(worklist.groups[0].source_category_id, 3);
  assert.equal(worklist.groups[0].source_category_name, "Pokemon");
});
