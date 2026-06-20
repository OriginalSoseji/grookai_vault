# English Master Index PKG-11B Stamped Finish Routing Readiness V1

Read-only routing audit for stamped canonical parent candidates after PKG-11A. This report does not write to the database and does not activate `stamped` as a child finish.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 31

## Summary

- candidate_rows_reviewed: 331
- exact_label_routed_rows: 31
- single_base_finish_rows: 0
- blocked_rows: 300
- already_adjudicated_rows_suppressed: 0
- fingerprint_sha256: `c4c04c033b13eedc02d02f0f5aabe2f8e9578e09ab30126f8373e76c21bd6ac4`

| routing_status | rows |
| --- | --- |
| blocked_missing_exact_finish_phrase | 298 |
| ready_finish_routed_exact_label | 31 |
| blocked_generic_stamped_variant_key | 2 |

## Target Finishes

| target_finish_key | rows |
| --- | --- |
| reverse | 30 |
| normal | 1 |

## Ready Sample

| set | number | name | stamp_label | target_finish | status |
| --- | --- | --- | --- | --- | --- |
| pl1 | 104 | Broken Time-Space | League Stamp | reverse | ready_finish_routed_exact_label |
| pl3 | 26 | Dusknoir FB | League Stamp | reverse | ready_finish_routed_exact_label |
| pl3 | 83 | Skarmory FB | League Stamp | reverse | ready_finish_routed_exact_label |
| pl4 | 32 | Spiritomb | League Stamp | reverse | ready_finish_routed_exact_label |
| pl4 | 87 | Expert Belt | League Stamp | reverse | ready_finish_routed_exact_label |
| hgss1 | 39 | Delibird | League Stamp | reverse | ready_finish_routed_exact_label |
| hgss1 | 97 | Pokémon Collector | League Stamp | reverse | ready_finish_routed_exact_label |
| hgss1 | 103 | Double Colorless Energy | League Stamp | reverse | ready_finish_routed_exact_label |
| hgss2 | 82 | Rare Candy | League Stamp | reverse | ready_finish_routed_exact_label |
| bwp | BW95 | Champions Festival | Quarter Finalist Stamp | normal | ready_finish_routed_exact_label |
| bw1 | 53 | Whirlipede | League Stamp | reverse | ready_finish_routed_exact_label |
| bw1 | 79 | Watchog | League Stamp | reverse | ready_finish_routed_exact_label |
| bw1 | 81 | Lillipup | League Stamp | reverse | ready_finish_routed_exact_label |
| bw1 | 107 | Water Energy | League Stamp | reverse | ready_finish_routed_exact_label |
| bw2 | 82 | Unfezant | League Stamp | reverse | ready_finish_routed_exact_label |
| bw3 | 32 | Cryogonal | League Stamp | reverse | ready_finish_routed_exact_label |
| bw8 | 120 | Escape Rope | League Stamp | reverse | ready_finish_routed_exact_label |
| bw11 | 109 | Bianca | League Stamp | reverse | ready_finish_routed_exact_label |
| xy1 | 121 | Muscle Band | League Stamp | reverse | ready_finish_routed_exact_label |
| xy2 | 89 | Fiery Torch | League Stamp | reverse | ready_finish_routed_exact_label |
| xy2 | 91 | Magnetic Storm | League Stamp | reverse | ready_finish_routed_exact_label |
| xy2 | 94 | Pokémon Fan Club | League Stamp | reverse | ready_finish_routed_exact_label |
| xy3 | 88 | Battle Reporter | League Stamp | reverse | ready_finish_routed_exact_label |
| xy8 | 101 | Flabébé | League Stamp | reverse | ready_finish_routed_exact_label |
| xy8 | 102 | Floette | League Stamp | reverse | ready_finish_routed_exact_label |
| sm1 | 41 | Primarina | League Stamp | reverse | ready_finish_routed_exact_label |
| sm3 | 94 | Diancie | League Stamp | reverse | ready_finish_routed_exact_label |
| sm6 | 77 | Buzzwole | League Stamp | reverse | ready_finish_routed_exact_label |
| sm7 | 95 | Metagross | League Stamp | reverse | ready_finish_routed_exact_label |
| sm8 | 108 | Naganadel | League Stamp | reverse | ready_finish_routed_exact_label |
| sm8 | 181 | Lost Blender | League Stamp | reverse | ready_finish_routed_exact_label |

## Blocked Sample

| set | number | name | stamp_label | base_finishes | status |
| --- | --- | --- | --- | --- | --- |
| ex4 | 24 | Team Aqua's Cacnea | Prerelease Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| ex5 | 9 | Machamp | League Stamp | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| ex6 | 50 | Wartortle | Prerelease Stamp | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| ex6 | 98 | Prof. Oak's Research | Professor Program Stamp | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| ex8 | 16 | Deoxys | League Stamp | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| ex8 | 22 | Rayquaza | League Stamp | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| ex8 | 91 | Space Center | Pokemon 10th Anniversary Stamped | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| ex9 | 3 | Exploud | League Stamp | holo, reverse | blocked_missing_exact_finish_phrase |
| ex9 | 60 | Pikachu | San Diego Comic Con International Stamped; 2005 | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| ex9 | 70 | Treecko | Indianapolis GenCon Stamped; 2005 | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| ex10 | 29 | Lugia | Pokemon Rocks America Stamped; 2005 | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| ex11 | 61 | Ditto | Origins Game Fair Stamped; 200 | normal, reverse | blocked_missing_exact_finish_phrase |
| ex11 | 64 | Ditto | Games Expo Stamped; 2007 | normal, reverse | blocked_missing_exact_finish_phrase |
| ex12 | 5 | Gengar | Gym Challenge Stamped; 2006 2007 | holo, reverse | blocked_missing_exact_finish_phrase |
| ex12 | 6 | Golem | League Stamp | holo, reverse | blocked_missing_exact_finish_phrase |
| ex14 | 14 | Blastoise | League Stamp | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| ex15 | 79 | Professor Elm's Training Method | Professor Program Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| dp1 | 3 | Electivire | League Stamp | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| dp1 | 7 | Luxray | League Stamp | holo, reverse | blocked_missing_exact_finish_phrase |
| dpp | DP25 | Tropical Wind | Finalist Stamp | holo, normal | blocked_missing_exact_finish_phrase |
| dp3 | 122 | Professor Oak's Visit | Professor Program Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| dp6 | 2 | Dragonite | Staff Stamp | holo, reverse | blocked_missing_exact_finish_phrase |
| dp6 | 130 | Buck's Training | Staff Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| pl2 | 89 | Bebe's Search | League Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| pl2 | 96 | Team Galactic's Invention G-109 SP Radar | League Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| pl2 | 98 | Volkner's Philosophy | League Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| pl3 | 5 | Garchomp | League Stamp | cracked_ice, holo, reverse | blocked_missing_exact_finish_phrase |
| pl3 | 136 | Cynthia's Guidance | PokéBall Stamped, Player Rewards Promo; 2009 2010 | normal, reverse | blocked_missing_exact_finish_phrase |
| hgss1 | 40 | Donphan | Player Rewards Crosshatch Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| hgss1 | 100 | Professor Elm's Training Method | Professor Program Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| hgss2 | 7 | Politoed | League Stamp | holo, reverse | blocked_missing_exact_finish_phrase |
| hgss2 | 21 | Poliwrath | League Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| hgss2 | 24 | Steelix | Player Rewards Crosshatch Stamp | holo, normal, reverse | blocked_missing_exact_finish_phrase |
| hgss2 | 37 | Poliwhirl | Staff Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| hgss3 | 79 | Darkness Energy | League Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| hgss3 | 80 | Metal Energy | League Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| hgss4 | 20 | Electivire | Prerelease Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| hgss4 | 85 | Black Belt | League Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| hgss4 | 88 | Seeker | League Stamp | normal, reverse | blocked_missing_exact_finish_phrase |
| col1 | 88 | Grass Energy | Player Rewards Crosshatch Stamp | holo, normal, reverse | blocked_missing_exact_finish_phrase |

## Next Safe Work

- Build a guarded dry-run package only from `ready_finish_routed_exact_label`, `ready_finish_routed_exact_label_external_finish`, and `ready_single_base_finish` rows.
- Do not route rows with missing or conflicting finish phrases.
- Do not infer finish from rarity, era, or generic stamped labels.
