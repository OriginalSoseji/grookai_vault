# Pokemon Center Stamp Gap Audit V1

Audit-only source discovery and DB comparison for English physical Pokemon Center stamped card identity variants.

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- raw_pricecharting_csv_committed: false
- source_tls_note: PriceCharting CSV acquisition used curl --ssl-no-revoke due local Windows TLS chain behavior; no insecure behavior is used by runtime code.

## Summary

- candidate_rows: 29
- ready_parent_and_child_missing: 0
- ready_child_missing_existing_parent: 0
- existing_complete: 29
- blocked: 0

## Ready Rows

| set | number | card | variant | finish | status | sources |
| --- | --- | --- | --- | --- | --- | --- |

## Existing Complete

| set | number | card | variant | finish |
| --- | --- | --- | --- | --- |
| basep | 051 | Rapidash | pokemon_center_ny_stamp | normal |
| basep | 052 | Ho-oh | pokemon_center_ny_stamp | normal |
| mep | 009 | Alakazam | pokemon_center_stamp | holo |
| mep | 010 | Riolu | pokemon_center_stamp | holo |
| mep | 022 | Charcadet | pokemon_center_stamp | holo |
| mep | 031 | N's Zekrom | pokemon_center_stamp | holo |
| mep | 070 | Tyrunt | pokemon_center_stamp | holo |
| mep | 080 | Fennekin | pokemon_center_stamp | holo |
| sv01 | 155 | Lechonk | pokemon_center_stamp | reverse |
| sv03.5 | 007 | Squirtle | pokemon_center_stamp | reverse |
| svp | 013 | Miraidon | pokemon_center_stamp | holo |
| svp | 014 | Koraidon | pokemon_center_stamp | holo |
| svp | 027 | Pikachu | pokemon_center_stamp | holo |
| svp | 044 | Charmander | pokemon_center_stamp | holo |
| svp | 051 | Snorlax | pokemon_center_stamp | holo |
| svp | 065 | Scream Tail | pokemon_center_stamp | holo |
| svp | 066 | Iron Bundle | pokemon_center_stamp | holo |
| svp | 075 | Mimikyu | pokemon_center_stamp | holo |
| svp | 097 | Flutter Mane | pokemon_center_stamp | holo |
| svp | 098 | Iron Thorns | pokemon_center_stamp | holo |
| svp | 123 | Teal Mask Ogerpon | pokemon_center_stamp | holo |
| svp | 129 | Pecharunt | pokemon_center_stamp | holo |
| svp | 141 | Noctowl | pokemon_center_stamp | holo |
| svp | 159 | Magneton | pokemon_center_stamp | holo |
| svp | 173 | Eevee | pokemon_center_stamp | holo |
| svp | 189 | N's Zorua | pokemon_center_stamp | holo |
| svp | 203 | Team Rocket's Wobbuffet | pokemon_center_stamp | holo |
| svp | 209 | Thundurus | pokemon_center_stamp | holo |
| svp | 210 | Tornadus | pokemon_center_stamp | holo |

## Blocked / Review

| set | number | card | finish | status | reason | sources |
| --- | --- | --- | --- | --- | --- | --- |

## Notes

- Pokemon Center stamps are parent identity variants, not `finish_key=stamped` child rows.
- Child printings must use the real active finish such as `holo`, `reverse`, or `normal`.
- Ordinary Trainer cards named "Pokemon Center" and sealed Pokemon Center ETB products are excluded.
- This report does not authorize DB writes. Ready rows still require guarded dry-run proof before apply.
