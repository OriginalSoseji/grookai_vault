import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { acquirePokemonTcgIoEvidenceV1 } from "../../backend/pricing/market_evidence_pokemontcg_io_acquisition_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const sampleBatch = {
  items: [
    {
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-BS-4",
      name: "Charizard",
      set_code: "base1",
      number_plain: "4",
      source: "pokemontcg_io_reference",
      pokemonapi_id: "base1-4",
      match_basis: "card_prints.external_ids.pokemonapi",
    },
    {
      card_print_id: "22222222-2222-2222-2222-222222222222",
      gv_id: "GV-PK-BS-58",
      name: "Pikachu",
      set_code: "base1",
      number_plain: "58",
      source: "pricecharting_reference",
    },
  ],
};

const sampleCard = {
  id: "base1-4",
  name: "Charizard",
  number: "4",
  set: {
    id: "base1",
    name: "Base",
  },
  tcgplayer: {
    url: "https://prices.example.invalid/tcgplayer/base1-4",
    updatedAt: "2026/06/24",
    prices: {
      holofoil: {
        low: 100,
        mid: 200,
        high: 300,
        market: 225.5,
        directLow: 150,
      },
    },
  },
  cardmarket: {
    url: "https://prices.example.invalid/cardmarket/base1-4",
    updatedAt: "2026/06/23",
    prices: {
      averageSellPrice: 190.25,
      lowPrice: 120,
      trendPrice: 210,
      suggestedPrice: 0,
      avg7: 205.33,
      reverseHoloTrend: null,
    },
  },
};

test("MEE-06A extracts PokemonTCG.io reference buckets as review-gated evidence", () => {
  const result = acquirePokemonTcgIoEvidenceV1({
    batch: sampleBatch,
    cardsByExternalId: {
      "base1-4": sampleCard,
    },
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(result.mode, "free_api_reference_raw_evidence_only");
  assert.equal(result.boundary.db_writes, false);
  assert.equal(result.boundary.pricing_rollups, false);
  assert.equal(result.boundary.public_price_publication, false);
  assert.equal(result.boundary.raw_evidence_objects_created, true);
  assert.equal(result.summary.pokemontcg_io_targets, 1);
  assert.equal(result.summary.candidate_evidence_count, 9);
  assert.deepEqual(result.summary.status_counts, { candidate_evidence_created: 1 });

  const currencies = new Set(result.candidate_evidence.map((candidate) => candidate.currency));
  assert.deepEqual(currencies, new Set(["EUR", "USD"]));

  for (const candidate of result.candidate_evidence) {
    assert.equal(candidate.source, "pokemontcg_io_reference");
    assert.equal(candidate.source_type, "reference_price");
    assert.equal(candidate.can_publish_price_directly, false);
    assert.equal(candidate.needs_review, true);
    assert.equal(candidate.contract_version, "MARKET_EVIDENCE_OBJECT_CONTRACT_V1");
    assert.equal(candidate.match_confidence_hint, "high");
    assert.equal(candidate.raw_payload.lane, "pokemontcg_io_reference_v1");
    assert.equal(candidate.raw_payload.provider_card_id, "base1-4");
  }

  assert.ok(result.candidate_evidence.some((candidate) => candidate.condition_hint === "tcgplayer:market"));
  assert.ok(result.candidate_evidence.some((candidate) => candidate.condition_hint === "cardmarket:avg7"));
  assert.ok(result.candidate_evidence.every((candidate) => candidate.raw_price > 0));
});

test("MEE-06A records missing mappings and payloads without inventing prices", () => {
  const result = acquirePokemonTcgIoEvidenceV1({
    batch: {
      items: [
        {
          card_print_id: "33333333-3333-3333-3333-333333333333",
          gv_id: "GV-PK-MISSING-1",
          name: "Missingmon",
          set_code: "missing",
          source: "pokemontcg_io_reference",
        },
        {
          card_print_id: "44444444-4444-4444-4444-444444444444",
          gv_id: "GV-PK-MISSING-2",
          name: "Missingmon 2",
          set_code: "missing",
          source: "pokemontcg_io_reference",
          pokemonapi_id: "missing-2",
        },
      ],
    },
    cardsByExternalId: {},
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(result.summary.candidate_evidence_count, 0);
  assert.deepEqual(result.summary.status_counts, {
    missing_pokemonapi_external_id: 1,
    pokemonapi_payload_missing: 1,
  });
});

test("MEE-06A script keeps writes and public prices out of the free reference lane", () => {
  const moduleSource = source("backend/pricing/market_evidence_pokemontcg_io_acquisition_v1.mjs");
  const scriptSource = source("scripts/audits/market_evidence_engine_pokemontcg_io_reference_acquisition_v1.mjs");
  const pkg = source("package.json");

  assert.match(pkg, /"mee:pokemontcg-io"/);
  assert.match(scriptSource, /fetchPokemonCardById/);
  assert.match(scriptSource, /fetchPokemonCardByIdViaCurl/);
  assert.match(scriptSource, /--ssl-no-revoke/);
  assert.match(scriptSource, /fetch_method/);
  assert.match(scriptSource, /DB_LOOKUP_CHUNK_SIZE = 100/);
  assert.match(scriptSource, /read_only_db_mapping_lookup/);

  const combined = `${moduleSource}\n${scriptSource}`;
  assert.doesNotMatch(combined, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
