# PKG-17I3 PriceCharting Stamp Label Acquisition V1

Audit-only extraction from the local PriceCharting Pokemon Cards CSV. Rows are candidate-only and are not write authority.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

- target_rows: 178
- candidate_rows: 42
- blocked_rows: 136
- csv_rows_reviewed: 73212
- fixture_records_written: 42
- fingerprint_sha256: `8e77f0e72aecae4a1e599f49b764a4a10b51cfe274133a09f24aa9e69e7d812a`

| status | rows |
| --- | --- |
| blocked_no_pricecharting_stamp_label_candidate | 128 |
| candidate_pricecharting_exact_stamp_label | 42 |
| blocked_conflicting_pricecharting_stamp_label_candidates | 8 |

## Block Reasons

| reason | rows |
| --- | --- |
| no_exact_product_with_stamp_label | 128 |
| conflicting_stamp_labels | 8 |

## Candidate Rows

| set | number | card | finish | candidate stamp label | PriceCharting product |
| --- | --- | --- | --- | --- | --- |
| bog | 4 | Rocket's Scizor | normal | Winner Stamp | Rocket's Scizor [Winner] #4 |
| bog | 5 | Rocket's Sneasel | normal | Winner Stamp | Rocket's Sneasel [Winner] #5 |
| bw10 | 14 | Squirtle |  | Build-A-Bear Workshop Stamp | Squirtle [Build A Bear] #14 |
| bw11 | 17 | Charmander |  | Build-A-Bear Workshop Stamp | Charmander [Build-a-Bear] #17 |
| bw5 | 1 | Bulbasaur |  | Build-A-Bear Workshop Stamp | Bulbasaur [Build A Bear] #1 |
| bw5 | 60 | Umbreon |  | Staff Stamp | Umbreon [Regional Staff] #60 |
| bwp | BW53 | Flygon |  | Staff Stamp | Flygon [Staff] #BW53 |
| dp6 | 43 | Uxie |  | League Stamp | Uxie [League] #43 |
| g1 | 8 | Tangela |  | Toys R Us Stamp | Tangela [Toys R Us] #8 |
| g1 | 22 | Magikarp |  | Toys R Us Stamp | Magikarp [Toys R Us] #22 |
| g1 | 26 | Pikachu |  | Toys R Us Stamp | Pikachu [Toys R Us] #26 |
| g1 | 32 | Slowpoke |  | Toys R Us Stamp | Slowpoke [Toys R Us] #32 |
| g1 | 50 | Clefairy |  | Toys R Us Stamp | Clefairy [Toys R Us] #50 |
| g1 | 53 | Meowth |  | Toys R Us Stamp | Meowth [Toys R Us] #53 |
| pl1 | 91 | Riolu |  | Staff Stamp | Riolu [Staff] #91 |
| sm1 | 26 | Incineroar |  | League Stamp | Incineroar [Pokemon League] #26 |
| sm1 | 28 | Psyduck |  | Build-A-Bear Workshop Stamp | Psyduck [Build-A-Bear] #28 |
| sm1 | 64 | Cosmog |  | Toys R Us Stamp | Cosmog [Toys R Us Promo] #64 |
| sm3 | 110 | Stufful |  | Toys R Us Stamp | Stufful [Toys R Us] #110 |
| sm4 | 71 | Jigglypuff |  | Build-A-Bear Workshop Stamp | Jigglypuff [Build-A-Bear] #71 |
| sm4 | 84 | Regigigas |  | League Stamp | Regigigas [1st Place League] #84 |
| sv02 | 60 | Baxcalibur |  | Prize Pack Stamp | Baxcalibur [Prize Pack] #60 |
| sv02 | 105 | Tinkaton |  | GameStop Stamp | Tinkaton [GameStop] #105 |
| sv05 | 81 | Iron Crown ex | holo | Prize Pack Stamp | Iron Crown Ex [Prize Pack] #81 |
| sv05 | 121 | Miraidon |  | Prize Pack Stamp | Miraidon [Prize Pack] #121 |
| sv07 | 119 | Bouffalant |  | Prize Pack Stamp | Bouffalant [Prize Pack Cosmos Holo] #119 |
| sv09 | 27 | N's Darmanitan |  | Prize Pack Stamp | N's Darmanitan [Prize Pack] #27 |
| sv09 | 55 | Iono's Kilowattrel |  | Prize Pack Stamp | Iono's Kilowattrel [Prize Pack] #55 |
| sv09 | 67 | Lillie's Ribombee |  | Prize Pack Stamp | Lillie's Ribombee [Prize Pack Cosmos Holo] #67 |
| sv09 | 116 | N's Reshiram |  | Prize Pack Stamp | N's Reshiram [Prize Pack Cosmos Holo] #116 |
| sv09 | 150 | Levincia |  | Prize Pack Stamp | Levincia [Prize Pack Cosmo Holo] #150 |
| sv10 | 20 | Team Rocket's Spidops |  | Prize Pack Stamp | Team Rocket's Spidops [Prize Pack Cosmos Holo] #20 |
| svp | 91 | Koraidon |  | Staff Stamp | Koraidon [Staff] #91 |
| svp | 92 | Miraidon |  | Staff Stamp | Miraidon [Staff] #92 |
| svp | 153 | Magneton |  | Staff Stamp | Magneton [Staff] #153 |
| swsh8 | 237 | Quick Ball |  | Staff Stamp | Quick Ball [North America Championships Staff] #237 |
| xy12 | 41 | Electabuzz |  | Toys R Us Stamp | Electabuzz [Toys R Us] #41 |
| xy2 | 80 | Snorlax |  | Build-A-Bear Workshop Stamp | Snorlax [Build-a-Bear] #80 |
| xy5 | 20 | Vulpix |  | Build-A-Bear Workshop Stamp | Vulpix [Build-a-Bear] #20 |
| xy6 | 67 | Meowth |  | Build-A-Bear Workshop Stamp | Meowth [Build-A-Bear] #67 |
| xyp | XY91 | Champions Festival |  | Staff Stamp | Champions Festival [Staff] #XY91 |
| xyp | XY176 | Champions Festival |  | Staff Stamp | Champions Festival [Staff] #XY176 |

## Rule

Candidate rows require a separate readiness package before any DB write. This report does not authorize parent inserts, child inserts, deletes, cleanup, or migrations.
