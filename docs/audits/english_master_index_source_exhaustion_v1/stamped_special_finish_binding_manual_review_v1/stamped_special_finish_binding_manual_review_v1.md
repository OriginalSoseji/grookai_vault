# Stamped/Special Finish Binding Manual Review V1

Generated: 2026-06-21

This is audit-only. It preserves exact source evidence for stamped/special finish binding candidates discovered after the broad source exhaustion pass.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- write_ready_now: 0

## Candidate Preserved

| set | number | card | variant | candidate finish | status |
| --- | --- | --- | --- | --- | --- |
| bw1 | 105 | Grass Energy | Play! Pokemon Stamp | crosshatch / reverse candidate | manual_finish_binding_candidate_not_write_ready |
| bw1 | 106 | Fire Energy | Play! Pokemon Stamp | crosshatch / reverse candidate | manual_finish_binding_candidate_not_write_ready |
| bw1 | 111 | Darkness Energy | Play! Pokemon Stamp | crosshatch / reverse candidate | manual_finish_binding_candidate_not_write_ready |

## Evidence Fixtures

```text
docs/audits/verified_master_set_index_v1/source_fixtures/stamped_special_finish_binding_manual_v1/bw1_grass_energy_play_pokemon_stamp_v1.json
docs/audits/verified_master_set_index_v1/source_fixtures/stamped_special_finish_binding_manual_v1/bw1_fire_energy_play_pokemon_stamp_v1.json
docs/audits/verified_master_set_index_v1/source_fixtures/stamped_special_finish_binding_manual_v1/bw1_darkness_energy_play_pokemon_stamp_v1.json
```

## Why This Is Not Write-Ready

The source evidence is strong enough to preserve:

- exact card identity
- exact set and number
- Play! Pokemon stamped variant
- crosshatch / holo / reverse finish context

It is not yet write-ready because the canonical DB currently has the base BW1 Grass Energy parent with only a `normal` child printing. Creating a stamped `reverse` child would be a special finish-binding decision and should go through a dedicated guarded readiness packet.

The same blocker applies to BW1 Fire Energy #106 and Darkness Energy #111: exact Play! Pokemon stamped identity evidence exists, but crosshatch / holofoil / reverse labels need a single governed canonical finish mapping before any parent or child insert package is prepared.

## Recommended Next Step

Create a narrow guarded readiness packet for this single row that explicitly adjudicates:

```text
source finish label: Crosshatch Foiling / Reverse Holo
canonical finish key: reverse
variant_key: play_pokemon_stamp
printed_identity_modifier: play_pokemon_stamp
```

Do not apply without explicit approval.
