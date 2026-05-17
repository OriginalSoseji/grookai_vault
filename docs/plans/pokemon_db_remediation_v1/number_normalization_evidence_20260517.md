# Number Normalization Evidence 2026-05-17

Status: no-write evidence artifact. No Supabase writes, migrations, inserts, updates, deletes, identity rewrites, card movement, set creation, or mapping changes are authorized by this document.

## Purpose

Gather live read-only evidence for printed-number risk before any missing-card backfill or number normalization write plan exists.

This pass answers three questions:

- Which rows have missing direct printed numbers but recoverable source evidence?
- Which rows already have direct numbers but generated comparison fields collapse printed identity?
- Which rows have conflicting source or identity evidence and must be blocked from automatic changes?

## Source Evidence

- `docs/plans/pokemon_db_remediation_v1/number_normalization_plan.md`
- `docs/audits/pokemon_master_set_audit_v1/pokemon_master_set_audit_v1.md`
- `docs/audits/pokemon_master_set_audit_v1/summary.json`
- Live read-only Supabase queries run on 2026-05-17 inside `begin transaction read only`.

## Scope

The live evidence covered `public.card_prints` joined to `public.sets` where:

```sql
s.game = 'pokemon'
and coalesce(s.source->>'domain', '') <> 'tcg_pocket'
```

This matches the audit's physical Pokemon scope:

- 239 DB physical Pokemon set rows.
- 22,457 DB physical Pokemon card prints.

## Headline Findings

| Finding | Count |
| --- | ---: |
| Physical Pokemon `card_prints` in scope | 22,457 |
| Rows with `card_prints.number` null or blank | 997 |
| Rows with `card_prints.number_plain` null or blank | 997 |
| Rows with both number fields missing and source-derived number evidence | 997 |
| Missing-number rows blocked by current set-canonicalization hard stops | 374 |
| Missing-number rows outside hard-stop set groups | 623 |
| Outside-hard-stop rows with one numeric source candidate | 504 |
| Outside-hard-stop rows with one prefixed source candidate | 114 |
| Outside-hard-stop rows with complex source candidate | 5 |
| Existing rows where direct number and `number_plain` normalize differently | 1,554 |
| Existing rows where source external-id tail conflicts with direct number | 85 |
| Active identity rows where `printed_number` conflicts with `card_prints.number` | 46 |
| Recommended immediate writes | 0 |

## Missing Direct Number Evidence

All 997 rows with missing `card_prints.number` and `card_prints.number_plain` have recoverable TCGdex evidence in both:

- `card_prints.external_ids->>'tcgdex'`
- active `external_mappings` rows with `source = 'tcgdex'`

The source evidence is useful, but not enough for a write. Some rows sit inside unresolved set-canonicalization hard stops, and some recovered numbers have prefixes or complex suffixes that affect printed identity.

### Hard-Stop Set Rows

These rows must stay blocked until their set canonicalization hard stops are resolved:

| Set | Missing-number rows |
| --- | ---: |
| `sv08.5` Prismatic Evolutions | 180 |
| `sv04.5` Paldean Fates | 108 |
| `sv06.5` Shrouded Fable | 52 |
| `swsh10.5` Pokemon GO | 34 |

Total blocked by hard-stop set groups: 374.

### Non-Hard-Stop Candidate Lanes

| Lane | Rows | Meaning |
| --- | ---: | --- |
| Numeric source candidate | 504 | One source-derived candidate like `91`; future dry-run candidate only. |
| Prefixed source candidate | 114 | One source-derived candidate like `XY66`, `H16`, `RT6`; manual prefix policy required. |
| Complex source candidate | 5 | Candidates such as `15A1`, `15A2`, `15A3`, `15A4`, `65A`; manual review only. |
| Candidate conflicts | 0 | No missing-number rows had multiple disagreeing TCGdex/PokemonAPI candidates in this pass. |

Top non-hard-stop numeric candidate sets:

| Set | Rows |
| --- | ---: |
| `A3a` Extradimensional Crisis | 103 |
| `P-A` Promos-A | 100 |
| `me01` Mega Evolution | 83 |
| `svp` Scarlet & Violet Black Star Promos | 73 |
| `pl2` Rising Rivals | 34 |
| `2021swsh` Macdonald's Collection 2021 | 25 |
| `xy4` Phantom Forces | 15 |
| `pl4` Arceus | 12 |
| `mep` MEP Black Star Promos | 10 |

Top non-hard-stop prefixed candidate sets:

| Set | Rows |
| --- | ---: |
| `xyp` XY Black Star Promos | 61 |
| `bw11` Legendary Treasures | 20 |
| `ecard3` Skyridge | 11 |
| `pl4` Arceus | 8 |
| `col1` Call of Legends | 6 |
| `pl2` Rising Rivals | 3 |

Complex candidate rows:

| Set | Card | Source-derived candidate |
| --- | --- | --- |
| `xy4` Phantom Forces | Aegislash EX | `65A` |
| `cel25` Celebrations | Here Comes Team Rocket! | `15A2` |
| `cel25` Celebrations | Venusaur | `15A1` |
| `cel25` Celebrations | Claydol | `15A4` |
| `cel25` Celebrations | Rocket's Zapdos | `15A3` |

## Generated Field Risk

`number_plain` is not a safe source of printed identity by itself.

The evidence found 1,554 rows where direct printed number and `number_plain` normalize differently. This is expected for many promo/subset prefixes, but it means `number_plain` can collapse distinct printed identities if used alone.

Examples:

| Set | Card | `number` | `number_plain` |
| --- | --- | --- | --- |
| `smp` | Naganadel-GX | `SM125` | `125` |
| `xyp` | Arceus | `XY83` | `83` |
| `hsp` | Latias | `HGSS10` | `10` |
| `swsh45sv` | Galarian Sirfetch'd | `SV064` | `064` |
| `swsh12tg` | Duraludon VMAX | `TG30` | `30` |
| `pl2` | Wash Rotom | `RT5` | `5` |

Future normalization must preserve direct printed identity separately from comparable numeric tokens.

## Source Conflict Risk

The evidence found 85 existing rows where a source external-id tail conflicts with the direct printed number. These are not missing-number candidates. They are proof that source IDs cannot be blindly used as canonical numbers.

Common causes:

- Alternate `a` or `_A` source suffixes.
- Classic Collection source mapping back to Celebrations identity.
- Source-specific promo variants.

Examples:

| Set | Card | Direct number | Conflicting source candidate |
| --- | --- | --- | --- |
| `cel25c` | Garchomp C LV.X | `145` | `145A` / `145_A` |
| `xy10` | N | `105` | `105A` |
| `sm3` | Darkrai-GX | `88a` | `88` |
| `sm5` | Lillie | `125a` | `125` |
| `sm10` | Pokegear 3.0 | `182a` | `182` / `182B` |

Active identity conflict evidence is narrower but still important: 46 active `card_print_identity` rows have `printed_number` that normalizes differently from `card_prints.number`.

## Raw Payload Field Coverage

| Source | Kind | Rows | Number carrier |
| --- | --- | ---: | --- |
| TCGdex | card | 22,418 | `payload.card.localId`, `payload.card.id` |
| PokemonTCG API | card | 7,324 | `payload.number`, `payload.id` |
| JustTCG | card | 15,239 | `payload.number`, `payload.id` |
| TCGdex | set | 198 | set payload only |
| PokemonTCG API | set | 170 | set payload only |

TCGdex is the complete evidence lane for the 997 missing direct numbers. PokemonTCG API and JustTCG are corroborating lanes for rows that already have direct numbers or future backfill candidates.

## Evidence Conclusions

- The missing direct-number problem is real and measurable: 997 card prints.
- The direct recovery lane is TCGdex-derived, not PokemonTCG-derived.
- The first future write candidate lane should be limited to missing-number rows with one source-derived candidate and no set-canonicalization blocker.
- Even the 504 numeric non-hard-stop candidates are not approved for writes yet. They still need duplicate/identity/FK safety gates.
- Prefix, suffix, and alternate-letter cases must stay manual.
- No generated field should be overwritten without a separate comparable-number contract.

## No-Write Confirmation

This evidence pack authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, or variant changes.
