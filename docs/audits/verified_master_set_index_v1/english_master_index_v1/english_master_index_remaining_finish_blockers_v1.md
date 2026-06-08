# English Master Index Remaining Finish Blockers V1

Generated: 2026-06-08T18:55:00.000Z

Audit-only report. This does not authorize database writes, cleanup, quarantine, insertion, deletion, or canonical mutation.

## Safety

| check | value |
| --- | --- |
| audit_only | true |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| mutation_authority | false |

## Summary

| metric | value |
| --- | ---: |
| remaining_finish_second_source_needed | 5 |
| blocker_rows | 5 |
| promotion_safe_now | 0 |

The final five rows are not safe to promote from near matches. Each has source evidence pointing to a finish-label or card-number mismatch.

## Blockers

| set | number | card | gap finish | blocker | reason |
| --- | --- | --- | --- | --- | --- |
| bw8 | 94 | Druddigon | holo | finish_label_conflict | Evidence distinguishes cracked ice holo from the base card; cracked ice was not collapsed into holo. |
| ex9 | 107 | Farfetch'd | normal | finish_label_conflict | Available exact source context identifies rare secret / holofoil, not normal. |
| sm8 | 187 | Net Ball | stamped | card_number_conflict | League/stamped evidence points to 187a/214, not exact 187/214. |
| sv03.5 | 146 | Moltres | normal | finish_label_conflict | Available exact source lists reverse holofoil and holofoil, not normal. |
| swsh3.5 | 62 | Professor's Research (Professor Magnolia) | normal | finish_label_conflict | Available exact source context lists holofoil/reverse holofoil, not normal. |

## Evidence URLs

- Druddigon: `https://bulbapedia.bulbagarden.net/wiki/Druddigon_%28Plasma_Storm_94%29`, `https://www.pricecharting.com/game/pokemon-plasma-storm/druddigon-cracked-ice-holo-94`, `https://www.pricecharting.com/game/pokemon-plasma-storm/druddigon-94`
- Farfetch'd: `https://pokescope.app/card/ex9-107/`
- Net Ball: `https://bulbapedia.bulbagarden.net/wiki/Net_Ball_%28TCG%29`, `https://pkmncards.com/card/net-ball-lost-thunder-lot-187a/`, `https://www.magicstronghold.com/store/item/89283`
- Moltres: `https://pokescope.app/card/sv3pt5-146/`
- Professor's Research: `https://www.tcgplayer.com/categories/trading-and-collectible-card-games/pokemon/price-guides/champions-path`, `https://guardiantcg.app/pokemon/champion-s-path/professor-s-research`

## Next Action

Treat these as `needs_manual_review_or_overgeneration_review`. Do not promote them unless exact independent evidence proves the current set/card/finish fact without collapsing variant labels or card-number suffixes.
