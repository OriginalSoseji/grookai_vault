import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildEnglishPokemonMasterIndexRefreshPlanV1,
  preserveExistingFactOrderV1,
  preserveHistoricalSetAliasesV1,
  reconcileMasterIndexMarkdownV1,
} from "../../scripts/workers/english_pokemon_master_index_refresh_v1.mjs";

function card(setKey, number, name, overrides = {}) {
  return {
    set_key: setKey,
    card_number: number,
    card_name: name,
    status: "master_verified",
    source_count: 2,
    ...overrides,
  };
}

function printing(setKey, number, name, finish, sources = ["tcgdex", "thepricedex_price_list"]) {
  return {
    ...card(setKey, number, name),
    finish_key: finish,
    sources,
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

test("fact fingerprints ignore source completion order", () => {
  const first = card("a", "1", "Pikachu");
  const second = card("b", "2", "Raichu");
  const firstPrinting = printing("a", "1", "Pikachu", "holo");
  const secondPrinting = printing("b", "2", "Raichu", "normal");
  const plan = buildEnglishPokemonMasterIndexRefreshPlanV1({
    baselineSets: [{ key: "b" }, { key: "a" }],
    baselineCards: [second, first],
    baselinePrintings: [secondPrinting, firstPrinting],
    candidateSets: [{ key: "a" }, { key: "b" }],
    candidateCards: [first, second],
    candidatePrintings: [firstPrinting, secondPrinting],
  });

  assert.equal(plan.changed, false);
  assert.equal(
    plan.baseline_fact_fingerprint_sha256,
    plan.candidate_fact_fingerprint_sha256,
  );
});

test("data apply preserves retained authority order and appends additions deterministically", () => {
  const rows = preserveExistingFactOrderV1({
    baselineRows: [{ key: "b", value: "old" }, { key: "a", value: "old" }],
    candidateRows: [
      { key: "d", value: "new" },
      { key: "a", value: "updated" },
      { key: "c", value: "new" },
      { key: "b", value: "updated" },
    ],
  });

  assert.deepEqual(rows.map((row) => row.key), ["b", "a", "c", "d"]);
  assert.deepEqual(rows.map((row) => row.value), ["updated", "updated", "new", "new"]);
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

test("set display-name normalization does not remove stable card identities", () => {
  const plan = buildEnglishPokemonMasterIndexRefreshPlanV1({
    baselineSets: [{ key: "base1", set_name: "Base" }],
    baselineCards: [card("base1", "1", "Alakazam", { set_name: "Base" })],
    candidateSets: [{ key: "base1", set_name: "Base Set" }],
    candidateCards: [card("base1", "1", "Alakazam", { set_name: "Base Set" })],
  });

  assert.equal(plan.counts.added_cards, 0);
  assert.equal(plan.counts.unexplained_removed_cards, 0);
});

test("printing continuity preserves unobserved authority for revalidation", () => {
  const plan = buildEnglishPokemonMasterIndexRefreshPlanV1({
    baselineSets: [{ key: "xyp" }],
    baselineCards: [card("xyp", "XY67a", "Jirachi")],
    baselinePrintings: [printing("xyp", "XY67a", "Jirachi", "holo")],
    candidateSets: [{ key: "xyp" }],
    candidateCards: [card("xyp", "XY67a", "Jirachi")],
  });

  assert.equal(plan.counts.source_candidate_printings, 0);
  assert.equal(plan.counts.candidate_printings, 1);
  assert.equal(plan.counts.preserved_unobserved_printings, 1);
  assert.equal(plan.counts.unexplained_removed_printings, 0);
  assert.equal(
    plan.preserved_unobserved_printings[0].reason,
    "historical_master_index_authority_pending_source_revalidation",
  );
});

test("alias continuity preserves established mappings and rejects owner changes", () => {
  const result = preserveHistoricalSetAliasesV1({
    baselineAliasReport: {
      remaps: [{ from_set_key: "old", to_set_key: "owner" }],
    },
    candidateAliasReport: {
      remaps: [{ from_set_key: "new", to_set_key: "owner" }],
    },
  });

  assert.deepEqual(
    result.report.remaps.map((row) => row.from_set_key),
    ["new", "old"],
  );
  assert.equal(result.preserved.length, 1);
  assert.throws(() => preserveHistoricalSetAliasesV1({
    baselineAliasReport: {
      remaps: [{ from_set_key: "old", to_set_key: "owner" }],
    },
    candidateAliasReport: {
      remaps: [{ from_set_key: "old", to_set_key: "different-owner" }],
    },
  }), /changes historical alias/);
});

test("effective printing continuity is reflected in the Markdown summary", () => {
  const markdown = [
    "| manual review | 3 |",
    "",
    "## Printings By Status",
    "",
    "| status | count |",
    "| --- | --- |",
    "| master_verified | 9 |",
    "",
    "## Source Evidence Rows",
  ].join("\n");
  const result = reconcileMasterIndexMarkdownV1({
    markdown,
    printingStatusCounts: { candidate_unconfirmed: 2, master_verified: 10 },
    manualReviewCount: 4,
  });
  assert.match(result, /\| manual review \| 4 \|/);
  assert.match(result, /\| candidate_unconfirmed \| 2 \|/);
  assert.match(result, /\| master_verified \| 10 \|/);
  assert.doesNotMatch(result, /master_verified \| 9/);
});

test("only contracted legacy Normal assertions and explicit supersessions may disappear", () => {
  const plan = buildEnglishPokemonMasterIndexRefreshPlanV1({
    baselineSets: [{ key: "base5" }, { key: "mep" }, { key: "svp" }],
    baselineCards: [
      card("base5", "83", "Dark Raichu"),
      card("mep", "018", "Cottonee"),
      card("svp", "224", "Paradise Resort"),
    ],
    baselinePrintings: [
      printing("base5", "83", "Dark Raichu", "normal", [
        "cardtrader_blueprint_index",
        "tcgdex",
      ]),
      printing("mep", "018", "Cottonee", "holo"),
      printing("svp", "224", "Paradise Resort", "normal", [
        "pkmncards_card_page",
        "tcgdex",
      ]),
    ],
    candidateSets: [{ key: "base5" }, { key: "mep" }, { key: "svp" }],
    candidateCards: [
      card("base5", "83", "Dark Raichu"),
      card("mep", "18", "Cottonee"),
      card("svp", "224", "Paradise Resort"),
    ],
    candidatePrintings: [
      printing("mep", "18", "Cottonee", "cosmos"),
      printing("svp", "224", "Paradise Resort", "stamped"),
    ],
  });

  assert.equal(plan.counts.revoked_legacy_printings, 1);
  assert.equal(plan.counts.superseded_printings, 2);
  assert.equal(plan.counts.unexplained_removed_printings, 0);
});

test("configured supersession without its replacement preserves prior authority", () => {
  const plan = buildEnglishPokemonMasterIndexRefreshPlanV1({
    baselineSets: [{ key: "mep" }],
    baselineCards: [card("mep", "018", "Cottonee")],
    baselinePrintings: [printing("mep", "018", "Cottonee", "holo")],
    candidateSets: [{ key: "mep" }],
    candidateCards: [card("mep", "18", "Cottonee")],
  });

  assert.equal(plan.counts.superseded_printings, 0);
  assert.equal(plan.counts.preserved_unobserved_printings, 1);
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
  assert.match(workflow, /english_master_index_cardtrader_normal_containment_v1\.mjs/);
  assert.match(workflow, /gh pr create/);
  assert.match(workflow, /source_discovery_unavailable/);
  assert.match(workflow, /preserved_prior_master_index/);
  assert.match(workflow, /SOURCE_UNAVAILABLE/);
  assert.match(workflow, /preserved_prior_english_master_index/);
  assert.match(workflow, /cp -a "\$BASELINE_DIR\/\." "\$CANDIDATE_DIR\/"/);
  assert.match(workflow, /English source inventory/);
  assert.match(workflow, /failed an integrity gate/);
  assert.match(workflow, /if RESPONSE="\$\(gh api/);
  assert.match(workflow, /pokemon-language-candidate-dir/);
  assert.match(workflow, /CHECKED_OUT_SHA="\$\(git rev-parse HEAD\)"/);
  assert.doesNotMatch(workflow, /"\$GITHUB_SHA" "\$\{GITHUB_REF_NAME\}"/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_URL|DATABASE_URL/);
});

test("printing authority remains line-reviewable across scheduled refreshes", () => {
  const builder = fs.readFileSync(
    new URL("../../scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs", import.meta.url),
    "utf8",
  );
  const printingWrite = builder.match(
    /writeJson\(outputDir, 'english_master_index_printings_v1\.json',[\s\S]*?\n\s*\}\);/,
  );

  assert.ok(printingWrite, "printing authority write must remain explicit");
  assert.doesNotMatch(printingWrite[0], /compact:\s*true/);
});

test("English Master Index publishes folded subset ownership for discovery", () => {
  const builder = fs.readFileSync(
    new URL("../../scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs", import.meta.url),
    "utf8",
  );
  assert.match(builder, /folded_subset_owners/);
  assert.match(builder, /english_master_index_folded_subset_owner_v1/);
  assert.match(builder, /source_set_key/);
  assert.match(builder, /canonical_set_key/);
});

test("English Master Index classifies a missing TCGdex set inventory as source debt", () => {
  const builder = fs.readFileSync(
    new URL("../../scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs", import.meta.url),
    "utf8",
  );
  assert.match(builder, /\[SOURCE_UNAVAILABLE\] TCGdex set inventory unavailable/);
  assert.match(builder, /fetchTcgdexSets\(options\)[\s\S]*?\.catch/);
});

test("English Master Index preserves its baseline when TCGdex returns an empty inventory", () => {
  const builder = fs.readFileSync(
    new URL("../../scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs", import.meta.url),
    "utf8",
  );
  assert.match(builder, /options\.sources\.includes\('tcgdex'\) && rows\.length === 0/);
  assert.match(builder, /TCGdex returned no physical English set rows/);
});

test("English Master Index fills partial live inventories from its audited source snapshot", () => {
  const builder = fs.readFileSync(
    new URL("../../scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs", import.meta.url),
    "utf8",
  );
  assert.match(
    builder,
    /appendMissing:\s*Boolean\(pokemonTcgSnapshot\?\.set_configs\?\.length\)/,
  );
  assert.match(builder, /independent checklist adapters can still collect current evidence/);
});

test("English Master Index can bypass an unhealthy live PokemonTCG inventory while retaining its snapshot", () => {
  const builder = fs.readFileSync(
    new URL("../../scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs", import.meta.url),
    "utf8",
  );
  assert.match(builder, /arg === '--skip-live-pokemontcg'/);
  assert.match(builder, /if \(options\.skipLivePokemonTcg\) return \[\]/);
  assert.match(builder, /loadPokemonTcgSourceSnapshot\(options\)/);
});

test("English Master Index reapplies set filters after snapshot configuration merge", () => {
  const builder = fs.readFileSync(
    new URL("../../scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs", import.meta.url),
    "utf8",
  );
  assert.match(
    builder,
    /const setConfigs = filterAndLimitSetConfigs\([\s\S]*?mergePokemonTcgSnapshotSetConfigs\(/,
  );
  assert.match(builder, /function filterAndLimitSetConfigs\(configs, options\)/);
});

test("English Master Index scopes combined Trainer Kit pages to the requested half deck", () => {
  const builder = fs.readFileSync(
    new URL("../../scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs", import.meta.url),
    "utf8",
  );
  assert.match(builder, /'tk-hs-g': 'HS_Trainer_Kit_\(TCG\)'/);
  assert.match(builder, /'tk-hs-r': 'HS_Trainer_Kit_\(TCG\)'/);
  assert.match(builder, /'tk-sm-r': 'Sun_&_Moon_Trainer_Kit:_Lycanroc_&_Alolan_Raichu_\(TCG\)'/);
  assert.match(builder, /const normalizedKey = String\(key \?\? ''\)\.trim\(\)\.toLowerCase\(\)/);
  assert.match(builder, /function parseBulbapediaDeckListPage\(html, expectedSetName\)/);
  assert.match(builder, /normalizeSetLookup\(`\$\{subjectMatch\[1\]\} Half Deck`\)/);
  assert.match(builder, /\? '#Deck_lists' : '#Set_lists'/);
  assert.match(builder, /const derivedBulbapediaTitle = bulbapediaTitleForSet\(snapshotSet\.key, snapshotSet\.set_name\)/);
  assert.match(builder, /merged\.push\(normalizedSnapshotSet\)/);
});

test("English Master Index can pair commit-pinned TCGdex identities with human checklist evidence", () => {
  const builder = fs.readFileSync(
    new URL("../../scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs", import.meta.url),
    "utf8",
  );
  assert.match(builder, /loadTcgdexGithubLanguageSnapshotsV1/);
  assert.match(builder, /source_key: 'tcgdex_github_snapshot'/);
  assert.match(builder, /source_kind: 'structured_api'/);
  assert.match(builder, /TCGdex repository card-count mismatch/);
  assert.match(builder, /source_url: encodeURI\(sourceUrl\)/);
  assert.match(builder, /This source does not emit finish truth or create printings/);
});
