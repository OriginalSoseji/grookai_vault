import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTcgplayerIdentityMappingWorklistV1,
  TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2,
} from "../../backend/pricing/tcgplayer_identity_mapping_worklist_v1.mjs";

const rows = [
  {
    primary_reason: "missing_active_source_mapping",
    decision: "quarantine",
    source_observation_id: "observation-2",
    source_product_id: 102,
    source_product_name: "Bulbasaur",
    source_category_id: 3,
    source_category_name: "Pokemon",
    source_group_id: 2,
    source_group_name: "Set B",
    source_subtype_name: "Normal",
    product_scope_result: "in_scope",
  },
  {
    primary_reason: "missing_active_source_mapping",
    decision: "quarantine",
    source_observation_id: "observation-1",
    source_product_id: 101,
    source_product_name: "Pikachu",
    source_category_id: 3,
    source_category_name: "Pokemon",
    source_group_id: 1,
    source_group_name: "Set A",
    source_subtype_name: "Holofoil",
    product_scope_result: "in_scope",
  },
  {
    primary_reason: "missing_mapping_method",
    decision: "exclude",
    source_observation_id: "observation-3",
    source_product_id: 101,
    source_product_name: "Pikachu",
    source_category_id: 3,
    source_category_name: "Pokemon",
    source_group_id: 1,
    source_group_name: "Set A",
    source_subtype_name: "Reverse Holofoil",
    product_scope_result: "in_scope",
  },
];

test("identity mapping worklist reconciles rows, products, and source groups", () => {
  const result = buildTcgplayerIdentityMappingWorklistV1(rows, {
    expectedRowCount: 3,
  });
  assert.equal(result.status, "ready");
  assert.deepEqual(result.counts, {
    backlog_rows: 3,
    source_products: 2,
    source_groups: 2,
    missing_active_source_mapping: 2,
    missing_mapping_method: 1,
  });
  assert.deepEqual(
    result.groups.map((group) => [group.source_group_name, group.backlog_rows]),
    [["Set A", 2], ["Set B", 1]],
  );
  assert.deepEqual(result.categories, [{
    source_category_id: 3,
    source_category_name: "Pokemon",
    agent_key: "pokemon-tcgplayer-identity-repair-v1",
    backlog_rows: 3,
    source_products: 2,
    source_groups: 2,
    reasons: {
      missing_active_source_mapping: 2,
      missing_mapping_method: 1,
    },
  }]);
  assert.deepEqual(result.routes, [{
    source_category_id: 3,
    source_category_name: "Pokemon",
    product_scope_result: "in_scope",
    agent_key: "pokemon-tcgplayer-identity-repair-v1",
    backlog_rows: 3,
    source_products: 2,
    source_groups: 2,
  }]);
  assert.ok(result.gaps.every((row) =>
    row.policy_version === TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2));
});

test("identity mapping worklist fails closed on duplicate or incomplete evidence", () => {
  const result = buildTcgplayerIdentityMappingWorklistV1([
    rows[0],
    rows[0],
    { ...rows[1], source_group_name: "" },
  ], { expectedRowCount: 3 });
  assert.equal(result.status, "invalid");
  assert.ok(result.findings.includes("duplicate_source_observation:observation-2"));
  assert.ok(result.findings.includes("incomplete_source_metadata:observation-1"));
  assert.ok(result.findings.includes("identity_mapping_partition_mismatch:3:1"));
});
