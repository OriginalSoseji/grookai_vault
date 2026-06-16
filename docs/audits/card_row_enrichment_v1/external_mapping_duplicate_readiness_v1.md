# External Mapping Duplicate Readiness V1

Audit-only readiness plan for the `external_mappings_source_card_duplicates` debt.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false

## Principle

Do not deactivate product aliases or suffix/base aliases until the source-specific owner policy is explicit.

## Totals

| metric | value |
| --- | --- |
| duplicate_groups | 70 |
| write_ready_groups | 0 |
| blocked_or_preserve_groups | 70 |
| ready_mapping_rows_in_groups | 0 |

## By Readiness Class

| readiness class | groups |
| --- | --- |
| pokemonapi_suffix_alias_review | 46 |
| justtcg_secret_rare_synonym_review | 13 |
| tcgdex_suffix_alias_review | 5 |
| justtcg_product_alias_preserve_until_sidecar | 3 |
| justtcg_text_alias_review | 1 |
| manual_source_specific_review | 1 |
| pocket_product_alias_blocked | 1 |

## Write-Ready Groups

_None._

## Blocked / Preserve Samples

| source | set | number | name | class |
| --- | --- | --- | --- | --- |
| justtcg | A4a | 074 | Yamper | pocket_product_alias_blocked |
| justtcg | me02 | 054 | Gastly | justtcg_text_alias_review |
| justtcg | sm3 | 148 | Golisopod-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 149 | Tapu Bulu-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 150 | Charizard-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 151 | Salazzle-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 152 | Tapu Fini-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 153 | Necrozma-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 154 | Machamp-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 155 | Lycanroc-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 156 | Marshadow-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 157 | Alolan Muk-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 158 | Darkrai-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 159 | Gardevoir-GX | justtcg_secret_rare_synonym_review |
| justtcg | sm3 | 160 | Noivern-GX | justtcg_secret_rare_synonym_review |
| justtcg | svp | 107 | Mareep | justtcg_product_alias_preserve_until_sidecar |
| justtcg | svp | 108 | Flaaffy | justtcg_product_alias_preserve_until_sidecar |
| justtcg | svp | 109 | Ampharos | justtcg_product_alias_preserve_until_sidecar |
| pokemonapi | sm1 | 101a | Eevee | pokemonapi_suffix_alias_review |
| pokemonapi | sm10 | 182a | Pokégear 3.0 | pokemonapi_suffix_alias_review |
| pokemonapi | sm10 | 189a | Welder | pokemonapi_suffix_alias_review |
| pokemonapi | sm10 | 195a | Dedenne-GX | pokemonapi_suffix_alias_review |
| pokemonapi | sm11 | 191 | Cherish Ball | pokemonapi_suffix_alias_review |
| pokemonapi | sm11 | 206 | Reset Stamp | pokemonapi_suffix_alias_review |
| pokemonapi | sm11 | 79 | Jirachi-GX | pokemonapi_suffix_alias_review |
| pokemonapi | sm12 | 143a | Togepi & Cleffa & Igglybuff-GX | pokemonapi_suffix_alias_review |
| pokemonapi | sm2 | 121 | Choice Band | pokemonapi_suffix_alias_review |
| pokemonapi | sm2 | 124 | Enhanced Hammer | pokemonapi_suffix_alias_review |
| pokemonapi | sm2 | 125 | Field Blower | pokemonapi_suffix_alias_review |
| pokemonapi | sm2 | 128a | Max Potion | pokemonapi_suffix_alias_review |
| pokemonapi | sm2 | 130a | Rescue Stretcher | pokemonapi_suffix_alias_review |
| pokemonapi | sm2 | 157a | Metagross-GX | pokemonapi_suffix_alias_review |
| pokemonapi | sm2 | 19a | Alolan Sandshrew | pokemonapi_suffix_alias_review |
| pokemonapi | sm2 | 21a | Alolan Vulpix | pokemonapi_suffix_alias_review |
| pokemonapi | sm2 | 51 | Garbodor | pokemonapi_suffix_alias_review |
| pokemonapi | sm2 | 60 | Tapu Lele-GX | pokemonapi_suffix_alias_review |
| pokemonapi | sm2 | 92 | Sylveon-GX | pokemonapi_suffix_alias_review |
| pokemonapi | sm6 | 102a | Beast Ring | pokemonapi_suffix_alias_review |
| pokemonapi | sm6 | 112 | Metal Frying Pan | pokemonapi_suffix_alias_review |
| pokemonapi | sm6 | 113 | Mysterious Treasure | pokemonapi_suffix_alias_review |
| pokemonapi | sm6 | 2 | Alolan Exeggutor | pokemonapi_suffix_alias_review |
| pokemonapi | sm7 | 10a | Sceptile | pokemonapi_suffix_alias_review |
| pokemonapi | sm7 | 123 | Acro Bike | pokemonapi_suffix_alias_review |
| pokemonapi | sm7 | 148a | Tate & Liza | pokemonapi_suffix_alias_review |
| pokemonapi | sm7 | 177 | Rayquaza-GX | pokemonapi_suffix_alias_review |
| pokemonapi | sm8 | 172 | Electropower | pokemonapi_suffix_alias_review |
| pokemonapi | sm8 | 187 | Net Ball | pokemonapi_suffix_alias_review |
| pokemonapi | sm8 | 188a | Professor Elm's Lecture | pokemonapi_suffix_alias_review |
| pokemonapi | sm8 | 189 | Sightseer | pokemonapi_suffix_alias_review |
| pokemonapi | smp | SM103 | Lunala-GX | pokemonapi_suffix_alias_review |
| pokemonapi | smp | SM104 | Solgaleo-GX | pokemonapi_suffix_alias_review |
| pokemonapi | smp | SM30 | Tapu Koko | pokemonapi_suffix_alias_review |
| pokemonapi | xy10 | 105 | N | pokemonapi_suffix_alias_review |
| pokemonapi | xy10 | 111a | Shauna | pokemonapi_suffix_alias_review |
| pokemonapi | xy10 | 43a | Regirock-EX | pokemonapi_suffix_alias_review |
| pokemonapi | xy10 | 54a | Zygarde-EX | pokemonapi_suffix_alias_review |
| pokemonapi | xy2 | 88a | Blacksmith | pokemonapi_suffix_alias_review |
| pokemonapi | xy3 | 55 | M Lucario-EX | pokemonapi_suffix_alias_review |
| pokemonapi | xy4 | 24 | M Manectric-EX | pokemonapi_suffix_alias_review |
| pokemonapi | xy4 | 65a | Aegislash-EX | pokemonapi_suffix_alias_review |
| pokemonapi | xyp | XY150a | Yveltal-EX | pokemonapi_suffix_alias_review |
| pokemonapi | xyp | XY198a | M Camerupt-EX | pokemonapi_suffix_alias_review |
| pokemonapi | xyp | XY200 | M Sharpedo-EX | pokemonapi_suffix_alias_review |
| pokemonapi | xyp | XY67 | Jirachi | pokemonapi_suffix_alias_review |
| tcgdex | cel25c | 15 | Venusaur | manual_source_specific_review |
| tcgdex | xy10 | 111a | Shauna | tcgdex_suffix_alias_review |
| tcgdex | xy10 | 43a | Regirock-EX | tcgdex_suffix_alias_review |
| tcgdex | xy10 | 54a | Zygarde-EX | tcgdex_suffix_alias_review |
| tcgdex | xy2 | 88a | Blacksmith | tcgdex_suffix_alias_review |
| tcgdex | xy8 | 146a | Professor's Letter | tcgdex_suffix_alias_review |

Recommended next step: `create_product_alias_sidecar_policy_before_deactivation`

Fingerprint: `7b6f11fc16f4a6e409dfe5af189df3ac9fc89552904d091f4b7f122ebb8c2ddf`
