# ENRICH-13C Radiant Collection Prefix Governance V1

Read-only governance plan for Legendary Treasures Radiant Collection core identity blockers.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- This report is not apply authority.

## Summary

- Target rows: 20
- Set: bw11 / Legendary Treasures
- Non-RC bw11 collision rows: 0
- Write-ready now: false
- Recommended identity strategy: `preserve_RC_card_number_and_add_number_prefix_RC_identity_modifier_before_any_identity_backfill`

## Dependency Totals

| dependency | rows |
| --- | --- |
| child_count | 60 |
| active_identity_count | 20 |
| active_mapping_count | 20 |
| trait_count | 20 |
| species_count | 19 |

## Identity Rule

The RC-prefixed source numbers currently collide with main Legendary Treasures numeric rows when the prefix is stripped into number_plain.

Required law: Radiant Collection prefix is identity-bearing. RC19 is not the same parent identity as 19.

If later approved, the parent identity should preserve `number=RC#` and use `printed_identity_modifier=number_prefix:RC`. The numeric owner rows must remain untouched.

Forbidden:

- do not overwrite numeric Legendary Treasures parent rows
- do not merge RC rows into main-set numeric rows
- do not delete collision owners
- do not mint GV IDs until the modifier-aware identity contract is proven

## Rows

| number | name | source_id | children | active_identity | collision_owner | owner_number |
| --- | --- | --- | --- | --- | --- | --- |
| RC1 | Snivy | bw11-RC1 | 3 | 1 | Tangela | 1 |
| RC3 | Serperior | bw11-RC3 | 3 | 1 | Shuckle | 3 |
| RC4 | Growlithe | bw11-RC4 | 3 | 1 | Cherubi | 4 |
| RC5 | Torchic | bw11-RC5 | 3 | 1 | Carnivine | 5 |
| RC6 | Piplup | bw11-RC6 | 3 | 1 | Snivy | 6 |
| RC7 | Pikachu | bw11-RC7 | 3 | 1 | Servine | 7 |
| RC9 | Kirlia | bw11-RC9 | 3 | 1 | Sewaddle | 9 |
| RC10 | Gardevoir | bw11-RC10 | 3 | 1 | Sewaddle | 10 |
| RC12 | Stunfisk | bw11-RC12 | 3 | 1 | Leavanny | 12 |
| RC13 | Purrloin | bw11-RC13 | 3 | 1 | Dwebble | 13 |
| RC14 | Eevee | bw11-RC14 | 3 | 1 | Crustle | 14 |
| RC15 | Teddiursa | bw11-RC15 | 3 | 1 | Virizion | 15 |
| RC16 | Ursaring | bw11-RC16 | 3 | 1 | Genesect | 16 |
| RC18 | Minccino | bw11-RC18 | 3 | 1 | Charmeleon | 18 |
| RC19 | Cinccino | bw11-RC19 | 3 | 1 | Charizard | 19 |
| RC20 | Elesa | bw11-RC20 | 3 | 1 | Vulpix | 20 |
| RC21 | Shaymin-EX | bw11-RC21 | 3 | 1 | Ninetales | 21 |
| RC22 | Reshiram | bw11-RC22 | 3 | 1 | Moltres | 22 |
| RC23 | Emolga | bw11-RC23 | 3 | 1 | Victini | 23 |
| RC24 | Mew-EX | bw11-RC24 | 3 | 1 | Victini-EX | 24 |

## Future Package Shape

Package: `ENRICH-13C1-RADIANT-COLLECTION-PREFIX-IDENTITY-DRY-RUN`

Current status: `not_write_ready_dry_run_required`

Required before real apply:

- modifier-aware identity uniqueness dry-run
- collision owners unchanged proof
- active identity replacement/backfill proof
- rollback artifact for parent fields and identity rows

## Conclusion

Radiant Collection can likely become a deterministic governance rule, but it needs a modifier-aware dry-run package before any write. The fix is not a merge and not a delete.

Fingerprint: `5ac44de965375de89178bdb6efa718fc312062c09a83057b82295b24dfb7227f`
