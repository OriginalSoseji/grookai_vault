# PKG-11A Stamped Parent Identity Guarded Dry Run V1

Rollback-only dry run for the first stamped canonical parent identity pilot. This does not activate `stamped` as a child finish.

## Status

- dry_run_status: `pkg11a_stamped_parent_identity_completed_rolled_back_no_durable_change`
- fingerprint: `bfd77c554ba3ee32c18f523b1211d95aa7442dda6fccfeee2c0ebeea958fe6ea`
- target_parent_rows: 16
- target_child_rows: 16
- durable_db_writes_performed: `false`
- stop_findings: 0

## Rollback Proof

- before_hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- after_hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- match: `true`

## Targets

| set | number | name | stamp_label | variant_key | child_finish |
| --- | --- | --- | --- | --- | --- |
| mep | 1 | Meganium | Staff Stamp | staff_stamp | holo |
| mep | 2 | Inteleon | Staff Stamp | staff_stamp | holo |
| mep | 3 | Alakazam | Staff Stamp | staff_stamp | holo |
| mep | 4 | Lunatone | Staff Stamp | staff_stamp | holo |
| mep | 14 | Ceruledge | Staff Stamp | staff_stamp | holo |
| mep | 15 | Zacian | Staff Stamp | staff_stamp | holo |
| mep | 16 | Flygon | Staff Stamp | staff_stamp | holo |
| mep | 17 | Toxtricity | Staff Stamp | staff_stamp | holo |
| swshp | SWSH065 | Eevee V | Battle Academy Deck Mark | battle_academy_deck_mark | holo |
| swsh1 | 139 | Zamazenta V | Play! Pokemon Stamp | play_pokemon_stamp | holo |
| swsh2 | 55 | Eiscue V | Snowflake Stamp | snowflake_stamp | holo |
| swsh6 | 45 | Ice Rider Calyrex V | Snowflake Stamp | snowflake_stamp | holo |
| swsh6 | 46 | Ice Rider Calyrex VMAX | Snowflake Stamped | snowflake_stamped | holo |
| swsh8 | 43 | Cinderace V | Battle Academy Deck Mark | battle_academy_deck_mark | holo |
| swsh10 | 46 | Radiant Greninja | Gym Stamp | gym_stamp | holo |
| svp | 224 | Paradise Resort | World Championships 2025 Staff Stamp | world_championships_2025_staff_stamp | normal |

## Recommended Approval Text

```text
Approve real PKG-11A-STAMPED-CANONICAL-PARENT-IDENTITY-PILOT apply only. Fingerprint: bfd77c554ba3ee32c18f523b1211d95aa7442dda6fccfeee2c0ebeea958fe6ea. Scope: 16 stamped canonical parent inserts and 16 child printing inserts using unambiguous base child finishes; child finishes holo=15, normal=1; no stamped finish activation; no deletes; no merges; no unsupported cleanup. Dry-run proof: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 == 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. No global apply. No migrations.
```
