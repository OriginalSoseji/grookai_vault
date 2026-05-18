# Master Set Variant Contract V1 Audit

Generated: 2026-05-18T16:35:42.969Z

## Inventory

- card_prints: 25404
- card_prints with variant_key: 2355
- card_prints with printed_identity_modifier: 194
- card_prints with variants jsonb: 662
- finish_keys: 5
- card_printings: 55742
- provisional card_printings: 0
- external_printing_mappings: 167
- premium_parallel_eligibility rows: 167

## Duplicate-Looking Groups

- groups by set_code + number + name with more than one row: 383
- affected rows: 832

## Finish Keys

- normal: Normal (active=true)
- reverse: Reverse Holo (active=true)
- holo: Holo (active=true)
- pokeball: Poké Ball (active=true)
- masterball: Master Ball (active=true)

## High-Risk Sets

- sv03.5 / 151: rows=210, masterball_signals=0, pokeball_signals=3, reverse_signals=0, child_parallel_rows=153
- swsh10 / Astral Radiance: rows=246, masterball_signals=0, pokeball_signals=30, reverse_signals=0, child_parallel_rows=128
- sv05 / Temporal Forces: rows=246, masterball_signals=0, pokeball_signals=27, reverse_signals=0, child_parallel_rows=140
- me01 / Mega Evolution: rows=217, masterball_signals=0, pokeball_signals=27, reverse_signals=0, child_parallel_rows=122
- sv04 / Paradox Rift: rows=292, masterball_signals=0, pokeball_signals=25, reverse_signals=0, child_parallel_rows=137
- sv06 / Twilight Masquerade: rows=255, masterball_signals=0, pokeball_signals=25, reverse_signals=0, child_parallel_rows=147
- sv01 / Scarlet & Violet: rows=283, masterball_signals=0, pokeball_signals=24, reverse_signals=0, child_parallel_rows=168
- sv10 / Destined Rivals: rows=269, masterball_signals=0, pokeball_signals=23, reverse_signals=0, child_parallel_rows=169
- swsh11 / Lost Origin: rows=252, masterball_signals=0, pokeball_signals=23, reverse_signals=0, child_parallel_rows=149
- swsh9 / Brilliant Stars: rows=211, masterball_signals=0, pokeball_signals=23, reverse_signals=0, child_parallel_rows=124
- swsh8 / Fusion Strike: rows=304, masterball_signals=0, pokeball_signals=20, reverse_signals=0, child_parallel_rows=230
- sv08 / Surging Sparks: rows=271, masterball_signals=0, pokeball_signals=19, reverse_signals=0, child_parallel_rows=165
- sv02 / Paldea Evolved: rows=295, masterball_signals=0, pokeball_signals=15, reverse_signals=0, child_parallel_rows=177
- swsh12 / Silver Tempest: rows=230, masterball_signals=0, pokeball_signals=15, reverse_signals=0, child_parallel_rows=142
- sv07 / Stellar Crown: rows=194, masterball_signals=0, pokeball_signals=15, reverse_signals=0, child_parallel_rows=125
- sv6pt5 / Shrouded Fable: rows=112, masterball_signals=0, pokeball_signals=12, reverse_signals=0, child_parallel_rows=55
- swsh6 / Chilling Reign: rows=244, masterball_signals=0, pokeball_signals=11, reverse_signals=0, child_parallel_rows=135
- sve / Scarlet & Violet Energies: rows=27, masterball_signals=0, pokeball_signals=11, reverse_signals=0, child_parallel_rows=0
- swsh7 / Evolving Skies: rows=247, masterball_signals=0, pokeball_signals=10, reverse_signals=0, child_parallel_rows=133
- sv8pt5 / Prismatic Evolutions: rows=194, masterball_signals=0, pokeball_signals=10, reverse_signals=0, child_parallel_rows=180
- sv09 / Journey Together: rows=198, masterball_signals=0, pokeball_signals=8, reverse_signals=0, child_parallel_rows=143
- swsh5 / Battle Styles: rows=191, masterball_signals=0, pokeball_signals=8, reverse_signals=0, child_parallel_rows=123
- swsh12.5 / Crown Zenith Galarian Gallery: rows=237, masterball_signals=0, pokeball_signals=7, reverse_signals=0, child_parallel_rows=112
- sv03 / Obsidian Flames: rows=237, masterball_signals=0, pokeball_signals=6, reverse_signals=0, child_parallel_rows=176
- sv10.5b / Black Bolt: rows=180, masterball_signals=0, pokeball_signals=6, reverse_signals=0, child_parallel_rows=172

## Source Evidence

- TCGdex cards: 18962; rarity reverse=0; rarity masterball=0; rarity pokeball=0
- raw_imports PokemonAPI/TCGdex rows: 30110; reverse payload rows=0; masterball payload rows=9; pokeball payload rows=0; holofoil rows=19425

## Findings

### Current Storage Surfaces

- `card_prints.variant_key` is populated for canonical/special parent distinctions, especially stamps and gallery lanes.
- `card_prints.printed_identity_modifier` is currently narrow; the observed populated value is `delta_species`.
- `card_prints.variants` exists and carries legacy flags such as `normal`, `holo`, `reverse`, `firstEdition`, `shadowless`, `stamped`, and `error`.
- `finish_keys` and `card_printings` already exist and are the correct direction for master-set finish/parallel tracking.
- `premium_parallel_eligibility` already exists and is a likely source for Poké Ball/Master Ball eligibility, but it is not currently surfaced by Grookai Dex.

### Duplicate-Looking Rows

There are 383 groups where `set_code + number + name` has more than one `card_prints` row. These are not necessarily duplicates. Sample groups show valid print distinctions:

- base set row plus `prerelease_stamp`
- base set row plus `staff_prerelease_stamp`
- multiple event stamp variants under the same promo number
- stamped variants with no child printing rows

The UI must therefore never assume duplicate-looking rows are duplicate data. It must display the distinguishing identity or finish label.

### Finish Coverage

Current `finish_keys`:

- `normal`
- `reverse`
- `holo`
- `pokeball`
- `masterball`

Current `card_printings` counts:

- `normal`: 19920
- `reverse`: 18630
- `holo`: 16895
- `pokeball`: 230
- `masterball`: 67

This proves reverse holo and premium parallel modeling is already partly present under child printings. The missing piece is a governed master-set read model and display contract.

### High-Risk Sets

The highest priority set is `sv03.5 / 151`.

Audit result:

- rows: 210
- child parallel rows: 153
- direct `variant_key`/rarity masterball signals: 0
- direct `variant_key`/rarity pokeball signals: 3

Interpretation:

- The 151 Poké Ball/Master Ball surface is probably represented through `card_printings`/`premium_parallel_eligibility`, not parent `variant_key`.
- Any Dex or master-set UI that only reads `card_prints.variant_key` will miss important master-set variants.

Other sets with significant child parallel rows include `swsh10`, `sv05`, `me01`, `sv04`, `sv06`, `sv01`, `sv10`, `swsh11`, `swsh9`, `swsh8`, and modern SV sets.

### Source Data Limits

- TCGdex staging rarity fields do not expose reverse/masterball/pokeball as rarity strings in the audited rows.
- Raw PokemonAPI/TCGdex payload text contains broad `holofoil` evidence, but direct reverse/masterball/pokeball evidence is sparse.
- Source payloads are useful evidence but cannot be the sole master-set authority.

### Audit Conclusion

Grookai Dex exposed a real master-set correctness gap. The repo has partial foundations for child printings, but Grookai Dex and future master-set progress need a formal read model that joins:

- parent canonical `card_prints`
- child `card_printings`
- `finish_keys`
- `premium_parallel_eligibility`
- stamped/special parent variants from `variant_key`

No migration was created and no DB writes were performed for this audit.
