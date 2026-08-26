import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildCatalogIncrementalSupervisorPlanV1,
} from "../../scripts/workers/catalog_incremental_supervisor_v1.mjs";

test("catalog promotion supervisor routes exact supported gap shapes", () => {
  const plan = buildCatalogIncrementalSupervisorPlanV1([
    { game_code: "mtg", status: "missing_set", source_code: "abc" },
    { game_code: "one_piece", status: "missing_set", source_code: "OP17", source_set_id: "569117" },
    { game_code: "pokemon", source_id: "pokemon_card_official_jp_products", status: "incomplete_cards", source_code: "M6", source_set_id: "955", database_code: "jpn-product-x", count_evidence: [{ authority: "tcgdex_japanese_structured_api", scope: "full_set" }] },
  ]);
  assert.deepEqual(plan.targets.map((row) => row.key), ["mtg:abc", "one_piece:OP17", "pokemon_jpn:M6"]);
  assert.equal(plan.unsupported.length, 0);
});

test("partial and source-ambiguous gaps stay outside unattended promotion", () => {
  const plan = buildCatalogIncrementalSupervisorPlanV1([
    { game_code: "mtg", status: "incomplete_cards", source_code: "abc" },
    { game_code: "one_piece", status: "ambiguous_source_identity", source_code: "OP17" },
    { game_code: "pokemon", status: "missing_set", source_code: "M7" },
  ]);
  assert.equal(plan.targets.length, 0);
  assert.equal(plan.unsupported.length, 3);
});

test("English Pokemon gaps never route to the Japanese writer", () => {
  const plan = buildCatalogIncrementalSupervisorPlanV1([{
    game_code: "pokemon",
    source_id: "tcgdex_english_set_registry",
    status: "incomplete_cards",
    source_code: "sv03",
    source_set_id: "sv03",
    database_code: "sv03",
  }]);
  assert.equal(plan.targets.length, 0);
  assert.equal(plan.unsupported.length, 1);
});

test("English Pokemon routes only with complete Master Index authority", () => {
  const admitted = buildCatalogIncrementalSupervisorPlanV1([{
    game_code: "pokemon",
    source_id: "tcgdex_english_set_registry",
    status: "incomplete_cards",
    source_code: "wp",
    database_code: "wp",
    expected_card_count: 7,
    count_evidence: [{
      authority: "english_master_index_completion_v1",
      scope: "full_set",
      count: 7,
    }],
  }]);
  assert.deepEqual(admitted.targets.map((row) => row.key), ["pokemon_en:wp"]);
  const partial = buildCatalogIncrementalSupervisorPlanV1([{
    game_code: "pokemon",
    source_id: "tcgdex_english_set_registry",
    status: "incomplete_cards",
    source_code: "mfb",
    database_code: "mfb",
    expected_card_count: 48,
    count_evidence: [{
      authority: "english_master_index_completion_v1",
      scope: "full_set",
      count: 34,
    }],
  }]);
  assert.equal(partial.targets.length, 0);
});

test("Japanese product gaps without the writer's TCGdex authority stay held", () => {
  const plan = buildCatalogIncrementalSupervisorPlanV1([{
    game_code: "pokemon",
    source_id: "pokemon_card_official_jp_products",
    status: "incomplete_cards",
    source_code: "MEM",
    source_set_id: "958",
    database_code: "jpn-product-x",
    count_evidence: [{ authority: "pokemon_card_official_jp_product", scope: "full_set" }],
  }]);
  assert.equal(plan.targets.length, 0);
  assert.equal(plan.unsupported.length, 1);
});

test("scheduled promotion workflow remains bounded and issue-visible", () => {
  const workflow = fs.readFileSync(
    new URL("../../.github/workflows/catalog-incremental-promotion.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /cron:\s*"47 \*\/6 \* \* \*"/);
  assert.match(workflow, /--max-targets=5/);
  assert.match(workflow, /--expected-head-sha="\$GITHUB_SHA"/);
  assert.match(workflow, /node --check scripts\/workers\/english_pokemon_incremental_promotion_v1\.mjs/);
  assert.match(workflow, /tests\/contracts\/english_pokemon_incremental_promotion_v1\.test\.mjs/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});
