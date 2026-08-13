import assert from "node:assert/strict";
import test from "node:test";

import { buildMtgCanonicalCandidateV1 } from "../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs";
import { buildMtgCanaryPayloadV1 } from "../../scripts/audits/mtg_canonical_catalog_canary_plan_v1.mjs";
import {
  buildMtgCanaryStageContractV1,
  flattenMtgCanaryStagingRowsV1,
  stableJson,
  stripMigrationTransactionV1,
} from "../../scripts/audits/mtg_canonical_catalog_canary_stage_v1.mjs";

function payload() {
  const candidate = buildMtgCanonicalCandidateV1({
    id: "572feb8c-6976-40a8-8a34-b4db836cca56",
    oracle_id: "bdcb7aed-3595-4c7e-b9da-543e92de919a",
    name: "Locke Cole",
    lang: "en",
    games: ["paper"],
    digital: false,
    set_id: "d7beb4b7-e1ff-4d35-ab07-5700f17ea1ea",
    set: "fin",
    set_name: "Final Fantasy",
    set_type: "expansion",
    released_at: "2025-06-13",
    collector_number: "234",
    layout: "normal",
    finishes: ["nonfoil", "foil"],
    tcgplayer_id: 633195,
    rarity: "uncommon",
  });
  return buildMtgCanaryPayloadV1({
    candidates: [candidate],
    warehouseProducts: new Map([
      [
        633195,
        {
          subtypes: new Set(["normal", "foil"]),
          positive_market_subtypes: new Set(["normal", "foil"]),
        },
      ],
    ]),
    sourceBulkSha256: "a".repeat(64),
    stagingMigrationSha256: "b".repeat(64),
    foundationMigrationSha256: "c".repeat(64),
    repository: {
      commit_sha: "d".repeat(40),
      branch: "agent/mtg-pricing-readiness-v1",
    },
  });
}

test("staging rows preserve every planned row exactly", () => {
  const plan = payload();
  const flattened = flattenMtgCanaryStagingRowsV1(plan);
  assert.equal(flattened.rows.length, 8);
  assert.deepEqual(
    Object.fromEntries(
      [...new Set(flattened.rows.map((row) => row.entity_type))].map((type) => [
        type,
        flattened.rows.filter((row) => row.entity_type === type).length,
      ]),
    ),
    {
      sets: 1,
      card_prints: 1,
      card_print_identity: 1,
      card_printings: 2,
      external_mappings: 1,
      external_printing_mappings: 2,
    },
  );
  assert.equal(
    stableJson(flattened.rows[0].payload),
    stableJson(plan.rows.sets[0]),
  );
});

test("staging contract is deterministic and canonical-write free", () => {
  const first = buildMtgCanaryStageContractV1(payload());
  const second = buildMtgCanaryStageContractV1(payload());
  assert.equal(first.batch_id, second.batch_id);
  assert.equal(first.staged_rows_sha256, second.staged_rows_sha256);
  assert.equal(first.mutation_contract_sha256, second.mutation_contract_sha256);
  assert.match(first.required_approval_message, /I do not approve canonical game/);
});

test("migration transaction wrapper is removed for rollback proof", () => {
  const body = stripMigrationTransactionV1("begin;\nselect 1;\ncommit;\n");
  assert.equal(body.trim(), "select 1;");
  assert.throws(() => stripMigrationTransactionV1("select 1;"));
});
