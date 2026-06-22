# League Staff 153 Taxonomy Review V1

Audit-only taxonomy review for the single League Stamp row that had one exact finish source.

## Decision

Do not promote.

The sources support that Vivid Voltage League Staff #153 has a Reverse Holo / reverse foil lane, but the additional sources do not support the queued `league_cup_staff_stamp` label. They point to Professor Program / generic reverse wording instead.

## Target

| field | value |
| --- | --- |
| set_key | swsh4 |
| set_name | Vivid Voltage |
| card_number | 153 |
| card_name | League Staff |
| queued_variant_key | league_cup_staff_stamp |
| queued_stamp_label | League Cup Staff Stamp |
| candidate_finish_key | reverse |
| review_status | finish_supported_but_queued_stamp_label_not_supported |

## Evidence

| source | source kind | supports finish | supports queued stamp | observed label | url |
| --- | --- | --- | --- | --- | --- |
| pricecharting_reverse_holo | marketplace_checklist | reverse | false | League Staff [Reverse Holo] | https://www.pricecharting.com/game/pokemon-vivid-voltage/league-staff-reverse-holo-153 |
| pokellector_card_page | collector_reference | reverse | false | Reverse Holo Professor Program Stamp | https://www.pokellector.com/Vivid-Voltage-Expansion/League-Staff-Card-153 |
| misprint_related_marketplace_text | marketplace_checklist | reverse | false | League Staff-Reverse Foil Professor Program | https://www.misprint.com/card/13658702 |
| official_pokemon_card_database | official_gallery |  | false | Base Vivid Voltage League Staff identity only | https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/swsh4/153/ |

## Reason

- PriceCharting supports a reverse-holo page for League Staff #153.
- Pokellector text says Reverse Holo Professor Program Stamp, not League Cup Staff Stamp.
- Misprint related text also points to Professor Program wording for League Staff-Reverse Foil.
- Official Pokemon confirms only the base Vivid Voltage card identity, not a stamped variant.

The row remains a taxonomy blocker, not a write candidate.

## Safety

- No DB writes.
- No migrations.
- No parent inserts.
- No child inserts.
- No promotion from mismatched stamp labels.
