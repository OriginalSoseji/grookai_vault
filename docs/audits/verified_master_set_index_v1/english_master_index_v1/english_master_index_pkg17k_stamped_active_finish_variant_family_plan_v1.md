# PKG-17K Stamped Active Finish Variant Family Plan V1

Audit-only plan for the remaining stamped rows that still need exact active child finish evidence.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| active_finish_rows | 326 |
| family_count | 11 |
| high_priority_source_acquisition_rows | 200 |
| blocked_or_governance_rows | 121 |
| write_ready_now | 0 |
| fingerprint_sha256 | `aa929f6134a843bd675dbbe8f24a473b3c324afd0d8819833a2302a334335f03` |

## Family Plan

| priority | family | rows | status | top variants | top sets | recommended source path |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | league | 92 | source_acquisition_high_priority | league_stamp=84, league_cup_staff_stamp=8 | bw1=4, sm7=4, sm8=4, xy1=4, xy3=4, bw3=3, bw8=3, dv1=3 | Target official Play! Pokemon league material, PriceCharting exact product titles, and collector checklist pages; require exact active finish per card. |
| 2 | prize_pack | 63 | blocked_conflicting_or_single_source_prize_pack_finish | prize_pack_stamp=63 | swsh5=17, swsh1=10, swsh6=9, swsh9=8, swsh7=7, swsh2=4, swsh3=2, swshp=2 | Remain blocked until a third independent source resolves Standard Set versus Standard Set Foil conflict at card level. |
| 3 | battle_academy | 56 | governance_blocked_display_metadata | battle_academy_deck_mark=56 | swsh8=15, sm115=8, sm11=6, swsh1=6, sm1=5, sm8=4, sm5=3, swsh4=2 | Keep out of canonical finish writes; route toward display metadata strategy unless exact separate physical printing evidence exists. |
| 4 | small_custom_stamp_family | 31 | source_acquisition_high_priority | play_pok_mon_thank_you_stamp=5, dragon_vault_stamp=4, play_pokemon_stamp=3, destined_rivals_stamp=2, eb_games_stamp=2, alolan_raichu_half_deck_14_stamp=1, games_expo_stamped_2007=1, gym_challenge_stamped_2006_2007=1 | swsh3=6, dv1=4, bw1=3, ex11=2, ex9=2, sv10=2, ex12=1, ex8=1 | Use source-specific manual acquisition; no family-wide inference allowed. |
| 5 | halloween | 28 | source_acquisition_high_priority | pikachu_jack_o_lantern_stamp=27, pikachu_pumpkin_stamp=1 | swsh11=4, swsh4=4, swsh2=3, swsh3=3, swsh1=2, swsh10=2, swsh5=2, swsh6=2 | Target official Trick or Trade/checklist references and product scans; beware reused base cards and pumpkin stamp display identity. |
| 6 | championship_event | 15 | source_acquisition_high_priority | regional_championships_stamp=4, finalist_stamp=3, quarter_finalist_stamp=3, national_championships_stamp=2, world_championships_stamp=2, asia_championship_stamp=1 | bwp=2, svp=2, bw3=1, dpp=1, sm3=1, sm4=1, smp=1, swsh2=1 | Target event staff/championship checklist evidence; manual review likely required because source titles often omit active finish. |
| 7 | prerelease | 12 | source_acquisition_high_priority | prerelease_stamp=12 | swshp=8, bwp=1, ex4=1, ex6=1, hgss4=1 | Target Build & Battle checklist/source pages and product scans; exact promo stamp plus active finish required. |
| 8 | professor_program | 12 | source_acquisition_high_priority | professor_program_stamp=12 | swsh1=2, swsh8=2, dp3=1, ex15=1, ex6=1, hgss1=1, sm6=1, sv02=1 | Target professor-program product/checklist sources and PriceCharting exact titles; exact finish required. |
| 9 | staff | 10 | source_acquisition_high_priority | staff_stamp=6, championship_staff_stamp=2, regional_championships_staff_stamp=2 | sv10=3, dp6=2, bw5=1, hgss2=1, sm1=1, sm8=1, xy9=1 | Target event staff/championship checklist evidence; manual review likely required because source titles often omit active finish. |
| 10 | player_rewards | 5 | source_acquisition_low_volume | player_rewards_crosshatch_stamp=4, pok_ball_stamped_player_rewards_promo_2009_2010=1 | bw1=1, col1=1, hgss1=1, hgss2=1, pl3=1 | Target Player Rewards checklist pages and collector references; exact crosshatch/stamp plus active finish required. |
| 11 | generic_or_unknown | 2 | blocked_exact_stamp_label_needed | stamped=2 | svp=2 | First acquire exact stamp label; generic stamped rows cannot advance to active finish proof. |

## Rules

- No child `finish_key=stamped`.
- No family-wide finish inference.
- No Prize Pack promotion while sources conflict on Standard Set versus Standard Set Foil.
- No Battle Academy canonical finish write until display metadata strategy is resolved.
