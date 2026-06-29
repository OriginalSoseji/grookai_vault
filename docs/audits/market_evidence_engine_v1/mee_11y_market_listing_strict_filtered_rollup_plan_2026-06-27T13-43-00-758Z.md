# MEE Market Listing Strict Filtered Rollup Plan V1

- Package: `MARKET-LISTING-STRICT-FILTERED-ROLLUP-PLAN-V1`
- Fingerprint: `1329a9a5f33d6990d13044d22f75108f1c18c1b3a28f1c7f42ab5786527f0fd1`
- Source strict title audit: `7f5e73c2c9504291194b6f7ff269a3145ad6c9c1e075ceb012a79d3fa1417eec`

## Summary

```json
{
  "candidate_rows_total": 183635,
  "candidate_rows_strict_title_passed": 170585,
  "candidate_rows_strict_title_excluded": 13050,
  "strict_filtered_rollup_count": 2261,
  "strict_filtered_review_ready_count": 1995,
  "strict_filtered_needs_more_evidence_count": 266,
  "raw_single_passed_candidates": 123601,
  "slab_passed_candidates": 46984
}
```

## Exclusion Reasons

```json
{
  "base_lane_has_base_set_2_noise": 262,
  "1999_2000_lane_missing_title_token": 2972,
  "base_lane_missing_base_set": 1106,
  "first_edition_lane_missing_title_token": 407,
  "shadowless_lane_missing_title_token": 240,
  "foreign_language_title_noise": 7182,
  "base_lane_missing_exact_number": 3,
  "lot_or_bulk_title_noise": 2361,
  "missing_pokemon_token": 4
}
```

## Samples

```json
{
  "review_ready": [
    {
      "card_print_id": "3fc82fab-b103-4336-a795-670d01985242",
      "gv_id": "GV-PK-BASE1-1-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 16,
      "seller_count": 13,
      "median_active_ask": 175.95,
      "trimmed_low_active_ask": 90,
      "trimmed_high_active_ask": 296.88,
      "minimum_active_ask": 80,
      "maximum_active_ask": 369.99,
      "q25": 114.73,
      "q75": 206.36,
      "p95": 317.5,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "Pokemon 1999 Base Set Shadowless Alakazam #1/102 Holo",
          "total_ask_price": 293.75,
          "condition_text": "Ungraded"
        },
        {
          "title": "Alakazam 1/102 Holo Holo Rare Base Set Shadowless Pokemon Holo HP",
          "total_ask_price": 80.99,
          "condition_text": "Ungraded"
        },
        {
          "title": "Alakazam - 1/102 - Pokemon Base Set Shadowless Holo Rare Card WOTC ",
          "total_ask_price": 300,
          "condition_text": "Ungraded"
        },
        {
          "title": "Alakazam - 1/102 - Pokemon Base Set Shadowless Holo Rare Card WOTC LP",
          "total_ask_price": 206.36,
          "condition_text": "Ungraded"
        },
        {
          "title": "Alakazam - 1/102 - Pokemon Base Set Shadowless Holo Rare Card WOTC LP",
          "total_ask_price": 206.36,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "02c1147c-3914-4b4a-a1d6-8d620e633e9b",
      "gv_id": "GV-PK-BASE1-10-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 24,
      "seller_count": 19,
      "median_active_ask": 168.09,
      "trimmed_low_active_ask": 80.19,
      "trimmed_high_active_ask": 225.75,
      "minimum_active_ask": 53.99,
      "maximum_active_ask": 490,
      "q25": 98.35,
      "q75": 197.54,
      "p95": 246.72,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "Pokemon Mewtwo Base Set SHADOWLESS Holo Rare 10/102 MP",
          "total_ask_price": 220,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon Mewtwo Base Set SHADOWLESS Holo Rare Unlimited 10/102 MP",
          "total_ask_price": 200,
          "condition_text": "Ungraded"
        },
        {
          "title": "Mewtwo 10 Base Set Shadowless English Pokemon Card B1 HP",
          "total_ask_price": 53.99,
          "condition_text": "Ungraded"
        },
        {
          "title": "Base Set Shadowless Mewtwo 10/102 Holo Rare Pokemon TCG - MP",
          "total_ask_price": 89.99,
          "condition_text": "Ungraded"
        },
        {
          "title": "Mewtwo 10/102 Holo Base Set Shadowless Pokemon Unlimited Holo MP Sugimori",
          "total_ask_price": 140.51,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "8072e2d6-ebc9-4c51-b412-c776410c7b30",
      "gv_id": "GV-PK-BASE1-11-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 23,
      "seller_count": 22,
      "median_active_ask": 79.99,
      "trimmed_low_active_ask": 42.08,
      "trimmed_high_active_ask": 111.35,
      "minimum_active_ask": 32.99,
      "maximum_active_ask": 240,
      "q25": 58.33,
      "q75": 98.91,
      "p95": 120.51,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "Pokemon Base Set Shadowless Nidoking Holo 1999 WOTC 11/102",
          "total_ask_price": 79.99,
          "condition_text": "Ungraded"
        },
        {
          "title": "Nidoking 11/102 Shadowless Holo Rare WotC Base Set Pokemon 1999 Vintage",
          "total_ask_price": 57.66,
          "condition_text": "Ungraded"
        },
        {
          "title": "Nidoking 11/102 Base Set Shadowless Holo Rare Holo POKEMON",
          "total_ask_price": 89.95,
          "condition_text": "Ungraded"
        },
        {
          "title": "1999 Pokemon Base Set Shadowless Nidoking 11/102 Holo Rare LP",
          "total_ask_price": 99.95,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon 1999 Base Set Shadowless Nidoking #11/102 Holo",
          "total_ask_price": 121.25,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "3fa6dd84-6c0d-4588-8a69-09e5928a40b2",
      "gv_id": "GV-PK-BASE1-12-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 35,
      "seller_count": 29,
      "median_active_ask": 56.9,
      "trimmed_low_active_ask": 32,
      "trimmed_high_active_ask": 138.91,
      "minimum_active_ask": 13.4,
      "maximum_active_ask": 351.24,
      "q25": 41.5,
      "q75": 115.99,
      "p95": 154.5,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "Ninetales 12/102 Holo Holo Rare Base Set Shadowless Pokemon Unlimited Holo MP",
          "total_ask_price": 59.99,
          "condition_text": "Ungraded"
        },
        {
          "title": "Ninetales 12/102 Holo Holo Rare Base Set Shadowless Pokemon Unlimited Holo MP",
          "total_ask_price": 59.99,
          "condition_text": "Ungraded"
        },
        {
          "title": "1999 Pokemon NINETALES Base Set SHADOWLESS 12/102 HOLO Rare Card WOTC",
          "total_ask_price": 150,
          "condition_text": "Used"
        },
        {
          "title": "Pokemon 1999 Base Set Shadowless Ninetales #12/102 Holo",
          "total_ask_price": 121.25,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon Card - Ninetales Base Set (Shadowless) 12/102 Holo Rare ",
          "total_ask_price": 39.99,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "c7e27209-87ca-464e-903b-eb8e8421ea12",
      "gv_id": "GV-PK-BASE1-13-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 18,
      "seller_count": 16,
      "median_active_ask": 54.24,
      "trimmed_low_active_ask": 32.1,
      "trimmed_high_active_ask": 81.68,
      "minimum_active_ask": 29.99,
      "maximum_active_ask": 177.77,
      "q25": 44,
      "q75": 78.99,
      "p95": 99.42,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "1999 Pokemon, Base Set Shadowless, #13/102 Poliwrath, Holo Rare (b)",
          "total_ask_price": 55.99,
          "condition_text": "Ungraded"
        },
        {
          "title": "1999 Pokemon, Base Set Shadowless, #13/102 Poliwrath, Holo Rare (c)",
          "total_ask_price": 55.99,
          "condition_text": "Ungraded"
        },
        {
          "title": "1999 Pokemon, Base Set Shadowless, #13/102 Poliwrath, Holo Rare",
          "total_ask_price": 75.99,
          "condition_text": "Ungraded"
        },
        {
          "title": "Poliwrath 13/102 Holo Rare Base Set Shadowless Holo Pokemon Damaged",
          "total_ask_price": 33,
          "condition_text": "Ungraded"
        },
        {
          "title": "Poliwrath - 13/102 - Pokemon Base Set Shadowless Holo Rare Card WOTC MP",
          "total_ask_price": 62.99,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "d655b844-7d36-4b8e-b5b0-7ab148f34021",
      "gv_id": "GV-PK-BASE1-14-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 12,
      "seller_count": 11,
      "median_active_ask": 228.59,
      "trimmed_low_active_ask": 64.34,
      "trimmed_high_active_ask": 1343,
      "minimum_active_ask": 42.86,
      "maximum_active_ask": 1400,
      "q25": 125,
      "q75": 582.5,
      "p95": 1400,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "Pokemon Cards Base Set Shadowless 14 Raichu Holo Rare Wizards Of The Coast HP",
          "total_ask_price": 42.86,
          "condition_text": "Ungraded"
        },
        {
          "title": "1999 1ST EDITION Pokemon Base Set Shadowless Raichu 14/102 Holo",
          "total_ask_price": 456.65,
          "condition_text": "Ungraded"
        },
        {
          "title": "Raichu Base Set Shadowless Pokemon Card 14/102 NM Never Played",
          "total_ask_price": 500,
          "condition_text": "Ungraded"
        },
        {
          "title": "Raichu 14/102 Holo Base Set (Shadowless) - Pokemon Card - LP",
          "total_ask_price": 197.19,
          "condition_text": "Ungraded"
        },
        {
          "title": "Raichu - 14/102 - Pokemon Base Set Shadowless Holo Rare Card WOTC HP",
          "total_ask_price": 133.65,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "bca34539-1efc-4da3-9f92-990b43ac5278",
      "gv_id": "GV-PK-BASE1-15-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 19,
      "seller_count": 15,
      "median_active_ask": 417.83,
      "trimmed_low_active_ask": 198.99,
      "trimmed_high_active_ask": 600,
      "minimum_active_ask": 40,
      "maximum_active_ask": 695.75,
      "q25": 310.34,
      "q75": 456.66,
      "p95": 609.57,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "Pokemon Base Set SHADOWLESS Venusaur 15 Holo Clean",
          "total_ask_price": 350,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon Venusaur Base Set SHADOWLESS Holo 15/102 LP 🍃",
          "total_ask_price": 455,
          "condition_text": "Ungraded"
        },
        {
          "title": "Venusaur 15/102 Base Set Shadowless Holo Rare Vintage 1999 WotC Pokemon Card NM",
          "total_ask_price": 40,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon 1999 Base Set Shadowless Venusaur #15/102 Holo",
          "total_ask_price": 695.75,
          "condition_text": "Ungraded"
        },
        {
          "title": "Venusaur #15/102 Base Set Shadowless LP- Crease Pokemon Card",
          "total_ask_price": 250,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "4b502c50-4752-43b1-a5a2-9f775f796855",
      "gv_id": "GV-PK-BASE1-16-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 18,
      "seller_count": 18,
      "median_active_ask": 131,
      "trimmed_low_active_ask": 51.51,
      "trimmed_high_active_ask": 442.38,
      "minimum_active_ask": 35.13,
      "maximum_active_ask": 688.71,
      "q25": 73.48,
      "q75": 199.3,
      "p95": 520.72,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "Pokemon TCG | Zapdos 16/102 | Base Set Shadowless Holo 1st Edition Holo | LP",
          "total_ask_price": 688.71,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon Zapdos Base Set SHADOWLESS Holo Rare 16/102 LP ΓÜí∩╕Å",
          "total_ask_price": 200,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon 1999 Base Set Shadowless Zapdos #16/102",
          "total_ask_price": 196,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon Base Set 1st Edition Holo Zapdos 16/102 EX Condition Shadowless OG LP",
          "total_ask_price": 421.51,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon TCG Zapdos 90 HP Base Set Shadowless Holo Rare 16/102 EN 1999",
          "total_ask_price": 55,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "468da9b6-1ce0-41e9-9124-563603e14b8b",
      "gv_id": "GV-PK-BASE1-2-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 16,
      "seller_count": 13,
      "median_active_ask": 393.41,
      "trimmed_low_active_ask": 170.95,
      "trimmed_high_active_ask": 791.02,
      "minimum_active_ask": 69.5,
      "maximum_active_ask": 929,
      "q25": 302.88,
      "q75": 474.38,
      "p95": 843.92,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "Pokemon Cards: Base Set Shadowless Rare Holo: Blastoise 2/102 Excellent",
          "total_ask_price": 592.53,
          "condition_text": "Ungraded"
        },
        {
          "title": "1999 Pokemon Base Set Shadowless Holofoil Blastoise 2/102 MP",
          "total_ask_price": 396.92,
          "condition_text": "Ungraded"
        },
        {
          "title": "1999 Pokemon Base Set Shadowless Holofoil Blastoise 2/102 MP",
          "total_ask_price": 389.9,
          "condition_text": "Ungraded"
        },
        {
          "title": "1999 Pokemon Base Set Shadowless Holofoil Blastoise 2/102 MP",
          "total_ask_price": 396.92,
          "condition_text": "Ungraded"
        },
        {
          "title": "1999 Pokemon Base Set Shadowless Holofoil Blastoise 2/102 MP",
          "total_ask_price": 815.56,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "2ea7dd66-429b-41db-bf6f-20258f1538e7",
      "gv_id": "GV-PK-BASE1-3-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 17,
      "seller_count": 14,
      "median_active_ask": 105.99,
      "trimmed_low_active_ask": 36,
      "trimmed_high_active_ask": 245.99,
      "minimum_active_ask": 12.99,
      "maximum_active_ask": 1800,
      "q25": 49.99,
      "q75": 178.75,
      "p95": 600,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "Pokemon Chansey Base Set SHADOWLESS Vintage Holo 3/102 MP/HP",
          "total_ask_price": 125,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon 1999 Base Set Shadowless Chansey #3/102",
          "total_ask_price": 178.75,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon 1999 Base Set Shadowless Chansey #3/102 Holo",
          "total_ask_price": 121.25,
          "condition_text": "Ungraded"
        },
        {
          "title": "Chansey 3/102 Base Set Shadowless Pokemon additional yellow ink error misprint",
          "total_ask_price": 300,
          "condition_text": "Ungraded"
        },
        {
          "title": "Chansey - 1st Edition Base Set Shadowless 3/102 Holo Pokemon WotC Wizards",
          "total_ask_price": 1800,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "49cbaa7c-af8c-4111-8a8e-f479a10cf90e",
      "gv_id": "GV-PK-BASE1-4-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 13,
      "seller_count": 13,
      "median_active_ask": 1271.6,
      "trimmed_low_active_ask": 727.78,
      "trimmed_high_active_ask": 6261.8,
      "minimum_active_ask": 266.25,
      "maximum_active_ask": 29225.06,
      "q25": 1088.94,
      "q75": 1752.84,
      "p95": 16010.02,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "1999 Pokemon Charizard Holo Rare Base Set Shadowless 4/102 HP/DMG",
          "total_ask_price": 1088.94,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon TCG Charizard 4/102 Base Set Shadowless Holo Rare 1999 Vintage WOTC",
          "total_ask_price": 2509,
          "condition_text": "Ungraded"
        },
        {
          "title": "Vintage Pokemon Base Set Shadowless Unlimited Charizard 4/102 Holo Rare HP/DMG",
          "total_ask_price": 1150,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon Charizard 4/102 Base Set Shadowless Holo 1999 Wizards Of The Coast ",
          "total_ask_price": 1369.61,
          "condition_text": "Ungraded"
        },
        {
          "title": "Charizard #4 1st Edition Base Set Shadowless Holo Pokemon 1999 NM-",
          "total_ask_price": 29225.06,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "b8e59317-4a43-4390-8628-d159515ca94c",
      "gv_id": "GV-PK-BASE1-5-SHADOWLESS",
      "evidence_class": "raw_single",
      "listing_count": 27,
      "seller_count": 26,
      "median_active_ask": 89,
      "trimmed_low_active_ask": 39.98,
      "trimmed_high_active_ask": 186.54,
      "minimum_active_ask": 34.99,
      "maximum_active_ask": 467.18,
      "q25": 53.5,
      "q75": 119.3,
      "p95": 200,
      "review_bucket": "strict_filtered_review_ready_internal_candidate",
      "sample_titles": [
        {
          "title": "Pokemon Clefairy Base Set SHADOWLESS Holo Rare 5/102 LP",
          "total_ask_price": 140,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon TCG Clefairy 1st Edition Base Set Shadowless Holo Rare 5/102 1999. Mp/lp",
          "total_ask_price": 467.18,
          "condition_text": "Ungraded"
        },
        {
          "title": "Clefairy 5/102 Base Set Shadowless Holo Pokemon LP",
          "total_ask_price": 109.55,
          "condition_text": "Ungraded"
        },
        {
          "title": "1999 Pokemon Base Set SHADOWLESS CLEFAIRY Holo Rare Card 5/102 NM",
          "total_ask_price": 89,
          "condition_text": "Used"
        },
        {
          "title": "Clefairy 5/102 Base Set Shadowless Rare Holo 1999 Lightly Played Pokemon Card",
          "total_ask_price": 177.56,
          "condition_text": "Ungraded"
        }
      ]
    }
  ],
  "needs_more_evidence": [
    {
      "card_print_id": "a25593f0-3d52-40c8-9a0c-e13d65663413",
      "gv_id": "GV-PK-BASE1-1-FIRST-EDITION",
      "evidence_class": "raw_single",
      "listing_count": 2,
      "seller_count": 2,
      "median_active_ask": 1580,
      "trimmed_low_active_ask": 1243.99,
      "trimmed_high_active_ask": 1916,
      "minimum_active_ask": 1159.99,
      "maximum_active_ask": 2000,
      "q25": 1369.99,
      "q75": 1790,
      "p95": 1958,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "Pokemon TCG Base Set 1st Edition Alakazam LP Thick Stamp",
          "total_ask_price": 1159.99,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pok├⌐mon Card Pokemon Base set 1st Edition HOLO ALAKAZAM 1/102 English",
          "total_ask_price": 2000,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "4e4df92f-ffd6-4f83-85c4-3ee81a6b8e96",
      "gv_id": "GV-PK-BASE1-10-1999-2000",
      "evidence_class": "raw_single",
      "listing_count": 1,
      "seller_count": 1,
      "median_active_ask": 149.99,
      "trimmed_low_active_ask": 149.99,
      "trimmed_high_active_ask": 149.99,
      "minimum_active_ask": 149.99,
      "maximum_active_ask": 149.99,
      "q25": 149.99,
      "q75": 149.99,
      "p95": 149.99,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "Pokemon Card - Mewtwo 10/102 Holo 4th Print 1999-2000 Base Set Rare LP",
          "total_ask_price": 149.99,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "71fc0402-a798-4b39-b148-d1fc2e516c5a",
      "gv_id": "GV-PK-BASE1-11-FIRST-EDITION",
      "evidence_class": "raw_single",
      "listing_count": 2,
      "seller_count": 2,
      "median_active_ask": 148.04,
      "trimmed_low_active_ask": 66.47,
      "trimmed_high_active_ask": 229.6,
      "minimum_active_ask": 46.08,
      "maximum_active_ask": 249.99,
      "q25": 97.06,
      "q75": 199.01,
      "p95": 239.79,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "Nidoking 11/102┬á Base set 1st edition Pokemon 1995 Rare Holo FREE UK DELIVERY",
          "total_ask_price": 46.08,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon Nidoking Base Set 1st Edition Holo Rare #11 MP-HP 11/102",
          "total_ask_price": 249.99,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "4168d1d8-e7c6-495d-9b2d-dacc7c2815a4",
      "gv_id": "GV-PK-BASE1-12-1999-2000",
      "evidence_class": "raw_single",
      "listing_count": 1,
      "seller_count": 1,
      "median_active_ask": 189.68,
      "trimmed_low_active_ask": 189.68,
      "trimmed_high_active_ask": 189.68,
      "minimum_active_ask": 189.68,
      "maximum_active_ask": 189.68,
      "q25": 189.68,
      "q75": 189.68,
      "p95": 189.68,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "Ninetales 12/102 Holo Rare 1999-2000 4th Print UK Base Set Rare Pokemon NM",
          "total_ask_price": 189.68,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "841fcdb3-e79c-4df8-a0f3-617ba41bc3f0",
      "gv_id": "GV-PK-BASE1-14-FIRST-EDITION",
      "evidence_class": "raw_single",
      "listing_count": 2,
      "seller_count": 2,
      "median_active_ask": 515.78,
      "trimmed_low_active_ask": 381.2,
      "trimmed_high_active_ask": 650.36,
      "minimum_active_ask": 347.55,
      "maximum_active_ask": 684,
      "q25": 431.66,
      "q75": 599.89,
      "p95": 667.18,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "POKEMON Raichu 14/102 Base Set 1st Edition Holo FR Good",
          "total_ask_price": 347.55,
          "condition_text": "Non grad├⌐e"
        },
        {
          "title": "Raichu 14/102 Base Set 1st Edition Shadowless Holo 1999 Pokemon Card",
          "total_ask_price": 684,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "176db31a-ccac-4636-8bf8-a4ce81a08662",
      "gv_id": "GV-PK-BASE1-15-1999-2000",
      "evidence_class": "raw_single",
      "listing_count": 2,
      "seller_count": 2,
      "median_active_ask": 97.34,
      "trimmed_low_active_ask": 83.2,
      "trimmed_high_active_ask": 111.47,
      "minimum_active_ask": 79.67,
      "maximum_active_ask": 115,
      "q25": 88.5,
      "q75": 106.17,
      "p95": 113.23,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "Pokemon TCG Venusaur Base Set Holo Rare #15/102 EN 1999-2000 Wizards",
          "total_ask_price": 115,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon Venusaur Base Set 15/102 Holo 1999-2000 Damaged",
          "total_ask_price": 79.67,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "24aa883d-f857-4965-a823-33ba744aada7",
      "gv_id": "GV-PK-BASE1-15-FIRST-EDITION",
      "evidence_class": "raw_single",
      "listing_count": 1,
      "seller_count": 1,
      "median_active_ask": 124.45,
      "trimmed_low_active_ask": 124.45,
      "trimmed_high_active_ask": 124.45,
      "minimum_active_ask": 124.45,
      "maximum_active_ask": 124.45,
      "q25": 124.45,
      "q75": 124.45,
      "p95": 124.45,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "Venusaur Base Set 1st Edition 15/102 1995 Holo Pokemon",
          "total_ask_price": 124.45,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "f8eb15b3-5d8f-4f7c-8ca7-b7a8b39861dc",
      "gv_id": "GV-PK-BASE1-16-FIRST-EDITION",
      "evidence_class": "raw_single",
      "listing_count": 2,
      "seller_count": 2,
      "median_active_ask": 1000.84,
      "trimmed_low_active_ask": 537.38,
      "trimmed_high_active_ask": 1464.3,
      "minimum_active_ask": 421.51,
      "maximum_active_ask": 1580.16,
      "q25": 711.17,
      "q75": 1290.5,
      "p95": 1522.23,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "1999 Pokemon Base Set 1st Edition Holo Zapdos 16/102",
          "total_ask_price": 1580.16,
          "condition_text": "Used"
        },
        {
          "title": "Pokemon Base Set 1st Edition Holo Zapdos 16/102 EX Condition Shadowless OG LP",
          "total_ask_price": 421.51,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "3b677f8e-0cd5-47c4-ab81-e3cbfa9e2e52",
      "gv_id": "GV-PK-BASE1-2-1999-2000",
      "evidence_class": "raw_single",
      "listing_count": 1,
      "seller_count": 1,
      "median_active_ask": 288.05,
      "trimmed_low_active_ask": 288.05,
      "trimmed_high_active_ask": 288.05,
      "minimum_active_ask": 288.05,
      "maximum_active_ask": 288.05,
      "q25": 288.05,
      "q75": 288.05,
      "p95": 288.05,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "Pokemon Base Set \"Blastoise\" 2/102 / UK 4th Print / Moderately Played",
          "total_ask_price": 288.05,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "29edd6d0-58c5-453d-a0d3-4b079f3eec92",
      "gv_id": "GV-PK-BASE1-3-FIRST-EDITION",
      "evidence_class": "raw_single",
      "listing_count": 2,
      "seller_count": 2,
      "median_active_ask": 371.19,
      "trimmed_low_active_ask": 107.03,
      "trimmed_high_active_ask": 635.35,
      "minimum_active_ask": 40.99,
      "maximum_active_ask": 701.39,
      "q25": 206.09,
      "q75": 536.29,
      "p95": 668.37,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "Pokemon TCG - Chansey 🌟 3/102 Base Set 1st Edition 🥇 Holo Γ£¿ Rare WOTC Card LP",
          "total_ask_price": 701.39,
          "condition_text": "Ungraded"
        },
        {
          "title": "Chansey 3/102 Holo Holo Rare Base Set Shadowless Pokemon 1st Edition Holo HP",
          "total_ask_price": 40.99,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "283f8acc-3f41-4972-80f0-db53527ad309",
      "gv_id": "GV-PK-BASE1-4-1999-2000",
      "evidence_class": "raw_single",
      "listing_count": 1,
      "seller_count": 1,
      "median_active_ask": 1119,
      "trimmed_low_active_ask": 1119,
      "trimmed_high_active_ask": 1119,
      "minimum_active_ask": 1119,
      "maximum_active_ask": 1119,
      "q25": 1119,
      "q75": 1119,
      "p95": 1119,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "1999 POKEMON CHARIZARD #4 BASE SET 1999-2000 4TH PRINT",
          "total_ask_price": 1119,
          "condition_text": "Ungraded"
        }
      ]
    },
    {
      "card_print_id": "74c7d58e-f8e8-4a3f-baf4-2bb67e12f7de",
      "gv_id": "GV-PK-BASE1-7-1999-2000",
      "evidence_class": "raw_single",
      "listing_count": 3,
      "seller_count": 2,
      "median_active_ask": 50,
      "trimmed_low_active_ask": 50,
      "trimmed_high_active_ask": 72.32,
      "minimum_active_ask": 50,
      "maximum_active_ask": 77.9,
      "q25": 50,
      "q75": 63.95,
      "p95": 75.11,
      "review_bucket": "strict_filtered_needs_more_evidence",
      "sample_titles": [
        {
          "title": "Pokemon TCG English Card Base Set 1999-2000 4th Print Hitmonchan 7/102 Holo Rare",
          "total_ask_price": 50,
          "condition_text": "Ungraded"
        },
        {
          "title": "Pokemon TCG English Card Base Set 1999-2000 4th Print Hitmonchan 7/102 Holo Rare",
          "total_ask_price": 50,
          "condition_text": "Ungraded"
        },
        {
          "title": "Hitmonchan 7/102 4th Print 1999-2000 Base Set Holo Rare UK Pokemon Card LP-MP^",
          "total_ask_price": 77.9,
          "condition_text": "Ungraded"
        }
      ]
    }
  ]
}
```

## Findings

- strict_title_filter_excluded_candidate_rows

## Recommended Next Step

Use this strict-filtered rollup plan as the nightly pipeline target: filter listing rows before medians are calculated, then generate internal review-only rollups from the passing listings only.
