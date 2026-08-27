import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildEnglishPokemonMasterIndexRefreshPlanV1,
} from "../../scripts/workers/english_pokemon_master_index_refresh_v1.mjs";

function card(setKey, number, name) {
  return {
    set_key: setKey,
    card_number: number,
    card_name: name,
    status: "master_verified",
    source_count: 2,
  };
}

test("Master Index refresh admits additions without database authority", () => {
  const plan = buildEnglishPokemonMasterIndexRefreshPlanV1({
    baselineSets: [{ key: "a" }],
    baselineCards: [card("a", "1", "Pikachu")],
    candidateSets: [{ key: "a" }, { key: "b" }],
    candidateCards: [card("a", "1", "Pikachu"), card("b", "1", "Raichu")],
  });
  assert.equal(plan.changed, true);
  assert.equal(plan.counts.added_cards, 1);
  assert.equal(plan.boundaries.database_writes, false);
});

test("Shiny Vault can fold into Hidden Fates without looking like data loss", () => {
  const plan = buildEnglishPokemonMasterIndexRefreshPlanV1({
    baselineSets: [{ key: "sma" }, { key: "sm115" }],
    baselineCards: [card("sma", "SV1", "Scyther")],
    candidateSets: [{ key: "sm115" }],
    candidateCards: [card("sm115", "SV1", "Scyther")],
  });
  assert.equal(plan.counts.folded_alias_cards, 1);
  assert.equal(plan.counts.unexplained_removed_cards, 0);
});

test("equivalent aliases, number padding, punctuation, and source glyphs are not removals", () => {
  const plan = buildEnglishPokemonMasterIndexRefreshPlanV1({
    baselineSets: [{ key: "swsh45sv", set_name: "Shining Fates Shiny Vault" }],
    baselineCards: [
      { ...card("swsh45sv", "001", "Example-GX"), set_name: "Shining Fates Shiny Vault" },
      { ...card("pl4", "026", "Porygon-Z"), set_name: "Arceus" },
    ],
    candidateSets: [{ key: "swsh4.5sv", set_name: "Shining Fates Shiny Vault" }],
    candidateCards: [
      { ...card("swsh4.5sv", "1", "Example GX"), set_name: "Shining Fates Shiny Vault" },
      { ...card("pl4", "26", "Porygon-Z "), set_name: "Arceus" },
    ],
  });

  assert.equal(plan.counts.unexplained_removed_cards, 0);
  assert.equal(plan.counts.added_cards, 0);
  assert.equal(plan.counts.folded_alias_cards, 0);
});

test("unexplained removals, duplicate coordinates, and conflicts fail closed", () => {
  assert.throws(() => buildEnglishPokemonMasterIndexRefreshPlanV1({
    baselineSets: [{ key: "a" }],
    baselineCards: [card("a", "1", "Pikachu")],
    candidateSets: [{ key: "a" }],
    candidateCards: [card("a", "2", "Raichu")],
  }), /unexplained card facts/);
  assert.throws(() => buildEnglishPokemonMasterIndexRefreshPlanV1({
    candidateSets: [{ key: "a" }],
    candidateCards: [card("a", "1", "Pikachu"), card("a", "1", "Pikachu")],
  }), /repeats a card coordinate/);
  assert.throws(() => buildEnglishPokemonMasterIndexRefreshPlanV1({
    candidateSets: [{ key: "a" }],
    candidateCards: [card("a", "1", "Pikachu")],
    candidateConflicts: [{ key: "conflict" }],
  }), /has 1 conflicts/);
});

test("scheduled refresh is data-only and opens a governed pull request", () => {
  const workflow = fs.readFileSync(
    new URL("../../.github/workflows/pokemon-master-index-refresh.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /cron:\s*"37 3 \* \* \*"/);
  assert.match(workflow, /--skip-db-audit/);
  assert.match(workflow, /--mode=apply-to-worktree/);
  assert.match(workflow, /gh pr create/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_URL|DATABASE_URL/);
});
