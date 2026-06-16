# ENRICH-22A Parent Identity Domain Backfill Dry Run

Generated at: 2026-06-16T02:13:38.706Z

Mode: guarded dry-run, rollback-only.

DB writes performed: false
Migrations created: false
Cleanup performed: false

## Scope

Backfill only `card_prints.identity_domain` from the owning set's `identity_domain_default` where:

- parent `identity_domain` is currently null
- set `identity_domain_default` is `pokemon_eng_standard`
- parent already has an active `card_print_identity`

No child rows, identity rows, external mappings, species rows, traits, images, deletes, merges, or migrations are touched.

## Summary

- target parent rows: 1115
- target sets: 70
- inheritable standard rows: 1115
- rows without active identity: 0
- dry-run updated rows: 1115
- dry-run proof hash: `50cf4cfa1f3f238220285048805923ce9c64c3f83a82b629996bb0034fc1d370`
- package fingerprint: `be0295df8c26e2bb202e62c9bacc21b770b73da648a05c0e0943ce05f5650ee2`

## Top Target Sets

| set_code | set_name | domain_default | parents | active_identity | child_printing | active_mapping |
| --- | --- | --- | --- | --- | --- | --- |
| me03 | Perfect Order | pokemon_eng_standard | 126 | 126 | 114 | 124 |
| me04 | Chaos Rising | pokemon_eng_standard | 122 | 122 | 122 | 122 |
| smp | SM Black Star Promos | pokemon_eng_standard | 97 | 97 | 0 | 97 |
| sm115 | Hidden Fates | pokemon_eng_standard | 94 | 94 | 94 | 94 |
| mep | MEP Black Star Promos | pokemon_eng_standard | 63 | 63 | 50 | 50 |
| mfb | My First Battle | pokemon_eng_standard | 34 | 34 | 34 | 34 |
| bwp | BW Black Star Promos | pokemon_eng_standard | 30 | 30 | 2 | 30 |
| swsh10 | Astral Radiance | pokemon_eng_standard | 29 | 29 | 0 | 29 |
| me01 | Mega Evolution | pokemon_eng_standard | 28 | 28 | 0 | 28 |
| sv06 | Twilight Masquerade | pokemon_eng_standard | 28 | 28 | 4 | 28 |
| sv05 | Temporal Forces | pokemon_eng_standard | 25 | 25 | 0 | 25 |
| sv04 | Paradox Rift | pokemon_eng_standard | 24 | 24 | 0 | 24 |
| swsh9 | Brilliant Stars | pokemon_eng_standard | 24 | 24 | 1 | 24 |
| swsh11 | Lost Origin | pokemon_eng_standard | 21 | 21 | 0 | 21 |
| bw11 | Legendary Treasures | pokemon_eng_standard | 20 | 20 | 20 | 20 |
| swsh8 | Fusion Strike | pokemon_eng_standard | 20 | 20 | 0 | 20 |
| sv01 | Scarlet & Violet | pokemon_eng_standard | 19 | 19 | 1 | 19 |
| sv08 | Surging Sparks | pokemon_eng_standard | 19 | 19 | 1 | 19 |
| sv07 | Stellar Crown | pokemon_eng_standard | 18 | 18 | 1 | 18 |
| sv10 | Destined Rivals | pokemon_eng_standard | 18 | 18 | 0 | 18 |
| 2023sv | McDonald's Collection 2023 | pokemon_eng_standard | 15 | 15 | 15 | 15 |
| 2024sv | McDonald's Collection 2024 | pokemon_eng_standard | 15 | 15 | 15 | 15 |
| sv02 | Paldea Evolved | pokemon_eng_standard | 15 | 15 | 0 | 15 |
| swsh12 | Silver Tempest | pokemon_eng_standard | 15 | 15 | 0 | 15 |
| sv8pt5 | Prismatic Evolutions | pokemon_eng_standard | 14 | 14 | 0 | 14 |
| sv6pt5 | Shrouded Fable | pokemon_eng_standard | 13 | 13 | 0 | 13 |
| sve | Scarlet & Violet Energies | pokemon_eng_standard | 12 | 12 | 12 | 12 |
| svp | Scarlet & Violet Black Star Promos | pokemon_eng_standard | 12 | 12 | 8 | 12 |
| np | Nintendo Black Star Promos | pokemon_eng_standard | 11 | 11 | 0 | 11 |
| swsh6 | Chilling Reign | pokemon_eng_standard | 10 | 10 | 0 | 10 |
| mee | Mega Evolution Energy | pokemon_eng_standard | 8 | 8 | 8 | 8 |
| sv09 | Journey Together | pokemon_eng_standard | 8 | 8 | 1 | 8 |
| sv10.5b | Black Bolt | pokemon_eng_standard | 8 | 8 | 0 | 8 |
| swsh5 | Battle Styles | pokemon_eng_standard | 8 | 8 | 0 | 8 |
| swsh7 | Evolving Skies | pokemon_eng_standard | 8 | 8 | 0 | 8 |
| sv03 | Obsidian Flames | pokemon_eng_standard | 7 | 7 | 1 | 7 |
| swsh12.5 | Crown Zenith | pokemon_eng_standard | 6 | 6 | 0 | 6 |
| xya | Yello A Alternate | pokemon_eng_standard | 6 | 6 | 6 | 6 |
| ecard2 | Aquapolis | pokemon_eng_standard | 5 | 5 | 5 | 5 |
| ecard3 | Skyridge | pokemon_eng_standard | 5 | 5 | 5 | 5 |

## Guard Result

- pass: true
- stop findings: none

## Recommended Approval

`Approve real ENRICH-22A-PARENT-IDENTITY-DOMAIN-BACKFILL apply only. Fingerprint: be0295df8c26e2bb202e62c9bacc21b770b73da648a05c0e0943ce05f5650ee2. Scope: 1115 parent card_print identity_domain updates from null to pokemon_eng_standard; target sets=70; every target already has active identity; dry-run proof: 50cf4cfa1f3f238220285048805923ce9c64c3f83a82b629996bb0034fc1d370 == 50cf4cfa1f3f238220285048805923ce9c64c3f83a82b629996bb0034fc1d370. No child writes. No identity writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.`
