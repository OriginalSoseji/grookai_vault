# English Master Index PKG-02D Collision Adjudication V1

This is a read-only adjudication pass for the 79 PKG-02B rows excluded from PKG-02C because they collide with the standard card identity unique index.

No DB writes, migrations, cleanup, quarantine, merge, delete, or apply operation was performed.

## Result

- Status: `pkg02d_collision_adjudication_complete_no_write_checkpoint`
- Blocked collision rows reviewed: 79
- DB writes performed: false
- Migrations created: false
- PKG-02C apply proof: `pkg02c_full_beta_noncolliding_real_apply_committed_and_verified`

## Status Counts

| Status | Count |
| --- | ---: |
| number_plain_identity_collision_not_merge_safe | 58 |
| possible_duplicate_dependency_review_required | 21 |

## Set Summary

| Set | Rows | Number-key collision | Exact duplicate candidate | Dependency review | Manual review |
| --- | ---: | ---: | ---: | ---: | ---: |
| col1 | 2 | 2 | 0 | 0 | 0 |
| dp7 | 8 | 8 | 0 | 0 | 0 |
| ex10 | 3 | 0 | 0 | 3 | 0 |
| mep | 10 | 0 | 0 | 10 | 0 |
| pl1 | 9 | 9 | 0 | 0 | 0 |
| pl2 | 17 | 15 | 0 | 2 | 0 |
| pl3 | 9 | 9 | 0 | 0 | 0 |
| pl4 | 18 | 12 | 0 | 6 | 0 |
| swsh2 | 1 | 1 | 0 | 0 | 0 |
| swsh4.5 | 2 | 2 | 0 | 0 | 0 |

## Top Collision Examples

| Status | Set | Blocked target | Conflicting current row | Reason |
| --- | --- | --- | --- | --- |
| number_plain_identity_collision_not_merge_safe | col1 | 6 Groudon | SL6 Kyogre | has_distinct_printed_number_collision, has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | col1 | 8 Hitmontop | SL8 Palkia | has_distinct_printed_number_collision, has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | dp7 | 2 Empoleon | SH2 Duskull | has_distinct_printed_number_collision, has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | dp7 | 3 Infernape | SH3 Voltorb | has_distinct_printed_number_collision, has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | dp7 | 96 Dusknoir | 96 Dusknoir LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | dp7 | 97 Heatran | 97 Heatran LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | dp7 | 98 Machamp | 98 Machamp LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | dp7 | 99 Raichu | 99 Raichu LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | dp7 | 100 Regigigas | 100 Regigigas LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | dp7 | SH1 Drifloon | 1 Dusknoir | has_distinct_printed_number_collision, has_distinct_name_collision, has_dependency_refs |
| possible_duplicate_dependency_review_required | ex10 | 113 Entei ★ | 113 Entei ★ | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | ex10 | 114 Raikou ★ | 114 Raikou ★ | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | ex10 | 115 Suicune ★ | 115 Suicune ★ | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | mep | 001 Meganium | 001 Meganium | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | mep | 002 Inteleon | 002 Inteleon | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | mep | 003 Alakazam | 003 Alakazam | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | mep | 004 Lunatone | 004 Lunatone | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | mep | 005 Drifloon | 005 Drifloon | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | mep | 006 Drifblim | 006 Drifblim | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | mep | 007 Psyduck | 007 Psyduck | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | mep | 008 Golduck | 008 Golduck | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | mep | 009 Alakazam | 009 Alakazam | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | mep | 010 Riolu | 010 Riolu | has_exact_duplicate, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl1 | 6 Dialga | SH6 Vulpix | has_distinct_printed_number_collision, has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl1 | 122 Dialga G | 122 Dialga G LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl1 | 123 Drapion | 123 Drapion LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl1 | 124 Giratina | 124 Giratina LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl1 | 125 Palkia G | 125 Palkia G LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl1 | 126 Shaymin | 126 Shaymin LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl1 | 127 Shaymin | 127 Shaymin LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl1 | SH4 Lotad | 4 Delcatty | has_distinct_printed_number_collision, has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl1 | SH5 Swablu | 5 Dialga | has_distinct_printed_number_collision, has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl2 | 1 Arcanine | RT1 Fan Rotom | has_distinct_printed_number_collision, has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl2 | 3 Darkrai G | RT3 Heat Rotom | has_distinct_printed_number_collision, has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl2 | 5 Flygon | RT5 Wash Rotom | has_distinct_printed_number_collision, has_distinct_name_collision, has_dependency_refs |
| possible_duplicate_dependency_review_required | pl2 | 71 Nidoran ♀ | 71 Nidoran ♀ | has_exact_duplicate, has_dependency_refs |
| possible_duplicate_dependency_review_required | pl2 | 72 Nidoran ♂ | 72 Nidoran ♂ | has_exact_duplicate, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl2 | 95 Team Galactic's Invention G-107 Technical Machine | 95 Team Galactic's Invention G-107 Technical Machine G | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl2 | 103 Alakazam 4 | 103 Alakazam E4 LV.X | has_distinct_name_collision, has_dependency_refs |
| number_plain_identity_collision_not_merge_safe | pl2 | 104 Floatzel GL | 104 Floatzel GL LV.X | has_distinct_name_collision, has_dependency_refs |

## Safety

- No DB writes were performed.
- No migrations were created.
- No cleanup, quarantine, merge, delete, or apply path was executed.
- PKG-02C applied rows are not revisited by this audit.
- The 79 collision rows remain blocked from mutation.
