import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";

import { buildEnglishPokemonIncrementalSetPlanV1 } from
  "../../backend/catalog/english_pokemon_incremental_promotion_v1.mjs";

const ROOT = new URL(
  "../../docs/audits/catalog_incremental_promotion/tk_sm_r_hidden_set_v1/",
  import.meta.url,
);

function read(name) {
  return JSON.parse(fs.readFileSync(new URL(name, ROOT), "utf8"));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

test("package binds the exact reviewed set and remains non-executing", () => {
  const manifest = read("package_manifest.json");
  const { package_fingerprint_sha256: fingerprint, ...core } = manifest;
  assert.equal(manifest.target, "pokemon_en:tk-sm-r");
  assert.equal(manifest.expected_full_set_count, 30);
  assert.equal(manifest.observed_existing_parent_count, 19);
  assert.equal(manifest.expected_insert_parent_count, 11);
  assert.deepEqual(manifest.expected_insert_coordinates.map((row) => row.number), [
    "1", "3", "5", "7", "8", "9", "10", "12", "24", "27", "28",
  ]);
  assert.equal(manifest.prior_review_only_decision.execution_enabled, false);
  assert.equal(manifest.prior_review_only_decision.authorizes_apply, false);
  assert.equal(sha256(stable(core)), fingerprint);
});

test("all 30 identities are independently supported and source-pinned", () => {
  const manifest = read("package_manifest.json");
  const cards = read("master/english_master_index_cards_v1.json");
  const sets = read("master/english_master_index_sets_v1.json");
  const source = read("tcgdex_repository_set_snapshot.json");
  assert.equal(cards.cards.length, 30);
  assert.equal(sets.sets.length, 1);
  assert.equal(source.cards.length, 30);
  assert.equal(source.source_commit_sha, "d88210d806d1b55d7832847beaed692c0bb7bfee");
  assert.ok(cards.cards.every((row) => row.set_key === "tk-sm-r"));
  assert.ok(cards.cards.every((row) => row.status === "master_verified"));
  assert.ok(cards.cards.every((row) => Number(row.source_count) >= 2));
  assert.ok(cards.cards.every((row) => row.sources.includes("bulbapedia_set_list")));
  assert.ok(cards.cards.every((row) => row.sources.includes("tcgdex_github_snapshot")));
  assert.ok(cards.cards.every((row) => row.source_evidence.length === row.sources.length));
  assert.ok(cards.cards.every((row) => row.source_evidence.every((source, index) =>
    source.source_key === row.sources[index]
    && source.source_authority === row.source_authorities[index]
    && source.source_kind === row.source_kinds[index]
    && source.source_url === row.evidence_urls[index])));
  const cardsBytes = fs.readFileSync(new URL("master/english_master_index_cards_v1.json", ROOT));
  const setsBytes = fs.readFileSync(new URL("master/english_master_index_sets_v1.json", ROOT));
  const sourceBytes = fs.readFileSync(new URL("tcgdex_repository_set_snapshot.json", ROOT));
  assert.equal(sha256(cardsBytes), manifest.authority.hashes.cards_sha256);
  assert.equal(sha256(setsBytes), manifest.authority.hashes.sets_sha256);
  assert.equal(sha256(sourceBytes), manifest.authority.hashes.source_set_sha256);
  assert.equal(
    sha256(stable({
      cards_sha256: manifest.authority.hashes.cards_sha256,
      sets_sha256: manifest.authority.hashes.sets_sha256,
    })),
    manifest.authority.hashes.master_package_sha256,
  );
});

test("the frozen authority produces exactly the expected 11-row parent delta", () => {
  const manifest = read("package_manifest.json");
  const cards = read("master/english_master_index_cards_v1.json").cards;
  const sourceSet = read("tcgdex_repository_set_snapshot.json");
  const missingNumbers = new Set(manifest.expected_insert_coordinates.map((row) => row.number));
  const existingCards = cards.filter((row) => !missingNumbers.has(row.card_number)).map((row) => ({
    number: row.card_number,
    number_plain: row.card_number,
    name: row.card_name,
  }));
  const plan = buildEnglishPokemonIncrementalSetPlanV1({
    set: {
      id: "63e87275-5795-4ed0-918b-fbf62e5457ce",
      code: "tk-sm-r",
      name: "SM Trainer Kit (Alolan Raichu)",
      printed_set_abbrev: "TK",
    },
    sourceSet,
    masterCards: cards,
    existingCards,
    speciesRows: [],
    tcgdexDetails: [],
  });
  assert.equal(existingCards.length, 19);
  assert.equal(plan.counts.card_prints, 11);
  assert.equal(plan.counts.identities, 11);
  assert.deepEqual(
    plan.payload.rows.map((row) => row.number).sort((left, right) => Number(left) - Number(right)),
    manifest.expected_insert_coordinates.map((row) => row.number)
      .sort((left, right) => Number(left) - Number(right)),
  );
  assert.ok(plan.payload.rows.every((row) => row.card_print.image_url === null));
  assert.ok(plan.payload.rows.every((row) =>
    row.identity.identity_payload.card_domain === "energy"));
});

test("workflow is manual, rollback-only, and exact-set bound", () => {
  const workflow = fs.readFileSync(
    new URL("../../.github/workflows/tk-sm-r-hidden-set-executor.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /--mode=dry-run/);
  assert.doesNotMatch(workflow, /--mode=apply/);
  assert.match(workflow, /--source-set-code=tk-sm-r/);
  assert.match(workflow, /--database-set-code=tk-sm-r/);
  assert.match(workflow, /rollback_absence_readback/);
  assert.match(workflow, /Object\.values\(report\.rollback_absence_readback\)/);
  assert.match(workflow, /manifest\.expected_insert_coordinates/);
  assert.match(workflow, /coordinate drift/);
});

test("package boundaries prohibit adjacent product writes", () => {
  const boundaries = read("package_manifest.json").boundaries;
  for (const key of [
    "child_printing_writes",
    "external_mapping_writes",
    "storage_writes",
    "image_pointer_writes",
    "pricing_writes",
    "publication_writes",
    "vault_writes",
    "updates",
    "deletes",
  ]) assert.equal(boundaries[key], false, key);
});
