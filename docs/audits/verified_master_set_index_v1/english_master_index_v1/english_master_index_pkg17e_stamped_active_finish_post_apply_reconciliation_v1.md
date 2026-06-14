# PKG-17E Stamped Active Finish Post-Apply Reconciliation V1

Read-only reconciliation for the PKG-17E stamped active-finish evidence lane after PKG-17E1, PKG-17E2, and PKG-17E3.

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- global_apply_performed: false

## Summary

| metric | value |
| --- | --- |
| source_rows | 25 |
| ready_source_rows | 10 |
| closed_verified_in_db | 10 |
| ready_source_not_closed_in_db | 0 |
| blocked_or_review_rows | 15 |
| forbidden_stamped_child_rows | 0 |

## Status Counts

| status | count |
| --- | --- |
| blocked_no_exact_active_finish_evidence | 14 |
| blocked_single_source_family_review | 1 |
| closed_verified_in_db | 10 |

## Closed Rows

| set | number | card | variant | finish | variant_parent_id |
| --- | --- | --- | --- | --- | --- |
| sv03.5 | 132 | Ditto | prize_pack_stamp | holo | 55c8c4d7-10e0-46ee-b2a7-dc87dc0544d8 |
| sv03.5 | 151 | Mew ex | prize_pack_stamp | holo | 811b0adc-8f9e-4b60-835f-c554f1091af9 |
| sv03.5 | 4 | Charmander | eb_games_stamp | reverse | a828bea3-8870-4b80-9c1f-2f1a20eb71b6 |
| sv03.5 | 7 | Squirtle | pokemon_center_stamp | reverse | 40f953a9-d1df-4414-9d53-ccc5493daad5 |
| sv06.5 | 2 | Galvantula | prize_pack_stamp | cosmos | b7753e3b-adc9-4e92-a596-445633519f99 |
| swsh12.5 | 131 | Friends in Sinnoh | professor_program_stamp | reverse | ab7b0a26-2a90-49b5-adc7-886dd37881d0 |
| swsh12.5 | 135 | Lost Vacuum | prize_pack_stamp | cosmos | 2e8554c3-61c5-43e6-866b-eb7d9deeefc3 |
| swsh12.5 | 145 | Trekking Shoes | prize_pack_stamp | cosmos | caa0c597-4b97-414d-aaf5-a7ee4ee9c431 |
| swsh12.5 | 146 | Ultra Ball | prize_pack_stamp | cosmos | 7e22ed5c-0c1f-4b5a-a26b-a0e569e60242 |
| swsh12.5 | 36 | Kyogre | prize_pack_stamp | cosmos | 89c2b689-cf66-4d58-8752-356cded22db5 |

## Remaining Evidence-Lane Rows

| set | number | card | variant | source_status | reconciliation_status |
| --- | --- | --- | --- | --- | --- |
| sv03.5 | 1 | Bulbasaur |  | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| sv03.5 | 100 | Voltorb | professor_program_stamp | review_only_single_source_family | blocked_single_source_family_review |
| sv03.5 | 133 | Eevee |  | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| sv03.5 | 16 | Pidgey |  | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| sv06.5 | 38 | Fezandipiti ex |  | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| sv06.5 | 61 | Night Stretcher | prize_pack_stamp | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| swsh12.5 | 130 | Friends in Hisui |  | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| swsh12.5 | 143 | Sky Seal Stone | prize_pack_stamp | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| swsh3.5 | 18 | Hatenna |  | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| swsh3.5 | 35 | Galarian Zigzagoon | battle_academy_deck_mark | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| swsh3.5 | 36 | Galarian Linoone | battle_academy_deck_mark | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| swsh3.5 | 7 | Victini | battle_academy_deck_mark | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| swsh4.5 | 58 | Boss's Orders | prize_pack_stamp | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| swsh4.5 | 59 | Gym Trainer | professor_program_stamp | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
| swsh4.5 | 60 | Professor's Research | prize_pack_stamp | blocked_no_exact_active_finish_evidence | blocked_no_exact_active_finish_evidence |
