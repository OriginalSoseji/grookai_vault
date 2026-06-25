import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  acquirePriceChartingCsvEvidenceV1,
  parsePriceChartingCsvRowsV1,
} from "../../backend/pricing/market_evidence_pricecharting_csv_acquisition_v1.mjs";

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
      source: "pricecharting_reference",
    },
    {
      card_print_id: "22222222-2222-2222-2222-222222222222",
      gv_id: "GV-PK-BS-58",
      name: "Pikachu",
      set_code: "base1",
      number_plain: "58",
      source: "manual_review_candidate",
    },
  ],
};

const sampleCsv = [
  "id,console-name,product-name,loose-price,cib-price,new-price,graded-price,box-only-price,manual-only-price,bgs-10-price,condition-17-price,condition-18-price,gamestop-price,gamestop-trade-price,retail-loose-buy,retail-loose-sell,retail-cib-buy,retail-cib-sell,retail-new-buy,retail-new-sell,upc,sales-volume,genre,tcg-id,asin,epid,release-date",
  "123,Pokemon Base Set,Charizard #4,$199.99,,,$999.99,,,,,,,,,,,,,,,42,Pokemon Card,,,,1999-01-09",
  "456,Pokemon Base Set,Charizard [1st Edition] #4,$9999.99,,,$19999.99,,,,,,,,,,,,,,,7,Pokemon Card,,,,1999-01-09",
  "789,Pokemon Jungle,Pikachu #60,$9.99,,,,,,,,,,,,,,,,,10,Pokemon Card,,,,1999-06-16",
].join("\n");

test("MEE-04D parses PriceCharting CSV rows and emits local review-gated evidence", () => {
  const csvRows = parsePriceChartingCsvRowsV1(sampleCsv);
  const result = acquirePriceChartingCsvEvidenceV1({
    batch: sampleBatch,
    csvRows,
    setCatalog: {
      base1: { code: "base1", name: "Base Set" },
    },
    generatedAt: "2026-06-25T02:00:00.000Z",
    maxCandidatesPerTarget: 2,
  });

  assert.equal(result.mode, "local_csv_raw_evidence_only");
  assert.equal(result.boundary.provider_calls, false);
  assert.equal(result.boundary.source_fetches, false);
  assert.equal(result.boundary.db_writes, false);
  assert.equal(result.boundary.pricing_rollups, false);
  assert.equal(result.boundary.public_price_publication, false);
  assert.equal(result.boundary.raw_evidence_objects_created, true);
  assert.equal(result.boundary.raw_evidence_objects_persisted_to_db, false);
  assert.equal(result.summary.pricecharting_targets, 1);
  assert.equal(result.summary.candidate_evidence_count, 4);

  for (const candidate of result.candidate_evidence) {
    assert.equal(candidate.source, "pricecharting_reference");
    assert.equal(candidate.source_type, "reference_price");
    assert.equal(candidate.can_publish_price_directly, false);
    assert.equal(candidate.needs_review, true);
    assert.equal(candidate.contract_version, "MARKET_EVIDENCE_OBJECT_CONTRACT_V1");
    assert.match(candidate.source_url, /^https:\/\/www\.pricecharting\.com\/game\//);
    assert.equal(candidate.currency, "USD");
  }

  const firstEditionCandidate = result.candidate_evidence.find((candidate) => candidate.raw_title.includes("[1st Edition]"));
  assert.ok(firstEditionCandidate);
  assert.equal(firstEditionCandidate.match_confidence_hint, "medium");
  assert.ok(firstEditionCandidate.exclusion_flags.includes("ambiguous_variant"));
  assert.ok(firstEditionCandidate.exclusion_flags.includes("wrong_print_run"));
});

test("MEE-04D keeps unmatched targets as reviewed misses", () => {
  const csvRows = parsePriceChartingCsvRowsV1(sampleCsv);
  const result = acquirePriceChartingCsvEvidenceV1({
    batch: {
      items: [{
        card_print_id: "33333333-3333-3333-3333-333333333333",
        gv_id: "GV-PK-XYZ-1",
        name: "Missingmon",
        set_code: "xyz",
        number_plain: "1",
        source: "pricecharting_reference",
      }],
    },
    csvRows,
    generatedAt: "2026-06-25T02:00:00.000Z",
  });

  assert.equal(result.summary.candidate_evidence_count, 0);
  assert.deepEqual(result.summary.status_counts, { no_pricecharting_csv_match: 1 });
});

test("MEE-04D matches governed promo source-number prefixes without broad numeric overmatch", () => {
  const csvRows = parsePriceChartingCsvRowsV1([
    "id,console-name,product-name,loose-price,cib-price,new-price,graded-price,box-only-price,manual-only-price,bgs-10-price,condition-17-price,condition-18-price,gamestop-price,gamestop-trade-price,retail-loose-buy,retail-loose-sell,retail-cib-buy,retail-cib-sell,retail-new-buy,retail-new-sell,upc,sales-volume,genre,tcg-id,asin,epid,release-date",
    "901,Pokemon Promo,Reshiram #BW004,$4.00,,,$20.00,,,,,,,,,,,,,,,2,Pokemon Card,,,,2011-01-01",
    "902,Pokemon Promo,Reshiram #TG04,$40.00,,,$200.00,,,,,,,,,,,,,,,2,Pokemon Card,,,,2022-01-01",
    "903,Pokemon Black & White,Reshiram #4,$1.00,,,$10.00,,,,,,,,,,,,,,,2,Pokemon Card,,,,2011-01-01",
  ].join("\n"));

  const result = acquirePriceChartingCsvEvidenceV1({
    batch: {
      items: [{
        card_print_id: "44444444-4444-4444-4444-444444444444",
        gv_id: "GV-PK-PR-BLW-BW04",
        name: "Reshiram",
        set_code: "bwp",
        number_plain: "04",
        source: "pricecharting_reference",
      }],
    },
    csvRows,
    generatedAt: "2026-06-25T02:00:00.000Z",
    maxCandidatesPerTarget: 3,
  });

  assert.equal(result.summary.status_counts.candidate_evidence_created, 1);
  assert.equal(result.summary.candidate_evidence_count, 2);
  assert.match(result.reviewed_targets[0].best_match_reason, /number_prefix_alias_matched/);
  assert.match(result.reviewed_targets[0].best_match_reason, /set_alias_matched/);
  assert.ok(result.candidate_evidence.every((candidate) => candidate.raw_title.includes("#BW004")));
  assert.ok(result.candidate_evidence.every((candidate) => !candidate.raw_title.includes("#TG04")));
  assert.ok(result.candidate_evidence.every((candidate) => !candidate.raw_title.includes("Pokemon Black & White")));
});

test("MEE-04D matches governed expansion aliases and secret-number prefixes", () => {
  const csvRows = parsePriceChartingCsvRowsV1([
    "id,console-name,product-name,loose-price,cib-price,new-price,graded-price,box-only-price,manual-only-price,bgs-10-price,condition-17-price,condition-18-price,gamestop-price,gamestop-trade-price,retail-loose-buy,retail-loose-sell,retail-cib-buy,retail-cib-sell,retail-new-buy,retail-new-sell,upc,sales-volume,genre,tcg-id,asin,epid,release-date",
    "1001,Pokemon Call of Legends,Ho-Oh #SL5,$199.50,,,$1608.23,,,,,,,,,,,,,,,131,Pokemon Card,,,,2011-02-09",
    "1002,Pokemon Stormfront,Duskull #SH2,$72.76,,,$272.00,,,,,,,,,,,,,,,60,Pokemon Card,,,,2008-11-05",
    "1003,Pokemon Rising Rivals,Fan Rotom #RT1,$19.44,,,$106.60,,,,,,,,,,,,,,,40,Pokemon Card,,,,2009-05-16",
    "1004,Pokemon Emerald,Ho-Oh #5,$3.00,,,$20.00,,,,,,,,,,,,,,,1,Pokemon Card,,,,2005-01-01",
  ].join("\n"));

  const result = acquirePriceChartingCsvEvidenceV1({
    batch: {
      items: [
        {
          card_print_id: "55555555-5555-5555-5555-555555555555",
          gv_id: "GV-PK-COL-SL5",
          name: "Ho-Oh",
          set_code: "col1",
          number_plain: "5",
          source: "pricecharting_reference",
        },
        {
          card_print_id: "66666666-6666-6666-6666-666666666666",
          gv_id: "GV-PK-SF-SH2",
          name: "Duskull",
          set_code: "dp7",
          number_plain: "2",
          source: "pricecharting_reference",
        },
        {
          card_print_id: "77777777-7777-7777-7777-777777777777",
          gv_id: "GV-PK-RR-RT1",
          name: "Fan Rotom",
          set_code: "pl2",
          number_plain: "1",
          source: "pricecharting_reference",
        },
      ],
    },
    csvRows,
    generatedAt: "2026-06-25T02:00:00.000Z",
    maxCandidatesPerTarget: 3,
  });

  assert.equal(result.summary.status_counts.candidate_evidence_created, 3);
  assert.equal(result.summary.candidate_evidence_count, 6);
  assert.ok(result.reviewed_targets.every((target) => /number_prefix_alias_matched/.test(target.best_match_reason)));
  assert.ok(result.reviewed_targets.every((target) => /set_alias_matched/.test(target.best_match_reason)));
  assert.ok(result.candidate_evidence.some((candidate) => candidate.raw_title.includes("#SL5")));
  assert.ok(result.candidate_evidence.some((candidate) => candidate.raw_title.includes("#SH2")));
  assert.ok(result.candidate_evidence.some((candidate) => candidate.raw_title.includes("#RT1")));
  assert.ok(result.candidate_evidence.every((candidate) => !candidate.raw_title.includes("Pokemon Emerald")));
});

test("MEE-04D script and plan do not fetch providers, write DB rows, or publish prices", () => {
  const moduleSource = source("backend/pricing/market_evidence_pricecharting_csv_acquisition_v1.mjs");
  const scriptSource = source("scripts/audits/market_evidence_engine_pricecharting_csv_acquisition_v1.mjs");
  const planDoc = source("docs/plans/market_evidence_engine_v1/MEE_04D_PRICECHARTING_CSV_RAW_EVIDENCE_V1.md");
  const pkg = source("package.json");

  assert.match(planDoc, /No provider calls, source page fetches, database writes, pricing rollups/);
  assert.match(planDoc, /can_publish_price_directly = false/);
  assert.match(pkg, /"mee:pricecharting-csv"/);

  const combined = `${moduleSource}\n${scriptSource}`;
  assert.doesNotMatch(combined, /fetch\s*\(|axios|https\.request|curl\.exe|execFile/);
  assert.doesNotMatch(combined, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
