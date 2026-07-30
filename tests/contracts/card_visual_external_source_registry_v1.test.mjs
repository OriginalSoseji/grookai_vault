import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_EXTERNAL_SOURCE_REGISTRY_V1,
  assertCardVisualExternalSourceRegistrySafeV1,
  cardVisualExternalSourceUseDecisionV1,
  getCardVisualExternalSourceV1,
} from "../../backend/card_descriptions/card_visual_external_source_registry_v1.mjs";

const source = readFileSync(
  new URL(
    "../../backend/card_descriptions/card_visual_external_source_registry_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);
const contract = readFileSync(
  new URL(
    "../../docs/contracts/CARD_VISUAL_EXTERNAL_SOURCE_INCORPORATION_V1.md",
    import.meta.url,
  ),
  "utf8",
);

test("visual source registry freezes all researched source lanes", () => {
  assert.equal(assertCardVisualExternalSourceRegistrySafeV1(), true);
  assert.deepEqual(
    CARD_VISUAL_EXTERNAL_SOURCE_REGISTRY_V1.map(
      (entry) => entry.source_key,
    ).sort(),
    [
      "artchu",
      "artfinder_tcg",
      "binderbloom",
      "rotomamiti_cameo_database",
      "sightdex",
      "tcg_curator",
    ],
  );
});

test("only the operator-supplied RotomAmiti snapshot can currently import candidate rows", () => {
  assert.deepEqual(
    cardVisualExternalSourceUseDecisionV1(
      "rotomamiti_cameo_database",
      "candidate_snapshot_import",
    ),
    {
      allowed: true,
      reason: "registered_current_use",
      authority_ceiling: "candidate_only",
    },
  );
  for (const sourceKey of [
    "sightdex",
    "artchu",
    "tcg_curator",
    "binderbloom",
    "artfinder_tcg",
  ]) {
    assert.equal(
      cardVisualExternalSourceUseDecisionV1(
        sourceKey,
        "card_level_candidate_import",
      ).allowed,
      false,
      sourceKey,
    );
  }
});

test("source-specific taxonomies never bypass Grookai role resolution", () => {
  assert.equal(
    getCardVisualExternalSourceV1("sightdex")?.role_mapping.object,
    "curated_association_unresolved",
  );
  assert.equal(
    getCardVisualExternalSourceV1("tcg_curator")?.role_mapping
      .pokemon_name_tag,
    "curated_association_unresolved",
  );
  assert.equal(
    getCardVisualExternalSourceV1("binderbloom")?.candidate_domain,
    "artwork_relationship_candidate",
  );
  assert.match(contract, /source taxonomy is not Grookai ontology/iu);
});

test("registry is policy-only and contains no scraper, provider, database, or mutation path", () => {
  assert.doesNotMatch(
    source,
    /\bfetch\s*\(|openai|responses\.create|createClient|createServerAdminClient/iu,
  );
  assert.doesNotMatch(
    source,
    /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/iu,
  );
  assert.match(contract, /No site is scraped into active search/iu);
});

