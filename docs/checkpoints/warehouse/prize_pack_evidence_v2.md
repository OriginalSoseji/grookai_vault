# Prize Pack Evidence V2

Generated at: 2026-04-18T23:27:54.143Z

## Context

This pass re-audits the `WAIT_FOR_MORE_EVIDENCE` Prize Pack family-only backlog from v1 using a bounded evidence ladder and deterministic series coverage rules.

## Evidence Tiers

- TIER_1: Official Play! Pokemon gallery pages, official card lists, and official checklist PDFs.
- TIER_2: Trusted structured aggregators with card-level numbering, including JustInBasil-style set lists.
- TIER_3: Community corroboration such as multiple independent listings or bounded compare audits.
- TIER_4: Weak evidence: single source, inconsistent naming, or no external checklist corroboration.

## Source Coverage

- Series 4: JustInBasil Prize Pack Series 4 Set List | justinbasil_set_list | 86 entries
- Series 5: JustInBasil Prize Pack Series 5 Set List | justinbasil_set_list | 86 entries
- Series 6: JustInBasil Prize Pack Series 6 Set List | justinbasil_set_list | 55 entries
- Series 7: Play! Pokemon Prize Pack Series 7 official checklist | official_checklist_pdf | 96 entries
- Series 8: Play! Pokemon Prize Pack Series 8 official checklist | official_checklist_pdf | 90 entries

## Counts

- input_rows: 523
- confirmed_identity: 72
- duplicate_reprint: 33
- still_unproven: 418
- ready_for_warehouse: 72
- do_not_canon: 33
- wait: 418

## Evidence Tier Counts

- TIER_1: 6
- TIER_2: 151
- TIER_3: 1
- TIER_4: 365

## Decision Clusters

- no_external_series_confirmation_yet::WAIT: 328 rows | STILL_UNPROVEN | WAIT
- single_series_match_with_complete_supported_coverage::READY_FOR_WAREHOUSE: 72 rows | CONFIRMED_IDENTITY | READY_FOR_WAREHOUSE
- single_series_match_but_series_1_to_3_coverage_not_resolved_for_this_base_set::WAIT: 52 rows | STILL_UNPROVEN | WAIT
- base_route_ambiguous_or_missing::WAIT: 38 rows | STILL_UNPROVEN | WAIT
- appears_in_multiple_prize_pack_series_without_distinguishing_marker::DO_NOT_CANON: 33 rows | DUPLICATE_REPRINT | DO_NOT_CANON

## Next Executable Subset

- subset_id: PRIZE_PACK_FAMILY_ONLY_CONFIRMED_V2
- row_count: 72
- gate: unique base route AND single series appearance AND evidence tier <= TIER_2 AND complete supported coverage

Representative rows:
- Ancient Booster Energy Capsule | 159/182 | GV-PK-PAR-159 | series 5
- Awakening Drum | 141/162 | GV-PK-TEF-141 | series 5
- Brambleghast | 021/162 | GV-PK-TEF-021 | series 5
- Brute Bonnet | 123/182 | GV-PK-PAR-123 | series 5
- Ciphermaniac's Codebreaking | 145/162 | GV-PK-TEF-145 | series 5
- Claydol | 095/197 | GV-PK-OBF-095 | series 4
- Colress's Tenacity | 057/064 | GV-PK-SFA-57 | series 7
- Cornerstone Mask Ogerpon ex | 112/167 | GV-PK-TWM-112 | series 6
- Counter Catcher | 160/182 | GV-PK-PAR-160 | series 5
- Ditto - 132/165 | 132/165 | GV-PK-MEW-132 | series 6
- Dodrio | 085/165 | GV-PK-MEW-085 | series 5
- Dragapult ex | 130/167 | GV-PK-TWM-130 | series 6
- Drakloak | 129/167 | GV-PK-TWM-129 | series 6
- Dusclops - 019/064 | 019/064 | GV-PK-SFA-19 | series 7
- Dusknoir - 020/064 | 020/064 | GV-PK-SFA-20 | series 7

## Do-Not-Canon Summary

- Arven | 166/198 | GV-PK-SVI-166 | series 4, 5
- Basic Grass Energy - 001 | 001 | GV-PK-SVE-1 | series 4, 5
- Basic Lightning Energy - 004 | 004 | GV-PK-SVE-4 | series 4, 5
- Basic Psychic Energy - 005 | 005 | GV-PK-SVE-5 | series 4, 5
- Basic Water Energy - 003 | 003 | GV-PK-SVE-3 | series 4, 5
- Baxcalibur | 060/193 | GV-PK-PAL-60 | series 4, 5
- Boss's Orders - 172/193 | 172/193 | GV-PK-PAL-172 | series 4, 5
- Charizard ex | 125/197 | GV-PK-OBF-125 | series 4, 5, 6
- Chien-Pao ex | 061/193 | GV-PK-PAL-61 | series 4, 5
- Fezandipiti ex - 038/064 | 038/064 | GV-PK-SFA-38 | series 6, 7
- Forretress ex | 005/193 | GV-PK-PAL-5 | series 4, 5
- Gardevoir ex | 086/198 | GV-PK-SVI-086 | series 4, 5
- Iono | 185/193 | GV-PK-PAL-185 | series 4, 5
- Iron Crown ex | 081/162 | GV-PK-TEF-081 | series 5, 6
- Iron Hands ex | 070/182 | GV-PK-PAR-70 | series 5, 6

## Still Unproven Summary

- no_external_series_confirmation_yet: 328
- single_series_match_but_series_1_to_3_coverage_not_resolved_for_this_base_set: 52
- base_route_ambiguous_or_missing: 38

## Decision Rule

- IF unique base route AND appearance count = 1 AND evidence tier <= TIER_2 AND full series coverage is supported, THEN READY_FOR_WAREHOUSE.
- IF appearance count > 1 with no printed series marker, THEN DO_NOT_CANON.
- ELSE WAIT.

## Recommended Next Step

- PRIZE_PACK_READY_BATCH_V2

