import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  classifyTcgplayerMarketCoverageRowV1,
  summarizeTcgplayerMarketCoverageV1,
  TCGPLAYER_MARKET_COVERAGE_POLICY_V1_1,
  tcgplayerMarketCoverageEraV1,
} from "../../backend/pricing/tcgplayer_market_coverage_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const AUDIT = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_market_coverage_v1.mjs",
  ),
  "utf8",
);

function coverageRow(overrides = {}) {
  return {
    id: "decision-1",
    source_observation_id: "observation-1",
    source_product_id: 1001,
    source_product_name: "Pikachu",
    source_product_active: true,
    source_product_catalog_status: "current",
    source_group_id: 100,
    source_group_name: "Base Set",
    source_group_published_on: "1999-01-09",
    source_subtype_name: "Holofoil",
    currency: "USD",
    market_price: 35,
    decision: "publish",
    language_result: "english",
    source_integrity_result: "verified",
    reason_codes: [],
    card_print_id: "GV-PK-BS-058",
    card_printing_id: "printing-1",
    variant_assignment_status: "exact_child_finish",
    evidence: {
      category_id: 3,
      has_printed_number_evidence: true,
      source_mapping_count: 1,
      card_print_mapping_count: 1,
      card_printing_mapping_count: 1,
      normalized_finish_key: "holo",
    },
    ...overrides,
  };
}

test("ordinary exact publish row belongs to denominator and numerator", () => {
  const result = classifyTcgplayerMarketCoverageRowV1(coverageRow());

  assert.equal(result.policy_version, TCGPLAYER_MARKET_COVERAGE_POLICY_V1_1);
  assert.equal(result.in_denominator, true);
  assert.equal(result.in_numerator, true);
  assert.equal(result.denominator_exclusion_reason, null);
  assert.equal(result.primary_gap_reason, null);
  assert.equal(result.mapped, true);
  assert.equal(result.exact_printing, true);
  assert.deepEqual(result.dimensions, {
    set: "Base Set",
    era: "vintage",
    finish: "holo",
    value_band: "high",
  });
});

test("coverage era accepts source timestamps as well as dates", () => {
  assert.equal(tcgplayerMarketCoverageEraV1("1999-01-09"), "vintage");
  assert.equal(
    tcgplayerMarketCoverageEraV1("2010-05-12 00:00:00+00"),
    "middle",
  );
  assert.equal(
    tcgplayerMarketCoverageEraV1("2026-07-18T00:00:00.000Z"),
    "modern",
  );
  assert.equal(tcgplayerMarketCoverageEraV1(null), "unknown");
});

test("freshness-delayed exact row remains covered", () => {
  const result = classifyTcgplayerMarketCoverageRowV1(
    coverageRow({ decision: "delay" }),
  );

  assert.equal(result.in_denominator, true);
  assert.equal(result.in_numerator, true);
});

test("missing mapping remains in denominator as a deterministic gap", () => {
  const result = classifyTcgplayerMarketCoverageRowV1(
    coverageRow({
      decision: "quarantine",
      reason_codes: ["missing_exact_card_mapping"],
      card_print_id: null,
      card_printing_id: null,
      variant_assignment_status: null,
      evidence: {
        category_id: 3,
        source_mapping_count: 0,
        card_print_mapping_count: 0,
        card_printing_mapping_count: 0,
        normalized_finish_key: "holo",
      },
    }),
  );

  assert.equal(result.in_denominator, true);
  assert.equal(result.in_numerator, false);
  assert.equal(result.primary_gap_reason, "missing_exact_card_mapping");
  assert.equal(result.mapped, false);
});

test("V1.1 special groups are excluded with a governed reason", () => {
  const result = classifyTcgplayerMarketCoverageRowV1(
    coverageRow({
      source_group_name: "World Championship Decks",
    }),
  );

  assert.equal(result.in_denominator, false);
  assert.equal(result.denominator_exclusion_reason, "special_variant_v1_1");
  assert.equal(result.product_scope.rule_id, "world_championship_deck");
});

test("V1.1 excludes unnumbered sealed products without excluding card names", () => {
  for (const sourceProductName of [
    "Journey Together Booster Bundle",
    "151 Binder Collection",
    "151 Poster Collection",
    "Paldea Friends Tech Sticker Collection",
    "Surging Sparks Sleeved Booster Pack",
    "Build & Battle Box",
    "Booster Display Case",
  ]) {
    const result = classifyTcgplayerMarketCoverageRowV1(
      coverageRow({
        source_product_name: sourceProductName,
        evidence: {
          category_id: 3,
          has_printed_number_evidence: false,
          normalized_finish_key: "holo",
        },
      }),
    );
    assert.equal(result.in_denominator, false, sourceProductName);
    assert.equal(
      result.denominator_exclusion_reason,
      "unsupported_product_kind",
      sourceProductName,
    );
  }

  const numberedCard = classifyTcgplayerMarketCoverageRowV1(
    coverageRow({
      source_product_name: "Box of Disaster",
      evidence: {
        category_id: 3,
        has_printed_number_evidence: true,
        source_mapping_count: 1,
        card_print_mapping_count: 1,
        card_printing_mapping_count: 1,
        normalized_finish_key: "holo",
      },
    }),
  );
  assert.equal(numberedCard.in_denominator, true);
});

test("V1.1 routes explicit special print treatments out of V1 scope", () => {
  for (const sourceProductName of [
    "Exeggcute (Poke Ball Pattern)",
    "Exeggutor (Master Ball Pattern)",
    "Erika's Oddish (Energy Symbol Pattern)",
    "Kyogre - SM129 (Prerelease) [Staff]",
    "Luxio - BW34 (Cracked Ice Holo)",
    "Pikachu (Pokemon Center)",
    "Victory Cup (Winner)",
    "Celebi - 029 (EX Collector's Carry Tin)",
  ]) {
    const result = classifyTcgplayerMarketCoverageRowV1(
      coverageRow({ source_product_name: sourceProductName }),
    );
    assert.equal(result.in_denominator, false, sourceProductName);
    assert.equal(
      result.denominator_exclusion_reason,
      "special_variant_v1_1",
      sourceProductName,
    );
  }
});

test("V1.1 keeps ordinary identity descriptors and finishes in scope", () => {
  for (const sourceProductName of [
    "Pikachu (Full Art)",
    "Mew (Shiny)",
    "Charizard (Delta Species)",
    "Gengar (Holo)",
    "Suspicious Food Tin",
  ]) {
    const result = classifyTcgplayerMarketCoverageRowV1(
      coverageRow({ source_product_name: sourceProductName }),
    );
    assert.equal(result.in_denominator, true, sourceProductName);
  }
});

test("V1.1 removes special variants from denominator and numerator", () => {
  const result = summarizeTcgplayerMarketCoverageV1([
    coverageRow({ id: "ordinary" }),
    coverageRow({
      id: "special-publish",
      source_product_name: "Pikachu (Poke Ball Pattern)",
    }),
    coverageRow({
      id: "special-gap",
      source_product_name: "Pikachu (Master Ball Pattern)",
      decision: "quarantine",
      reason_codes: ["missing_active_source_mapping"],
      card_print_id: null,
      card_printing_id: null,
      variant_assignment_status: null,
      evidence: {
        category_id: 3,
        has_printed_number_evidence: true,
        source_mapping_count: 0,
        card_print_mapping_count: 0,
        card_printing_mapping_count: 0,
        normalized_finish_key: "holo",
      },
    }),
  ]);

  assert.equal(result.counts.denominator_rows, 1);
  assert.equal(result.counts.numerator_rows, 1);
  assert.equal(result.counts.excluded_rows, 2);
  assert.equal(result.coverage_percent, 100);
});

test("unsupported subtype is excluded", () => {
  const result = classifyTcgplayerMarketCoverageRowV1(
    coverageRow({
      source_subtype_name: "1st Edition Holofoil",
      evidence: {
        category_id: 3,
        source_mapping_count: 1,
        card_print_mapping_count: 1,
        card_printing_mapping_count: 1,
      },
    }),
  );

  assert.equal(result.in_denominator, false);
  assert.equal(result.denominator_exclusion_reason, "unsupported_source_subtype");
});

test("nonpositive market price is excluded", () => {
  const result = classifyTcgplayerMarketCoverageRowV1(
    coverageRow({ market_price: 0 }),
  );

  assert.equal(result.in_denominator, false);
  assert.equal(
    result.denominator_exclusion_reason,
    "missing_positive_market_price",
  );
});

test("known non-English source is excluded", () => {
  const result = classifyTcgplayerMarketCoverageRowV1(
    coverageRow({ language_result: "non_english" }),
  );

  assert.equal(result.in_denominator, false);
  assert.equal(result.denominator_exclusion_reason, "non_english_source");
});

test("summary passes at 95 percent with dimensions reconciled", () => {
  const rows = Array.from({ length: 20 }, (_, index) =>
    coverageRow({
      id: `decision-${index}`,
      source_observation_id: `observation-${index}`,
      source_product_id: 1000 + index,
      decision: index === 19 ? "quarantine" : "publish",
      reason_codes:
        index === 19 ? ["missing_exact_printing_finish_mapping"] : [],
      card_printing_id: index === 19 ? null : `printing-${index}`,
      variant_assignment_status:
        index === 19 ? null : "exact_child_finish",
      evidence: {
        category_id: 3,
        source_mapping_count: 1,
        card_print_mapping_count: 1,
        card_printing_mapping_count: index === 19 ? 0 : 1,
        normalized_finish_key: "holo",
      },
    }),
  );

  const result = summarizeTcgplayerMarketCoverageV1(rows);

  assert.equal(result.status, "passed");
  assert.equal(result.coverage_percent, 95);
  assert.equal(result.counts.denominator_rows, 20);
  assert.equal(result.counts.numerator_rows, 19);
  assert.equal(result.counts.gap_rows, 1);
  assert.equal(result.rows_needed_for_threshold, 0);
  assert.equal(result.counts.unclassified_gap_rows, 0);
  assert.equal(result.by_set["Base Set"].denominator, 20);
  assert.equal(result.by_finish.holo.numerator, 19);
  assert.equal(result.by_era.vintage.coverage_percent, 95);
  assert.equal(result.by_value_band.high.gap_reasons.missing_exact_printing_finish_mapping, 1);
  assert.deepEqual(result.findings, []);
});

test("summary fails below threshold and reports exact rows needed", () => {
  const rows = Array.from({ length: 10 }, (_, index) =>
    coverageRow({
      id: `decision-${index}`,
      source_observation_id: `observation-${index}`,
      source_product_id: 2000 + index,
      decision: index === 9 ? "quarantine" : "publish",
      reason_codes: index === 9 ? ["missing_exact_card_mapping"] : [],
      card_print_id: index === 9 ? null : `GV-PK-TEST-${index}`,
      card_printing_id: index === 9 ? null : `printing-${index}`,
      variant_assignment_status:
        index === 9 ? null : "exact_child_finish",
      evidence: {
        category_id: 3,
        source_mapping_count: index === 9 ? 0 : 1,
        card_print_mapping_count: index === 9 ? 0 : 1,
        card_printing_mapping_count: index === 9 ? 0 : 1,
        normalized_finish_key: "holo",
      },
    }),
  );

  const result = summarizeTcgplayerMarketCoverageV1(rows);

  assert.equal(result.status, "failed");
  assert.equal(result.coverage_percent, 90);
  assert.equal(result.rows_needed_for_threshold, 1);
  assert.deepEqual(result.findings, ["coverage_below_required_threshold"]);
});

test("unclassified denominator gaps fail deterministically", () => {
  const result = summarizeTcgplayerMarketCoverageV1([
    coverageRow({
      decision: "quarantine",
      reason_codes: [],
      card_print_id: null,
      card_printing_id: null,
      variant_assignment_status: null,
      evidence: {
        category_id: 3,
        source_mapping_count: 0,
        card_print_mapping_count: 0,
        card_printing_mapping_count: 0,
        normalized_finish_key: "holo",
      },
    }),
  ]);

  assert.equal(result.counts.unclassified_gap_rows, 1);
  assert.deepEqual(result.findings, [
    "coverage_gap_without_deterministic_reason",
    "coverage_below_required_threshold",
  ]);
});

test("coverage audit is read-only and produces governed artifacts", () => {
  assert.match(AUDIT, /database_reads_only:\s*true/);
  assert.match(AUDIT, /database_writes:\s*false/);
  assert.match(AUDIT, /coverage_gaps\.jsonl/);
  assert.match(AUDIT, /scope_exclusions\.jsonl/);
  assert.match(AUDIT, /current_publication_scope\.json/);
  assert.match(
    AUDIT,
    /current_publication_contains_v1_1_scope_exclusion/,
  );
  assert.match(AUDIT, /artifact_hashes\.json/);
  assert.doesNotMatch(AUDIT, /\b(insert|update|delete)\s+(?:into|from|public\.)/i);
});
