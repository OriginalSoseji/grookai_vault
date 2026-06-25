# Market Evidence Engine Overnight Worklist V1

Generated: 2026-06-25T05:09:21.124Z

## Boundary

- Read-only Supabase queries only.
- No provider calls.
- No database writes.
- No pricing rollups.
- No migration apply.
- Raw worklist rows are not pricing truth.

## Runtime Options

- limit: 10
- stale_days: 30
- json: docs/audits/market_evidence_engine_v1/mee_overnight_worklist_2026-06-25T05-09-21-124Z.json

## Summary

- card_print_count: 27266
- ebay_latest_count: 1690
- accepted_ebay_card_count: 0
- reference_card_count: 19753
- missing_accepted_ebay_count: 27266
- missing_ebay_latest_count: 25576
- stale_ebay_latest_count: 1690
- no_reference_count: 7513

## Top Targets

| Score | Card | ID | Reasons |
| ---: | --- | --- | --- |
| 110 | Alakazam (base1 #1) | GV-PK-BS-1 | no accepted mapped eBay observations; no eBay latest rollup; reference lane exists for cross-check; collector-interest rarity |
| 110 | Mewtwo (base1 #10) | GV-PK-BS-10 | no accepted mapped eBay observations; no eBay latest rollup; reference lane exists for cross-check; collector-interest rarity |
| 110 | Nidoking (base1 #11) | GV-PK-BS-11 | no accepted mapped eBay observations; no eBay latest rollup; reference lane exists for cross-check; collector-interest rarity |
| 110 | Ninetales (base1 #12) | GV-PK-BS-12 | no accepted mapped eBay observations; no eBay latest rollup; reference lane exists for cross-check; collector-interest rarity |
| 110 | Poliwrath (base1 #13) | GV-PK-BS-13 | no accepted mapped eBay observations; no eBay latest rollup; reference lane exists for cross-check; collector-interest rarity |
| 110 | Venusaur (base1 #15) | GV-PK-BS-15 | no accepted mapped eBay observations; no eBay latest rollup; reference lane exists for cross-check; collector-interest rarity |
| 110 | Zapdos (base1 #16) | GV-PK-BS-16 | no accepted mapped eBay observations; no eBay latest rollup; reference lane exists for cross-check; collector-interest rarity |
| 110 | Beedrill (base1 #17) | GV-PK-BS-17 | no accepted mapped eBay observations; no eBay latest rollup; reference lane exists for cross-check; collector-interest rarity |
| 110 | Dragonair (base1 #18) | GV-PK-BS-18 | no accepted mapped eBay observations; no eBay latest rollup; reference lane exists for cross-check; collector-interest rarity |
| 110 | Dugtrio (base1 #19) | GV-PK-BS-19 | no accepted mapped eBay observations; no eBay latest rollup; reference lane exists for cross-check; collector-interest rarity |

## Next Step

Use this worklist to choose the first bounded MEE acquisition batch after the warehouse schema draft is reviewed and explicitly approved.
