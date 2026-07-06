import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKET_LISTING_BROAD_INTAKE_SMOKE_VERSION,
  buildMarketListingBroadIntakeSmokeReportV1,
} from "../../backend/pricing/market_listing_broad_intake_smoke_v1.mjs";

test("MEE-11F broad intake smoke keeps provider results local and flags obvious exclusions", async () => {
  const report = await buildMarketListingBroadIntakeSmokeReportV1({
    queries: ["pokemon card single -bulk -lot"],
    requestLimit: 1,
    generatedAt: "2026-06-25T00:00:00.000Z",
    fetchListing: async (request, { observedAt }) => ({
      query_key: request.query_key,
      source: "ebay_active",
      provider_route: "ebay_browse_api",
      source_fetch_url: "https://api.ebay.com/buy/browse/v1/item_summary/search?q=pokemon",
      response_status: 200,
      provider_total: 17,
      fetched_item_count: 17,
      payload_hash: "payload-hash",
      raw_payload: { total: 2 },
      projected_observations: [
        {
          source: "ebay_active",
          listing_title: "Pokemon Pikachu Holo Card",
          total_ask_price: 10,
          currency: "USD",
          source_listing_id: "one",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Pokemon Bulk Lot 100 Cards",
          total_ask_price: 20,
          currency: "USD",
          source_listing_id: "two",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Pokemon VMAX - Choose Your Card - Ultra Rare",
          total_ask_price: 5,
          currency: "USD",
          source_listing_id: "three",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Single Pokemon Center Card Sleeve",
          total_ask_price: 1,
          currency: "USD",
          source_listing_id: "four",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Tyranitar V Korean Pokemon Card",
          total_ask_price: 12,
          currency: "USD",
          source_listing_id: "five",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Pokemon TCG Trading Card Single - Back Shown",
          total_ask_price: 400,
          currency: "USD",
          source_listing_id: "six",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Pokemon TCG Fernando Mendoza V 999 HP Single",
          total_ask_price: 55,
          currency: "USD",
          source_listing_id: "seven",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Pokemon Classic Single Card CLV CLC CLB You PICK!!!!",
          total_ask_price: 5,
          currency: "USD",
          source_listing_id: "eight",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Pokemon Fossil Museum Promo-Unopened",
          total_ask_price: 70,
          currency: "USD",
          source_listing_id: "nine",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Pokemon Etc Single Card Guard",
          total_ask_price: 10,
          currency: "USD",
          source_listing_id: "ten",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Umbreon Vmax Gold Foil Fan Art Pokemon Card",
          total_ask_price: 12,
          currency: "USD",
          source_listing_id: "eleven",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Fairy Energy Pokemon Deck Build Card SAVE ON 2 OR MORE",
          total_ask_price: 1,
          currency: "USD",
          source_listing_id: "twelve",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Charizard ex Full Art Card Pokemon TCG",
          total_ask_price: 20,
          currency: "USD",
          source_listing_id: "thirteen",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Scarlet Violet Pokemon 151 Card You Choose Commons Uncommon Holo Rare EX IR SIR",
          total_ask_price: 3,
          currency: "USD",
          source_listing_id: "fourteen",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Gastly Haunter Gengar Pokemon Card! Holo/Reverse Holo EX VMAX V GX Rare Cards!",
          total_ask_price: 950,
          currency: "USD",
          source_listing_id: "fifteen",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Pokemon Trading Card Single Card Water-type Near Mint Authentic",
          total_ask_price: 160,
          currency: "USD",
          source_listing_id: "sixteen",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
        {
          source: "ebay_active",
          listing_title: "Pokemon Charizard Holo PSA 10 Graded Card",
          condition_text: "Graded",
          total_ask_price: 800,
          currency: "USD",
          source_listing_id: "seventeen",
          observed_at: observedAt,
          target: { gv_id: request.gv_id },
        },
      ],
    }),
  });

  assert.equal(report.version, MARKET_LISTING_BROAD_INTAKE_SMOKE_VERSION);
  assert.equal(report.ready_for_broad_backfill_plan, true);
  assert.equal(report.summary.fetched_item_count, 17);
  assert.equal(report.summary.clean_observation_count, 3);
  assert.equal(report.summary.slab_observation_count, 1);
  assert.equal(report.summary.evidence_class_counts.slab, 1);
  assert.deepEqual(report.summary.exclusion_flag_counts, {
    back_shown: 1,
    bulk: 1,
    choose_your_card: 3,
    custom_fake: 2,
    foreign_language: 1,
    lot: 1,
    menu_listing: 2,
    minimum_order: 1,
    sealed: 1,
    sleeve_accessory: 2,
    vague_listing: 1,
  });
  const fullArtCard = report.projected_observations.find((observation) => observation.source_listing_id === "thirteen");
  assert.deepEqual(fullArtCard.ingestion_exclusion_flags, []);
  const slabCard = report.projected_observations.find((observation) => observation.source_listing_id === "seventeen");
  assert.equal(slabCard.listing_evidence_class, "slab");
  assert.deepEqual(slabCard.ingestion_exclusion_flags, []);
  assert.deepEqual(slabCard.slab_features.graders, ["psa"]);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.boundary.market_listing_writes, false);
  assert.equal(report.boundary.app_visible_pricing, false);
});
